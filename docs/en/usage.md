# Castclaw Usage Guide

Castclaw is a CLI-based AI agent framework for automated time-series forecasting research. It orchestrates three specialized agents — **Planner**, **Forecaster**, and **Critic** — that collaborate with you to design experiments, run models, and produce forecasting reports.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Forecasting Workflow](#forecasting-workflow)
  - [Phase 1: Initialize](#phase-1-initialize)
    - [Optional: Prediction Prior](#optional-prediction-prior)
  - [Phase 2: Pre-Forecast Analysis](#phase-2-pre-forecast-analysis)
  - [Phase 3: Skills Review](#phase-3-skills-review)
  - [Phase 4: Experiment Loop](#phase-4-experiment-loop)
    - [Optional: Generative Prediction Reasoning](#optional-generative-prediction-reasoning)
  - [Phase 5: Post-Forecast Report](#phase-5-post-forecast-report)
- [Agent Roles](#agent-roles)
- [Constraint File (CAST.md)](#constraint-file-castmd)
- [Tools Reference](#tools-reference)
- [Python Environment](#python-environment)
- [Configuration](#configuration)
- [LLM Providers](#llm-providers)

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Bun](https://bun.sh) | ≥ 1.3.11 | Runtime and package manager |
| [Python](https://python.org) | ≥ 3.10 | ML experiment backend |
| [uv](https://docs.astral.sh/uv/) | latest | Python package manager |
| GPU (optional) | CUDA 12.8 | Required for transformer models; CPU-only is supported |

---

## Installation

**npm**

```bash
npm install -g castclaw
```


After installation, verify the setup:

```bash
castclaw --version
```

---

## Quick Start

1. Start the interactive TUI from your dataset directory:

```bash
cd /path/to/your/dataset
castclaw
```

2. The TUI opens three tabs — **Planner**, **Forecaster**, and **Critic** — corresponding to the three research phases.

3. Switch between agents with `Ctrl+1`, `Ctrl+2`, `Ctrl+3`.

4. Begin a forecasting session in the **Planner** tab, for example:

```
Initialize a forecasting session for data/etth1.csv. Target: OT, time column: date,
horizon: 96 steps, lookback: 336. Use a 70/20/10 train/val/test split. Evaluate with MSE and MAE.
```

Sample dataset (`datasets.zip`) on Google Drive: <https://drive.google.com/file/d/1HOCE20FQgLl0xCv_dOmLcTbN1RCZWwqd/view>

---

## Project Structure

Castclaw creates a `.forecast/` directory in your project to manage all experiment state:

```
your-project/
├── CAST.md                     # (optional) forecasting constraints
├── .forecast/
│   ├── STATE.md                # current phase and session metadata
│   ├── task.json               # frozen task definition (immutable after creation)
│   ├── CONTEXT.md              # compressed context for Critic handoff
│   ├── skills/                 # generated model-family skill files
│   ├── runs/                   # one directory per experiment run
│   │   └── <run_id>/
│   │       ├── predictions.csv # raw prediction outputs
│   │       ├── train.log       # raw training output
│   │       └── eval.json       # raw evaluation metrics
│   ├── user-prior/             # user-submitted prediction-prior manifests (optional)
│   ├── adjustments/            # validated reasoning skills and adjusted outputs (optional)
│   ├── best-model/             # exported final package with raw/adjusted artifacts
│   ├── reports/
│   │   ├── qualitative.md      # domain research report
│   │   ├── quantitative.json   # statistical data analysis
│   │   └── pre-forecast.md     # fused analysis report
│   ├── viz/                    # visualization outputs
│   ├── history.jsonl           # full experiment history
│   ├── best.json               # current best result
│   └── budget.json             # experiment budget tracking
```

---

## Forecasting Workflow

Castclaw follows a structured five-phase pipeline. Phase transitions are enforced by the `forecast_state` tool — you cannot skip phases.

### Phase 1: Initialize

**Agent: Planner**

Start by defining your forecasting task. The Planner will ask for:

- Dataset path (CSV file)
- Target column to forecast
- Time column (datetime index)
- Prediction horizon (how many steps ahead)
- Sequence/look-back length
- Train/val/test split ratios or timestamp boundaries
- Optional forecast gap between the history window and evaluated horizon
- Optional unified window stride for training and evaluation
- Evaluation metrics (MSE, MAE, WAPE, MASE)
- Model families to consider

Example prompt:

```
Initialize a forecasting session for data/etth1.csv.
Target: OT column, time column: date, horizon: 96 steps, lookback: 336.
Use 70/20/10 train/val/test split. Evaluate with MSE and MAE.
Consider all model families.
```

You can also define timestamp splits and non-contiguous windows directly in the prompt:

```
Use timestamp boundaries 2025-06-30 09:30 and 2025-09-30 09:30.
lookback_window = 711, predicted_window = 96, forecast_gap = 57, stride = 96.
```

The Planner calls `forecast_state init` to create the `.forecast/` directory, then `forecast_task` to freeze `task.json`.

#### Optional: Prediction Prior

If you already have an external forecast, CastClaw can use it as a **Prediction Prior**. After the task is defined, CastClaw may ask whether you want to submit a prior CSV.

The prior CSV must be a full dataset aligned with the real dataset: same row count, column names, column order, timestamps, frequency, and exogenous variables. The training target values must stay unchanged; only validation/test target values may be replaced by your prior forecast.

When the prior passes validation, CastClaw enters `UserPrior` mode: it skips model-zoo search and repeated model training, treats the submitted forecast as the raw prediction baseline, and directly runs deep Generative Prediction Reasoning to validate whether the prior can be improved.

**Defining Constraints (optional)**

Before or after init, you can define project-specific constraints in `CAST.md`. Use the built-in skill:

```
/cast-creation
```

This guides you through an interactive dialog to capture domain rules (forbidden models, resource limits, evaluation requirements, etc.).

---

### Phase 2: Pre-Forecast Analysis

**Agent: Planner**

The Planner runs parallel analysis to understand your data before any model runs:

- **Qualitative branch**: web research on the forecasting domain (industry context, events, risks)
- **Quantitative branch**: statistical analysis of your dataset (trend, seasonality, stationarity, volatility, anomalies)

Start analysis:

```
Run pre-forecast analysis.
```

Or use the built-in skill directly:

```
/pre-forecast-workflow
```

The Planner spawns two subagents, waits for both, and fuses the results into `.forecast/reports/pre-forecast.md`. This report drives all subsequent model selection.

---

### Phase 3: Skills Review

**Agent: Planner**

Based on pre-forecast findings, the Planner generates **Skill files** — structured specifications for each recommended model family. Skills capture:

- Applicable conditions (when to use this family)
- Parameter search space
- Feature template (model configuration JSON)
- Risk warnings for this dataset

The Planner presents 2–4 skills for your review. You can request additions, removals, or modifications. Once you confirm:

```
Skills look good, confirm them.
```

The phase transitions to **forecast**.

---

### Phase 4: Experiment Loop

**Agent: Forecaster**

The Forecaster runs experiments using the confirmed Skills. For each experiment:

1. Reads the current best result and recent failure history
2. Selects a model and configuration from the relevant skill
3. Calls `generate_model` to train and evaluate the model
4. Reflects on the result (`forecast_reflect`)
5. Decides keep or discard; updates state
6. Repeats until budget is exhausted or a stop condition triggers

You can observe progress and provide domain feedback at any time:

```
The model seems to overfit on the last 30 days. Try reducing the lookback.
```

The Forecaster records your input as expert feedback, resets the no-improvement counter, and continues.

**Budget controls** (set via `CAST.md` or defaults):
- Max experiments
- Consecutive no-improvement threshold → triggers human-in-the-loop (HITL) pause
- Consecutive crash threshold → stops the loop

#### Optional: Generative Prediction Reasoning

During the Forecaster stage, CastClaw can optionally run **Generative Prediction Reasoning**. In manual mode, CastClaw asks whether to keep raw forecasts, use lightweight reasoning, or use deep reasoning. In Auto mode, the agent can make this decision automatically.

The reasoning workflow is validation-checked:

1. Freeze the eligible source model set or `UserPrior` run.
2. Use the front half of the validation split to build diagnostics from raw predictions, residual patterns, timestamps, horizons, and forecast-time-visible exogenous variables.
3. Ask the LLM to propose structured candidate skills, such as calendar rules, exogenous-variable rules, horizon profiles, or compound rules.
4. Apply each candidate with deterministic code on the back half of the validation split.
5. Lock only validated skills before entering the Critic stage.

Raw predictions are never overwritten. Adjusted predictions, adjusted metrics, candidate manifests, and leakage-audit files are saved separately under `.forecast/adjustments/`.

---

### Phase 5: Post-Forecast Report

**Agent: Critic**

After the experiment loop ends (or you explicitly end it), switch to the **Critic** tab (`Ctrl+3`).

The Critic reads all experiment artifacts and produces:

- Per-model-family best results comparison
- Per-condition performance breakdown (trend/seasonality/stationarity conditions)
- Raw vs. adjusted metric comparison when a reasoning skill is locked
- Leakage-audit status for adjusted outputs
- Visualization scripts (time-series plots, error distributions)
- Final markdown forecast report

```
Generate the final report.
```

The report is written to `.forecast/reports/final-report.md`.

If Generative Prediction Reasoning is enabled, the Critic applies only the skill that was locked before test evaluation. It does not create new adjustment rules from test metrics. Final raw and adjusted artifacts are exported under `.forecast/best-model/`.

---

## Agent Roles

| Agent | Tab | Responsibility |
|---|---|---|
| **Planner** | `Ctrl+1` | Task definition, data analysis, skill generation, phase orchestration |
| **Forecaster** | `Ctrl+2` | Experiment loop — proposes, runs, and reflects on model experiments |
| **Critic** | `Ctrl+3` | Post-experiment analysis, visualization, and final report generation |

Switch between agents at any time with keyboard shortcuts. Each agent maintains independent context but shares the `.forecast/` file protocol.

---

## Constraint File (CAST.md)

`CAST.md` is an optional Markdown file at your project root that defines forecasting constraints. It is automatically loaded into every agent's context.

Example `CAST.md`:

```markdown
# Forecasting Constraints

## Domain Constraints
Energy consumption forecasting for a commercial building in Germany.
Data is subject to GDPR — no external data sharing during analysis.

## Model Restrictions
- No transformer-based models (GPU unavailable on deployment target)
- Must include at least one interpretable model (ARIMA or ETS)

## Resource Limits
- Maximum 30 minutes per experiment
- CPU-only execution

## Evaluation Preferences
- Prioritize MAE over MSE for business reporting
- Must beat naive baseline by at least 10%

## Additional Notes
Holiday effects are significant — German public holidays should be noted in qualitative analysis.
```

Create interactively with `/cast-creation`, or write the file manually.

---

## Tools Reference

Most users do not need to call tools manually. The agents use them to keep the workflow reproducible:

- `forecast_task`: freezes the forecasting task into `.forecast/task.json`.
- `forecast_state`: manages phases, history, budget, best results, skill confirmation, and handoffs.
- `generate_model`: creates one deterministic model run and writes run artifacts.
- `evaluate_experiment`: reads fixed evaluator metrics for a completed run.
- `forecast_reflect`: records per-experiment reflection and next-step decisions.
- `forecast_prediction_prior`: validates and imports user-submitted Prediction Prior datasets.
- `forecast_adjustment_*`: manages Generative Prediction Reasoning policies, source runs, diagnostics, candidate skills, deterministic application, validation, and test evaluation.
- `export_best_model`: exports the final reusable package, including raw and optional adjusted outputs.

---


## Python Environment

The ML backend lives in `python/`. It uses `uv` for dependency management.

```bash
# Install all Python dependencies
cd python
uv sync

# Verify the runner works
uv run python -c "from castclaw_ml import runner; print('OK')"
```

Models are sourced from [Time-Series-Library](https://github.com/thuml/Time-Series-Library). Available model families:

- **Statistical**: ARIMA, AutoARIMA, ETS, ExponentialSmoothing, SimpleExponentialSmoothing, Holt, HoltWinters, Theta
- **Deep Learning**: DLinear, NLinear, PatchTST, TimesNet, iTransformer, Autoformer, and 30+ more
- **Foundation**: Chronos (Amazon), TimesFM (Google), Moirai (Salesforce)

The runner is invoked by `generate_model` automatically — you do not call it directly.

---

## Configuration

Castclaw reads configuration from `castclaw.json` at your project root (JSONC format):

```jsonc
{
  // LLM provider and model
  "model": "anthropic/claude-sonnet-4-6",

  // Additional skill scan paths
  "skills": {
    "paths": ["~/.my-skills/"]
  },

  // Plugin list (npm package names or file:// paths)
  "plugins": []
}
```

Global config lives at `~/.config/castclaw/castclaw.json`.

---

## LLM Providers

Castclaw supports 20+ LLM providers via the [Vercel AI SDK](https://sdk.vercel.ai). Set your API key as an environment variable:

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# Google Gemini
export GOOGLE_GENERATIVE_AI_API_KEY=...

# OpenRouter (access many models via one key)
export OPENROUTER_API_KEY=...
```

Then specify the model in `castclaw.json` or at startup:

```bash
castclaw --model anthropic/claude-sonnet-4-6
```

Provider prefix format: `<provider>/<model-id>` (e.g., `anthropic/claude-opus-4-6`, `google/gemini-2.0-flash`).
