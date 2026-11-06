import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ children, onClose, className = '', labelledBy, width = 'default' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      const preferred = panelRef.current?.querySelector('[data-autofocus]')
      const first = panelRef.current?.querySelector(FOCUSABLE)
      ;(preferred || first)?.focus()
    }, 30)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])].filter(
        (node) => node.offsetParent !== null,
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [onClose])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`modal modal-${width} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
