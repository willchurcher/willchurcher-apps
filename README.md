# willchurcher-apps

A monorepo of React apps, built with Claude Code on a VM via SSH, deployed to Vercel.

## Apps
Each app lives in `apps/<name>` and deploys to `<name>.willchurcher.com` on push to `master`.

## Stack
- Vite + React + TypeScript
- Vercel hosting
- Claude Code for development (SSH from phone)

## Quick start (new app)
```bash
# Inside the repo
/new-app <appname>
```
Then follow the Vercel setup steps printed by the skill.

## Local preview
```bash
cd apps/<appname>
npm install
npm run dev
```
