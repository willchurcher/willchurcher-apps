/**
 * Stage 3 — Extract
 * Runs cheerio on raw_html → clean markdown. Writes to cpp_lessons.clean_text.
 * Run: npx tsx scripts/pipeline/03-extract.ts [--chapter 2] [--limit 10]
 */
import 'dotenv/config'
import { parseArgs } from 'node:util'
import { load } from 'cheerio'
import type { CheerioAPI, AnyNode, Element, Text } from 'cheerio'
import { db } from './db.ts'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    chapter: { type: 'string' },
    limit:   { type: 'string' },
    force:   { type: 'boolean', default: false },
  },
})

// ── Cheerio extraction (same logic as old lib/extract.ts) ──────
function htmlToMarkdown(html: string): string {
  const $ = load(html)
  $('script, style, noscript, iframe, .cpp-quiz-question, .nav-button, .code-block').remove()
  const root = $('article .entry-content').get(0) ?? $('.entry-content').get(0) ?? $('article').get(0) ?? $('body').get(0)
  if (!root) return ''
  return renderNode($, root as Element).trim().replace(/\n{3,}/g, '\n\n')
}

function renderChildren($: CheerioAPI, el: Element): string {
  return $(el).contents().toArray().map(c => renderNode($, c as AnyNode)).join('')
}

function renderNode($: CheerioAPI, node: AnyNode): string {
  if (!node) return ''
  if (node.type === 'text') return (node as Text).data ?? ''
  if (node.type === 'script' || node.type === 'style') return ''
  if (node.type !== 'tag') return ''
  const el = node as Element
  const tag = ((el as any).name ?? '').toLowerCase()
  if (!tag) return renderChildren($, el)
  const inner = () => renderChildren($, el)

  switch (tag) {
    case 'h1': return `\n# ${inner().trim()}\n\n`
    case 'h2': return `\n## ${inner().trim()}\n\n`
    case 'h3': return `\n### ${inner().trim()}\n\n`
    case 'h4': return `\n#### ${inner().trim()}\n\n`
    case 'h5':
    case 'h6': return `\n##### ${inner().trim()}\n\n`
    case 'p':  return `\n${inner().trim()}\n\n`
    case 'br': return '\n'
    case 'hr': return '\n---\n\n'
    case 'strong':
    case 'b':  { const t = inner().trim(); return t ? `**${t}**` : '' }
    case 'em':
    case 'i':  { const t = inner().trim(); return t ? `*${t}*` : '' }
    case 'code': {
      if ((el as any).parent && ((el as any).parent as any).name === 'pre') return inner()
      return `\`${inner().trim()}\``
    }
    case 'pre': {
      const code = $(el).text()
      const cls = $(el).find('code').attr('class') ?? $(el).attr('class') ?? ''
      const lang = /cpp|c\+\+/i.test(cls) ? 'cpp' : /bash|shell/i.test(cls) ? 'bash' : 'cpp'
      return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`
    }
    case 'ul': {
      let out = '\n'
      $(el).find('> li').each((_, li) => { out += `• ${renderChildren($, li as Element).trim()}\n` })
      return out + '\n'
    }
    case 'ol': {
      let out = '\n'; let i = 1
      $(el).find('> li').each((_, li) => { out += `${i++}. ${renderChildren($, li as Element).trim()}\n` })
      return out + '\n'
    }
    case 'li': return inner()
    case 'a':  return inner()
    case 'table': {
      const rows: string[][] = []
      $(el).find('tr').each((_, tr) => {
        const cells: string[] = []
        $(tr).find('th, td').each((_, cell) => {
          cells.push(renderChildren($, cell as Element).trim().replace(/\n+/g, ' '))
        })
        rows.push(cells)
      })
      if (!rows.length) return ''
      const cols = Math.max(...rows.map(r => r.length))
      const pad = (r: string[]) => { while (r.length < cols) r.push(''); return r }
      let out = '\n'
      out += `| ${pad(rows[0]).join(' | ')} |\n`
      out += `| ${Array(cols).fill('---').join(' | ')} |\n`
      for (const row of rows.slice(1)) out += `| ${pad(row).join(' | ')} |\n`
      return out + '\n'
    }
    case 'blockquote': return `\n> ${inner().trim().replace(/\n/g, '\n> ')}\n\n`
    case 'img':
    case 'figure':
    case 'figcaption':
    case 'svg':
    case 'picture': return ''
    default: return inner()
  }
}

// ── Main ───────────────────────────────────────────────────────
let query = db
  .from('cpp_lessons')
  .select('id, lesson_number, lesson_title')
  .not('raw_html', 'is', null)
  .order('chapter', { ascending: true })
  .order('lesson_number', { ascending: true })

if (!values.force) query = query.is('clean_text', null)
if (values.chapter) query = query.eq('chapter', values.chapter)
if (values.limit) query = query.limit(Number(values.limit))

const { data: lessons, error } = await query
if (error) throw new Error(error.message)
if (!lessons?.length) { console.log('[extract] Nothing to do'); process.exit(0) }

console.log(`[extract] Processing ${lessons.length} lessons...`)

for (const lesson of lessons) {
  // Fetch raw_html separately (it's large — don't include in list query)
  const { data, error: e } = await db
    .from('cpp_lessons')
    .select('raw_html')
    .eq('id', lesson.id)
    .single()
  if (e || !data?.raw_html) { console.warn(`[extract]   skip ${lesson.lesson_number}: no raw_html`); continue }

  const clean = htmlToMarkdown(data.raw_html)
  const { error: uErr } = await db
    .from('cpp_lessons')
    .update({ clean_text: clean, extracted_at: new Date().toISOString() })
    .eq('id', lesson.id)
  if (uErr) throw new Error(uErr.message)

  console.log(`[extract]   ${lesson.lesson_number} — ${lesson.lesson_title} (${clean.length} chars)`)
}

console.log('[extract] ✓ Done')
