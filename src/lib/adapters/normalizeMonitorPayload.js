const MONITOR_CHANNEL_META = Object.freeze({
  ECG: {
    label: "ECG",
    color: "#32d583",
    unit: "mV",
    samplingRate: 250,
    lowerLimit: -2,
    upperLimit: 2,
  },
  RESP: {
    label: "呼吸波",
    color: "#36bffa",
    unit: "a.u.",
    samplingRate: 62,
    lowerLimit: -1.5,
    upperLimit: 1.5,
  },
  PLETH: {
    label: "脉搏容积波",
    color: "#fdb022",
    unit: "a.u.",
    samplingRate: 125,
    lowerLimit: -0.2,
    upperLimit: 1.8,
  },
  ART: {
    label: "有创动脉压",
    color: "#fb7185",
    unit: "mmHg",
    samplingRate: 125,
    lowerLimit: 20,
    upperLimit: 180,
  },
  CO2: {
    label: "呼末二氧化碳",
    color: "#a855f7",
    unit: "mmHg",
    samplingRate: 62,
    lowerLimit: 0,
    upperLimit: 55,
  },
  CVP: {
    label: "中心静脉压",
    color: "#2dd4bf",
    unit: "mmHg",
    samplingRate: 80,
    lowerLimit: 0,
    upperLimit: 20,
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
    samples: sanitizeSamples(item?.y || item?.value || item?.samples),
  };
}

export function normalizeMonitorPayload(payload = {}) {
  if (Array.isArray(payload?.channels)) {
    return {
      timestamp: Number(payload?.timestamp || Date.now()),
      source: payload?.source || "external",
      scenarioKey: payload?.scenarioKey || "external",
      scenarioLabel: payload?.scenarioLabel || "外部监护数据",
      monitorLabel: payload?.monitorLabel || "外部数据源",
      description: payload?.description || "",
      channels: payload.channels.map((item, index) =>
        normalizeRawWaveform(item, index, payload?.scenarioKey || "external"),
      ),
    };
  }

  const rawWaveforms = Array.isArray(payload?.waveforms) ? payload.waveforms : [];
  const scenarioKey = payload?.scenarioKey || "external";

  return {
    timestamp: Number(payload?.timestamp || Date.now()),
    source: payload?.source || "external",
    scenarioKey,
    scenarioLabel: payload?.scenarioLabel || "监护波形",
    monitorLabel: payload?.monitorLabel || "监护设备",
    description: payload?.description || "",
    channels: rawWaveforms.map((item, index) =>
      normalizeRawWaveform(item, index, scenarioKey),
    ),
  };
}

export default normalizeMonitorPayload;
