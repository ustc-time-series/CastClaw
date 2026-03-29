import fs from "node:fs/promises"
import net from "node:net"
import os from "node:os"
import path from "node:path"

async function freePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to acquire a free port")))
        return
      }
      server.close((err) => {
        if (err) {
          reject(err)
          return
        }
        resolve(address.port)
      })
    })
  })
}

async function waitForHealth(url: string) {
  const timeout = Date.now() + 120_000
  const errors: string[] = []
  while (Date.now() < timeout) {
    const result = await fetch(url)
      .then((r) => ({ ok: r.ok, error: undefined }))
      .catch((error) => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    if (result.ok) return
    if (result.error) errors.push(result.error)
    await new Promise((r) => setTimeout(r, 250))
  }
  const last = errors.length ? ` (last error: ${errors[errors.length - 1]})` : ""
  throw new Error(`Timed out waiting for server health: ${url}${last}`)
}

const appDir = process.cwd()
const repoDir = path.resolve(appDir, "../..")
const castclawDir = path.join(repoDir, "packages", "castclaw")

const extraArgs = (() => {
  const args = process.argv.slice(2)
  if (args[0] === "--") return args.slice(1)
  return args
})()

const [serverPort, webPort] = await Promise.all([freePort(), freePort()])

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "castclaw-e2e-"))
const keepSandbox = process.env.CASTCLAW_E2E_KEEP_SANDBOX === "1"

const serverEnv = {
  ...process.env,
  CASTCLAW_DISABLE_SHARE: process.env.CASTCLAW_DISABLE_SHARE ?? "true",
  CASTCLAW_DISABLE_LSP_DOWNLOAD: "true",
  CASTCLAW_DISABLE_DEFAULT_PLUGINS: "true",
  CASTCLAW_EXPERIMENTAL_DISABLE_FILEWATCHER: "true",
  CASTCLAW_TEST_HOME: path.join(sandbox, "home"),
  XDG_DATA_HOME: path.join(sandbox, "share"),
  XDG_CACHE_HOME: path.join(sandbox, "cache"),
  XDG_CONFIG_HOME: path.join(sandbox, "config"),
  XDG_STATE_HOME: path.join(sandbox, "state"),
  CASTCLAW_E2E_PROJECT_DIR: repoDir,
  CASTCLAW_E2E_SESSION_TITLE: "E2E Session",
  CASTCLAW_E2E_MESSAGE: "Seeded for UI e2e",
  CASTCLAW_E2E_MODEL: "castclaw/gpt-5-nano",
  CASTCLAW_CLIENT: "app",
  CASTCLAW_STRICT_CONFIG_DEPS: "true",
} satisfies Record<string, string>

const runnerEnv = {
  ...serverEnv,
  PLAYWRIGHT_SERVER_HOST: "127.0.0.1",
  PLAYWRIGHT_SERVER_PORT: String(serverPort),
  VITE_CASTCLAW_SERVER_HOST: "127.0.0.1",
  VITE_CASTCLAW_SERVER_PORT: String(serverPort),
  PLAYWRIGHT_PORT: String(webPort),
} satisfies Record<string, string>

let seed: ReturnType<typeof Bun.spawn> | undefined
let runner: ReturnType<typeof Bun.spawn> | undefined
let server: { stop: () => Promise<void> | void } | undefined
let inst: { Instance: { disposeAll: () => Promise<void> | void } } | undefined
let cleaned = false

const cleanup = async () => {
  if (cleaned) return
  cleaned = true

  if (seed && seed.exitCode === null) seed.kill("SIGTERM")
  if (runner && runner.exitCode === null) runner.kill("SIGTERM")

  const jobs = [
    inst?.Instance.disposeAll(),
    server?.stop(),
    keepSandbox ? undefined : fs.rm(sandbox, { recursive: true, force: true }),
  ].filter(Boolean)
  await Promise.allSettled(jobs)
}

const shutdown = (code: number, reason: string) => {
  process.exitCode = code
  void cleanup().finally(() => {
    console.error(`e2e-local shutdown: ${reason}`)
    process.exit(code)
  })
}

const reportInternalError = (reason: string, error: unknown) => {
  console.warn(`e2e-local ignored server error: ${reason}`)
  console.warn(error)
}

process.once("SIGINT", () => shutdown(130, "SIGINT"))
process.once("SIGTERM", () => shutdown(143, "SIGTERM"))
process.once("SIGHUP", () => shutdown(129, "SIGHUP"))
process.once("uncaughtException", (error) => {
  reportInternalError("uncaughtException", error)
})
process.once("unhandledRejection", (error) => {
  reportInternalError("unhandledRejection", error)
})

let code = 1

try {
  seed = Bun.spawn(["bun", "script/seed-e2e.ts"], {
    cwd: castclawDir,
    env: serverEnv,
    stdout: "inherit",
    stderr: "inherit",
  })

  const seedExit = await seed.exited
  if (seedExit !== 0) {
    code = seedExit
  } else {
    Object.assign(process.env, serverEnv)
    process.env.AGENT = "1"
    process.env.CASTCLAW = "1"
    process.env.CASTCLAW_PID = String(process.pid)

    const log = await import("../../castclaw/src/util/log")
    const install = await import("../../castclaw/src/installation")
    await log.Log.init({
      print: true,
      dev: install.Installation.isLocal(),
      level: "WARN",
    })

    const servermod = await import("../../castclaw/src/server/server")
    inst = await import("../../castclaw/src/project/instance")
    server = servermod.Server.listen({ port: serverPort, hostname: "127.0.0.1" })
    console.log(`castclaw server listening on http://127.0.0.1:${serverPort}`)

    await waitForHealth(`http://127.0.0.1:${serverPort}/global/health`)
    runner = Bun.spawn(["bun", "test:e2e", ...extraArgs], {
      cwd: appDir,
      env: runnerEnv,
      stdout: "inherit",
      stderr: "inherit",
    })
    code = await runner.exited
  }
} catch (error) {
  console.error(error)
  code = 1
} finally {
  await cleanup()
}

process.exit(code)
