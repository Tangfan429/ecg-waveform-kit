# ECG Waveform Kit

一个基于 Vue 3 + Vite 的通用心电波形组件仓库，用于从业务诊断中心页面中抽离可复用的波形展示、分析和打印能力。

## 功能范围

当前仓库聚焦波形相关能力，保留以下内容：

- 常规心电（十二导联）
- 动态心电报告查看
- 动态血压报告查看
- 波形分析
- 平均模板
- 节律波形
- 频谱心电
- 高频心电
- QT离散度
- 心电向量
- 打印能力
- 工具栏与波形交互能力

当前仓库明确不包含以下业务流程：

- 收藏病例
- 申请会诊
- 保存并审核
- 其他与具体业务系统耦合的病例流转动作

## 技术栈

- Vue 3
- Vite
- Element Plus
- Sass

## 快速开始

安装依赖：

```bash
npm install
```

启动本地开发：

```bash
npm run dev
```

构建生产产物：

```bash
npm run build
```

本地预览构建结果：

```bash
npm run preview
```

## 目录结构

```text
src/
  lib/
    components/    组件与工作台
    composables/   复用逻辑
    demo/          演示数据
    styles/        样式变量
    utils/         波形渲染、打印、适配工具
```

## 主要导出

当前库从 `src/lib/index.js` 统一导出，核心包括：

- `WaveformCenter`
- `StandardWaveformWorkspace`
- `AverageTemplateWorkspace`
- `ReportWorkspace`
- `SpectrumAnalysisWorkspace`
- `HighFrequencyEcgWorkspace`
- `QtDispersionWorkspace`
- `VectorEcgWorkspace`
- `WaveformToolbar`
- `WaveformTimeNavigatorBar`
- `WaveformContextMenu`
- `WaveformSettingsDialog`

## 仓库说明

- 本仓库提交源码，不提交 `dist/` 构建产物。
- 演示数据中的公司、医院相关信息已做脱敏处理。
- 如果后续需要发布到 npm，请将 `package.json` 中的 `private` 调整为 `false`，并补充 `repository`、`license`、`files` 等字段。