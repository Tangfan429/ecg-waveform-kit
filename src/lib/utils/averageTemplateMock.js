import { generateMockWaveform } from "./mockWaveformData";

export const AVERAGE_TEMPLATE_DEFAULT_LEAD = "II";

export const AVERAGE_TEMPLATE_LEAD_OPTIONS = [
  { value: "I", label: "I" },
  { value: "II", label: "II" },
  { value: "III", label: "III" },
  { value: "aVR", label: "aVR" },
  { value: "aVL", label: "aVL" },
  { value: "aVF", label: "aVF" },
  { value: "V1", label: "V1" },
  { value: "V2", label: "V2" },
  { value: "V3", label: "V3" },
  { value: "V4", label: "V4" },
  { value: "V5", label: "V5" },
  { value: "V6", label: "V6" },
  { value: "ALL", label: "ALL" },
];

export const AVERAGE_TEMPLATE_LINE_LEADS = AVERAGE_TEMPLATE_LEAD_OPTIONS
  .filter((item) => item.value !== "ALL")
  .map((item) => item.value);

const LEAD_MEASUREMENT_PRESETS = {
  I: {
    hr: 92,
    pr: 132,
    prInterval: 172,
    qrs: 79,
    qt: 379,
    qtc: 409,
    pAxis: 64,
    qrsAxis: 42,
    tAxis: 18,
    rv5: 1.426,
    sv1: 0.886,
    rv5sv1Sum: 2.312,
    rv6: 1.118,
    sv2: 1.201,
  },
  II: {
    hr: 95,
    pr: 135,
    prInterval: 177,
    qrs: 81,
    qt: 384,
    qtc: 415,
    pAxis: 69,
    qrsAxis: 46,
    tAxis: 23,
    rv5: 1.517,
    sv1: 0.934,
    rv5sv1Sum: 2.451,
    rv6: 1.207,
    sv2: 1.278,
  },
  III: {
    hr: 97,
    pr: 139,
    prInterval: 181,
    qrs: 83,
    qt: 389,
    qtc: 419,
    pAxis: 72,
    qrsAxis: 51,
    tAxis: 27,
    rv5: 1.561,
    sv1: 0.962,
    rv5sv1Sum: 2.523,
    rv6: 1.248,
    sv2: 1.331,
  },
  aVR: {
    hr: 90,
    pr: 128,
    prInterval: 168,
    qrs: 77,
    qt: 376,
    qtc: 404,
    pAxis: -54,
    qrsAxis: -32,
    tAxis: -18,
    rv5: 1.214,
    sv1: 0.802,
    rv5sv1Sum: 2.016,
    rv6: 1.047,
    sv2: 1.148,
  },
  aVL: {
    hr: 91,
    pr: 130,
    prInterval: 170,
    qrs: 78,
    qt: 378,
    qtc: 406,
    pAxis: 48,
    qrsAxis: 24,
    tAxis: 14,
    rv5: 1.308,
    sv1: 0.841,
    rv5sv1Sum: 2.149,
    rv6: 1.086,
    sv2: 1.176,
  },
  aVF: {
    hr: 93,
    pr: 133,
    prInterval: 174,
    qrs: 80,
    qt: 382,
    qtc: 412,
    pAxis: 57,
    qrsAxis: 38,
    tAxis: 19,
    rv5: 1.402,
    sv1: 0.901,
    rv5sv1Sum: 2.303,
    rv6: 1.163,
    sv2: 1.221,
  },
  V1: {
    hr: 94,
    pr: 134,
    prInterval: 175,
    qrs: 84,
    qt: 385,
    qtc: 414,
    pAxis: 61,
    qrsAxis: 41,
    tAxis: 16,
    rv5: 1.286,
    sv1: 1.164,
    rv5sv1Sum: 2.45,
    rv6: 1.102,
    sv2: 1.441,
  },
  V2: {
    hr: 96,
    pr: 136,
    prInterval: 178,
    qrs: 86,
    qt: 387,
    qtc: 417,
    pAxis: 63,
    qrsAxis: 44,
    tAxis: 18,
    rv5: 1.334,
    sv1: 1.208,
    rv5sv1Sum: 2.542,
    rv6: 1.155,
    sv2: 1.497,
  },
  V3: {
    hr: 97,
    pr: 138,
    prInterval: 180,
    qrs: 87,
    qt: 390,
    qtc: 421,
    pAxis: 66,
    qrsAxis: 48,
    tAxis: 22,
    rv5: 1.446,
    sv1: 1.082,
    rv5sv1Sum: 2.528,
    rv6: 1.226,
    sv2: 1.415,
  },
  V4: {
    hr: 95,
    pr: 135,
    prInterval: 177,
    qrs: 82,
    qt: 384,
    qtc: 415,
    pAxis: 69,
    qrsAxis: 46,
    tAxis: 24,
    rv5: 1.518,
    sv1: 0.934,
    rv5sv1Sum: 2.452,
    rv6: 1.207,
    sv2: 1.278,
  },
  V5: {
    hr: 94,
    pr: 133,
    prInterval: 175,
    qrs: 80,
    qt: 382,
    qtc: 412,
    pAxis: 70,
    qrsAxis: 49,
    tAxis: 25,
    rv5: 1.592,
    sv1: 0.914,
    rv5sv1Sum: 2.506,
    rv6: 1.252,
    sv2: 1.242,
  },
  V6: {
    hr: 93,
    pr: 132,
    prInterval: 173,
    qrs: 79,
    qt: 380,
    qtc: 409,
    pAxis: 68,
    qrsAxis: 47,
    tAxis: 21,
    rv5: 1.463,
    sv1: 0.876,
    rv5sv1Sum: 2.339,
    rv6: 1.193,
    sv2: 1.188,
  },
};

