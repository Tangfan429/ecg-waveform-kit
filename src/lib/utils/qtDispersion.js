export const QT_DISPERSION_LEADS = Object.freeze([
  "I",
  "II",
  "III",
  "aVR",
  "aVL",
  "aVF",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
]);

export const QT_MEASUREMENT_MODES = Object.freeze([
  { value: "single", label: "单拍模式" },
  { value: "three", label: "三拍模式" },
]);

const DEFAULT_CONTROLS = Object.freeze({
  gain: "30mm/mV",
  speed: "300mm/s",
  leadGroup: "肢体导联",
  activeLead: "II",
  mode: "single",
});

const DEFAULT_CONTROL_OPTIONS = Object.freeze({
  gains: ["10mm/mV", "20mm/mV", "30mm/mV"],
  speeds: ["25mm/s", "50mm/s", "300mm/s"],
  leadGroups: ["肢体导联", "胸导联"],
  activeLeads: [...QT_DISPERSION_LEADS],
  modes: QT_MEASUREMENT_MODES,
});

const LEAD_PROFILE = Object.freeze({
  I: { polarity: 1, r: 0.9, s: -0.14, t: 0.28 },
  II: { polarity: 1, r: 1.1, s: -0.16, t: 0.32 },
  III: { polarity: 1, r: 0.62, s: -0.18, t: 0.22 },
  aVR: { polarity: -1, r: 0.9, s: -0.12, t: 0.18 },
  aVL: { polarity: 1, r: 0.48, s: -0.08, t: 0.2 },
  aVF: { polarity: 1, r: 0.74, s: -0.12, t: 0.24 },
  V1: { polarity: 1, r: 0.42, s: -0.74, t: 0.1 },
  V2: { polarity: 1, r: 0.68, s: -0.82, t: 0.2 },
  V3: { polarity: 1, r: 0.86, s: -0.56, t: 0.28 },
  V4: { polarity: 1, r: 1.1, s: -0.34, t: 0.34 },
  V5: { polarity: 1, r: 0.98, s: -0.22, t: 0.32 },
  V6: { polarity: 1, r: 0.78, s: -0.16, t: 0.28 },
});

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const gaussian = (x, center, width, amplitude) =>
  amplitude * Math.exp(-((x - center) ** 2) / (2 * width ** 2));

export function createQtDispersionLeadWaveform({
  lead = "II",
  sampleCount = 720,
  beatCount = 5,
} = {}) {
  const profile = LEAD_PROFILE[lead] || LEAD_PROFILE.II;

  return Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / Math.max(sampleCount - 1, 1);
    const beat = (progress * beatCount) % 1;
    const baseline =
      Math.sin(progress * Math.PI * 7) * 0.018 +
      Math.sin(progress * Math.PI * 29) * 0.006;
    const value =
      baseline +
      gaussian(beat, 0.16, 0.038, 0.08 * profile.polarity) +
      gaussian(beat, 0.34, 0.015, -0.12 * profile.polarity) +
      gaussian(beat, 0.38, 0.018, profile.r * profile.polarity) +
      gaussian(beat, 0.43, 0.022, profile.s * profile.polarity) +
      gaussian(beat, 0.68, 0.07, profile.t * profile.polarity);

    return Number(value.toFixed(4));
  });
}

const normalizeBeat = (beat, index) => ({
  id: String(beat?.id || `beat-${index + 1}`),
  index,
  label: beat?.label || `第${index + 1}拍`,
  kind: beat?.kind || "normal",
  blocked: Boolean(beat?.blocked),
  tWaveClear: beat?.tWaveClear !== false,
  position: normalizeNumber(beat?.position, 0),
});

const isEligibleBeat = (beat) =>
  beat.kind === "normal" && !beat.blocked && beat.tWaveClear;

export function getSelectableQtBeats(beats = []) {
  return beats.map(normalizeBeat).filter(isEligibleBeat);
}

