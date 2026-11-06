import { AlertTriangle, RotateCcw } from 'lucide-react'
import LogoMark, { Wordmark } from './Logo.jsx'

export function Splash({ label = 'Akış hazırlanıyor…' }) {
  return (
    <div className="splash">
      <div className="splash-brand">
        <LogoMark size={56} />
        <Wordmark />
      </div>
      <div className="splash-loader">
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </div>
  )
}

export function DataError({ message, onRetry, onSignOut }) {
  return (
    <div className="error-screen">
      <div className="error-card">
        <span className="error-icon">
          <AlertTriangle size={24} />
        </span>
        <span className="modal-kicker">Bağlantı sorunu</span>
        <h1>Veriler getirilemedi</h1>
        <p>{message}</p>
        <div className="error-hint">Bağlantını kontrol edip yeniden deneyebilirsin.</div>
        <div className="error-actions">
          <button type="button" className="button button-accent" onClick={onRetry}>
            <RotateCcw size={15} /> Tekrar dene
          </button>
          {onSignOut ? (
            <button type="button" className="button button-ghost" onClick={onSignOut}>
              Çıkış yap
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
