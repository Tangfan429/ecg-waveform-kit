const VENTILATOR_WAVE_META = Object.freeze({
  PAW: {
    label: "气道压力",
    color: "#4f7cff",
    unit: "cmH2O",
    samplingRate: 80,
    lowerLimit: 0,
    upperLimit: 40,
    renderMode: "sweep",
    fillArea: false,
  },
  FLOW: {
    label: "流速",
    color: "#22c55e",
    unit: "L/min",
    samplingRate: 80,
    lowerLimit: -60,
    upperLimit: 60,
    renderMode: "sweep",
    fillArea: false,
  },
  VOLUME: {
    label: "容量",
    color: "#f97316",
    unit: "mL",
    samplingRate: 80,
    lowerLimit: 0,
    upperLimit: 720,
    renderMode: "sweep",
    fillArea: false,
  },
});

const LOOP_META = Object.freeze({
  "Paw-V": {
    label: "压力-容量环",
    xUnit: "mL",
    yUnit: "cmH2O",
    color: "#4f7cff",
  },
  "Flow-Paw": {
    label: "流速-压力环",
    xUnit: "L/min",
    yUnit: "cmH2O",
    color: "#22c55e",
  },
  "V-Flow": {
    label: "容量-流速环",
    xUnit: "mL",
    yUnit: "L/min",
    color: "#f97316",
  },
});

function sanitizeNumberArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function sanitizePointTuple(tuple) {
  if (!Array.isArray(tuple) || tuple.length < 2) {
    return null;
  }

  const x = Number(tuple[0]);
  const y = Number(tuple[1]);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return [x, y];
}

function normalizeWarningItem(item, index) {
  if (typeof item === "string") {
    return {
      id: `ventilator-warning:${index}`,
      level: "info",
      title: "",
      text: item,
      time: "",
      raw: item,
    };
  }

  return {
    id: String(item?.id || item?.code || `ventilator-warning:${index}`),
    level: item?.level || item?.severity || item?.type || "info",
    title: item?.title || item?.name || "",
    text: item?.text || item?.message || item?.raw_text || "",
    time: item?.time || item?.timestamp || "",
    raw: item,
  };
}

function normalizeMetricItem(item, index) {
  if (typeof item === "string") {
    return {
      id: `ventilator-metric:${index}`,
      name: item,
      presetValue: "",
      currentValue: "",
      unit: "",
      raw: item,
    };
  }

  return {
    id: String(item?.id || item?.name || `ventilator-metric:${index}`),
    name: item?.name || item?.label || `指标 ${index + 1}`,
    presetValue: item?.presetValue ?? item?.preset_value ?? item?.yValue ?? "",
    currentValue: item?.currentValue ?? item?.value ?? item?.jValue ?? "",
    unit: item?.unit || "",
    raw: item,
  };
}

function normalizeWaveformItem(item, index, scenarioKey) {
  const code = String(item?.code || item?.name || `W${index + 1}`).toUpperCase();
  const meta = VENTILATOR_WAVE_META[code] || {};

  return {
    id: `${scenarioKey || "ventilator"}:${code}:${index}`,
    code,
    label: item?.label || meta.label || code,
    color: item?.color || meta.color || "#60a5fa",
    unit: item?.unit || meta.unit || "a.u.",
    samplingRate: Number(item?.samplingRate || meta.samplingRate || 80),
    lowerLimit: Number(item?.lowerLimit ?? meta.lowerLimit ?? -1),
    upperLimit: Number(item?.upperLimit ?? meta.upperLimit ?? 1),
    autoRange: item?.autoRange ?? false,
    renderMode: item?.renderMode || meta.renderMode || "sweep",
    fillArea: item?.fillArea ?? meta.fillArea ?? false,
    samples: sanitizeNumberArray(item?.value || item?.samples),
  };
}

function normalizeLoopItem(item, index, scenarioKey) {
  const key = String(item?.key || item?.name || `L${index + 1}`);
  const meta = LOOP_META[key] || {};

  return {
    id: `${scenarioKey || "ventilator"}:${key}:${index}`,
    key,
    label: item?.label || meta.label || key,
    color: item?.color || meta.color || "#64748b",
    xUnit: item?.xUnit || meta.xUnit || "",
    yUnit: item?.yUnit || meta.yUnit || "",
    points: (Array.isArray(item?.list) ? item.list : [])
      .map(sanitizePointTuple)
      .filter(Boolean),
  };
}

export function normalizeVentilatorPayload(payload = {}) {
  const scenarioKey = payload?.scenarioKey || "external";
  const rawWaveforms = Array.isArray(payload?.waveforms)
    ? payload.waveforms
    : Array.isArray(payload?.waveList)
      ? payload.waveList
      : [];
  const rawLoops = Array.isArray(payload?.loops)
    ? payload.loops
    : Array.isArray(payload?.circleList)
      ? payload.circleList
      : [];
  const rawMetrics = Array.isArray(payload?.metrics)
    ? payload.metrics
    : Array.isArray(payload?.list)
      ? payload.list
      : [];
  const rawWarnings = Array.isArray(payload?.warning) ? payload.warning : [];

  return {
    timestamp: Number(payload?.timestamp || Date.now()),
    source: payload?.source || "external",
    scenarioKey,
    scenarioLabel:
      payload?.scenarioLabel ||
      (Array.isArray(payload?.waveforms) ? "外部呼吸机数据" : "呼吸机波形"),
    ventilatorLabel: payload?.ventilatorLabel || "呼吸机设备",
    description: payload?.description || "",
    waveforms: rawWaveforms.map((item, index) =>
      normalizeWaveformItem(item, index, scenarioKey),
    ),
    loops: rawLoops.map((item, index) =>
      normalizeLoopItem(item, index, scenarioKey),
    ),
    metrics: rawMetrics.map(normalizeMetricItem),
    warning: rawWarnings.map(normalizeWarningItem),
    raw: payload,
  };
}

export default normalizeVentilatorPayload;
