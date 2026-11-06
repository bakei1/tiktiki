import {
  CalendarDays,
  CheckCheck,
  Hash,
  LayoutList,
  Layers3,
  Sun,
} from 'lucide-react'

export const VIEW_ICONS = {
  all: Layers3,
  today: Sun,
  upcoming: CalendarDays,
  completed: CheckCheck,
  list: Hash,
}

export default function ViewGlyph({ kind = 'list', size = 18, strokeWidth = 2.1, ...rest }) {
  const Icon = VIEW_ICONS[kind] || LayoutList
  return <Icon size={size} strokeWidth={strokeWidth} {...rest} />
}
