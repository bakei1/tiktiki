import { useState } from 'react'
import { Check, Copy, Link2, UserPlus } from 'lucide-react'
import Modal from './Modal.jsx'

function readInviteCode(value) {
  const text = String(value || '').trim()
  try {
    return new URL(text).searchParams.get('join') || text
  } catch {
    return text
  }
}

export default function ChannelAccessModal({ mode, list, onClose, onJoin }) {
  const [value, setValue] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const link = list?.invite_code
    ? `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(list.invite_code)}`
    : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Bağlantı kopyalanamadı; bağlantıyı seçip kopyalayabilirsin.')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const code = readInviteCode(value)
    if (!code) {
      setError('Davet bağlantısını veya kodunu gir.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onJoin(code)
    } catch (joinError) {
      setError(joinError.message || 'Kanala katılınamadı.')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="channel-access-title" width="compact">
      <div className="modal-heading">
        <span className="modal-kicker">{mode === 'share' ? 'Ortak kanal' : 'Kanala katıl'}</span>
        <h2 id="channel-access-title">
          {mode === 'share' ? `#${list?.name} için davet` : 'Davet bağlantısını kullan'}
        </h2>
        <p>
          {mode === 'share'
            ? 'Bağlantıyı ekibinle paylaş. Giriş yapanlar bu kanalı ve içeriğini görebilir.'
            : 'Bir kanal davet bağlantısını yapıştır veya davet kodunu gir.'}
        </p>
      </div>

      {mode === 'share' ? (
        <div className="channel-invite-share">
          <label className="field">
            <span className="field-label"><Link2 size={13} /> Davet bağlantısı</span>
            <input readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <button type="button" className="button button-accent button-full" onClick={copyLink}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Bağlantı kopyalandı' : 'Bağlantıyı kopyala'}
          </button>
        </div>
      ) : (
        <form className="task-form" onSubmit={submit}>
          <label className="field">
            <span className="field-label"><UserPlus size={13} /> Davet kodu veya bağlantısı</span>
            <input
              type="text"
              data-autofocus
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setError('')
              }}
              placeholder="Davet bağlantısını yapıştır"
              autoComplete="off"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <span />
            <div className="modal-actions-right">
              <button type="button" className="button button-ghost" onClick={onClose}>Vazgeç</button>
              <button type="submit" className="button button-accent" disabled={loading}>
                {loading ? 'Katılınıyor…' : 'Kanala katıl'}
              </button>
            </div>
          </div>
        </form>
      )}

      {mode === 'share' && error ? <p className="form-error">{error}</p> : null}
    </Modal>
  )
}
