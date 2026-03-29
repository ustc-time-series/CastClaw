import { stat } from "fs/promises"
import path from "path"
import type { Context } from "hono"
import { Filesystem } from "@/util/filesystem"

const RESERVED_PREFIXES = [
  "/agent",
  "/auth",
  "/command",
  "/config",
  "/doc",
  "/event",
  "/experimental",
  "/file",
  "/find",
  "/formatter",
  "/global",
  "/instance",
  "/log",
  "/lsp",
  "/mcp",
  "/path",
  "/permission",
  "/project",
  "/provider",
  "/pty",
  "/question",
  "/session",
  "/skill",
  "/tui",
  "/vcs",
] as const

const DEFAULT_DIST = path.resolve(import.meta.dir, "../../../app/dist")

let cachedKey: string | undefined
let cachedDist: string | null | undefined

function decodePathname(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function distCandidates() {
  const env = process.env.CASTCLAW_APP_DIST
  const execDir = path.dirname(process.execPath)
  return Array.from(
    new Set(
      [
        env,
        DEFAULT_DIST,
        path.resolve(execDir, "../app"),
        path.resolve(execDir, "app"),
        path.resolve(execDir, "../share/castclaw/app"),
      ].filter((value): value is string => !!value),
    ),
  )
}

async function resolveDist() {
  const candidates = distCandidates()
  const key = candidates.join("\n")
  if (cachedKey === key && cachedDist !== undefined) {
    return cachedDist ?? undefined
  }

  cachedKey = key
  cachedDist = null

  for (const candidate of candidates) {
    const index = path.join(candidate, "index.html")
    if (await Filesystem.exists(index)) {
      cachedDist = candidate
      return candidate
    }
  }
}

async function serveFile(filepath: string) {
  const info = await stat(filepath).catch(() => undefined)
  if (!info?.isFile()) return
  return new Response(Bun.file(filepath), {
    headers: {
      "Content-Type": Filesystem.mimeType(filepath),
      "Cache-Control": filepath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    },
  })
}

function isReservedPath(pathname: string) {
  return RESERVED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
}

function acceptsHtml(c: Context) {
  const accept = c.req.header("accept") ?? ""
  return accept.includes("text/html")
}

export namespace WebApp {
  export async function available() {
    return !!(await resolveDist())
  }

  export async function handle(c: Context) {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") return

    const dist = await resolveDist()
    if (!dist) return

    const pathname = decodePathname(c.req.path)
    const relative = pathname.replace(/^\/+/, "")
    const candidate = path.resolve(dist, relative || "index.html")

    if (Filesystem.contains(dist, candidate)) {
      const exact = await serveFile(candidate)
      if (exact) return exact
    }

    if (isReservedPath(pathname)) return
    if (pathname !== "/" && path.extname(pathname) && !pathname.endsWith("/")) return
    if (pathname !== "/" && !acceptsHtml(c)) return

    return serveFile(path.join(dist, "index.html"))
  }
}
