import { supabase } from './supabase'
import type { Flashcard } from './cpp-flashcards-data'

const APP_KEY = 'cpp-flashcards'

// ── Stored state shape (matches data.json export) ──────────────
export interface CppCloudData {
  overrides:  Record<string, { q: string; a: string }>
  custom:     Flashcard[]
  progress:   Record<string, { bucket: number; nextReview: number }>
  importance: Record<string, number>
  graveyard:  number[]
}

// ── Current state ───────────────────────────────────────────────
export async function loadFromCloud(userId: string): Promise<CppCloudData | null> {
  const { data, error } = await supabase
    .from('app_data')
    .select('data')
    .eq('user_id', userId)
    .eq('app', APP_KEY)
    .maybeSingle()
  if (error || !data) return null
  return data.data as CppCloudData
}

export async function saveToCloud(userId: string, state: CppCloudData): Promise<void> {
  await supabase
    .from('app_data')
    .upsert({ user_id: userId, app: APP_KEY, data: state }, { onConflict: 'user_id,app' })
}

// ── Edit audit log ──────────────────────────────────────────────
export type EditSource = 'manual' | 'ai-enhance' | 'ai-generate' | 'import'

export async function recordEdit(
  userId: string,
  cardId: number,
  q: string,
  a: string,
  source: EditSource = 'manual',
): Promise<void> {
  await supabase
    .from('cpp_card_edits')
    .insert({ user_id: userId, card_id: cardId, q, a, source })
}

// ── Convenience: save override + record edit in one call ────────
export async function saveOverrideToCloud(
  userId: string,
  cardId: number,
  q: string,
  a: string,
  state: CppCloudData,
  source: EditSource = 'manual',
): Promise<void> {
  await Promise.all([
    saveToCloud(userId, state),
    recordEdit(userId, cardId, q, a, source),
  ])
}
