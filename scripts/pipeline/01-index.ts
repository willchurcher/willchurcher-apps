/**
 * Stage 1 — Index
 * Scrapes learncpp.com homepage TOC and upserts all lessons into cpp_lessons.
 * Run: npx tsx scripts/pipeline/01-index.ts
 */
import 'dotenv/config'
import { load } from 'cheerio'
import { db } from './db.ts'

const LEARNCPP_BASE = 'https://www.learncpp.com'

async function fetchHome(): Promise<string> {
  const res = await fetch(LEARNCPP_BASE, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; study-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

interface LessonRow {
  chapter: string
  chapter_title: string
  lesson_number: string
  lesson_title: string
  slug: string
  url: string
}

function parseTOC(html: string): LessonRow[] {
  const $ = load(html)
  const rows: LessonRow[] = []
  const seen = new Set<string>()

  $('.lessontable').each((_, table) => {
    const $table = $(table)
    // Chapter title from the header element
    const chapterTitle = $table.find('.lessontable-header-title').text().trim()

    $table.find('.lessontable-row').each((_, row) => {
      const number = $(row).find('.lessontable-row-number').text().trim()
      if (!number.includes('.')) return

      const $a    = $(row).find('.lessontable-row-title a')
      const href  = $a.attr('href') ?? ''
      const title = $a.text().trim()
      if (!href || !title) return

      const match = href.match(/\/cpp-tutorial\/([^/?#]+)\/?/)
      if (!match) return

      const slug = match[1]
      if (seen.has(slug)) return
      seen.add(slug)

      const url     = href.startsWith('http') ? href : `${LEARNCPP_BASE}${href}`
      const chapter = number.split('.')[0]

      rows.push({ chapter, chapter_title: chapterTitle, lesson_number: number, lesson_title: title, slug, url })
    })
  })

  return rows
}

console.log('[index] Fetching learncpp.com TOC...')
const html = await fetchHome()
const lessons = parseTOC(html)
console.log(`[index] Found ${lessons.length} lessons`)

if (lessons.length === 0) {
  console.error('No lessons found — check that learncpp.com still uses .lessontable-row')
  process.exit(1)
}

// Upsert in batches of 50
const BATCH = 50
for (let i = 0; i < lessons.length; i += BATCH) {
  const batch = lessons.slice(i, i + BATCH)
  const { error } = await db
    .from('cpp_lessons')
    .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false })
  if (error) throw new Error(`Upsert failed: ${error.message}`)
}

console.log(`[index] ✓ Upserted ${lessons.length} lessons into cpp_lessons`)

// Print chapter summary
const chapters = [...new Set(lessons.map(l => l.chapter))].sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true })
)
for (const ch of chapters) {
  const count = lessons.filter(l => l.chapter === ch).length
  console.log(`  Ch.${ch}: ${count} lessons`)
}
