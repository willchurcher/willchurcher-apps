// Shared Claude API client with usage logging

export interface UsageRecord {
  id: string
  timestamp: number
  app: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export const USAGE_LOG_KEY = 'claude-usage-log'
const MAX_RECORDS = 1000

const MODEL_PRICES: Array<{ prefix: string; inputPer1M: number; outputPer1M: number }> = [
  { prefix: 'claude-opus-4',   inputPer1M: 5,   outputPer1M: 25  },
  { prefix: 'claude-sonnet-4', inputPer1M: 3,   outputPer1M: 15  },
  { prefix: 'claude-haiku-4',  inputPer1M: 1,   outputPer1M: 5   },
]

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICES.find(p => model.startsWith(p.prefix))
    ?? { inputPer1M: 3, outputPer1M: 15 }
  return (inputTokens * price.inputPer1M + outputTokens * price.outputPer1M) / 1_000_000
}

export function loadUsageLog(): UsageRecord[] {
  try { return JSON.parse(localStorage.getItem(USAGE_LOG_KEY) ?? '[]') }
  catch { return [] }
}

function appendUsage(record: UsageRecord) {
  const existing = loadUsageLog()
  existing.unshift(record)
  localStorage.setItem(USAGE_LOG_KEY, JSON.stringify(existing.slice(0, MAX_RECORDS)))
}

export async function callClaude(prompt: string, app: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) throw new Error('API error')
  const data = await res.json()

  if (data.usage) {
    const model = data.model ?? 'claude-sonnet-4-6'
    appendUsage({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      app,
      model,
      inputTokens: data.usage.input_tokens ?? 0,
      outputTokens: data.usage.output_tokens ?? 0,
      costUsd: calcCost(model, data.usage.input_tokens ?? 0, data.usage.output_tokens ?? 0),
    })
  }

  return data.text
}
