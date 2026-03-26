const DEFAULT_PROVIDER = "openai-compatible";
const DEFAULT_WIRE_API = "chat_completions";
const DEFAULT_GATEWAY_PATHS = Object.freeze({
  chat_completions: "/chat/completions",
  responses: "/responses",
});
const DEFAULT_HEADER_NAME = "Authorization";
const DEFAULT_HEADER_PREFIX = "Bearer ";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_WAVEFORM_PREVIEW_POINTS = 256;
const DEV_PROXY_ENDPOINT = "/ai-gateway";

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function roundNumber(value, digits = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(numericValue * factor) / factor;
}

function normalizeWaveform(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((point) => toFiniteNumber(point, NaN))
    .filter((point) => Number.isFinite(point));
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length <= 1) {
    return 0;
  }

  const averageValue = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - averageValue) ** 2, 0) /
    (values.length - 1);

  return Math.sqrt(Math.max(0, variance));
}

function downsampleWaveform(
  values,
  targetPoints = DEFAULT_WAVEFORM_PREVIEW_POINTS,
) {
  if (!values.length) {
    return [];
  }

  const safeTargetPoints = Math.max(8, Math.round(targetPoints));

  if (values.length <= safeTargetPoints) {
    return values.map((point) => roundNumber(point, 6));
  }

  const preview = [];
  const step = (values.length - 1) / Math.max(1, safeTargetPoints - 1);

  for (let index = 0; index < safeTargetPoints; index += 1) {
    const sampleIndex = Math.min(
      values.length - 1,
      Math.max(0, Math.round(index * step)),
    );
    preview.push(roundNumber(values[sampleIndex], 6));
  }

  return preview;
}

function normalizeSummaryRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      const label = String(row?.label || "").trim();
      const value = String(row?.value || "").trim();

      if (!label || !value) {
        return null;
      }

      return { label, value };
    })
    .filter(Boolean);
}

function normalizeMarkers(markers) {
  if (!Array.isArray(markers)) {
    return [];
  }

  return markers
    .map((marker) => ({
      label: String(marker?.label || "").trim(),
      frequency: roundNumber(toFiniteNumber(marker?.frequency, 0), 2),
    }))
    .filter((marker) => marker.label);
}

function normalizeBands(bands) {
  if (!Array.isArray(bands)) {
    return [];
  }

  return bands
    .map((band) => ({
      label: String(band?.label || "").trim(),
      range: String(band?.range || "").trim(),
      power: String(band?.power || "").trim(),
    }))
    .filter((band) => band.label);
}

function extractStructuredContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return String(content || "").trim();
  }

  return content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        return String(item.text || item.content || "").trim();
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function normalizeAiResponseText(text) {
  const trimmedText = String(text || "").trim();

  if (!trimmedText.startsWith("```")) {
    return trimmedText;
  }

  return trimmedText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function normalizeWireApi(value, fallback = DEFAULT_WIRE_API) {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[/-]/gu, "_");

  if (normalizedValue === "responses" || normalizedValue === "response") {
    return "responses";
  }

  if (
    normalizedValue === "chat_completions" ||
    normalizedValue === "chatcompletion" ||
    normalizedValue === "chatcompletions"
  ) {
    return "chat_completions";
  }

  return fallback;
}

function normalizeAnalysisPayload(payload = {}) {
  const normalizedRiskLevel = String(payload.riskLevel || "")
    .trim()
    .toLowerCase();
  const supportedRiskLevels = ["low", "moderate", "high", "unknown"];

  return {
    summary: String(payload.summary || "").trim(),
    rhythmAssessment: String(payload.rhythmAssessment || "").trim(),
    riskLevel: supportedRiskLevels.includes(normalizedRiskLevel)
      ? normalizedRiskLevel
      : "unknown",
    keyFindings: normalizeStringArray(payload.keyFindings),
    diagnosticSuggestions: normalizeStringArray(payload.diagnosticSuggestions),
    recommendedActions: normalizeStringArray(payload.recommendedActions),
    limitations: String(payload.limitations || "").trim(),
  };
}

function createFallbackAnalysis() {
  return {
    summary: "",
    rhythmAssessment: "",
    riskLevel: "unknown",
    keyFindings: [],
    diagnosticSuggestions: [],
    recommendedActions: [],
    limitations: "上游模型未返回严格 JSON 结构，请人工复核原始文本。",
  };
}

