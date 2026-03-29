import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "fs/promises"
import matter from "gray-matter"
import os from "os"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { PhaseGateError } from "../../src/tool/forecast/errors"
import { ForecastStateTool } from "../../src/tool/forecast/forecast-state"
import { ForecastPhaseState } from "../../src/tool/forecast/types"

const ctx = {
  sessionID: SessionID.make("ses_forecast-state-test"),
  messageID: MessageID.make("msg_forecast-state-test"),
  callID: "forecast-state-test-call",
  agent: "forecast-state-test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("forecast_state phase machine", () => {
  let tmpdir: string

  beforeEach(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), "forecast-state-test-"))
  })

  afterEach(async () => {
    await Instance.disposeAll()
    await rm(tmpdir, { recursive: true, force: true })
  })

  async function run(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await ForecastStateTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  async function readState() {
    const raw = await readFile(path.join(tmpdir, ".forecast", "STATE.md"), "utf-8")
    return ForecastPhaseState.parse(matter(raw).data)
  }

  async function writeTaskFile() {
    const frozenAt = "2026-03-27T00:00:00.000Z"
    await writeFile(
      path.join(tmpdir, ".forecast", "task.json"),
      JSON.stringify({ frozen_at: frozenAt, dataset_path: "dataset.csv" }, null, 2),
      "utf-8",
    )
    return frozenAt
  }

  async function writePreForecastReport() {
    await mkdir(path.join(tmpdir, ".forecast", "reports"), { recursive: true })
    await writeFile(
      path.join(tmpdir, ".forecast", "reports", "pre-forecast.md"),
      [
        "# Pre-Forecast Report",
        "",
        "## Task Summary",
        "Synthetic task summary.",
        "",
        "## Data Characteristics",
        "Strong daily seasonality and low missingness.",
        "",
        "## Domain Context",
        "Operational forecasting with periodic load effects.",
        "",
        "## Risk Flags",
        "Distribution shifts could degrade fit.",
        "",
        "## Modeling Direction Recommendations",
        "Start with linear baselines and compare against lightweight transformers.",
        "",
      ].join("\n"),
      "utf-8",
    )
  }

  async function moveToSkillsReview() {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({ subcommand: "transition", target_phase: "pre-forecast" })
    await writePreForecastReport()
    await run({ subcommand: "transition", target_phase: "skills-review" })
  }

  async function expectPhaseGateError(
    promise: Promise<unknown>,
    expected: {
      currentPhase: string
      requiredPhase: string
      missingSubstring: string
    },
  ) {
    try {
      await promise
      throw new Error("Expected PhaseGateError")
    } catch (error) {
      expect(PhaseGateError.isInstance(error)).toBe(true)
      if (!PhaseGateError.isInstance(error)) {
        throw error
      }
      expect(error.data.current_phase).toBe(expected.currentPhase)
      expect(error.data.required_phase).toBe(expected.requiredPhase)
      expect(error.data.missing_preconditions).toContainEqual(expect.stringContaining(expected.missingSubstring))
    }
  }

  test("init creates the forecast directory structure and state file", async () => {
    const result = await run({ subcommand: "init" })
    const output = JSON.parse(result.output)

    expect(output.initialized).toBe(true)
    expect(output.directories).toEqual(["skills", "runs", "reports", "viz"])
    expect(output.files).toEqual(["STATE.md", "history.jsonl", "best.json"])

    for (const dir of ["skills", "runs", "reports", "viz"]) {
      const info = await stat(path.join(tmpdir, ".forecast", dir))
      expect(info.isDirectory()).toBe(true)
    }

    const state = await readState()
    expect(state.phase).toBe("init")
    expect(state.skills_confirmed).toBe(false)
    expect(state.transitions).toEqual([])
  })

  test("init creates history.jsonl and best.json alongside directories", async () => {
    await run({ subcommand: "init" })

    const historyPath = path.join(tmpdir, ".forecast", "history.jsonl")
    const bestPath = path.join(tmpdir, ".forecast", "best.json")

    const historyStat = await stat(historyPath)
    expect(historyStat.isFile()).toBe(true)
    const historyContent = await readFile(historyPath, "utf-8")
    expect(historyContent).toBe("")

    const bestStat = await stat(bestPath)
    expect(bestStat.isFile()).toBe(true)
    const bestContent = await readFile(bestPath, "utf-8")
    expect(bestContent).toBe("null\n")
  })

  test("init preserves existing history.jsonl and best.json", async () => {
    const forecastRoot = path.join(tmpdir, ".forecast")
    await mkdir(forecastRoot, { recursive: true })
    await writeFile(path.join(forecastRoot, "history.jsonl"), '{"run_id":"existing"}\n', "utf-8")
    await writeFile(path.join(forecastRoot, "best.json"), '{"run_id":"best"}', "utf-8")

    await run({ subcommand: "init" })

    const historyContent = await readFile(path.join(forecastRoot, "history.jsonl"), "utf-8")
    expect(historyContent).toBe('{"run_id":"existing"}\n')

    const bestContent = await readFile(path.join(forecastRoot, "best.json"), "utf-8")
    expect(bestContent).toBe('{"run_id":"best"}')
  })

  test("init writes .forecast/skills into castclaw.json skills.paths", async () => {
    await run({ subcommand: "init" })

    const config = JSON.parse(await readFile(path.join(tmpdir, "castclaw.json"), "utf-8"))
    expect(config.skills.paths).toContain(".forecast/skills")
  })

  test("init links the bundled python project into clean workspaces", async () => {
    const output = JSON.parse((await run({ subcommand: "init" })).output)
    const pyprojectPath = path.join(tmpdir, "python", "pyproject.toml")

    expect(output.python_project_linked).toBe(true)
    const info = await stat(pyprojectPath)
    expect(info.isFile()).toBe(true)
  })

  test("init is idempotent and does not duplicate the skills path", async () => {
    const first = JSON.parse((await run({ subcommand: "init" })).output)
    const second = JSON.parse((await run({ subcommand: "init" })).output)
    const config = JSON.parse(await readFile(path.join(tmpdir, "castclaw.json"), "utf-8"))

    expect(first.config_updated).toBe(true)
    expect(second.config_updated).toBe(false)
    expect(config.skills.paths).toEqual([".forecast/skills"])
  })

  test("transition moves from init to pre-forecast when task.json exists", async () => {
    await run({ subcommand: "init" })
    const frozenAt = await writeTaskFile()

    const result = await run({ subcommand: "transition", target_phase: "pre-forecast" })
    const output = JSON.parse(result.output)
    const state = await readState()

    expect(output).toMatchObject({ ok: true, previous: "init", phase: "pre-forecast" })
    expect(state.phase).toBe("pre-forecast")
    expect(state.task_frozen_at).toBe(frozenAt)
    expect(state.transitions).toHaveLength(1)
  })

  test("transition to pre-forecast fails when task.json is missing", async () => {
    await run({ subcommand: "init" })

    await expectPhaseGateError(run({ subcommand: "transition", target_phase: "pre-forecast" }), {
      currentPhase: "init",
      requiredPhase: "pre-forecast",
      missingSubstring: "task.json must exist",
    })
  })

  test("transition moves from pre-forecast to skills-review when the report exists", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({ subcommand: "transition", target_phase: "pre-forecast" })
    await writePreForecastReport()

    const result = await run({ subcommand: "transition", target_phase: "skills-review" })
    const output = JSON.parse(result.output)
    const state = await readState()

    expect(output).toMatchObject({ ok: true, previous: "pre-forecast", phase: "skills-review" })
    expect(state.phase).toBe("skills-review")
    expect(state.pre_forecast_completed).toBe(true)
    expect(state.pre_forecast_completed_at).toEqual(expect.any(String))
  })

  test("transition to skills-review fails when the pre-forecast report is missing", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({ subcommand: "transition", target_phase: "pre-forecast" })

    await expectPhaseGateError(run({ subcommand: "transition", target_phase: "skills-review" }), {
      currentPhase: "pre-forecast",
      requiredPhase: "skills-review",
      missingSubstring: "reports/pre-forecast.md must exist",
    })
  })

  test("transition to skills-review fails when the pre-forecast report is missing required sections", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({ subcommand: "transition", target_phase: "pre-forecast" })
    await mkdir(path.join(tmpdir, ".forecast", "reports"), { recursive: true })
    await writeFile(
      path.join(tmpdir, ".forecast", "reports", "pre-forecast.md"),
      "# Pre-Forecast Report\n\n## Data Characteristics\nOnly one section exists.\n",
      "utf-8",
    )

    await expectPhaseGateError(run({ subcommand: "transition", target_phase: "skills-review" }), {
      currentPhase: "pre-forecast",
      requiredPhase: "skills-review",
      missingSubstring: "Missing: Task Summary, Domain Context, Risk Flags, Modeling Direction Recommendations",
    })
  })

  test("transition to forecast fails until skills are confirmed", async () => {
    await moveToSkillsReview()

    await expectPhaseGateError(run({ subcommand: "transition", target_phase: "forecast" }), {
      currentPhase: "skills-review",
      requiredPhase: "forecast",
      missingSubstring: "skills must be confirmed",
    })
  })

  test("confirm_skills sets the confirmation fields in STATE.md", async () => {
    await moveToSkillsReview()

    const result = await run({ subcommand: "confirm_skills" })
    const output = JSON.parse(result.output)
    const state = await readState()

    expect(output.ok).toBe(true)
    expect(output.skills_confirmed).toBe(true)
    expect(output.confirmed_at).toEqual(expect.any(String))
    expect(state.skills_confirmed).toBe(true)
    expect(state.skills_confirmed_at).toBe(output.confirmed_at)
  })

  test("transition moves from skills-review to forecast after confirm_skills", async () => {
    await moveToSkillsReview()
    await run({ subcommand: "confirm_skills" })

    const result = await run({ subcommand: "transition", target_phase: "forecast" })
    const output = JSON.parse(result.output)
    const state = await readState()

    expect(output).toMatchObject({ ok: true, previous: "skills-review", phase: "forecast" })
    expect(state.phase).toBe("forecast")
  })

  test("transition to post-forecast creates final-report.md placeholder", async () => {
    await moveToSkillsReview()
    await run({ subcommand: "confirm_skills" })
    await run({ subcommand: "transition", target_phase: "forecast" })
    await rm(path.join(tmpdir, ".forecast", "viz"), { recursive: true, force: true })

    const result = await run({ subcommand: "transition", target_phase: "post-forecast" })
    const output = JSON.parse(result.output)

    const reportPath = path.join(tmpdir, ".forecast", "reports", "final-report.md")
    const reportContent = await readFile(reportPath, "utf-8")
    expect(reportContent).toContain("# Final Forecast Report")
    expect(reportContent).toContain("Pending")
    expect(output).toMatchObject({
      ok: true,
      previous: "forecast",
      phase: "post-forecast",
      compaction_queued: false,
    })

    const vizStat = await stat(path.join(tmpdir, ".forecast", "viz"))
    expect(vizStat.isDirectory()).toBe(true)
  })

  test("transition to skills-review generates CONTEXT.md with CAST constraints", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()

    await writeFile(
      path.join(tmpdir, "CAST.md"),
      "# Forecasting Constraints\n\n## Model Restrictions\n\nForbidden: transformer models\nRequired: at least one linear model\n",
      "utf-8",
    )

    await run({ subcommand: "transition", target_phase: "pre-forecast" })
    await writePreForecastReport()
    await run({ subcommand: "transition", target_phase: "skills-review" })

    const contextPath = path.join(tmpdir, ".forecast", "CONTEXT.md")
    const contextContent = await readFile(contextPath, "utf-8")
    expect(contextContent).toContain("# Forecast Context")
    expect(contextContent).toContain("## Constraints")
    expect(contextContent).toContain("Forbidden: transformer models")
    expect(contextContent).toContain("Required: at least one linear model")
  })

  test("transition to skills-review generates CONTEXT.md without CAST.md", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({ subcommand: "transition", target_phase: "pre-forecast" })
    await writePreForecastReport()
    await run({ subcommand: "transition", target_phase: "skills-review" })

    const contextPath = path.join(tmpdir, ".forecast", "CONTEXT.md")
    const contextContent = await readFile(contextPath, "utf-8")
    expect(contextContent).toContain("# Forecast Context")
    expect(contextContent).toContain("## Constraints")
    expect(contextContent).toContain("No CAST.md constraints defined")
  })

  test("CONTEXT.md includes pre-forecast report sections", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({ subcommand: "transition", target_phase: "pre-forecast" })

    const reportsDir = path.join(tmpdir, ".forecast", "reports")
    await mkdir(reportsDir, { recursive: true })
    await writeFile(
      path.join(reportsDir, "pre-forecast.md"),
      [
        "# Pre-Forecast Report",
        "",
        "## Task Summary",
        "ETTh1 oil temperature forecasting",
        "",
        "## Data Characteristics",
        "Strong daily seasonality at period 24",
        "Non-stationary via ADF test",
        "",
        "## Domain Context",
        "Energy sector time series",
        "",
        "## Risk Flags",
        "High volatility in summer months",
        "",
        "## Modeling Direction Recommendations",
        "Linear models for baseline, transformer models for complex patterns",
        "",
      ].join("\n"),
      "utf-8",
    )

    await run({ subcommand: "transition", target_phase: "skills-review" })

    const contextPath = path.join(tmpdir, ".forecast", "CONTEXT.md")
    const contextContent = await readFile(contextPath, "utf-8")
    expect(contextContent).toContain("## Pre-Forecast Summary")
    expect(contextContent).toContain("Strong daily seasonality at period 24")
    expect(contextContent).toContain("High volatility in summer months")
    expect(contextContent).toContain("## Modeling Directions")
    expect(contextContent).toContain("Linear models for baseline")
  })

  test("transition to post-forecast creates historical-explanations.md placeholder", async () => {
    await moveToSkillsReview()
    await run({ subcommand: "confirm_skills" })
    await run({ subcommand: "transition", target_phase: "forecast" })
    await run({ subcommand: "transition", target_phase: "post-forecast" })

    const explanationsPath = path.join(tmpdir, ".forecast", "reports", "historical-explanations.md")
    const explanationsContent = await readFile(explanationsPath, "utf-8")
    expect(explanationsContent).toContain("# Historical Sample Explanations")
    expect(explanationsContent).toContain("Pending")
  })

  test("check_reflection returns ok when no experiment has been recorded yet", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()

    const result = await run({ subcommand: "check_reflection" })
    const output = JSON.parse(result.output)

    expect(output).toEqual({
      ok: true,
      has_reflection: false,
      last_experiment_run_id: null,
    })
  })

  test("check_reflection throws when the latest experiment has no paired reflection", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({
      subcommand: "append",
      record: {
        run_id: "run-1",
        model: "DLinear",
        status: "success",
        metrics: { mse: 0.1, mae: 0.2, wape: 0.3, mase: 0.4 },
        spec: { model: "DLinear" },
        elapsed_seconds: 12,
        timestamp: "2026-03-27T01:00:00.000Z",
      },
    })

    await expectPhaseGateError(run({ subcommand: "check_reflection" }), {
      currentPhase: "forecast",
      requiredPhase: "forecast",
      missingSubstring: "run-1",
    })
  })

  test("check_reflection succeeds once the latest experiment has a paired reflection", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await run({
      subcommand: "append",
      record: {
        run_id: "run-2",
        model: "PatchTST",
        status: "success",
        metrics: { mse: 0.05, mae: 0.1, wape: 0.15, mase: 0.2 },
        spec: { model: "PatchTST" },
        elapsed_seconds: 18,
        timestamp: "2026-03-27T02:00:00.000Z",
      },
    })

    await writeFile(
      path.join(tmpdir, ".forecast", "history.jsonl"),
      [
        JSON.stringify({
          run_id: "run-2",
          model: "PatchTST",
          status: "success",
          metrics: { mse: 0.05, mae: 0.1, wape: 0.15, mase: 0.2 },
          spec: { model: "PatchTST" },
          elapsed_seconds: 18,
          timestamp: "2026-03-27T02:00:00.000Z",
        }),
        JSON.stringify({
          type: "reflection",
          run_id: "run-2",
          effective: true,
          reason: "Lower validation error",
          next_direction: "Try a longer context window",
          decision: "keep",
          timestamp: "2026-03-27T02:05:00.000Z",
        }),
      ].join("\n") + "\n",
      "utf-8",
    )

    const result = await run({ subcommand: "check_reflection" })
    const output = JSON.parse(result.output)

    expect(output).toEqual({
      ok: true,
      has_reflection: true,
      last_experiment_run_id: "run-2",
    })
  })

  test("phase_gate returns ok when the current phase matches the target", async () => {
    await run({ subcommand: "init" })

    const result = await run({ subcommand: "phase_gate", target_phase: "init" })
    const output = JSON.parse(result.output)

    expect(output).toEqual({ ok: true, phase: "init" })
  })

  test("phase_gate throws when the current phase does not match the target", async () => {
    await run({ subcommand: "init" })

    await expectPhaseGateError(run({ subcommand: "phase_gate", target_phase: "forecast" }), {
      currentPhase: "init",
      requiredPhase: "forecast",
      missingSubstring: 'current phase is "init"',
    })
  })

  test("invalid transitions throw PhaseGateError", async () => {
    await run({ subcommand: "init" })

    await expectPhaseGateError(run({ subcommand: "transition", target_phase: "forecast" }), {
      currentPhase: "init",
      requiredPhase: "forecast",
      missingSubstring: "transition init -> forecast is not allowed",
    })
  })

  test("full lifecycle reaches forecast after confirmation", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()

    const preForecast = JSON.parse((await run({ subcommand: "transition", target_phase: "pre-forecast" })).output)
    await writePreForecastReport()
    const skillsReview = JSON.parse((await run({ subcommand: "transition", target_phase: "skills-review" })).output)
    const confirm = JSON.parse((await run({ subcommand: "confirm_skills" })).output)
    const forecast = JSON.parse((await run({ subcommand: "transition", target_phase: "forecast" })).output)
    const state = await readState()

    expect(preForecast.phase).toBe("pre-forecast")
    expect(skillsReview.phase).toBe("skills-review")
    expect(confirm.skills_confirmed).toBe(true)
    expect(forecast.phase).toBe("forecast")
    expect(state.phase).toBe("forecast")
    expect(state.transitions).toHaveLength(3)
    expect(state.transitions.map((transition) => transition.to)).toEqual(["pre-forecast", "skills-review", "forecast"])
  })
})
