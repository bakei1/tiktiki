import {
  ArrowUpRight,
  CheckCheck,
  Hash,
  Sparkles,
  Tag,
} from 'lucide-react'
import { dueLabel, dueState } from '../lib/dates.js'

function ProgressRing({ percent }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <div className="progress-ring">
      <svg viewBox="0 0 104 104" role="img" aria-label={`${percent}% tamamlandı`}>
        <circle className="ring-track" cx="52" cy="52" r={radius} />
        <circle
          className="ring-value"
          cx="52"
          cy="52"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-label">
        <strong>{percent}%</strong>
        <span>tamam</span>
      </div>
    </div>
  )
}

export default function RightPanel({
  scopedTasks,
  lists,
  selectedTag,
  onSelectTag,
  onOpenTask,
  onViewToday,
}) {
  const open = scopedTasks.filter((task) => !task.completed)
  const done = scopedTasks.filter((task) => task.completed)
  const percent = scopedTasks.length ? Math.round((done.length / scopedTasks.length) * 100) : 0
  const overdue = open.filter((task) => dueState(task.due_date) === 'overdue').length

  const upcoming = open
    .filter((task) => task.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 4)

  const tagCounts = new Map()
  for (const task of scopedTasks) {
    for (const tag of task.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)

  return (
    <aside className="right-panel">
      <div className="right-scroll">
        <div className="right-heading">
          <span>Görev özeti</span>
          <Sparkles size={15} />
        </div>

        <div className="summary-card">
          <div className="summary-top">
            <ProgressRing percent={percent} />
            <div className="summary-numbers">
              <span className="eyebrow">Bu görünümde</span>
              <strong>{scopedTasks.length} görev</strong>
              <span>{open.length} açık · {done.length} bitti</span>
            </div>
          </div>

          <div className="summary-stats">
            <div>
              <span className="summary-stat-value">{open.length}</span>
              <span className="summary-stat-label">Açık</span>
            </div>
            <div>
              <span className={`summary-stat-value ${overdue ? 'is-alert' : ''}`}>{overdue}</span>
              <span className="summary-stat-label">Geciken</span>
            </div>
            <div>
              <span className="summary-stat-value">{done.length}</span>
              <span className="summary-stat-label">Tamam</span>
            </div>
          </div>
        </div>

        <section className="right-section">
          <div className="right-section-head">
            <span>Sıradaki</span>
            <span className="right-count">{upcoming.length}</span>
          </div>

          <div className="upcoming-list">
            {upcoming.map((task) => {
              const list = lists.find((item) => item.id === task.list_id)
              const state = dueState(task.due_date)
              return (
                <button
                  type="button"
                  key={task.id}
                  className="upcoming-item"
                  onClick={() => onOpenTask(task)}
                >
                  <span className={`upcoming-date is-${state}`}>
                    {state === 'overdue' ? 'Gecikti' : dueLabel(task.due_date)}
                  </span>
                  <span className="upcoming-copy">
                    <span className="upcoming-title">{task.title}</span>
                    <span className={`upcoming-list-name list-color-${list?.color || 'lime'}`}>
                      <Hash size={11} /> {list?.name || 'liste'}
                    </span>
                  </span>
                  <ArrowUpRight size={14} className="upcoming-arrow" />
                </button>
              )
            })}
            {upcoming.length === 0 ? (
              <div className="right-empty">
                <CheckCheck size={17} />
                <span>Yaklaşan bir tarih yok.</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="right-section">
          <div className="right-section-head">
            <span>Etiketler</span>
            <Tag size={14} />
          </div>

          {tags.length ? (
            <div className="tag-cloud">
              {tags.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-pill ${selectedTag === tag ? 'is-active' : ''}`}
                  onClick={() => onSelectTag(tag)}
                >
                  #{tag}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="right-empty">
              <Tag size={16} />
              <span>Henüz etiket yok.</span>
            </div>
          )}

          {selectedTag ? (
            <button type="button" className="clear-tag" onClick={() => onSelectTag(null)}>
              #{selectedTag} filtresini temizle
            </button>
          ) : null}
        </section>

        <section className="focus-note">
          <span className="eyebrow">Küçük bir not</span>
          <p>
            {overdue > 0
              ? `${overdue} görev gecikmiş. Önce en küçüğünü seç; momentum gerisini getirir.`
              : open.length > 0
                ? 'Her şeyi bitirmek zorunda değilsin. Bugün en önemli üç şeyi seç.'
                : 'Liste temiz. Bu anın tadını çıkar.'}
          </p>
          <button type="button" onClick={onViewToday}>
            Bugünü aç <ArrowUpRight size={13} />
          </button>
        </section>
      </div>

      <div className="right-footer">
        <span>tık. · görev akışın</span>
      </div>
    </aside>
  )
}
