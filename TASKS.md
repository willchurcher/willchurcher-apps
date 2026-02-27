# Tasks & Progress

## Setup checklist

### GitHub
- [ ] Create GitHub account at github.com (username: willchurcher)
- [ ] On VM: `gh auth login` (choose HTTPS → Login with browser, follow one-time code)
- [ ] On VM: `gh repo create willchurcher-apps --public --source=/root/willchurcher-apps --push`

### DNS (in domain registrar / Cloudflare)
- [ ] Add wildcard CNAME: `*` → `cname.vercel-dns.com` (covers all future apps, one-time)

### Vercel
- [ ] Create account at vercel.com → sign up with GitHub
- [ ] New Project → import `willchurcher-apps` → Root Directory: `apps/example`
- [ ] After deploy: Settings → Domains → add `example.willchurcher.com`

## Apps

### example (scaffold)
- [x] Scaffold Vite+React+TS app
- [ ] Deploy to Vercel
- [ ] Verify at example.willchurcher.com

## Backlog (app ideas)
<!-- Add app ideas here as you think of them -->
- [ ] todo-list
- [ ] pomodoro timer

## Done
<!-- Move completed apps here -->
