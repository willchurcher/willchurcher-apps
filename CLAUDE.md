# willchurcher-apps — Claude Instructions

This is a monorepo of React apps built and deployed by Claude Code via SSH on a VM.
Read this file at the start of every session to restore context.

## Stack
- **Framework:** Vite + React + TypeScript
- **Hosting:** Vercel (one project per app)
- **Domain:** `appname.willchurcher.com` (wildcard DNS `*.willchurcher.com → cname.vercel-dns.com`)
- **Deploy trigger:** Push to `master` branch on GitHub → Vercel auto-deploys

## Repo structure
```
willchurcher-apps/
├── CLAUDE.md              ← you are here
├── TASKS.md               ← task and progress list (keep updated)
├── README.md
├── .claude/commands/      ← project skills (/new-app, /deploy-status, /update-progress)
└── apps/
    └── <appname>/         ← each app is self-contained
        ├── src/
        ├── index.html
        ├── package.json
        ├── vite.config.ts
        └── tsconfig.json
```

## Adding a new app
Use `/new-app <name>` or follow these steps manually:
1. Copy `apps/example` to `apps/<name>`
2. Update `package.json` name field to `<name>`
3. Update `vite.config.ts` base to `"/"`
4. Add entry to TASKS.md
5. Push to GitHub, then on Vercel:
   - New Project → import this repo
   - Root Directory: `apps/<name>`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Add custom domain: `<name>.willchurcher.com`

## Conventions
- Each app is fully independent (its own package.json, no shared build)
- App names: lowercase, hyphenated (e.g. `todo-list`, `pomodoro`)
- Always update TASKS.md when starting or finishing an app
- Commit messages: imperative mood, e.g. "Add todo-list app", "Fix pomodoro timer reset"

## Environment
- Working on a Linux VM, SSH'd in from phone
- User pushes to GitHub from the VM; Vercel handles the rest
- Node/npm available on VM; run `npm install && npm run dev` inside `apps/<name>` to preview locally

## Current apps
| App | URL | Status |
|-----|-----|--------|
| example | example.willchurcher.com | scaffold only |

## GitHub repo
Set up with: `git remote add origin https://github.com/willchurcher/willchurcher-apps.git`
(Create the GitHub repo first, then push: `git push -u origin master`)
