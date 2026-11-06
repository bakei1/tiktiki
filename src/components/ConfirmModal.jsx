import { AlertTriangle } from 'lucide-react'
import Modal from './Modal.jsx'

export default function ConfirmModal({
  title,
  message,
  detail,
  confirmLabel = 'Sil',
  tone = 'danger',
  onConfirm,
  onClose,
}) {
  return (
    <Modal onClose={onClose} labelledBy="confirm-modal-title" width="compact">
      <div className={`confirm-icon ${tone === 'danger' ? 'is-danger' : ''}`}>
        <AlertTriangle size={22} />
      </div>
      <div className="modal-heading confirm-heading">
        <span className="modal-kicker">Emin misin?</span>
        <h2 id="confirm-modal-title">{title}</h2>
        <p>{message}</p>
        {detail ? <span className="confirm-detail">{detail}</span> : null}
      </div>

      <div className="modal-actions confirm-actions">
        <button type="button" className="button button-ghost" onClick={onClose}>
          Vazgeç
        </button>
        <button
          type="button"
          className="button button-danger"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
