export const VECTOR_ECG_DEFAULT_PLOTS = Object.freeze([
  {
    key: "frontal",
    label: "额面向量图",
    plane: "Frontal",
    planeCode: "F",
    color: "#D54941",
    labels: ["Ⅲ", "Ⅱ", "Ⅳ", "X", "Y", "Ⅰ"],
    cornerStats: ["0.04%", "0.00%", "0.25%", "99.71%"],
  },
  {
    key: "horizontal",
    label: "横面向量图",
    plane: "Horizontal",
    planeCode: "H",
    color: "#2BA471",
    labels: ["Ⅲ", "Ⅱ", "Ⅳ", "X", "Y", "Ⅰ"],
    cornerStats: ["1.55%", "49.47%", "0.00%", "48.98%"],
  },
  {
    key: "sagittal",
    label: "右侧面向量图",
    plane: "Right sagittal",
    planeCode: "S",
    color: "#0EA5E9",
    labels: ["Ⅲ", "Ⅱ", "Ⅳ", "X", "Y", "Ⅰ"],
    cornerStats: ["1.55%", "49.47%", "0.00%", "48.98%"],
  },
]);

export const VECTOR_ECG_SCALE_OPTIONS = Object.freeze([
  { value: "20mm/mV", label: "20mm/mV" },
  { value: "10mm/mV", label: "10mm/mV" },
  { value: "5mm/mV", label: "5mm/mV" },
]);

export const VECTOR_ECG_RATIO_OPTIONS = Object.freeze([
  { value: "100/20/40 mm/mv", label: "100/20/40 mm/mv" },
  { value: "50/10/20 mm/mv", label: "50/10/20 mm/mv" },
  { value: "25/5/10 mm/mv", label: "25/5/10 mm/mv" },
]);

export const VECTOR_ECG_PLANE_MODES = Object.freeze([
  { value: "waveform", label: "波形" },
  { value: "frontal", label: "额面(F)" },
  { value: "horizontal", label: "横面(H)" },
  { value: "sagittal", label: "右侧面(S)" },
  { value: "all", label: "ALL" },
]);

export const VECTOR_ECG_LOOP_MODES = Object.freeze([
  { value: "p", label: "P环" },
  { value: "qrs", label: "QRS环" },
  { value: "t", label: "T环" },
  { value: "all", label: "ALL" },
]);

const DEFAULT_PARAMETER_ROWS = Object.freeze([
  { label: "最大QRS向量", value: "1.42mV" },
  { label: "QRS-T夹角", value: "43°" },
  { label: "P环最大向量", value: "0.21mV" },
  { label: "T环最大向量", value: "0.38mV" },
  { label: "额面电轴", value: "46°" },
  { label: "横面旋转", value: "顺钟向" },
  { label: "空间最大向量", value: "1.61mV" },
]);

const DEFAULT_DISPLAY = Object.freeze({
  waveform: true,
  parameterList: true,
  spatial3d: true,
});

const PLANE_ALIASES = Object.freeze({
  waveform: "waveform",
  wave: "waveform",
  "波形": "waveform",
  f: "frontal",
  frontal: "frontal",
  "额面": "frontal",
  h: "horizontal",
  horizontal: "horizontal",
  "横面": "horizontal",
  s: "sagittal",
  sagittal: "sagittal",
  right: "sagittal",
  "右侧面": "sagittal",
  "侧面": "sagittal",
  all: "all",
  overview: "all",
});

const LOOP_ALIASES = Object.freeze({
  p: "p",
  qrs: "qrs",
  t: "t",
  all: "all",
  overview: "all",
});

const PLOT_BACKGROUND = "#FFFCFD";
const ECG_MINOR_GRID = "#F7DCE2";
const ECG_MAJOR_GRID = "#EDAAB7";
const POLAR_GRID = "#C9C9C9";
const AXIS_COLOR = "#202020";
const LABEL_COLOR = "rgba(0, 0, 0, 0.48)";
const MUTED_LABEL_COLOR = "rgba(0, 0, 0, 0.34)";
const DEFAULT_FONT = '600 13px "PingFang SC", "Microsoft YaHei", sans-serif';
const SMALL_FONT = '500 12px "PingFang SC", "Microsoft YaHei", sans-serif';

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const roundPoint = (value) => Number(value.toFixed(4));

