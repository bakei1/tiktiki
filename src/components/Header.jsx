import { Hash, Menu, Plus, Search, X } from 'lucide-react'
import ViewGlyph from './ViewGlyph.jsx'

const STATUS_OPTIONS = [
  { id: 'all', label: 'Tümü' },
  { id: 'open', label: 'Açık' },
  { id: 'done', label: 'Bitti' },
]

export default function Header({
  meta,
  query,
  onQueryChange,
  status,
  onStatusChange,
  counts,
  onOpenSidebar,
  onNewTask,
  searchRef,
}) {
  const Icon = meta.kind === 'list' ? Hash : null

  return (
    <header className="channel-header">
      <div className="channel-header-left">
        <button
          type="button"
          className="icon-button sidebar-toggle"
          onClick={onOpenSidebar}
          aria-label="Kanalları aç"
        >
          <Menu size={20} />
        </button>

        <div className={`channel-title-wrap tone-${meta.color || 'lime'}`}>
          <span className="channel-title-icon">
            {Icon ? (
              <Icon size={19} strokeWidth={2.2} />
            ) : (
              <ViewGlyph kind={meta.kind} size={19} />
            )}
          </span>
          <h1 className="channel-title">{meta.title}</h1>
        </div>

        <span className="header-divider" />
        <p className="channel-description">{meta.description}</p>
      </div>

      <div className="channel-header-actions">
        <div
          className={`search-box ${query ? 'has-value' : ''}`}
          onClick={() => searchRef.current?.focus()}
        >
          <Search size={16} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onQueryChange('')
                event.currentTarget.blur()
              }
            }}
            placeholder="Görevlerde ara"
            aria-label="Görevlerde ara"
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              onClick={(event) => {
                event.stopPropagation()
                onQueryChange('')
              }}
              aria-label="Aramayı temizle"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="search-kbd">/</kbd>
          )}
          <button
            type="button"
            className="search-cancel"
            onClick={(event) => {
              event.stopPropagation()
              onQueryChange('')
              searchRef.current?.blur()
            }}
          >
            Kapat
          </button>
        </div>

        {meta.kind !== 'completed' ? (
          <div className="status-switch" role="group" aria-label="Görev durumuna göre filtrele">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={status === option.id ? 'is-active' : ''}
                onClick={() => onStatusChange(option.id)}
                aria-pressed={status === option.id}
              >
                <span>{option.label}</span>
                <span className="status-count">{counts[option.id] ?? 0}</span>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="icon-button header-add"
          onClick={onNewTask}
          aria-label="Yeni görev ekle"
          title="Yeni görev"
        >
          <Plus size={19} />
        </button>
      </div>
    </header>
  )
}
