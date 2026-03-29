<!-- GSD:project-start source:PROJECT.md -->
## Project

**Castclaw Time-Series Forecasting CLI**

Castclaw is a CLI-based AI agent framework for automated time-series forecasting research. Built on top of an existing multi-provider LLM agent platform (TypeScript/Bun/Effect-TS), it specializes the general-purpose agent into three domain-specific roles — Planner, Forecaster, and Critic — that collaborate with human domain experts to produce high-quality forecasting reports. The system orchestrates Python-based time-series models (40+ from Time-Series-Library) through a single unified tool interface, manages experiment state via file protocols inspired by GSD, and iteratively optimizes predictions through an AutoResearch-style experiment loop with strict evaluation protocols.

**Core Value:** The system must deliver a fully functional, end-to-end forecasting pipeline where the LLM acts as a research scheduler — proposing experiments, interpreting results, and iterating — while humans provide domain expertise and final judgment, with all experiment evaluation strictly handled by deterministic code (never by LLM).

### Constraints

- **Runtime**: TypeScript/Bun for CLI; Python/uv for ML experiments — no mixing runtimes in a single process
- **Environment**: uv for Python package management, per-project virtual environments
- **REF Independence**: All REF/ code is reference only; final system must work with REF/ deleted
- **No Fallbacks**: No deterministic/fallback paths; the framework must genuinely execute the full pipeline
- **Agent Roles**: Exactly 3 agents (Planner, Forecaster, Critic) mapped to Tab-switching, replacing current planner/docs agents
- **Tool Reuse**: Must reuse existing Castclaw tools (websearch, subagent, TODO list, context management, bash)
- **Evaluation Integrity**: LLM proposes experiments but never defines metrics or modifies evaluation protocol
- **Data Safety**: Strict validation-set isolation during forecasting; test set only used in post-forecast phase
- **Phases**: GSD roadmap limited to 5 phases maximum
- **Reports**: Markdown format for all reports and visualizations
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.8.2 - All application code across every package
- Nix - Development shell and packaging (`flake.nix`, `nix/castclaw.nix`, `nix/node_modules.nix`)
- JavaScript (CommonJS) - CLI binary launcher (`packages/castclaw/bin/castclaw`)
- Python 3.10+ - Required for time series forecasting (REF ecosystem); not yet integrated into mainline
## Runtime
- Bun 1.3.11 - Main runtime for CLI, dev server, test runner, and build tooling
- Package manager field: `"packageManager": "bun@1.3.11"` in root `package.json`
- Lockfile: `bun.lock` present at root
- Node.js 20 - Available in Nix dev shell; used via conditional imports (`#db` import map resolves `db.bun.ts` vs `db.node.ts`)
- Cloudflare Workers - Production API runtime (`packages/function/src/api.ts`)
- Bun workspaces with `bun.lock`
- `bunfig.toml` enforces `exact = true` for install
- Bun catalog dependencies in root `package.json` (centralized version pinning via `"catalog:"` references)
## Frameworks
- SolidJS 1.9.10 - Frontend UI framework (`packages/app`, `packages/ui`)
- Astro 5.7.13 - Marketing/landing site (`packages/web`)
- Hono 4.10.7 - HTTP framework for both Cloudflare Workers API (`packages/function`) and local CLI server (`packages/castclaw/src/server/`)
- Effect 4.0.0-beta.35 - Functional effect system used heavily throughout CLI for service composition, dependency injection, and state management
- @kobalte/core 0.13.11 - Accessible SolidJS component primitives
- TailwindCSS 4.1.11 - Styling via `@tailwindcss/vite` plugin
- @solidjs/router 0.15.4 - Client-side routing
- @solidjs/start (PR build) - SolidStart SSR framework
- Virtua 0.42.3 - Virtual scrolling
- Motion 12.34.5 - Animation library
- KaTeX 0.16.27 - Math rendering
- @opentui/core 0.1.90 + @opentui/solid 0.1.90 - Terminal UI rendering with SolidJS
- bun-pty 0.4.8 - PTY (pseudo-terminal) management
- @clack/prompts 1.0.0-alpha.1 - CLI interactive prompts
- Bun test runner (built-in) - Unit tests (`bun test --timeout 30000`)
- Playwright 1.51.0-1.57.0 - E2E testing (`packages/app/e2e/`)
- Happy DOM 20.0.11 - DOM environment for unit tests (`--preload ./happydom.ts`)
- Turborepo 2.8.13 - Monorepo task orchestration (`turbo.json`)
- Vite 7.1.4 - Frontend dev server and bundler
- SST 3.18.10 - Infrastructure-as-code deployment framework
- Husky 9.1.7 - Git hooks
- Prettier 3.6.2 - Code formatting (semi: false, printWidth: 120)
## Key Dependencies
- `ai` 5.0.124 (Vercel AI SDK) - Core LLM abstraction layer
- `@ai-sdk/anthropic` 2.0.65 - Anthropic provider
- `@ai-sdk/openai` 2.0.89 - OpenAI provider
- `@ai-sdk/google` 2.0.54 - Google Gemini provider
- `@ai-sdk/google-vertex` 3.0.106 - Google Vertex AI
- `@ai-sdk/amazon-bedrock` 3.0.82 - AWS Bedrock provider
- `@ai-sdk/azure` 2.0.91 - Azure OpenAI provider
- `@ai-sdk/xai` 2.0.51 - xAI/Grok provider
- `@ai-sdk/mistral` 2.0.27 - Mistral provider
- `@ai-sdk/groq` 2.0.34 - Groq provider
- `@ai-sdk/deepinfra` 1.0.36 - DeepInfra provider
- `@ai-sdk/cerebras` 1.0.36 - Cerebras provider
- `@ai-sdk/cohere` 2.0.22 - Cohere provider
- `@ai-sdk/togetherai` 1.0.34 - Together AI provider
- `@ai-sdk/perplexity` 2.0.23 - Perplexity provider
- `@ai-sdk/vercel` 1.0.33 - Vercel AI provider
- `@ai-sdk/gateway` 2.0.30 - AI Gateway provider
- `@ai-sdk/openai-compatible` 1.0.32 - Generic OpenAI-compatible provider
- `@openrouter/ai-sdk-provider` 1.5.4 - OpenRouter provider
- `gitlab-ai-provider` 5.3.3 - GitLab AI provider
- `ai-gateway-provider` 2.3.1 - AI Gateway provider
- `@modelcontextprotocol/sdk` 1.27.1 - MCP (Model Context Protocol) client
- `@agentclientprotocol/sdk` 0.14.1 - ACP (Agent Client Protocol)
- `drizzle-orm` 1.0.0-beta.19 - ORM for SQLite
- `drizzle-kit` 1.0.0-beta.19 - Migration tooling
- `bun:sqlite` (built-in) - Local SQLite database driver
- `zod` 4.1.8 - Runtime schema validation (used extensively)
- `@standard-schema/spec` 1.0.0 - Standard schema specification
- `effect` Schema module - Used alongside Zod in some modules (e.g., `Auth`, `Account`)
- `web-tree-sitter` 0.25.10 + `tree-sitter-bash` 0.25.0 - Source code parsing
- `shiki` 3.20.0 - Syntax highlighting
- `@octokit/rest` 22.0.0 + `@octokit/graphql` 9.0.2 - GitHub API clients
- `@octokit/auth-app` 8.0.1 - GitHub App authentication
- `@actions/core` 1.11.1 + `@actions/github` 6.0.1 - GitHub Actions SDK
- `@pierre/diffs` 1.1.0-beta.18 - Diff handling
- `@parcel/watcher` 2.5.1 - File watching (cross-platform)
- `chokidar` 4.0.3 - File watching (fallback)
- `gray-matter` 4.0.3 - Frontmatter parsing for skill/config markdown
- `marked` 17.0.1 - Markdown rendering
- `remeda` 2.26.0 - Functional utility library (replaces lodash)
- `luxon` 3.6.1 - Date/time handling
- `yargs` 18.0.0 - CLI argument parsing
- `jose` 6.0.11 - JWT verification (Cloudflare Worker)
- `fuzzysort` 3.1.0 - Fuzzy search
- `ulid` 3.0.1 - ID generation
## Infrastructure & Deployment
- Home: Cloudflare (`sst.config.ts` line 9)
- Providers: Stripe, PlanetScale
- Resources: Cloudflare Worker (API), Cloudflare Astro site (Web), Cloudflare StaticSite (App)
- Secrets: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `ADMIN_SECRET`, `STRIPE_SECRET_KEY`
- Staging: domain pattern `{stage}.dev.castclaw.ai`, production at `castclaw.ai`
- Worker with Durable Objects (`SyncServer` class in `packages/function/src/api.ts`)
- R2 Bucket for session data storage
- Regional Hostname pinned to US
- `flake.nix` defines dev shell and production package
- `nix/castclaw.nix` builds the CLI binary with Bun bundler
- `nix/node_modules.nix` manages reproducible node_modules
- Cross-platform: aarch64-linux, x86_64-linux, aarch64-darwin, x86_64-darwin
- Production binary wraps with ripgrep in PATH
- `packages/containers/base/Dockerfile` - Ubuntu 24.04 base with build tools and Python 3
- `packages/containers/bun-node/Dockerfile` - Bun + Node runtime
- `packages/containers/rust/Dockerfile` - Rust build environment
- `packages/containers/tauri-linux/` - Tauri desktop app build
## Patched Dependencies
- `@standard-community/standard-openapi@0.2.9`
- `@openrouter/ai-sdk-provider@1.5.4`
- `@ai-sdk/xai@2.0.51`
- `solid-js@1.9.10`
## Trusted Dependencies (post-install scripts)
- `esbuild`, `protobufjs`, `tree-sitter`, `tree-sitter-bash`, `web-tree-sitter`
## REF Projects: Technologies to Integrate
### REF/Time-Series-Library (Python Ecosystem)
- PyTorch (implied by `einops`, `reformer-pytorch`, `lightning`)
- `transformers` 4.57.3 - Hugging Face model hub
- `chronos-forecasting` 2.2.1 - Amazon Chronos models
- `timesfm` 1.3.0 - Google TimesFM
- `tirex-ts` 1.3.0 - Time series model index
- `numpy` 2.1.2, `scipy` 1.16.3, `scikit-learn` 1.7.2, `pandas` 2.3.3
- `sktime` 0.40.1 - Time series specific ML
- `PyWavelets` 1.9.0 - Wavelet transforms
- `matplotlib` 3.10.8 - Plotting
- `datasets` 4.5.0 - Hugging Face datasets
- `gluonts` 0.16.2, `lightning` 2.6.0, `hydra-core` 1.3.0
- `jax` 0.8.1 + `jaxtyping` 0.3.4 - JAX framework
- `tensorboard` 2.20.0 - Experiment tracking
### REF/autoresearch (Python + PyTorch)
- Python >=3.10 with `uv` package manager
- `torch` 2.9.1 (CUDA 12.8)
- `tiktoken`, `rustbpe` - Tokenization
- `pyarrow`, `pandas`, `numpy` - Data handling
### REF/get-shit-done (Workflow Architecture)
- File protocol-driven multi-stage execution (PROJECT.md, ROADMAP.md, STATE.md)
- Thin orchestrator + file-writing workers
- State changes centralized to CLI tools, not scattered in prompts
- `init` command returns structured JSON about current execution state
- Skills defined as SKILL.md with YAML frontmatter
## Python-TypeScript Coexistence Strategy
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## TypeScript Configuration
- `packages/app` uses `"strict": true` in `packages/app/tsconfig.json`
- `packages/castclaw` extends `@tsconfig/bun/tsconfig.json` (Bun's defaults, not strict by default)
- Root `tsconfig.json` extends `@tsconfig/bun/tsconfig.json`
- Type checking uses `tsgo` (TypeScript native preview) in most packages via `"typecheck": "tsgo --noEmit"`
- All packages use `"type": "module"` (ESM)
- `"moduleResolution": "bundler"` in app package
- JSX preserved with `"jsxImportSource": "solid-js"` (app) or `"jsxImportSource": "@opentui/solid"` (castclaw TUI)
- `@/*` maps to `./src/*` in both `packages/castclaw/tsconfig.json` and `packages/app/tsconfig.json`
- `@tui/*` maps to `./src/cli/cmd/tui/*` in `packages/castclaw/tsconfig.json`
- `#db` conditional import in `packages/castclaw/package.json` for platform-specific DB initialization (bun vs node)
## Naming Patterns
- Use kebab-case for all source files: `session-cache.test.ts`, `bus-event.ts`, `run-service.ts`
- SQL schema files use `.sql.ts` suffix: `session.sql.ts`, `project.sql.ts`
- Tool description files use `.txt` suffix alongside the tool: `bash.ts` + `bash.txt`, `read.ts` + `read.txt`
- Test files use `.test.ts` suffix (unit tests) or `.spec.ts` suffix (e2e/Playwright tests)
- Components use kebab-case: `dialog-select-model.tsx`, `titlebar-history.ts`
- The codebase uses TypeScript `namespace` extensively as the primary module organization pattern
- Each domain module exports a single namespace: `Session`, `Bus`, `Config`, `Provider`, `Skill`, `Agent`, `Tool`
- The namespace contains types, errors, functions, and Effect services
- Example pattern from `packages/castclaw/src/session/index.ts`:
- Use Zod schemas as the canonical type definition, then derive TypeScript types:
- Effect `Schema.brand()` for branded ID types: `SessionID`, `MessageID`, `PartID`, `ProviderID`, `ModelID`
- Branded IDs have factory methods: `SessionID.make()`, `MessageID.ascending()`, `SessionID.descending()`
- Use camelCase for all functions and methods
- Private/internal functions inside namespaces are plain functions (not exported)
- Public API functions are exported from the namespace
- Use camelCase for variables
- Use UPPER_SNAKE_CASE for constants: `DEFAULT_READ_LIMIT`, `MAX_BYTES`, `DEFAULT_TIMEOUT`
- Namespace-level loggers follow pattern: `const log = Log.create({ service: "serviceName" })`
- Use `NamedError.create()` factory from `@castclaw/util/error` for all domain errors:
- Error names are PascalCase with descriptive suffixes: `NotFoundError`, `ModelNotFoundError`, `SkillInvalidError`
## Code Style
- Prettier configured in root `package.json`:
- No semicolons
- 120 character print width
- Husky is installed (`packages/castclaw/package.json` devDeps) but `.husky/pre-commit` hook appears empty
- No ESLint, Biome, or other linter configuration detected
- Rely on Prettier for formatting and TypeScript for type checking
## Import Organization
- Named imports preferred: `import { Effect, Layer, ServiceMap } from "effect"`
- Default imports for single-export modules: `import z from "zod"`, `import path from "path"`
- `.txt` file imports for tool descriptions: `import DESCRIPTION from "./bash.txt"`
- Type-only imports used occasionally: `import type { Agent } from "@/agent/agent"`
- Use `@/` prefix for intra-package imports in `packages/castclaw`: `import { Bus } from "@/bus"`
- Use `@/` prefix for intra-package imports in `packages/app`: `import { useSDK } from "@/context/sdk"`
- Use workspace references for cross-package: `@castclaw/util/error`, `@castclaw/sdk/v2/client`, `@castclaw/ui/theme/color`
- Packages export via `"exports"` field in `package.json` with wildcard patterns:
- Individual modules are imported directly, not via index barrels
## Effect System Pattern
- See `packages/castclaw/src/effect/run-service.ts` for the runtime factory
- Uses a shared `memoMap` to avoid redundant layer initialization
- `InstanceState` from `packages/castclaw/src/effect/instance-state.ts` provides per-project-directory cached state
- State is lazily initialized and invalidated when an instance is disposed
## Error Handling
- All domain errors extend `NamedError` from `packages/util/src/error.ts`
- Created via factory: `NamedError.create("ErrorName", zodSchema)`
- Serializable via `.toObject()` returning `{ name, data }`
- Type-checkable via `ErrorName.isInstance(err)`
- HTTP status mapping in `packages/castclaw/src/server/server.ts`:
- `Context.create<T>(name)` from `packages/castclaw/src/util/context.ts` wraps `AsyncLocalStorage`
- Throws `Context.NotFound` if accessed outside a provider
- Used by `Instance` to scope per-project state
- Unhandled rejections and uncaught exceptions are logged in `packages/castclaw/src/index.ts`
- CLI wraps top-level `try/catch` with `FormatError()` for user-friendly output
## State Management
- Per-instance state via `Instance.provide({ directory, fn })` scoping pattern
- `InstanceState` (Effect-based) for lazy per-directory cached state
- SQLite database via Drizzle ORM for persistent data (sessions, messages, projects)
- Event bus (`Bus`) for pub/sub within an instance
- `GlobalBus` for cross-instance events
- SolidJS reactive stores and signals
- `@solid-primitives/*` for browser primitives (storage, websocket, media, etc.)
- `@tanstack/solid-query` for server state
- Global sync via custom event reducer pattern in `packages/app/src/context/global-sync/`
- Local persistence via `localStorage` with scoped cache keys
## API Design
- Routes defined in `packages/castclaw/src/server/routes/*.ts`
- OpenAPI-annotated routes using `hono-openapi`:
- Input validation via `validator("query", zodSchema)`
- Routes wrapped in `lazy()` for deferred initialization
- SDK auto-generated from OpenAPI spec via `@hey-api/openapi-ts` in `packages/sdk`
- REST-style paths: `/session`, `/session/status`, `/project`, `/provider`
- Operation IDs use dot notation: `session.list`, `session.status`, `session.create`
## Configuration
- Feature flags defined in `packages/castclaw/src/flag/flag.ts` using `Flag` namespace
- Pattern: `CASTCLAW_` prefix for all env vars
- Boolean flags use `truthy()/falsy()` helpers that check for `"true"/"1"` and `"false"/"0"`
- Some flags use Effect `Config.boolean()` for lazy evaluation
- SST config in `sst.config.ts` for cloud infrastructure
- JSONC config file `castclaw.json` per project (parsed via `jsonc-parser`)
- Global config at XDG data directories
- Managed config for enterprise at system paths (`/etc/castclaw`, `/Library/Application Support/castclaw`)
- Config merging with `mergeDeep` from `remeda`, arrays concatenated
- Turbo for monorepo orchestration (`turbo.json`)
- Vite for app/ui packages
- Custom build script for castclaw CLI (`packages/castclaw/script/build.ts`)
- Bun as package manager and runtime (`packageManager: "bun@1.3.11"`)
## Bus/Event Pattern
## Tool Definition Pattern
- Tool descriptions stored in adjacent `.txt` files
- Parameters defined with Zod, including `.describe()` for LLM-readable docs
- Execute returns `{ title, metadata, output }` structure
- Tools auto-truncate output via `Truncate.output()`
## Utility Patterns
- Deferred initialization for expensive objects
- Used extensively: `Server.Default = lazy(() => createApp({}))`
- Immediately invoked function expression helper
- Used for complex initializations: `const Path = iife(() => { ... })`
- Schema-validated function wrapper using Zod
## REF Project Convention Recommendations
- Design "file protocol and state machine" before designing prompts
- Use structured state files (PROJECT.md, ROADMAP.md, STATE.md) to drive agent execution
- Centralize state changes to CLI tools, not scattered in prompts
- Sub-agents write results directly to target files to reduce context burden
- Every stage should produce explicit artifact files
- Separate "fixed layer" (evaluation, metrics, data) from "variable layer" (methods, params, strategies)
- Use YAML/JSON specs for experiment configuration, not free-form
- LLM proposes experiments; programs evaluate them
- Maintain structured history (`history.jsonl`) to prevent repeated failures
- Stop conditions should be explicit and coded, not left to LLM judgment
- Models registered by placing files in `models/` directory (auto-discovery via `LazyModelDict`)
- Skills should map to experiment method templates with parameters, preconditions, and risk descriptions
- Prefer Python file generation + execution over shell script orchestration
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Effect-TS service layer pattern: all core services are defined as `ServiceMap.Service` classes with explicit dependency injection via `Layer` composition
- Namespace-based module organization: each domain uses a TypeScript `namespace` that bundles types, service definitions, layers, and convenience functions
- Event-driven internal bus: a `PubSub`-based `Bus` enables decoupled communication between subsystems
- Plugin system with hook-based extensibility: plugins can intercept chat messages, tool execution, system prompts, and auth flows
- Skills as Markdown-defined agent instructions loaded from filesystem (SKILL.md pattern)
- AI SDK (Vercel `ai` package v5) as the unified LLM interface across 20+ providers
## Layers
- Purpose: Parse commands, bootstrap instances, render TUI
- Location: `packages/castclaw/src/cli/`
- Contains: Yargs command modules, TUI components (Solid.js + @opentui), bootstrap logic
- Entry point: `packages/castclaw/src/index.ts` (yargs CLI definition)
- Binary: `packages/castclaw/bin/castclaw` (shell wrapper)
- Depends on: Server, Project, Config, Agent, Session
- Used by: End user via terminal
- Purpose: Local HTTP server (Hono) exposing a REST/SSE API for the app frontend and SDK
- Location: `packages/castclaw/src/server/`
- Contains: Route handlers, OpenAPI spec generation, WebSocket support, projectors
- Routes: `packages/castclaw/src/server/routes/` (session, config, provider, file, mcp, event, permission, question, pty, project, experimental, global, tui, workspace)
- Depends on: All core services (Session, Agent, Skill, Provider, Config, Plugin, etc.)
- Used by: App frontend, SDK clients, TUI
- Purpose: Manage chat sessions, LLM streaming, message persistence, tool execution
- Location: `packages/castclaw/src/session/`
- Contains: `processor.ts` (main stream loop), `llm.ts` (LLM streaming wrapper), `system.ts` (system prompt assembly), `instruction.ts` (AGENTS.md/CLAUDE.md resolution), `compaction.ts`, `prompt.ts`, message schemas
- Key file: `packages/castclaw/src/session/processor.ts` - the core agentic loop that streams LLM output, processes tool calls, handles permissions, retries, and compaction
- Depends on: LLM, Tool, Agent, Plugin, Config, Snapshot, Bus
- Used by: Server routes, CLI run command
- Purpose: Define and manage agent configurations (build, plan, explore, general, compaction, title, summary, plus user-defined agents)
- Location: `packages/castclaw/src/agent/agent.ts`
- Contains: Agent.Info schema (name, description, mode, permissions, model, prompt, temperature, options), built-in agent definitions, user config merging
- Key concepts: Agents have `mode` ("primary", "subagent", "all") and permission rulesets that control which tools they can use
- Built-in agents: `build` (default), `plan` (read-only), `general` (subagent for parallel work), `explore` (read-only codebase exploration), `compaction`, `title`, `summary`
- Depends on: Config, Auth, Provider, Permission, Plugin, Skill
- Used by: Session, ToolRegistry, Server
- Purpose: Define and register tools available to LLM agents
- Location: `packages/castclaw/src/tool/`
- Contains: Individual tool implementations, registry, schema, truncation logic
- Key file: `packages/castclaw/src/tool/registry.ts` - assembles all tools (built-in + plugin + custom file-based)
- Key file: `packages/castclaw/src/tool/tool.ts` - `Tool.define()` factory with validation and auto-truncation
- Built-in tools: `bash`, `read`, `glob`, `grep`, `edit`, `write`, `task` (subagent spawning), `skill` (load SKILL.md), `question`, `webfetch`, `websearch`, `codesearch`, `todowrite`, `apply_patch`, `batch`, `lsp`, `plan` (plan mode exit)
- Tool selection per model: `packages/castclaw/src/tool/registry.ts` conditionally includes tools based on provider/model (e.g., `apply_patch` for GPT, `edit`/`write` for others)
- Depends on: Skill, Agent, Config, Plugin, Permission
- Used by: Session processor
- Purpose: Load SKILL.md files from filesystem and expose them as loadable agent instructions
- Location: `packages/castclaw/src/skill/`
- Contains: `index.ts` (scanning, loading, filtering), `discovery.ts` (remote skill URL fetching)
- Scan locations (in order): `~/.claude/skills/`, `~/.agents/skills/`, project `.claude/`/`.agents/` dirs, castclaw config dirs (`{skill,skills}/**/SKILL.md`), configured `skills.paths`, configured `skills.urls`
- SKILL.md format: Markdown with YAML frontmatter containing `name` and `description`
- Depends on: Config, Filesystem, Discovery (HTTP client for remote skills)
- Used by: Agent (permission whitelisting), Tool (SkillTool), Session (system prompt skills section)
- Purpose: Load and manage plugins that extend castclaw via hooks
- Location: `packages/castclaw/src/plugin/index.ts`
- Plugin interface defined at: `packages/plugin/src/index.ts`
- Hook types: `event`, `config`, `tool`, `auth`, `chat.message`, `chat.params`, `chat.headers`, `permission.ask`, `command.execute.before`, `tool.execute.before`, `tool.execute.after`, `shell.env`, `experimental.chat.system.transform`, `experimental.chat.messages.transform`, `experimental.session.compacting`, `experimental.text.complete`, `tool.definition`
- Built-in plugins: `CodexAuthPlugin`, `CopilotAuthPlugin`, `GitlabAuthPlugin`, `PoeAuthPlugin`
- External plugins: loaded from npm packages or `file://` URLs configured in `castclaw.json`
- Depends on: Config, Bus, SDK, BunProc (for npm install)
- Used by: Session, LLM, ToolRegistry, Server
- Purpose: Manage LLM provider connections, model resolution, auth, language model creation
- Location: `packages/castclaw/src/provider/`
- Contains: `provider.ts` (main provider registry with 20+ SDK provider integrations), `transform.ts` (provider-specific options), `schema.ts` (ProviderID, ModelID types), `models.ts` (models.dev integration)
- Supported providers: OpenAI, Anthropic, Google (Gemini + Vertex), Azure, Bedrock, xAI, Groq, Mistral, DeepInfra, Cerebras, Cohere, OpenRouter, Perplexity, TogetherAI, Vercel, GitLab, Copilot, Gateway, custom OpenAI-compatible
- Depends on: Config, Auth, Plugin
- Used by: Session, Agent, LLM
- Purpose: Multi-layered config resolution with precedence ordering
- Location: `packages/castclaw/src/config/config.ts`, `packages/castclaw/src/config/markdown.ts`, `packages/castclaw/src/config/paths.ts`
- Precedence (low to high): remote `.well-known/castclaw` -> global `~/.config/castclaw/castclaw.json` -> `CASTCLAW_CONFIG` env -> project `castclaw.json` -> `.castclaw/` directories -> `CASTCLAW_CONFIG_CONTENT` inline -> managed enterprise dir
- Depends on: Auth, Flag, Global, Instance
- Used by: Nearly everything
- Purpose: Local SQLite database for sessions, messages, projects, workspaces
- Location: `packages/castclaw/src/storage/`
- Contains: `db.ts` (database client), `db.bun.ts`/`db.node.ts` (runtime-specific SQLite drivers), `schema.sql.ts` (Drizzle schema), `json-migration.ts` (legacy migration), `storage.ts`
- ORM: Drizzle ORM with bun:sqlite (primary) or better-sqlite3 (node fallback)
- Migration dir: `packages/castclaw/migration/` (10 Drizzle migrations)
- Depends on: Global (data path)
- Used by: Session, Project, Sync, Workspace
- Purpose: Project discovery, instance lifecycle management, VCS integration
- Location: `packages/castclaw/src/project/`
- Key file: `packages/castclaw/src/project/instance.ts` - AsyncLocalStorage-based context provider; each working directory gets a cached instance with `{directory, worktree, project}` context
- Key file: `packages/castclaw/src/project/bootstrap.ts` - initialization sequence: Plugin -> ShareNext -> Format -> LSP -> File -> FileWatcher -> Vcs -> Snapshot -> Command event subscription
- Depends on: Plugin, Format, LSP, File, Snapshot, Vcs, Bus, Command
- Used by: Every subsystem (via `Instance.directory`, `Instance.worktree`, `Instance.project`)
- Purpose: Dependency injection and lifecycle management via Effect-TS
- Location: `packages/castclaw/src/effect/`
- Contains: `instance-state.ts` (per-instance state management), `instance-registry.ts` (scope management), `run-service.ts` (runtime creation helper)
- Pattern: Each service defines a `ServiceMap.Service` class, a `Layer.effect` constructor, and exposes `runPromise` convenience functions for imperative code
- Used by: All services (Agent, Skill, Plugin, Bus, ToolRegistry, Command, etc.)
## Data Flow
- Per-instance state via `InstanceState` (Effect-TS scoped state): `packages/castclaw/src/effect/instance-state.ts`
- Instance-level AsyncLocalStorage context: `packages/castclaw/src/project/instance.ts`
- Persistent state in SQLite: sessions, messages, parts, projects, workspaces
- Config state: multi-layered JSONC resolution cached per instance
## Key Abstractions
- Purpose: Defines a tool available to LLM agents
- Definition: `packages/castclaw/src/tool/tool.ts`
- Pattern: `Tool.define(id, async (initCtx) => ({ description, parameters: z.object(...), execute: async (args, ctx) => ({ title, output, metadata }) }))`
- Each tool has an `id`, lazy `init` (receives agent context), Zod parameters, and an async `execute` function
- Purpose: Defines an agent configuration (name, prompt, model, permissions, mode)
- Definition: `packages/castclaw/src/agent/agent.ts`
- Key modes: `primary` (user-facing, one active at a time), `subagent` (spawned by `task` tool), `all` (both)
- Permission system: Array of rules with glob patterns for each tool/capability
- Purpose: A loaded SKILL.md with name, description, location, and content
- Definition: `packages/castclaw/src/skill/index.ts`
- Pattern: Markdown file with YAML frontmatter (`name`, `description`), body is the skill instructions
- Purpose: Extension point for third-party integrations
- Definition: `packages/plugin/src/index.ts`
- Pattern: `(input: PluginInput) => Promise<Hooks>` where Hooks is a record of optional hook functions
- Plugin receives: SDK client, project info, directory, worktree, server URL, Bun shell
- Purpose: Per-project-directory context (directory, worktree, project info)
- Definition: `packages/castclaw/src/project/instance.ts`
- Pattern: AsyncLocalStorage context with caching; `Instance.provide({ directory, init, fn })` wraps execution in instance context
- Purpose: Slash commands (e.g., `/init`, `/review`) that inject templates into the conversation
- Definition: `packages/castclaw/src/command/index.ts`
- Sources: Built-in (`init`, `review`), config-defined, MCP prompts, skill commands
## Entry Points
- Location: `packages/castclaw/src/index.ts`
- Triggers: `castclaw <command>` from terminal
- Responsibilities: Parse CLI args with yargs, dispatch to command handlers, manage log init and DB migration
- Location: `packages/castclaw/src/cli/cmd/run.ts`
- Triggers: `castclaw` (no subcommand) or `castclaw run`
- Responsibilities: Bootstrap instance, start server, launch TUI or headless mode
- Location: `packages/castclaw/src/server/server.ts`
- Triggers: Started by CLI on `localhost:4096`
- Responsibilities: Serve REST API, SSE events, WebSocket connections, static app assets
- Location: `packages/castclaw/src/cli/cmd/serve.ts`
- Triggers: `castclaw serve`
- Responsibilities: Headless server mode (no TUI)
- Location: `packages/function/src/api.ts`
- Triggers: Cloudflare Worker deployment
- Responsibilities: Session sharing via Durable Objects and R2, GitHub app auth
## Error Handling
- `NamedError.create(name, schema)` at `packages/util/src/error.ts` creates typed error classes
- Server maps error types to HTTP status codes: `NotFoundError` -> 404, `ModelNotFoundError` -> 400, etc.
- LLM stream errors trigger retry logic in `packages/castclaw/src/session/retry.ts`
- Tool execution errors are caught and returned as error output to the LLM
- Doom loop detection: `DOOM_LOOP_THRESHOLD = 3` consecutive errors trigger a break in `packages/castclaw/src/session/processor.ts`
## Cross-Cutting Concerns
## REF Architecture Ideas (For Time Series Transformation)
### From REF/Time-Series-Library (GUIDE.md)
- Auto-discovery model registry: `exp/exp_basic.py` scans `models/` directory and dynamically imports models via `LazyModelDict` - analogous to how Castclaw Skills are auto-discovered from filesystem
- Experiment pipeline abstraction: `exp/exp_*.py` (8 pipeline types) define standardized train/test workflows - should map to "Runner" skills in Castclaw
- Unified CLI entry: `run.py` with `argparse` for model/task/params - should map to Castclaw commands/skills
- Key reusable components: `models/` (42 model files including Chronos2, TimesFM, Moirai wrappers), `data_provider/data_factory.py`, `utils/metrics.py`
- Recommended integration: Create an `agent/` directory pattern with `registry.py`, `generator.py`, `runner.py` that generates model wrapper files into `models/`
### From REF/autoresearch (GUIDE.md)
- Fixed evaluation + agent-driven experimentation loop: The core pattern is "agent proposes changes to `train.py`, runs experiment, compares results, decides keep/discard"
- Key constraint: LLM proposes experiments, but evaluation is always programmatic (never LLM-judged metrics)
- State tracking: `results.tsv` as the experiment history, git branches for code versioning
- Maps directly to Castclaw's session/tool architecture: each experiment cycle is a tool call sequence
### From REF/get-shit-done (GUIDE.md)
- Five-layer workflow: Commands (entry) -> Workflows (orchestration) -> Agents (specialized roles) -> CLI tools (state machine) -> Templates (structured output)
- File protocol over prompt freedom: `PROJECT.md`, `ROADMAP.md`, `STATE.md`, `CONTEXT.md`, `PLAN.md`, `SUMMARY.md`, `VERIFICATION.md` - all as structured state files
- Thin Orchestrator + File-Writing Workers: orchestrator reads state, delegates to sub-agents, sub-agents write directly to files
- Centralized state updates via CLI tools, not scattered in prompts
- `init` layer that returns structured JSON about current project state and recommended next action
- For time series: Map to `discover -> plan -> execute -> verify -> archive` stages, with each stage having mandatory read/write files
## Reusable vs. Replacement Components
- CLI framework: `packages/castclaw/src/index.ts`, `packages/castclaw/src/cli/`
- Server: `packages/castclaw/src/server/` (all routes)
- TUI: `packages/castclaw/src/cli/cmd/tui/`
- App frontend: `packages/app/`
- UI components: `packages/ui/`
- SDK: `packages/sdk/`
- Plugin system: `packages/castclaw/src/plugin/`, `packages/plugin/`
- Tool infrastructure: `packages/castclaw/src/tool/tool.ts`, `packages/castclaw/src/tool/registry.ts`
- Session/LLM/Processor: `packages/castclaw/src/session/`
- Agent system: `packages/castclaw/src/agent/`
- Config system: `packages/castclaw/src/config/`
- Storage/DB: `packages/castclaw/src/storage/`
- Permission system: `packages/castclaw/src/permission/`
- Bus/Events: `packages/castclaw/src/bus/`
- Effect service layer: `packages/castclaw/src/effect/`
- Provider integrations: `packages/castclaw/src/provider/`
- Infrastructure: `infra/`, `nix/`, `packages/containers/`
- Time series forecasting skills (SKILL.md files) for: data ingestion, model selection, experiment execution, evaluation, result analysis
- Skills should follow the GSD pattern: file protocol with structured state files (ROADMAP, STATE, PLAN, etc.)
- Skills should implement the autoresearch loop: propose -> execute -> evaluate -> reflect -> keep/discard
- Python runner tool: Execute Python scripts and capture structured output (metrics, plots)
- Experiment evaluator tool: Compare experiment results against baselines
- Data inspector tool: Analyze time series data characteristics (frequency, seasonality, stationarity)
- `/forecast`: Initialize a forecasting session with dataset and task parameters
- `/experiment`: Start an automated experiment loop
- `/report`: Generate experiment summary
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