const normalizeKey = (value) => String(value ?? "").trim().toLowerCase();

const normalizeOptionValue = (value, aliases, fallback) =>
  aliases[normalizeKey(value)] || fallback;

const normalizePlaneMode = (value, fallback = "all") =>
  normalizeOptionValue(value, PLANE_ALIASES, fallback);

const normalizeLoopMode = (value, fallback = "all") =>
  normalizeOptionValue(value, LOOP_ALIASES, fallback);

const normalizeScale = (value, fallback = "20mm/mV") => {
  const option = VECTOR_ECG_SCALE_OPTIONS.find((item) => item.value === value);
  return option ? option.value : fallback;
};

const normalizeRatio = (value, fallback = "100/20/40 mm/mv") => {
  const option = VECTOR_ECG_RATIO_OPTIONS.find((item) => item.value === value);
  return option ? option.value : fallback;
};

const normalizeBoolean = (value, fallback) =>
  typeof value === "boolean" ? value : fallback;

export function createVectorEcgDemoLoopPoints({
  amplitudeX = 0.8,
  amplitudeY = 0.7,
  phaseShift = 0,
  rotation = 0,
  sampleCount = 42,
} = {}) {
  const safeCount = Math.max(8, Math.round(normalizeNumber(sampleCount, 42)));
  const safeAmplitudeX = clamp(Math.abs(normalizeNumber(amplitudeX, 0.8)), 0.05, 1);
  const safeAmplitudeY = clamp(Math.abs(normalizeNumber(amplitudeY, 0.7)), 0.05, 1);
  const safeRotation = normalizeNumber(rotation, 0);
  const cosRotation = Math.cos(safeRotation);
  const sinRotation = Math.sin(safeRotation);

  return Array.from({ length: safeCount }, (_, index) => {
    const t = (index / safeCount) * Math.PI * 2;
    const tapered = 0.82 + Math.sin(t + phaseShift) * 0.14;
    const x = Math.cos(t + phaseShift) * safeAmplitudeX * tapered;
    const y = Math.sin(t * 1.04 + phaseShift) * safeAmplitudeY * (0.92 + Math.cos(t) * 0.08);

    return {
      x: roundPoint(clamp(x * cosRotation - y * sinRotation, -1, 1)),
      y: roundPoint(clamp(x * sinRotation + y * cosRotation, -1, 1)),
    };
  });
}

const DEFAULT_LOOP_PRESETS = Object.freeze({
  frontal: [
    { key: "p", label: "P", color: "#51DFFF", amplitudeX: 0.22, amplitudeY: 0.16, phaseShift: 0.2 },
    { key: "qrs", label: "QRS", color: "#D54941", amplitudeX: 0.58, amplitudeY: 0.46, phaseShift: -0.35 },
    { key: "t", label: "T", color: "#2BA471", amplitudeX: 0.34, amplitudeY: 0.24, phaseShift: 1.1 },
  ],
  horizontal: [
    { key: "p", label: "P", color: "#51DFFF", amplitudeX: 0.18, amplitudeY: 0.14, phaseShift: 0.35, rotation: 0.2 },
    { key: "qrs", label: "QRS", color: "#D54941", amplitudeX: 0.48, amplitudeY: 0.58, phaseShift: 0.28, rotation: -0.18 },
    { key: "t", label: "T", color: "#2BA471", amplitudeX: 0.24, amplitudeY: 0.28, phaseShift: 1.3 },
  ],
  sagittal: [
    { key: "p", label: "P", color: "#51DFFF", amplitudeX: 0.16, amplitudeY: 0.14, phaseShift: 0.1, rotation: -0.12 },
    { key: "qrs", label: "QRS", color: "#D54941", amplitudeX: 0.5, amplitudeY: 0.5, phaseShift: -0.68, rotation: 0.35 },
    { key: "t", label: "T", color: "#2BA471", amplitudeX: 0.26, amplitudeY: 0.2, phaseShift: 0.85 },
  ],
});

