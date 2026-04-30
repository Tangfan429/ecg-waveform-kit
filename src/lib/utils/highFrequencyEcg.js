export const HIGH_FREQUENCY_ECG_TABLE_COLUMNS = Object.freeze([
  { key: "type", label: "" },
  { key: "I", label: "I" },
  { key: "II", label: "II" },
  { key: "III", label: "III" },
  { key: "aVR", label: "aVR" },
  { key: "aVL", label: "aVL" },
  { key: "aVF", label: "aVF" },
  { key: "V1", label: "V1" },
  { key: "V2", label: "V2" },
  { key: "V3", label: "V3" },
  { key: "V4", label: "V4" },
  { key: "V5", label: "V5" },
  { key: "V6", label: "V6" },
  { key: "total", label: "T0t." },
]);

export const HIGH_FREQUENCY_LIMB_LEADS = Object.freeze([
  "I",
  "II",
  "III",
  "aVR",
  "aVL",
  "aVF",
]);
export const HIGH_FREQUENCY_CHEST_LEADS = Object.freeze([
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
]);

const HIGH_FREQUENCY_LEAD_GROUP_MAP = Object.freeze({
  肢体导联: HIGH_FREQUENCY_LIMB_LEADS,
  胸导联: HIGH_FREQUENCY_CHEST_LEADS,
});

const DEFAULT_CONTROLS = Object.freeze({
  gain: "30mm/mV",
  speed: "300mm/s",
  leadGroup: "肢体导联",
  activeLead: "II",
});

const DEFAULT_GAIN_OPTIONS = Object.freeze(["10mm/mV", "20mm/mV", "30mm/mV"]);
const DEFAULT_SPEED_OPTIONS = Object.freeze(["25mm/s", "50mm/s", "300mm/s"]);
const DEFAULT_LEAD_GROUP_OPTIONS = Object.freeze(["肢体导联", "胸导联"]);
const DEFAULT_ACTIVE_LEAD_OPTIONS = HIGH_FREQUENCY_LIMB_LEADS;
const DEFAULT_TABLE_ROWS = Object.freeze([
  { type: "N" },
  { type: "N" },
  { type: "N" },
]);
const ECG_PIXELS_PER_MM = 5;
const DEFAULT_HIGH_FREQUENCY_LEAD_DURATION_SECONDS = 0.8;

const LEAD_TEMPLATE_PROFILE = Object.freeze({
  I: { polarity: 1, r: 0.94, s: -0.22, t: 0.1 },
  II: { polarity: 1, r: 1.2, s: -0.28, t: 0.12 },
  III: { polarity: 1, r: 0.62, s: -0.42, t: 0.08 },
  aVR: { polarity: -1, r: 1.05, s: -0.2, t: -0.04 },
  aVL: { polarity: 1, r: 0.58, s: -0.1, t: 0.34 },
  aVF: { polarity: 1, r: 0.86, s: -0.18, t: 0.12 },
  V1: { polarity: 1, r: 0.54, s: -0.76, t: 0.05 },
  V2: { polarity: 1, r: 0.72, s: -0.88, t: 0.08 },
  V3: { polarity: 1, r: 0.86, s: -0.64, t: 0.12 },
  V4: { polarity: 1, r: 1.02, s: -0.4, t: 0.16 },
  V5: { polarity: 1, r: 0.9, s: -0.28, t: 0.18 },
  V6: { polarity: 1, r: 0.74, s: -0.18, t: 0.16 },
});

const normalizeNumberSeries = (series) =>
  Array.isArray(series)
    ? series.map((value) => Number(value) || 0)
    : [];

const normalizeOptionList = (options, fallback) =>
  Array.isArray(options) && options.length ? options : [...fallback];

const parsePaperSettingValue = (label, fallbackValue) => {
  const value = Number.parseFloat(String(label || ""));
  return Number.isFinite(value) && value > 0 ? value : fallbackValue;
};

export function getHighFrequencyPixelsPerMv(gainLabel = DEFAULT_CONTROLS.gain) {
  const mmPerMv = parsePaperSettingValue(
    gainLabel,
    parsePaperSettingValue(DEFAULT_CONTROLS.gain, 30),
  );
  return mmPerMv * ECG_PIXELS_PER_MM;
}

export function getHighFrequencyPixelsPerSecond(
  speedLabel = DEFAULT_CONTROLS.speed,
) {
  const mmPerSecond = parsePaperSettingValue(
    speedLabel,
    parsePaperSettingValue(DEFAULT_CONTROLS.speed, 300),
  );
  return mmPerSecond * ECG_PIXELS_PER_MM;
}

export function getHighFrequencyViewportDurationSeconds({
  width,
  speedLabel = DEFAULT_CONTROLS.speed,
  horizontalPadding = 0,
} = {}) {
  const drawableWidth = Math.max(
    0,
    (Number(width) || 0) - Math.max(0, Number(horizontalPadding) || 0) * 2,
  );
  const pixelsPerSecond = getHighFrequencyPixelsPerSecond(speedLabel);
  return drawableWidth / pixelsPerSecond;
}

export function getHighFrequencyDetailCanvasWidth({
  viewportWidth,
  minWidth = 0,
} = {}) {
  return Math.max(
    Math.ceil(Number(minWidth) || 0),
    Math.ceil(Number(viewportWidth) || 0),
  );
}

