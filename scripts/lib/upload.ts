/**
 * Stage 6 — Upload
 *
 * 1. Print importance distribution summary, ask y/n.
 * 2. Write notes-draft.md → apps/example/public/notes/cpp-chapter-N.md
 * 3. Insert graded cards into Supabase `cpp_flashcards` table.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { createClient } from '@supabase/supabase-js'
import type { GradedCard } from './grade.ts'

const SUPABASE_URL = 'https://xnqmnhqclbprorcghyeh.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY ?? ''
const USER_ID      = '09aa2e79-4897-41cd-8ec0-b77478c6f22e'

const IMPORTANCE_LABELS: Record<number, string> = {
  2: 'Very High', 1: 'High', 0: 'Medium', [-1]: 'Low', [-2]: 'Very Low',
}

function importanceDist(cards: GradedCard[]): Map<number, number> {
  const dist = new Map<number, number>()
  for (const c of cards) {
    dist.set(c.importance, (dist.get(c.importance) ?? 0) + 1)
  }
  return dist
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(prompt)
  rl.close()
  return answer.trim().toLowerCase() === 'y'
}

export async function uploadChapter(
  chapter: string,
  cacheDir: string,
  repoRoot: string,
  skipConfirm = false,
): Promise<void> {
  const cards: GradedCard[] = JSON.parse(
    await readFile(join(cacheDir, 'cards-graded.json'), 'utf8')
  )
  const notes = await readFile(join(cacheDir, 'notes-draft.md'), 'utf8')

  // ── Summary ───────────────────────────────────────────────────
  const dist = importanceDist(cards)
  console.log(`\n[upload] Chapter ${chapter} — ${cards.length} cards`)
  for (const score of [2, 1, 0, -1, -2]) {
    const label = IMPORTANCE_LABELS[score] ?? String(score)
    const count = dist.get(score) ?? 0
    console.log(`  ${score >= 0 ? ' ' : ''}${score}  ${label.padEnd(9)}  ${count}`)
  }
  console.log()

  if (!skipConfirm && !(await confirm('Proceed with upload? [y/N] '))) {
    console.log('[upload] Aborted.')
    return
  }

  // ── Write notes file ──────────────────────────────────────────
  const notesDir = join(repoRoot, 'apps/example/public/notes')
  await mkdir(notesDir, { recursive: true })
  const notesPath = join(notesDir, `cpp-chapter-${chapter}.md`)
  await writeFile(notesPath, notes, 'utf8')
  console.log(`[upload] Notes → ${notesPath}`)

  // ── Insert cards into Supabase ────────────────────────────────
  if (!SERVICE_KEY) {
    console.error('[upload] SUPABASE_SERVICE_KEY not set in .env — skipping card insert')
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const rows = cards.map(c => ({
    chapter:        c.chapter,
    lesson_number:  c.lesson ?? '',
    lesson_title:   c.lessonTitle ?? '',
    topic:          c.topic,
    note_section:   c.noteSection,
    q:              c.q,
    a:              c.a,
    importance:     c.importance,
  }))

  console.log(`[upload] Inserting ${rows.length} cards...`)
  const { data, error } = await supabase
    .from('cpp_flashcards')
    .insert(rows)
    .select('id')

  if (error) {
    console.error('[upload] Supabase error:', error.message)
    return
  }

  console.log(`[upload] Done. ${data?.length ?? rows.length} cards inserted.`)
  console.log(`[upload] Commit ${notesPath} to deploy notes. Cards are live in Supabase.`)
}
