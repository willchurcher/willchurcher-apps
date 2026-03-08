/**
 * Stage 5 — Grade Importance
 *
 * Batches 20 cards per Claude call (haiku — cheap, fast, just needs to output numbers).
 * Claude returns { id, importance } pairs; we merge back into the card array.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { DraftCard } from './cards.ts'

const client = new Anthropic()

export interface GradedCard extends Omit<DraftCard, 'importance'> {
  importance: number
}

const BATCH_SIZE = 20

const SYSTEM_PROMPT = `You are grading C++ flashcards for interview-prep importance.
Target: senior C++ engineering role (systems, performance-critical).

SCALE:
  2 = Core C++ — almost certain in an interview
  1 = High — commonly tested or used in real codebases
  0 = Medium — good general knowledge
 -1 = Low — background / toolchain / rarely asked
 -2 = Very Low — historical trivia or obvious to any programmer

GUIDANCE:
- Memory model, pointers, references, RAII, destructors, virtual dispatch → 2
- Type system, templates, move semantics, STL containers → 1–2
- Build system, compiler flags, IDE settings → -1 to -2
- C++ history, who invented it, what year → -2
- Compiler pipeline stages → 0 to -1 unless deeply technical

OUTPUT: JSON array of { id, importance } — no preamble, just the array.`

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseJsonResponse(raw: string): unknown[] {
  // Extract the JSON array regardless of surrounding text/fences
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array found in response')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function gradeCards(
  cacheDir: string,
  force = false,
): Promise<GradedCard[]> {
  const inPath  = join(cacheDir, 'cards-draft.json')
  const outPath = join(cacheDir, 'cards-graded.json')

  if (!force) {
    try {
      const cached = JSON.parse(await readFile(outPath, 'utf8')) as GradedCard[]
      console.log(`[grade] cached cards-graded.json (${cached.length} cards)`)
      return cached
    } catch { /* not cached */ }
  }

  const drafts: DraftCard[] = JSON.parse(await readFile(inPath, 'utf8'))

  // Copy to graded with default importance 0
  const graded: GradedCard[] = drafts.map(c => ({ ...c, importance: 0 }))

  // Send only id+q+a to save tokens
  const slim = graded.map((c, i) => ({ id: i, q: c.q, a: c.a }))
  const batches = chunk(slim, BATCH_SIZE)

  console.log(`[grade] Grading ${drafts.length} cards in ${batches.length} batches...`)

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    console.log(`[grade]   batch ${bi + 1}/${batches.length} (${batch.length} cards)`)

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: JSON.stringify(batch),
      }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text
    const results = parseJsonResponse(raw) as Array<{ id: number; importance: number }>

    for (const { id, importance } of results) {
      if (id >= 0 && id < graded.length) {
        graded[id].importance = importance
      }
    }

    if (bi < batches.length - 1) await delay(500)
  }

  await writeFile(outPath, JSON.stringify(graded, null, 2), 'utf8')
  console.log(`[grade] Done → cards-graded.json`)
  return graded
}
