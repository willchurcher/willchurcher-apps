/**
 * Stage 5 — Generate Cards
 * One Claude call per lesson, run in parallel (configurable concurrency).
 * Detects truncation/parse failures and flags with cards_error for later retry.
 * Run: npx tsx scripts/pipeline/05-cards.ts [--chapter 02] [--limit 5] [--force] [--retry-failed] [--concurrency 4]
 */
import 'dotenv/config'
import { parseArgs } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import { db } from './db.ts'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    chapter:        { type: 'string' },
    lesson:         { type: 'string' },
    'retry-failed': { type: 'boolean', default: false },
    limit:          { type: 'string' },
    force:          { type: 'boolean', default: false },
    examples:       { type: 'string', default: '6' },
    delay:          { type: 'string', default: '1000' },  // ms between requests
  },
})

const client = new Anthropic()
const DELAY_MS = Number(values.delay)

// ── Few-shot examples from Supabase ───────────────────────────
const PREFERRED_CARD_IDS = [321, 345, 206, 218, 74, 342, 384, 346]

async function getFewShotBlock(count: number): Promise<string> {
  const { data: preferred } = await db
    .from('cpp_card_edits')
    .select('card_id, q, a')
    .eq('source', 'manual')
    .in('card_id', PREFERRED_CARD_IDS)
    .order('created_at', { ascending: false })

  const seen = new Map<number, { q: string; a: string }>()
  for (const e of preferred ?? []) {
    if (!seen.has(e.card_id)) seen.set(e.card_id, { q: e.q, a: e.a })
  }

  if (seen.size < count) {
    const { data: rest } = await db
      .from('cpp_card_edits')
      .select('card_id, q, a')
      .eq('source', 'manual')
      .not('card_id', 'in', `(${PREFERRED_CARD_IDS.join(',')})`)
      .order('created_at', { ascending: false })
    const sorted = (rest ?? []).filter(e => e.q && e.a).sort((a, b) => b.a.length - a.a.length)
    for (const e of sorted) {
      if (seen.size >= count) break
      if (!seen.has(e.card_id)) seen.set(e.card_id, { q: e.q, a: e.a })
    }
  }

  const best = [...seen.values()].slice(0, count)
  if (!best.length) return ''

  console.log(`[cards] Using ${best.length} few-shot style examples`)
  // Use a distinctive delimiter that won't appear in notes
  const examples = best.map((e, i) => `EXAMPLE_${i + 1}:\nQ: ${e.q}\nA: ${e.a}`).join('\n\n')
  return `STYLE EXAMPLES (for formatting reference only — do not generate cards for these):\n\n${examples}\n\nEND_OF_STYLE_EXAMPLES\n\nNOTES TO CONVERT INTO FLASHCARDS:\n`
}

// ── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are generating C++ study flashcards from structured notes.

## Exhaustiveness
Generate a card for EVERY piece of information in the notes:
- Every definition, rule, syntax form, and concept
- Every "why" behind a design decision
- Every edge case, gotcha, and "what happens if you do X wrong"
- Every best practice and naming convention
- Every comparison (X vs Y, when to use X vs Y)
- Step-by-step processes

If you think something is low-value, still include it — just set importance lower. Do NOT skip anything.

## Question style
- Bold the key term: "What does a **type** determine?"
- Specify expected format when the answer is a list: "List N...", "Give an example of each"
- Max 2 sub-questions per card, only when inseparable: "What is X?\\n\\nWhat is not X?"
- Prefer specific and behavioural questions: "What happens when...", "Why does...", "What is the difference between..."
- Include code in questions when it makes the question concrete

## Answer style
- Always use bullet points where possible: \`• **Term**: explanation\`
- The bold term must summarise the bullet — it works as a standalone memory hook
- Code: always backticks — \`int\`, \`nullptr\`, \`std::vector\`
- Code blocks: \`\`\`cpp for multi-line examples
- Best practices: mark inline with \`◀ preferred\` or \`✗ avoid\`
- For step-by-step processes, numbered prose is acceptable
- Keep answers 2–8 lines; concise but complete

## Importance score (required on every card)
- \`2\` — fundamental concept; subtly easy to get wrong; tested constantly
- \`1\` — important and commonly needed
- \`0\` — useful to know
- \`-1\` — edge case or rarely comes up
- \`-2\` — historical detail or trivia

## noteSection
Exact text of the nearest ## heading above this card's content (omit the ##).

Call the submit_cards tool with all generated cards.`

// ── Card type ────────────────────────────────────────────────
interface RawCard { q: string; a: string; topic: string; noteSection: string; importance: number }

// ── Tool definition ───────────────────────────────────────────
const SUBMIT_CARDS_TOOL: Anthropic.Tool = {
  name: 'submit_cards',
  description: 'Submit all generated flashcards for this lesson',
  input_schema: {
    type: 'object' as const,
    properties: {
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            q:           { type: 'string' },
            a:           { type: 'string' },
            topic:       { type: 'string' },
            noteSection: { type: 'string' },
            importance:  { type: 'integer', minimum: -2, maximum: 2 },
          },
          required: ['q', 'a', 'topic', 'noteSection', 'importance'],
        },
      },
    },
    required: ['cards'],
  },
}

