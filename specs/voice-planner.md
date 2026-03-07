# Voice Planner

A personal productivity tool for capturing ideas via voice note transcripts, extracting structured plans using Claude AI, and working through them incrementally over time.

---

## Requirements & Objectives

### The Problem

You have ideas constantly — projects, goals, random plans — and voice notes are the fastest way to capture them. But transcripts are messy and unstructured. They need turning into something actionable before they're useful. Existing to-do apps require you to structure your thoughts upfront, which breaks the flow of capture.

### The Goal

A place to dump raw voice note transcripts and have AI do the hard work of turning them into structured, actionable plans. You should be able to come back to this app over time, pick up where you left off, and gradually work through your backlog of ideas.

### Core Workflow

1. Record a voice note on your phone (any recorder app)
2. Copy the transcript
3. Open Voice Planner → paste the transcript → hit Parse
4. Claude reads the transcript and extracts projects and tasks
5. Review what Claude found, adjust if needed, confirm
6. Your projects are now in the app — drill into them, work through the steps
7. When you want to action something, hit **Copy Prompt** → paste into Claude app → let it guide you through the work

### What Gets Extracted

Every transcript gets broken down into a hierarchy:

- **Project** — a distinct goal or initiative (e.g. "Organise under-sink kitchen storage")
  - **Task** — a 30-minute work block within that project (e.g. "Take measurements and photos of current setup")
    - **Microtask** — a 5-minute step within a task (e.g. "Clear everything out from under the sink")

Claude assigns time estimates to every level. One transcript can contain multiple projects.

### The Copy Prompt Feature

The most important feature. On any project or task, a **Copy Prompt** button generates a detailed prompt you can paste directly into the Claude app. The prompt includes:

- Full project context and goal
- The complete task breakdown
- Which tasks are done and which remain
- Instructions for Claude to guide you through execution step-by-step

This turns the planner into a launchpad — you plan here, execute with Claude elsewhere.

### Marking Progress

- Tasks and microtasks have a checkbox to mark done
- When marking done, you can optionally add a short completion note (e.g. "Done, but changed the design slightly")
- Projects show a progress indicator based on completed tasks

### Gamification Summary

A summary screen showing:
- Total projects created and completed
- Total tasks completed
- A simple sense of momentum and progress over time

### Non-goals (for now)

- Time tracking (no start/stop timer)
- Tags and search (future)
- Sharing with others
- Amazon integration or external service links
- Mobile native app

---

## Technical Spec

### Stack

- **Frontend:** React + TypeScript (Vite), existing monorepo app at `apps/example/`
- **Route:** `/planner`
- **Storage:** Supabase (`app_data` table, key `planner`) — data is synced across devices and persists per user account. See `specs/auth.md`.
- **LLM:** Anthropic Claude API via a Vercel serverless function (to avoid CORS issues)
- **API key:** stored as a Vercel environment variable (`ANTHROPIC_API_KEY`), never exposed to the client

### Data Model

Stored as a single JSON blob in `app_data.data` under key `planner` (see `specs/auth.md`).

```ts
interface Transcript {
  id: string           // uuid
  text: string         // raw pasted transcript
  createdAt: string    // ISO date
}

interface Project {
  id: string
  transcriptId: string
  title: string
  description: string
  status: 'active' | 'done'
  createdAt: string
}

interface Task {
  id: string
  projectId: string
  parentId: string | null   // null = top-level 30-min task; set = microtask
  title: string
  description: string
  estimatedMins: number     // LLM-provided estimate
  status: 'todo' | 'done'
  completedAt: string | null
  completionNote: string | null
  level: 'task' | 'microtask'
  order: number             // display order within parent
}

interface PlannerStore {
  transcripts: Transcript[]
  projects: Project[]
  tasks: Task[]
}
```

### Vercel Serverless Function

File: `apps/example/api/claude.ts`

