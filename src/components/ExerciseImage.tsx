import { useState } from 'react'

const PLACEHOLDER = 'exercises/_placeholder.svg'

type Props = {
  src: string
  alt: string
}

// Renders an exercise form diagram. If the SVG is missing or fails to load,
// it falls back to the generic placeholder so the layout never breaks.
export function ExerciseImage({ src, alt }: Props) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      className="exercise-image"
      src={failed ? PLACEHOLDER : src}
      alt={alt}
      loading="lazy"
      width={400}
      height={300}
      onError={() => {
        if (!failed) setFailed(true)
      }}
    />
  )
}
