import { beforeEach, describe, expect, test } from "bun:test"

const src = await Bun.file(new URL("../public/theme-preload.js", import.meta.url)).text()

const run = () => Function(src)()

beforeEach(() => {
  document.head.innerHTML = ""
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.removeAttribute("data-color-scheme")
  localStorage.clear()
  Object.defineProperty(window, "matchMedia", {
    value: () =>
      ({
        matches: false,
      }) as MediaQueryList,
    configurable: true,
  })
})

describe("theme preload", () => {
  test("migrates legacy themes to castclaw before mount", () => {
    localStorage.setItem("castclaw-theme-id", "oc-1")
    localStorage.setItem("castclaw-theme-css-light", "--background-base:#fff;")
    localStorage.setItem("castclaw-theme-css-dark", "--background-base:#000;")

    run()

    expect(document.documentElement.dataset.theme).toBe("castclaw")
    expect(document.documentElement.dataset.colorScheme).toBe("light")
    expect(localStorage.getItem("castclaw-theme-id")).toBe("castclaw")
    expect(localStorage.getItem("castclaw-theme-css-light")).toBeNull()
    expect(localStorage.getItem("castclaw-theme-css-dark")).toBeNull()
    expect(document.getElementById("castclaw-theme-preload")).toBeNull()
  })

  test("keeps cached css for non-default themes", () => {
    localStorage.setItem("castclaw-theme-id", "nightowl")
    localStorage.setItem("castclaw-theme-css-light", "--background-base:#fff;")

    run()

    expect(document.documentElement.dataset.theme).toBe("nightowl")
    expect(document.getElementById("castclaw-theme-preload")?.textContent).toContain("--background-base:#fff;")
  })
})
