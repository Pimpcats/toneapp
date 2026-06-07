// Generates original, schematic form diagrams (one SVG per exercise) into
// public/exercises/. Each diagram draws a simple stick figure in a START
// (ghost) and END (solid) position with a motion arrow and 1–2 form-cue labels.
//
// These are original, parametric line drawings — nothing is traced or copied.
// Run with:  npm run gen:svg
//
// To tweak a diagram, edit its entry in EXERCISES below (joint angles are in
// degrees, measured clockwise from straight-down) and re-run the script.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/exercises')

const ACCENT = '#22c1a4'
const INK = '#1f2430'
const GHOST = '#aeb6c2'
const LABEL = '#586073'
const BG = '#ffffff'

// ---- geometry helpers ------------------------------------------------------
const rad = (d) => (d * Math.PI) / 180
const rot = ([x, y], a) => [
  x * Math.cos(rad(a)) - y * Math.sin(rad(a)),
  x * Math.sin(rad(a)) + y * Math.cos(rad(a)),
]
const add = ([x, y], [u, v]) => [x + u, y + v]
const scl = ([x, y], s) => [x * s, y * s]
const down = (a) => rot([0, 1], a) // unit vector, angle from straight-down

const LEN = {
  torso: 56,
  neck: 12,
  head: 14,
  uarm: 30,
  farm: 28,
  thigh: 38,
  shin: 38,
}

// Build a skeleton's joint coordinates from high-level pose params.
// angles in degrees, clockwise from straight-down (screen y is down).
function skeleton(p) {
  const hip = p.hip
  const torsoDir = rot([0, -1], p.torso ?? 0) // up vector, leaned
  const shoulder = add(hip, scl(torsoDir, LEN.torso))
  const neck = add(shoulder, scl(torsoDir, LEN.neck))
  const head = add(neck, scl(torsoDir, LEN.head))

  const elbowL = add(shoulder, scl(down(p.armL?.[0] ?? 175), LEN.uarm))
  const handL = add(elbowL, scl(down(p.armL?.[1] ?? 175), LEN.farm))
  const elbowR = add(shoulder, scl(down(p.armR?.[0] ?? 185), LEN.uarm))
  const handR = add(elbowR, scl(down(p.armR?.[1] ?? 185), LEN.farm))

  const kneeL = add(hip, scl(down(p.legL?.[0] ?? 2), LEN.thigh))
  const footL = add(kneeL, scl(down(p.legL?.[1] ?? 2), LEN.shin))
  const kneeR = add(hip, scl(down(p.legR?.[0] ?? -2), LEN.thigh))
  const footR = add(kneeR, scl(down(p.legR?.[1] ?? -2), LEN.shin))

  return { hip, shoulder, neck, head, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR }
}

const L = (a, b, stroke, w = 6) =>
  `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`
const C = (c, r, fill, stroke, w = 6) =>
  `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`

function drawFigure(p, { stroke, ghost = false, load = false } = {}) {
  const s = skeleton(p)
  const w = ghost ? 5 : 6
  const dash = ghost ? ' stroke-dasharray="2 7"' : ''
  const lineG = (a, b) =>
    `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"${dash}/>`
  const parts = [
    lineG(s.hip, s.shoulder),
    lineG(s.shoulder, s.elbowL),
    lineG(s.elbowL, s.handL),
    lineG(s.shoulder, s.elbowR),
    lineG(s.elbowR, s.handR),
    lineG(s.hip, s.kneeL),
    lineG(s.kneeL, s.footL),
    lineG(s.hip, s.kneeR),
    lineG(s.kneeR, s.footR),
    `<circle cx="${s.head[0].toFixed(1)}" cy="${s.head[1].toFixed(1)}" r="${LEN.head}" fill="${ghost ? BG : BG}" stroke="${stroke}" stroke-width="${w}"${dash}/>`,
  ]
  if (load && !ghost) {
    // small "weight" plates at the hands
    parts.push(C(s.handL, 7, stroke, stroke, 0))
    parts.push(C(s.handR, 7, stroke, stroke, 0))
  }
  return parts.join('\n  ')
}

function arrow(from, to, color = ACCENT) {
  return `<g>
  <defs><marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${color}"/></marker></defs>
  <path d="M${from[0]},${from[1]} Q${(from[0] + to[0]) / 2 + 18},${(from[1] + to[1]) / 2} ${to[0]},${to[1]}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" marker-end="url(#ah)"/>
</g>`
}

