import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { AnalyzeDatasetTool } from "../../src/tool/forecast/analyze-dataset"

const ctx = {
  sessionID: SessionID.make("ses_analyze-dataset-test"),
  messageID: MessageID.make("msg_analyze-dataset-test"),
  callID: "analyze-dataset-test-call",
  agent: "analyze-dataset-test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("analyze_dataset tool", () => {
  let tmpdir: string

  beforeEach(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), "analyze-dataset-test-"))
  })

  afterEach(async () => {
    await Instance.disposeAll()
    await rm(tmpdir, { recursive: true, force: true })
  })

  async function run(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await AnalyzeDatasetTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  test("throws TaskNotFoundError when task.json is missing", async () => {
    await mkdir(path.join(tmpdir, ".forecast"), { recursive: true })
    await expect(run({})).rejects.toThrow("TaskNotFoundError")
  })

  test("returns error output when analyzer script is not found", async () => {
    const forecastDir = path.join(tmpdir, ".forecast")
    await mkdir(forecastDir, { recursive: true })
    await writeFile(
      path.join(forecastDir, "task.json"),
      JSON.stringify({
        dataset_path: "nonexistent.csv",
        target_col: "value",
        time_col: "date",
      }),
      "utf-8",
    )

    const result = await run({})
    const output = JSON.parse(result.output)

    expect(output.status).toBe("error")
    expect(output.exit_code).not.toBe(0)
  })
})
