import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_KEY!

export const db = createClient(url, key)

export const SUPABASE_REF     = 'xnqmnhqclbprorcghyeh'
export const SUPABASE_API_URL = 'https://api.supabase.com'

export async function runSQL(sql: string): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN!
  const res = await fetch(
    `${SUPABASE_API_URL}/v1/projects/${SUPABASE_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SQL failed (${res.status}): ${body}`)
  }
}
