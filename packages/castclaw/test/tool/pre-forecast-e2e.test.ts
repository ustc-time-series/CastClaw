import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { ForecastSkillTool } from "../../src/tool/forecast/forecast-skill"
import { ForecastStateTool } from "../../src/tool/forecast/forecast-state"

const ctx = {
  sessionID: SessionID.make("ses_pre-forecast-e2e"),
  messageID: MessageID.make("msg_pre-forecast-e2e"),
  callID: "pre-forecast-e2e-call",
  agent: "pre-forecast-e2e-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("pre-forecast end-to-end pipeline", () => {
  let tmpdir: string

  beforeEach(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), "pre-forecast-e2e-"))
  })

  afterEach(async () => {
    await Instance.disposeAll()
    await rm(tmpdir, { recursive: true, force: true })
  })

  async function runState(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await ForecastStateTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  async function runSkill(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await ForecastSkillTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  test("full pre-forecast pipeline: init -> analyze -> fuse -> transition -> skills -> confirm -> forecast", async () => {
    const initResult = await runState({ subcommand: "init" })
    const initOutput = JSON.parse(initResult.output)
    expect(initOutput.initialized).toBe(true)

    const forecastRoot = path.join(tmpdir, ".forecast")
    await writeFile(
      path.join(forecastRoot, "task.json"),
      JSON.stringify(
        {
          dataset_path: "data/etth1.csv",
          target_col: "OT",
          time_col: "date",
          pred_len: 96,
          seq_len: 336,
          label_len: 48,
          train_ratio: 0.6,
          val_ratio: 0.2,
          test_ratio: 0.2,
          eval_metrics: ["mse", "mae"],
          model_families: ["linear", "transformer"],
          frozen_at: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf-8",
    )

    await runState({ subcommand: "transition", target_phase: "pre-forecast" })

    const reportsDir = path.join(forecastRoot, "reports")
    await mkdir(reportsDir, { recursive: true })
    await writeFile(
      path.join(reportsDir, "quantitative.json"),
      JSON.stringify(
        {
          dataset_path: "data/etth1.csv",
          target_col: "OT",
          n_rows: 17420,
          n_features: 7,
          analysis: {
            trend: { direction: "upward", strength: 0.72 },
            seasonality: { dominant_period: 24, strength: 0.85 },
            stationarity: { adf_statistic: -2.1, adf_p_value: 0.23, conclusion: "non-stationary" },
            volatility: { level: "moderate", std: 1.45 },
            missing_data: { rate: 0.0, count: 0 },
            anomaly_density: { rate: 0.02, count: 348 },
            distribution_shifts: { count: 2 },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )

    await writeFile(
      path.join(reportsDir, "qualitative.md"),
      [
        "## Domain Overview",
        "Electricity transformer oil temperature data from a Chinese power utility.",
        "",
        "## Key Events and Trends",
        "Seasonal demand peaks in summer and winter.",
        "",
        "## Risk Factors",
        "Equipment degradation over multi-year horizon.",
        "",
        "## Impact on Modeling",
        "Strong 24-hour periodicity suggests periodic models. Non-stationarity requires differencing or adaptive models.",
      ].join("\n"),
      "utf-8",
    )

    await writeFile(
      path.join(tmpdir, "CAST.md"),
      "# Forecasting Constraints\n\n## Model Restrictions\n\nForbidden: pure-LSTM models (too slow for deployment)\nPreferred: linear and lightweight transformer models\n",
      "utf-8",
    )

    await writeFile(
      path.join(reportsDir, "pre-forecast.md"),
      [
        "# Pre-Forecast Report",
        "",
        "## Task Summary",
        "ETTh1 oil temperature forecasting, pred_len=96, seq_len=336",
        "",
        "## Data Characteristics",
        "Strong daily seasonality at period 24, upward trend, non-stationary (ADF p=0.23)",
        "Moderate volatility (std=1.45), 0% missing data, 2% anomaly density, 2 distribution shifts",
        "",
        "## Domain Context",
        "Chinese power utility transformer temperature. Seasonal peaks in summer/winter.",
        "",
        "## Risk Flags",
        "Non-stationarity combined with distribution shifts may cause model drift",
        "",
        "## Modeling Direction Recommendations",
        "1. Linear models (DLinear, NLinear) as fast baselines leveraging periodicity",
        "2. Lightweight transformers (PatchTST, iTransformer) for complex pattern capture",
        "3. Avoid pure-LSTM per CAST.md constraints",
        "",
      ].join("\n"),
      "utf-8",
    )

    await runState({ subcommand: "transition", target_phase: "skills-review" })

    const contextPath = path.join(forecastRoot, "CONTEXT.md")
    const contextContent = await readFile(contextPath, "utf-8")
    expect(contextContent).toContain("# Forecast Context")
    expect(contextContent).toContain("## Constraints")
    expect(contextContent).toContain("Forbidden: pure-LSTM models")
    expect(contextContent).toContain("## Pre-Forecast Summary")
    expect(contextContent).toContain("Strong daily seasonality at period 24")
    expect(contextContent).toContain("## Modeling Directions")
    expect(contextContent).toContain("Linear models")

    await runSkill({
      subcommand: "write",
      skill_name: "linear-baselines",
      skill_description: "Linear models for periodic time series with strong seasonality",
      skill_content: [
        "## Applicable Conditions",
        "Strong seasonality (period 24), upward trend, moderate volatility",
        "",
        "## Parameter Space",
        "Models: DLinear, NLinear",
        "seq_len: 336, pred_len: 96",
        "",
        "## Feature Template",
        '```json\n{"model":"DLinear","seq_len":336,"pred_len":96}\n```',
        "",
        "## Runner Entry Point",
        "python/src/castclaw_ml/runner.py via generate_model tool",
        "",
        "## Risk Warnings",
        "May underfit complex nonlinear patterns in regime-shifted segments",
      ].join("\n"),
    })

    await runSkill({
      subcommand: "write",
      skill_name: "lightweight-transformers",
      skill_description: "Efficient transformer models for complex temporal patterns",
      skill_content: [
        "## Applicable Conditions",
        "Non-stationary data with multiple seasonality patterns and distribution shifts",
        "",
        "## Parameter Space",
        "Models: PatchTST, iTransformer",
        "seq_len: 336, pred_len: 96, d_model: 128-512",
        "",
        "## Feature Template",
        '```json\n{"model":"PatchTST","seq_len":336,"pred_len":96,"d_model":256}\n```',
        "",
        "## Runner Entry Point",
        "python/src/castclaw_ml/runner.py via generate_model tool",
        "",
        "## Risk Warnings",
        "Higher compute cost; may overfit on small datasets",
      ].join("\n"),
    })

    const listResult = await runSkill({ subcommand: "list" })
    const listOutput = JSON.parse(listResult.output)
    const skillNames = listOutput.skills.map((skill: { name: string }) => skill.name).sort()
    expect(skillNames).toEqual(["lightweight-transformers", "linear-baselines"])

    await runState({ subcommand: "confirm_skills" })

    const forecastResult = await runState({ subcommand: "transition", target_phase: "forecast" })
    const forecastOutput = JSON.parse(forecastResult.output)
    expect(forecastOutput.ok).toBe(true)
    expect(forecastOutput.phase).toBe("forecast")

    const artifacts = [
      path.join(reportsDir, "quantitative.json"),
      path.join(reportsDir, "qualitative.md"),
      path.join(reportsDir, "pre-forecast.md"),
      path.join(forecastRoot, "CONTEXT.md"),
      path.join(forecastRoot, "skills", "linear-baselines", "SKILL.md"),
      path.join(forecastRoot, "skills", "lightweight-transformers", "SKILL.md"),
      path.join(forecastRoot, "STATE.md"),
      path.join(forecastRoot, "history.jsonl"),
      path.join(forecastRoot, "best.json"),
    ]

    for (const artifact of artifacts) {
      expect(await Bun.file(artifact).exists()).toBe(true)
    }
  })
})
