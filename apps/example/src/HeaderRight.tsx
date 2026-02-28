import { useState, useRef, useEffect } from 'react'
import { useTheme } from './ThemeContext'

interface HeaderRightProps {
  options?: (close: () => void) => React.ReactNode
}

export function HeaderRight({ options }: HeaderRightProps) {
  const [open, setOpen] = useState(false)
  const [toastPos, setToastPos] = useState({ top: 0, right: 0 })
  const { toggle } = useTheme()
  const toastRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setToastPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return

    const absorb = (e: Event) => {
      if (btnRef.current?.contains(e.target as Node)) return
      if (toastRef.current?.contains(e.target as Node)) return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }

    document.addEventListener('touchstart', absorb, { passive: false, capture: true })
    document.addEventListener('click', absorb, { capture: true })
    return () => {
      document.removeEventListener('touchstart', absorb, { capture: true })
      document.removeEventListener('click', absorb, { capture: true })
    }
  }, [open])

  return (
    <div className="header-right">
      <div className="header-options-anchor">
        <button ref={btnRef} className="icon-btn" onClick={handleToggle}>
          ···
        </button>
        {open && (
          <div
            ref={toastRef}
            className="header-toast"
            style={{ position: 'fixed', top: toastPos.top, right: toastPos.right }}
          >
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
