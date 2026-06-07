import type { Cardio } from '../types'

type Props = {
  cardio: Cardio
}

export function CardioCard({ cardio }: Props) {
  return (
    <article className="card cardio-card">
      <div className="cardio-head">
        <span className="cardio-icon" aria-hidden>
          ♥
        </span>
        <div>
          <h3 className="cardio-title">
            Cardio · {cardio.minutes} min {cardio.type}
          </h3>
          <p className="cardio-sub">Finish every training day with cardio.</p>
        </div>
      </div>
      <p className="cardio-note">{cardio.note}</p>
    </article>
  )
}
