#!/usr/bin/env bun
// Build script: bundle forecast tools into a single minified JS file
// All @/ internal imports and npm packages are treated as external

import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pkgDir = path.resolve(__dirname, "..")

// Collect all @/ imports as externals by listing them explicitly
// This prevents inlining Effect service singletons which would break runtime
const internalModules = [
  "@/util/filesystem",
  "@/util/log",
  "@/util/process",
  "@/util/glob",
  "@/config/config",
  "@/config/markdown",
  "@/project/instance",
  "@/session/schema",
  "@/session/message-v2",
  "@/session/compaction",
  "@/session/todo",
  "@/effect/instance-state",
  "@/effect/run-service",
  "@/bus",
]

const result = await Bun.build({
  entrypoints: [path.join(pkgDir, "src/tool/forecast/index.ts")],
  outdir: path.join(pkgDir, "src/tool"),
  naming: "forecast.bundle.js",
  bundle: true,
  minify: true,
  target: "bun",
  format: "esm",
  tsconfig: path.join(pkgDir, "tsconfig.json"),
  external: [
    // npm packages
    "effect",
    "zod",
    "gray-matter",
    "@effect/*",
    "@castclaw/*",
    "bun",
    "bun:*",
    "node:*",
    // internal @/ modules
    ...internalModules,
  ],
})

if (!result.success) {
  console.error("Build failed:")
  for (const log of result.logs) {
    console.error(log.message)
  }
  process.exit(1)
}

const [output] = result.outputs
console.log(`Bundled forecast tools → ${output.path} (${(output.size / 1024).toFixed(1)} KB)`)
