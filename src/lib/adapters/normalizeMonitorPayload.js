const MONITOR_CHANNEL_META = Object.freeze({
  ECG: {
    label: "ECG",
    color: "#32d583",
    unit: "mV",
    samplingRate: 250,
    lowerLimit: -2,
    upperLimit: 2,
    renderMode: "scroll",
    fillArea: true,
  },
  RESP: {
    label: "呼吸波",
    color: "#36bffa",
    unit: "a.u.",
    samplingRate: 62,
    lowerLimit: -1.5,
    upperLimit: 1.5,
    renderMode: "scroll",
    fillArea: false,
  },
  PLETH: {
    label: "脉搏容积波",
    color: "#fdb022",
    unit: "a.u.",
    samplingRate: 125,
    lowerLimit: -0.2,
    upperLimit: 1.8,
    renderMode: "scroll",
    fillArea: true,
  },
  ART: {
    label: "有创动脉压",
    color: "#fb7185",
    unit: "mmHg",
    samplingRate: 125,
    lowerLimit: 20,
    upperLimit: 180,
    renderMode: "scroll",
    fillArea: true,
  },
  CO2: {
    label: "呼末二氧化碳",
    color: "#a855f7",
    unit: "mmHg",
    samplingRate: 62,
    lowerLimit: 0,
    upperLimit: 55,
    renderMode: "scroll",
    fillArea: false,
  },
  CVP: {
    label: "中心静脉压",
    color: "#2dd4bf",
    unit: "mmHg",
    samplingRate: 80,
    lowerLimit: 0,
    upperLimit: 20,
    renderMode: "scroll",
    fillArea: true,
  },
});

function sanitizeSamples(samples) {
  if (!Array.isArray(samples)) {
    return [];
  }

  return samples
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function normalizeWarningItem(item, index) {
  if (typeof item === "string") {
    return {
      id: `monitor-warning:${index}`,
      level: "info",
      title: "",
      text: item,
      time: "",
      raw: item,
    };
  }

  return {
    id: String(item?.id || item?.code || `monitor-warning:${index}`),
    level: item?.level || item?.severity || item?.type || "info",
    title: item?.title || item?.name || "",
    text: item?.text || item?.message || item?.raw_text || "",
    time: item?.time || item?.date_minute || item?.timestamp || "",
    raw: item,
  };
}

function normalizeNibpHistoryItem(item, index) {
  if (typeof item === "string") {
    return {
      id: `monitor-nibp:${index}`,
      time: "",
      text: item,
      raw: item,
    };
  }

  return {
    id: String(item?.id || `monitor-nibp:${index}`),
    time: item?.time || item?.date_minute || "",
    text: item?.raw_text || item?.text || "",
    raw: item,
  };
}

function normalizeRawWaveform(item, index, scenarioKey) {
  const code = String(item?.code || item?.name || `CH${index + 1}`).toUpperCase();
  const meta = MONITOR_CHANNEL_META[code] || {};

  return {
    id: `${scenarioKey || "monitor"}:${code}:${index}`,
    code,
    label: item?.label || meta.label || code,
    color: item?.color || item?.wave_color || meta.color || "#60a5fa",
    unit: item?.unit || meta.unit || "a.u.",
    samplingRate: Number(item?.samplingRate || meta.samplingRate || 60),
    lowerLimit: Number(item?.lowerLimit ?? meta.lowerLimit ?? -1),
    upperLimit: Number(item?.upperLimit ?? meta.upperLimit ?? 1),
    autoRange: item?.autoRange ?? true,
    renderMode: item?.renderMode || meta.renderMode || "scroll",
    fillArea: item?.fillArea ?? meta.fillArea ?? true,
    samples: sanitizeSamples(item?.y || item?.value || item?.samples),
  };
}

function normalizeVitals(vitals) {
  if (!vitals || typeof vitals !== "object" || Array.isArray(vitals)) {
    return {};
  }

  return { ...vitals };
}

export function normalizeMonitorPayload(payload = {}) {
  const scenarioKey = payload?.scenarioKey || "external";
  const rawChannels = Array.isArray(payload?.channels)
    ? payload.channels
    : Array.isArray(payload?.waveforms)
      ? payload.waveforms
      : [];
  const rawWarnings = Array.isArray(payload?.warning) ? payload.warning : [];
  const rawNibpHistory = Array.isArray(payload?.nibpHistory)
    ? payload.nibpHistory
    : Array.isArray(payload?.nibp_history)
      ? payload.nibp_history
      : [];

  return {
    timestamp: Number(payload?.timestamp || Date.now()),
    source: payload?.source || "external",
    scenarioKey,
    scenarioLabel:
      payload?.scenarioLabel ||
      (Array.isArray(payload?.channels) ? "外部监护数据" : "监护波形"),
    monitorLabel: payload?.monitorLabel || "监护设备",
    description: payload?.description || "",
    channels: rawChannels.map((item, index) =>
      normalizeRawWaveform(item, index, scenarioKey),
    ),
    vitals: normalizeVitals(payload?.vitals),
    warning: rawWarnings.map(normalizeWarningItem),
    nibpHistory: rawNibpHistory.map(normalizeNibpHistoryItem),
    raw: payload,
  };
}

export default normalizeMonitorPayload;
