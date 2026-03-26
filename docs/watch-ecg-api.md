# Apple Watch ECG Local API

这个项目当前落地的是本地单机协议：

- 后端：Go
- 存储：SQLite
- 默认监听：`127.0.0.1:8090`
- 数据范围：只存本机，不依赖云端
- AI 分析：当前前端可直接适配第三方 OpenAI 兼容网关；本地 Go 服务仍保留代理接口

## 接口列表

### `GET /healthz`

健康检查。

响应：

```json
{
  "status": "ok"
}
```

### `POST /api/v1/watch-ecg/records`

写入一条 Apple Watch ECG 记录。

当前协议只接受 `Lead I` 单导联数据。

请求体字段：

| 字段             | 类型     | 必填 | 说明                               |
| ---------------- | -------- | ---- | ---------------------------------- |
| `patientId`      | string   | 是   | 本地患者 ID                        |
| `encounterId`    | string   | 否   | 本地就诊/检查 ID                   |
| `source`         | string   | 是   | 固定为 `apple_watch`               |
| `sourceRecordId` | string   | 是   | Apple Watch / iPhone 侧记录唯一 ID |
| `recordedAt`     | string   | 是   | 记录时间，必须是 RFC3339           |
| `sampleRate`     | number   | 是   | 采样率，必须大于 0                 |
| `duration`       | number   | 是   | 秒数，必须大于 0                   |
| `leadMode`       | string   | 是   | 固定为 `leadI`                     |
| `leadName`       | string   | 是   | 固定为 `I`                         |
| `waveform`       | number[] | 是   | 电压点序列，不能为空               |
| `summary`        | object   | 否   | 摘要信息，如心率、分类             |
| `device`         | object   | 否   | 设备信息，如型号、系统版本         |

校验规则：

- `source` 只能是 `apple_watch`
- `leadMode` 只能是 `leadI`
- `leadName` 只能是 `I`
- `waveform.length / sampleRate` 必须和 `duration` 基本一致
- `waveform` 不能包含 `NaN` / `Infinity`

幂等规则：

- `(source, sourceRecordId)` 唯一
- 如果重复上传同一条记录，服务端不会报错，而是返回已存在的记录

成功响应：

- 首次写入返回 `201 Created`
- 重复写入返回 `200 OK`

响应体：

```json
{
  "id": "wecg_1774426650259989000",
  "patientId": "pat_local_001",
  "encounterId": "enc_local_001",
  "source": "apple_watch",
  "sourceRecordId": "watch-record-001",
  "recordedAt": "2026-03-25T02:30:00Z",
  "sampleRate": 512,
  "duration": 5,
  "leadMode": "leadI",
  "leadName": "I",
  "waveform": [0.012, 0.018, 0.009],
  "summary": {
    "hr": 72,
    "classification": "sinus_rhythm"
  },
  "device": {
    "watchModel": "Apple Watch Series 9"
  },
  "ingestedAt": "2026-03-25T08:17:30Z",
  "status": "stored"
}
```

错误响应：

```json
{
  "error": {
    "code": "watch_ecg_validation_failed",
    "message": "duration 与 waveform/sampleRate 不匹配",
    "requestId": "req_1774426650259989000"
  }
}
```

### `GET /api/v1/watch-ecg/records/latest`

读取最新一条 Apple Watch ECG 记录。

查询参数：

- `patientId`：可选。不传则返回全库最新一条；传了则按患者过滤。

### `GET /api/watch-ecg/latest`

前端兼容别名，行为与上一个接口一致。当前 Vue 页面通过这个地址轮询最新 ECG。

### `GET /api/v1/watch-ecg/records`

按时间倒序读取历史 Apple Watch ECG 记录摘要，不返回整段波形。

查询参数：

- `patientId`：可选。按患者过滤。
- `page`：可选。默认 `1`。
- `pageSize`：可选。默认 `12`，最大 `100`。
- `limit`：兼容旧参数。若没有传 `pageSize`，会使用这个值作为 `pageSize`。

响应体：

```json
{
  "items": [
    {
      "id": "wecg_1774426650259989000",
      "patientId": "pat_local_001",
      "sourceRecordId": "watch-record-001",
      "recordedAt": "2026-03-25T02:30:00Z",
      "sampleRate": 512,
      "duration": 30,
      "leadMode": "leadI",
      "leadName": "I",
      "summary": {
        "hr": 72,
        "classification": "sinus_rhythm"
      },
      "device": {
        "watchModel": "Apple Watch Series 9"
      },
      "ingestedAt": "2026-03-25T08:17:30Z",
      "status": "stored"
    }
  ],
  "page": 1,
  "pageSize": 12,
  "total": 37
}
```

