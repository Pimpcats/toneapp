import type { Day } from '../types'

type Props = {
  days: Day[]
  activeId: number
  onSelect: (id: number) => void
}

export function DaySelector({ days, activeId, onSelect }: Props) {
  return (
    <nav className="day-selector" aria-label="Training day">
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          className={`day-tab${day.id === activeId ? ' active' : ''}`}
          aria-pressed={day.id === activeId}
          onClick={() => onSelect(day.id)}
        >
          <span className="day-tab-num">Day {day.id}</span>
          <span className="day-tab-focus">{day.title}</span>
        </button>
      ))}
    </nav>
  )
}