function labelTag(x, y, text, anchor = 'start') {
  // pill-style cue label
  const w = Math.max(48, text.length * 6.6 + 18)
  const lx = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x
  return `<g>
  <rect x="${lx.toFixed(1)}" y="${(y - 13).toFixed(1)}" rx="9" ry="9" width="${w.toFixed(1)}" height="22" fill="#eef1f5" stroke="#dde2ea" stroke-width="1.5"/>
  <text x="${(lx + w / 2).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="12.5" fill="${LABEL}" text-anchor="middle">${esc(text)}</text>
</g>`
}

const esc = (t) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function bench(x1, y, x2, incline = 0) {
  // a simple bench line; incline tilts it
  const dy = (incline / 100) * (x2 - x1)
  return `<line x1="${x1}" y1="${y + dy}" x2="${x2}" y2="${y}" stroke="#c4ccd8" stroke-width="7" stroke-linecap="round"/>
  <line x1="${(x1 + x2) / 2}" y1="${y + dy / 2}" x2="${(x1 + x2) / 2}" y2="${y + dy / 2 + 26}" stroke="#c4ccd8" stroke-width="6" stroke-linecap="round"/>`
}

function ground(y = 268) {
  return `<line x1="40" y1="${y}" x2="360" y2="${y}" stroke="#d7dce4" stroke-width="4" stroke-linecap="round"/>`
}

