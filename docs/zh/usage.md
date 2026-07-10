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
    - [可选：预测先验](#可选预测先验)
  - [阶段二：预测前分析](#阶段二预测前分析)
  - [阶段三：技能审核](#阶段三技能审核)
  - [阶段四：实验循环](#阶段四实验循环)
    - [可选：生成式预测推理](#可选生成式预测推理)
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

**npm 全局安装（推荐）**

```bash
npm install -g castclaw
```

验证安装是否成功：

```bash
castclaw --version
```

---

## 快速开始

1. 在数据集所在目录启动交互式 TUI：

```bash
cd /path/to/your/dataset
castclaw

# 或指定模型
castclaw --model anthropic/claude-sonnet-4-6
```

2. TUI 界面包含三个标签页——**Planner**、**Forecaster**、**Critic**——分别对应三个研究阶段。

3. 使用 `Ctrl+1`、`Ctrl+2`、`Ctrl+3` 切换智能体。

4. 在 **Planner** 标签页中开始一个预测会话，例如：

```
为 data/etth1.csv 初始化预测会话。目标列：OT，时间列：date，
预测步长：96 步，回看长度：336。采用 70/20/10 分割，使用 MSE 和 MAE 评估。
```

示例数据集（`datasets.zip`）可从 Google Drive 下载：<https://drive.google.com/file/d/1HOCE20FQgLl0xCv_dOmLcTbN1RCZWwqd/view>

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
│   │       ├── predictions.csv # 原始预测结果
│   │       ├── train.log       # 原始训练日志
│   │       └── eval.json       # 原始评估指标
│   ├── user-prior/             # 用户提交的预测先验记录（可选）
│   ├── adjustments/            # 已验证的推理技能与修正结果（可选）
│   ├── best-model/             # 最终导出的 raw/adjusted 结果包
│   ├── reports/
│   │   ├── qualitative.md      # 领域研究报告
│   │   ├── quantitative.json   # 统计数据分析
│   │   └── pre-forecast.md     # 融合分析报告
│   ├── viz/                    # 可视化输出
│   ├── history.jsonl           # 完整实验历史
│   ├── best.json               # 当前最佳结果
│   └── budget.json             # 实验预算追踪
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
- 训练/验证/测试分割比例或时间戳边界
- 历史窗口与评估预测窗口之间的可选间隔
- 训练与评估统一使用的可选滑动步长
- 评估指标（MSE、MAE、WAPE、MASE）
- 考虑的模型族

示例提示词：

```
为 data/etth1.csv 初始化一个预测会话。
目标列：OT，时间列：date，预测步长：96 步，回看长度：336。
采用 70/20/10 训练/验证/测试分割。使用 MSE 和 MAE 评估。
考虑所有模型族。
```

也可以直接在提示词中指定时间戳切分和不连续预测窗口：

```
使用 2025-06-30 09:30 与 2025-09-30 09:30 两个时间戳划分训练集、验证集和测试集。
lookback_window = 711, predicted_window = 96, forecast_gap = 57, stride = 96。
```

Planner 会调用 `forecast_state init` 创建 `.forecast/` 目录，然后调用 `forecast_task` 冻结 `task.json`。

#### 可选：预测先验

如果你已经有一份外部预测结果，CastClaw 可以将其作为**预测先验**使用。任务定义完成后，系统可能会询问是否提交预测先验 CSV。

预测先验 CSV 必须是一份与真实数据集完整对齐的数据集：行数、列名、列顺序、时间戳、频率和外生变量均需保持一致。训练集目标值必须保持真实值不变；只有验证集和测试集目标值可以替换为你的预测先验。

校验通过后，CastClaw 会进入 `UserPrior` 模式：跳过模型 Zoo 搜索和重复模型训练，将用户提交的预测结果作为原始预测基线，并直接运行深度生成式预测推理，验证该先验是否可以进一步优化。

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

#### 可选：生成式预测推理

在 Forecaster 阶段，CastClaw 可以可选地运行**生成式预测推理**。普通模式下，系统会询问是保留原始预测、使用轻量预测推理，还是使用深度预测推理；Auto 模式下，智能体可以自动做出该决策。

生成式预测推理会经过验证集检验：

1. 冻结可用的 source model set 或 `UserPrior` run。
2. 使用验证集前半部分，根据原始预测、残差模式、时间戳、horizon 和预测时可见外生变量生成诊断信息。
3. 让 LLM 生成结构化候选 skill，例如日历规则、外生变量规则、horizon profile 或复合规则。
4. 使用确定性代码在验证集后半部分执行候选规则并评估效果。
5. 只有通过验证的 skill 才会在进入 Critic 阶段前被锁定。

原始预测结果不会被覆盖。修正后的预测结果、修正指标、候选规则 manifest 和泄露审计文件会单独保存在 `.forecast/adjustments/` 下。

---

### 阶段五：后置报告

**使用智能体：Critic**

实验循环结束后（或你主动结束时），切换到 **Critic** 标签页（`Ctrl+3`）。

Critic 读取所有实验产物并生成：

- 各模型族最佳结果对比
- 按时序特征（趋势/季节性/平稳性）的性能分解
- 如果启用了推理 skill，则展示原始预测与修正预测的指标对比
- 修正结果的泄露审计状态
- 可视化脚本（时间序列图、误差分布图）
- 最终 Markdown 预测报告

```
生成最终报告。
```

报告输出至 `.forecast/reports/final-report.md`。

如果启用了生成式预测推理，Critic 只会应用测试前已经锁定的 skill，不会根据测试集指标重新生成规则。最终 raw 与 adjusted 结果会导出到 `.forecast/best-model/`。

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

---

## 工具参考

普通用户通常不需要手动调用这些工具。智能体会使用它们保证流程可复现：

- `forecast_task`：将预测任务冻结到 `.forecast/task.json`。
- `forecast_state`：管理阶段、历史记录、预算、最佳结果、skills 确认和阶段交接。
- `generate_model`：创建一次确定性的模型实验并写入运行产物。
- `evaluate_experiment`：读取已完成实验的固定评估指标。
- `forecast_reflect`：记录单次实验反思和下一步方向。
- `forecast_prediction_prior`：校验并导入用户提交的预测先验数据集。
- `forecast_adjustment_*`：管理生成式预测推理的策略、source runs、诊断、候选 skill、确定性执行、验证与测试评估。
- `export_best_model`：导出最终可复用结果包，包含 raw 结果和可选 adjusted 结果。


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

- **统计模型**：ARIMA、AutoARIMA、ETS、ExponentialSmoothing、SimpleExponentialSmoothing、Holt、HoltWinters、Theta
- **深度学习**：DLinear、NLinear、PatchTST、TimesNet、iTransformer、Autoformer 等 30+ 个
- **基础模型**：Chronos（亚马逊）、TimesFM（谷歌）、Moirai（Salesforce）

运行器由 `generate_model` 工具自动调用，无需手动执行。

---

## 配置

Castclaw 从项目根目录的 `castclaw.json`（JSONC 格式）读取配置：

```jsonc
{
  // LLM 提供商与模型
  "model": "anthropic/claude-sonnet-4-6",

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
castclaw --model anthropic/claude-sonnet-4-6
```

提供商格式：`<provider>/<model-id>`（例如 `anthropic/claude-opus-4-6`、`google/gemini-2.0-flash`）。
