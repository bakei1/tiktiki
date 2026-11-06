import { initials } from '../lib/dates.js'

const TONES = 6

function toneFor(name) {
  let hash = 0
  for (let i = 0; i < String(name || '').length; i += 1) {
    hash = (hash * 31 + String(name).charCodeAt(i)) % 997
  }
  return hash % TONES
}

export default function Avatar({
  name = 'Sen',
  src = null,
  size = 40,
  status = null,
  className = '',
}) {
  const tone = toneFor(name)
  return (
    <span
      className={`avatar avatar-tone-${tone} ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}
      title={name}
    >
      {src ? <img src={src} alt="" /> : <span>{initials(name)}</span>}
      {status ? <i className={`presence presence-${status}`} aria-hidden="true" /> : null}
    </span>
  )
}
