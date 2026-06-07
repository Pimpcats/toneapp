import { useMemo } from 'react'
import { program, progressionRule } from './data/program'
import { useLocalStorage } from './hooks/useLocalStorage'
import { DaySelector } from './components/DaySelector'
import { ExerciseCard } from './components/ExerciseCard'
import { CardioCard } from './components/CardioCard'

// Completion state: { [dayId]: { [slug]: completedSetCount } }
type Completions = Record<string, Record<string, number>>

const STORAGE_DAY = 'leanbuild.activeDay'
const STORAGE_SETS = 'leanbuild.completions'

export default function App() {
  const [activeDay, setActiveDay] = useLocalStorage<number>(STORAGE_DAY, 1)
  const [completions, setCompletions] = useLocalStorage<Completions>(STORAGE_SETS, {})

  const day = useMemo(
    () => program.days.find((d) => d.id === activeDay) ?? program.days[0],
    [activeDay]
  )

  const dayKey = String(day.id)
  const dayCompletions = completions[dayKey] ?? {}

  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const doneSets = day.exercises.reduce(
    (sum, ex) => sum + Math.min(dayCompletions[ex.slug] ?? 0, ex.sets),
    0
  )
  const pct = totalSets === 0 ? 0 : Math.round((doneSets / totalSets) * 100)

  function toggleSet(slug: string, index: number, totalForExercise: number) {
    setCompletions((prev) => {
      const current = prev[dayKey]?.[slug] ?? 0
      // Tapping a filled pill clears it and everything after; tapping an empty
      // pill fills up to and including it.
      const next = index < current ? index : Math.min(index + 1, totalForExercise)
      return {
        ...prev,
        [dayKey]: { ...(prev[dayKey] ?? {}), [slug]: next },
      }
    })
  }

  function resetDay() {
    setCompletions((prev) => {
      const copy = { ...prev }
      delete copy[dayKey]
      return copy
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">LeanBuild</h1>
        <p className="app-subtitle">4-day · definition with a strength bias</p>
      </header>

      <DaySelector days={program.days} activeId={day.id} onSelect={setActiveDay} />

      <section className="day-summary" aria-label="Day progress">
        <div className="day-summary-text">
          <h2 className="day-heading">
            Day {day.id} — {day.title}
          </h2>
          <p className="day-progress-label">
            {doneSets} / {totalSets} sets · {pct}%
          </p>
        </div>
        <button type="button" className="reset-btn" onClick={resetDay} disabled={doneSets === 0}>
          Reset day
        </button>
      </section>

      <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <main className="exercise-list">
        {day.exercises.map((ex) => (
          <ExerciseCard
            key={ex.slug}
            exercise={ex}
            completed={Math.min(dayCompletions[ex.slug] ?? 0, ex.sets)}
            onSetToggle={(i) => toggleSet(ex.slug, i, ex.sets)}
          />
        ))}

        <CardioCard cardio={day.cardio} />

        <aside className="progression card">
          <h3 className="progression-title">Progression</h3>
          <p>{progressionRule}</p>
        </aside>
      </main>

      <footer className="app-footer">
        <p>{program.name}</p>
      </footer>
    </div>
  )
}
