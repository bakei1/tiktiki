import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AtSign,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import LogoMark, { Wordmark } from './Logo.jsx'
import { supabase } from '../lib/supabase.js'

function translateAuthError(message) {
  const text = String(message || '')
  if (/invalid login credentials|giriş bilgileri hatalı/i.test(text)) return 'E-posta/kullanıcı adı veya şifre hatalı.'
  if (/email not confirmed/i.test(text)) return 'Bu hesapla şu an giriş yapılamıyor.'
  if (/user already registered/i.test(text)) {
    return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.'
  }
  if (/password should be at least/i.test(text)) return 'Şifre en az 6 karakter olmalı.'
  if (/database error saving new user|profiles_username_lower_idx/i.test(text)) {
    return 'Bu kullanıcı adı kullanılıyor veya kayıt tamamlanamadı.'
  }
  if (/kullanıcı adıyla giriş yapılandırılmamış|function .*username-login|failed to send a request to the edge function|edge function returned a non-2xx/i.test(text)) {
    return 'Kullanıcı adıyla giriş için veritabanı şemasını ve sunucu işlevini kur.'
  }
  if (/rate limit|too many/i.test(text)) {
    return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.'
  }
  return text || 'Bir şeyler ters gitti. Tekrar dene.'
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const signup = mode === 'signup'

  useEffect(() => {
    document.title = `${signup ? 'Kayıt' : 'Giriş'} · tık.`
  }, [signup])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (signup && !/^[a-zA-Z0-9._-]{3,24}$/.test(username.trim())) {
      setError('Kullanıcı adı 3–24 karakter olmalı; harf, rakam, nokta, tire kullanabilirsin.')
      return
    }
    if (!email.trim()) {
      setError('E-posta adresini yaz.')
      return
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    setLoading(true)
    try {
      if (signup) {
        const cleanUsername = username.trim()
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
              full_name: cleanUsername,
              display_name: cleanUsername,
            },
            emailRedirectTo: window.location.href,
          },
        })
        if (authError) throw authError
        if (!data.session) {
          setInfo('Kayıt isteğin tamamlandı.')
        }
      } else {
        const identity = email.trim()
        if (identity.includes('@')) {
          const { error: authError } = await supabase.auth.signInWithPassword({
            email: identity,
            password,
          })
          if (authError) throw authError
        } else {
          const { data, error: authError } = await supabase.functions.invoke(
            'username-login',
            { body: { username: identity, password } },
          )
          if (authError) {
            let detail = ''
            try {
              detail = (await authError.context?.json())?.error || ''
            } catch {
              // Keep the SDK error when the function response is not JSON.
            }
            throw new Error(detail || authError.message)
          }
          if (!data?.access_token || !data?.refresh_token) {
            throw new Error(data?.error || 'Giriş bilgileri hatalı.')
          }
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          })
          if (sessionError) throw sessionError
        }
      }
    } catch (authError) {
      setError(translateAuthError(authError.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-art">
        <div className="auth-orb auth-orb-one" aria-hidden="true" />
        <div className="auth-orb auth-orb-two" aria-hidden="true" />

        <div className="auth-brand">
          <LogoMark size={38} />
          <Wordmark />
          <span className="beta-pill">beta</span>
        </div>

        <div className="auth-copy">
          <span className="auth-eyebrow">
            <Sparkles size={14} /> Görev akışı
          </span>
          <h1>
            Yapılacaklar,
            <br />
            <span>sohbet gibi.</span>
          </h1>
          <p>
            Kanallara ayır, mesaj yazar gibi görev ekle, tamamla. Dağınık listeler
            yerine akışta kal.
          </p>
        </div>

        <div className="auth-art-footer">
          <ShieldCheck size={15} />
          <span>Görevlerini tek bir akışta düzenle.</span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <LogoMark size={32} />
          <Wordmark />
        </div>
        <div className="auth-card">
          <div className="auth-card-head">
            <span className="auth-card-icon">
              <LockKeyhole size={19} />
            </span>
            <div>
              <span className="modal-kicker">{signup ? 'Hesap oluştur' : 'Tekrar hoş geldin'}</span>
              <h2>{signup ? 'tık’a katıl' : 'Alanına dön'}</h2>
            </div>
          </div>
          <p className="auth-card-copy">
            {signup
              ? 'Kullanıcı adı, e-posta ve şifre yeterli. Görevlerin hesabına bağlanır.'
              : 'Görevlerin seni bekliyor. Kaldığın yerden devam et.'}
          </p>

          <form className="auth-form" onSubmit={submit}>
            {signup ? (
              <label className="field">
                <span className="field-label">
                  <AtSign size={13} /> Kullanıcı adı
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    setError('')
                  }}
                  placeholder="kullaniciadi"
                  autoComplete="username"
                  maxLength={24}
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">
                  <Mail size={13} /> {signup ? 'E-posta' : 'E-posta veya kullanıcı adı'}
              </span>
              <input
                type={signup ? 'email' : 'text'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={signup ? 'sen@ornek.com' : 'E-posta ya da kullanıcı adı'}
                autoComplete={signup ? 'email' : 'username'}
                data-autofocus
              />
            </label>

            <label className="field">
              <span className="field-label">
                <LockKeyhole size={13} /> Şifre
              </span>
              <span className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="En az 6 karakter"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error ? (
              <p className="auth-message is-error">
                <AlertCircle size={15} /> {error}
              </p>
            ) : null}
            {info ? (
              <p className="auth-message is-info">
                <Check size={15} /> {info}
              </p>
            ) : null}

            <button type="submit" className="button button-accent button-full auth-submit" disabled={loading}>
              {loading ? <LoaderCircle size={17} className="is-spinning" /> : null}
              {loading ? 'Bağlanıyor…' : signup ? 'Hesabı oluştur' : 'Giriş yap'}
            </button>
          </form>

          <button
            type="button"
            className="auth-mode-toggle"
            onClick={() => {
              setMode(signup ? 'signin' : 'signup')
              setError('')
              setInfo('')
            }}
          >
            {signup ? 'Zaten hesabın var mı?' : 'Henüz hesabın yok mu?'}{' '}
            <strong>{signup ? 'Giriş yap' : 'Kayıt ol'}</strong>
          </button>

          <p className="auth-legal">
            Kayıt için kullanıcı adı, e-posta ve şifre yeterlidir.
          </p>
        </div>
      </section>
    </div>
  )
}