const normalizeLoop = (loop, index, plotKey) => {
  const preset = DEFAULT_LOOP_PRESETS[plotKey]?.[index] || {};
  const points = Array.isArray(loop?.points) && loop.points.length
    ? loop.points
    : createVectorEcgDemoLoopPoints({ ...preset, sampleCount: loop?.sampleCount });
  const fallbackKey = preset.key || `loop-${index + 1}`;
  const key = normalizeLoopMode(loop?.key || fallbackKey, fallbackKey);

  return {
    key,
    label: String(loop?.label || preset.label || `Loop ${index + 1}`),
    color: String(loop?.color || preset.color || "#D54941"),
    points: points.map((point) => ({
      x: clamp(normalizeNumber(point?.x, 0), -1, 1),
      y: clamp(normalizeNumber(point?.y, 0), -1, 1),
    })),
  };
};

const normalizePlot = (plot = {}, index = 0) => {
  const base = VECTOR_ECG_DEFAULT_PLOTS[index] || VECTOR_ECG_DEFAULT_PLOTS[0];
  const key = normalizePlaneMode(plot.key || base.key, base.key);
  const defaultLoops = DEFAULT_LOOP_PRESETS[key] || DEFAULT_LOOP_PRESETS.frontal;
  const loops = Array.isArray(plot.loops) && plot.loops.length
    ? plot.loops
    : Array.isArray(plot.points) && plot.points.length
      ? [{ key: "qrs", label: "QRS", color: plot.color || base.color, points: plot.points }]
      : defaultLoops;

  return {
    key,
    label: String(plot.label || base.label),
    plane: String(plot.plane || base.plane),
    planeCode: String(plot.planeCode || base.planeCode),
    color: String(plot.color || base.color),
    labels: Array.isArray(plot.labels) && plot.labels.length ? plot.labels : [...base.labels],
    cornerStats: Array.isArray(plot.cornerStats) && plot.cornerStats.length
      ? plot.cornerStats.map((item) => String(item))
      : [...base.cornerStats],
    loops: loops.map((loop, loopIndex) => normalizeLoop(loop, loopIndex, key)),
  };
};

const waveformValue = (beatPhase, phaseShift, polarity = 1) => {
  const gaussian = (center, width, amplitude) =>
    amplitude * Math.exp(-Math.pow((beatPhase - center) / width, 2));

  return polarity * (
    gaussian(0.18 + phaseShift * 0.02, 0.035, 0.14) -
    gaussian(0.39 + phaseShift * 0.01, 0.018, 0.18) +
    gaussian(0.42 + phaseShift * 0.01, 0.014, 0.92) -
    gaussian(0.46 + phaseShift * 0.01, 0.022, 0.28) +
    gaussian(0.68 + phaseShift * 0.02, 0.075, 0.34)
  );
};

export function createVectorEcgDemoWaveformSeries({ sampleCount = 240 } = {}) {
  const safeCount = Math.max(80, Math.round(normalizeNumber(sampleCount, 240)));
  const seriesConfig = [
    { key: "x", label: "X", color: "#D54941", gain: 0.96, phase: 0, polarity: 1 },
    { key: "y", label: "Y", color: "#2BA471", gain: 0.82, phase: 0.16, polarity: 0.82 },
    { key: "z", label: "Z", color: "#0EA5E9", gain: 0.7, phase: -0.18, polarity: -0.72 },
  ];

  return seriesConfig.map((config) => ({
    key: config.key,
    label: config.label,
    color: config.color,
    samples: Array.from({ length: safeCount }, (_, index) => {
      const phase = ((index / safeCount) * 3 + config.phase) % 1;
      const drift = Math.sin(index / safeCount * Math.PI * 4) * 0.025;
      return roundPoint(clamp(waveformValue(phase < 0 ? phase + 1 : phase, config.phase, config.polarity) * config.gain + drift, -1.4, 1.4));
    }),
  }));
}

