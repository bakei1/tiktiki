import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  CalendarDays,
  Check,
  Flag,
  Hash,
  Plus,
} from 'lucide-react'
import { addDaysISO, dueLabel, formatShortDate, todayISO } from '../lib/dates.js'

const PRIORITIES = [
  { id: 'low', label: 'Düşük', hint: 'Acele değil' },
  { id: 'normal', label: 'Normal', hint: 'Standart' },
  { id: 'high', label: 'Yüksek', hint: 'Önce bu' },
]

export default function Composer({
  meta,
  destination,
  defaultDue = null,
  onCreate,
  onOpenFull,
  inputRef,
  isSmartView,
  locked = false,
  onUnlock,
}) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(defaultDue)
  const [priority, setPriority] = useState('normal')
  const [menu, setMenu] = useState(null)
  const toolsRef = useRef(null)

  useEffect(() => {
    setDue(defaultDue)
  }, [defaultDue])

  useEffect(() => {
    const el = inputRef?.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [title, inputRef])

  useEffect(() => {
    if (!menu) return undefined
    const close = (event) => {
      if (!toolsRef.current?.contains(event.target)) setMenu(null)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setMenu(null)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  if (locked) {
    return (
      <div className="composer-locked">
        <span className="composer-locked-icon">
          <Check size={17} />
        </span>
        <div>
          <strong>Arşiv modundasın.</strong>
          <span> Tamamlananlara yeni görev eklenmez.</span>
        </div>
        <button type="button" className="button button-soft button-small" onClick={onUnlock}>
          Bugüne dön
        </button>
      </div>
    )
  }

  const submit = () => {
    const clean = title.trim()
    if (!clean) {
      inputRef.current?.focus()
      return
    }
    onCreate({
      title: clean.slice(0, 300),
      priority,
      due_date: due || null,
    })
    setTitle('')
    setMenu(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const dueText = due ? dueLabel(due) : 'Tarih'
  const priorityMeta = PRIORITIES.find((item) => item.id === priority) || PRIORITIES[1]

  return (
    <div className="composer-wrap">
      <div className={`composer ${title ? 'is-active' : ''}`}>
        <button
          type="button"
          className="composer-plus"
          onClick={onOpenFull}
          aria-label="Ayrıntılı görev ekle"
          title="Ayrıntılı görev ekle"
        >
          <Plus size={20} />
        </button>

        <div className="composer-field">
          <textarea
            ref={inputRef}
            rows={1}
            value={title}
            maxLength={300}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`#${destination?.name || 'genel'} kanalına bir görev yaz…`}
            aria-label="Görev başlığı"
          />

          <div className="composer-bottom">
            <div className="composer-destination">
              <span className="composer-dest-dot" />
              <span>
                <Hash size={12} />
                {destination?.name || 'genel'}
                {isSmartView ? <em>{meta.title} görünümünde</em> : null}
              </span>
            </div>

            <div className="composer-tools" ref={toolsRef}>
              <div className="composer-tool-wrap">
                <button
                  type="button"
                  className={`composer-tool ${due ? 'is-set' : ''}`}
                  onClick={() => setMenu(menu === 'due' ? null : 'due')}
                  aria-expanded={menu === 'due'}
                >
                  <CalendarDays size={14} />
                  {dueText}
                </button>
                {menu === 'due' ? (
                  <div className="quick-menu due-menu" role="menu">
                    <div className="quick-menu-head">Ne zaman?</div>
                    {[
                      { id: null, label: 'Tarih yok' },
                      { id: todayISO(), label: 'Bugün' },
                      { id: addDaysISO(1), label: 'Yarın' },
                      { id: addDaysISO(3), label: '3 gün sonra' },
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        role="menuitem"
                        className={due === option.id ? 'is-selected' : ''}
                        onClick={() => {
                          setDue(option.id)
                          setMenu(null)
                        }}
                      >
                        <span>{option.label}</span>
                        {option.id ? (
                          <span className="quick-menu-date">{formatShortDate(option.id)}</span>
                        ) : null}
                        {due === option.id ? <Check size={14} /> : null}
                      </button>
                    ))}
                    <label className="quick-date-input">
                      <span>Özel tarih</span>
                      <input
                        type="date"
                        value={due || ''}
                        onChange={(event) => {
                          setDue(event.target.value || null)
                          setMenu(null)
                        }}
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="composer-tool-wrap">
                <button
                  type="button"
                  className={`composer-tool priority-tool ${priority !== 'normal' ? 'is-set' : ''} priority-${priority}`}
                  onClick={() => setMenu(menu === 'priority' ? null : 'priority')}
                  aria-expanded={menu === 'priority'}
                >
                  <Flag size={13} />
                  {priority === 'normal' ? 'Öncelik' : priorityMeta.label}
                </button>
                {menu === 'priority' ? (
                  <div className="quick-menu priority-menu" role="menu">
                    <div className="quick-menu-head">Öncelik</div>
                    {PRIORITIES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className={priority === item.id ? 'is-selected' : ''}
                        onClick={() => {
                          setPriority(item.id)
                          setMenu(null)
                        }}
                      >
                        <span className={`priority-dot priority-dot-${item.id}`} />
                        <span className="quick-menu-label">
                          {item.label}
                          <em>{item.hint}</em>
                        </span>
                        {priority === item.id ? <Check size={14} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <span className="composer-tool-divider" />

              <button
                type="button"
                className="composer-send"
                onClick={submit}
                disabled={!title.trim()}
                aria-label="Görev gönder"
                title="Görev gönder"
              >
                <ArrowUp size={18} strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="composer-hints">
        <span>
          <kbd>Enter</kbd> gönder
          <span className="hint-dot">·</span>
          <kbd>Shift</kbd> + <kbd>Enter</kbd> satır
        </span>
        <span className="composer-hint-right">
          {title.length > 260 ? `${title.length}/300` : 'Görevler sohbet gibi akar'}
        </span>
      </div>
    </div>
  )
}
