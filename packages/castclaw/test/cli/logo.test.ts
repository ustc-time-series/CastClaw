import { expect, test } from "bun:test"
import stripAnsi from "strip-ansi"

import { logo } from "../../src/cli/logo"
import { UI } from "../../src/cli/ui"

test("renders the CLI wordmark with aligned CASTCLAW rows", () => {
  const muted = [...logo.left]
  const bright = [...logo.right]
  const expected = logo.left.map((line, index) => (line + "   " + logo.right[index]!).trimEnd())

  expect(muted).toHaveLength(3)
  expect(bright).toHaveLength(3)

  const rendered = stripAnsi(UI.logo()).split(/\r?\n/)

  expect(rendered).toEqual(expected)
})