const normalizeWaveformSeries = (series = [], index = 0) => {
  const fallback = createVectorEcgDemoWaveformSeries()[index] || createVectorEcgDemoWaveformSeries()[0];
  const rawSamples = Array.isArray(series.samples) && series.samples.length
    ? series.samples
    : fallback.samples;

  return {
    key: String(series.key || fallback.key),
    label: String(series.label || fallback.label),
    color: String(series.color || fallback.color),
    samples: rawSamples.map((sample) => {
      const value = typeof sample === "number" ? sample : sample?.value;
      return clamp(normalizeNumber(value, 0), -1.6, 1.6);
    }),
  };
};

const normalizeParameterRows = (rows) => {
  const sourceRows = Array.isArray(rows) && rows.length ? rows : DEFAULT_PARAMETER_ROWS;
  return sourceRows.map((row) => ({
    label: String(row?.label || ""),
    value: String(row?.value ?? ""),
    tone: row?.tone ? String(row.tone) : "default",
  }));
};

export function normalizeVectorEcgData(data = {}) {
  const plotSource = Array.isArray(data.plots) && data.plots.length ? data.plots : data.loops || [];
  const plotMap = new Map(plotSource.map((plot) => [normalizePlaneMode(plot?.key, plot?.key), plot]));
  const waveformSource = Array.isArray(data.waveformSeries) && data.waveformSeries.length
    ? data.waveformSeries
    : createVectorEcgDemoWaveformSeries();
  const display = data.display || {};

  return {
    title: data.title || "心电向量",
    scaleOptions: Array.isArray(data.scaleOptions) && data.scaleOptions.length
      ? data.scaleOptions
      : VECTOR_ECG_SCALE_OPTIONS,
    ratioOptions: Array.isArray(data.ratioOptions) && data.ratioOptions.length
      ? data.ratioOptions
      : VECTOR_ECG_RATIO_OPTIONS,
    planeModes: Array.isArray(data.planeModes) && data.planeModes.length
      ? data.planeModes
      : VECTOR_ECG_PLANE_MODES,
    loopModes: Array.isArray(data.loopModes) && data.loopModes.length
      ? data.loopModes
      : VECTOR_ECG_LOOP_MODES,
    activeScale: normalizeScale(data.activeScale || data.scale || data.controls?.scale),
    activeRatio: normalizeRatio(data.activeRatio || data.ratio || data.controls?.ratio),
    activePlane: normalizePlaneMode(data.activePlane || data.planeMode || data.activeMode),
    activeLoop: normalizeLoopMode(data.activeLoop || data.loopMode || data.activeMode),
    display: {
      waveform: normalizeBoolean(display.waveform ?? data.showWaveform, DEFAULT_DISPLAY.waveform),
      parameterList: normalizeBoolean(display.parameterList ?? data.showParameterList, DEFAULT_DISPLAY.parameterList),
      spatial3d: normalizeBoolean(display.spatial3d ?? data.show3d, DEFAULT_DISPLAY.spatial3d),
    },
    plots: VECTOR_ECG_DEFAULT_PLOTS.map((basePlot, index) =>
      normalizePlot(plotMap.get(basePlot.key) || {}, index),
    ),
    waveformSeries: [0, 1, 2].map((_, index) => normalizeWaveformSeries(waveformSource[index], index)),
    parameterRows: normalizeParameterRows(data.parameterRows || data.measurementRows),
  };
}

export function getVisibleVectorPlots(plots = [], planeMode = "all") {
  const normalizedPlane = normalizePlaneMode(planeMode);
  const safePlots = Array.isArray(plots) ? plots : [];

  if (normalizedPlane === "all") {
    return safePlots.slice(0, 2);
  }

  if (normalizedPlane === "waveform") {
    return [];
  }

  const filteredPlots = safePlots.filter((plot) => normalizePlaneMode(plot?.key, "") === normalizedPlane);
  return filteredPlots.length ? filteredPlots : safePlots;
}

