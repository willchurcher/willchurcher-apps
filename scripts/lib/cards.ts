/**
 * Stage 4 — Generate Flashcards
 *
 * One Claude call: sends the formatted notes + 5 few-shot examples
 * from the user's hand-edited cards in data.json (longest answers = best style signal).
 * Output: cards-draft.json (ungraded).
 */
import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface DraftCard {
  chapter: string
  lesson: string       // e.g. "2.1"
  lessonTitle: string  // e.g. "Introduction to Functions"
  topic: string
  noteSection: string
  q: string
  a: string
  importance: null
}

const SYSTEM_PROMPT = `You are generating C++ study flashcards from structured notes.

Generate a card for EVERY piece of information — definitions, rules, syntax, gotchas,
comparisons, examples. Err on the side of too many cards.

STYLE RULES:
- Answers: • **Term**: explanation bullets OR short prose, whichever suits
- Inline code: always backticks — \`int\`, \`nullptr\`, \`std::vector\`
- Code blocks: \`\`\`cpp for syntax demos or worked examples
- ASCII trees: use / \\ for branches, box-drawing for flow
- Answer length: 2–8 lines, concise, no filler
- Questions: specific and testable; not "what is X" unless X is definitional

OUTPUT: JSON array of { q, a, topic, noteSection } — no preamble, just the array.`

function pickFewShot(dataPath: string): Promise<string> {
  return readFile(dataPath, 'utf8')
    .then(raw => {
      const data = JSON.parse(raw)
      const overrides: Record<string, { q: string; a: string }> = data.overrides ?? {}
      const best = Object.values(overrides)
        .filter(e => e.q && e.a)
        .sort((a, b) => b.a.length - a.a.length)
        .slice(0, 5)

      if (best.length === 0) return ''

      const examples = best
        .map((e, i) => `Example ${i + 1}:\nQ: ${e.q}\nA: ${e.a}`)
        .join('\n\n')
      return `\nFEW-SHOT EXAMPLES — match this style exactly:\n\n${examples}\n`
    })
    .catch(() => '')
}

function parseJsonResponse(raw: string): unknown[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array found in response')
  return JSON.parse(raw.slice(start, end + 1))
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generateCards(
  chapter: string,
  cacheDir: string,
  repoRoot: string,
  force = false,
): Promise<DraftCard[]> {
  const outPath = join(cacheDir, 'cards-draft.json')

  if (!force) {
    try {
      const cached = JSON.parse(await readFile(outPath, 'utf8')) as DraftCard[]
      console.log(`[cards] cached cards-draft.json (${cached.length} cards)`)
      return cached
    } catch { /* not cached */ }
  }

  const notes = await readFile(join(cacheDir, 'notes-draft.md'), 'utf8')
  const fewShot = await pickFewShot(join(repoRoot, 'data.json'))

  // Split by lesson separator — one call per lesson keeps output tokens well under limit
  const sections = notes.split(/\n---\n/).map(s => s.trim()).filter(Boolean)
  console.log(`[cards] Generating cards from ${sections.length} sections...`)

  const allCards: DraftCard[] = []

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    console.log(`[cards]   section ${i + 1}/${sections.length} (${section.length} chars)`)

    // Extract lesson number + title from the section's first heading
    // e.g. "# 2.1 — Introduction to Functions" → lesson="2.1", lessonTitle="Introduction to Functions"
    const lessonMatch = section.match(/^#\s+(\d+\.\d+)\s+[—–-]\s+(.+)/m)
    const lesson      = lessonMatch ? lessonMatch[1].trim() : ''
    const lessonTitle = lessonMatch ? lessonMatch[2].trim() : ''

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `${i === 0 ? fewShot + '\n---\n\n' : ''}${section}`,
      }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text
    try {
      const rawCards = parseJsonResponse(raw) as Array<{
        q: string; a: string; topic: string; noteSection: string
      }>
      allCards.push(...rawCards.map(c => ({
        chapter,
        lesson,
        lessonTitle,
        topic: c.topic ?? '',
        noteSection: c.noteSection ?? '',
        q: c.q,
        a: c.a,
        importance: null,
      })))
    } catch {
      console.warn(`[cards]   section ${i + 1} JSON parse failed — skipping`)
    }

    if (i < sections.length - 1) await delay(500)
  }

  await writeFile(outPath, JSON.stringify(allCards, null, 2), 'utf8')
  console.log(`[cards] Done → ${allCards.length} cards`)
  return allCards
}
