# C++ Ingest Pipeline — Spec

A multi-stage CLI pipeline that scrapes learncpp.com chapter by chapter, formats structured notes, generates exhaustive flashcards, then grades each card for importance.

---

## Overview

```
learncpp.com
     │
     ▼
┌─────────────────────┐
│  Stage 1: Scrape    │  Fetch raw HTML for each lesson in a chapter
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Stage 2: Extract   │  Strip HTML → plain text (one file per lesson)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Stage 3: Format    │  Claude → structured notes.md with ASCII diagrams
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Stage 4: Cards     │  Claude → ALL possible flashcards (exhaustive)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Stage 5: Grade                     │  Claude loop → importance score per card
│  (batch API calls, one per N cards) │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Stage 6: Upload    │  Notes → public/notes/; cards → Supabase
└─────────────────────┘
```

Each stage saves output to disk before the next begins. The pipeline can be paused, inspected, and resumed at any stage.

---

## Invocation

```bash
# Full pipeline for one chapter
npx ts-node scripts/ingest-chapter.ts <chapter-number>

# Run from a specific stage (uses cached output from prior stages)
npx ts-node scripts/ingest-chapter.ts <chapter-number> --from scrape
npx ts-node scripts/ingest-chapter.ts <chapter-number> --from extract
npx ts-node scripts/ingest-chapter.ts <chapter-number> --from format
npx ts-node scripts/ingest-chapter.ts <chapter-number> --from cards
npx ts-node scripts/ingest-chapter.ts <chapter-number> --from grade

# Force re-run all stages (ignore cache)
npx ts-node scripts/ingest-chapter.ts <chapter-number> --force
```

---

## File Layout

```
scripts/
  ingest-chapter.ts          ← main entry point
  lib/
    scrape.ts                ← Stage 1
    extract.ts               ← Stage 2
    format.ts                ← Stage 3
    cards.ts                 ← Stage 4
    grade.ts                 ← Stage 5
    upload.ts                ← Stage 6
  prompts/
    format-notes.txt         ← Stage 3 prompt (edit without touching code)
    generate-cards.txt       ← Stage 4 prompt
    grade-card.txt           ← Stage 5 prompt
  cache/
    chapter-<N>/
      lessons/
        <slug>.html          ← raw HTML
        <slug>.txt           ← extracted plain text
      notes-draft.md         ← Stage 3 output
      cards-draft.json       ← Stage 4 output (ungraded)
      cards-graded.json      ← Stage 5 output (with importance scores)

apps/example/public/notes/
  cpp-chapter-<N>.md         ← notes file (written by Stage 6; served statically)
```

---

## Stage 1 — Scrape

Fetch `https://www.learncpp.com/` to get the table of contents. Extract all lesson URLs for the requested chapter. Fetch each lesson HTML with a 1–2s delay between requests. Save to `cache/chapter-<N>/lessons/<slug>.html`.

Skip fetch if file already exists (cache hit).

---

## Stage 2 — Extract

For each `.html` lesson file:
1. Parse HTML, find the main content div (`.entry-content` or equivalent).
2. Strip: navigation, sidebar, ads, quiz/exercise sections, comment threads.
3. Keep: headings, body text, code blocks, tables.
4. Write plain text to `<slug>.txt`.

This is a dumb pass — no summarisation, just clean text for Claude to work with.

---

## Stage 3 — Format Notes

**Prompt:** `scripts/prompts/format-notes.txt`

Sends all lesson `.txt` files for the chapter to Claude. One call per lesson if the chapter is too long. Output: `cache/chapter-<N>/notes-draft.md`.

### Notes format

```markdown
# Chapter N — Title

## Section Name

Prose explanation. Key terms **bolded**. Inline code in `backticks`.

• **Term**: definition in one line
• **Another term**: definition

```cpp
// Code examples in fenced blocks
int x = 5;
```

### Sub-section

More prose or bullets.
```

### ASCII diagrams

Every flow, relationship, memory layout, or structure must be drawn as ASCII — never described in prose.

```
┌──────────────┐     ┌──────────┐     ┌────────────┐
│  Source code │────▶│ Compiler │────▶│ Executable │
└──────────────┘     └──────────┘     └────────────┘
```

Use box-drawing characters (`┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼ ▶ ▲ ▼`). Trees use `/` `\` for branches.

### Exclude

Quizzes, exercises, author commentary, historical asides, "further reading", section summaries that just restate what was already said.

### Format prompt (`format-notes.txt`)

```
You are formatting learncpp.com lesson content into structured study notes.

RULES:
- ## for major sections, ### for sub-sections
- Definitions: • **Term**: explanation (one line)
- Inline code: always in backticks
- Code examples: fenced ```cpp blocks
- Diagrams: ASCII art — never describe a diagram in prose, always draw it
- Prose: concise; one idea per sentence; no filler or encouragement
- Remove: quizzes, exercises, author commentary, historical asides, further reading
- Keep: definitions, rules, syntax, gotchas, design rationale, examples

OUTPUT: raw markdown only, no preamble
```

---

## Stage 4 — Generate Flashcards (Exhaustive)

**Prompt:** `scripts/prompts/generate-cards.txt`

The goal is **maximum coverage** — generate a card for every piece of information in the notes. Do not filter at this stage. Volume is preferred over curation; the grading pass (Stage 5) handles filtering.

Sends the formatted notes to Claude. Output: `cache/chapter-<N>/cards-draft.json`.

### Card schema (ungraded)

```typescript
{
  chapter: string,     // e.g. '1'
  topic: string,       // fine-grained label, e.g. 'Variables', 'Scope'
  noteSection: string, // heading in notes file this card relates to
  q: string,
  a: string,
  importance: null,    // filled in by Stage 5
}
```

