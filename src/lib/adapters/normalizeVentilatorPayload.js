const VENTILATOR_WAVE_META = Object.freeze({
  PAW: {
    label: "气道压力",
    color: "#4f7cff",
    unit: "cmH2O",
    samplingRate: 80,
    lowerLimit: 0,
    upperLimit: 40,
  },
  FLOW: {
    label: "流速",
    color: "#22c55e",
    unit: "L/min",
    samplingRate: 80,
    lowerLimit: -60,
    upperLimit: 60,
  },
  VOLUME: {
    label: "容量",
    color: "#f97316",
    unit: "mL",
    samplingRate: 80,
    lowerLimit: 0,
    upperLimit: 720,
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
    autoRange: item?.autoRange ?? true,
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
  if (Array.isArray(payload?.waveforms) || Array.isArray(payload?.loops)) {
    return {
      timestamp: Number(payload?.timestamp || Date.now()),
      source: payload?.source || "external",
      scenarioKey: payload?.scenarioKey || "external",
      scenarioLabel: payload?.scenarioLabel || "外部呼吸机数据",
      ventilatorLabel: payload?.ventilatorLabel || "外部设备",
      description: payload?.description || "",
      waveforms: (payload?.waveforms || []).map((item, index) =>
        normalizeWaveformItem(item, index, payload?.scenarioKey || "external"),
      ),
      loops: (payload?.loops || []).map((item, index) =>
        normalizeLoopItem(item, index, payload?.scenarioKey || "external"),
      ),
    };
  }

  const scenarioKey = payload?.scenarioKey || "external";

  return {
    timestamp: Number(payload?.timestamp || Date.now()),
    source: payload?.source || "external",
    scenarioKey,
    scenarioLabel: payload?.scenarioLabel || "呼吸机波形",
    ventilatorLabel: payload?.ventilatorLabel || "呼吸设备",
    description: payload?.description || "",
    waveforms: (payload?.waveList || []).map((item, index) =>
      normalizeWaveformItem(item, index, scenarioKey),
    ),
    loops: (payload?.circleList || []).map((item, index) =>
      normalizeLoopItem(item, index, scenarioKey),
    ),
  };
}

export default normalizeVentilatorPayload;
