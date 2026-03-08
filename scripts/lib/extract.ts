/**
 * Stage 2 — Extract
 *
 * Converts raw lesson HTML → clean Markdown using cheerio.
 * This is the key token-saver: a typical learncpp lesson is ~50KB of HTML
 * but only ~5KB of plain text. Claude only sees the clean text.
 *
 * learncpp.com structure:
 *   <article>
 *     <header>  ← title, author, date — skip
 *     <div class="cpp-section ...">  ← content sections — keep
 *     <div class="cpp-quiz-question ...">  ← quizzes — skip
 *     <footer>  ← nav buttons, skip
 *   </article>
 */
import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { load } from 'cheerio'
import type { CheerioAPI, AnyNode, Element, Text } from 'cheerio'
import type { Lesson } from './scrape.ts'

export async function extractChapter(
  lessons: Lesson[],
  cacheDir: string,
  force = false,
): Promise<void> {
  const lessonsDir = join(cacheDir, 'lessons')

  for (const lesson of lessons) {
    const htmlPath = join(lessonsDir, `${lesson.slug}.html`)
    const txtPath  = join(lessonsDir, `${lesson.slug}.txt`)

    if (!force) {
      try {
        await access(txtPath)
        console.log(`[extract]   cached  ${lesson.slug}`)
        continue
      } catch { /* not cached */ }
    }

    const html = await readFile(htmlPath, 'utf8')
    const text = htmlToMarkdown(html)
    await writeFile(txtPath, text, 'utf8')
    console.log(`[extract]   ${lesson.slug} → ${text.length} chars`)
  }
}

function htmlToMarkdown(html: string): string {
  const $ = load(html)

  // ── Only keep safe things to remove (no broad class* selectors) ──
  $('script, style, noscript, iframe').remove()
  // Remove quiz boxes and nav buttons — these are learncpp-specific and safe
  $('.cpp-quiz-question').remove()
  $('.nav-button').remove()
  // .code-block on learncpp is ad slots, not code
  $('.code-block').remove()

  // ── Target content ────────────────────────────────────────────
  // learncpp: article > .article-inner > .entry-content
  // Try progressively broader selectors
  const root = (
    $('article .entry-content').get(0) ??
    $('.entry-content').get(0) ??
    $('article').get(0) ??
    $('body').get(0)
  )
  if (!root) return ''
  return renderNode($, root as Element).trim().replace(/\n{3,}/g, '\n\n')
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
    case 'b': {
      const t = inner().trim()
      return t ? `**${t}**` : ''
    }
    case 'em':
    case 'i': {
      const t = inner().trim()
      return t ? `*${t}*` : ''
    }

    case 'code': {
      // Inside <pre> — return raw text, outer pre handles fencing
      if ((el as any).parent && ((el as any).parent as any).name === 'pre') {
        return inner()
      }
      return `\`${inner().trim()}\``
    }

    case 'pre': {
      const code = $(el).text()
      const cls = $(el).find('code').attr('class') ?? $(el).attr('class') ?? ''
      const lang = /cpp|c\+\+/i.test(cls) ? 'cpp'
                 : /bash|shell/i.test(cls) ? 'bash'
                 : 'cpp'
      return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`
    }

    case 'ul': {
      let out = '\n'
      $(el).find('> li').each((_, li) => {
        out += `• ${renderChildren($, li as Element).trim()}\n`
      })
      return out + '\n'
    }

    case 'ol': {
      let out = '\n'
      let i = 1
      $(el).find('> li').each((_, li) => {
        out += `${i}. ${renderChildren($, li as Element).trim()}\n`
        i++
      })
      return out + '\n'
    }

    case 'li': return inner()

    case 'a': return inner() // strip hrefs, keep link text

    case 'table': return renderTable($, el)

    case 'blockquote':
      return `\n> ${inner().trim().replace(/\n/g, '\n> ')}\n\n`

    case 'img':
    case 'figure':
    case 'figcaption':
    case 'svg':
    case 'picture':
      return ''

    default: return inner()
  }
}

function renderChildren($: CheerioAPI, el: Element): string {
  return $(el).contents().toArray().map(c => renderNode($, c as AnyNode)).join('')
}

function renderTable($: CheerioAPI, el: Element): string {
  const rows: string[][] = []

  $(el).find('tr').each((_, tr) => {
    const cells: string[] = []
    $(tr).find('th, td').each((_, cell) => {
      cells.push(renderChildren($, cell as Element).trim().replace(/\n+/g, ' '))
    })
    rows.push(cells)
  })

  if (rows.length === 0) return ''
  const cols = Math.max(...rows.map(r => r.length))
  const pad = (r: string[]) => { while (r.length < cols) r.push(''); return r }

  let out = '\n'
  out += `| ${pad(rows[0]).join(' | ')} |\n`
  out += `| ${Array(cols).fill('---').join(' | ')} |\n`
  for (const row of rows.slice(1)) {
    out += `| ${pad(row).join(' | ')} |\n`
  }
  return out + '\n'
}
