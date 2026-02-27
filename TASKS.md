# Tasks & Progress

## Setup checklist

### GitHub
- [x] Create GitHub repo `willchurcher/willchurcher-apps`
- [x] `gh auth login` — authenticated as willchurcher
- [x] Repo pushed to `git@github.com:willchurcher/willchurcher-apps.git`

### DNS
- [x] `apps CNAME → cname.vercel-dns.com` added in Namecheap
- [ ] Verify `apps.willchurcher.com` resolves (may still be propagating)

### Vercel
- [x] Vercel CLI installed and authenticated (wrapper at `/root/.nvm/.../bin/vercel`)
- [x] Project `example` deployed to Vercel
- [x] Domain `apps.willchurcher.com` added to project
- [ ] **Connect GitHub → Vercel auto-deploy**
      Go to: vercel.com/willchurchers-projects/example/settings/git
      Connect repo `willchurcher/willchurcher-apps`, Root Directory: `apps/example`
      (Until then, deploy manually with `cd apps/example && vercel --prod --scope willchurchers-projects`)

## Apps

### Home screen — apps.willchurcher.com
- [x] iPhone-style icon grid
- [x] Sepia light mode + warm dark mode
- [x] React Router (all apps are routes)

### Pomodoro — apps.willchurcher.com/pomodoro
- [x] Circular progress ring
- [x] Focus / break modes
- [x] Session counter

### Notes — apps.willchurcher.com/notes
- [x] Add / delete notes
- [x] localStorage persistence
- [x] Timestamps

## Backlog (app ideas)
- [ ] todo-list
- [ ] habit tracker
