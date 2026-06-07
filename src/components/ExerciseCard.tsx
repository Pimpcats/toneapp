import { useState } from 'react'
import type { Exercise } from '../types'
import { ExerciseImage } from './ExerciseImage'
import { SetTracker } from './SetTracker'

type Props = {
  exercise: Exercise
  completed: number
  onSetToggle: (index: number) => void
}

function restLabel(seconds: number) {
  return `${seconds}s rest`
}

export function ExerciseCard({ exercise, completed, onSetToggle }: Props) {
  const [open, setOpen] = useState(false)
  const repSuffix = exercise.perSide ? ' / side' : ''

  return (
    <article className={`card exercise-card${completed === exercise.sets ? ' complete' : ''}`}>
      <ExerciseImage src={exercise.image} alt={exercise.alt} />

      <div className="exercise-body">
        <h3 className="exercise-name">{exercise.name}</h3>

        <div className="exercise-meta">
          <span className="chip strong">
            {exercise.sets} × {exercise.reps}
            {repSuffix}
          </span>
          <span className="chip">{restLabel(exercise.restSeconds)}</span>
        </div>

        <SetTracker total={exercise.sets} completed={completed} onToggle={onSetToggle} />

        <button
          type="button"
          className="cues-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide form cues' : 'Form cues'}
          <span className={`caret${open ? ' up' : ''}`} aria-hidden>
            ▾
          </span>
        </button>

        {open && (
          <ul className="cues">
            {exercise.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