// ── Process one lesson ────────────────────────────────────────
async function processLesson(
  lesson: { id: number; chapter: string; lesson_number: string; lesson_title: string },
  fewShot: string,
): Promise<{ cards: number; truncated: boolean; error?: string }> {
  // Delete existing cards for this lesson before re-generating
  await db.from('cpp_flashcards').delete().eq('lesson_id', lesson.id)

  const { data, error: e } = await db
    .from('cpp_lessons')
    .select('formatted_notes')
    .eq('id', lesson.id)
    .single()
  if (e || !data?.formatted_notes) return { cards: 0, truncated: false, error: 'no formatted_notes' }

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_CARDS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_cards' },
    messages: [{ role: 'user', content: `${fewShot}${data.formatted_notes}` }],
  })

  const toolUseBlock = msg.content.find(b => b.type === 'tool_use') as
    | { type: 'tool_use'; input: { cards: RawCard[] } }
    | undefined

  const wasTruncated = msg.stop_reason === 'max_tokens' || !toolUseBlock
  let rawCards = toolUseBlock?.input?.cards ?? []
  if (typeof rawCards === 'string') {
    // Model sometimes serializes the array as a string with invalid escape sequences.
    // Valid JSON escapes: \", \\, \/, \n, \r, \t, \b, \f, \uXXXX — drop any others.
    const sanitized = (rawCards as string).replace(/\\([^"\\/nrtbfu])/g, '$1')
    try { rawCards = JSON.parse(sanitized) } catch { rawCards = [] }
  }
  const cards: RawCard[] = Array.isArray(rawCards) ? rawCards : []
  const isError = wasTruncated

  if (cards.length > 0) {
    const rows = cards.map(c => ({
      lesson_id:     lesson.id,
      chapter:       lesson.chapter,
      lesson_number: lesson.lesson_number,
      lesson_title:  lesson.lesson_title,
      topic:         c.topic ?? '',
      note_section:  c.noteSection ?? '',
      q:             c.q,
      a:             c.a,
      importance:    typeof c.importance === 'number' ? Math.max(-2, Math.min(2, Math.round(c.importance))) : 0,
    }))
    const { error: insErr } = await db.from('cpp_flashcards').insert(rows)
    if (insErr) throw new Error(insErr.message)
  }

  if (isError) {
    await db.from('cpp_lessons')
      .update({ cards_error: `truncated:${msg.stop_reason}:salvaged_${cards.length}` })
      .eq('id', lesson.id)
  } else {
    await db.from('cpp_lessons')
      .update({ cards_at: new Date().toISOString(), cards_error: null })
      .eq('id', lesson.id)
  }

  return { cards: cards.length, truncated: isError }
}

// ── Main ──────────────────────────────────────────────────────
const fewShot = await getFewShotBlock(Number(values.examples))

let query = db
  .from('cpp_lessons')
  .select('id, chapter, lesson_number, lesson_title')
  .not('formatted_notes', 'is', null)
  .order('chapter', { ascending: true })
  .order('lesson_number', { ascending: true })

if (values.chapter)          query = query.eq('chapter', values.chapter)
if (values.lesson)           query = query.eq('lesson_number', values.lesson)
if (values['retry-failed'])  query = query.not('cards_error', 'is', null)
if (values.limit)            query = query.limit(Number(values.limit))
if (!values.force && !values['retry-failed']) query = query.is('cards_at', null)

const { data: lessons, error } = await query
if (error) throw new Error(error.message)
if (!lessons?.length) { console.log('[cards] Nothing to do'); process.exit(0) }

console.log(`[cards] ${lessons.length} lessons`)

let totalCards = 0
let truncatedCount = 0

for (let i = 0; i < lessons.length; i++) {
  const lesson = lessons[i]
  const prefix = `[${i + 1}/${lessons.length}] ${lesson.lesson_number} — ${lesson.lesson_title}`
  try {
    const result = await processLesson(lesson, fewShot)
    totalCards += result.cards
    if (result.truncated) {
      truncatedCount++
      console.warn(`  ⚠ TRUNCATED  ${prefix} (salvaged ${result.cards})`)
    } else if (result.error) {
      console.warn(`  ✗ SKIPPED    ${prefix}: ${result.error}`)
    } else {
      console.log(`  ✓ ${String(result.cards).padStart(3)} cards  ${prefix}`)
    }
  } catch (e) {
    truncatedCount++
    const msg = (e as Error).message
    console.warn(`  ✗ ERROR      ${prefix}: ${msg.slice(0, 100)}`)
    await db.from('cpp_lessons').update({ cards_error: `error:${msg.slice(0, 200)}` }).eq('id', lesson.id)
  }
  if (i < lessons.length - 1) await new Promise(r => setTimeout(r, DELAY_MS))
}

console.log(`\n[cards] ✓ Done — ${totalCards} cards, ${truncatedCount} flagged`)

if (truncatedCount > 0) {
  const { data: flagged } = await db
    .from('cpp_lessons')
    .select('lesson_number, lesson_title, cards_error')
    .not('cards_error', 'is', null)
    .order('lesson_number')
  console.log('\nFlagged:')
  for (const l of flagged ?? []) console.log(`  ${l.lesson_number} ${l.lesson_title}: ${l.cards_error}`)
}