### `GET /api/watch-ecg/records`

前端兼容别名，行为与上一个接口一致。

### `GET /api/v1/watch-ecg/records/{id}`

按内部记录 ID 查询单条 ECG 记录，返回完整波形。

### `GET /api/watch-ecg/records/{id}`

前端兼容别名，行为与上一个接口一致。

### `DELETE /api/v1/watch-ecg/records/{id}`

删除一条历史 ECG 记录。

响应体：

```json
{
  "id": "wecg_1774426650259989000",
  "status": "deleted",
  "deletedAt": "2026-03-25T12:00:00Z"
}
```

### `DELETE /api/watch-ecg/records/{id}`

前端兼容别名，行为与上一个接口一致。

### `POST /api/v1/watch-ecg/records/{id}/ai-analysis`

对当前这条 Apple Watch Lead I ECG 发起一次 AI 辅助分析。

说明：

- 服务端会先读取本地 ECG 记录。
- 再从波形里提取简单统计、R 峰 / RR 特征、降采样波形预览。
- 最后通过本地 Go 服务代理到第三方 OpenAI 兼容网关。
- 返回结果只做辅助分析，不替代医生诊断。

响应体示例：

```json
{
  "recordId": "wecg_1774426650259989000",
  "provider": "openai-compatible",
  "model": "gpt-4.1-mini",
  "createdAt": "2026-03-25T12:03:00Z",
  "advisory": "仅供辅助分析，不替代医生诊断；若伴胸痛、晕厥、持续心悸等症状，请立即线下就医。",
  "analysis": {
    "summary": "当前单导联 ECG 更接近规则节律，未见明确高危提示。",
    "rhythmAssessment": "从单导联 Lead I 波形看，更像规则窦性节律，但仍需结合临床。",
    "riskLevel": "low",
    "keyFindings": [
      "R-R 间期整体较规则",
      "当前单导联未见明确持续性快慢不齐特征"
    ],
    "diagnosticSuggestions": [
      "可能更偏向规则节律，建议结合症状和既往史综合判断"
    ],
    "recommendedActions": [
      "如有胸闷、胸痛、晕厥或持续心悸，建议尽快线下就医",
      "如需更完整判断，建议补做 12 导联 ECG"
    ],
    "limitations": "该结果仅基于 Apple Watch Lead I 单导联和有限波形特征，不能替代 12 导联心电或医生诊断。"
  }
}
```

### `POST /api/watch-ecg/records/{id}/ai-analysis`

前端兼容别名，行为与上一个接口一致。

## 前端直连 AI 环境变量

当前页面里的 AI 分析卡片，已经支持浏览器直连第三方 OpenAI 兼容网关。

你现在有两种方式：

- 启动前通过 `VITE_*` 环境变量注入默认值
- 在页面里的“AI 网关配置”面板直接填写并保存到浏览器本地

开发态说明：

- 在 `npm run dev` 下，页面会自动通过本地 `Vite` 的 `/ai-gateway` 中转请求
- 所以即便第三方网关没开浏览器 CORS，开发环境也可以正常调通
- 生产环境没有这层 `Vite` 中转，若仍是跨域调用，依然需要后端或反向代理

需要在前端环境里配置：

| 变量名                            | 必填 | 说明                                                           |
| --------------------------------- | ---- | -------------------------------------------------------------- |
| `VITE_WATCH_ECG_AI_BASE_URL`      | 是   | 第三方网关基础地址，例如 `https://your-gateway.example.com/v1` |
| `VITE_WATCH_ECG_AI_API_KEY`       | 是   | 浏览器直连时使用的 API Key / 受限 token                        |
| `VITE_WATCH_ECG_AI_MODEL`         | 是   | 调用模型名                                                     |
| `VITE_WATCH_ECG_AI_PROVIDER`      | 否   | 页面展示的 provider 名，默认 `openai-compatible`               |
| `VITE_WATCH_ECG_AI_WIRE_API`      | 否   | 请求协议，支持 `chat_completions` 或 `responses`，默认前者    |
| `VITE_WATCH_ECG_AI_PATH`          | 否   | 请求路径；`chat_completions` 默认 `/chat/completions`，`responses` 默认 `/responses` |
| `VITE_WATCH_ECG_AI_HEADER_NAME`   | 否   | 鉴权 header 名，默认 `Authorization`                           |
| `VITE_WATCH_ECG_AI_HEADER_PREFIX` | 否   | 鉴权 header 前缀，默认 `Bearer `                               |
| `VITE_WATCH_ECG_AI_TEMPERATURE`   | 否   | 采样温度，默认 `0.2`                                           |

