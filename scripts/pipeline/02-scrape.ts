/**
 * Stage 2 — Scrape
 * Fetches raw HTML for lessons that don't have it yet. Writes to cpp_lessons.raw_html.
 * Run: npx tsx scripts/pipeline/02-scrape.ts [--chapter 2] [--limit 10]
 */
import 'dotenv/config'
import { parseArgs } from 'node:util'
import { db } from './db.ts'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    chapter: { type: 'string' },
    limit:   { type: 'string' },
    force:   { type: 'boolean', default: false },
  },
})

const DELAY_MS = 1200

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; study-bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

// Query pending lessons
let query = db
  .from('cpp_lessons')
  .select('id, chapter, lesson_number, lesson_title, url')
  .order('chapter', { ascending: true })
  .order('lesson_number', { ascending: true })

if (!values.force) query = query.is('raw_html', null)
if (values.chapter) query = query.eq('chapter', values.chapter)
if (values.limit) query = query.limit(Number(values.limit))

const { data: lessons, error } = await query
if (error) throw new Error(error.message)
if (!lessons?.length) { console.log('[scrape] Nothing to do'); process.exit(0) }

console.log(`[scrape] ${lessons.length} lessons to fetch`)

for (const lesson of lessons) {
  console.log(`[scrape]   ${lesson.lesson_number} — ${lesson.lesson_title}`)
  try {
    const html = await fetchHtml(lesson.url)
    const { error: uErr } = await db
      .from('cpp_lessons')
      .update({ raw_html: html, scraped_at: new Date().toISOString() })
      .eq('id', lesson.id)
    if (uErr) throw new Error(uErr.message)
    await new Promise(r => setTimeout(r, DELAY_MS))
  } catch (e) {
    console.warn(`[scrape]   FAILED ${lesson.lesson_number}: ${(e as Error).message}`)
  }
}

console.log('[scrape] ✓ Done')
