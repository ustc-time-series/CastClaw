import { Config } from "effect"

function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

export namespace Flag {
  export const CASTCLAW_AUTO_SHARE = truthy("CASTCLAW_AUTO_SHARE")
  export const CASTCLAW_GIT_BASH_PATH = process.env["CASTCLAW_GIT_BASH_PATH"]
  export const CASTCLAW_CONFIG = process.env["CASTCLAW_CONFIG"]
  export declare const CASTCLAW_TUI_CONFIG: string | undefined
  export declare const CASTCLAW_CONFIG_DIR: string | undefined
  export const CASTCLAW_CONFIG_CONTENT = process.env["CASTCLAW_CONFIG_CONTENT"]
  export const CASTCLAW_DISABLE_AUTOUPDATE = truthy("CASTCLAW_DISABLE_AUTOUPDATE")
  export const CASTCLAW_ALWAYS_NOTIFY_UPDATE = truthy("CASTCLAW_ALWAYS_NOTIFY_UPDATE")
  export const CASTCLAW_DISABLE_PRUNE = truthy("CASTCLAW_DISABLE_PRUNE")
  export const CASTCLAW_DISABLE_TERMINAL_TITLE = truthy("CASTCLAW_DISABLE_TERMINAL_TITLE")
  export const CASTCLAW_PERMISSION = process.env["CASTCLAW_PERMISSION"]
  export const CASTCLAW_DISABLE_DEFAULT_PLUGINS = truthy("CASTCLAW_DISABLE_DEFAULT_PLUGINS")
  export const CASTCLAW_DISABLE_LSP_DOWNLOAD = truthy("CASTCLAW_DISABLE_LSP_DOWNLOAD")
  export const CASTCLAW_ENABLE_EXPERIMENTAL_MODELS = truthy("CASTCLAW_ENABLE_EXPERIMENTAL_MODELS")
  export const CASTCLAW_DISABLE_AUTOCOMPACT = truthy("CASTCLAW_DISABLE_AUTOCOMPACT")
  export const CASTCLAW_DISABLE_MODELS_FETCH = truthy("CASTCLAW_DISABLE_MODELS_FETCH")
  export const CASTCLAW_DISABLE_CLAUDE_CODE = truthy("CASTCLAW_DISABLE_CLAUDE_CODE")
  export const CASTCLAW_DISABLE_CLAUDE_CODE_PROMPT =
    CASTCLAW_DISABLE_CLAUDE_CODE || truthy("CASTCLAW_DISABLE_CLAUDE_CODE_PROMPT")
  export const CASTCLAW_DISABLE_CLAUDE_CODE_SKILLS =
    CASTCLAW_DISABLE_CLAUDE_CODE || truthy("CASTCLAW_DISABLE_CLAUDE_CODE_SKILLS")
  export const CASTCLAW_DISABLE_EXTERNAL_SKILLS =
    CASTCLAW_DISABLE_CLAUDE_CODE_SKILLS || truthy("CASTCLAW_DISABLE_EXTERNAL_SKILLS")
  export declare const CASTCLAW_DISABLE_PROJECT_CONFIG: boolean
  export const CASTCLAW_FAKE_VCS = process.env["CASTCLAW_FAKE_VCS"]
  export declare const CASTCLAW_CLIENT: string
  export const CASTCLAW_SERVER_PASSWORD = process.env["CASTCLAW_SERVER_PASSWORD"]
  export const CASTCLAW_SERVER_USERNAME = process.env["CASTCLAW_SERVER_USERNAME"]
  export const CASTCLAW_ENABLE_QUESTION_TOOL = truthy("CASTCLAW_ENABLE_QUESTION_TOOL")

