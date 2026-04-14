# CastClaw



![CastClaw Logo](./logo/logo.jpeg)

[Homepage](https://agentr1.github.io/cast-claw/index.html) · [GitHub Repo](https://github.com/SkyeGT/CastClaw) · English · [Chinese](./README_zh.md)

**Autonomous. Multi-agent. Fully interactive.**

Drop in a CSV file and describe what you want to forecast. CastClaw orchestrates three specialized agents across your data—planning task definitions, running parallel model experiments, and generating comparative reports. Built-in reflection learns from each session and grows smarter as you use it.

![CastClaw Architecture](https://img.shields.io/badge/TUI%20%2B%20CLI-Ready-green) ![Python ML Backend](https://img.shields.io/badge/Python%203.10+-Compatible-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🗞️ News

**[2026-03-31]** CastClaw open-sourced with complete documentation and multi-provider LLM support.  

## What makes CastClaw different

🗂️ **It plans before it acts**  
Before running any models, CastClaw drafts a step-by-step forecasting plan and shows it to you. Reorder steps, add domain constraints, then approve—nothing touches your data without explicit consent.

📊 **It runs agents in parallel**  
Upload multiple tables or ask comparative questions. CastClaw automatically assigns a dedicated Forecaster agent to each dataset, runs them in parallel, then synthesizes findings—highlighting where predictions align ([CONSENSUS]) and where they diverge ([UNCERTAIN]).

🤖 **It coordinates three specialized agents**  

- **Planner** — Defines tasks, analyzes data trends & seasonality, generates model recommendations  
- **Forecaster** — Runs 30+ time-series models in parallel experiments with per-trial reflection  
- **Critic** — Compares results, builds interactive visualizations, distills final reports

🧠 **It learns from every session**  
After each forecasting task, CastClaw reflects on what worked and encodes the pattern into a reusable custom skill. Next time you ask something similar, it calls that skill directly—your personal forecasting assistant gets smarter every time.

💾 **It remembers your preferences**  
Captures your domain terminology, preferred metrics, output format, and evaluation priorities across sessions. Every conversation builds on what it learned from your previous work.

🛠️ **It extends with custom skills**  
Write your own skills—prompt templates or embedded Python/SQL logic—and the agents will call them just like built-in skills. Combined with session learning, CastClaw builds a library tailored to your forecasting workflows.

📦 **It manages full experiment lifecycle**  
From automated data preprocessing → parallel model training → metric evaluation → constraint satisfaction → visual report generation. Everything is tracked: run logs, eval metrics, failure histories, and performance comparisons.

⏸️ **It integrates human-in-the-loop feedback**  
Mid-experiment, pause and inject domain knowledge: *"The last 30 days show overfitting—try a smaller look-back window."* Forecaster resets counters and adapts the next trial accordingly. No more black-box automation.

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

After the TUI starts, use `Ctrl+1/2/3` to switch agents. In the **Planner** tab (`Ctrl+1`), describe your task, for example:

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
| Ascend NPU (optional)            | Atlas 800 A2/A3【Ascend HDK 25.5.1】 | Deep learning acceleration on Huawei Ascend |


## 🤖 Supported Models (30+)

**Statistical:** ARIMA, ETS, Theta  
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

## 🎯 Five-Stage Workflow

```
Stage 1 (Planner)    → Task definition & data ingestion
        ↓
Stage 2 (Planner)    → Qualitative & quantitative pre-analysis
        ↓
Stage 3 (Planner)    → Model skill generation & review
        ↓
Stage 4 (Forecaster) → Parallel experiment loops + HITL feedback
        ↓
Stage 5 (Critic)     → Final report, visualizations, comparisons
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
| Pre-experiment planning | ✅ Show plan before execution       | ❌ Execute immediately |
| Multi-table parallelism | ✅ Automatic per-table agents       | ❌ Sequential analysis |
| Session learning        | ✅ Distill skills from interactions | ❌ Stateless           |
| Human-in-the-loop       | ✅ Pause & inject domain feedback   | ❌ Fully automated     |
| Constraint management   | ✅ CAST.md for rules & limits       | ❌ Manual enforcement  |


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
