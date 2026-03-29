import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { ForecastReflectTool } from "../../src/tool/forecast/forecast-reflect"

const ctx = {
  sessionID: SessionID.make("ses_forecast-reflect-test"),
  messageID: MessageID.make("msg_forecast-reflect-test"),
  callID: "forecast-reflect-test-call",
  agent: "forecast-reflect-test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("forecast_reflect tool", () => {
  let tmpdir: string

  beforeEach(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), "forecast-reflect-test-"))
  })

  afterEach(async () => {
    await Instance.disposeAll()
    await rm(tmpdir, { recursive: true, force: true })
  })

  async function run(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await ForecastReflectTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  function historyPath() {
    return path.join(tmpdir, ".forecast", "history.jsonl")
  }

  test("appends a reflection record to history.jsonl", async () => {
    await mkdir(path.join(tmpdir, ".forecast"), { recursive: true })
    await writeFile(historyPath(), "", "utf-8")

    await run({
      run_id: "abc123",
      effective: true,
      reason: "MSE improved by 15%",
      next_direction: "Try larger seq_len",
      decision: "keep",
    })

    const history = await readFile(historyPath(), "utf-8")
    const record = JSON.parse(history.trim())

    expect(record.type).toBe("reflection")
    expect(record.run_id).toBe("abc123")
    expect(record.effective).toBe(true)
    expect(record.decision).toBe("keep")
    expect(Number.isNaN(Date.parse(record.timestamp))).toBe(false)
  })

  test("creates the .forecast directory when it is missing", async () => {
    await run({
      run_id: "new-run",
      effective: false,
      reason: "Baseline remained stronger",
      next_direction: "Reduce model complexity",
      decision: "discard",
    })

    const history = await readFile(historyPath(), "utf-8")
    const record = JSON.parse(history.trim())

    expect(record.type).toBe("reflection")
    expect(record.run_id).toBe("new-run")
    expect(record.decision).toBe("discard")
  })

  test("appends to existing history without overwriting experiment records", async () => {
    await mkdir(path.join(tmpdir, ".forecast"), { recursive: true })
    await writeFile(
      historyPath(),
      `${JSON.stringify({
        run_id: "exp-1",
        model: "DLinear",
        status: "success",
        metrics: { mse: 1.2, mae: 0.8, wape: 0.15, mase: 0.9 },
        spec: { model: "DLinear" },
        decision: "keep",
        elapsed_seconds: 12,
        timestamp: "2026-03-27T00:00:00.000Z",
      })}\n`,
      "utf-8",
    )

    await run({
      run_id: "exp-1",
      effective: true,
      reason: "This run became the new best",
      next_direction: "Probe a longer input window",
      decision: "keep",
    })

    const lines = (await readFile(historyPath(), "utf-8")).trim().split("\n")
    const first = JSON.parse(lines[0])
    const second = JSON.parse(lines[1])

    expect(lines).toHaveLength(2)
    expect(first.status).toBe("success")
    expect(second.type).toBe("reflection")
    expect(second.run_id).toBe("exp-1")
  })

  test("returns structured confirmation output", async () => {
    const result = await run({
      run_id: "run-output",
      effective: false,
      reason: "Validation error increased",
      next_direction: "Try a smaller seq_len",
      decision: "discard",
    })
    const output = JSON.parse(result.output)

    expect(output).toEqual({
      recorded: true,
      run_id: "run-output",
      decision: "discard",
      effective: false,
    })
  })
})