function parseAnalysisText(text) {
  const normalizedText = normalizeAiResponseText(text);
  const startIndex = normalizedText.indexOf("{");
  const endIndex = normalizedText.lastIndexOf("}");

  if (startIndex < 0 || endIndex <= startIndex) {
    throw new Error("模型未返回 JSON 结构");
  }

  const jsonText = normalizedText.slice(startIndex, endIndex + 1);
  return normalizeAnalysisPayload(JSON.parse(jsonText));
}

function buildWaveformSummary(viewModel = {}) {
  const waveform = normalizeWaveform(viewModel.waveformData?.I);
  const pointCount = waveform.length;
  const sampleRate = Math.max(
    1,
    Math.round(toFiniteNumber(viewModel.sampleRate, 512)),
  );
  const explicitDuration = toFiniteNumber(viewModel.duration, 0);
  const durationSeconds =
    explicitDuration > 0 ? explicitDuration : pointCount / sampleRate;
  const heartRate = roundNumber(
    toFiniteNumber(viewModel.measurementData?.hr, 0),
    0,
  );

  if (!pointCount) {
    return {
      pointCount: 0,
      sampleRate,
      durationSeconds: roundNumber(durationSeconds, 3),
      heartRate,
      min: 0,
      max: 0,
      mean: 0,
      stdDev: 0,
      amplitudeRange: 0,
      waveformPreview: [],
    };
  }

  const minimumValue = Math.min(...waveform);
  const maximumValue = Math.max(...waveform);
  const averageValue = mean(waveform);
  const stdDev = standardDeviation(waveform);

  return {
    pointCount,
    sampleRate,
    durationSeconds: roundNumber(durationSeconds, 3),
    heartRate,
    min: roundNumber(minimumValue, 6),
    max: roundNumber(maximumValue, 6),
    mean: roundNumber(averageValue, 6),
    stdDev: roundNumber(stdDev, 6),
    amplitudeRange: roundNumber(maximumValue - minimumValue, 6),
    waveformPreview: downsampleWaveform(waveform),
  };
}

export function buildWatchEcgAiInput({
  viewModel = {},
  rhythmAnalysis = null,
  spectrumAnalysis = null,
} = {}) {
  const waveformSummary = buildWaveformSummary(viewModel);

  return {
    record: {
      id: String(viewModel.recordId || "").trim(),
      recordedAt: String(viewModel.recordedAt || "").trim(),
      source: String(viewModel.sourceLabel || viewModel.source || "").trim(),
      leadMode: String(viewModel.leadMode || "leadI").trim(),
      leadName: "I",
      classification: String(viewModel.classification || "").trim(),
      classificationCode: String(viewModel.classificationCode || "").trim(),
    },
    waveformSummary,
    rhythmAnalysis: {
      summaryRows: normalizeSummaryRows(rhythmAnalysis?.summaryRows),
      rrSeries: Array.isArray(rhythmAnalysis?.rrSeries)
        ? rhythmAnalysis.rrSeries.slice(-12).map((item) => ({
            label: String(item?.label || "").trim(),
            value: roundNumber(toFiniteNumber(item?.value, 0), 0),
            timeSeconds: roundNumber(toFiniteNumber(item?.timeSeconds, 0), 2),
          }))
        : [],
    },
    spectrumAnalysis: {
      summaryRows: normalizeSummaryRows(spectrumAnalysis?.summaryRows),
      bands: normalizeBands(spectrumAnalysis?.bands),
      markers: normalizeMarkers(spectrumAnalysis?.markers),
    },
  };
}

export function normalizeWatchEcgAiGatewayConfig(input = {}) {
  const baseUrl = String(input.baseUrl || "").trim();
  const apiKey = String(input.apiKey || "").trim();
  const model = String(input.model || "").trim();
  const provider = String(input.provider || "").trim() || DEFAULT_PROVIDER;
  const rawPath = String(input.path || "").trim();
  const inferredWireApi =
    /\/responses\/?$/u.test(baseUrl) || /\/responses\/?$/u.test(rawPath)
    ? "responses"
    : DEFAULT_WIRE_API;
  const wireApi = normalizeWireApi(input.wireApi, inferredWireApi);
  const path =
    rawPath || DEFAULT_GATEWAY_PATHS[wireApi];
  const headerName =
    String(input.headerName || "").trim() || DEFAULT_HEADER_NAME;
  const headerPrefix =
    typeof input.headerPrefix === "string"
      ? input.headerPrefix
      : DEFAULT_HEADER_PREFIX;
  const temperature = toFiniteNumber(input.temperature, DEFAULT_TEMPERATURE);

  return {
    baseUrl,
    apiKey,
    model,
    provider,
    wireApi,
    path,
    headerName,
    headerPrefix,
    temperature,
    isConfigured: Boolean(baseUrl && apiKey && model),
  };
}

