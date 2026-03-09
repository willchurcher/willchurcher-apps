/**
 * Stage 6 — Export Notes to Markdown files
 * Reads formatted_notes from cpp_lessons and writes one .md file per chapter
 * to apps/example/public/notes/.
 *
 * Run: npx tsx scripts/pipeline/06-export-notes.ts [--chapter 02]
 */
import 'dotenv/config'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { db } from './db.ts'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    chapter: { type: 'string' },
  },
})

const __dirname = dirname(fileURLToPath(import.meta.url))
const NOTES_DIR = join(__dirname, '../../apps/example/public/notes')

let query = db
  .from('cpp_lessons')
  .select('chapter, chapter_title, lesson_number, lesson_title, formatted_notes')
  .not('formatted_notes', 'is', null)
  .order('chapter', { ascending: true })
  .order('lesson_number', { ascending: true })

if (values.chapter) query = query.eq('chapter', values.chapter)

const { data: lessons, error } = await query
if (error) throw new Error(error.message)
if (!lessons?.length) { console.log('[export] Nothing to export'); process.exit(0) }

// Group by chapter
const byChapter = new Map<string, typeof lessons>()
for (const lesson of lessons) {
  if (!byChapter.has(lesson.chapter)) byChapter.set(lesson.chapter, [])
  byChapter.get(lesson.chapter)!.push(lesson)
}

await mkdir(NOTES_DIR, { recursive: true })

for (const [chapter, chLessons] of byChapter) {
  const chTitle = chLessons[0].chapter_title ?? `Chapter ${chapter}`
  const sections: string[] = [`# Chapter ${chapter} — ${chTitle}\n`]

  for (const lesson of chLessons) {
    sections.push(lesson.formatted_notes!.trim())
  }

  const content = sections.join('\n\n---\n\n')
  const padded = chapter.padStart(2, '0')
  const outPath = join(NOTES_DIR, `cpp-chapter-${padded}.md`)
  await writeFile(outPath, content, 'utf8')
  console.log(`[export] ch${chapter} → cpp-chapter-${padded}.md (${content.length} chars, ${chLessons.length} lessons)`)
}

console.log('[export] ✓ Done')
