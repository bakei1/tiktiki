import { HelpCircle, Plus } from 'lucide-react'
import LogoMark from './Logo.jsx'
import ViewGlyph from './ViewGlyph.jsx'

const VIEWS = [
  { id: 'today', label: 'Bugün', shortcut: 'T' },
  { id: 'upcoming', label: 'Yaklaşan', shortcut: 'Y' },
  { id: 'completed', label: 'Tamamlanan', shortcut: 'C' },
]

export default function Rail({ view, onSelectView, onNewList, onHelp }) {
  return (
    <nav className="rail" aria-label="Ana gezinme">
      <div className="rail-top">
        <button
          type="button"
          className={`rail-brand ${view.type === 'all' ? 'is-active' : ''}`}
          onClick={() => onSelectView('all')}
          aria-label="Tüm görevler"
          data-tooltip="Tüm görevler"
        >
          <span className="rail-active-pill" />
          <LogoMark size={42} />
        </button>

        <span className="rail-separator" />

        <div className="rail-nav">
          {VIEWS.map((item) => {
            const active = view.type === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`rail-button ${active ? 'is-active' : ''}`}
                onClick={() => onSelectView(item.id)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                data-tooltip={item.label}
              >
                <span className="rail-active-pill" />
                <ViewGlyph kind={item.id} size={20} />
              </button>
            )
          })}
        </div>

        <span className="rail-separator rail-separator-soft" />

        <button
          type="button"
          className="rail-button rail-add"
          onClick={onNewList}
          aria-label="Yeni liste oluştur"
          data-tooltip="Yeni liste"
        >
          <span className="rail-active-pill" />
          <Plus size={22} strokeWidth={2.2} />
        </button>
      </div>

      <div className="rail-bottom">
        <button
          type="button"
          className="rail-button rail-utility"
          onClick={onHelp}
          aria-label="Klavye kısayolları"
          data-tooltip="Kısayollar"
        >
          <HelpCircle size={20} />
        </button>
      </div>
    </nav>
  )
}
