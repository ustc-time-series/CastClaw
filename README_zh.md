# CastClaw



![CastClaw Logo](./logo/logo.jpeg)

[主页](https://ustc-time-series.github.io/cast-claw/) · [GitHub 仓库](https://github.com/SkyeGT/CastClaw) · [English](./README.md) · 中文

**价值感知。工作流学习。全交互式。**

丢入一个 CSV 文件，描述你想要的预测目标——CastClaw 会将任务协商、离线规律学习、在线慢思考工作流适配，以及带证据链的结果评估整合为一条预测工作流。系统会持续沉淀预测规律与求解经验，并发布可复用、可审计、可迭代优化的验证工作流。

![CastClaw Architecture](https://img.shields.io/badge/TUI%20%2B%20CLI-Ready-green) ![Python ML Backend](https://img.shields.io/badge/Python%203.10+-Compatible-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🗞️ 最新动态

**[2026-07-15]** CastClaw 1.3.0 版本上线：支持直接提交 UserPrior，充分利用已有预测先验，无需重复进行模型搜索和训练；新增 ARIMA、AutoARIMA、ETS、Holt、Holt-Winters、Theta 等统计模型；新增 stride、forecast_gap 等参数，支持更复杂的预测窗口设置。本次更新同时优化了按比例或时间戳进行数据集切分、模型权重复用机制，以及预测结果与评估指标的保存，方便后续分析、复现和可视化。

**[2026-07-04]** CastClaw 新增用户自主提交预测先验功能：用户可以提交已有预测结果作为完整对齐 CSV，跳过模型搜索流程，并通过深度生成式预测推理对预测先验进行验证与优化。

**[2026-06-18]** CastClaw 新增生成式预测推理能力：系统可在保留原始预测结果的基础上，生成经过验证的规则型 skill，对预测结果进行可审计、可复现的修正。

**[2026-04-30]** CastClaw 1.2.1 版本更新：运行到 Critic Agent 时，会自动导出最佳模型文件、参数等内容，形成一个可以复用的 workflow。

**[2026-04-22]** CastClaw 1.2.0 版本更新：上线 Auto 模式，可在预测前勾选，确认实验参数后自动推进整个流程直至结束；为 Hugging Face 配置镜像，Chronos 等基础模型不再因超时无法正常使用；同时更新了一部分 UI。

**[2026-04-17]** 录制演示视频。

**[2026-03-31]** CastClaw 正式开源，附完整文档与多 LLM 提供商支持。

## CastClaw 有何不同

🗂️ **任务协商与价值感知交互**

在运行任何工作流之前，CastClaw 会先明确“何时问、问什么、反馈如何沉淀”。系统会完成任务规格化、约束与偏好建模、不确定性检测、主动问题生成，并将人类反馈记录为可复用记忆。

📚 **离线规律学习与经验沉淀**

CastClaw 将离线学习拆分为规律归纳层与经验沉淀层。规律归纳层抽取数据分析模式、领域知识和预测模型工具；经验沉淀层保留成功推理轨迹、工具调用结果、工作流评分和可解释的验证经验。

🧠 **候选慢思考工作流归纳**

系统会把学到的预测规律与求解经验组织为候选慢思考工作流。每条工作流都融合规则、经验、模型工具和验证检查，让后续任务可以从已验证的推理路径出发，而不是每次都从零开始搜索。

🔁 **在线慢思考推理与工作流适配**

面对新的测试集，CastClaw 会检索相关规律、经验和人类反馈，实例化工作流，调度工具并生成初始预测，再通过规则一致性检查、反思校正和内部迭代得到最终预测结果。

🧩 **Case 级证据化预测解释**

CastClaw 会同时保留候选工作流、最终预测和证据链。结果不仅评估预测性能，也验证工作流有效性，并提供 Case 级预测理由，方便追溯每个预测结论从何而来。

🚀 **验证后的可部署工作流发布**

评估完成后，CastClaw 会将有效推理路径沉淀为可部署工作流，并保存预测结果、评估指标、相关产物和验证记录，方便后续分析、复现、可视化与复用。

🔍 **用可验证的推理技能优化预测**
CastClaw 可以将预测时可见的信息——如日历效应、外生变量、专家规则或用户提交的预测先验——转化为结构化修正 skill，并先在留出的验证数据上检验有效性，再应用到最终预测。

🔁 **支持优化用户已有预测先验**
如果你已经拥有其它模型或业务系统生成的预测结果，可以将其作为对齐后的预测先验 CSV 提交。CastClaw 会跳过模型搜索，校验预测先验，并复用生成式预测推理流程进行优化。

🛠️ **支持自定义规则、工具与技能扩展**

自己编写技能——提示模板或嵌入 Python/SQL 逻辑——CastClaw 可以将它们与 CastSense、CastFeat、CastZoo、Evaluator、Visualizer 等内置工具一起调度使用。

📦 **管理完整工作流生命周期**

从任务规格化 → 规律与经验学习 → 在线工作流适配 → 预测评估 → 工作流发布，全流程追踪：运行日志、评估指标、失败历史、证据链、相关产物和性能对比，一览无余。

⏸️ **人机协作持续融入工作流**

你可以在任务协商、预测推理或结果复核阶段随时提问、注入领域知识或修正假设。CastClaw 会将这些反馈沉淀为经验记忆，并在后续工作流适配时检索复用。

## 快速开始


**npm 全局安装（推荐）**

```bash
npm install -g castclaw
```


**验证安装**

```bash
castclaw --version
```

**配置 LLM**

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# 或 OpenAI / Google / OpenRouter
export OPENAI_API_KEY=sk-...
export GOOGLE_GENERATIVE_AI_API_KEY=...
```

在项目根目录创建 `castclaw.json`（示例）：

```json
{
  "model": "anthropic/claude-sonnet-4-6"
}
```

**开始预测**

```bash
# 进入数据集所在目录，启动 TUI
cd /path/to/your/dataset
castclaw

# 或指定模型
castclaw --model anthropic/claude-sonnet-4-6
```

TUI 启动后，用 `Ctrl+1/2/3` 在任务规划、预测执行、结果复核视图之间切换；在规划视图中输入任务描述，例如：

```
为 data/etth1.csv 初始化预测会话。目标列：OT，时间列：date，
预测步长：96 步，回看长度：336。采用 70/20/10 分割，使用 MSE 和 MAE 评估。
```

示例数据集（`datasets.zip`）可从 [Google Drive](https://drive.google.com/file/d/1HOCE20FQgLl0xCv_dOmLcTbN1RCZWwqd/view?usp=drive_link) 下载

## 📋 环境要求


| 依赖 | 版本 | 说明 |
| -------------------------------- | --------- | --------------------------------- |
| [Bun](https://bun.sh) | ≥ 1.3.11 | 运行时与包管理器 |
| [Python](https://python.org) | ≥ 3.10 | 时序模型 ML 后端 |
| [uv](https://docs.astral.sh/uv/) | 最新版 | Python 依赖管理 |
| GPU（可选） | CUDA 12.8 | 深度学习模型加速 |


## 🤖 支持模型（30+）

**统计模型：** ARIMA、AutoARIMA、ETS、ExponentialSmoothing、SimpleExponentialSmoothing、Holt、HoltWinters、Theta
**深度学习：** DLinear、NLinear、PatchTST、TimesNet、iTransformer、Autoformer 等  
**基础模型：** Chronos（亚马逊）、TimesFM（谷歌）、Moirai（Salesforce）

## 🔧 配置

在项目根目录创建 `castclaw.json`：

```jsonc
{
  "model": "anthropic/claude-sonnet-4-6",
  "skills": {
    "paths": ["~/.my-skills/"]
  }
}
```

**LLM 提供商：** 通过 Vercel AI SDK 支持 20+ 个提供商（Anthropic、OpenAI、Google、OpenRouter 等）。请为所用提供商设置环境变量，例如：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# 或：OPENAI_API_KEY、GOOGLE_GENERATIVE_AI_API_KEY、OpenRouter 等
```

## 🎯 四阶段工作流学习框架

```
阶段一 → 任务协商与价值感知交互
        ↓
阶段二 → 离线规律学习与经验沉淀
        ↓
阶段三 → 在线慢思考推理与工作流适配
        ↓
阶段四 → 结果评估与工作流发布
```

## 📚 文档

- **[English usage guide](./docs/en/usage.md)** — 安装、工作流、配置、LLM 提供商  
- **[中文使用指南](./docs/zh/usage.md)** — 与英文版结构一致：安装、工作流、配置、LLM  
- **[提交 Issue](https://github.com/SkyeGT/CastClaw/issues)** — GitHub Issues

## 📂 仓库结构

```
CastClaw/
├── packages/castclaw/    # TUI & CLI 核心
├── packages/app/         # 浏览器 Web 界面
├── packages/sdk/         # SDK 与运行时
├── python/               # ML 后端（30+ 个模型）
├── docs/                 # 使用文档
└── infra/                # 基础设施（SST）
```

## 🏆 核心优势对比


| 特性 | CastClaw | 传统工具 |
| ----------------------- | ---------------------------------- | --------------------- |
| 价值感知交互 | ✅ 澄清目标、不确定性与反馈 | ❌ 静态任务输入 |
| 规律-经验学习 | ✅ 同时学习预测规律与求解经验 | ❌ 一次性模型运行 |
| 工作流在线适配 | ✅ 检索规律、经验和人类反馈 | ❌ 固定流水线 |
| 证据化评估 | ✅ 同时保留预测、指标与证据链 | ❌ 只看指标 |
| 工作流发布 | ✅ 导出经验证的可复用工作流 | ❌ 手动复用 |


## 🤝 参与贡献

欢迎贡献！请在 [GitHub](https://github.com/SkyeGT/CastClaw) 提交 Issue 或 Pull Request。

## 📄 许可证

MIT License — 详见 [LICENSE](./LICENSE)

## 📫 联系方式

- **问题与反馈：** [GitHub Issues](https://github.com/SkyeGT/CastClaw/issues)
- **文档：** [English](./docs/en/usage.md) · [中文](./docs/zh/usage.md)
- **微信：**![CastClaw Logo](./logo/feedback.jpg)

## 致谢

本项目得到了**中国科学技术大学**与**华为 2012 应用场景创新实验室**校企合作基金的鼎力支持；同时，研发过程中所需的计算资源由**华为昇腾 AI 百校计划**全力保障。

---
**欢迎大家使用国产昇腾算力运行基础模型。**

**由 CastClaw 团队用心打造 ❤️**
