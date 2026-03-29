import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { EvaluateExperimentTool } from "../../src/tool/forecast/evaluate-experiment"
import { ForecastReflectTool } from "../../src/tool/forecast/forecast-reflect"
import { ForecastStateTool } from "../../src/tool/forecast/forecast-state"
import { GenerateModelTool } from "../../src/tool/forecast/generate-model"
import { computeSpecHash } from "../../src/tool/forecast/hash"
import { Filesystem } from "../../src/util/filesystem"

const ctx = {
  sessionID: SessionID.make("ses_forecast-integration-test"),
  messageID: MessageID.make("msg_forecast-integration-test"),
  callID: "forecast-integration-test-call",
  agent: "forecast-integration-test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

const repoRoot = path.resolve(import.meta.dir, "../../../..")
const ETTH1_PATH = path.join(repoRoot, "finaltest", "ETTh1.csv")
const HAVE_FIXTURES = await Filesystem.exists(ETTH1_PATH)
const describeIfFixtures = HAVE_FIXTURES ? describe : describe.skip

type Backup = {
  target: string
  backup: string | null
}

function createTaskConfig(datasetPath: string) {
  return {
    dataset_path: datasetPath,
    target_col: "OT",
    time_col: "date",
    pred_len: 12,
    seq_len: 24,
    label_len: 12,
    train_ratio: 0.7,
    val_ratio: 0.1,
    test_ratio: 0.2,
    eval_metrics: ["mse", "mae", "wape", "mase"],
    model_families: ["ARIMA", "DLinear"],
    frozen_at: "2026-03-28T00:00:00.000Z",
  }
}

function createArimaSpec() {
  return {
    model: "ARIMA",
    dataset_path: ETTH1_PATH,
    target_col: "OT",
    time_col: "date",
    freq: "h",
    train_ratio: 0.7,
    val_ratio: 0.1,
    test_ratio: 0.2,
    seq_len: 24,
    pred_len: 12,
    label_len: 12,
    phase: "forecast",
    eval_split: "val",
    seed: 42,
    hyperparams: { order: [1, 1, 1] },
    metrics: ["mse", "mae", "wape", "mase"],
  }
}

async function writeTaskFile(directory: string, datasetPath: string) {
  await writeFile(
    path.join(directory, ".forecast", "task.json"),
    JSON.stringify(createTaskConfig(datasetPath), null, 2),
    "utf-8",
  )
}

async function moveAsideIfExists(target: string): Promise<Backup> {
  if (!(await Filesystem.exists(target))) {
    return { target, backup: null }
  }

  const backup = `${target}.phase06test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  await rename(target, backup)
  return { target, backup }
}

async function restoreBackup(item: Backup) {
  await rm(item.target, { recursive: true, force: true })
  if (item.backup) {
    await rename(item.backup, item.target)
  }
}

function experimentRecord(runId: string) {
  return {
    run_id: runId,
    model: "ARIMA",
    status: "success" as const,
    metrics: { mse: 0.05, mae: 0.18, wape: 0.12, mase: 0.95 },
    spec: { model: "ARIMA", eval_split: "val" },
    elapsed_seconds: 12,
    timestamp: "2026-03-28T00:00:00.000Z",
  }
}

describeIfFixtures("generate_model with real Python subprocess", () => {
  const rootForecastPath = path.join(repoRoot, ".forecast")
  const rootConfigPath = path.join(repoRoot, "castclaw.json")
  let backups: Backup[] = []

  beforeEach(async () => {
    backups = [
      await moveAsideIfExists(rootForecastPath),
      await moveAsideIfExists(rootConfigPath),
    ]
  })

  afterEach(async () => {
    await Instance.disposeAll()
    for (const backup of backups.reverse()) {
      await restoreBackup(backup)
    }
    backups = []
  })

  test("generate_model with ARIMA spec returns a structured run result and creates artifacts", async () => {
    const spec = createArimaSpec()
    const expectedRunId = computeSpecHash(spec)

    const result = await Instance.provide({
      directory: repoRoot,
      fn: async () => {
        const stateTool = await ForecastStateTool.init()
        await stateTool.execute({ subcommand: "init" }, ctx)
        await writeTaskFile(repoRoot, ETTH1_PATH)

        const tool = await GenerateModelTool.init()
        return tool.execute({ spec }, ctx)
      },
    })

    const output = JSON.parse(result.output)
    const runDir = path.join(repoRoot, ".forecast", "runs", output.run_id)

    expect(output.run_id).toBe(expectedRunId)
    expect(["success", "crash"]).toContain(output.status)
    expect(await Filesystem.exists(runDir)).toBe(true)

    if (output.status === "success") {
      expect(await Filesystem.exists(path.join(runDir, "train.log"))).toBe(true)
      expect(await Filesystem.exists(path.join(runDir, "actual.npy"))).toBe(true)
      expect(await Filesystem.exists(path.join(runDir, "pred.npy"))).toBe(true)
    }
  })

  test("generate_model returns a cached result on the second identical spec run", async () => {
    const spec = createArimaSpec()

    const toolResult = await Instance.provide({
      directory: repoRoot,
      fn: async () => {
        const stateTool = await ForecastStateTool.init()
        await stateTool.execute({ subcommand: "init" }, ctx)
        await writeTaskFile(repoRoot, ETTH1_PATH)

        const tool = await GenerateModelTool.init()
        const first = JSON.parse((await tool.execute({ spec }, ctx)).output)
        const second = JSON.parse((await tool.execute({ spec }, ctx)).output)
        return { first, second }
      },
    })

    expect(toolResult.first.run_id).toBe(toolResult.second.run_id)
    expect(toolResult.second.status).toBe("cached")
    expect(toolResult.second.cached).toBe(true)
  })
})

describe("forecast integration helpers", () => {
  let tmpdir: string

  beforeEach(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), "forecast-integration-test-"))
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

  async function runEvaluate(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await EvaluateExperimentTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  async function runReflect(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await ForecastReflectTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  async function initForecastTask() {
    await runState({ subcommand: "init" })
    await writeTaskFile(tmpdir, "/tmp/ETTh1.csv")
  }

  async function writeEvalFixture(runId: string, overrides: Record<string, unknown> = {}) {
    const runDir = path.join(tmpdir, ".forecast", "runs", runId)
    await rm(runDir, { recursive: true, force: true })
    await mkdir(runDir, { recursive: true })
    await writeFile(
      path.join(runDir, "eval.json"),
      JSON.stringify(
        {
          run_id: runId,
          evaluator_hash: "abc123deadbeef",
          spec_hash: runId,
          metrics: { mse: 0.05, mae: 0.18, wape: 0.12, mase: 0.95 },
          eval_split: "val",
          timestamp: "2026-01-01T00:00:00.000Z",
          ...overrides,
        },
        null,
        2,
      ),
      "utf-8",
    )
    await writeFile(path.join(runDir, "spec.json"), JSON.stringify({ model: "ARIMA", eval_split: "val" }, null, 2), "utf-8")
  }

  test("evaluate_experiment returns metrics for a synthetic eval.json", async () => {
    await writeEvalFixture("test-run-001")

    const result = await runEvaluate({ run_id: "test-run-001" })
    const output = JSON.parse(result.output)

    expect(output.status).toBe("success")
    expect(output.metrics.mse).toBe(0.05)
    expect(output.metrics.mae).toBe(0.18)
    expect(output.metrics.mase === null || typeof output.metrics.mase === "number").toBe(true)
  })

  test("evaluate_experiment is deterministic for identical eval.json input", async () => {
    await writeEvalFixture("test-run-002")

    const first = JSON.parse((await runEvaluate({ run_id: "test-run-002" })).output)
    const second = JSON.parse((await runEvaluate({ run_id: "test-run-002" })).output)

    expect(second.metrics.mse).toBe(first.metrics.mse)
    expect(second.metrics.mae).toBe(first.metrics.mae)
    expect(second.metrics.wape).toBe(first.metrics.wape)
    expect(second.evaluator_hash).toBe(first.evaluator_hash)
  })

  test("evaluate_experiment returns evaluator_hash directly from eval.json", async () => {
    await writeEvalFixture("test-run-003", { evaluator_hash: "abc123deadbeef" })

    const first = JSON.parse((await runEvaluate({ run_id: "test-run-003" })).output)
    const second = JSON.parse((await runEvaluate({ run_id: "test-run-003" })).output)

    expect(first.evaluator_hash).toBe("abc123deadbeef")
    expect(second.evaluator_hash).toBe("abc123deadbeef")
  })

  test("append writes an experiment record without a type discriminant", async () => {
    await initForecastTask()

    await runState({
      subcommand: "append",
      record: experimentRecord("append-run-001"),
    })

    const lines = (await readFile(path.join(tmpdir, ".forecast", "history.jsonl"), "utf-8")).trim().split("\n")
    const record = JSON.parse(lines.at(-1) ?? "")

    expect(record.run_id).toBe("append-run-001")
    expect(record.model).toBe("ARIMA")
    expect(record.status).toBe("success")
    expect(record.elapsed_seconds).toBe(12)
    expect(record.timestamp).toBe("2026-03-28T00:00:00.000Z")
    expect("type" in record).toBe(false)
  })

  test("history.jsonl accumulates experiment, reflection, and expert_feedback in order", async () => {
    await initForecastTask()

    await runState({
      subcommand: "append",
      record: experimentRecord("history-run-001"),
    })
    await runReflect({
      run_id: "history-run-001",
      effective: true,
      reason: "Validation error improved",
      next_direction: "Try a longer window",
      decision: "keep",
    })
    await runState({
      subcommand: "record_expert_feedback",
      expert_feedback_text: "Investigate holiday effects",
    })

    const lines = (await readFile(path.join(tmpdir, ".forecast", "history.jsonl"), "utf-8")).trim().split("\n")
    const experiment = JSON.parse(lines[0])
    const reflection = JSON.parse(lines[1])
    const feedback = JSON.parse(lines[2])

    expect("type" in experiment).toBe(false)
    expect(reflection.type).toBe("reflection")
    expect(feedback.type).toBe("expert_feedback")
  })
})
