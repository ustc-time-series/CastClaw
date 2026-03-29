import { ComponentProps } from "solid-js"
import { MARK, WORDMARK } from "../assets/brand/logo"

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

function measure(rows: readonly string[], cellWidth: number, cellHeight: number) {
  return {
    width: Math.max(...rows.map((row) => row.length)) * cellWidth,
    height: rows.length * cellHeight - cellHeight / 2,
  }
}

const WORDMARK_CELL_WIDTH = 6
const WORDMARK_CELL_HEIGHT = 16
const WORDMARK_GAP = WORDMARK_CELL_WIDTH * 3

const WORDMARK_LEFT_ROWS = WORDMARK.left
const WORDMARK_RIGHT_ROWS = WORDMARK.right
const WORDMARK_LEFT_PATH = buildPath(WORDMARK_LEFT_ROWS, WORDMARK_CELL_WIDTH, WORDMARK_CELL_HEIGHT)
const WORDMARK_RIGHT_PATH = buildPath(WORDMARK_RIGHT_ROWS, WORDMARK_CELL_WIDTH, WORDMARK_CELL_HEIGHT)
const WORDMARK_LEFT_SIZE = measure(WORDMARK_LEFT_ROWS, WORDMARK_CELL_WIDTH, WORDMARK_CELL_HEIGHT)
const WORDMARK_RIGHT_SIZE = measure(WORDMARK_RIGHT_ROWS, WORDMARK_CELL_WIDTH, WORDMARK_CELL_HEIGHT)
const WORDMARK_VIEWBOX_WIDTH = WORDMARK_LEFT_SIZE.width + WORDMARK_GAP + WORDMARK_RIGHT_SIZE.width
const WORDMARK_VIEWBOX_HEIGHT = Math.max(WORDMARK_LEFT_SIZE.height, WORDMARK_RIGHT_SIZE.height)

const MARK_CELL_SIZE = 18
const MARK_ROWS = MARK
const MARK_PATH = buildPath(MARK_ROWS, MARK_CELL_SIZE, MARK_CELL_SIZE)
const MARK_VIEWBOX_SIZE = 96
const MARK_FRONT_X = 18
const MARK_FRONT_Y = 20
const MARK_SHADOW_X = 28
const MARK_SHADOW_Y = 30

const SPLASH_VIEWBOX_WIDTH = 80
const SPLASH_VIEWBOX_HEIGHT = 100
const SPLASH_FRONT_X = 12
const SPLASH_FRONT_Y = 24
const SPLASH_SHADOW_X = 18
const SPLASH_SHADOW_Y = 30

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox={`0 0 ${MARK_VIEWBOX_SIZE} ${MARK_VIEWBOX_SIZE}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="crispEdges"
    >
      <path
        data-slot="logo-mark-shadow"
        d={MARK_PATH}
        transform={`translate(${MARK_SHADOW_X} ${MARK_SHADOW_Y})`}
        fill="var(--icon-base)"
      />
      <path
        data-slot="logo-mark-glyph"
        d={MARK_PATH}
        transform={`translate(${MARK_FRONT_X} ${MARK_FRONT_Y})`}
        fill="var(--icon-strong-base)"
      />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox={`0 0 ${SPLASH_VIEWBOX_WIDTH} ${SPLASH_VIEWBOX_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="crispEdges"
    >
      <path d={MARK_PATH} transform={`translate(${SPLASH_SHADOW_X} ${SPLASH_SHADOW_Y})`} fill="var(--icon-base)" />
      <path
        d={MARK_PATH}
        transform={`translate(${SPLASH_FRONT_X} ${SPLASH_FRONT_Y})`}
        fill="var(--icon-strong-base)"
      />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${WORDMARK_VIEWBOX_WIDTH} ${WORDMARK_VIEWBOX_HEIGHT}`}
      fill="none"
      shape-rendering="crispEdges"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <path d={WORDMARK_LEFT_PATH} fill="var(--icon-base)" />
      <path
        d={WORDMARK_RIGHT_PATH}
        transform={`translate(${WORDMARK_LEFT_SIZE.width + WORDMARK_GAP} 0)`}
        fill="var(--icon-strong-base)"
      />
    </svg>
  )
}
