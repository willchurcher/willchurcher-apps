# Global Styles Spec
> Source of truth: `apps/example/src/App.css`, `apps/example/index.html`

## Fonts
Loaded via Google Fonts in `index.html`. Referenced via CSS vars:
- `--font-mono: 'DM Mono', 'Courier New', monospace` — body, UI, labels, buttons, inputs, meta
- `--font-display: 'Bebas Neue', sans-serif` — page titles, badges, section headers

`body` uses `var(--font-mono)` by default.

## Theme
- Dark by default. Toggled by the 💡 button in `HeaderRight`.
- Applied as `data-theme="light"` on `<html>`.
- Preference persisted in `localStorage` via `src/ThemeContext.tsx`.

## CSS Tokens (`App.css`)

### Dark (`:root`)
```
--bg:        #080c18
--bg2:       #0d1220
--surface:   rgba(255,255,255,0.025)
--surface2:  rgba(255,255,255,0.04)
--border:    rgba(255,255,255,0.07)
--border-hi: rgba(255,255,255,0.12)
--text:      #e0e8f0
--text2:     #9ab0c4
--muted:     #2a4a66
--muted-hi:  #4a7090
--accent:    #7eb8d4
--accent-fg: #080c18
--shadow-sm: 0 2px 8px  rgba(0,0,0,0.4)
--shadow-md: 0 4px 20px rgba(0,0,0,0.55)
--shadow-lg: 0 8px 36px rgba(0,0,0,0.7)
--radius-icon: 18px
--radius-card: 12px
```

### Light (`[data-theme="light"]`)
```
--bg:        #eef3f9
--bg2:       #e4ecf5
--surface:   rgba(255,255,255,0.7)
--surface2:  rgba(255,255,255,0.9)
--border:    rgba(60,100,160,0.12)
--border-hi: rgba(60,100,160,0.22)
--text:      #0c1a2e
--text2:     #2a4a6a
--muted:     #6a90b0
--muted-hi:  #4a7090
--accent:    #2a78b8
--accent-fg: #ffffff
--shadow-sm: 0 2px 8px  rgba(40,80,140,0.10)
--shadow-md: 0 4px 20px rgba(40,80,140,0.14)
--shadow-lg: 0 8px 36px rgba(40,80,140,0.18)
```

Never hardcode colours that should adapt — always use CSS vars.

## Page Structure
Every app page:
```
height: 100dvh; display: flex; flex-direction: column; overflow: hidden
```

### `.page-header`
```
position: sticky; top: 0; z-index: 10
background: color-mix(in srgb, var(--bg) 80%, transparent)
backdrop-filter: blur(14px)
display: flex; align-items: center; justify-content: space-between
padding: 0.9rem 1.25rem
border-bottom: 1px solid var(--border)
```
Layout: `[ .page-header-left (back btn + title) ]  [ HeaderRight ]`

### `.card`
```
background: var(--surface); border: 1px solid var(--border)
border-radius: var(--radius-card); box-shadow: var(--shadow-sm)
```

## `HeaderRight` (`src/HeaderRight.tsx`)
Props: `options?: (close: () => void) => React.ReactNode`

- **💡 button** — calls `toggle()` from `useTheme()`
- **··· button** — toggles options dropdown
  - On open: captures `getBoundingClientRect()` of the button, sets `position: fixed; top; right` on the toast — escapes all overflow/stacking contexts
  - Click ··· again → closes (toggle)
  - Click inside toast → action runs (caller responsible for calling `close()`)
  - Click outside → captured via `touchstart` + `click` on `document` at capture phase with `preventDefault` + `stopPropagation`; no click-through
  - If `options` prop is omitted → shows `<span class="header-toast-no-options">No options</span>`

## iOS
- Viewport: `maximum-scale=1` (prevents auto-zoom on input focus; pinch-zoom still works)
- `-webkit-tap-highlight-color: transparent` on interactive elements
- `-webkit-overflow-scrolling: touch` on all scroll containers
