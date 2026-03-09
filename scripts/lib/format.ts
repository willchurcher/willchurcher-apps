/**
 * Stage 3 — Format Notes
 *
 * Sends each lesson's clean text (from Stage 2) to Claude one at a time.
 * Claude formats it into structured study notes with ASCII diagrams.
 */
import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { Lesson } from './scrape.ts'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are converting a learncpp.com lesson into clean Markdown. Your job is faithful conversion — preserve the original text as closely as possible.

RULES:
- Preserve all prose from the source exactly as written — do not paraphrase, summarise, or cut explanations
- Keep everything: definitions, rules, examples, rationale, tips, warnings, best-practice boxes, historical context, author commentary
- Use the source's own heading text for ## and ### headings
- Inline code: always in backticks
- Code examples: fenced \`\`\`cpp blocks, exactly as in the source
- Lists: bullet (•) or numbered, matching the source structure
- Tables: Markdown table format
- Blockquotes (tip/warning/aside boxes): use > prefix
- Remove ONLY: interactive quiz elements, nav prev/next buttons, "Further reading" link lists at the very end
- Do NOT add ASCII diagrams, do NOT add content not in the source

OUTPUT: raw markdown only, no preamble`

export async function formatChapter(
  chapter: string,
  lessons: Lesson[],
  cacheDir: string,
  force = false,
): Promise<string> {
  const outPath = join(cacheDir, 'notes-draft.md')

  if (!force) {
    try {
      const cached = await readFile(outPath, 'utf8')
      console.log(`[format] cached notes-draft.md (${cached.length} chars)`)
      return cached
    } catch { /* not cached */ }
  }

  const lessonsDir = join(cacheDir, 'lessons')
  const sections: string[] = [`# Chapter ${chapter} — Notes\n`]

  console.log(`[format] Formatting ${lessons.length} lessons via Claude...`)

  for (const lesson of lessons) {
    const txtPath = join(lessonsDir, `${lesson.slug}.txt`)
    let text: string
    try {
      text = await readFile(txtPath, 'utf8')
    } catch {
      console.warn(`[format]   missing ${lesson.slug}.txt — skipping`)
      continue
    }

    console.log(`[format]   ${lesson.slug} (${text.length} chars)`)

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Lesson: ${lesson.title}\n\n${text}`,
      }],
    })

    const formatted = (msg.content[0] as { type: string; text: string }).text
    sections.push(formatted.trim())
  }

  const notes = sections.join('\n\n---\n\n')
  await writeFile(outPath, notes, 'utf8')
  console.log(`[format] Done → notes-draft.md (${notes.length} chars)`)
  return notes
}
