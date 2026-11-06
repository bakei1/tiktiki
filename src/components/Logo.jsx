export default function LogoMark({ size = 40, className = '' }) {
  return (
    <span
      className={`logo-mark ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.29) }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        <path
          d="M16.5 33.2 27.2 44 48 20.8"
          stroke="currentColor"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="49.5" cy="16" r="3.8" fill="currentColor" />
      </svg>
    </span>
  )
}

export function Wordmark({ small = false }) {
  return (
    <span className={`wordmark ${small ? 'wordmark-small' : ''}`.trim()}>
      tık<span className="wordmark-dot">.</span>
    </span>
  )
}
