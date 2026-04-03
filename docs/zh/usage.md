# Castclaw 使用指南

Castclaw 是一个基于 CLI 的 AI 智能体框架，专为自动化时间序列预测研究而设计。它编排三个专属智能体——**规划者（Planner）**、**预测者（Forecaster）**、**评审者（Critic）**——与你协作完成实验设计、模型运行和预测报告生成。

---

## 目录

- [前置要求](#前置要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [预测工作流](#预测工作流)
  - [阶段一：初始化](#阶段一初始化)
  - [阶段二：预测前分析](#阶段二预测前分析)
  - [阶段三：技能审核](#阶段三技能审核)
  - [阶段四：实验循环](#阶段四实验循环)
  - [阶段五：后置报告](#阶段五后置报告)
- [智能体角色](#智能体角色)
- [约束文件（CAST.md）](#约束文件-castmd)
- [工具参考](#工具参考)
- [Python 环境](#python-环境)
- [配置](#配置)
- [LLM 提供商](#llm-提供商)

---

## 前置要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| [Bun](https://bun.sh) | ≥ 1.3.11 | 运行时与包管理器 |
| [Python](https://python.org) | ≥ 3.10 | ML 实验后端 |
| [uv](https://docs.astral.sh/uv/) | 最新版 | Python 包管理器 |
| GPU（可选） | CUDA 12.8 | Transformer 类模型所需；支持纯 CPU 运行 |

---

## 安装

```bash
npm install -g castclaw
```

验证安装是否成功：

```bash
castclaw --version
```

---

## 快速开始

1. 在任意项目目录启动交互式 TUI：

```bash
cd /path/to/your/dataset/project
castclaw
```

2. TUI 界面包含三个标签页——**Planner**、**Forecaster**、**Critic**——分别对应三个研究阶段。

3. 使用 `Ctrl+1`、`Ctrl+2`、`Ctrl+3` 切换智能体。

4. 在 **Planner** 标签页中开始一个预测会话：

```
帮我定义一个能源消耗数据集的预测任务。
```

---

## 项目结构

Castclaw 在你的项目目录下创建 `.forecast/` 文件夹，用于管理所有实验状态：

```
your-project/
├── CAST.md                     # （可选）预测约束定义文件
├── .forecast/
│   ├── STATE.md                # 当前阶段与会话元数据
│   ├── task.json               # 冻结的任务定义（创建后不可修改）
│   ├── CONTEXT.md              # 为 Critic 交接准备的压缩上下文
│   ├── skills/                 # 生成的模型族技能文件
│   ├── runs/                   # 每次实验一个目录
│   │   └── <run_id>/
│   │       ├── train.log       # 原始训练日志
│   │       └── eval.json       # 评估指标
│   ├── reports/
│   │   ├── qualitative.md      # 领域研究报告
│   │   ├── quantitative.json   # 统计数据分析
│   │   └── pre-forecast.md     # 融合分析报告
│   └── viz/                    # 可视化输出
├── history.jsonl               # 完整实验历史
├── best.json                   # 当前最佳结果
└── budget.json                 # 实验预算追踪
```

---

## 预测工作流

Castclaw 遵循严格的五阶段流水线。阶段转换由 `forecast_state` 工具强制执行——不可跳过阶段。

### 阶段一：初始化

**使用智能体：Planner**

首先定义预测任务。Planner 会引导你提供：

- 数据集路径（CSV 文件）
- 预测目标列
- 时间列（日期时间索引）
- 预测步长（Horizon，向前预测多少步）
- 回看序列长度（Look-back）
- 训练/验证/测试分割比例
- 评估指标（MSE、MAE、WAPE、MASE）
- 考虑的模型族

示例提示词：

```
为 data/etth1.csv 初始化一个预测会话。
目标列：OT，时间列：date，预测步长：96 步，回看长度：336。
采用 70/20/10 训练/验证/测试分割。使用 MSE 和 MAE 评估。
考虑所有模型族。
```

Planner 会调用 `forecast_state init` 创建 `.forecast/` 目录，然后调用 `forecast_task` 冻结 `task.json`。

**定义约束（可选）**

可以在 `CAST.md` 中定义项目专属约束。使用内置技能：

```
/cast-creation
```

这将启动交互式对话，引导你捕获领域规则（禁用模型、资源限制、评估要求等）。

---

### 阶段二：预测前分析

**使用智能体：Planner**

Planner 在运行任何模型之前，先并行分析你的数据：

- **定性分析**：网络调研预测领域（行业背景、关键事件、风险因素）
- **定量分析**：数据集统计分析（趋势、季节性、平稳性、波动率、异常值）

启动分析：

```
运行预测前分析。
```

或直接使用内置技能：

```
/pre-forecast-workflow
```

Planner 会并发启动两个子智能体，等待双方完成后将结果融合为 `.forecast/reports/pre-forecast.md`。该报告将驱动后续所有模型选择决策。

---

### 阶段三：技能审核

**使用智能体：Planner**

基于预测前分析结果，Planner 生成**技能文件（Skill）**——每个推荐模型族的结构化规格说明，包含：

- 适用条件（何时使用该模型族）
- 参数搜索空间
- 特征模板（模型配置 JSON）
- 针对本数据集的风险警告

Planner 会提供 2–4 个技能供你审核。你可以请求增加、删除或修改。确认后：

```
技能看起来没问题，确认它们。
```

阶段随即过渡到**实验循环**。

---

### 阶段四：实验循环

**使用智能体：Forecaster**

Forecaster 使用已确认的技能运行实验。每轮实验：

1. 读取当前最佳结果和近期失败历史
2. 从对应技能中选取模型与配置
3. 调用 `generate_model` 训练并评估模型
4. 进行反思记录（`forecast_reflect`）
5. 决定保留或丢弃结果，更新状态
6. 重复，直到预算耗尽或触发停止条件

你可以随时观察进度并提供领域反馈：

```
模型似乎在最后 30 天过拟合了，尝试减小回看长度。
```

Forecaster 会将你的输入作为专家反馈记录，重置无改善计数器，然后继续。

**预算控制**（通过 `CAST.md` 设置或使用默认值）：
- 最大实验次数
- 连续无改善阈值 → 触发人机协作（HITL）暂停
- 连续崩溃阈值 → 停止循环

---

### 阶段五：后置报告

**使用智能体：Critic**

实验循环结束后（或你主动结束时），切换到 **Critic** 标签页（`Ctrl+3`）。

Critic 读取所有实验产物并生成：

- 各模型族最佳结果对比
- 按时序特征（趋势/季节性/平稳性）的性能分解
- 可视化脚本（时间序列图、误差分布图）
- 最终 Markdown 预测报告

```
生成最终报告。
```

报告输出至 `.forecast/reports/final-report.md`。

---

## 智能体角色

| 智能体 | 标签页 | 职责 |
|---|---|---|
| **Planner（规划者）** | `Ctrl+1` | 任务定义、数据分析、技能生成、阶段编排 |
| **Forecaster（预测者）** | `Ctrl+2` | 实验循环——提议、运行、反思模型实验 |
| **Critic（评审者）** | `Ctrl+3` | 实验后分析、可视化、最终报告生成 |

可以随时使用快捷键切换智能体。每个智能体维护独立上下文，但共享 `.forecast/` 文件协议。

---

## 约束文件 (CAST.md)

`CAST.md` 是项目根目录下的可选 Markdown 文件，用于定义预测约束。它会被自动加载到每个智能体的上下文中。

示例 `CAST.md`：

```markdown
# Forecasting Constraints

## 领域约束
德国某商业楼宇的能源消耗预测。
数据遵守 GDPR 规定——分析过程中不允许共享到外部。

## 模型限制
- 不使用基于 Transformer 的模型（部署目标不支持 GPU）
- 必须包含至少一个可解释模型（ARIMA 或 ETS）

## 资源限制
- 每次实验最长 30 分钟
- 仅 CPU 执行

## 评估偏好
- 业务报告优先使用 MAE 而非 MSE
- 必须比朴素基线（Naive Baseline）好至少 10%

## 附加说明
节假日效应显著——定性分析中应标注德国法定节假日。
```

使用 `/cast-creation` 交互式创建，或直接手动编写文件。


## Python 环境

ML 后端位于 `python/` 目录，使用 `uv` 进行依赖管理。

```bash
# 安装所有 Python 依赖
cd python
uv sync

# 验证运行器是否正常
uv run python -c "from castclaw_ml import runner; print('OK')"
```

可用模型族：

- **统计模型**：ARIMA、ETS、Theta
- **深度学习**：DLinear、NLinear、PatchTST、TimesNet、iTransformer、Autoformer 等 30+ 个
- **基础模型**：Chronos（亚马逊）、TimesFM（谷歌）、Moirai（Salesforce）

运行器由 `generate_model` 工具自动调用，无需手动执行。

---

## 配置

Castclaw 从项目根目录的 `castclaw.json`（JSONC 格式）读取配置：

```jsonc
{
  // LLM 提供商与模型
  "model": "anthropic/claude-sonnet-4-5",

  // 额外的技能扫描路径
  "skills": {
    "paths": ["~/.my-skills/"]
  },

  // 插件列表（npm 包名或 file:// 路径）
  "plugins": []
}
```

全局配置位于 `~/.config/castclaw/castclaw.json`。

---

## LLM 提供商

Castclaw 通过 [Vercel AI SDK](https://sdk.vercel.ai) 支持 20+ 个 LLM 提供商。将 API 密钥设置为环境变量：

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# Google Gemini
export GOOGLE_GENERATIVE_AI_API_KEY=...

# OpenRouter（通过单一密钥访问众多模型）
export OPENROUTER_API_KEY=...
```

在 `castclaw.json` 中指定模型，或在启动时通过参数传入：

```bash
castclaw --model openai/gpt-4o
```

提供商格式：`<provider>/<model-id>`（例如 `anthropic/claude-opus-4-6`、`google/gemini-2.0-flash`）。
