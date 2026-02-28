import { useState, useRef, useEffect } from 'react'
import { useTheme } from './ThemeContext'

interface HeaderRightProps {
  options?: (close: () => void) => React.ReactNode
}

export function HeaderRight({ options }: HeaderRightProps) {
  const [open, setOpen] = useState(false)
  const { toggle } = useTheme()
  const toastRef = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return

    // Capture-phase listener fires before any element's own handlers.
    // Calling preventDefault() here stops the subsequent click event from
    // firing on whatever the user tapped — so background elements stay inert.
    const capture = (e: Event) => {
      if (toastRef.current && toastRef.current.contains(e.target as Node)) return
      e.preventDefault()
      setOpen(false)
    }

    document.addEventListener('touchstart', capture, { passive: false, capture: true })
    document.addEventListener('mousedown',  capture, { capture: true })
    return () => {
      document.removeEventListener('touchstart', capture, { capture: true })
      document.removeEventListener('mousedown',  capture, { capture: true })
    }
  }, [open])

  return (
    <div className="header-right">
      <div className="header-options-anchor">
        <button className="icon-btn" onClick={() => setOpen(v => !v)}>
          ···
        </button>
        {open && options && (
          <div ref={toastRef} className="header-toast">
            {options(close)}
          </div>
        )}
      </div>
      <button className="icon-btn" onClick={toggle}>💡</button>
    </div>
  )
}
