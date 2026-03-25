export const AVERAGE_TEMPLATE_CHART_SIZE = {
  width: 1373,
  height: 841,
};

export const AVERAGE_TEMPLATE_PLOT_AREA = {
  left: 11.5,
  top: 8,
  width: 1350,
  height: 825,
  smallGridSize: 5,
  largeGridSize: 25,
};

AVERAGE_TEMPLATE_PLOT_AREA.right =
  AVERAGE_TEMPLATE_PLOT_AREA.left + AVERAGE_TEMPLATE_PLOT_AREA.width;
AVERAGE_TEMPLATE_PLOT_AREA.bottom =
  AVERAGE_TEMPLATE_PLOT_AREA.top + AVERAGE_TEMPLATE_PLOT_AREA.height;

export const AVERAGE_TEMPLATE_SAMPLE_RATE = 500;

export const AVERAGE_TEMPLATE_GAIN_OPTIONS = [
  { label: "10mm/mV", value: "10" },
  { label: "20mm/mV", value: "20" },
  { label: "40mm/mV", value: "40" },
  { label: "100mm/mV", value: "100" },
];

export const AVERAGE_TEMPLATE_SPEED_OPTIONS = [
  { label: "25mm/s", value: "25" },
  { label: "50mm/s", value: "50" },
  { label: "100mm/s", value: "100" },
  { label: "200mm/s", value: "200" },
];

const GAIN_CONFIGS = {
  "10": {
    label: "10mm/mV",
    pixelsPerMv: 20,
  },
  "20": {
    label: "20mm/mV",
    pixelsPerMv: 40,
  },
  "40": {
    label: "40mm/mV",
    pixelsPerMv: 80,
  },
  "100": {
    label: "100mm/mV",
    pixelsPerMv: 200,
  },
};

const SPEED_CONFIGS = {
  "25": {
    label: "25mm/s",
    pixelsPerSecond: 125,
  },
  "50": {
    label: "50mm/s",
    pixelsPerSecond: 250,
  },
  "100": {
    label: "100mm/s",
    pixelsPerSecond: 500,
  },
  "200": {
    label: "200mm/s",
    pixelsPerSecond: 1000,
  },
};

export const AVERAGE_TEMPLATE_MARKERS = [
  { key: "P1", ratio: 0.145, width: 19 },
  { key: "P2", ratio: 0.273, width: 22 },
  { key: "Q", ratio: 0.336, width: 15 },
  { key: "S", ratio: 0.417, width: 13 },
  { key: "T1", ratio: 0.526, width: 19 },
  { key: "T2", ratio: 0.746, width: 22 },
];

export const AVERAGE_TEMPLATE_WAVE_LAYOUT = {
  startPadding: 1.5,
  trailingPadding: AVERAGE_TEMPLATE_PLOT_AREA.largeGridSize,
  topPadding: 24,
  bottomPadding: 38,
  markerLabelY: 617,
  preferredBaselineY:
    AVERAGE_TEMPLATE_PLOT_AREA.top + AVERAGE_TEMPLATE_PLOT_AREA.height * 0.48,
};

export function getAverageTemplateGainConfig(gainValue) {
  return GAIN_CONFIGS[gainValue] || GAIN_CONFIGS["100"];
}

export function getAverageTemplateSpeedConfig(speedValue) {
  return SPEED_CONFIGS[speedValue] || SPEED_CONFIGS["200"];
}

export function getAverageTemplatePixelsPerMv(gainValue) {
  return getAverageTemplateGainConfig(gainValue).pixelsPerMv;
}

export function getAverageTemplatePixelsPerSecond(speedValue) {
  return getAverageTemplateSpeedConfig(speedValue).pixelsPerSecond;
}
