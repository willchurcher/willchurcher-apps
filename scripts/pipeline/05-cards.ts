/**
 * Stage 5 — Generate Cards
 * For each lesson with formatted_notes, makes one Claude call to extract flashcards.
 * Few-shot examples pulled from Supabase (your hand-edited cards, best style signal).
 * Writes to cpp_flashcards_v3.
 * Run: npx tsx scripts/pipeline/05-cards.ts [--chapter 2] [--limit 5]
 */
import 'dotenv/config'
import { parseArgs } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import { db } from './db.ts'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    chapter:    { type: 'string' },
    limit:      { type: 'string' },
    force:      { type: 'boolean', default: false },
    examples:   { type: 'string', default: '8' },
  },
})

const client = new Anthropic()

// ── Pull few-shot examples from Supabase ─────────────────────
// Uses hand-edited cards from cpp_card_edits joined with cpp_flashcards_v2.
// Falls back to data.json overrides if none found.
async function getFewShotExamples(count: number): Promise<string> {
  const { data: edits } = await db
    .from('cpp_card_edits')
    .select('card_id, q, a')
    .eq('source', 'manual')
    .order('created_at', { ascending: false })

  if (!edits?.length) {
    console.log('[cards] No Supabase edits found, skipping few-shot')
    return ''
  }

  // Deduplicate by card_id (latest edit wins), sort by answer length
  const seen = new Map<number, { q: string; a: string }>()
  for (const e of edits) {
    if (!seen.has(e.card_id)) seen.set(e.card_id, { q: e.q, a: e.a })
  }
  const best = [...seen.values()]
    .filter(e => e.q && e.a)
    .sort((a, b) => b.a.length - a.a.length)
    .slice(0, count)

  if (!best.length) return ''

  const block = best.map((e, i) => `Example ${i + 1}:\nQ: ${e.q}\nA: ${e.a}`).join('\n\n')
  console.log(`[cards] Using ${best.length} few-shot examples from Supabase`)
  return `FEW-SHOT EXAMPLES — match this style exactly:\n\n${block}\n\n---\n\n`
}

const SYSTEM_PROMPT = `You are generating C++ study flashcards from structured notes.

Generate a card for EVERY piece of information — definitions, rules, syntax, gotchas,
comparisons, worked examples. Err on the side of more cards.

STYLE RULES:
- Answers: • **Term**: explanation bullets OR short prose, whichever suits
- Inline code: always backticks — \`int\`, \`nullptr\`, \`std::vector\`
- Code blocks: \`\`\`cpp for syntax demos or worked examples
- ASCII diagrams: use box-drawing chars for memory/flow diagrams when helpful
- Answer length: 2–8 lines, concise, no filler
- Questions: specific and testable; not "what is X" unless X is definitional

IMPORTANCE SCORE (include in every card):
- 2 = Very High: fundamental concept, tested constantly, easy to get wrong
- 1 = High: important, commonly needed
- 0 = Medium: useful to know
- -1 = Low: edge case or rarely needed
- -2 = Very Low: trivia, historical detail

NOTE SECTION: set to the exact text of the nearest ## heading above this card's content
(omit the ## prefix). This must match an actual heading in the notes.

OUTPUT: JSON array only — no preamble, no markdown fences:
[{ "q": "...", "a": "...", "topic": "...", "noteSection": "...", "importance": 0 }, ...]`

interface RawCard { q: string; a: string; topic: string; noteSection: string; importance: number }

function parseCards(raw: string): RawCard[] {
  const start = raw.indexOf('[')
  const end   = raw.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array in response')
  return JSON.parse(raw.slice(start, end + 1))
}

// ── Main ───────────────────────────────────────────────────────
const fewShot = await getFewShotExamples(Number(values.examples))

let query = db
  .from('cpp_lessons')
  .select('id, chapter, lesson_number, lesson_title')
  .not('formatted_notes', 'is', null)
  .order('chapter', { ascending: true })
  .order('lesson_number', { ascending: true })

if (values.chapter) query = query.eq('chapter', values.chapter)
if (values.limit) query = query.limit(Number(values.limit))
if (!values.force) {
  // Skip lessons already processed
  query = query.is('cards_at', null)
}

const { data: lessons, error } = await query
if (error) throw new Error(error.message)
if (!lessons?.length) { console.log('[cards] Nothing to do'); process.exit(0) }

console.log(`[cards] Generating cards for ${lessons.length} lessons...`)

for (let i = 0; i < lessons.length; i++) {
  const lesson = lessons[i]
  console.log(`[cards]   [${i + 1}/${lessons.length}] ${lesson.lesson_number} — ${lesson.lesson_title}`)

  const { data, error: e } = await db
    .from('cpp_lessons')
    .select('formatted_notes')
    .eq('id', lesson.id)
    .single()
  if (e || !data?.formatted_notes) { console.warn(`  skip: no formatted_notes`); continue }

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `${fewShot}${data.formatted_notes}`,
      }],
    })

    const raw   = (msg.content[0] as { type: string; text: string }).text
    const cards = parseCards(raw)

    const rows = cards.map(c => ({
      lesson_id:     lesson.id,
      chapter:       lesson.chapter,
      lesson_number: lesson.lesson_number,
      lesson_title:  lesson.lesson_title,
      topic:         c.topic ?? '',
      note_section:  c.noteSection ?? '',
      q:             c.q,
      a:             c.a,
      importance:    typeof c.importance === 'number' ? Math.max(-2, Math.min(2, c.importance)) : 0,
    }))

    const { error: insErr } = await db.from('cpp_flashcards_v3').insert(rows)
    if (insErr) throw new Error(insErr.message)

    // Mark lesson as processed
    await db.from('cpp_lessons').update({ cards_at: new Date().toISOString() }).eq('id', lesson.id)

    console.log(`  ✓ ${cards.length} cards inserted`)
  } catch (e) {
    console.warn(`  FAILED: ${(e as Error).message}`)
  }

  if (i < lessons.length - 1) await new Promise(r => setTimeout(r, 500))
}

console.log('[cards] ✓ Done')
