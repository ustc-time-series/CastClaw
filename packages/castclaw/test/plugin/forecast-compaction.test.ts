import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import {
  buildForecastCompactionPrompt,
  ForecastCompactionPlugin,
  summarizeForecastHistory,
} from "../../src/plugin/forecast-compaction"

describe("plugin.forecast-compaction", () => {
  test("summarizeForecastHistory counts experiment, reflection, and expert feedback records while ignoring invalid lines", () => {
    const summary = summarizeForecastHistory(
      [
        JSON.stringify({
          run_id: "run-1",
          model: "DLinear",
          status: "success",
          metrics: { mse: 0.1, mae: 0.2, wape: 0.3, mase: 0.4 },
          spec: { model: "DLinear" },
          elapsed_seconds: 10,
          timestamp: "2026-03-27T00:00:00.000Z",
        }),
        "not-json",
        JSON.stringify({
          type: "reflection",
          run_id: "run-1",
          effective: true,
          reason: "Improved",
          next_direction: "Try a larger window",
          decision: "keep",
          timestamp: "2026-03-27T00:01:00.000Z",
        }),
        JSON.stringify({
          type: "expert_feedback",
          text: "Try a longer sequence length",
          timestamp: "2026-03-27T00:02:00.000Z",
        }),
      ].join("\n"),
    )

    expect(summary.experimentCount).toBe(1)
    expect(summary.reflectionCount).toBe(1)
    expect(summary.expertFeedbackCount).toBe(1)
    expect(summary.lastExperiment).toEqual({
      run_id: "run-1",
      model: "DLinear",
      status: "success",
    })
    expect(summary.lastReflection).toEqual({
      run_id: "run-1",
      decision: "keep",
      effective: true,
    })
  })

  test("buildForecastCompactionPrompt limits the handoff to .forecast artifacts", () => {
    const prompt = buildForecastCompactionPrompt({
      stateText: "---\nphase: post-forecast\n---\n# Forecast State\n",
      bestText: '{\n  "run_id": "best-run"\n}',
      history: {
        experimentCount: 2,
        reflectionCount: 2,
        expertFeedbackCount: 1,
        lastExperiment: { run_id: "run-2", model: "PatchTST", status: "success" },
        lastReflection: { run_id: "run-2", decision: "keep", effective: true },
      },
    })

    expect(prompt).toContain("`.forecast/` artifacts")
    expect(prompt).toContain("Do not mention or rely on prior Forecaster conversation history")
    expect(prompt).toContain("## .forecast/STATE.md")
    expect(prompt).toContain("## .forecast/best.json")
    expect(prompt).toContain("## History Summary")
    expect(prompt).toContain("Expert feedback entries: 1")
    expect(prompt).toContain("PatchTST (run-2)")
  })

  test("plugin only injects a compaction prompt after the forecast phase reaches post-forecast", async () => {
    const tmpdir = await mkdtemp(path.join(os.tmpdir(), "forecast-compaction-test-"))

    try {
      const forecastRoot = path.join(tmpdir, ".forecast")
      await mkdir(forecastRoot, { recursive: true })
      await writeFile(
        path.join(forecastRoot, "STATE.md"),
        [
          "---",
          "phase: post-forecast",
          "skills_confirmed: true",
          'skills_confirmed_at: "2026-03-27T00:00:00.000Z"',
          "pre_forecast_completed: true",
          'pre_forecast_completed_at: "2026-03-27T00:00:00.000Z"',
          'task_frozen_at: "2026-03-27T00:00:00.000Z"',
          "transitions: []",
          "---",
          "# Forecast State Log",
        ].join("\n"),
        "utf-8",
      )
      await writeFile(path.join(forecastRoot, "best.json"), '{ "run_id": "best-run" }\n', "utf-8")
      await writeFile(
        path.join(forecastRoot, "history.jsonl"),
        JSON.stringify({
          run_id: "best-run",
          model: "DLinear",
          status: "success",
          metrics: { mse: 0.1, mae: 0.2, wape: 0.3, mase: 0.4 },
          spec: { model: "DLinear" },
          elapsed_seconds: 10,
          timestamp: "2026-03-27T00:00:00.000Z",
        }) + "\n",
        "utf-8",
      )

      const hooks = await ForecastCompactionPlugin({
        directory: tmpdir,
        worktree: tmpdir,
        project: {} as never,
        client: {} as never,
        serverUrl: new URL("http://localhost"),
        $: {} as never,
      })

      const output = { context: [], prompt: undefined as string | undefined }
      await hooks["experimental.session.compacting"]?.({ sessionID: "ses_test" }, output)

      expect(output.prompt).toContain("Critic agent")
      expect(output.prompt).toContain(".forecast/STATE.md")
      expect(output.prompt).toContain("best-run")

      await writeFile(
        path.join(forecastRoot, "STATE.md"),
        [
          "---",
          "phase: forecast",
          "skills_confirmed: true",
          'skills_confirmed_at: "2026-03-27T00:00:00.000Z"',
          "pre_forecast_completed: true",
          'pre_forecast_completed_at: "2026-03-27T00:00:00.000Z"',
          'task_frozen_at: "2026-03-27T00:00:00.000Z"',
          "transitions: []",
          "---",
          "# Forecast State Log",
        ].join("\n"),
        "utf-8",
      )

      const skipped = { context: [], prompt: undefined as string | undefined }
      await hooks["experimental.session.compacting"]?.({ sessionID: "ses_test" }, skipped)
      expect(skipped.prompt).toBeUndefined()
    } finally {
      await rm(tmpdir, { recursive: true, force: true })
    }
  })
})
