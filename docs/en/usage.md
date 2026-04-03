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
  - [Phase 2: Pre-Forecast Analysis](#phase-2-pre-forecast-analysis)
  - [Phase 3: Skills Review](#phase-3-skills-review)
  - [Phase 4: Experiment Loop](#phase-4-experiment-loop)
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

```bash
npm install -g castclaw
```

After installation, verify the setup:

```bash
castclaw --version
```

---

## Quick Start

1. Start the interactive TUI from any project directory:

```bash
cd /path/to/your/dataset/project
castclaw
```

2. The TUI opens three tabs — **Planner**, **Forecaster**, and **Critic** — corresponding to the three research phases.

3. Switch between agents with `Ctrl+1`, `Ctrl+2`, `Ctrl+3`.

4. Begin a forecasting session in the **Planner** tab:

```
Define a forecasting task for my energy consumption dataset.
```

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
│   │       ├── train.log       # raw training output
│   │       └── eval.json       # evaluation metrics
│   ├── reports/
│   │   ├── qualitative.md      # domain research report
│   │   ├── quantitative.json   # statistical data analysis
│   │   └── pre-forecast.md     # fused analysis report
│   └── viz/                    # visualization outputs
├── history.jsonl               # full experiment history
├── best.json                   # current best result
└── budget.json                 # experiment budget tracking
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
- Train/val/test split ratios
- Evaluation metrics (MSE, MAE, WAPE, MASE)
- Model families to consider

Example prompt:

```
Initialize a forecasting session for data/etth1.csv.
Target: OT column, time column: date, horizon: 96 steps, lookback: 336.
Use 70/20/10 train/val/test split. Evaluate with MSE and MAE.
Consider all model families.
```

The Planner calls `forecast_state init` to create the `.forecast/` directory, then `forecast_task` to freeze `task.json`.

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

---

### Phase 5: Post-Forecast Report

**Agent: Critic**

After the experiment loop ends (or you explicitly end it), switch to the **Critic** tab (`Ctrl+3`).

The Critic reads all experiment artifacts and produces:

- Per-model-family best results comparison
- Per-condition performance breakdown (trend/seasonality/stationarity conditions)
- Visualization scripts (time-series plots, error distributions)
- Final markdown forecast report

```
Generate the final report.
```

The report is written to `.forecast/reports/final-report.md`.

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

- **Statistical**: ARIMA, ETS, Theta
- **Deep Learning**: DLinear, NLinear, PatchTST, TimesNet, iTransformer, Autoformer, and 30+ more
- **Foundation**: Chronos (Amazon), TimesFM (Google), Moirai (Salesforce)

The runner is invoked by `generate_model` automatically — you do not call it directly.

---

## Configuration

Castclaw reads configuration from `castclaw.json` at your project root (JSONC format):

```jsonc
{
  // LLM provider and model
  "model": "anthropic/claude-sonnet-4-5",

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
castclaw --model openai/gpt-4o
```

Provider prefix format: `<provider>/<model-id>` (e.g., `anthropic/claude-opus-4-6`, `google/gemini-2.0-flash`).
