import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, stat } from "fs/promises"
import os from "os"
import path from "path"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { ForecastSkillTool } from "../../src/tool/forecast/forecast-skill"

const ctx = {
  sessionID: SessionID.make("ses_forecast-skill-test"),
  messageID: MessageID.make("msg_forecast-skill-test"),
  callID: "forecast-skill-test-call",
  agent: "forecast-skill-test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

describe("forecast_skill CRUD", () => {
  let tmpdir: string

  beforeEach(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), "forecast-skill-test-"))
    await mkdir(path.join(tmpdir, ".forecast", "skills"), { recursive: true })
  })

  afterEach(async () => {
    await Instance.disposeAll()
    await rm(tmpdir, { recursive: true, force: true })
  })

  async function run(params: Record<string, unknown>) {
    return Instance.provide({
      directory: tmpdir,
      fn: async () => {
        const tool = await ForecastSkillTool.init()
        return tool.execute(params as never, ctx)
      },
    })
  }

  function skillPath(skillName: string) {
    return path.join(tmpdir, ".forecast", "skills", skillName, "SKILL.md")
  }

  async function writeSkill(
    skillName: string,
    skillDescription = "Linear models for trend dominated series",
    skillContent = "# Linear Models\n\n## Applicable Conditions\n- Strong trend",
  ) {
    return run({
      subcommand: "write",
      skill_name: skillName,
      skill_description: skillDescription,
      skill_content: skillContent,
    })
  }

  test("list returns an empty array when no skills exist", async () => {
    const result = await run({ subcommand: "list" })
    const output = JSON.parse(result.output)

    expect(output.skills).toEqual([])
    expect(output.count).toBe(0)
  })

  test("write creates SKILL.md with the expected YAML frontmatter", async () => {
    await writeSkill("linear-models")

    const content = await readFile(skillPath("linear-models"), "utf-8")
    const lines = content.split("\n")

    expect(lines[0]).toBe("---")
    expect(lines[1]).toBe("name: linear-models")
    expect(lines[2]).toBe("description: Linear models for trend dominated series")
    expect(lines[3]).toBe("---")
    expect(lines[4]).toBe("")
  })

  test("write places the markdown body after the frontmatter block", async () => {
    await writeSkill("linear-models")

    const content = await readFile(skillPath("linear-models"), "utf-8")
    const lines = content.split("\n")

    expect(lines[5]).toBe("# Linear Models")
    expect(content).toContain("## Applicable Conditions")
    expect(content).toContain("- Strong trend")
  })

  test("read returns the full content of a previously written skill", async () => {
    await writeSkill("linear-models")

    const result = await run({ subcommand: "read", skill_name: "linear-models" })
    const output = JSON.parse(result.output)
    const content = await readFile(skillPath("linear-models"), "utf-8")

    expect(output.name).toBe("linear-models")
    expect(output.path).toBe(skillPath("linear-models"))
    expect(output.content).toBe(content)
  })

  test("list returns names and descriptions after writing multiple skills", async () => {
    await writeSkill("linear-models")
    await writeSkill("transformers", "Transformer models for complex seasonality", "# Transformers\n\n## Applicable Conditions\n- Multi scale seasonality")

    const result = await run({ subcommand: "list" })
    const output = JSON.parse(result.output)

    expect(output.count).toBe(2)
    expect(output.skills).toEqual([
      { name: "linear-models", description: "Linear models for trend dominated series" },
      { name: "transformers", description: "Transformer models for complex seasonality" },
    ])
  })

  test("delete removes the skill directory and SKILL.md file", async () => {
    await writeSkill("linear-models")

    const result = await run({ subcommand: "delete", skill_name: "linear-models" })
    const output = JSON.parse(result.output)

    expect(output).toEqual({ deleted: true, name: "linear-models" })
    await expect(stat(path.join(tmpdir, ".forecast", "skills", "linear-models"))).rejects.toThrow()
  })

  test("list after delete no longer includes the removed skill", async () => {
    await writeSkill("linear-models")
    await writeSkill("transformers", "Transformer models for complex seasonality", "# Transformers\n\n## Applicable Conditions\n- Multi scale seasonality")
    await run({ subcommand: "delete", skill_name: "linear-models" })

    const result = await run({ subcommand: "list" })
    const output = JSON.parse(result.output)

    expect(output.count).toBe(1)
    expect(output.skills).toEqual([{ name: "transformers", description: "Transformer models for complex seasonality" }])
  })

  test("read of a missing skill returns an error object", async () => {
    const result = await run({ subcommand: "read", skill_name: "missing-skill" })
    const output = JSON.parse(result.output)

    expect(output.error).toContain('Skill "missing-skill" not found')
  })

  test("delete of a missing skill returns an error object", async () => {
    const result = await run({ subcommand: "delete", skill_name: "missing-skill" })
    const output = JSON.parse(result.output)

    expect(output.error).toBe('Skill directory "missing-skill" not found')
  })
})
