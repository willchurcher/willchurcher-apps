import { useState, useRef, useEffect } from 'react'
import { useTheme } from './ThemeContext'

interface HeaderRightProps {
  options?: (close: () => void) => React.ReactNode
}

export function HeaderRight({ options }: HeaderRightProps) {
  const [open, setOpen] = useState(false)
  const { toggle } = useTheme()
  const toastRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return

    const absorb = (e: Event) => {
      // Let the ··· button handle its own toggle
      if (btnRef.current?.contains(e.target as Node)) return
      // Let clicks inside the toast reach their targets
      if (toastRef.current?.contains(e.target as Node)) return
      // Absorb everything else — no click-through
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }

    // touchstart + preventDefault prevents the synthesised click on iOS
    document.addEventListener('touchstart', absorb, { passive: false, capture: true })
    // click capture blocks click-through on desktop
    document.addEventListener('click', absorb, { capture: true })
    return () => {
      document.removeEventListener('touchstart', absorb, { capture: true })
      document.removeEventListener('click', absorb, { capture: true })
    }
  }, [open])

  return (
    <div className="header-right">
      <div className="header-options-anchor">
        <button ref={btnRef} className="icon-btn" onClick={() => setOpen(v => !v)}>
          ···
        </button>
        {open && (
          <div ref={toastRef} className="header-toast">
            {options
              ? options(close)
              : <span className="header-toast-no-options">No options</span>}
          </div>
        )}
      </div>
      <button className="icon-btn" onClick={toggle}>💡</button>
    </div>
  )
}
