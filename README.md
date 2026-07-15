# CastClaw



![CastClaw Logo](./logo/logo.jpeg)

[Homepage](https://ustc-time-series.github.io/cast-claw/) · [GitHub Repo](https://github.com/SkyeGT/CastClaw) · English · [Chinese](./README_zh.md)

**Value-aware. Workflow-learning. Fully interactive.**

Drop in a CSV file and describe what you want to forecast. CastClaw turns interactive task negotiation, offline rule learning, online slow-thinking workflow adaptation, and evidence-backed evaluation into one forecasting workflow. It learns declarative forecasting rules and procedural solving experience, then publishes validated workflows that can be reused, audited, and improved over time.

![CastClaw Architecture](https://img.shields.io/badge/TUI%20%2B%20CLI-Ready-green) ![Python ML Backend](https://img.shields.io/badge/Python%203.10+-Compatible-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🗞️ News

**[2026-07-15]** CastClaw 1.3.0 released: added direct UserPrior submission, new statistical models including ARIMA, AutoARIMA, ETS, Holt, Holt-Winters, and Theta, and more flexible forecasting-window parameters such as stride and forecast_gap. This release also improves dataset splitting by ratio or timestamp, model weight reuse, and persistence for prediction results and evaluation metrics.

**[2026-07-04]** CastClaw adds Prediction Prior workflows: users can provide an existing forecast as a full aligned CSV, skip model search, and let CastClaw validate and improve the prior through deep generative prediction reasoning.

**[2026-06-18]** CastClaw introduces Generative Prediction Reasoning, a validation-checked rule-skill workflow that refines raw forecasts with forecast-time-visible context while preserving raw and adjusted results separately.

**[2026-04-30]** CastClaw 1.2.1 released: Critic Agent now automatically exports the best model file, parameters, and related artifacts as a reusable workflow.

**[2026-04-22]** CastClaw 1.2.0 released with Auto mode, Hugging Face mirror support for foundation models such as Chronos, and UI updates.

**[2026-04-17]** Demo video recorded.

**[2026-03-31]** CastClaw open-sourced with complete documentation and multi-provider LLM support.  

## What makes CastClaw different

🗂️ **It negotiates forecasting tasks with value awareness**

Before running any workflow, CastClaw clarifies what to forecast, when to forecast it, and what feedback should be captured. It formalizes the task, models constraints and preferences, detects uncertainty, and records human feedback as reusable memory.

📚 **It learns rules and experience before deployment**

CastClaw separates offline learning into a rule induction layer and an experience distillation layer. The rule layer extracts data analysis patterns, domain knowledge, and model-tool candidates; the experience layer keeps successful reasoning traces, tool calls, workflow scores, and explainable validation experience.

🧠 **It builds reusable forecasting workflows**

Learned rules and experience are summarized into candidate slow-thinking workflows. Each workflow combines forecasting rules, procedural solving experience, model tools, and validation checks so future tasks can start from proven reasoning paths instead of a blank model search.

🔁 **It adapts workflows online with an agent loop**

For a new test set, CastClaw retrieves relevant rules, experience, and human feedback, instantiates a workflow, schedules tools, generates an initial forecast, checks rule consistency, and iterates through reflection and internal correction until a final prediction is produced.

🧩 **It explains forecasts with case-level evidence**

CastClaw keeps candidate workflows, final predictions, and evidence chains together. Results are not only evaluated by forecast accuracy, but also by workflow validity and case-level reasoning so users can trace why a prediction was made.

🚀 **It publishes validated, deployable workflows**

After evaluation, CastClaw turns effective reasoning paths into deployable workflows. These workflows preserve prediction results, metrics, artifacts, and validation records for later analysis, reproduction, visualization, and reuse.

🔍 **It refines forecasts with validated reasoning skills**
CastClaw can optionally turn forecast-time-visible context—calendar effects, exogenous variables, expert rules, or user-submitted priors—into structured adjustment skills. Each skill is tested on held-out validation data before it can be applied to final forecasts.

🔁 **It can improve your own forecast priors**
If you already have a forecast from another model or business system, submit it as an aligned Prediction Prior CSV. CastClaw can skip model search, validate the prior, and reuse the Generative Prediction Reasoning workflow to improve it.

🛠️ **It extends with custom rules, tools, and skills**

Write your own skills—prompt templates or embedded Python/SQL logic—and CastClaw can use them alongside built-in forecasting tools such as CastSense, CastFeat, CastZoo, Evaluator, and Visualizer.

📦 **It manages the full workflow lifecycle**

From task formalization → rule and experience learning → online workflow adaptation → forecast evaluation → workflow publication. Everything is tracked: run logs, eval metrics, failure histories, evidence chains, artifacts, and performance comparisons.

⏸️ **It keeps humans in the loop**

Ask questions, inject domain knowledge, or correct assumptions during the workflow. CastClaw stores the feedback as experience memory and can retrieve it during later workflow adaptation.

## Quick Start

**Install — npm**

```bash
npm install -g castclaw
```


**Verify**

```bash
castclaw --version
```

**LLM configuration**

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-...

# Or OpenAI / Google / OpenRouter
export OPENAI_API_KEY=sk-...
export GOOGLE_GENERATIVE_AI_API_KEY=...
```

Create `castclaw.json` in your project root (example):

```json
{
  "model": "anthropic/claude-sonnet-4-6"
}
```

**Run**

```bash
cd /path/to/your/dataset
castclaw

# Or pass a model explicitly
castclaw --model anthropic/claude-sonnet-4-6
```

After the TUI starts, use `Ctrl+1/2/3` to move between task planning, forecasting execution, and result review views. In the planning view, describe your task, for example:

```
Initialize a forecasting session for data/etth1.csv. Target: OT, time column: date,
horizon: 96 steps, lookback: 336. Use a 70/20/10 train/val/test split. Evaluate with MSE and MAE.
```

Sample dataset (`datasets.zip`) on [Google Drive](https://drive.google.com/file/d/1HOCE20FQgLl0xCv_dOmLcTbN1RCZWwqd/view?usp=drive_link)


## 📋 Requirements


| Dependency                       | Version   | Purpose                           |
| -------------------------------- | --------- | --------------------------------- |
| [Bun](https://bun.sh)            | ≥ 1.3.11  | Runtime & package manager         |
| [Python](https://python.org)     | ≥ 3.10    | ML backend for time-series models |
| [uv](https://docs.astral.sh/uv/) | Latest    | Python dependency management      |
| GPU (optional)                   | CUDA 12.8 | Deep learning model acceleration  |


## 🤖 Supported Models (30+)

**Statistical:** ARIMA, AutoARIMA, ETS, ExponentialSmoothing, SimpleExponentialSmoothing, Holt, HoltWinters, Theta
**Deep Learning:** DLinear, NLinear, PatchTST, TimesNet, iTransformer, Autoformer, …  
**Foundation Models:** Chronos (Amazon), TimesFM (Google), Moirai (Salesforce)

## 🔧 Configuration

Create `castclaw.json` in your project root:

```jsonc
{
  "model": "anthropic/claude-sonnet-4-6",
  "skills": {
    "paths": ["~/.my-skills/"]
  }
}
```

**LLM Providers:** Supports 20+ via Vercel AI SDK (Anthropic, OpenAI, Google, OpenRouter, …). Set the key for your provider, for example:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or: OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OpenRouter, etc.
```

## 🎯 Four-Stage Workflow Learning Framework

```
Stage 1 → Task negotiation & value-aware interaction
        ↓
Stage 2 → Offline rule learning & experience distillation
        ↓
Stage 3 → Online slow-thinking reasoning & workflow adaptation
        ↓
Stage 4 → Result evaluation & workflow publication
```

## 📚 Documentation

- **[English usage guide](./docs/en/usage.md)** — Installation, workflow, configuration, LLM providers  
- **[Chinese usage guide](./docs/zh/usage.md)** — Same structure as the English guide: install, workflow, configuration, LLM  
- **[Report Issues](https://github.com/SkyeGT/CastClaw/issues)** — GitHub Issues

## 📂 Repository Structure

```
CastClaw/
├── packages/castclaw/    # TUI & CLI core
├── packages/app/         # Browser web interface
├── packages/sdk/         # SDK & runtime
├── python/               # ML backend (30+ models)
├── docs/                 # Usage guides
└── infra/                # Infrastructure (SST)
```

## 🏆 Key Differentiators


| Feature                 | CastClaw                           | Traditional Tools     |
| ----------------------- | ---------------------------------- | --------------------- |
| Value-aware interaction | ✅ Clarifies goals, uncertainty, and feedback | ❌ Static task input |
| Rule-experience learning | ✅ Learns declarative rules and procedural experience | ❌ One-off model runs |
| Workflow adaptation | ✅ Retrieves rules, experience, and feedback online | ❌ Fixed pipelines |
| Evidence-backed evaluation | ✅ Keeps predictions, metrics, and evidence chains together | ❌ Metrics only |
| Workflow publication | ✅ Exports validated reusable workflows | ❌ Manual reuse |


## 🤝 Contributing

Contributions welcome! Please open issues and PRs on [GitHub](https://github.com/SkyeGT/CastClaw).

## 📄 License

MIT License — see [LICENSE](./LICENSE)

## 📫 Contact

- **Issues & Feedback:** [GitHub Issues](https://github.com/SkyeGT/CastClaw/issues)
- **Documentation:** [English](./docs/en/usage.md) · [Chinese](./docs/zh/usage.md)
- **WeChat：**![CastClaw Logo](./logo/feedback.jpg)


## Acknowledgments

This project gratefully acknowledges generous support from the **industry–university cooperation fund** of the **University of Science and Technology of China (USTC)** and **Huawei 2012 Labs Application Scenario Innovation Lab**. Computing resources for development and research are provided through **Huawei’s Ascend AI Hundred-School Program**.

---

**We welcome everyone to use domestic Ascend computing power to run foundation models.**

**Made with ❤️ by the CastClaw team**
