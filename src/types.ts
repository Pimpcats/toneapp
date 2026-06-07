export type Focus = 'upper' | 'lower' | 'core'

export type Exercise = {
  slug: string // "incline-dumbbell-press"
  name: string
  sets: number
  reps: string // "10–12" or "15" or "max hold"
  restSeconds: number
  perSide?: boolean
  image: string // "/exercises/incline-dumbbell-press.svg"
  alt: string
  cues: string[] // 2–4 short form cues
}

export type Cardio = {
  minutes: number
  type: string
  note: string
}

export type Day = {
  id: number // 1–4
  title: string // "Upper (Push emphasis)"
  focus: Focus
  exercises: Exercise[]
  cardio: Cardio
}

export type Program = {
  name: string
  days: Day[]
}
