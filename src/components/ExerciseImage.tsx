import { useEffect, useRef, useState } from 'react'

const PLACEHOLDER = 'exercises/_placeholder.svg'

type Props = {
  slug: string
  src: string // the schematic SVG path from the program data
  alt: string
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

// Renders an exercise visual that demonstrates the motion:
//   - two photo frames (start + end) cross-fade on a loop to animate the lift
//   - if only one photo exists, it shows static
//   - if the photo is missing, it falls back to the schematic SVG, then the
//     generic placeholder — so nothing ever breaks.
// Respects prefers-reduced-motion: no auto-animation, with a tap-to-toggle
// between start and end instead.
export function ExerciseImage({ slug, src, alt }: Props) {
  const frame0 = `exercises/${slug}.jpg`
  const frame1 = `exercises/${slug}-2.jpg`

  // photo -> svg -> placeholder
  const [stage, setStage] = useState<'photo' | 'svg' | 'placeholder'>('photo')
  const [hasFrame1, setHasFrame1] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const reduced = usePrefersReducedMotion()
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearInterval(timer.current)
    if (stage !== 'photo' || !hasFrame1 || reduced) return
    timer.current = window.setInterval(() => setShowEnd((s) => !s), 1200)
    return () => window.clearInterval(timer.current)
  }, [stage, hasFrame1, reduced])

  // Single-image fallback once the photo has failed.
  if (stage !== 'photo') {
    return (
      <img
        className="exercise-image"
        src={stage === 'svg' ? src : PLACEHOLDER}
        alt={alt}
        loading="lazy"
        width={400}
        height={300}
        onError={() => stage === 'svg' && setStage('placeholder')}
      />
    )
  }

  const phase = showEnd ? 'End' : 'Start'

  return (
    <div className="exercise-image-wrap">
      <img
        className="exercise-image frame"
        src={frame0}
        alt={alt}
        loading="lazy"
        style={{ opacity: showEnd && hasFrame1 ? 0 : 1 }}
        onError={() => setStage('svg')}
      />
      <img
        className="exercise-image frame"
        src={frame1}
        alt=""
        aria-hidden
        loading="lazy"
        style={{ opacity: showEnd && hasFrame1 ? 1 : 0 }}
        onLoad={() => setHasFrame1(true)}
        onError={() => setHasFrame1(false)}
      />

      {hasFrame1 &&
        (reduced ? (
          <button
            type="button"
            className="frame-toggle"
            onClick={() => setShowEnd((s) => !s)}
          >
            Show {showEnd ? 'start' : 'end'}
          </button>
        ) : (
          <span className="frame-phase" aria-hidden>
            {phase}
          </span>
        ))}
    </div>
  )
}
