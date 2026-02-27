Create a new Vite + React + TypeScript app in this monorepo.

The app name is provided as an argument: $ARGUMENTS

## Steps

1. Read CLAUDE.md to confirm conventions.
2. Read TASKS.md to understand current state.
3. Create the directory `apps/$ARGUMENTS/` with the following files:

**`apps/$ARGUMENTS/package.json`**
```json
{
  "name": "$ARGUMENTS",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.1"
  }
}
```

**`apps/$ARGUMENTS/vite.config.ts`**
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
})
```

**`apps/$ARGUMENTS/tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**`apps/$ARGUMENTS/index.html`**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$ARGUMENTS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**`apps/$ARGUMENTS/src/main.tsx`**
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**`apps/$ARGUMENTS/src/App.tsx`**
```tsx
function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>$ARGUMENTS</h1>
      <p>Your new app. Edit <code>src/App.tsx</code> to get started.</p>
    </div>
  )
}

export default App
```

4. Add a `.gitignore` at `apps/$ARGUMENTS/.gitignore`:
```
node_modules
dist
```

5. Update TASKS.md: add a new section under `## Apps` for `$ARGUMENTS` with:
   - [ ] Scaffold done
   - [ ] Deploy to Vercel
   - [ ] Verify at $ARGUMENTS.willchurcher.com

6. Update the `## Current apps` table in CLAUDE.md to include the new app.

7. Print the following Vercel setup instructions to the user:

---
## Next: deploy $ARGUMENTS to Vercel

1. Go to vercel.com → New Project → import `willchurcher-apps`
2. Set **Root Directory** to `apps/$ARGUMENTS`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Click Deploy, then go to Settings → Domains
6. Add domain: `$ARGUMENTS.willchurcher.com`

In your DNS (wherever willchurcher.com is managed), ensure:
```
*.willchurcher.com  CNAME  cname.vercel-dns.com
```
(Only need this once for all apps.)

Then push to master to trigger future auto-deploys.
---
