import { useState } from 'react'
import { useTheme } from './ThemeContext'

interface HeaderRightProps {
  // Render-prop: receives a `close` callback so option items can close the toast.
  // Omit entirely to have ··· show nothing (button still appears on every page).
  options?: (close: () => void) => React.ReactNode
}

export function HeaderRight({ options }: HeaderRightProps) {
  const [open, setOpen] = useState(false)
  const { toggle } = useTheme()
  const close = () => setOpen(false)

  return (
    <div className="header-right">
      {/* Backdrop: absorbs the tap so it doesn't reach elements behind the toast */}
      {open && (
        <div
          className="header-backdrop"
          onTouchStart={e => { e.preventDefault(); close() }}
          onClick={close}
        />
      )}

      <div className="header-options-anchor">
        <button
          className="icon-btn"
          onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        >
          ···
        </button>
        {open && options && (
          <div className="header-toast">
            {options(close)}
          </div>
        )}
      </div>

      <button className="icon-btn" onClick={toggle}>💡</button>
    </div>
  )
}
