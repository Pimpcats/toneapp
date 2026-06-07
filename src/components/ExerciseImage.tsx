import { useState } from 'react'

const PLACEHOLDER = 'exercises/_placeholder.svg'

type Props = {
  slug: string
  src: string // the schematic SVG path from the program data
  alt: string
}

// Renders an exercise visual with a graceful fallback chain:
//   1. a real photo at exercises/{slug}.jpg (open-licensed, vendored in CI)
//   2. the original schematic SVG diagram
//   3. the generic placeholder
// Each onError advances to the next candidate, so a missing photo or SVG
// never breaks the layout.
export function ExerciseImage({ slug, src, alt }: Props) {
  const candidates = Array.from(new Set([`exercises/${slug}.jpg`, src, PLACEHOLDER]))
  const [index, setIndex] = useState(0)
  return (
    <img
      className="exercise-image"
      src={candidates[index]}
      alt={alt}
      loading="lazy"
      width={400}
      height={300}
      onError={() => setIndex((i) => Math.min(i + 1, candidates.length - 1))}
    />
  )
}
