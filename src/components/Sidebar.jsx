import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  Hash,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Settings,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import Avatar from './Avatar.jsx'
import { Wordmark } from './Logo.jsx'

function ChannelRow({ list, openCount, active, isOwner, onSelect, onEdit, onDelete, onInvite }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  return (
    <div className={`channel-row ${active ? 'is-active' : ''}`} ref={menuRef}>
      <button
        type="button"
        className="channel-main"
        onClick={() => onSelect(list.id)}
        aria-current={active ? 'page' : undefined}
      >
        <Hash
          size={18}
          strokeWidth={2}
          className={`channel-hash list-color-${list.color}`}
        />
        <span className="channel-name">{list.name}</span>
        {openCount > 0 ? <span className="channel-count">{openCount}</span> : null}
      </button>
      {isOwner ? (
        <button
          type="button"
          className="channel-more"
          aria-label={`${list.name} listesi seçenekleri`}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreHorizontal size={17} />
        </button>
      ) : null}

      {menuOpen ? (
        <div className="channel-menu" role="menu">
          {list.is_shared ? (
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onInvite(list) }}>
              <Share2 size={15} /> Davet bağlantısı
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              onEdit(list)
            }}
          >
            <Pencil size={15} /> Yeniden adlandır
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              setMenuOpen(false)
              onDelete(list)
            }}
          >
            <Trash2 size={15} /> Listeyi sil
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function Sidebar({
  lists,
  tasks,
  view,
  onSelectList,
  onSelectView,
  onNewTask,
  onNewList,
  onEditList,
  onDeleteList,
  onInvite,
  onJoinChannel,
  currentUserId,
  onOpenSettings,
  profile,
  todayStats,
  mobileOpen,
  onClose,
}) {
  const todayPct = todayStats.total
    ? Math.round((todayStats.done / todayStats.total) * 100)
    : 0

  return (
    <aside className={`sidebar ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="workspace-head">
        <div className="workspace-title">
          <Wordmark />
          <span className="beta-pill">beta</span>
        </div>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Menüyü kapat"
        >
          <X size={18} />
        </button>
      </div>

      <div className="workspace-meta">
        <span className="connection-dot is-cloud" />
        <span>Çalışma alanın</span>
        <span className="workspace-meta-divider" />
        <span>kişisel alan</span>
      </div>

      <div className="sidebar-scroll">
        <button type="button" className="quick-add" onClick={onNewTask}>
          <span className="quick-add-icon">
            <Plus size={17} strokeWidth={2.5} />
          </span>
          <span>Yeni görev</span>
          <kbd>N</kbd>
        </button>

        <div className="section-heading">
          <span>Kanallar</span>
          <div className="channel-section-actions">
            <button
              type="button"
              className="section-add"
              onClick={onJoinChannel}
              aria-label="Davet bağlantısıyla kanala katıl"
              title="Kanala katıl"
            >
              <UserPlus size={15} />
            </button>
            <button
              type="button"
              className="section-add"
              onClick={onNewList}
              aria-label="Yeni kanal"
              title="Yeni kanal"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="channel-list">
          {lists.map((list) => (
            <ChannelRow
              key={list.id}
              list={list}
              isOwner={list.user_id === currentUserId}
              active={view.type === 'list' && view.id === list.id}
              openCount={tasks.filter((task) => task.list_id === list.id && !task.completed).length}
              onSelect={onSelectList}
              onEdit={onEditList}
              onDelete={onDeleteList}
              onInvite={onInvite}
            />
          ))}
          {lists.length === 0 ? (
            <button type="button" className="empty-channel" onClick={onNewList}>
              <Plus size={15} /> İlk listeni oluştur
            </button>
          ) : null}
        </div>

        <div className="section-heading section-heading-views">
          <span>Kısayollar</span>
        </div>
        <div className="side-shortcuts">
          {[
            { id: 'all', label: 'Tüm görevler', hint: 'Bütün kanallar' },
            { id: 'today', label: 'Bugün', hint: 'Bugün + geciken' },
            { id: 'upcoming', label: 'Yaklaşan', hint: 'Planlanan' },
            { id: 'completed', label: 'Tamamlanan', hint: 'Arşiv' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`side-shortcut ${view.type === item.id ? 'is-active' : ''}`}
              onClick={() => onSelectView(item.id)}
            >
              <span>{item.label}</span>
              <span className="side-shortcut-hint">{item.hint}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-spacer" />

        <div className="today-card">
          <div className="today-card-top">
            <span className="eyebrow">Günün ritmi</span>
            <span className="today-fraction">
              {todayStats.done}/{todayStats.total}
            </span>
          </div>
          <p className="today-card-copy">
            {todayStats.total === 0
              ? 'Bugün için planlanan bir şey yok.'
              : todayStats.done === todayStats.total
                ? 'Bugünün listesi tertemiz. İyi iş.'
                : `${todayStats.total - todayStats.done} görev seni bekliyor.`}
          </p>
          <div className="mini-progress" aria-hidden="true">
            <span style={{ width: `${todayPct}%` }} />
          </div>
          <button type="button" className="today-card-link" onClick={() => onSelectView('today')}>
            {todayStats.done === todayStats.total && todayStats.total > 0 ? (
              <>
                <Check size={15} /> Günü gör
              </>
            ) : (
              <>
                Bugüne git <ChevronRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>

      <button type="button" className="user-bar" onClick={onOpenSettings}>
        <Avatar name={profile.name} src={profile.avatar_url} size={34} status="online" />
        <span className="user-bar-copy">
          <strong>{profile.name}</strong>
          <span>kişisel alan</span>
        </span>
        <Settings size={17} className="user-bar-settings" />
      </button>
    </aside>
  )
}
