# Global Styles Spec

## Fonts
- **Body / UI**: `'DM Mono', 'Courier New', monospace` — all labels, buttons, inputs, metadata
- **Display headings**: `'Bebas Neue', sans-serif` — page titles, badges, section headers
- Both loaded via Google Fonts in `apps/example/index.html`

## Theme
- **Default**: dark
- **Toggle**: `☀ light / ◑ dark` (💡 button in HeaderRight, top-right of every page)
- **Persistence**: `localStorage` via `ThemeContext.tsx`
- **Application**: `data-theme="light"` on `<html>`; `:root` = dark, `[data-theme="light"]` = light

## CSS Variables (defined in `App.css`)
| Token | Dark | Light | Usage |
|---|---|---|---|
| `--bg` | `#080c18` | `#f0f2f8` | Page background |
| `--bg2` | slightly lighter | slightly darker | Secondary bg, inputs |
| `--surface` | card bg | card bg | Card backgrounds |
| `--surface2` | button bg | button bg | Icon buttons |
| `--border` | subtle | subtle | Card/input borders |
| `--border-hi` | brighter | brighter | Focused/elevated borders |
| `--text` | `#e8eaf0` | `#0d1117` | Primary text |
| `--text2` | dimmer | dimmer | Secondary text |
| `--muted-hi` | muted | muted | Hints, placeholders, meta |
| `--accent` | `#7eb8d4` | `#3a8ab4` | Buttons, pins, highlights |
| `--shadow-sm` | | | Card shadow |
| `--shadow-md` | | | Overlay/toast shadow |

> Never hardcode colours that should adapt to theme. Always use CSS vars.

## Layout Rules
- **Page root**: `height: 100dvh; display: flex; flex-direction: column; overflow: hidden`
- **Sticky header**: `.page-header` — `position: sticky; top: 0; z-index: 10; backdrop-filter: blur(14px)`
- **Cards**: `.card` class — rounded border, `var(--surface)` bg, `var(--border)` border, `var(--shadow-sm)`
- **Scrollable body**: `flex: 1; overflow-y: auto`

## Page Header (every app page)
```
[ ‹ Home ]  [ PAGE TITLE ]          [ ··· ][ 💡 ]
```
- Back button: `‹ Home` (navigates to `/`)
- Title: uppercase, DM Mono
- Right: `HeaderRight` component (see below)

## HeaderRight Component (`src/HeaderRight.tsx`)
- Always present on every page
- **💡 button**: toggles theme
- **··· button**: opens options dropdown (toast)
  - Dropdown is `position: fixed` computed from `getBoundingClientRect()` — escapes all overflow/stacking contexts
  - Click ··· to open; click ··· again to close (toggle)
  - Click inside toast: action fires
  - Click outside (backdrop via capture listener): closes, no click-through
  - If page passes no options: shows "No options" in muted text
- Options prop: `options?: (close: () => void) => React.ReactNode`

## iOS / Mobile Rules
- Viewport meta: `maximum-scale=1` (no zoom on input focus) but pinch-zoom still works
- Tap highlight: `-webkit-tap-highlight-color: transparent` on interactive elements
- Font size ≥ 16px on inputs to prevent iOS auto-zoom (or rely on `maximum-scale=1`)
- Touch scrolling: `-webkit-overflow-scrolling: touch` on scroll containers
