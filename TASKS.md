# Tasks & Progress

## Setup — all done
- [x] GitHub repo `willchurcher/willchurcher-apps` — connected to Vercel auto-deploy
- [x] Vercel CLI authenticated (token stored in `/root/.nvm/.../bin/vercel` wrapper)
- [x] `apps.willchurcher.com` → `master` (production)
- [x] `devapps.willchurcher.com` → `develop` (staging)
- [x] GitHub push → Vercel auto-deploys (master = prod, develop = staging)

## Apps

### Home — apps.willchurcher.com
- [x] iPhone-style icon grid, 4 columns
- [x] Sepia light mode + warm dark mode (CSS variables, auto via prefers-color-scheme)
- [x] React Router — all apps are routes in one Vite project

### Timer — apps.willchurcher.com/timer
- [x] Scroll wheel picker (hours / minutes / seconds), iOS-style fade
- [x] Countdown ring with pause/resume/reset
- [x] Ring turns green + "done" on completion

### Notes — apps.willchurcher.com/notes
- [x] Add / delete notes
- [x] localStorage persistence
- [x] Timestamps

## Skills
- [x] `/remember` — scans conversation for preferences, confirms, saves to MEMORY.md
- [x] `/preferences` — view, add, remove saved preferences
- [x] `/deploy-status` — check Vercel deployment status
- [x] `/update-progress` — update this file

## Backlog
- [ ] todo-list
- [ ] habit tracker
- [ ] something with notifications (timer alarm?)
