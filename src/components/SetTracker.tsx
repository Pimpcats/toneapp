type Props = {
  total: number
  completed: number
  onToggle: (index: number) => void
}

// A row of tappable set pills. Filled pills (left to right) count as completed.
export function SetTracker({ total, completed, onToggle }: Props) {
  return (
    <div className="set-tracker" role="group" aria-label="Set tracker">
      {Array.from({ length: total }, (_, i) => {
        const done = i < completed
        return (
          <button
            key={i}
            type="button"
            className={`set-pill${done ? ' done' : ''}`}
            aria-pressed={done}
            aria-label={`Set ${i + 1}${done ? ' completed' : ''}`}
            onClick={() => onToggle(i)}
          >
            {done ? '✓' : i + 1}
          </button>
        )
      })}
    </div>
  )
}
