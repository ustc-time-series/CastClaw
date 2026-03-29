import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { Server } from "../../src/server/server"

let originalDist = process.env.CASTCLAW_APP_DIST
let tempDir: string

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "castclaw-web-app-"))
  await fs.mkdir(path.join(tempDir, "assets"), { recursive: true })
  await fs.writeFile(path.join(tempDir, "index.html"), "<!doctype html><html><body>castclaw-web-app</body></html>")
  await fs.writeFile(path.join(tempDir, "assets", "app.js"), "console.log('castclaw-web-app')")
  process.env.CASTCLAW_APP_DIST = tempDir
})

afterEach(async () => {
  if (originalDist === undefined) delete process.env.CASTCLAW_APP_DIST
  else process.env.CASTCLAW_APP_DIST = originalDist
  await fs.rm(tempDir, { recursive: true, force: true })
})

describe("browser app serving", () => {
  test("serves index.html at root", async () => {
    const app = Server.createApp({})
    const response = await app.request("/", {
      headers: {
        accept: "text/html",
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
    expect(await response.text()).toContain("castclaw-web-app")
  })

  test("serves static app assets", async () => {
    const app = Server.createApp({})
    const response = await app.request("/assets/app.js")

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/javascript")
    expect(await response.text()).toContain("castclaw-web-app")
  })

  test("falls back to index.html for client-side routes", async () => {
    const app = Server.createApp({})
    const response = await app.request("/workspace/demo", {
      headers: {
        accept: "text/html",
      },
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toContain("castclaw-web-app")
  })

  test("keeps reserved API prefixes on JSON 404", async () => {
    const app = Server.createApp({})
    const response = await app.request("/provider/missing", {
      headers: {
        accept: "text/html",
      },
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Not Found" })
  })
})