const getVisibleLoops = (plot, loopMode = "all") => {
  const normalizedLoop = normalizeLoopMode(loopMode);
  if (normalizedLoop === "all") {
    return plot.loops;
  }

  return plot.loops.filter((loop) => normalizeLoopMode(loop.key, "") === normalizedLoop);
};

const drawAxisLine = (ctx, x1, y1, x2, y2, color = POLAR_GRID, lineWidth = 1, dash = []) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
  ctx.stroke();
};

const drawEcgPaperGrid = (ctx, width, height, minorStep = 12) => {
  ctx.fillStyle = PLOT_BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  // Figma 底图使用心电纸小格加粗格，Canvas 绘制时保持 CSS 像素坐标以适配 DPR。
  for (let x = 0; x <= width; x += minorStep) {
    const major = Math.round(x / minorStep) % 5 === 0;
    drawAxisLine(ctx, x, 0, x, height, major ? ECG_MAJOR_GRID : ECG_MINOR_GRID, major ? 1 : 0.7);
  }

  for (let y = 0; y <= height; y += minorStep) {
    const major = Math.round(y / minorStep) % 5 === 0;
    drawAxisLine(ctx, 0, y, width, y, major ? ECG_MAJOR_GRID : ECG_MINOR_GRID, major ? 1 : 0.7);
  }
};

const getPlotGeometry = (width, height) => {
  const safeWidth = Math.max(1, normalizeNumber(width, 1));
  const safeHeight = Math.max(1, normalizeNumber(height, 1));
  const centerX = safeWidth / 2;
  const centerY = safeHeight / 2;
  const radius = Math.max(44, Math.min(safeWidth * 0.22, safeHeight * 0.42));
  const gridRadius = Math.max(radius * 2.2, Math.min(safeWidth * 0.56, safeHeight * 1.04));
  const radiusX = radius;
  const radiusY = radius;

  return { width: safeWidth, height: safeHeight, centerX, centerY, radiusX, radiusY, gridRadius };
};

const toCanvasPoint = (point, geometry) => ({
  x: geometry.centerX + clamp(normalizeNumber(point.x, 0), -1, 1) * geometry.radiusX,
  y: geometry.centerY - clamp(normalizeNumber(point.y, 0), -1, 1) * geometry.radiusY,
});

