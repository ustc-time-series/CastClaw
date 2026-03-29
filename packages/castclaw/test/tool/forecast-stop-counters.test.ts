import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import matter from "gray-matter"
import os from "os"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { ForecastStateTool } from "../../src/tool/forecast/forecast-state"
import { ForecastPhaseState } from "../../src/tool/forecast/types"

const ctx = {
  sessionID: SessionID.make("ses_forecast-stop-counters-test"),
  messageID: MessageID.make("msg_forecast-stop-counters-test"),
  callID: "forecast-stop-counters-test-call",
  agent: "forecast-stop-counters-test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("forecast_state stop counters and expert feedback", () => {
  let tmpdir: string

  beforeEach(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), "forecast-stop-counters-test-"))
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

  async function writeTaskFile() {
    await mkdir(path.join(tmpdir, ".forecast"), { recursive: true })
    const frozenAt = "2026-03-28T00:00:00.000Z"
    await writeFile(
      path.join(tmpdir, ".forecast", "task.json"),
      JSON.stringify({ frozen_at: frozenAt, dataset_path: "dataset.csv" }, null, 2),
      "utf-8",
    )
    return frozenAt
  }

  async function readState() {
    const raw = await readFile(path.join(tmpdir, ".forecast", "STATE.md"), "utf-8")
    return ForecastPhaseState.parse(matter(raw).data)
  }

  async function writeStateWithThresholds(overrides: Record<string, unknown> = {}) {
    const state = ForecastPhaseState.parse({
      phase: "forecast",
      skills_confirmed: true,
      skills_confirmed_at: "2026-03-28T00:00:00.000Z",
      pre_forecast_completed: true,
      pre_forecast_completed_at: "2026-03-28T00:00:00.000Z",
      task_frozen_at: "2026-03-28T00:00:00.000Z",
      transitions: [],
      consecutive_no_improvement: 0,
      consecutive_crashes: 0,
      stop_reason: null,
      budget_initialized: true,
      budget_thresholds: {
        max_experiments: 20,
        no_improvement_rounds: 3,
        crash_threshold: 3,
      },
      ...overrides,
    })

    await writeFile(
      path.join(tmpdir, ".forecast", "STATE.md"),
      matter.stringify("\n# Forecast State Log\n", state),
      "utf-8",
    )
  }

  function experimentRecord(index: number) {
    return {
      run_id: `run-${index.toString().padStart(2, "0")}`,
      model: "ARIMA",
      status: "success" as const,
      metrics: {
        mse: 1 / (index + 1),
        mae: 0.1,
        wape: 0.2,
        mase: 0.3,
      },
      spec: {
        model: "ARIMA",
        eval_split: "val",
      },
      elapsed_seconds: 12,
      timestamp: `2026-03-28T00:${index.toString().padStart(2, "0")}:00.000Z`,
    }
  }

  async function writeExperimentHistory(count: number) {
    const lines = Array.from({ length: count }, (_, index) => JSON.stringify(experimentRecord(index + 1))).join("\n")
    await writeFile(path.join(tmpdir, ".forecast", "history.jsonl"), `${lines}\n`, "utf-8")
  }

  test("update_stop_counters increments no_improvement on non-improvement", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await writeStateWithThresholds()

    const result = await run({
      subcommand: "update_stop_counters",
      stop_counter_input: { improvement: false, crashed: false },
    })
    const output = JSON.parse(result.output)
    const state = await readState()

    expect(output).toMatchObject({
      stop: false,
      reason: "continue",
      hitl_triggered: false,
      counters: {
        consecutive_no_improvement: 1,
        consecutive_crashes: 0,
      },
    })
    expect(state.consecutive_no_improvement).toBe(1)
  })

  test("update_stop_counters resets no_improvement on improvement", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await writeStateWithThresholds({
      consecutive_no_improvement: 2,
      consecutive_crashes: 1,
    })

    const result = await run({
      subcommand: "update_stop_counters",
      stop_counter_input: { improvement: true, crashed: false },
    })
    const output = JSON.parse(result.output)
    const state = await readState()

    expect(output.counters.consecutive_no_improvement).toBe(0)
    expect(output.counters.consecutive_crashes).toBe(0)
    expect(state.consecutive_no_improvement).toBe(0)
    expect(state.consecutive_crashes).toBe(0)
  })

  test("update_stop_counters triggers hitl_triggered at the no-improvement threshold", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await writeStateWithThresholds({
      budget_thresholds: {
        max_experiments: 20,
        no_improvement_rounds: 3,
        crash_threshold: 3,
      },
    })

    let output: Record<string, unknown> | null = null
    for (let index = 0; index < 3; index += 1) {
      output = JSON.parse(
        (
          await run({
            subcommand: "update_stop_counters",
            stop_counter_input: { improvement: false, crashed: false },
          })
        ).output,
      )
    }

    expect(output).not.toBeNull()
    expect(output?.hitl_triggered).toBe(true)
    expect(output?.stop).toBe(false)
  })

  test("update_stop_counters stops with budget_exhausted when max experiments is reached", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await writeStateWithThresholds({
      budget_thresholds: {
        max_experiments: 20,
        no_improvement_rounds: 3,
        crash_threshold: 3,
      },
    })
    await writeExperimentHistory(20)

    const result = await run({
      subcommand: "update_stop_counters",
      stop_counter_input: { improvement: false, crashed: false },
    })
    const output = JSON.parse(result.output)
    const state = await readState()

    expect(output.stop).toBe(true)
    expect(output.reason).toBe("budget_exhausted")
    expect(state.stop_reason).toBe("budget_exhausted")
  })

  test("update_stop_counters stops with crash_threshold after three crashes", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await writeStateWithThresholds({
      budget_thresholds: {
        max_experiments: 20,
        no_improvement_rounds: 3,
        crash_threshold: 3,
      },
    })

    let output: Record<string, unknown> | null = null
    for (let index = 0; index < 3; index += 1) {
      output = JSON.parse(
        (
          await run({
            subcommand: "update_stop_counters",
            stop_counter_input: { improvement: false, crashed: true },
          })
        ).output,
      )
    }

    const state = await readState()

    expect(output).not.toBeNull()
    expect(output?.stop).toBe(true)
    expect(output?.reason).toBe("crash_threshold")
    expect(state.stop_reason).toBe("crash_threshold")
  })

  test("record_expert_feedback appends expert_feedback and resets no_improvement", async () => {
    await run({ subcommand: "init" })
    await writeTaskFile()
    await writeStateWithThresholds({
      consecutive_no_improvement: 2,
    })

    const result = await run({
      subcommand: "record_expert_feedback",
      expert_feedback_text: "Use a longer lookback window",
    })
    const output = JSON.parse(result.output)
    const history = (await readFile(path.join(tmpdir, ".forecast", "history.jsonl"), "utf-8")).trim().split("\n")
    const record = JSON.parse(history.at(-1) ?? "")
    const state = await readState()

    expect(record.type).toBe("expert_feedback")
    expect(record.text).toBe("Use a longer lookback window")
    expect(output).toMatchObject({
      recorded: true,
      counter_reset: true,
      consecutive_no_improvement: 0,
    })
    expect(state.consecutive_no_improvement).toBe(0)
  })
})
