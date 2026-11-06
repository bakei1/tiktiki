import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, LockKeyhole, ShieldCheck } from 'lucide-react'
import LogoMark, { Wordmark } from './Logo.jsx'

const ACCESS_CODE =
  String(import.meta.env.VITE_ACCESS_CODE || '3131')
    .replace(/\D/g, '')
    .slice(0, 4) || '3131'
const LENGTH = 4

export default function AccessGate({ onUnlock }) {
  const [digits, setDigits] = useState(() => Array(LENGTH).fill(''))
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputs = useRef([])
  const verifyTimer = useRef(null)
  const resetTimer = useRef(null)

  useEffect(() => {
    inputs.current[0]?.focus()
    return () => {
      window.clearTimeout(verifyTimer.current)
      window.clearTimeout(resetTimer.current)
    }
  }, [])

  const verify = (nextDigits = digits) => {
    if (success) return
    if (nextDigits.some((digit) => !digit)) return

    if (nextDigits.join('') === ACCESS_CODE) {
      setSuccess(true)
      setError('')
      inputs.current[LENGTH - 1]?.blur()
      verifyTimer.current = window.setTimeout(onUnlock, 520)
      return
    }

    setError('Kod hatalı. Tekrar dene.')
    setShake(true)
    resetTimer.current = window.setTimeout(() => {
      setDigits(Array(LENGTH).fill(''))
      setShake(false)
      inputs.current[0]?.focus()
    }, 430)
  }

  const applyDigits = (next) => {
    setDigits(next)
    setError('')
    if (next.every(Boolean)) {
      window.clearTimeout(verifyTimer.current)
      verifyTimer.current = window.setTimeout(() => verify(next), 90)
    }
  }

  const handleChange = (index, raw) => {
    if (success) return
    const clean = raw.replace(/\D/g, '')
    const next = [...digits]

    if (clean.length > 1) {
      const characters = clean.slice(0, LENGTH - index).split('')
      characters.forEach((character, offset) => {
        next[index + offset] = character
      })
      applyDigits(next)
      const target = Math.min(index + characters.length, LENGTH - 1)
      inputs.current[target]?.focus()
      return
    }

    next[index] = clean.slice(0, 1)
    applyDigits(next)
    if (clean && index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ''
      applyDigits(next)
      inputs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      verify()
    }
  }

  const handlePaste = (event) => {
    if (success) return
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    event.preventDefault()
    const next = Array(LENGTH).fill('')
    pasted.split('').forEach((character, index) => {
      next[index] = character
    })
    applyDigits(next)
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
  }

  return (
    <div className={`gate-page ${success ? 'is-unlocked' : ''}`}>
      <div className="gate-grid" aria-hidden="true" />
      <div className="gate-orb gate-orb-one" aria-hidden="true" />
      <div className="gate-orb gate-orb-two" aria-hidden="true" />

      <header className="gate-brand">
        <LogoMark size={38} />
        <Wordmark />
        <span className="beta-pill">beta</span>
      </header>

      <main className="gate-card">
        <div className="gate-icon">
          {success ? <Check size={25} strokeWidth={2.6} /> : <LockKeyhole size={24} />}
        </div>

        <span className="gate-eyebrow">Özel çalışma alanı</span>
        <h1>{success ? 'Kapı açılıyor' : 'Erişim kodu'}</h1>
        <p>
          {success
            ? 'tık. seni içeri alıyor.'
            : 'Devam etmek için 4 haneli erişim kodunu gir.'}
        </p>

        <div
          className={`pin-row ${shake ? 'is-shaking' : ''} ${error ? 'has-error' : ''} ${
            success ? 'is-success' : ''
          }`}
          onPaste={handlePaste}
        >
          {Array.from({ length: LENGTH }).map((_, index) => (
            <input
              key={index}
              ref={(node) => {
                inputs.current[index] = node
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[index]}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={`Erişim kodu, ${index + 1}. hane`}
              disabled={success}
            />
          ))}
        </div>

        <div className="gate-feedback" aria-live="polite">
          {error ? <span className="gate-error">{error}</span> : <span>Kod yöneticiden alınır.</span>}
        </div>

        <button
          type="button"
          className="button button-accent gate-submit"
          onClick={() => verify()}
          disabled={digits.some((digit) => !digit) || success}
        >
          {success ? 'Açılıyor…' : 'Devam et'}
          {success ? <Check size={16} /> : <ArrowRight size={16} />}
        </button>

        <div className="gate-footnote">
          <ShieldCheck size={14} />
          <span>Bu alan yalnızca davet edilenler için.</span>
        </div>
      </main>

      <footer className="gate-footer">
        <span>tık.</span>
        <span>yapılacaklar, sohbet gibi.</span>
      </footer>
    </div>
  )
}
