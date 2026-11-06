import { useState } from 'react'
import { AtSign, LogOut, Mail } from 'lucide-react'
import Modal from './Modal.jsx'

export default function SettingsModal({ profile, email, onClose, onSaveProfile, onSignOut }) {
  const [name, setName] = useState(profile.name)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async (event) => {
    event.preventDefault()
    const clean = name.trim()
    if (!/^[a-zA-Z0-9._-]{3,24}$/.test(clean)) {
      setError('3–24 karakter; harf, rakam, nokta ve tire kullan.')
      return
    }
    setError('')
    const result = await onSaveProfile(clean)
    if (result === false) return
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <Modal onClose={onClose} labelledBy="settings-modal-title" width="compact">
      <div className="modal-heading">
        <span className="modal-kicker">Ayarlar</span>
        <h2 id="settings-modal-title">Hesabın</h2>
        <p>Profil bilgilerin burada.</p>
      </div>

      <form className="settings-form" onSubmit={save}>
        <div className="settings-profile">
          <span className="settings-avatar">{profile.initials}</span>
          <div>
            <strong>{profile.name}</strong>
            <span>Hesap profili</span>
          </div>
        </div>

        <label className="field">
          <span className="field-label">
            <AtSign size={13} /> Kullanıcı adı
          </span>
          <input
            type="text"
            data-autofocus
            value={name}
            maxLength={24}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
          />
          {error ? <span className="field-error">{error}</span> : null}
        </label>

        {email ? (
          <div className="settings-row">
            <span className="settings-row-icon">
              <Mail size={16} />
            </span>
            <div>
              <strong>E-posta</strong>
              <span>{email}</span>
            </div>
          </div>
        ) : null}

        <button type="submit" className="button button-accent button-full">
          {saved ? 'Kaydedildi' : 'Profili kaydet'}
        </button>
      </form>

      <div className="settings-divider" />

      <div className="settings-data">
        <div className="settings-actions">
          <button type="button" className="button button-ghost button-small" onClick={onSignOut}>
            <LogOut size={14} /> Çıkış yap
          </button>
        </div>
      </div>

      <p className="settings-footnote">
        tık. <span>v1.1</span> · görevler sohbet gibi akar.
      </p>
    </Modal>
  )
}
