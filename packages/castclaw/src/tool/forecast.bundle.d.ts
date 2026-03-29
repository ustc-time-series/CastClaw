// Auto-generated type declarations for forecast.bundle.js
// Source removed — implementation is in the compiled bundle

import type { Tool } from "./tool"
import type z from "zod"

// ─── Error types ─────────────────────────────────────────────────────────────

export declare const TaskFrozenError: ReturnType<typeof import("@castclaw/util/error").NamedError.create>
export declare const TaskNotFoundError: ReturnType<typeof import("@castclaw/util/error").NamedError.create>
export declare const SpecDuplicateError: ReturnType<typeof import("@castclaw/util/error").NamedError.create>
export declare const IPCError: ReturnType<typeof import("@castclaw/util/error").NamedError.create>
export declare const PhaseGateError: ReturnType<typeof import("@castclaw/util/error").NamedError.create>
export declare const SkillNotConfirmedError: ReturnType<typeof import("@castclaw/util/error").NamedError.create>

// ─── Task & Experiment types ──────────────────────────────────────────────────

export type TaskConfig = {
  dataset_path: string
  target_col: string
  time_col: string
  pred_len: number
  seq_len: number
  label_len: number
  train_ratio: number
  val_ratio: number
  test_ratio: number
  metrics: string[]
  model_families: string[]
  business_context?: string
  csv_semantics?: string
  region?: string
  seasonality_hints?: string
  holiday_effects?: string
  anomaly_periods?: string
}

export type WindowFeatures = {
  trend: string
  seasonality: string
  stationary: boolean
  volatility: string
}

export type ExperimentRecord = {
  run_id: string
  model: string
  family: string
  status: string
  metrics?: Record<string, number>
  spec_hash: string
  started_at: string
  completed_at?: string
  decision?: string
  failure_reason?: string
  window_features?: WindowFeatures
}

export type ReflectionRecord = {
  run_id: string
  reflection: string
  decision: "keep" | "discard"
  recorded_at: string
}

export type ExpertFeedbackRecord = {
  expert_feedback_text: string
  recorded_at: string
}

export type EvalResult = {
  status: string
  run_id: string
  model: string
  metrics?: Record<string, number>
  stderr_tail?: string
}

export type BudgetState = {
  total: number
  consumed: number
  consecutive_no_improvement: number
  consecutive_crashes: number
}

export type BudgetThresholds = {
  max_experiments: number
  max_consecutive_no_improvement: number
  max_consecutive_crashes: number
}

export type StopCheckResult = {
  stop: boolean
  reason?: string
  hitl_triggered: boolean
  counters: {
    consecutive_no_improvement: number
    consecutive_crashes: number
    experiments_remaining: number
  }
}

export type RunnerOutput = {
  run_id: string
  status: string
  model: string
  metrics?: Record<string, number>
  duration_seconds?: number
  stderr_tail?: string
}

export type CompactSummary = {
  run_id: string
  model: string
  status: string
  metrics?: Record<string, number>
  cached?: boolean
  forecast_context?: unknown
}

export type StderrEvent = {
  run_id: string
  line: string
  timestamp: string
}

export type ForecastPhase = "init" | "pre-forecast" | "skills-review" | "forecast" | "post-forecast"

export type PhaseTransitionRecord = {
  from_phase: ForecastPhase
  to_phase: ForecastPhase
  transitioned_at: string
}

export type ForecastPhaseState = {
  phase: ForecastPhase
  task_defined: boolean
  skills_confirmed: boolean
  created_at: string
  updated_at: string
}

// ─── Hash utilities ───────────────────────────────────────────────────────────

export declare function deepSortKeys(obj: unknown): unknown
export declare function computeSpecHash(spec: Record<string, unknown>): string

// ─── Tool instances ───────────────────────────────────────────────────────────

export declare const ForecastTaskTool: Tool.Info
export declare const AnalyzeDatasetTool: Tool.Info
export declare const GenerateModelTool: Tool.Info
export declare const EvaluateExperimentTool: Tool.Info
export declare const ForecastStateTool: Tool.Info
export declare const ForecastSkillTool: Tool.Info
export declare const ForecastReflectTool: Tool.Info
