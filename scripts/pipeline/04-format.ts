/**
 * Stage 4 — Format Notes
 * Sends clean_text to Claude to produce structured study notes.
 * Writes to cpp_lessons.formatted_notes.
 * Run: npx tsx scripts/pipeline/04-format.ts [--chapter 2] [--limit 5]
 */
import 'dotenv/config'
import { parseArgs } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import { db } from './db.ts'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    chapter: { type: 'string' },
    limit:   { type: 'string' },
    force:   { type: 'boolean', default: false },
  },
})

const client = new Anthropic()

const SYSTEM_PROMPT = `You are converting a learncpp.com lesson into clean, structured study notes.

RULES:
- Start with: # {lesson_number} — {lesson_title}
- ## for major sections (use the actual section names from the source)
- ### for sub-sections
- Definitions: • **Term**: explanation (one line each)
- Inline code: always in backticks — \`int\`, \`nullptr\`, \`std::vector\`
- Code examples: fenced \`\`\`cpp blocks, keep them concise
- Diagrams: ASCII art using box-drawing chars (┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼ ▶ ▲ ▼)
  - Any time the source describes a diagram, memory layout, flow, or relationship — draw it in ASCII
  - Never write "the diagram above shows..." — draw the thing
- Prose: concise; one idea per sentence; no filler or encouragement
- Remove: quizzes, exercises, author commentary, "in summary" sections, further reading links
- Keep: definitions, rules, syntax, gotchas, design rationale, worked examples

OUTPUT: raw markdown only — no preamble, no "here are the notes"`

async function formatLesson(lessonNumber: string, lessonTitle: string, cleanText: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Lesson: ${lessonNumber} — ${lessonTitle}\n\n${cleanText}`,
    }],
  })
  return (msg.content[0] as { type: string; text: string }).text
}

// ── Main ───────────────────────────────────────────────────────
let query = db
  .from('cpp_lessons')
  .select('id, lesson_number, lesson_title')
  .not('clean_text', 'is', null)
  .order('chapter', { ascending: true })
  .order('lesson_number', { ascending: true })

if (!values.force) query = query.is('formatted_notes', null)
if (values.chapter) query = query.eq('chapter', values.chapter)
if (values.limit) query = query.limit(Number(values.limit))

const { data: lessons, error } = await query
if (error) throw new Error(error.message)
if (!lessons?.length) { console.log('[format] Nothing to do'); process.exit(0) }

console.log(`[format] Formatting ${lessons.length} lessons via Claude...`)

for (let i = 0; i < lessons.length; i++) {
  const lesson = lessons[i]
  console.log(`[format]   [${i + 1}/${lessons.length}] ${lesson.lesson_number} — ${lesson.lesson_title}`)

  const { data, error: e } = await db
    .from('cpp_lessons')
    .select('clean_text')
    .eq('id', lesson.id)
    .single()
  if (e || !data?.clean_text) { console.warn(`  skip: no clean_text`); continue }

  try {
    const notes = await formatLesson(lesson.lesson_number, lesson.lesson_title, data.clean_text)
    const { error: uErr } = await db
      .from('cpp_lessons')
      .update({ formatted_notes: notes, formatted_at: new Date().toISOString() })
      .eq('id', lesson.id)
    if (uErr) throw new Error(uErr.message)
    console.log(`  ✓ ${notes.length} chars`)
  } catch (e) {
    console.warn(`  FAILED: ${(e as Error).message}`)
  }

  if (i < lessons.length - 1) await new Promise(r => setTimeout(r, 500))
}

console.log('[format] ✓ Done')