  // Experimental
  export const CASTCLAW_EXPERIMENTAL = truthy("CASTCLAW_EXPERIMENTAL")
  export const CASTCLAW_EXPERIMENTAL_FILEWATCHER = Config.boolean("CASTCLAW_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  )
  export const CASTCLAW_EXPERIMENTAL_DISABLE_FILEWATCHER = Config.boolean(
    "CASTCLAW_EXPERIMENTAL_DISABLE_FILEWATCHER",
  ).pipe(Config.withDefault(false))
  export const CASTCLAW_EXPERIMENTAL_ICON_DISCOVERY =
    CASTCLAW_EXPERIMENTAL || truthy("CASTCLAW_EXPERIMENTAL_ICON_DISCOVERY")

  const copy = process.env["CASTCLAW_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
  export const CASTCLAW_EXPERIMENTAL_DISABLE_COPY_ON_SELECT =
    copy === undefined ? process.platform === "win32" : truthy("CASTCLAW_EXPERIMENTAL_DISABLE_COPY_ON_SELECT")
  export const CASTCLAW_ENABLE_EXA =
    truthy("CASTCLAW_ENABLE_EXA") || CASTCLAW_EXPERIMENTAL || truthy("CASTCLAW_EXPERIMENTAL_EXA")
  export const CASTCLAW_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = number("CASTCLAW_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS")
  export const CASTCLAW_EXPERIMENTAL_OUTPUT_TOKEN_MAX = number("CASTCLAW_EXPERIMENTAL_OUTPUT_TOKEN_MAX")
  export const CASTCLAW_EXPERIMENTAL_OXFMT = CASTCLAW_EXPERIMENTAL || truthy("CASTCLAW_EXPERIMENTAL_OXFMT")
  export const CASTCLAW_EXPERIMENTAL_LSP_TY = truthy("CASTCLAW_EXPERIMENTAL_LSP_TY")
  export const CASTCLAW_EXPERIMENTAL_LSP_TOOL = CASTCLAW_EXPERIMENTAL || truthy("CASTCLAW_EXPERIMENTAL_LSP_TOOL")
  export const CASTCLAW_DISABLE_FILETIME_CHECK = Config.boolean("CASTCLAW_DISABLE_FILETIME_CHECK").pipe(
    Config.withDefault(false),
  )
  export const CASTCLAW_EXPERIMENTAL_PLAN_MODE = CASTCLAW_EXPERIMENTAL || truthy("CASTCLAW_EXPERIMENTAL_PLAN_MODE")
  export const CASTCLAW_EXPERIMENTAL_WORKSPACES = CASTCLAW_EXPERIMENTAL || truthy("CASTCLAW_EXPERIMENTAL_WORKSPACES")
  export const CASTCLAW_EXPERIMENTAL_MARKDOWN = !falsy("CASTCLAW_EXPERIMENTAL_MARKDOWN")
  export const CASTCLAW_MODELS_URL = process.env["CASTCLAW_MODELS_URL"]
  export const CASTCLAW_MODELS_PATH = process.env["CASTCLAW_MODELS_PATH"]
  export const CASTCLAW_DB = process.env["CASTCLAW_DB"]
  export const CASTCLAW_DISABLE_CHANNEL_DB = truthy("CASTCLAW_DISABLE_CHANNEL_DB")
  export const CASTCLAW_SKIP_MIGRATIONS = truthy("CASTCLAW_SKIP_MIGRATIONS")
  export const CASTCLAW_STRICT_CONFIG_DEPS = truthy("CASTCLAW_STRICT_CONFIG_DEPS")

  function number(key: string) {
    const value = process.env[key]
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  }
}

// Dynamic getter for CASTCLAW_DISABLE_PROJECT_CONFIG
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "CASTCLAW_DISABLE_PROJECT_CONFIG", {
  get() {
    return truthy("CASTCLAW_DISABLE_PROJECT_CONFIG")
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for CASTCLAW_TUI_CONFIG
// This must be evaluated at access time, not module load time,
// because tests and external tooling may set this env var at runtime
Object.defineProperty(Flag, "CASTCLAW_TUI_CONFIG", {
  get() {
    return process.env["CASTCLAW_TUI_CONFIG"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for CASTCLAW_CONFIG_DIR
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "CASTCLAW_CONFIG_DIR", {
  get() {
    return process.env["CASTCLAW_CONFIG_DIR"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for CASTCLAW_CLIENT
// This must be evaluated at access time, not module load time,
// because some commands override the client at runtime
Object.defineProperty(Flag, "CASTCLAW_CLIENT", {
  get() {
    return process.env["CASTCLAW_CLIENT"] ?? "cli"
  },
  enumerable: true,
  configurable: false,
})
