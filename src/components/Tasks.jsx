import {
  CalendarDays,
  Check,
  CircleCheckBig,
  Clock3,
  Flag,
  Hash,
  Inbox,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { dueLabel, dueState, formatTime } from '../lib/dates.js'
import ViewGlyph from './ViewGlyph.jsx'

const EYEBROWS = {
  list: 'Kanal',
  all: 'Akıllı görünüm',
  today: 'Akıllı görünüm',
  upcoming: 'Akıllı görünüm',
  completed: 'Arşiv',
}

export function ChannelIntro({ meta, scopedTasks, onNewTask, onViewToday }) {
  const open = scopedTasks.filter((task) => !task.completed)
  const done = scopedTasks.filter((task) => task.completed)
  const dueToday = open.filter((task) => dueState(task.due_date) === 'today').length
  const overdue = open.filter((task) => dueState(task.due_date) === 'overdue').length
  const Icon = meta.kind === 'list' ? Hash : null

  return (
    <section className={`channel-intro tone-${meta.color || 'lime'}`}>
      <div className="intro-glow" aria-hidden="true" />
      <div className="intro-icon">
        {Icon ? <Icon size={32} strokeWidth={2.1} /> : <ViewGlyph kind={meta.kind} size={32} />}
      </div>

      <div className="intro-copy">
        <span className="eyebrow intro-eyebrow">{EYEBROWS[meta.kind] || 'Görev alanı'}</span>
        <h2>{meta.title}</h2>
        <p>{meta.description}</p>

        <div className="intro-stats">
          <span>
            <i className="stat-dot stat-dot-lime" />
            <strong>{open.length}</strong> açık görev
          </span>
          <span>
            <i className="stat-dot stat-dot-amber" />
            <strong>{dueToday}</strong> bugün
          </span>
          {overdue > 0 ? (
            <span>
              <i className="stat-dot stat-dot-coral" />
              <strong>{overdue}</strong> geciken
            </span>
          ) : null}
          <span>
            <i className="stat-dot stat-dot-muted" />
            <strong>{done.length}</strong> tamamlandı
          </span>
        </div>

        <div className="intro-actions">
          {meta.kind === 'completed' ? (
            <button type="button" className="button button-soft" onClick={onViewToday}>
              <Sparkles size={16} /> Bugünün ritmine dön
            </button>
          ) : (
            <button type="button" className="button button-accent" onClick={onNewTask}>
              <Plus size={17} strokeWidth={2.5} />
              Görev ekle
            </button>
          )}
          <span className="intro-hint">
            <kbd>N</kbd> ile hızlı ekle
          </span>
        </div>
      </div>
    </section>
  )
}

export function DateDivider({ label }) {
  return (
    <div className="date-divider" role="separator">
      <span>{label}</span>
    </div>
  )
}

export function TaskItem({
  task,
  list,
  profile,
  assignee,
  canClaim = false,
  currentUserId,
  showList,
  completedView = false,
  onToggle,
  onEdit,
  onDelete,
  onClaim,
}) {
  const state = dueState(task.due_date)
  const overdue = state === 'overdue' && !task.completed
  const dueToday = state === 'today' && !task.completed
  const stamp = completedView ? task.completed_at || task.created_at : task.created_at

  return (
    <article
      className={`task-row ${task.completed ? 'is-completed' : ''}`}
      data-priority={task.priority}
    >
      <div className={`task-avatar-wrap ${task.completed ? 'is-done' : ''}`}>
        <span className="avatar avatar-tone-0 task-avatar-initial">{profile.initials}</span>
      </div>

      <div className="task-body">
        <div className="task-meta">
          <span className="task-author">{profile.name}</span>
          <span className="role-badge">görev</span>
          <time
            dateTime={stamp}
            title={`${completedView ? 'Tamamlanma' : 'Oluşturulma'}: ${new Date(
              stamp,
            ).toLocaleString('tr-TR')}`}
          >
            {formatTime(stamp)}
          </time>
          {completedView ? <span className="completed-stamp">tamamlandı</span> : null}
          {showList && list ? (
            <span className={`task-list-chip list-color-${list.color}`}>
              <Hash size={12} /> {list.name}
            </span>
          ) : null}
        </div>

        <div className="task-title-line">
          <button
            type="button"
            className={`task-check ${task.completed ? 'is-checked' : ''}`}
            onClick={() => onToggle(task)}
            aria-label={task.completed ? 'Görevi geri aç' : 'Görevi tamamla'}
            aria-pressed={task.completed}
          >
            <Check size={14} strokeWidth={3} />
          </button>
          <button
            type="button"
            className="task-title"
            onClick={() => onEdit(task)}
            title="Görevi düzenle"
          >
            {task.title}
          </button>
        </div>

        {task.note ? <p className="task-note">{task.note}</p> : null}

        {canClaim && !task.completed ? (
          <div className="task-assignee">
            {task.assignee_id ? (
              <>
                <span>
                  {task.assignee_id === currentUserId
                    ? 'Üstlendiğin görev'
                    : `${assignee?.username || 'Bir üye'} üstlendi`}
                </span>
                {task.assignee_id === currentUserId ? (
                  <button type="button" onClick={() => onClaim(task)}>Üzerimden bırak</button>
                ) : null}
              </>
            ) : (
              <button type="button" onClick={() => onClaim(task)}>Görevi üstlen</button>
            )}
          </div>
        ) : null}

        {(task.due_date || task.priority !== 'normal' || task.tags?.length > 0) && (
          <div className="task-chips">
            {task.due_date ? (
              <span
                className={`task-chip due-chip ${overdue ? 'is-overdue' : ''} ${
                  dueToday ? 'is-today' : ''
                }`}
              >
                {overdue ? <Clock3 size={13} /> : <CalendarDays size={13} />}
                {task.completed ? dueLabel(task.due_date) : dueLabel(task.due_date)}
              </span>
            ) : null}

            {task.priority !== 'normal' ? (
              <span className={`task-chip priority-chip priority-${task.priority}`}>
                <Flag size={12} />
                {task.priority === 'high' ? 'Yüksek' : 'Düşük'}
              </span>
            ) : null}

            {(task.tags || []).slice(0, 2).map((tag) => (
              <span className="task-chip tag-chip" key={tag}>
                #{tag}
              </span>
            ))}
            {(task.tags || []).length > 2 ? (
              <span className="task-chip tag-chip">+{task.tags.length - 2}</span>
            ) : null}
          </div>
        )}
      </div>

      <div className="task-actions">
        <button
          type="button"
          className="task-action"
          onClick={() => onEdit(task)}
          aria-label="Görevi düzenle"
          title="Düzenle"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          className="task-action task-action-danger"
          onClick={() => onDelete(task)}
          aria-label="Görevi sil"
          title="Sil"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  )
}

export function EmptyState({ hasFilters, onNewTask, onClearFilters }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {hasFilters ? <Inbox size={28} /> : <CircleCheckBig size={28} />}
      </div>
      <h3>{hasFilters ? 'Eşleşen görev yok' : 'Burası henüz sakin'}</h3>
      <p>
        {hasFilters
          ? 'Arama veya filtreleri değiştir; belki başka bir yerde saklanıyordur.'
          : 'İlk görevini ekle. Küçük bir adım, günün geri kalanını değiştirebilir.'}
      </p>
      <div className="empty-actions">
        {hasFilters ? (
          <button type="button" className="button button-soft" onClick={onClearFilters}>
            Filtreleri temizle
          </button>
        ) : (
          <button type="button" className="button button-accent" onClick={onNewTask}>
            <Plus size={16} /> Görev ekle
          </button>
        )}
      </div>
    </div>
  )
}
