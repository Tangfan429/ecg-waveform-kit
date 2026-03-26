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

如果需要本地 Apple Watch ECG API：

```bash
cd server
WATCH_ECG_ADDR=0.0.0.0:8090 go run ./cmd/watch-ecg-server
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
server/
  cmd/watch-ecg-server/  本地 Go + SQLite ECG API
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
- 本地 Go 服务默认监听 `127.0.0.1:8090`，SQLite 文件默认位于 `server/data/watch-ecg.db`。
- 如果需要 iPhone 桥接 App 自动上传新 ECG，请把 Go 服务监听到 `0.0.0.0:8090`，让局域网内的 iPhone 能访问到。
- 前端开发态通过 Vite 代理把 `/api/*` 转发到本地 Go 服务。
- Apple Watch 本地协议详见 `docs/watch-ecg-api.md`。
- iOS 桥接 App 位于 `ios/WatchEcgBridge`，用于“新 ECG 生成后自动上传”。
- 演示数据中的公司、医院相关信息已做脱敏处理。
- 如果后续需要发布到 npm，请将 `package.json` 中的 `private` 调整为 `false`，并补充 `repository`、`license`、`files` 等字段。

## 本地 Apple Watch ECG API

后端协议按本地单机版实现，数据只保存在本地 SQLite。

健康检查：

```bash
curl http://127.0.0.1:8090/healthz
```

写入一条 Lead I 单导联记录：

```bash
node <<'NODE' | curl -X POST http://127.0.0.1:8090/api/v1/watch-ecg/records \
  -H 'Content-Type: application/json' \
  --data-binary @-
const waveform = Array.from({ length: 2560 }, (_, index) =>
  Number((Math.sin(index / 18) * 0.14 + Math.sin(index / 3) * 0.01).toFixed(6)),
);

process.stdout.write(JSON.stringify({
  patientId: "pat_local_001",
  encounterId: "enc_local_001",
  source: "apple_watch",
  sourceRecordId: "watch-record-001",
  recordedAt: "2026-03-25T10:30:00+08:00",
  sampleRate: 512,
  duration: 5,
  leadMode: "leadI",
  leadName: "I",
  waveform,
  summary: {
    hr: 72,
    classification: "sinus_rhythm",
  },
  device: {
    watchModel: "Apple Watch Series 9",
  },
}));
NODE
```

读取最新记录：

```bash
curl "http://127.0.0.1:8090/api/watch-ecg/latest?patientId=pat_local_001"
```

读取历史记录摘要：

```bash
curl "http://127.0.0.1:8090/api/watch-ecg/records?patientId=pat_local_001&limit=10"
```