- Receives `{ prompt: string }` POST request from the frontend
- Calls Anthropic API (`claude-sonnet-4-6`) with the prompt
- Returns the raw text response
- `vercel.json` updated to allow `/api/*` routes alongside the SPA rewrite

### UI Screens

#### 1. Planner Home (`/planner`)

- Project list: title, progress bar (tasks done / total), status badge
- **New** button → paste transcript flow
- **Stats** button → summary screen
- Tap a project → Project Detail

#### 2. Parse Flow

Three steps in sequence:

**Step 1 — Paste**
- Large textarea: "Paste your transcript here"
- Parse button

**Step 2 — Review**
- Loading state while Claude processes
- Claude returns a structured preview: "I found X projects" with titles and task counts
- User can delete unwanted projects, rename them inline
- Confirm button → saves to localStorage and returns to home

**Step 3 — Done**
- Toast or brief confirmation, redirect to project list

#### 3. Project Detail

- Project title + description
- Progress bar
- List of top-level Tasks (30-min blocks), each expandable to show Microtasks
- Each item has: title, estimated time, checkbox, optional completion note input
- **Copy Prompt** button at the top (copies full project context prompt to clipboard)
- **Copy Prompt** button on individual tasks (copies task-scoped prompt)

#### 4. Summary / Stats Screen

- Projects: X completed / Y total
- Tasks: X completed
- Microtasks: X completed
- Simple list of recently completed projects

### Claude Prompts

#### Extraction Prompt (parse transcript)

```
You are a productivity assistant. The user has pasted a voice note transcript.

Extract all distinct projects, goals, or plans from the transcript. For each one:
1. Give it a clear title (5 words max)
2. Write a 1-2 sentence description of the goal
3. Break it into tasks of ~30 minutes each
4. Break each task into microtasks of ~5 minutes each
5. Estimate time in minutes for every task and microtask

Return a JSON array. No markdown, no explanation, just the JSON.

Schema:
[
  {
    "title": string,
    "description": string,
    "tasks": [
      {
        "title": string,
        "description": string,
        "estimatedMins": number,
        "microtasks": [
          { "title": string, "description": string, "estimatedMins": number }
        ]
      }
    ]
  }
]

Transcript:
{TRANSCRIPT}
```

#### Copy Prompt (project-level)

```
I'm working on a project and I need your help executing it step by step.

PROJECT: {title}
GOAL: {description}

FULL PLAN:
{tasks and microtasks, formatted as a numbered outline with time estimates}

CURRENT STATUS:
{list of done tasks} ✓
{list of remaining tasks} ○

Please help me work through this project. Start by asking me which task I want to tackle first, then guide me through the microsteps one at a time. Check in after each one. Be practical and hands-on.
```

### File Layout

```
apps/example/
├── api/
│   └── claude.ts          ← new Vercel serverless function
├── src/
│   └── VoicePlanner.tsx   ← new component (~600 lines, self-contained)
├── vercel.json            ← updated to allow /api/* routes
└── package.json           ← no new dependencies (uses fetch for API call)
```

`VoicePlanner.tsx` is self-contained — all state, sub-views, and helpers in one file, consistent with the existing app pattern.

### vercel.json Update

The existing SPA rewrite catches all routes. Add an explicit `routes` entry so `/api/*` hits the serverless function before the SPA catch-all:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Environment Variable Setup

One-time: add `ANTHROPIC_API_KEY` to the Vercel project via the Vercel dashboard or CLI. This is the only setup step beyond deploying the code.

### Implementation Phases

#### Phase 1 — POC (build first)
- Paste transcript → call Claude → display extracted projects and tasks
- Save to localStorage
- View projects and tasks
- Mark tasks done (no note yet)
- Copy Prompt button (project level only)

#### Phase 2 — Polish
- Completion notes
- Microtask expand/collapse
- Task-level Copy Prompt
- Manual editing of extracted tasks

#### Phase 3 — Extras
- Summary / stats screen
- Tags and search
- Multiple transcript support per project