示例：

```bash
export VITE_WATCH_ECG_AI_BASE_URL="https://your-gateway.example.com/v1"
export VITE_WATCH_ECG_AI_API_KEY="sk-xxx"
export VITE_WATCH_ECG_AI_MODEL="gpt-4.1-mini"
export VITE_WATCH_ECG_AI_PROVIDER="ccswitch-like"
npm run dev
```

如果你接的是 `b022 hub` 这类 `Responses API` 网关，可直接按下面填：

```bash
export VITE_WATCH_ECG_AI_BASE_URL="https://api.b022mc.us.ci/v1"
export VITE_WATCH_ECG_AI_API_KEY="your-api-key"
export VITE_WATCH_ECG_AI_MODEL="latest-model-name"
export VITE_WATCH_ECG_AI_PROVIDER="b022hub"
export VITE_WATCH_ECG_AI_WIRE_API="responses"
npm run dev
```

注意：

- 前端直连模式会把凭证暴露在浏览器环境中，请只使用受限 token。
- 开发环境已自动绕开浏览器跨域；生产环境若直接前端跨域，第三方接口仍需允许 CORS。
- 当前页面不会再依赖本地 `/api/watch-ecg/records/{id}/ai-analysis` 才能分析。
- 页面内保存的配置只存在当前浏览器 localStorage，不会同步到别的机器或浏览器。

## AI 网关环境变量

服务启动时可配置下面这些环境变量：

| 变量名                         | 必填 | 说明                                                                         |
| ------------------------------ | ---- | ---------------------------------------------------------------------------- |
| `WATCH_ECG_AI_BASE_URL`        | 是   | 第三方 OpenAI 兼容网关地址。若传到 `/v1`，服务会自动拼成 `/chat/completions` |
| `WATCH_ECG_AI_API_KEY`         | 是   | 第三方网关 API Key                                                           |
| `WATCH_ECG_AI_MODEL`           | 是   | 调用的模型名                                                                 |
| `WATCH_ECG_AI_PROVIDER`        | 否   | 返回给前端展示的 provider 名称，默认 `openai-compatible`                     |
| `WATCH_ECG_AI_TIMEOUT_SECONDS` | 否   | 上游模型接口超时秒数，默认 `45`                                              |

示例：

```bash
export WATCH_ECG_AI_BASE_URL="https://your-gateway.example.com/v1"
export WATCH_ECG_AI_API_KEY="sk-xxx"
export WATCH_ECG_AI_MODEL="gpt-4.1-mini"
export WATCH_ECG_AI_PROVIDER="ccswitch-like"
cd server
go run ./cmd/watch-ecg-server
```

## 前端联动约定

当前前端已经按下面的约定接好了：

- 数据源切到 `Apple Watch API` 后，自动锁定为 `Lead I 单导联`
- 前端轮询地址是 `/api/watch-ecg/latest`
- 历史列表地址是 `/api/watch-ecg/records`
- 历史页支持分页和删除
- AI 分析按钮当前默认走前端直连第三方网关
- 若你仍想走本地代理，也可以继续使用 `/api/watch-ecg/records/{id}/ai-analysis`
- Vite 开发态会把 `/api/*` 代理到 `http://127.0.0.1:8090`
- 前端会把返回的单导联数据适配成：
  - `leadMode = leadI`
  - `waveformData.I = waveform`
  - `measurementData.hr = summary.hr`
  - `classification` 文本由 `summary.classification` 映射得到

## iOS / watchOS 接入建议

建议由 iPhone 侧负责上报，不直接让 watchOS 访问本地 API：

1. Apple Watch 生成一条新的 ECG。
2. 这条 ECG 同步进 iPhone 健康 App。
3. iPhone 桥接 App 通过 HealthKit observer 检测到新 ECG。
4. iPhone App 生成 `sourceRecordId`，并整理 `waveform`、`summary`、`device`。
5. iPhone App 自动向本机服务 `POST /api/v1/watch-ecg/records`。
6. 当前 Vue 页面通过 `GET /api/watch-ecg/latest` 自动联动显示，同时历史列表通过 `GET /api/watch-ecg/records` 分页浏览，支持删除旧记录。
7. 若用户手动点击 AI 分析，前端会直接把当前记录和派生特征发往第三方网关获取辅助建议；若你改回本地代理模式，也可以继续调本地 AI 接口。

建议 `sourceRecordId` 直接使用 Apple HealthKit ECG UUID，避免重复入库。
