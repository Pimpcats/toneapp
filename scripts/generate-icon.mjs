// Generates public/apple-touch-icon.png (180×180) with no external deps.
// The icon is a rounded teal tile with a schematic barbell — drawn from
// axis-aligned rectangles and encoded as a PNG via Node's zlib.

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIZE = 180
const buf = new Uint8Array(SIZE * SIZE * 4)

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]
const DARK = hex('#0f1115')
const TEAL = hex('#22c1a4')
const INK = hex('#04130f')

function px(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  buf[i] = r
  buf[i + 1] = g
  buf[i + 2] = b
  buf[i + 3] = 255
}

function fillRoundRect(x0, y0, w, h, radius, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      // rounded-corner test
      const dx = Math.min(x - x0, x0 + w - 1 - x)
      const dy = Math.min(y - y0, y0 + h - 1 - y)
      if (dx < radius && dy < radius) {
        const cx = radius - dx
        const cy = radius - dy
        if (cx * cx + cy * cy > radius * radius) continue
      }
      px(x, y, color)
    }
  }
}

const fillRect = (x, y, w, h, c) => fillRoundRect(x, y, w, h, 0, c)

// background + tile
fillRoundRect(0, 0, SIZE, SIZE, 0, DARK)
fillRoundRect(14, 14, 152, 152, 32, TEAL)

// barbell
fillRect(52, 85, 76, 10, INK) // bar
fillRect(43, 68, 14, 44, INK) // inner plate L
fillRect(123, 68, 14, 44, INK) // inner plate R
fillRect(32, 78, 12, 24, INK) // outer plate L
fillRect(136, 78, 12, 24, INK) // outer plate R

// ---- PNG encode ----
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0, 0)
  return Buffer.concat([len, body, crc])
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA
// 10,11,12 = 0 (compression, filter, interlace)

// add filter byte (0) at the start of each row
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0
  Buffer.from(buf.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1)
}
const idat = deflateSync(raw, { level: 9 })

const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
])

const out = resolve(__dirname, '../public/apple-touch-icon.png')
writeFileSync(out, png)
console.log(`Wrote ${out} (${png.length} bytes)`)