const FILLER_ROW_LABELS = [
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV5/SV1(mv)",
  "RV5+SV1(mV)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV5/SV1(mv)",
  "RV5+SV1(mV)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
  "RV6/SV2(mv)",
];

const waveCache = new Map();

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extractAverageTemplateWave(lead) {
  if (waveCache.has(lead)) {
    return waveCache.get(lead);
  }

  const waveform = generateMockWaveform(lead, 2.4, 500);
  const peakIndex = waveform.reduce((bestIndex, currentValue, currentIndex) => {
    const currentAbs = Math.abs(currentValue);
    const bestAbs = Math.abs(waveform[bestIndex] || 0);
    return currentAbs > bestAbs ? currentIndex : bestIndex;
  }, 0);
  const segmentStart = Math.max(0, peakIndex - 190);
  const segmentEnd = Math.min(waveform.length, peakIndex + 340);
  const rawSegment = waveform.slice(segmentStart, segmentEnd);
  const baseline = average(rawSegment.slice(0, 48));
  const normalizedSegment = rawSegment.map((point) => point - baseline);

  waveCache.set(lead, normalizedSegment);
  return normalizedSegment;
}

function formatMetricValue(label, metrics) {
  if (label === "RV5/SV1(mv)") {
    return `${metrics.rv5.toFixed(3)} /${metrics.sv1.toFixed(3)}`;
  }

  if (label === "RV5+SV1(mV)") {
    return metrics.rv5sv1Sum.toFixed(3);
  }

  return `${metrics.rv6.toFixed(3)} /${metrics.sv2.toFixed(3)}`;
}

function normalizeAverageTemplateWaveLeads(selectedLeads) {
  const leadValues = Array.isArray(selectedLeads) ? selectedLeads : [];
  const normalized = [];

  leadValues.forEach((lead) => {
    if (
      AVERAGE_TEMPLATE_LINE_LEADS.includes(lead) &&
      !normalized.includes(lead)
    ) {
      normalized.push(lead);
    }
  });

  return normalized.length ? normalized : [AVERAGE_TEMPLATE_DEFAULT_LEAD];
}

export function getAverageTemplateDisplayLead(leadFilter) {
  return leadFilter === "ALL" ? AVERAGE_TEMPLATE_DEFAULT_LEAD : leadFilter;
}

export function getAverageTemplateWavePayload(currentLead, selectedLeads) {
  const displayLeads = normalizeAverageTemplateWaveLeads(selectedLeads);
  const focusLead = displayLeads.includes(currentLead)
    ? currentLead
    : displayLeads[displayLeads.length - 1];

  const lines = displayLeads
    .map((lead) => ({
      id: lead,
      lead,
      isPrimary: lead === focusLead,
      wave: extractAverageTemplateWave(lead),
    }))
    .sort((left, right) => Number(left.isPrimary) - Number(right.isPrimary));

  return {
    focusLead,
    lines,
  };
}

export function getAverageTemplateMeasurementRows(lead) {
  const metrics =
    LEAD_MEASUREMENT_PRESETS[lead] ||
    LEAD_MEASUREMENT_PRESETS[AVERAGE_TEMPLATE_DEFAULT_LEAD];

  const baseRows = [
    { label: "HR", value: `${metrics.hr}bpm` },
    { label: "PR", value: `${metrics.pr}ms` },
    { label: "PR(ms)", value: String(metrics.prInterval) },
    { label: "QRS(ms)", value: String(metrics.qrs) },
    { label: "QT/QTc(ms)", value: `${metrics.qt}/ ${metrics.qtc}` },
    {
      label: "P/QRS/T(deg.)",
      value: `${metrics.pAxis}/ ${metrics.qrsAxis} / ${metrics.tAxis}`,
    },
    {
      label: "RV5/SV1(mv)",
      value: `${metrics.rv5.toFixed(3)} /${metrics.sv1.toFixed(3)}`,
    },
    { label: "RV5+SV1(mV)", value: metrics.rv5sv1Sum.toFixed(3) },
    {
      label: "RV6/SV2(mv)",
      value: `${metrics.rv6.toFixed(3)} /${metrics.sv2.toFixed(3)}`,
    },
  ];

  const fillerRows = FILLER_ROW_LABELS.map((label, index) => ({
    label,
    value: formatMetricValue(label, {
      ...metrics,
      rv5: metrics.rv5 + index * 0.001,
      sv1: metrics.sv1 + index * 0.001,
      rv5sv1Sum: metrics.rv5sv1Sum + index * 0.002,
      rv6: metrics.rv6 + index * 0.001,
      sv2: metrics.sv2 + index * 0.001,
    }),
  }));

  return [...baseRows, ...fillerRows];
}
