import { Command, Sparkles } from 'lucide-react'
import Modal from './Modal.jsx'

const SHORTCUTS = [
  { keys: ['N'], label: 'Yeni görev' },
  { keys: ['/'], label: 'Görevlerde ara' },
  { keys: ['Enter'], label: 'Görevi gönder' },
  { keys: ['Shift', 'Enter'], label: 'Yeni satır' },
  { keys: ['Esc'], label: 'Arama / pencereyi kapat' },
]

export default function HelpModal({ onClose }) {
  return (
    <Modal onClose={onClose} labelledBy="help-modal-title" width="compact">
      <div className="help-mark">
        <Sparkles size={21} />
      </div>
      <div className="modal-heading">
        <span className="modal-kicker">Kısayollar</span>
        <h2 id="help-modal-title">Akışı bozmadan ilerle</h2>
        <p>tık, görevlerini bir sohbet akışı gibi tutar. Kanal seç, yaz, tamamla.</p>
      </div>

      <div className="shortcut-list">
        {SHORTCUTS.map((item) => (
          <div className="shortcut-row" key={item.label}>
            <span className="shortcut-keys">
              {item.keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="help-footer">
        <Command size={14} /> Kısayollarla daha hızlı çalış.
      </div>
    </Modal>
  )
}