export function getWatchEcgAiGatewayConfig() {
  return normalizeWatchEcgAiGatewayConfig({
    baseUrl: import.meta.env.VITE_WATCH_ECG_AI_BASE_URL || "",
    apiKey: import.meta.env.VITE_WATCH_ECG_AI_API_KEY || "",
    model: import.meta.env.VITE_WATCH_ECG_AI_MODEL || "",
    provider: import.meta.env.VITE_WATCH_ECG_AI_PROVIDER || "",
    wireApi: import.meta.env.VITE_WATCH_ECG_AI_WIRE_API || "",
    path: import.meta.env.VITE_WATCH_ECG_AI_PATH || "",
    headerName: import.meta.env.VITE_WATCH_ECG_AI_HEADER_NAME || "",
    headerPrefix: import.meta.env.VITE_WATCH_ECG_AI_HEADER_PREFIX,
    temperature: import.meta.env.VITE_WATCH_ECG_AI_TEMPERATURE,
  });
}

export function resolveWatchEcgAiGatewayConfig(runtimeConfig) {
  if (runtimeConfig && typeof runtimeConfig === "object") {
    return normalizeWatchEcgAiGatewayConfig(runtimeConfig);
  }

  return getWatchEcgAiGatewayConfig();
}

function resolveGatewayUrl(config) {
  const normalizedBaseUrl = String(config.baseUrl || "")
    .trim()
    .replace(/\/+$/u, "");
  const normalizedPath = String(config.path || "").trim();
  const defaultPath =
    DEFAULT_GATEWAY_PATHS[normalizeWireApi(config.wireApi)] ||
    DEFAULT_GATEWAY_PATHS[DEFAULT_WIRE_API];

  if (!normalizedBaseUrl) {
    return "";
  }

  if (!normalizedPath) {
    return normalizedBaseUrl;
  }

  if (/^https?:\/\//u.test(normalizedPath)) {
    return normalizedPath;
  }

  if (normalizedBaseUrl.endsWith(defaultPath)) {
    return normalizedBaseUrl;
  }

  if (normalizedPath.startsWith("/")) {
    return `${normalizedBaseUrl}${normalizedPath}`;
  }

  return `${normalizedBaseUrl}/${normalizedPath}`;
}

function buildPrompt(input) {
  return `请基于下面这条 Apple Watch Lead I 单导联 ECG 数据做辅助分析。

规则：
1. 只能做辅助解读，不得给出确定诊断。
2. 必须明确说明这是单导联 Lead I，不能替代十二导联 ECG 或医生诊断。
3. 若波形质量、导联数量或特征不足，请明确写出局限性。
4. diagnosticSuggestions 只能写“可能提示/建议结合临床排查”的表述。
5. recommendedActions 只给出安全、稳妥的下一步建议。
6. 只输出一个 JSON 对象，字段必须完整：
{
  "summary": "一句话总结",
  "rhythmAssessment": "对节律的辅助判断",
  "riskLevel": "low|moderate|high|unknown",
  "keyFindings": ["重点发现1"],
  "diagnosticSuggestions": ["可能提示..."],
  "recommendedActions": ["建议..."],
  "limitations": "局限性说明"
}

输入数据：
${JSON.stringify(input, null, 2)}`;
}

function buildSystemPrompt() {
  return "你是心电图辅助分析助手。你只能做辅助判断，不得给出确定诊断，不得替代医生。当前输入来自 Apple Watch Lead I 单导联 ECG，必须强调单导联局限性。输出必须是 JSON，不要输出代码块、不要输出额外说明。";
}

