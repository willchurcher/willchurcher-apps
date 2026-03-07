import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://xnqmnhqclbprorcghyeh.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucW1uaHFjbGJwcm9yY2doeWVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxMjk1MSwiZXhwIjoyMDg4Mzg4OTUxfQ.LrK-L5qiTukdtPYC2ukTojJT4173mzIwwQsGC98_ANA'
const USER_ID          = '09aa2e79-4897-41cd-8ec0-b77478c6f22e'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const raw  = JSON.parse(readFileSync(new URL('../data.json', import.meta.url), 'utf8'))
const data = {
  overrides:  raw.overrides  ?? {},
  custom:     raw.custom     ?? [],
  progress:   raw.progress   ?? {},
  importance: raw.importance ?? {},
  graveyard:  raw.graveyard  ?? [],
}

// ── 1. Upsert current state into app_data ──────────────────────
console.log('Seeding app_data...')
const { error: appErr } = await supabase
  .from('app_data')
  .upsert({ user_id: USER_ID, app: 'cpp-flashcards', data }, { onConflict: 'user_id,app' })
if (appErr) { console.error('app_data error:', appErr); process.exit(1) }
console.log('  app_data OK')

// ── 2. Insert one edit row per override (audit log seed) ───────
console.log('Seeding cpp_card_edits...')
const editRows = Object.entries(data.overrides).map(([cardId, { q, a }]) => ({
  user_id:    USER_ID,
  card_id:    Number(cardId),
  q,
  a,
  source:     'import',
}))
if (editRows.length > 0) {
  const { error: editErr } = await supabase.from('cpp_card_edits').insert(editRows)
  if (editErr) { console.error('cpp_card_edits error:', editErr); process.exit(1) }
}
console.log(`  ${editRows.length} edit records inserted`)

console.log('Done. All data seeded to Supabase.')
