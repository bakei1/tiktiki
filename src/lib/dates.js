const DAY_MS = 86_400_000
const shortMonth = new Intl.DateTimeFormat('tr-TR', { month: 'short' })
const longDate = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
})

export function toISODate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(base = new Date()) {
  return toISODate(base)
}

export function addDaysISO(days, base = new Date()) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function dateOnly(value) {
  if (!value) return null
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  return new Date(`${String(value).slice(0, 10)}T00:00:00`)
}

export function dayDiff(value) {
  if (!value) return null
  const due = dateOnly(value).getTime()
  const today = dateOnly(todayISO()).getTime()
  return Math.round((due - today) / DAY_MS)
}

export function dueLabel(value) {
  if (!value) return ''
  const diff = dayDiff(value)
  if (diff === 0) return 'Bugün'
  if (diff === 1) return 'Yarın'
  if (diff === -1) return 'Dün'
  if (diff < -1) return `${Math.abs(diff)} gün gecikti`
  if (diff < 7) {
    return new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(dateOnly(value))
  }
  return formatShortDate(value)
}

export function dueState(value) {
  if (!value) return 'none'
  const diff = dayDiff(value)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return 'future'
}

export function formatShortDate(value) {
  if (!value) return ''
  const date = dateOnly(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const month = shortMonth.format(date).replace('.', '')
  return sameYear
    ? `${date.getDate()} ${month}`
    : `${date.getDate()} ${month} ${date.getFullYear()}`
}

export function formatLongDate(value = new Date()) {
  return longDate.format(value)
}

export function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function dateKey(value) {
  return toISODate(new Date(value))
}

export function dividerLabel(value) {
  const key = dateKey(value)
  if (key === todayISO()) return 'Bugün'
  if (key === addDaysISO(-1)) return 'Dün'
  const date = new Date(value)
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function weekdayShort(value) {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(value)
}

export function initials(name) {
  const clean = String(name || 'Sen').trim()
  if (!clean) return 'S'
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLocaleUpperCase('tr-TR')
}
