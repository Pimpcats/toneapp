// Fetches real, open-licensed exercise photos from free-exercise-db
// (https://github.com/yuhonas/free-exercise-db, released under The Unlicense /
// public domain) and vendors the best match for each program exercise into
// public/exercises/{slug}.jpg.
//
// Requires network access, so this is meant to run in CI (see
// .github/workflows/fetch-images.yml), not in the offline sandbox. Run with:
//   node scripts/fetch-images.mjs
//
// It is non-destructive to the SVGs: <ExerciseImage> tries {slug}.jpg first and
// falls back to the schematic {slug}.svg, then the placeholder.

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/exercises')

const INDEX_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMG_BASES = [
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/',
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/',
]

// Per-slug matching rules. `must` terms are all required in the candidate's
// name; `prefer` add score; `avoid` subtract. Names are lowercased first.
const MAP = {
  'incline-dumbbell-press': { must: ['incline', 'dumbbell', 'press'], avoid: ['decline', 'smith'] },
  'flat-dumbbell-press': { must: ['dumbbell', 'bench', 'press'], avoid: ['incline', 'decline'] },
  'seated-overhead-dumbbell-press': {
    must: ['dumbbell'],
    prefer: ['seated', 'shoulder', 'press', 'overhead', 'military'],
    avoid: ['incline', 'bench', 'one', 'arm', 'lateral', 'curl'],
  },
  'cable-lateral-raise': { must: ['lateral', 'raise'], prefer: ['cable', 'side'], avoid: ['front', 'bent', 'rear'] },
  'triceps-rope-pushdown': { must: ['pushdown'], prefer: ['triceps', 'rope', 'tricep'], avoid: [] },
  'overhead-cable-triceps-extension': {
    must: ['extension'],
    prefer: ['triceps', 'cable', 'overhead', 'tricep'],
    avoid: ['lying', 'leg', 'dumbbell', 'back'],
  },
  'goblet-squat': { must: ['goblet', 'squat'], avoid: [] },
  'romanian-deadlift': { must: ['romanian'], prefer: ['deadlift'], avoid: [] },
  'walking-lunges': { must: ['lunge'], prefer: ['walking', 'dumbbell', 'barbell'], avoid: ['side', 'clock', 'stationary'] },
  'leg-extension': { must: ['leg', 'extension'], avoid: ['hip', 'seated calf'] },
  'seated-leg-curl': { must: ['leg', 'curl'], prefer: ['seated', 'lying'], avoid: ['standing', 'cable'] },
  'standing-calf-raise': { must: ['calf', 'raise'], prefer: ['standing'], avoid: ['seated', 'donkey'] },
  'lat-pulldown': { must: ['pulldown'], prefer: ['lat', 'wide', 'grip'], avoid: ['behind', 'underhand', 'v-bar'] },
  'seated-cable-row': { must: ['seated', 'cable', 'row'], avoid: [] },
  'one-arm-dumbbell-row': { must: ['dumbbell', 'row'], prefer: ['one', 'arm'], avoid: ['incline', 'two', 'bent'] },
  'face-pull': { must: ['face', 'pull'], avoid: [] },
  'incline-dumbbell-curl': { must: ['incline', 'dumbbell', 'curl'], avoid: ['hammer'] },
  'hammer-curl': { must: ['hammer', 'curl'], avoid: [] },
  'hip-thrust': { must: ['hip'], prefer: ['thrust', 'barbell'], avoid: ['extension', 'flexor', 'adduction'] },
  'bulgarian-split-squat': { must: ['split', 'squat'], prefer: ['bulgarian', 'dumbbell', 'rear'], avoid: [] },
  'cable-crunch': { must: ['cable', 'crunch'], avoid: [] },
  'hanging-leg-raise': { must: ['hanging'], prefer: ['leg', 'knee', 'raise'], avoid: [] },
  plank: { must: ['plank'], prefer: ['front'], avoid: ['side'] },
  'russian-twist': { must: ['russian', 'twist'], avoid: [] },
  'side-plank': { must: ['side'], prefer: ['bridge', 'plank'], avoid: ['lateral raise', 'lunge', 'crunch'] },
}

function scoreCandidate(name, rule) {
  const n = name.toLowerCase()
  const has = (t) => n.includes(t)
  if (!(rule.must ?? []).every(has)) return -Infinity
  let s = (rule.must ?? []).length * 10
  for (const t of rule.prefer ?? []) if (has(t)) s += 3
  for (const t of rule.avoid ?? []) if (has(t)) s -= 6
  // shorter names that match are usually the canonical movement
  s -= Math.min(n.length, 60) * 0.02
  return s
}

async function fetchBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  console.log('Fetching free-exercise-db index…')
  const res = await fetch(INDEX_URL)
  if (!res.ok) throw new Error(`Index fetch failed: ${res.status} ${res.statusText}`)
  const db = await res.json()
  console.log(`Loaded ${db.length} exercises from free-exercise-db.`)

  const report = []
  let ok = 0

  for (const [slug, rule] of Object.entries(MAP)) {
    let best = null
    let bestScore = -Infinity
    for (const ex of db) {
      const sc = scoreCandidate(ex.name, rule)
      if (sc > bestScore) {
        bestScore = sc
        best = ex
      }
    }
    if (!best || bestScore === -Infinity || !best.images?.length) {
      report.push(`  ✗ ${slug.padEnd(34)} → NO MATCH (keeps SVG)`)
      continue
    }

    // download the first image (start position); some entries have a 2nd.
    let buf = null
    for (const base of IMG_BASES) {
      buf = await fetchBuffer(base + best.images[0])
      if (buf) break
    }
    if (!buf) {
      report.push(`  ✗ ${slug.padEnd(34)} → "${best.name}" image 404 (keeps SVG)`)
      continue
    }
    writeFileSync(resolve(OUT, `${slug}.jpg`), buf)
    ok++
    report.push(`  ✓ ${slug.padEnd(34)} → "${best.name}"`)
  }

  console.log('\nMatch report:')
  console.log(report.join('\n'))
  console.log(`\nDownloaded ${ok}/${Object.keys(MAP).length} photos into ${OUT}`)
  if (ok === 0) throw new Error('No images downloaded — aborting so we do not commit an empty change.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
