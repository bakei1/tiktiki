import { useState } from 'react'
import { Check, Hash, Palette, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'

const COLORS = [
  { id: 'lime', label: 'Lime' },
  { id: 'sky', label: 'Gökyüzü' },
  { id: 'peach', label: 'Şeftali' },
  { id: 'lilac', label: 'Lila' },
]

function channelName(value) {
  return String(value)
    .trim()
    .replace(/^#+/, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)
}

export default function ListModal({ list = null, existingLists = [], onClose, onSave, onDelete }) {
  const editing = Boolean(list)
  const [name, setName] = useState(list?.name || '')
  const [description, setDescription] = useState(list?.description || '')
  const [color, setColor] = useState(list?.color || 'lime')
  const [shared, setShared] = useState(Boolean(list?.is_shared))
  const [error, setError] = useState('')

  const preview = channelName(name) || 'yeni-kanal'

  const submit = (event) => {
    event.preventDefault()
    const clean = channelName(name)
    if (!clean) {
      setError('Listeye bir isim ver.')
      return
    }
    const duplicate = existingLists.some(
      (item) =>
        item.id !== list?.id &&
        item.name.toLocaleLowerCase('tr-TR') === clean.toLocaleLowerCase('tr-TR'),
    )
    if (duplicate) {
      setError('Bu isimde bir kanal zaten var.')
      return
    }
    onSave({
      name: clean,
      description:
        description.trim().slice(0, 160) ||
        (editing ? list.description : 'Bu kanaldaki görevler burada birikir.'),
      color,
      is_shared: editing ? Boolean(list.is_shared) : shared,
    })
    onClose()
  }

  return (
    <Modal onClose={onClose} labelledBy="list-modal-title" width="compact">
      <div className="modal-heading">
        <span className="modal-kicker">{editing ? 'Kanalı düzenle' : 'Yeni kanal'}</span>
        <h2 id="list-modal-title">{editing ? 'Kanalı güncelle' : 'Yeni bir alan aç'}</h2>
        <p>Kanallar, görevlerini konuya göre ayırmanın en hızlı yolu.</p>
      </div>

      <form className="task-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Kanal adı</span>
          <span className="input-with-prefix">
            <Hash size={17} />
            <input
              type="text"
              data-autofocus
              value={name}
              maxLength={32}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              onBlur={() => setName((value) => channelName(value))}
              placeholder="proje-x"
            />
          </span>
          <span className="field-hint">Boşluklar otomatik olarak tireye dönüşür.</span>
        </label>

        {!editing ? (
          <label className="shared-channel-option">
            <input
              type="checkbox"
              checked={shared}
              onChange={(event) => setShared(event.target.checked)}
            />
            <span>
              <strong>Ortak kanal</strong>
              <small>Davet bağlantısı verdiğin kişiler kanalı ve görevleri görebilir.</small>
            </span>
          </label>
        ) : list.is_shared ? (
          <p className="field-hint">Bu ortak kanala davet bağlantısıyla yeni üyeler katılabilir.</p>
        ) : null}

        <label className="field">
          <span className="field-label">Açıklama <em>opsiyonel</em></span>
          <textarea
            rows={2}
            value={description}
            maxLength={160}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Bu kanal ne için var?"
          />
        </label>

        <div className="field">
          <span className="field-label">
            <Palette size={13} /> Renk
          </span>
          <div className="color-picker">
            {COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`color-swatch swatch-${item.id} ${color === item.id ? 'is-active' : ''}`}
                onClick={() => setColor(item.id)}
                aria-label={item.label}
                aria-pressed={color === item.id}
              >
                {color === item.id ? <Check size={14} /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className={`channel-preview tone-${color}`}>
          <span className="channel-preview-label">Önizleme</span>
          <span className="channel-preview-row">
            <Hash size={17} className={`list-color-${color}`} />
            <span>{preview}</span>
            <span className="preview-count">0</span>
          </span>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          {editing ? (
            <button
              type="button"
              className="button button-danger-ghost"
              onClick={() => onDelete(list)}
            >
              <Trash2 size={15} /> Listeyi sil
            </button>
          ) : (
            <span />
          )}
          <div className="modal-actions-right">
            <button type="button" className="button button-ghost" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="button button-accent">
              {editing ? 'Kaydet' : 'Kanalı oluştur'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
