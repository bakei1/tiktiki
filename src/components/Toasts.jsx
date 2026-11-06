import { AlertCircle, Check, Undo2, X } from 'lucide-react'

export default function Toasts({ toasts, onDismiss, onAction }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone || 'default'}`} role="status">
          <span className="toast-icon">
            {toast.tone === 'error' ? <AlertCircle size={17} /> : <Check size={16} />}
          </span>
          <span className="toast-copy">{toast.message}</span>
          {toast.actionLabel ? (
            <button
              type="button"
              className="toast-action"
              onClick={() => onAction(toast)}
            >
              <Undo2 size={13} /> {toast.actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Bildirimi kapat"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
