export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { prompt } = req.body

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt required' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })
    return
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json() as any
  if (!response.ok) {
    res.status(500).json({ error: data })
    return
  }

  res.json({
    text: data.content[0].text,
    model: data.model,
    usage: data.usage,  // { input_tokens, output_tokens }
  })
}
