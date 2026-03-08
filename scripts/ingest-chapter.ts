/**
 * C++ Ingest Pipeline
 *
 * Usage:
 *   npx tsx scripts/ingest-chapter.ts <chapter>
 *   npx tsx scripts/ingest-chapter.ts <chapter> --from extract
 *   npx tsx scripts/ingest-chapter.ts <chapter> --force
 *
 * Stages: scrape → extract → format → cards → grade → upload
 *
 * Setup:
 *   cd scripts && npm install
 *   cp .env.example .env && fill in ANTHROPIC_API_KEY + SUPABASE_SERVICE_KEY
 */
import 'dotenv/config'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readdir } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { scrapeChapter } from './lib/scrape.ts'
import { extractChapter } from './lib/extract.ts'
import { formatChapter } from './lib/format.ts'
import { generateCards } from './lib/cards.ts'
import { gradeCards } from './lib/grade.ts'
import { uploadChapter } from './lib/upload.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT  = join(__dirname, '..')

// ── Args ──────────────────────────────────────────────────────
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    from:  { type: 'string' },
    force: { type: 'boolean', default: false },
    yes:   { type: 'boolean', default: false },
  },
  allowPositionals: true,
})

const chapter = positionals[0]
if (!chapter) {
  console.error(
    'Usage: npx tsx scripts/ingest-chapter.ts <chapter> [--from <stage>] [--force]\n' +
    'Stages: scrape | extract | format | cards | grade | upload'
  )
  process.exit(1)
}

const ALL_STAGES = ['scrape', 'extract', 'format', 'cards', 'grade', 'upload'] as const
type Stage = typeof ALL_STAGES[number]

const fromStage = (values.from ?? 'scrape') as Stage
const force     = values.force ?? false
const yes       = values.yes ?? false

const fromIdx = ALL_STAGES.indexOf(fromStage)
if (fromIdx === -1) {
  console.error(`Unknown stage: ${fromStage}. Must be one of: ${ALL_STAGES.join(', ')}`)
  process.exit(1)
}

const run = (s: Stage) => ALL_STAGES.indexOf(s) >= fromIdx

// ── Cache dir ─────────────────────────────────────────────────
const cacheDir = join(__dirname, 'cache', `chapter-${chapter}`)
await mkdir(join(cacheDir, 'lessons'), { recursive: true })

// ── Stage 1: Scrape ───────────────────────────────────────────
let lessons: Awaited<ReturnType<typeof scrapeChapter>>

if (run('scrape')) {
  lessons = await scrapeChapter(chapter, cacheDir, force)
} else {
  // Reconstruct lesson list from cached .html files
  const files = await readdir(join(cacheDir, 'lessons'))
  lessons = files
    .filter(f => f.endsWith('.html'))
    .sort()
    .map(f => ({
      slug:  f.replace('.html', ''),
      url:   '',
      title: f.replace('.html', ''),
    }))
  console.log(`[scrape] skipped — ${lessons.length} cached lessons`)
}

// ── Stage 2: Extract ──────────────────────────────────────────
if (run('extract')) {
  await extractChapter(lessons, cacheDir, force)
} else {
  console.log('[extract] skipped')
}

// ── Stage 3: Format ───────────────────────────────────────────
if (run('format')) {
  await formatChapter(chapter, lessons, cacheDir, force)
} else {
  console.log('[format] skipped')
}

// ── Stage 4: Cards ────────────────────────────────────────────
if (run('cards')) {
  await generateCards(chapter, cacheDir, REPO_ROOT, force)
} else {
  console.log('[cards] skipped')
}

// ── Stage 5: Grade ────────────────────────────────────────────
if (run('grade')) {
  await gradeCards(cacheDir, force)
} else {
  console.log('[grade] skipped')
}

// ── Stage 6: Upload ───────────────────────────────────────────
if (run('upload')) {
  await uploadChapter(chapter, cacheDir, REPO_ROOT, yes)
} else {
  console.log('[upload] skipped')
}

console.log('\n✓ Pipeline complete.')