function buildHeaders(config) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (config.headerName && config.apiKey) {
    const headerValue =
      config.headerName.toLowerCase() === "authorization"
        ? `${config.headerPrefix}${config.apiKey}`.trim()
        : `${config.headerPrefix}${config.apiKey}`.trim();

    headers[config.headerName] = headerValue;
  }

  return headers;
}

function shouldUseDevProxy(targetUrl) {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }

  try {
    const resolvedTargetUrl = new URL(targetUrl, window.location.origin);
    return resolvedTargetUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function createChatCompletionsRequestBody(config, input) {
  return {
    model: config.model,
    temperature: config.temperature,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      {
        role: "user",
        content: buildPrompt(input),
      },
    ],
  };
}

function createResponsesRequestBody(config, input) {
  return {
    model: config.model,
    temperature: config.temperature,
    instructions: buildSystemPrompt(),
    input: buildPrompt(input),
  };
}

function extractTextFromResponseContent(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (!item || typeof item !== "object") {
        return "";
      }

      return String(
        item.text ||
          item.output_text ||
          item.content ||
          item.value ||
          item.input_text ||
          "",
      ).trim();
    })
    .filter(Boolean)
    .join("\n");
}

function extractResponsesOutputText(payload) {
  const directOutputText = String(payload?.output_text || "").trim();
  if (directOutputText) {
    return directOutputText;
  }

  if (!Array.isArray(payload?.output)) {
    return "";
  }

  return payload.output
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      if (typeof item.content === "string") {
        return item.content.trim();
      }

      return extractTextFromResponseContent(item.content);
    })
    .filter(Boolean)
    .join("\n");
}

export async function requestWatchEcgAiAnalysis({
  viewModel = {},
  rhythmAnalysis = null,
  spectrumAnalysis = null,
  gatewayConfig,
  signal,
} = {}) {
  const config = resolveWatchEcgAiGatewayConfig(gatewayConfig);

  if (!config.isConfigured) {
    throw new Error(
      "前端 AI 网关未配置，请设置 VITE_WATCH_ECG_AI_BASE_URL / VITE_WATCH_ECG_AI_API_KEY / VITE_WATCH_ECG_AI_MODEL。",
    );
  }

  const gatewayUrl = resolveGatewayUrl(config);
  const input = buildWatchEcgAiInput({
    viewModel,
    rhythmAnalysis,
    spectrumAnalysis,
  });

  if (!input.record.id && !input.record.recordedAt) {
    throw new Error("当前还没有可分析的心电记录。");
  }

  const useDevProxy = shouldUseDevProxy(gatewayUrl);
  const requestHeaders = buildHeaders(config);
  const resolvedWireApi = normalizeWireApi(config.wireApi);

  if (useDevProxy) {
    requestHeaders["x-ai-gateway-target-url"] = gatewayUrl;
  }

  const response = await fetch(useDevProxy ? DEV_PROXY_ENDPOINT : gatewayUrl, {
    method: "POST",
    signal,
    headers: requestHeaders,
    body: JSON.stringify(
      resolvedWireApi === "responses"
        ? createResponsesRequestBody(config, input)
        : createChatCompletionsRequestBody(config, input),
    ),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const upstreamMessage = String(
      payload?.error?.message || payload?.message || "",
    ).trim();
    throw new Error(
      upstreamMessage || `第三方 AI 网关请求失败：HTTP ${response.status}`,
    );
  }

  const rawText =
    resolvedWireApi === "responses"
      ? extractResponsesOutputText(payload)
      : extractStructuredContent(payload?.choices?.[0]?.message?.content);
  let analysis = createFallbackAnalysis();

  try {
    analysis = parseAnalysisText(rawText);
  } catch {
    analysis = {
      ...createFallbackAnalysis(),
      summary: rawText ? "模型返回了非结构化文本，请人工复核。" : "",
    };
  }

  return {
    recordId: input.record.id,
    provider: config.provider,
    model: config.model,
    createdAt: new Date().toISOString(),
    advisory: useDevProxy
      ? "仅供辅助分析，不替代医生诊断；当前开发态已通过本地代理转发第三方请求。生产环境仍需后端或反向代理。"
      : "仅供辅助分析，不替代医生诊断；当前为前端直连模式，请使用受限网关凭证并确保第三方接口已开启浏览器 CORS。",
    analysis,
    rawText: rawText.trim(),
  };
}
