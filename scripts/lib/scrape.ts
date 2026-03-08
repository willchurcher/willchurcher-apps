import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { load } from 'cheerio'

const LEARNCPP_BASE = 'https://www.learncpp.com'
const DELAY_MS = 1500

export interface Lesson {
  slug: string
  url: string
  title: string
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

function parseTOC(html: string, chapter: string): Lesson[] {
  const $ = load(html)
  const lessons: Lesson[] = []
  const seen = new Set<string>()
  const prefix = `${chapter}.`

  // learncpp uses a .lessontable structure:
  //   .lessontable-row-number  → "1.1"
  //   .lessontable-row-title a → href + title text
  $('.lessontable-row').each((_, row) => {
    const number = $(row).find('.lessontable-row-number').text().trim()
    if (!number.startsWith(prefix)) return

    const $a = $(row).find('.lessontable-row-title a')
    const href = $a.attr('href') ?? ''
    const title = $a.text().trim()

    const match = href.match(/\/cpp-tutorial\/([^/?#]+)\/?/)
    if (!match) return

    const slug = match[1]
    if (seen.has(slug)) return
    seen.add(slug)

    const url = href.startsWith('http') ? href : `${LEARNCPP_BASE}${href}`
    lessons.push({ slug, url, title: `${number} — ${title}` })
  })

  return lessons
}

export async function scrapeChapter(
  chapter: string,
  cacheDir: string,
  force = false,
): Promise<Lesson[]> {
  const lessonsDir = join(cacheDir, 'lessons')
  await mkdir(lessonsDir, { recursive: true })

  console.log(`[scrape] Fetching TOC...`)
  const homeHtml = await fetchHtml(`${LEARNCPP_BASE}/`)
  const lessons = parseTOC(homeHtml, chapter)

  if (lessons.length === 0) {
    throw new Error(
      `No lessons found for chapter ${chapter}. ` +
      `Check that learncpp.com still uses /cpp-tutorial/ links on the homepage.`
    )
  }

  console.log(`[scrape] Found ${lessons.length} lessons for chapter ${chapter}`)

  for (const lesson of lessons) {
    const filePath = join(lessonsDir, `${lesson.slug}.html`)

    if (!force) {
      try {
        await access(filePath)
        console.log(`[scrape]   cached  ${lesson.slug}`)
        continue
      } catch { /* not cached */ }
    }

    console.log(`[scrape]   fetch   ${lesson.title}`)
    const html = await fetchHtml(lesson.url)
    await writeFile(filePath, html, 'utf8')
    await delay(DELAY_MS)
  }

  return lessons
}