export function validateQtBeatSelection({
  mode = "single",
  selectedBeatIds = [],
  beats = [],
} = {}) {
  const normalizedBeats = beats.map(normalizeBeat);
  const selectedBeats = selectedBeatIds
    .map((id) => normalizedBeats.find((beat) => beat.id === id))
    .filter(Boolean);

  if (mode === "single") {
    if (selectedBeats.length !== 1) {
      return { valid: false, reason: "单拍模式必须选择唯一一个心搏" };
    }

    return isEligibleBeat(selectedBeats[0])
      ? { valid: true, reason: "" }
      : { valid: false, reason: "所选心搏不符合 QT 测量条件" };
  }

  if (selectedBeats.length !== 3) {
    return { valid: false, reason: "三拍模式必须选择连续三个心搏" };
  }

  const sortedBeats = [...selectedBeats].sort((a, b) => a.index - b.index);
  const consecutive = sortedBeats.every(
    (beat, index) => index === 0 || beat.index === sortedBeats[index - 1].index + 1,
  );
  if (!consecutive) {
    return { valid: false, reason: "三拍模式要求选择连续心搏" };
  }

  if (!sortedBeats.every(isEligibleBeat)) {
    return { valid: false, reason: "三拍模式必须排除早搏、传导阻滞和 T 波不清心搏" };
  }

  return { valid: true, reason: "" };
}

const normalizeMeasurementRow = (row) => ({
  lead: String(row?.lead || ""),
  qt: normalizeNumber(row?.qt, 0),
  qtc: normalizeNumber(row?.qtc, 0),
});

const buildMeasurementRows = (rows = []) => {
  const rowMap = new Map(rows.map((row) => [row.lead, row]));

  return QT_DISPERSION_LEADS.map((lead) =>
    normalizeMeasurementRow(rowMap.get(lead) || { lead, qt: 0, qtc: 0 }),
  );
};

const getExtremes = (rows, key) => {
  const validRows = rows.filter((row) => normalizeNumber(row[key]) > 0);
  if (!validRows.length) {
    return {
      max: { lead: "", value: 0 },
      min: { lead: "", value: 0 },
    };
  }

  return validRows.reduce(
    (result, row) => {
      const value = normalizeNumber(row[key]);
      if (value > result.max.value) result.max = { lead: row.lead, value };
      if (value < result.min.value) result.min = { lead: row.lead, value };
      return result;
    },
    {
      max: { lead: validRows[0].lead, value: normalizeNumber(validRows[0][key]) },
      min: { lead: validRows[0].lead, value: normalizeNumber(validRows[0][key]) },
    },
  );
};

const defaultBeats = Object.freeze([
  { id: "b1", label: "第1拍", kind: "normal", blocked: false, tWaveClear: true, position: 0.14 },
  { id: "b2", label: "第2拍", kind: "normal", blocked: false, tWaveClear: true, position: 0.32 },
  { id: "b3", label: "第3拍", kind: "normal", blocked: false, tWaveClear: true, position: 0.5 },
  { id: "b4", label: "第4拍", kind: "normal", blocked: false, tWaveClear: true, position: 0.68 },
  { id: "b5", label: "第5拍", kind: "normal", blocked: false, tWaveClear: true, position: 0.86 },
]);

export function normalizeQtDispersionData(data = {}) {
  const measurementRows = buildMeasurementRows(
    Array.isArray(data.measurementRows) ? data.measurementRows : data.rows,
  );
  const qtExtremes = getExtremes(measurementRows, "qt");
  const qtcExtremes = getExtremes(measurementRows, "qtc");
  const beats = Array.isArray(data.beats) && data.beats.length ? data.beats : defaultBeats;
  const controls = {
    ...DEFAULT_CONTROLS,
    ...(data.controls || {}),
  };
  const selectedBeatIds = Array.isArray(data.selectedBeatIds) && data.selectedBeatIds.length
    ? data.selectedBeatIds
    : [beats[1]?.id || beats[0]?.id].filter(Boolean);

  return {
    title: data.title || "QT离散度",
    controls,
    controlOptions: {
      ...DEFAULT_CONTROL_OPTIONS,
      ...(data.controlOptions || {}),
    },
    beats: beats.map(normalizeBeat),
    selectedBeatIds,
    selectionValidation: validateQtBeatSelection({
      mode: controls.mode,
      selectedBeatIds,
      beats,
    }),
    leadWaveforms: QT_DISPERSION_LEADS.map((lead) => ({
      lead,
      waveform:
        data.leadWaveforms?.[lead] ||
        data.leadWaveforms?.find?.((item) => item.lead === lead)?.waveform ||
        createQtDispersionLeadWaveform({ lead }),
    })),
    measurementRows,
    summary: {
      qtd: Math.max(qtExtremes.max.value - qtExtremes.min.value, 0),
      qtcd: Math.max(qtcExtremes.max.value - qtcExtremes.min.value, 0),
    },
    extremes: {
      maxQt: qtExtremes.max,
      minQt: qtExtremes.min,
      maxQtc: qtcExtremes.max,
      minQtc: qtcExtremes.min,
    },
  };
}
