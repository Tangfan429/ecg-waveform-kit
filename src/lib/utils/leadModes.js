export const LEAD_MODE_STANDARD = "standard12";
export const LEAD_MODE_LEAD_I = "leadI";

export const LEAD_MODE_OPTIONS = Object.freeze([
  {
    value: LEAD_MODE_STANDARD,
    label: "十二导联",
    shortLabel: "12 Lead",
    description: "标准十二导联联动视图",
    reportTitle: "十二导联心电图",
  },
  {
    value: LEAD_MODE_LEAD_I,
    label: "Lead I 单导联",
    shortLabel: "Lead I",
    description: "适配 iWatch / Apple Watch 类单导联视图",
    reportTitle: "Lead I 单导联心电图",
  },
]);

const STANDARD_LAYOUT_OPTIONS = Object.freeze([
  { label: "12×1", value: "12x1" },
  { label: "3×4", value: "3x4" },
  { label: "6×2", value: "6x2" },
  { label: "3×4+1R", value: "3x4+1R" },
  { label: "3×4+3R", value: "3x4+3R" },
  { label: "6×2+1R", value: "6x2+1R" },
  { label: "6×1", value: "6x1" },
]);

const LEAD_I_LAYOUT_OPTIONS = Object.freeze([
  { label: "Lead I", value: "leadI-single" },
]);

export function normalizeLeadMode(mode) {
  return mode === LEAD_MODE_LEAD_I ? LEAD_MODE_LEAD_I : LEAD_MODE_STANDARD;
}

export function isSingleLeadMode(mode) {
  return normalizeLeadMode(mode) === LEAD_MODE_LEAD_I;
}

export function getLeadModeConfig(mode) {
  const normalizedMode = normalizeLeadMode(mode);
  return (
    LEAD_MODE_OPTIONS.find((item) => item.value === normalizedMode) ||
    LEAD_MODE_OPTIONS[0]
  );
}

export function getDefaultLeadModeLayout(mode, analysisType = "waveform") {
  if (isSingleLeadMode(mode)) {
    return "leadI-single";
  }

  return analysisType === "rhythm" ? "3x4+1R" : "6x2+1R";
}

export function getLeadModeLayoutOptions(mode) {
  return isSingleLeadMode(mode)
    ? LEAD_I_LAYOUT_OPTIONS
    : STANDARD_LAYOUT_OPTIONS;
}

export function normalizeLeadModeLayout(
  mode,
  requestedLayout,
  analysisType = "waveform",
) {
  const resolvedLayout = String(requestedLayout || "").trim();
  const allowedLayouts = getLeadModeLayoutOptions(mode).map(
    (option) => option.value,
  );

  if (allowedLayouts.includes(resolvedLayout)) {
    return resolvedLayout;
  }

  return getDefaultLeadModeLayout(mode, analysisType);
}

export function getLeadModeWaveformData(mode, waveformData) {
  if (!waveformData || typeof waveformData !== "object") {
    return waveformData;
  }

  if (!isSingleLeadMode(mode)) {
    return waveformData;
  }

  return {
    I: Array.isArray(waveformData.I) ? waveformData.I : [],
  };
}

export function getLeadModePrintMeta(mode, printMeta = {}) {
  const leadModeConfig = getLeadModeConfig(mode);

  return {
    ...printMeta,
    reportTitle: leadModeConfig.reportTitle,
  };
}
