# willchurcher-apps — Claude Instructions

This is a single Vite + React app with React Router, deployed to Vercel.
Read this file at the start of every session to restore context.

## Stack
- **Framework:** Vite + React + TypeScript + React Router
- **Hosting:** Vercel (one project, one deployment)
- **Domain:** `apps.willchurcher.com` (DNS: `apps CNAME → cname.vercel-dns.com`)
- **Deploy trigger:** Push to `master` branch on GitHub → Vercel auto-deploys

## Repo structure
```
willchurcher-apps/
├── CLAUDE.md              ← you are here
├── TASKS.md               ← task and progress list (keep updated)
├── README.md
├── .claude/commands/      ← project skills (/deploy-status, /update-progress)
└── apps/
    └── example/           ← single Vite app, all routes live here
        ├── src/
        │   ├── App.tsx    ← BrowserRouter + all routes defined here
        │   └── main.tsx
        ├── vercel.json    ← SPA rewrite: all paths → index.html
        ├── index.html
        ├── package.json
        ├── vite.config.ts
        └── tsconfig.json
```

## Adding a new app/page
1. Add a new component in `apps/example/src/App.tsx`
2. Add a `<Route path="/appname" element={<YourComponent />} />` in the router
3. Add the app to the `apps` array on the Home page so it shows up in the index
4. Add entry to TASKS.md
5. Push to GitHub — Vercel auto-deploys

## Conventions
- All apps are routes within the single Vite project (`apps/example`)
- App names: lowercase, hyphenated (e.g. `todo-list`, `pomodoro`)
- Always update TASKS.md when starting or finishing an app
- Commit messages: imperative mood, e.g. "Add pomodoro route", "Fix todo list reset"

## Environment
- Working on a Linux VM, SSH'd in from phone (Terminus app on iPhone)
- Vercel CLI installed and authenticated via wrapper at `/root/.nvm/versions/node/v24.14.0/bin/vercel`
- Run `npm install && npm run dev` inside `apps/example` to preview locally

## Current apps
| App | URL | Status |
|-----|-----|--------|
| Home | apps.willchurcher.com | live |
| Example | apps.willchurcher.com/example | live |

## GitHub repo
`git remote add origin git@github.com:willchurcher/willchurcher-apps.git`
