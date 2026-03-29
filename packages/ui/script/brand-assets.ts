#!/usr/bin/env bun

import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { deflateSync } from "node:zlib"

const MARK = ["█▀▀", "█  ", "▀▀▀"] as const

const BACKGROUND = [0x13, 0x10, 0x10, 0xff] as const
const SHADOW = [0x5a, 0x58, 0x58, 0xff] as const
const FOREGROUND = [0xff, 0xff, 0xff, 0xff] as const

const PNG_TARGETS = [
  ["favicon-96x96.png", 96],
  ["favicon-96x96-v3.png", 96],
  ["apple-touch-icon.png", 180],
  ["apple-touch-icon-v3.png", 180],
  ["web-app-manifest-192x192.png", 192],
  ["web-app-manifest-512x512.png", 512],
] as const

const SVG_TARGETS = ["favicon.svg", "favicon-v3.svg"] as const
const ICO_TARGETS = ["favicon.ico", "favicon-v3.ico"] as const

const OUTPUT_DIRS = [
  resolve(import.meta.dir, "../src/assets/favicon"),
  resolve(import.meta.dir, "../../app/public"),
  resolve(import.meta.dir, "../../web/public"),
  resolve(import.meta.dir, "../../app/dist"),
  resolve(import.meta.dir, "../../web/dist"),
] as const

function buildPath(rows: readonly string[], cellWidth: number, cellHeight: number) {
  const halfHeight = cellHeight / 2
  let path = ""

  rows.forEach((row, rowIndex) => {
    let column = 0
    for (const char of row) {
      const x = column * cellWidth
      const y = rowIndex * cellHeight

      if (char === "█") {
        path += `M${x} ${y}H${x + cellWidth}V${y + cellHeight}H${x}Z`
      } else if (char === "▀") {
        path += `M${x} ${y}H${x + cellWidth}V${y + halfHeight}H${x}Z`
      } else if (char === "▄") {
        path += `M${x} ${y + halfHeight}H${x + cellWidth}V${y + cellHeight}H${x}Z`
      }

      column += 1
    }
  })

  return path
}

function createGeometry(size: number) {
  let cell = Math.max(8, Math.floor(size * 0.176))
  if (cell % 2 !== 0) cell -= 1

  const half = cell / 2
  const glyphWidth = MARK[0].length * cell
  const glyphHeight = MARK.length * cell - half
  const offset = Math.max(4, Math.floor(cell * 0.5))
  const totalWidth = glyphWidth + offset
  const totalHeight = glyphHeight + offset

  const frontX = Math.floor((size - totalWidth) / 2)
  const frontY = Math.floor((size - totalHeight) / 2)

  return {
    cell,
    half,
    frontX,
    frontY,
    shadowX: frontX + offset,
    shadowY: frontY + offset,
  }
}

function fillRect(
  pixels: Uint8Array,
  size: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: readonly [number, number, number, number],
) {
  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(size, x + width)
  const y1 = Math.min(size, y + height)

  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      const index = (yy * size + xx) * 4
      pixels[index] = color[0]
      pixels[index + 1] = color[1]
      pixels[index + 2] = color[2]
      pixels[index + 3] = color[3]
    }
  }
}

function paintGlyph(
  pixels: Uint8Array,
  size: number,
  originX: number,
  originY: number,
  cell: number,
  color: readonly [number, number, number, number],
) {
  const half = cell / 2

  MARK.forEach((row, rowIndex) => {
    for (const [column, char] of Array.from(row).entries()) {
      const x = originX + column * cell
      const y = originY + rowIndex * cell

      if (char === "█") {
        fillRect(pixels, size, x, y, cell, cell, color)
      } else if (char === "▀") {
        fillRect(pixels, size, x, y, cell, half, color)
      } else if (char === "▄") {
        fillRect(pixels, size, x, y + half, cell, half, color)
      }
    }
  })
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array) {
  const typeBuffer = Buffer.from(type, "ascii")
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)

  const crcInput = Buffer.concat([typeBuffer, Buffer.from(data)])
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(crcInput), 0)

  return Buffer.concat([lengthBuffer, typeBuffer, Buffer.from(data), crcBuffer])
}

function createPng(size: number) {
  const geometry = createGeometry(size)
  const pixels = new Uint8Array(size * size * 4)

  fillRect(pixels, size, 0, 0, size, size, BACKGROUND)
  paintGlyph(pixels, size, geometry.shadowX, geometry.shadowY, geometry.cell, SHADOW)
  paintGlyph(pixels, size, geometry.frontX, geometry.frontY, geometry.cell, FOREGROUND)

  const scanlines = Buffer.alloc((size * 4 + 1) * size)
  for (let row = 0; row < size; row += 1) {
    const scanlineOffset = row * (size * 4 + 1)
    const pixelOffset = row * size * 4
    scanlines[scanlineOffset] = 0
    scanlines.set(pixels.subarray(pixelOffset, pixelOffset + size * 4), scanlineOffset + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", new Uint8Array()),
  ])
}

function createIco(size: number, png: Buffer) {
  const iconDir = Buffer.alloc(6)
  iconDir.writeUInt16LE(0, 0)
  iconDir.writeUInt16LE(1, 2)
  iconDir.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = size >= 256 ? 0 : size
  entry[1] = size >= 256 ? 0 : size
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(iconDir.length + entry.length, 12)

  return Buffer.concat([iconDir, entry, png])
}

function createSvg(size: number) {
  const geometry = createGeometry(size)
  const path = buildPath(MARK, geometry.cell, geometry.cell)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none" shape-rendering="crispEdges">`,
    `<rect width="${size}" height="${size}" fill="#131010" />`,
    `<path d="${path}" transform="translate(${geometry.shadowX} ${geometry.shadowY})" fill="#5A5858" />`,
    `<path d="${path}" transform="translate(${geometry.frontX} ${geometry.frontY})" fill="#FFFFFF" />`,
    `</svg>`,
  ].join("")
}

function createManifest() {
  return JSON.stringify(
    {
      name: "CastClaw",
      short_name: "CastClaw",
      icons: [
        {
          src: "/web-app-manifest-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/web-app-manifest-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
    },
    null,
    2,
  )
}

async function writeAsset(path: string, data: string | Uint8Array) {
  mkdirSync(dirname(path), { recursive: true })
  await Bun.write(path, data)
}

const pngBuffers = new Map<number, Buffer>()
for (const [, size] of PNG_TARGETS) {
  if (!pngBuffers.has(size)) pngBuffers.set(size, createPng(size))
}

const svg = createSvg(512)
const ico = createIco(96, pngBuffers.get(96)!)
const manifest = createManifest()

for (const directory of OUTPUT_DIRS) {
  for (const [filename, size] of PNG_TARGETS) {
    await writeAsset(resolve(directory, filename), pngBuffers.get(size)!)
  }

  for (const filename of SVG_TARGETS) {
    await writeAsset(resolve(directory, filename), svg)
  }

  for (const filename of ICO_TARGETS) {
    await writeAsset(resolve(directory, filename), ico)
  }

  await writeAsset(resolve(directory, "site.webmanifest"), manifest)
}

console.log("Generated brand assets in:")
for (const directory of OUTPUT_DIRS) {
  console.log(`- ${directory}`)
}