export function getHighFrequencyLeadOptions(group) {
  return [...(HIGH_FREQUENCY_LEAD_GROUP_MAP[group] || HIGH_FREQUENCY_LIMB_LEADS)];
}

const gaussian = (x, center, width, amplitude) =>
  amplitude * Math.exp(-((x - center) ** 2) / (2 * width ** 2));

export function createHighFrequencyTemplateWaveform({
  lead = "II",
  sampleCount = 180,
} = {}) {
  const profile = LEAD_TEMPLATE_PROFILE[lead] || LEAD_TEMPLATE_PROFILE.II;

  return Array.from({ length: sampleCount }, (_, index) => {
    const x = index / Math.max(sampleCount - 1, 1);
    const baseline = Math.sin(x * Math.PI * 2) * 0.012;
    const value =
      baseline +
      gaussian(x, 0.16, 0.055, 0.18 * profile.polarity) +
      gaussian(x, 0.42, 0.035, -0.24 * profile.polarity) +
      gaussian(x, 0.5, 0.052, profile.r * profile.polarity) +
      gaussian(x, 0.6, 0.04, profile.s * profile.polarity) +
      gaussian(x, 0.78, 0.07, profile.t * profile.polarity);

    return Number(value.toFixed(4));
  });
}

export function createRhythmStripWaveform({
  lead = "II",
  sampleCount = 500,
  beatCount = 15,
} = {}) {
  const template = createHighFrequencyTemplateWaveform({
    lead,
    sampleCount: 84,
  });

  return Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / Math.max(sampleCount - 1, 1);
    const beatPosition = (progress * beatCount) % 1;
    const templateIndex = Math.min(
      Math.round(beatPosition * (template.length - 1)),
      template.length - 1,
    );
    const slowBaseline =
      Math.sin(progress * Math.PI * 5) * 0.018 +
      Math.sin(progress * Math.PI * 23) * 0.008;
    const qrsWindow =
      beatPosition > 0.34 && beatPosition < 0.68
        ? template[templateIndex] * 0.42
        : 0;

    return Number((slowBaseline + qrsWindow).toFixed(4));
  });
}

const createLegacyLeadSeries = (data) => {
  const profiles = Array.isArray(data?.leadProfiles) ? data.leadProfiles : [];
  const waveform = normalizeNumberSeries(data?.waveform);

  return profiles.map((profile) => ({
    lead: String(profile?.lead || ""),
    waveform,
  }));
};

const normalizeLeadSeries = (data) => {
  const leads = Array.isArray(data?.highFrequencyLeads)
    ? data.highFrequencyLeads
    : createLegacyLeadSeries(data);

  return leads
    .map((item) => ({
      lead: String(item?.lead || "").trim(),
      waveform: normalizeNumberSeries(item?.waveform),
    }))
    .filter((item) => item.lead && item.waveform.length);
};

const normalizeTableRow = (row) =>
  HIGH_FREQUENCY_ECG_TABLE_COLUMNS.reduce((result, column) => {
    result[column.key] = row?.[column.key] ?? "";
    return result;
  }, {});

export function normalizeHighFrequencyEcgData(data = {}) {
  const requestedActiveLead =
    data.controls?.activeLead || data.activeLead || DEFAULT_CONTROLS.activeLead;
  const requestedLeadGroup =
    data.controls?.leadGroup ||
    (HIGH_FREQUENCY_CHEST_LEADS.includes(requestedActiveLead)
      ? "胸导联"
      : DEFAULT_CONTROLS.leadGroup);
  const activeLeadOptions = getHighFrequencyLeadOptions(requestedLeadGroup);
  const controls = {
    ...DEFAULT_CONTROLS,
    ...(data.controls || {}),
    leadGroup: requestedLeadGroup,
    activeLead: activeLeadOptions.includes(requestedActiveLead)
      ? requestedActiveLead
      : activeLeadOptions[0],
  };
  const highFrequencyLeads = normalizeLeadSeries(data);
  const rhythmWaveform = normalizeNumberSeries(data.rhythmWaveform).length
    ? normalizeNumberSeries(data.rhythmWaveform)
    : normalizeNumberSeries(data.waveform);
  const sourceRows = Array.isArray(data.tableRows) && data.tableRows.length
    ? data.tableRows
    : DEFAULT_TABLE_ROWS;

  return {
    controls,
    controlOptions: {
      gains: normalizeOptionList(data.controlOptions?.gains, DEFAULT_GAIN_OPTIONS),
      speeds: normalizeOptionList(data.controlOptions?.speeds, DEFAULT_SPEED_OPTIONS),
      leadGroups: normalizeOptionList(
        data.controlOptions?.leadGroups,
        DEFAULT_LEAD_GROUP_OPTIONS,
      ),
      activeLeads: normalizeOptionList(
        data.controlOptions?.activeLeads,
        activeLeadOptions.length ? activeLeadOptions : DEFAULT_ACTIVE_LEAD_OPTIONS,
      ),
    },
    rhythm: {
      lead: controls.activeLead,
      waveform: rhythmWaveform,
      gainLabel: controls.gain,
      speedLabel: controls.speed,
      durationSeconds: Number(data.rhythm?.durationSeconds) || 10,
    },
    highFrequency: {
      gainLabel: controls.gain,
      speedLabel: controls.speed,
    },
    highFrequencyLeads,
    tableColumns: [...HIGH_FREQUENCY_ECG_TABLE_COLUMNS],
    tableRows: sourceRows.map(normalizeTableRow),
  };
}
