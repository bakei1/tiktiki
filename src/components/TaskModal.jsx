import { useState } from 'react'
import { CalendarDays, Flag, Hash, Tag, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'
import { addDaysISO, todayISO } from '../lib/dates.js'

const PRIORITIES = [
  { id: 'low', label: 'Düşük' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'Yüksek' },
]

export default function TaskModal({
  task = null,
  lists,
  defaultListId,
  defaultDue = null,
  onClose,
  onSave,
  onDelete,
}) {
  const editing = Boolean(task)
  const [title, setTitle] = useState(task?.title || '')
  const [note, setNote] = useState(task?.note || '')
  const [listId, setListId] = useState(task?.list_id || defaultListId || lists[0]?.id || '')
  const [due, setDue] = useState(task?.due_date || defaultDue || '')
  const [priority, setPriority] = useState(task?.priority || 'normal')
  const [tags, setTags] = useState((task?.tags || []).join(', '))
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const clean = title.trim()
    if (!clean) {
      setError('Görevin bir başlığı olmalı.')
      return
    }
    if (!listId) {
      setError('Bir kanal seç.')
      return
    }

    const parsedTags = [
      ...new Set(
        tags
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, '').toLocaleLowerCase('tr-TR'))
          .filter(Boolean),
      ),
    ].slice(0, 6)

    onSave({
      title: clean.slice(0, 300),
      note: note.trim().slice(0, 1000) || null,
      list_id: listId,
      due_date: due || null,
      priority,
      tags: parsedTags,
    })
    onClose()
  }

  return (
    <Modal onClose={onClose} labelledBy="task-modal-title" width="task">
      <div className="modal-heading">
        <span className="modal-kicker">{editing ? 'Görevi düzenle' : 'Yeni görev'}</span>
        <h2 id="task-modal-title">{editing ? 'Detayları toparla' : 'Ne yapılacak?'}</h2>
        <p>{editing ? 'Başlık, tarih ve notlar aynı yerden.' : 'Kısa tut. Sonra düzenleyebilirsin.'}</p>
      </div>

      <form className="task-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Başlık</span>
          <input
            type="text"
            data-autofocus
            value={title}
            maxLength={300}
            onChange={(event) => {
              setTitle(event.target.value)
              setError('')
            }}
            placeholder="Örn. Sunumu bitir"
          />
        </label>

        <label className="field">
          <span className="field-label">Not <em>opsiyonel</em></span>
          <textarea
            rows={3}
            value={note}
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Küçük bir hatırlatma, bağlantı ya da bağlam…"
          />
        </label>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">
              <Hash size={13} /> Kanal
            </span>
            <select value={listId} onChange={(event) => setListId(event.target.value)}>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  #{list.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">
              <CalendarDays size={13} /> Tarih
            </span>
            <input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
            <span className="date-quick-row">
              <button type="button" className={due === todayISO() ? 'is-active' : ''} onClick={() => setDue(todayISO())}>
                Bugün
              </button>
              <button
                type="button"
                className={due === addDaysISO(1) ? 'is-active' : ''}
                onClick={() => setDue(addDaysISO(1))}
              >
                Yarın
              </button>
              <button type="button" onClick={() => setDue('')}>
                Temizle
              </button>
            </span>
          </label>
        </div>

        <div className="field">
          <span className="field-label">
            <Flag size={13} /> Öncelik
          </span>
          <div className="priority-picker" role="group" aria-label="Öncelik">
            {PRIORITIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`priority-option priority-option-${item.id} ${
                  priority === item.id ? 'is-active' : ''
                }`}
                onClick={() => setPriority(item.id)}
                aria-pressed={priority === item.id}
              >
                <span className="priority-dot" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">
            <Tag size={13} /> Etiketler <em>virgülle ayır</em>
          </span>
          <input
            type="text"
            value={tags}
            maxLength={120}
            onChange={(event) => setTags(event.target.value)}
            placeholder="tasarım, iş, hızlı"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          {editing ? (
            <button
              type="button"
              className="button button-danger-ghost"
              onClick={() => {
                onDelete(task)
                onClose()
              }}
            >
              <Trash2 size={15} /> Görevi sil
            </button>
          ) : (
            <span />
          )}
          <div className="modal-actions-right">
            <button type="button" className="button button-ghost" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="button button-accent">
              {editing ? 'Değişiklikleri kaydet' : 'Görevi ekle'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