const drawPolarGrid = (ctx, geometry) => {
  const ringStep = Math.max(10, Math.min(14, geometry.height / 28));
  const ringCount = Math.ceil(geometry.gridRadius / ringStep);

  for (let index = 1; index <= ringCount; index += 1) {
    const radius = index * ringStep;
    const major = index % 5 === 0;
    ctx.strokeStyle = major ? ECG_MAJOR_GRID : ECG_MINOR_GRID;
    ctx.lineWidth = major ? 1 : 0.8;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.setLineDash(major ? [] : [1, 4]);
    ctx.beginPath();
    ctx.ellipse(
      geometry.centerX,
      geometry.centerY,
      radius,
      radius,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  for (let degree = 0; degree < 360; degree += 30) {
    const angle = (degree / 180) * Math.PI;
    const x = geometry.centerX + Math.cos(angle) * geometry.gridRadius;
    const y = geometry.centerY + Math.sin(angle) * geometry.gridRadius;
    const isAxis = degree % 90 === 0;
    drawAxisLine(
      ctx,
      geometry.centerX,
      geometry.centerY,
      x,
      y,
      isAxis ? AXIS_COLOR : POLAR_GRID,
      isAxis ? 1.2 : 0.8,
      isAxis ? [] : [2, 5],
    );
  }

  drawAxisLine(ctx, 24, geometry.centerY, geometry.width - 24, geometry.centerY, AXIS_COLOR, 1.2);
  drawAxisLine(ctx, geometry.centerX, 28, geometry.centerX, geometry.height - 28, AXIS_COLOR, 1.2);
};

const drawPlotLabels = (ctx, plot, geometry, scale) => {
  const labels = plot.labels || [];
  const labelPositions = [
    [geometry.centerX - geometry.width * 0.26, geometry.centerY - geometry.height * 0.23],
    [geometry.centerX - geometry.width * 0.26, geometry.centerY + geometry.height * 0.24],
    [geometry.centerX + geometry.width * 0.22, geometry.centerY - geometry.height * 0.23],
    [geometry.width - 40, geometry.centerY + 4],
    [geometry.centerX + 8, geometry.height - 38],
    [geometry.centerX + geometry.width * 0.22, geometry.centerY + geometry.height * 0.24],
  ];

  ctx.fillStyle = LABEL_COLOR;
  ctx.font = DEFAULT_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  labels.slice(0, labelPositions.length).forEach((label, index) => {
    const [x, y] = labelPositions[index];
    ctx.fillText(String(label), x, y);
  });

  const planeName = String(plot.label || "").replace("向量图", "");
  const title = plot.title || `${planeName}(${plot.planeCode || ""})`;

  ctx.fillStyle = LABEL_COLOR;
  ctx.font = DEFAULT_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title, 16, 9);

  ctx.fillStyle = MUTED_LABEL_COLOR;
  ctx.font = SMALL_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(scale, geometry.width - 16, 9);

  const cornerStats = Array.isArray(plot.cornerStats) ? plot.cornerStats : [];
  const statPositions = [
    [10, 54, "left"],
    [geometry.width - 16, 54, "right"],
    [10, geometry.height - 75, "left"],
    [geometry.width - 16, geometry.height - 75, "right"],
  ];

  cornerStats.slice(0, statPositions.length).forEach((value, index) => {
    const [x, y, align] = statPositions[index];
    ctx.textAlign = align;
    ctx.fillText(String(value), x, y);
  });
};

const drawLoop = (ctx, loop, geometry, projector = toCanvasPoint) => {
  const points = Array.isArray(loop.points) ? loop.points : [];
  if (points.length < 2) return;

  ctx.strokeStyle = loop.color;
  ctx.lineWidth = loop.key === "qrs" ? 2.4 : 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  points.forEach((point, index) => {
    const { x, y } = projector(point, geometry, index);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  points.forEach((point, index) => {
    if (index % 5 !== 0) return;
    const { x, y } = projector(point, geometry, index);
    ctx.fillStyle = loop.color;
    ctx.beginPath();
    ctx.arc(x, y, index === 0 ? 2.8 : 2, 0, Math.PI * 2);
    ctx.fill();
  });
};

export function drawVectorEcgPlot(ctx, {
  width,
  height,
  plot,
  mode,
  loopMode = mode || "all",
  scale = "20mm/mV",
} = {}) {
  const geometry = getPlotGeometry(width, height);
  const safePlot = normalizePlot(plot || {}, 0);
  const visibleLoops = getVisibleLoops(safePlot, loopMode);

  ctx.clearRect(0, 0, geometry.width, geometry.height);
  drawEcgPaperGrid(ctx, geometry.width, geometry.height);
  drawPolarGrid(ctx, geometry);
  drawPlotLabels(ctx, safePlot, geometry, normalizeScale(scale));
  visibleLoops.forEach((loop) => drawLoop(ctx, loop, geometry));
}

export function drawVectorWaveformPanel(ctx, {
  width,
  height,
  waveformSeries,
  scale = "20mm/mV",
} = {}) {
  const safeWidth = Math.max(1, normalizeNumber(width, 1));
  const safeHeight = Math.max(1, normalizeNumber(height, 1));
  const series = [0, 1, 2].map((_, index) => normalizeWaveformSeries(waveformSeries?.[index], index));
  const left = 42;
  const right = 18;
  const top = 28;
  const bottom = 20;
  const rowHeight = (safeHeight - top - bottom) / series.length;

  ctx.clearRect(0, 0, safeWidth, safeHeight);
  drawEcgPaperGrid(ctx, safeWidth, safeHeight);

  ctx.fillStyle = MUTED_LABEL_COLOR;
  ctx.font = SMALL_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`50mm/s ${normalizeScale(scale).replace("mm/mV", "m/mv")}`, safeWidth - 14, 18);

  series.forEach((item, rowIndex) => {
    const baseline = top + rowHeight * (rowIndex + 0.5);
    drawAxisLine(ctx, left, baseline, safeWidth - right, baseline, POLAR_GRID, 1, [4, 5]);

    ctx.fillStyle = LABEL_COLOR;
    ctx.font = DEFAULT_FONT;
    ctx.textAlign = "left";
    ctx.fillText(item.label, 14, baseline);

    const samples = item.samples;
    if (samples.length < 2) return;

    ctx.strokeStyle = item.color;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    samples.forEach((sample, index) => {
      const x = left + (index / (samples.length - 1)) * (safeWidth - left - right);
      const y = baseline - sample * rowHeight * 0.34;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  });
}

const getSpatialPoint = (point, planeKey) => {
  if (planeKey === "horizontal") {
    return { x: point.x, y: 0, z: point.y };
  }

  if (planeKey === "sagittal") {
    return { x: 0, y: point.y, z: point.x };
  }

  return { x: point.x, y: point.y, z: 0 };
};

const projectSpatialPoint = (point, planeKey, geometry) => {
  const spatial = getSpatialPoint(point, planeKey);
  return {
    x: geometry.centerX + (spatial.x - spatial.z * 0.46) * geometry.radiusX,
    y: geometry.centerY - (spatial.y + spatial.z * 0.34) * geometry.radiusY,
  };
};

export function drawVectorEcg3dPanel(ctx, {
  width,
  height,
  plots,
  loopMode = "all",
  scale = "20mm/mV",
} = {}) {
  const safeWidth = Math.max(1, normalizeNumber(width, 1));
  const safeHeight = Math.max(1, normalizeNumber(height, 1));
  const geometry = {
    width: safeWidth,
    height: safeHeight,
    centerX: safeWidth * 0.52,
    centerY: safeHeight * 0.55,
    radiusX: Math.max(38, Math.min(safeWidth, safeHeight) * 0.28),
    radiusY: Math.max(38, Math.min(safeWidth, safeHeight) * 0.28),
  };
  const safePlots = Array.isArray(plots) && plots.length
    ? plots.map((plot, index) => normalizePlot(plot, index))
    : normalizeVectorEcgData().plots;

  ctx.clearRect(0, 0, safeWidth, safeHeight);
  drawEcgPaperGrid(ctx, safeWidth, safeHeight);

  ctx.fillStyle = LABEL_COLOR;
  ctx.font = DEFAULT_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("3D", 16, 20);

  ctx.fillStyle = MUTED_LABEL_COLOR;
  ctx.font = SMALL_FONT;
  ctx.textAlign = "right";
  ctx.fillText(normalizeScale(scale), safeWidth - 14, 20);

  const axis = [
    ["X", geometry.centerX + geometry.radiusX * 1.05, geometry.centerY + geometry.radiusY * 0.08],
    ["Y", geometry.centerX, geometry.centerY - geometry.radiusY * 1.08],
    ["Z", geometry.centerX - geometry.radiusX * 0.78, geometry.centerY + geometry.radiusY * 0.56],
  ];
  axis.forEach(([label, x, y]) => {
    drawAxisLine(ctx, geometry.centerX, geometry.centerY, x, y, AXIS_COLOR, 1.2);
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = DEFAULT_FONT;
    ctx.textAlign = "center";
    ctx.fillText(label, x, y);
  });

  safePlots.forEach((plot) => {
    getVisibleLoops(plot, loopMode).forEach((loop) => {
      drawLoop(ctx, loop, geometry, (point) => projectSpatialPoint(point, plot.key, geometry));
    });
  });
}
