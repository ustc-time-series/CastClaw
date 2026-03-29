import type { Plugin as PluginInstance } from "@castclaw/plugin"
import { readFile } from "fs/promises"
import matter from "gray-matter"
import path from "path"
import { ExperimentRecord, ExpertFeedbackRecord, ForecastPhaseState, ReflectionRecord } from "@/tool/forecast.bundle.js"

export type ForecastHistorySummary = {
  experimentCount: number
  reflectionCount: number
  expertFeedbackCount: number
  lastExperiment:
    | {
        run_id: string
        model: string
        status: string
      }
    | null
  lastReflection:
    | {
        run_id: string
        decision: string
        effective: boolean
      }
    | null
}

export function summarizeForecastHistory(raw: string): ForecastHistorySummary {
  const summary: ForecastHistorySummary = {
    experimentCount: 0,
    reflectionCount: 0,
    expertFeedbackCount: 0,
    lastExperiment: null,
    lastReflection: null,
  }

  for (const line of raw.split("\n").filter(Boolean)) {
    try {
      const parsed = JSON.parse(line)

      const feedback = ExpertFeedbackRecord.safeParse(parsed)
      if (feedback.success) {
        summary.expertFeedbackCount += 1
        continue
      }

      const reflection = ReflectionRecord.safeParse(parsed)
      if (reflection.success) {
        summary.reflectionCount += 1
        summary.lastReflection = {
          run_id: reflection.data.run_id,
          decision: reflection.data.decision,
          effective: reflection.data.effective,
        }
        continue
      }

      const experiment = ExperimentRecord.safeParse(parsed)
      if (experiment.success) {
        summary.experimentCount += 1
        summary.lastExperiment = {
          run_id: experiment.data.run_id,
          model: experiment.data.model,
          status: experiment.data.status,
        }
      }
    } catch {
      // Ignore invalid JSON lines so compaction can still proceed.
    }
  }

  return summary
}

export function buildForecastCompactionPrompt(input: {
  stateText: string
  bestText: string
  history: ForecastHistorySummary
}): string {
  const { stateText, bestText, history } = input

  return [
    "Create the compacted handoff prompt for the Critic agent using only the `.forecast/` artifacts below.",
    "Do not mention or rely on prior Forecaster conversation history, tool traces, or unrelated repository files.",
    "The resulting compacted context should describe forecast outcomes, reflections, and the remaining Critic work only.",
    "",
    "## Artifact Rules",
    "- Only summarize information present in `.forecast/STATE.md`, `.forecast/best.json`, or `.forecast/history.jsonl`.",
    "- Treat these artifacts as the entire durable context for the Critic handoff.",
    "- Keep the handoff concise and operational.",
    "",
    "## .forecast/STATE.md",
    "```md",
    stateText.trim() || "_Empty state file._",
    "```",
    "",
    "## .forecast/best.json",
    "```json",
    bestText.trim() || "null",
    "```",
    "",
    "## History Summary",
    `- Experiments recorded: ${history.experimentCount}`,
    `- Reflections recorded: ${history.reflectionCount}`,
    `- Expert feedback entries: ${history.expertFeedbackCount}`,
    history.lastExperiment
      ? `- Last experiment: ${history.lastExperiment.model} (${history.lastExperiment.run_id}) status=${history.lastExperiment.status}`
      : "- Last experiment: none recorded",
    history.lastReflection
      ? `- Last reflection: ${history.lastReflection.run_id} decision=${history.lastReflection.decision} effective=${history.lastReflection.effective}`
      : "- Last reflection: none recorded",
    "",
    "Produce the compacted continuation prompt that the Critic should receive next.",
  ].join("\n")
}

function normalizePhaseStateFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const normalizeValue = (value: unknown) => (value instanceof Date ? value.toISOString() : value)

  return {
    ...data,
    skills_confirmed_at: normalizeValue(data.skills_confirmed_at),
    pre_forecast_completed_at: normalizeValue(data.pre_forecast_completed_at),
    task_frozen_at: normalizeValue(data.task_frozen_at),
    transitions: Array.isArray(data.transitions)
      ? data.transitions.map((transition) => {
          if (!transition || typeof transition !== "object") return transition
          const record = transition as Record<string, unknown>
          return { ...record, at: normalizeValue(record.at) }
        })
      : data.transitions,
  }
}

export const ForecastCompactionPlugin: PluginInstance = async (input) => {
  return {
    "experimental.session.compacting": async (_hookInput, output) => {
      const forecastRoot = path.join(input.directory, ".forecast")
      const statePath = path.join(forecastRoot, "STATE.md")
      const stateRaw = await readFile(statePath, "utf-8").catch(() => null)
      if (!stateRaw) return

      let state
      try {
        state = ForecastPhaseState.parse(normalizePhaseStateFrontmatter(matter(stateRaw).data))
      } catch {
        return
      }

      if (state.phase !== "post-forecast") return

      const bestText = await readFile(path.join(forecastRoot, "best.json"), "utf-8").catch(() => "null\n")
      const historyRaw = await readFile(path.join(forecastRoot, "history.jsonl"), "utf-8").catch(() => "")

      output.prompt = buildForecastCompactionPrompt({
        stateText: stateRaw,
        bestText,
        history: summarizeForecastHistory(historyRaw),
      })
    },
  }
}