IDs are assigned by Supabase on insert (auto-increment or uuid — whichever the table uses).

### Answer style

Derived from the user's hand-edited cards in `data.json`. The 5 best edits (selected by answer length — more editing effort = clearest style signal) are injected as few-shot examples.

**Bullet answers:**
```
• **Term**: short explanation
• **Another term**: its meaning
```

**Prose:** 1–3 sentences. Direct. No hedging.

**Inline code:** always backtick-wrapped — every symbol, keyword, type name.

**Code blocks:** ` ```cpp ` for multi-line examples or syntax demos.

**ASCII trees:**
```
    =
   / \
  x   +
     / \
    5   3
```

**Answer length:** 2–8 lines. Longer only when the concept genuinely requires it.

**Questions:** specific and testable. "What does `X` do?" not "What is `X`?" unless X is purely definitional. Multi-part questions allowed for tightly related sub-concepts.

### Cards prompt (`generate-cards.txt`)

```
You are generating C++ study flashcards from structured notes.
Generate a card for EVERY piece of information — definitions, rules, syntax,
gotchas, comparisons, examples. Err on the side of too many cards.

STYLE RULES:
- Answers: • **Term**: explanation bullets OR short prose, whichever suits the content
- Inline code: always backticks — `int`, `nullptr`, `std::vector`, etc.
- Code blocks: ```cpp for syntax demos or worked examples
- ASCII art: use / \ for trees, box-drawing for flow diagrams
- Answer length: 2–8 lines, concise, no filler
- Questions: specific and testable; not "what is X" unless X is definitional

FEW-SHOT EXAMPLES:
[5 best cards from data.json inserted at runtime]

OUTPUT: JSON array of { q, a, topic, noteSection }
No preamble — just the array.
```

---

## Stage 5 — Grade Importance

**Prompt:** `scripts/prompts/grade-card.txt`

Loops over every card in `cards-draft.json` and calls Claude to assign an importance score. Cards are sent in batches of ~20 to reduce API calls while keeping enough context for good judgement.

Output: `cache/chapter-<N>/cards-graded.json` — same as draft but with `importance` filled in.

### Importance scale

| Score | Label | Meaning |
|-------|-------|---------|
| 2 | Very High | Core C++ — almost certain to come up in an interview |
| 1 | High | Likely useful; commonly tested or used in practice |
| 0 | Medium | Good general knowledge; worth knowing |
| -1 | Low | Background / toolchain / rarely asked |
| -2 | Very Low | Historical, trivia, or already obvious to any programmer |

### What Claude should consider when grading

- **Interview relevance**: would a senior C++ engineer ask this in a technical screen?
- **Practical usage**: does this come up in real codebases?
- **Fundamentality**: is this a building block for understanding other things?
- **Trivia penalty**: historical facts, compiler flags, IDE settings → Low or Very Low

The grading context given to Claude:

```
You are grading C++ flashcards for interview-prep importance.
The target is a senior C++ engineering role (systems, performance-critical code).

SCALE:
  2 = Core C++ — almost certain to come up in an interview
  1 = High — commonly tested or used in real codebases
  0 = Medium — good general knowledge
 -1 = Low — background / toolchain / rarely asked
 -2 = Very Low — historical trivia or obvious to any programmer

GUIDANCE:
- Memory model, pointers, references, RAII, destructors, virtual dispatch → 2
- Type system, templates, move semantics, STL containers → 1–2
- Build system, compiler flags, IDE settings → -1 to -2
- C++ history, who invented it, what year → -2
- Compiler pipeline stages (parsing, codegen) → 0 to -1 unless deeply technical

For each card below, output its id and importance score only.
OUTPUT: JSON array of { id, importance }
```

### Grading loop

```typescript
const BATCH_SIZE = 20

for (const batch of chunk(cards, BATCH_SIZE)) {
  const result = await claude(gradePrompt + JSON.stringify(batch))
  // parse { id, importance }[] and merge back into cards
  await delay(500) // avoid rate limits
}
```

---

## Stage 6 — Upload

1. Print summary: N cards, importance distribution (count per score). Ask `y/n`.
2. Write `notes-draft.md` → `apps/example/public/notes/cpp-chapter-<N>.md` (served as a static file; committed to git as part of the normal deploy flow).
3. Insert all graded cards into Supabase — same table the app already reads from.
4. Does **not** touch `cpp-flashcards-data.ts` — Supabase is the source of truth for cards.

The script reads `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from `.env` (service key so it can bypass RLS from the CLI).

---

## Manual Review Loop

After running the pipeline for each chapter:

1. Skim `cards-graded.json` — spot-check importance scores, delete any duplicate or nonsense cards.
2. Skim `notes-draft.md` — fix any AI wording, improve diagrams.
3. Run Stage 6 → cards inserted into Supabase, notes file written locally.
4. Study in the app immediately — no deploy needed for new cards.
5. Hand-edit cards in the app that feel wrong — edits go to Supabase.
6. Those hand-edits become the style reference for future chapters.

---

## Chapter Priority

| Priority | Chapters | Key Topics |
|----------|----------|------------|
| Very High | 1–2 | Statements, functions, structure |
| Very High | 4–5 | Types, literals, strings |
| Very High | 7 | Scope, duration, linkage |
| Very High | 8 | Control flow |
| Very High | 12–13 | References, pointers |
| Very High | 14–15 | Classes |
| Very High | 19 | Dynamic memory |
| Very High | 23–25 | Inheritance, virtual, polymorphism |
| High | 6 | Operators |
| High | 10–11 | Type conversion, overloading |
| High | 16–17 | std::vector, std::string |
| Medium | 26–27 | Templates, exceptions |
| Skip | 0 | Already done |