function svg(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${esc(title)} form diagram">
  <rect width="400" height="300" fill="${BG}"/>
  <text x="200" y="30" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="17" font-weight="700" fill="${INK}" text-anchor="middle">${esc(title)}</text>
  ${body}
</svg>
`
}

// ---- a generic two-pose scene ---------------------------------------------
function scene({ title, start, end, motion, labels = [], extras = '', load = true }) {
  const sStart = skeleton(start)
  const sEnd = skeleton(end)
  const parts = [
    ground(),
    extras,
    drawFigure(start, { stroke: GHOST, ghost: true, load }),
    drawFigure(end, { stroke: ACCENT, load }),
  ]
  if (motion) {
    const fromJoint = sStart[motion.joint] ?? sStart.handR
    const toJoint = sEnd[motion.joint] ?? sEnd.handR
    parts.push(arrow(motion.from ?? fromJoint, motion.to ?? toJoint))
  }
  for (const lb of labels) parts.push(labelTag(lb.x, lb.y, lb.text, lb.anchor))
  return svg(title, parts.join('\n  '))
}

// ---- exercise definitions --------------------------------------------------
// hips placed lower on canvas; standing hip ~ y200. Poses are schematic.
const HIP = [200, 196]
const STAND = { hip: HIP }

const EXERCISES = {
  // ---------- Day 1: Push ----------
  'incline-dumbbell-press': () =>
    scene({
      title: 'Incline DB Press',
      extras: bench(150, 230, 270, 35),
      start: { hip: [205, 205], torso: 60, armL: [120, 95], armR: [120, 95], legL: [70, 95], legR: [70, 95] },
      end: { hip: [205, 205], torso: 60, armL: [120, 130], armR: [120, 130], legL: [70, 95], legR: [70, 95] },
      motion: { joint: 'handR' },
      labels: [{ x: 60, y: 120, text: 'Bench 30–45°' }, { x: 250, y: 95, text: 'Press up' }],
    }),
  'flat-dumbbell-press': () =>
    scene({
      title: 'Flat DB Press',
      extras: bench(140, 215, 280, 0),
      start: { hip: [200, 205], torso: 88, armL: [180, 180], armR: [180, 180], legL: [120, 60], legR: [120, 60] },
      end: { hip: [200, 205], torso: 88, armL: [180, 180], armR: [180, 180], legL: [120, 60], legR: [120, 60] },
      motion: { from: [200, 150], to: [200, 110] },
      labels: [{ x: 60, y: 130, text: 'Blades pinned' }, { x: 250, y: 100, text: 'Full press' }],
      load: false,
    }),
  'seated-overhead-dumbbell-press': () =>
    scene({
      title: 'Overhead DB Press',
      extras: bench(160, 250, 240, 0),
      start: { hip: [200, 200], torso: 2, armL: [150, 200], armR: [210, 160], legL: [55, 120], legR: [-55, 120] },
      end: { hip: [200, 200], torso: 2, armL: [178, 178], armR: [182, 182], legL: [55, 120], legR: [-55, 120] },
      motion: { from: [228, 150], to: [210, 96] },
      labels: [{ x: 40, y: 150, text: 'Ribs down' }, { x: 250, y: 92, text: 'Lock out' }],
    }),
  'cable-lateral-raise': () =>
    scene({
      title: 'Cable Lateral Raise',
      start: { hip: HIP, armR: [185, 185], armL: [178, 178] },
      end: { hip: HIP, armR: [250, 250], armL: [178, 178] },
      motion: { joint: 'handR' },
      labels: [{ x: 250, y: 150, text: 'Lead the elbow' }, { x: 40, y: 220, text: 'To shoulder' }],
    }),
  'triceps-rope-pushdown': () =>
    scene({
      title: 'Triceps Pushdown',
      start: { hip: HIP, armR: [185, 235], armL: [178, 128] },
      end: { hip: HIP, armR: [185, 178], armL: [178, 182] },
      motion: { from: [232, 150], to: [222, 196] },
      labels: [{ x: 250, y: 130, text: 'Elbows pinned' }, { x: 250, y: 215, text: 'Full lockout' }],
    }),
  'overhead-cable-triceps-extension': () =>
    scene({
      title: 'Overhead Extension',
      start: { hip: HIP, torso: 6, armL: [192, 235], armR: [188, 235] },
      end: { hip: HIP, torso: 6, armL: [188, 188], armR: [192, 192] },
      motion: { from: [200, 150], to: [205, 100] },
      labels: [{ x: 40, y: 120, text: 'Arms by ears' }, { x: 250, y: 96, text: 'Extend up' }],
    }),

  // ---------- Day 2: Lower ----------
  'goblet-squat': () =>
    scene({
      title: 'Goblet Squat',
      start: { hip: HIP, torso: 8, armL: [150, 120], armR: [210, 120], legL: [10, 10], legR: [-10, -10] },
      end: { hip: [200, 232], torso: 22, armL: [150, 120], armR: [210, 120], legL: [55, -25], legR: [-55, 25] },
      motion: { from: [255, 200], to: [255, 235] },
      labels: [{ x: 40, y: 150, text: 'Chest tall' }, { x: 255, y: 250, text: 'Hips below' }],
      load: false,
    }),
  'romanian-deadlift': () =>
    scene({
      title: 'Romanian Deadlift',
      start: { hip: [200, 190], torso: 4, armL: [180, 180], armR: [186, 186], legL: [4, 4], legR: [-4, -4] },
      end: { hip: [225, 195], torso: 72, armL: [200, 200], armR: [205, 205], legL: [18, 6], legR: [12, 0] },
      motion: { from: [150, 150], to: [255, 175] },
      labels: [{ x: 40, y: 130, text: 'Neutral spine' }, { x: 250, y: 235, text: 'Hips back' }],
    }),
  'walking-lunges': () =>
    scene({
      title: 'Walking Lunges',
      start: { hip: HIP, armL: [176, 176], armR: [184, 184], legL: [12, 12], legR: [-12, -12] },
      end: { hip: [200, 215], torso: 4, armL: [176, 176], armR: [184, 184], legL: [40, 5], legR: [-42, -8] },
      motion: { from: [200, 150], to: [200, 200] },
      labels: [{ x: 40, y: 150, text: 'Torso upright' }, { x: 250, y: 250, text: 'Knee down' }],
      load: false,
    }),
  'leg-extension': () =>
    scene({
      title: 'Leg Extension',
      extras: bench(150, 215, 250, 0),
      start: { hip: [180, 205], torso: 4, armL: [150, 150], armR: [210, 210], legL: [70, 160], legR: [70, 160] },
      end: { hip: [180, 205], torso: 4, armL: [150, 150], armR: [210, 210], legL: [88, 92], legR: [88, 92] },
      motion: { from: [220, 250], to: [285, 215] },
      labels: [{ x: 40, y: 150, text: 'Squeeze quads' }, { x: 250, y: 250, text: 'Extend' }],
      load: false,
    }),
  'seated-leg-curl': () =>
    scene({
      title: 'Seated Leg Curl',
      extras: bench(150, 215, 250, 0),
      start: { hip: [180, 205], torso: 4, armL: [150, 150], armR: [210, 210], legL: [88, 92], legR: [88, 92] },
      end: { hip: [180, 205], torso: 4, armL: [150, 150], armR: [210, 210], legL: [80, 150], legR: [80, 150] },
      motion: { from: [285, 210], to: [240, 250] },
      labels: [{ x: 40, y: 150, text: 'Hips seated' }, { x: 250, y: 255, text: 'Curl deep' }],
      load: false,
    }),
  'standing-calf-raise': () =>
    scene({
      title: 'Standing Calf Raise',
      start: { hip: [200, 196], armL: [176, 176], armR: [184, 184] },
      end: { hip: [200, 176], armL: [176, 176], armR: [184, 184] },
      motion: { from: [150, 200], to: [150, 178] },
      labels: [{ x: 250, y: 140, text: 'Rise high' }, { x: 250, y: 230, text: 'Stretch low' }],
      load: false,
    }),

  // ---------- Day 3: Pull ----------
  'lat-pulldown': () =>
    scene({
      title: 'Lat Pulldown',
      extras: bench(160, 250, 240, 0),
      start: { hip: [200, 200], torso: -8, armL: [165, 168], armR: [195, 192], legL: [55, 120], legR: [-55, 120] },
      end: { hip: [200, 200], torso: -8, armL: [225, 250], armR: [135, 110], legL: [55, 120], legR: [-55, 120] },
      motion: { from: [200, 100], to: [200, 150] },
      labels: [{ x: 40, y: 110, text: 'Elbows down' }, { x: 250, y: 170, text: 'Bar to chest' }],
      load: false,
    }),
  'seated-cable-row': () =>
    scene({
      title: 'Seated Cable Row',
      start: { hip: [185, 205], torso: 18, armL: [165, 165], armR: [170, 170], legL: [85, 92], legR: [85, 92] },
      end: { hip: [190, 205], torso: -4, armL: [195, 245], armR: [200, 250], legL: [85, 92], legR: [85, 92] },
      motion: { from: [120, 150], to: [200, 175] },
      labels: [{ x: 40, y: 130, text: 'Tall torso' }, { x: 255, y: 235, text: 'Elbows back' }],
      load: false,
    }),
  'one-arm-dumbbell-row': () =>
    scene({
      title: 'One-Arm DB Row',
      extras: bench(150, 235, 280, 0),
      start: { hip: [180, 205], torso: 78, armL: [185, 185], armR: [120, 120], legL: [10, 10], legR: [-6, 60] },
      end: { hip: [180, 205], torso: 78, armL: [185, 185], armR: [150, 215], legL: [10, 10], legR: [-6, 60] },
      motion: { from: [230, 250], to: [225, 205] },
      labels: [{ x: 40, y: 120, text: 'Flat back' }, { x: 255, y: 195, text: 'Row to hip' }],
    }),
  'face-pull': () =>
    scene({
      title: 'Face Pull',
      start: { hip: HIP, torso: -2, armL: [160, 160], armR: [200, 200] },
      end: { hip: HIP, torso: -2, armL: [235, 285], armR: [125, 75] },
      motion: { from: [120, 150], to: [185, 150] },
      labels: [{ x: 40, y: 110, text: 'Elbows high' }, { x: 250, y: 150, text: 'To eye level' }],
      load: false,
    }),
  'incline-dumbbell-curl': () =>
    scene({
      title: 'Incline DB Curl',
      extras: bench(150, 235, 270, 30),
      start: { hip: [205, 205], torso: 56, armL: [200, 200], armR: [196, 196], legL: [60, 90], legR: [60, 90] },
      end: { hip: [205, 205], torso: 56, armL: [200, 130], armR: [196, 126], legL: [60, 90], legR: [60, 90] },
      motion: { from: [240, 245], to: [230, 175] },
      labels: [{ x: 40, y: 130, text: 'Arms hang back' }, { x: 250, y: 250, text: 'Full stretch' }],
    }),
  'hammer-curl': () =>
    scene({
      title: 'Hammer Curl',
      start: { hip: HIP, armL: [176, 176], armR: [184, 184] },
      end: { hip: HIP, armL: [176, 110], armR: [184, 250] },
      motion: { from: [150, 240], to: [165, 175] },
      labels: [{ x: 250, y: 130, text: 'Palms face in' }, { x: 40, y: 235, text: 'Elbows pinned' }],
    }),

  // ---------- Day 4: Core + Lower accessory ----------
  'hip-thrust': () =>
    scene({
      title: 'Hip Thrust',
      extras: bench(120, 175, 200, 0),
      start: { hip: [240, 245], torso: -68, armL: [150, 150], armR: [160, 160], legL: [70, 130], legR: [70, 130] },
      end: { hip: [240, 205], torso: -90, armL: [150, 150], armR: [160, 160], legL: [60, 140], legR: [60, 140] },
      motion: { from: [255, 250], to: [255, 210] },
      labels: [{ x: 40, y: 150, text: 'Drive heels' }, { x: 250, y: 250, text: 'Squeeze glutes' }],
      load: false,
    }),
  'bulgarian-split-squat': () =>
    scene({
      title: 'Bulgarian Split Squat',
      extras: bench(250, 235, 350, 0),
      start: { hip: [185, 195], torso: 6, armL: [176, 176], armR: [184, 184], legL: [16, 16], legR: [55, 110] },
      end: { hip: [185, 222], torso: 12, armL: [176, 176], armR: [184, 184], legL: [44, 2], legR: [60, 120] },
      motion: { from: [165, 175], to: [165, 205] },
      labels: [{ x: 40, y: 150, text: 'Torso tall' }, { x: 250, y: 255, text: 'Drop straight' }],
      load: false,
    }),
  'cable-crunch': () =>
    scene({
      title: 'Cable Crunch',
      start: { hip: [200, 230], torso: -8, armL: [188, 200], armR: [196, 205], legL: [120, 95], legR: [-120, 95] },
      end: { hip: [200, 230], torso: 40, armL: [188, 200], armR: [196, 205], legL: [120, 95], legR: [-120, 95] },
      motion: { from: [200, 150], to: [225, 185] },
      labels: [{ x: 40, y: 130, text: 'Crunch the abs' }, { x: 255, y: 215, text: 'Round spine' }],
      load: false,
    }),
  'hanging-leg-raise': () =>
    scene({
      title: 'Hanging Leg Raise',
      extras: `<line x1="120" y1="60" x2="280" y2="60" stroke="#c4ccd8" stroke-width="7" stroke-linecap="round"/>`,
      start: { hip: [200, 150], torso: 180, armL: [2, 2], armR: [-2, -2], legL: [2, 2], legR: [-2, -2] },
      end: { hip: [200, 150], torso: 180, armL: [2, 2], armR: [-2, -2], legL: [70, 95], legR: [70, 95] },
      motion: { from: [200, 230], to: [255, 165] },
      labels: [{ x: 40, y: 230, text: 'No swinging' }, { x: 255, y: 150, text: 'Curl pelvis' }],
      load: false,
    }),
  plank: () =>
    scene({
      title: 'Plank',
      start: { hip: [205, 215], torso: 108, armL: [150, 200], armR: [155, 205], legL: [70, 70], legR: [66, 66] },
      end: { hip: [205, 215], torso: 108, armL: [150, 200], armR: [155, 205], legL: [70, 70], legR: [66, 66] },
      motion: null,
      labels: [{ x: 40, y: 150, text: 'Straight line' }, { x: 250, y: 250, text: 'Brace abs' }],
      load: false,
    }),
  'russian-twist': () =>
    scene({
      title: 'Russian Twist',
      start: { hip: [200, 230], torso: -34, armL: [150, 150], armR: [160, 160], legL: [125, 70], legR: [-125, 70] },
      end: { hip: [200, 230], torso: -34, armL: [220, 220], armR: [230, 230], legL: [125, 70], legR: [-125, 70] },
      motion: { from: [150, 170], to: [250, 185] },
      labels: [{ x: 40, y: 130, text: 'Chest tall' }, { x: 255, y: 250, text: 'Rotate torso' }],
    }),
  'side-plank': () =>
    scene({
      title: 'Side Plank',
      start: { hip: [210, 210], torso: 110, armL: [185, 240], armR: [185, 240], legL: [72, 72], legR: [72, 72] },
      end: { hip: [210, 210], torso: 110, armL: [185, 240], armR: [185, 240], legL: [72, 72], legR: [72, 72] },
      motion: { from: [210, 245], to: [210, 215] },
      labels: [{ x: 40, y: 150, text: 'Stack hips' }, { x: 250, y: 255, text: 'Lift hips' }],
      load: false,
    }),
}

// ---- placeholder -----------------------------------------------------------
function placeholder() {
  return svg(
    'Exercise',
    `${ground()}
  ${drawFigure({ hip: HIP, armL: [150, 150], armR: [210, 210] }, { stroke: ACCENT })}
  <text x="200" y="292" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" fill="${LABEL}" text-anchor="middle">form diagram</text>`
  )
}

// ---- write everything ------------------------------------------------------
mkdirSync(OUT, { recursive: true })
let count = 0
for (const [slug, fn] of Object.entries(EXERCISES)) {
  writeFileSync(resolve(OUT, `${slug}.svg`), fn())
  count++
}
writeFileSync(resolve(OUT, `_placeholder.svg`), placeholder())
console.log(`Generated ${count} exercise SVGs + placeholder into ${OUT}`)
