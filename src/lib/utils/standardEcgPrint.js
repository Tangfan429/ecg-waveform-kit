import {
  ECGCanvasRenderer,
  alignCanvasExtentToGrid,
  getRequiredWaveformWidth,
  getRequiredWaveformHeight,
} from "./ecgCanvasRenderer.js";
import { getGainConfig, getSpeedConfig } from "./waveformLayouts.js";

// 打印页按 A4 横向输出，页边距尽量压缩，给波形区域让出更多有效高度。
const PRINT_PAGE_PADDING_MM = 4;

// 打印波形高度固定，宽度由走速和时长动态计算以确保波形占满画布。
const PRINT_WAVEFORM_HEIGHT = 725;
const PRINT_RENDER_PIXEL_RATIO = 2;
const PRINT_LAYOUT_TYPE = "6x2+1R";
const PRINT_RHYTHM_LEAD_NAME = "II";
const PRINT_LARGE_GRID_SIZE = 25;
const PRINT_MIN_WAVEFORM_HEIGHT = 550;
const PRINT_MIN_FIRST_PAGE_WAVEFORM_HEIGHT = 420;
const PRINT_PAGE_HEIGHT_ADJUST_MM = 0.8;
const PRINT_PAGE_OVERFLOW_TOLERANCE_PX = 8;

const DEFAULT_PRINT_META = Object.freeze({
  hospitalName: "示例医院",
  reportTitle: "心电图",
  bedNo: "",
  examItem: "心电图检查(急诊)",
  examTime: "",
  registrationNo: "",
  patientName: "",
  gender: "",
  age: "",
  department: "",
  ward: "",
  patientType: "outpatient",
  patientNo: "",
  diagnosisDoctor: "",
  diagnosisDoctorSignature: "",
  reviewDoctor: "",
  reviewDoctorSignature: "",
  diagnosisTime: "",
  diagnosisResult: "",
  qtQtcText: "",
  axisText: "",
});

// 测量指标正常参考范围（当前为 mock 数据，后续将从接口获取）
const DEFAULT_METRIC_RANGES = Object.freeze({
  hr: { min: 60, max: 100, unit: "bpm" },
  sv1: { min: 0, max: 2, unit: "mV" },
  rv5: { min: 0, max: 2.5, unit: "mV" },
  rv5sv1Sum: { min: 0, max: 3.5, unit: "mV" },
  pr: { min: 120, max: 200, unit: "ms" },
  qrs: { min: 60, max: 119, unit: "ms" },
});

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatNumber = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }

  return numericValue.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
};

const formatField = (value) => {
  if (value === undefined || value === null || value === "") {
    return "--";
  }

  return String(value);
};

const normalizeSignatureImage = (value) => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return "";
  }

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/u.test(normalizedValue)) {
    return normalizedValue;
  }

  return `data:image/png;base64,${normalizedValue}`;
};

const buildTitle = (meta) => {
  const hospitalName = formatField(meta.hospitalName);
  const reportTitle = formatField(meta.reportTitle);
  return `${hospitalName} ${reportTitle}`.replace(/\s+/gu, " ").trim();
};

const buildDepartmentText = (meta) => {
  const department = formatField(meta.department);

  if (department === "--") {
    return "--";
  }

  return department;
};

const createDiagnosisRowMarkup = (line, isFirstLine = false) => `
  <div class="standard-ecg-print__diagnosis-row">
    <span class="standard-ecg-print__diagnosis-title${isFirstLine ? "" : " standard-ecg-print__diagnosis-title--placeholder"}">诊断：</span>
    <span class="standard-ecg-print__diagnosis-line">${escapeHtml(line)}</span>
  </div>
`;

const createDiagnosisMarkup = (diagnosisResult) => {
  const normalizedValue = formatField(diagnosisResult);
  const diagnosisLines =
    normalizedValue === "--"
      ? ["--"]
      : normalizedValue
          .split(/\r?\n/gu)
          .map((line) => line.trim())
          .filter(Boolean);

  return diagnosisLines
    .map((line, index) => createDiagnosisRowMarkup(line, index === 0))
    .join("");
};

const createDoctorSignatureMarkup = (label, signatureImage) => {
  const normalizedSignature = normalizeSignatureImage(signatureImage);
  const signatureMarkup = normalizedSignature
    ? `
        <div class="standard-ecg-print__doctor-signature-image-wrap">
          <img
            class="standard-ecg-print__doctor-signature-image standard-ecg-print__image-await"
            src="${escapeHtml(normalizedSignature)}"
            alt="${escapeHtml(`${label}签名`)}"
          />
        </div>
      `
    : `
        <div class="standard-ecg-print__doctor-signature-image-wrap standard-ecg-print__doctor-signature-image-wrap--empty">
        </div>
      `;

  return `
    <div class="standard-ecg-print__doctor-signature">
      <span class="standard-ecg-print__doctor-signature-label">${escapeHtml(label)}：</span>
      ${signatureMarkup}
    </div>
  `;
};

// 获取测量值，支持附带正常参考范围：value(min~max)unit
const getMetricValue = (measurementData, key, unit = "", range = null) => {
  const formattedValue = formatNumber(measurementData?.[key]);
  if (formattedValue === "--") {
    return "--";
  }

  // 带正常参考范围时输出紧凑格式，如 83(60~100)bpm
  if (range) {
    return `${formattedValue}(${range.min}~${range.max})${range.unit}`;
  }

  return unit ? `${formattedValue}${unit}` : formattedValue;
};

const createMetricCellMarkup = (label, value) => `
  <div class="standard-ecg-print__metric-cell">
    <span class="standard-ecg-print__metric-label">${escapeHtml(label)}</span>
    <span class="standard-ecg-print__metric-value">${escapeHtml(value)}</span>
  </div>
`;

// 左侧测量列：心率、SV1、RV5、RV5+SV1
const createLeftMetricsMarkup = (measurementData, metricRanges = {}) => {
  const ranges = { ...DEFAULT_METRIC_RANGES, ...metricRanges };
  return [
    createMetricCellMarkup(
      "心\u3000率：",
      getMetricValue(measurementData, "hr", " bpm", ranges.hr)
    ),
    createMetricCellMarkup(
      "SV1：",
      getMetricValue(measurementData, "sv1", " mV", ranges.sv1)
    ),
    createMetricCellMarkup(
      "RV5：",
      getMetricValue(measurementData, "rv5", " mV", ranges.rv5)
    ),
    createMetricCellMarkup(
      "RV5+SV1：",
      getMetricValue(measurementData, "rv5sv1Sum", " mV", ranges.rv5sv1Sum)
    ),
  ].join("");
};

// 右侧测量列：P-R间期、QRS时限、QT/QTc、电轴
const createRightMetricsMarkup = (measurementData, meta, metricRanges = {}) => {
  const ranges = { ...DEFAULT_METRIC_RANGES, ...metricRanges };

  const qtQtcText =
    formatField(meta?.qtQtcText) === "--"
      ? `${getMetricValue(measurementData, "qt", " ms")} / ${getMetricValue(measurementData, "qtc", " ms")}`
      : formatField(meta?.qtQtcText);
  const axisText =
    formatField(meta?.axisText) === "--"
      ? getMetricValue(measurementData, "qrsAxis", "°")
      : formatField(meta?.axisText);

  return [
    createMetricCellMarkup(
      "P-R间期：",
      getMetricValue(measurementData, "pr", " ms", ranges.pr)
    ),
    createMetricCellMarkup(
      "QRS时限：",
      getMetricValue(measurementData, "qrs", " ms", ranges.qrs)
    ),
    createMetricCellMarkup("QT/QTc：", qtQtcText),
    createMetricCellMarkup("电\u3000轴：", axisText),
  ].join("");
};

const createHiddenRenderHost = (width, height) => {
  const host = document.createElement("div");
  host.style.cssText = `
    position: fixed;
    left: -10000px;
    top: -10000px;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    background: #ffffff;
  `;
  document.body.appendChild(host);
  return host;
};

const snapUpToPrintGrid = (value, includeBoundaryPixel = false) =>
  alignCanvasExtentToGrid(
    value,
    PRINT_LARGE_GRID_SIZE,
    includeBoundaryPixel,
  );

const createPrintRendererConfig = ({
  sampleRate,
  duration,
  gain,
  speed,
  appearanceSettings,
  examTime,
  speedGainText,
}) => ({
  ...(appearanceSettings || {}),
  backgroundColor: "#FFFFFF",
  layoutType: PRINT_LAYOUT_TYPE,
  rhythmLeadName: PRINT_RHYTHM_LEAD_NAME,
  showRhythmLead: true,
  useRhythmNavigator: false,
  displayMode: "sync",
  gainValue: gain,
  speedValue: speed,
  duration,
  sampleRate,
  pixelRatio: PRINT_RENDER_PIXEL_RATIO,
  padding: { top: 25, right: 0, bottom: 25, left: 0 },
  gridExtendToCanvas: true,
  metricsBandHeight: 0,
  metricsToRhythmGap: 0,
  showRhythmTimeAxis: false,
  showRhythmTimeLabels: false,
  canvasTopLeftText: examTime || "",
  canvasTopRightText: speedGainText || "",
});

const resolvePrintWaveformHeight = ({
  containerWidth,
  containerHeight,
  waveformWidth,
}) => {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    !Number.isFinite(waveformWidth) ||
    waveformWidth <= 0
  ) {
    return PRINT_WAVEFORM_HEIGHT;
  }

  const targetHeight = waveformWidth * (containerHeight / containerWidth);
  return Math.min(
    PRINT_WAVEFORM_HEIGHT,
    Math.max(PRINT_MIN_WAVEFORM_HEIGHT, snapUpToPrintGrid(targetHeight))
  );
};

const waitForWindowLayout = (targetWindow, frameCount = 2) =>
  new Promise((resolve) => {
    const raf =
      typeof targetWindow?.requestAnimationFrame === "function"
        ? targetWindow.requestAnimationFrame.bind(targetWindow)
        : null;

    if (!raf) {
      targetWindow.setTimeout(resolve, 32);
      return;
    }

    let remainingFrames = Math.max(1, Number(frameCount) || 1);
    const advance = () => {
      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        resolve();
        return;
      }

      raf(advance);
    };

    raf(advance);
  });

const waitForImageReady = (image) =>
  new Promise((resolve) => {
    if (!image || image.complete) {
      resolve();
      return;
    }

    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });

const waitForImagesReady = (images) =>
  Promise.all(
    (Array.isArray(images) ? images : []).filter(Boolean).map(async (image) => {
      if (typeof image.decode === "function") {
        try {
          await image.decode();
          return;
        } catch {
          // Fall through to complete/load checks.
        }
      }

      await waitForImageReady(image);
    })
  );

const moveWaveformBlockToNextPage = (printWindow) => {
  const doc = printWindow.document;
  const waveformBlock = doc.querySelector(
    ".standard-ecg-print__waveform-block"
  );
  if (!waveformBlock) {
    return null;
  }

  const existingPage = doc.querySelector(
    ".standard-ecg-print__page--waveform-only"
  );
  if (existingPage) {
    existingPage.appendChild(waveformBlock);
    return existingPage;
  }

  const nextPage = doc.createElement("section");
  nextPage.className =
    "standard-ecg-print__page standard-ecg-print__page--waveform-only";
  nextPage.appendChild(waveformBlock);
  doc.querySelector(".standard-ecg-print")?.appendChild(nextPage);
  return nextPage;
};

const injectWaveformImage = (printWindow, waveformRenderResult) => {
  const waveformContainer = printWindow.document.querySelector(
    ".standard-ecg-print__waveform"
  );

  if (!waveformContainer) {
    return null;
  }

  const waveformImage = printWindow.document.createElement("img");
  waveformImage.src = waveformRenderResult.dataUrl;
  waveformImage.width = waveformRenderResult.width;
  waveformImage.height = waveformRenderResult.height;
  waveformImage.alt = "常规心电打印波形图";
  waveformContainer.replaceChildren(waveformImage);
  return waveformImage;
};

const renderWaveformImageUrl = ({
  waveformData,
  sampleRate,
  duration,
  gain,
  speed,
  appearanceSettings,
  examTime,
  speedGainText,
  forcedHeight = null,
}) => {
  const rendererConfig = createPrintRendererConfig({
    sampleRate,
    duration,
    gain,
    speed,
    appearanceSettings,
    examTime,
    speedGainText,
  });
  const waveformWidth = getRequiredWaveformWidth(rendererConfig);
  const waveformHeight =
    Number.isFinite(forcedHeight) && forcedHeight > 0
      ? snapUpToPrintGrid(forcedHeight, true)
      : getRequiredWaveformHeight(rendererConfig);
  const host = createHiddenRenderHost(waveformWidth, waveformHeight);
  const renderer = new ECGCanvasRenderer(rendererConfig);

  try {
    renderer.initialize(host);
    renderer.renderWaveforms(waveformData);
    return {
      dataUrl: renderer.canvas?.toDataURL("image/png") || "",
      width: waveformWidth,
      height: waveformHeight,
    };
  } finally {
    renderer.destroy();
    host.remove();
  }
};

const buildPrintWindow = (title, bodyMarkup, scriptMarkup = "") => {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return null;
  }

  printWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 0;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #eef1f5;
        color: rgba(0, 0, 0, 0.9);
        font-family: "SimSun", "Songti SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      .standard-ecg-print {
        padding: 16px 0;
      }

      .standard-ecg-print__page {
        --standard-ecg-print-paper-width: 297mm;
        --standard-ecg-print-paper-height: 210mm;
        --standard-ecg-print-safe-margin-top: 1.8mm;
        --standard-ecg-print-safe-margin-x: ${PRINT_PAGE_PADDING_MM}mm;
        --standard-ecg-print-safe-margin-bottom: ${PRINT_PAGE_PADDING_MM}mm;
        --standard-ecg-print-page-height-adjust: ${PRINT_PAGE_HEIGHT_ADJUST_MM}mm;
        --standard-ecg-print-header-columns: repeat(5, minmax(0, 1fr));
        --standard-ecg-print-header-gap: 1.2mm;
        --standard-ecg-print-title-font-size: 5.6mm;
        --standard-ecg-print-body-font-size: 3.7mm;
        --standard-ecg-print-diagnosis-result-font-size: 3.7mm;
        width: min(100%, calc(var(--standard-ecg-print-paper-width) - var(--standard-ecg-print-safe-margin-x) * 2));
        height: calc(var(--standard-ecg-print-paper-height) - var(--standard-ecg-print-safe-margin-top) - var(--standard-ecg-print-safe-margin-bottom) - var(--standard-ecg-print-page-height-adjust));
        margin: 0 auto;
        padding: 0.45mm 2mm 1.1mm;
        background: #ffffff;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .standard-ecg-print__page--text-flow {
        height: auto;
        min-height: calc(var(--standard-ecg-print-paper-height) - var(--standard-ecg-print-safe-margin-top) - var(--standard-ecg-print-safe-margin-bottom) - var(--standard-ecg-print-page-height-adjust));
        overflow: visible;
      }

      .standard-ecg-print__page--waveform-only {
        justify-content: flex-start;
      }

      .standard-ecg-print__page--waveform-only .standard-ecg-print__waveform-block {
        margin-top: 0;
      }

      .standard-ecg-print__title {
        margin: 0 0 0.9mm;
        text-align: center;
        font-size: var(--standard-ecg-print-title-font-size);
        font-weight: 600;
        line-height: 1.05;
        letter-spacing: 0.02em;
      }

      .standard-ecg-print__meta-top {
        display: grid;
        grid-template-columns: var(--standard-ecg-print-header-columns);
        gap: var(--standard-ecg-print-header-gap);
        margin-top: 0;
        font-size: var(--standard-ecg-print-body-font-size);
        line-height: 1.05;
      }

      .standard-ecg-print__meta-top-item {
        min-width: 0;
        white-space: nowrap;
      }

      .standard-ecg-print__meta-top-item--registration {
        grid-column: 1;
      }

      .standard-ecg-print__meta-top-item--bed {
        grid-column: 2;
      }

      .standard-ecg-print__meta-top-item--exam {
        grid-column: 3;
      }

      .standard-ecg-print__header {
        margin-top: 0.25mm;
        padding: 0.55mm 0 0.65mm;
        border-top: 0.26mm solid rgba(0, 0, 0, 0.72);
        display: grid;
        grid-template-columns: var(--standard-ecg-print-header-columns);
        gap: var(--standard-ecg-print-header-gap);
      }

      .standard-ecg-print__info-list--patient {
        grid-column: 1;
      }

      .standard-ecg-print__metrics--left {
        grid-column: 2;
      }

      .standard-ecg-print__metrics--right {
        grid-column: 3;
      }

      .standard-ecg-print__info-list {
        display: grid;
        gap: 0.55mm;
        font-size: var(--standard-ecg-print-body-font-size);
        line-height: 1.05;
      }

      .standard-ecg-print__info-row {
        display: flex;
        align-items: baseline;
        min-width: 0;
      }

      .standard-ecg-print__info-label {
        flex-shrink: 0;
        min-width: 9.4mm;
      }

      .standard-ecg-print__info-value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .standard-ecg-print__metrics {
        display: grid;
        gap: 0.55mm;
        font-size: var(--standard-ecg-print-body-font-size);
        line-height: 1.05;
      }

      .standard-ecg-print__metric-cell {
        display: flex;
        align-items: baseline;
        min-width: 0;
      }

      .standard-ecg-print__metric-label {
        flex-shrink: 0;
        white-space: nowrap;
      }

      .standard-ecg-print__metric-value {
        min-width: 0;
        padding-left: 0.55mm;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .standard-ecg-print__diagnosis {
        grid-column: 4 / 6;
        min-width: 0;
        line-height: 1.06;
      }

      .standard-ecg-print__diagnosis-content {
        column-count: 2;
        column-gap: calc(var(--standard-ecg-print-header-gap) * 1.2);
        column-fill: auto;
        height: 100%;
      }

      .standard-ecg-print__diagnosis-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        column-gap: 0.35mm;
        align-items: start;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .standard-ecg-print__diagnosis-title {
        font-size: var(--standard-ecg-print-body-font-size);
        font-weight: 600;
        white-space: nowrap;
      }

      .standard-ecg-print__diagnosis-title--placeholder {
        visibility: hidden;
      }

      .standard-ecg-print__diagnosis-line {
        min-width: 0;
        font-size: var(--standard-ecg-print-body-font-size);
        word-break: break-all;
      }

      .standard-ecg-print__waveform-block {
        margin-top: 0.6mm;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .standard-ecg-print__waveform-section {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      .standard-ecg-print__waveform-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.6mm;
        padding: 0 1mm;
        font-size: 3.7mm;
        line-height: 1.15;
      }

      .standard-ecg-print__waveform {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        overflow: hidden;
      }

      .standard-ecg-print__waveform img {
        display: block;
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .standard-ecg-print__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6mm;
        margin-top: 0.5mm;
        padding: 0 1mm;
        font-size: var(--standard-ecg-print-body-font-size);
        line-height: 1.1;
        flex-shrink: 0;
      }

      .standard-ecg-print__remark {
        color: rgba(0, 0, 0, 0.72);
      }

      .standard-ecg-print__doctor-group {
        display: flex;
        align-items: flex-end;
        gap: 7mm;
        white-space: nowrap;
      }

      .standard-ecg-print__doctor-signature {
        display: inline-flex;
        align-items: center;
        gap: 1.2mm;
      }

      .standard-ecg-print__doctor-signature-image-wrap {
        width: 26mm;
        height: 8mm;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .standard-ecg-print__doctor-signature-image-wrap--empty {
        border-bottom: 0.24mm solid rgba(0, 0, 0, 0.72);
      }

      .standard-ecg-print__doctor-signature-image {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .standard-ecg-print__doctor-signature-label {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }

      @media print {
        html,
        body {
          background: #ffffff;
        }

        .standard-ecg-print {
          width: 100%;
          min-height: 0;
          height: auto;
          padding: 0;
        }

        .standard-ecg-print__page {
          width: calc(var(--standard-ecg-print-paper-width) - var(--standard-ecg-print-safe-margin-x) * 2);
          height: calc(var(--standard-ecg-print-paper-height) - var(--standard-ecg-print-safe-margin-top) - var(--standard-ecg-print-safe-margin-bottom) - var(--standard-ecg-print-page-height-adjust));
          margin: var(--standard-ecg-print-safe-margin-top) auto 0;
          padding: 0.45mm 2mm 1.1mm;
          box-shadow: none;
          break-inside: auto;
          page-break-inside: auto;
        }
      }
    </style>
  </head>
  <body>
    ${bodyMarkup}
    ${scriptMarkup}
  </body>
</html>`);
  printWindow.document.close();

  return printWindow;
};

export const printStandardEcgDocument = ({
  waveformData,
  sampleRate,
  duration,
  gain,
  speed,
  appearanceSettings,
  measurementData,
  meta,
  metricRanges,
}) => {
  if (!waveformData || !sampleRate || !duration) {
    return false;
  }

  const resolvedMeta = {
    ...DEFAULT_PRINT_META,
    ...(meta || {}),
  };
  const gainLabel = getGainConfig(gain).label;
  const speedLabel = getSpeedConfig(speed).label;
  const reviewDoctor =
    formatField(resolvedMeta.reviewDoctor) === "--"
      ? formatField(resolvedMeta.diagnosisDoctor)
      : formatField(resolvedMeta.reviewDoctor);
  const reviewDoctorSignature =
    formatField(resolvedMeta.reviewDoctor) === "--"
      ? resolvedMeta.diagnosisDoctorSignature
      : resolvedMeta.reviewDoctorSignature;

  const bodyMarkup = `
    <main class="standard-ecg-print">
      <section class="standard-ecg-print__page">
        <h1 class="standard-ecg-print__title">${escapeHtml(buildTitle(resolvedMeta))}</h1>

        <div class="standard-ecg-print__meta-top">
          <span class="standard-ecg-print__meta-top-item standard-ecg-print__meta-top-item--registration">登记号：${escapeHtml(formatField(resolvedMeta.registrationNo))}</span>
          <span class="standard-ecg-print__meta-top-item standard-ecg-print__meta-top-item--bed">床号：${escapeHtml(formatField(resolvedMeta.bedNo))}</span>
          <span class="standard-ecg-print__meta-top-item standard-ecg-print__meta-top-item--exam">检查项目：${escapeHtml(formatField(resolvedMeta.examItem))}</span>
        </div>

        <section class="standard-ecg-print__header">
          <div class="standard-ecg-print__info-list standard-ecg-print__info-list--patient">
            <div class="standard-ecg-print__info-row">
              <span class="standard-ecg-print__info-label">姓\u3000名：</span>
              <span class="standard-ecg-print__info-value">${escapeHtml(formatField(resolvedMeta.patientName))}</span>
            </div>
            <div class="standard-ecg-print__info-row">
              <span class="standard-ecg-print__info-label">性\u3000别：</span>
              <span class="standard-ecg-print__info-value">${escapeHtml(formatField(resolvedMeta.gender))}</span>
            </div>
            <div class="standard-ecg-print__info-row">
              <span class="standard-ecg-print__info-label">年\u3000龄：</span>
              <span class="standard-ecg-print__info-value">${escapeHtml(formatField(resolvedMeta.age ? `${resolvedMeta.age}岁` : ""))}</span>
            </div>
            <div class="standard-ecg-print__info-row">
              <span class="standard-ecg-print__info-label">科\u3000室：</span>
              <span class="standard-ecg-print__info-value">${escapeHtml(buildDepartmentText(resolvedMeta))}</span>
            </div>
          </div>

          <div class="standard-ecg-print__metrics standard-ecg-print__metrics--left">
            ${createLeftMetricsMarkup(measurementData, metricRanges)}
          </div>

          <div class="standard-ecg-print__metrics standard-ecg-print__metrics--right">
            ${createRightMetricsMarkup(measurementData, resolvedMeta, metricRanges)}
          </div>

          <div class="standard-ecg-print__diagnosis">
            <div class="standard-ecg-print__diagnosis-content">${createDiagnosisMarkup(resolvedMeta.diagnosisResult)}</div>
          </div>
        </section>

        <div class="standard-ecg-print__waveform-block">
          <section class="standard-ecg-print__waveform-section">
            <div class="standard-ecg-print__waveform"></div>
          </section>

          <footer class="standard-ecg-print__footer">
          <span class="standard-ecg-print__remark">（此报告仅反映检查时情况）</span>
          <span class="standard-ecg-print__doctor-group">
            ${createDoctorSignatureMarkup(
              "诊断医生",
              resolvedMeta.diagnosisDoctorSignature
            )}
            ${createDoctorSignatureMarkup("审核医生", reviewDoctorSignature)}
          </span>
          </footer>
        </div>
      </section>
    </main>
  `;

  const printWindow = buildPrintWindow("常规心电打印", bodyMarkup);

  if (!printWindow) {
    return false;
  }

  const finalizePrint = async () => {
    try {
      await waitForWindowLayout(printWindow);
      const signatureImages = Array.from(
        printWindow.document.querySelectorAll(
          ".standard-ecg-print__image-await"
        )
      );
      await waitForImagesReady(signatureImages);
      await waitForWindowLayout(printWindow);

      const mainPage = printWindow.document.querySelector(
        ".standard-ecg-print__page"
      );
      let waveformContainer = printWindow.document.querySelector(
        ".standard-ecg-print__waveform"
      );

      if (!mainPage || !waveformContainer) {
        printWindow.setTimeout(() => {
          printWindow.print();
        }, 180);
        return;
      }

      const shouldMoveWaveform =
        mainPage.scrollHeight >
          mainPage.clientHeight + PRINT_PAGE_OVERFLOW_TOLERANCE_PX ||
        waveformContainer.clientHeight < PRINT_MIN_FIRST_PAGE_WAVEFORM_HEIGHT;

      if (shouldMoveWaveform) {
        const waveformPage = moveWaveformBlockToNextPage(printWindow);
        await waitForWindowLayout(printWindow);

        if (
          mainPage.scrollHeight >
          mainPage.clientHeight + PRINT_PAGE_OVERFLOW_TOLERANCE_PX
        ) {
          mainPage.classList.add("standard-ecg-print__page--text-flow");
          await waitForWindowLayout(printWindow);
        }

        waveformContainer =
          waveformPage?.querySelector(".standard-ecg-print__waveform") ||
          waveformContainer;
      }

      const previewConfig = createPrintRendererConfig({
        sampleRate,
        duration,
        gain,
        speed,
        appearanceSettings,
        examTime: resolvedMeta.examTime || "",
        speedGainText: `${speedLabel} ${gainLabel}`,
      });
      const waveformWidth = getRequiredWaveformWidth(previewConfig);
      const forcedHeight = resolvePrintWaveformHeight({
        containerWidth: waveformContainer.clientWidth,
        containerHeight: waveformContainer.clientHeight,
        waveformWidth,
      });

      const waveformRenderResult = renderWaveformImageUrl({
        waveformData,
        sampleRate,
        duration,
        gain,
        speed,
        appearanceSettings,
        examTime: resolvedMeta.examTime || "",
        speedGainText: `${speedLabel} ${gainLabel}`,
        forcedHeight,
      });

      if (!waveformRenderResult?.dataUrl) {
        printWindow.close();
        return;
      }

      const waveformImage = injectWaveformImage(
        printWindow,
        waveformRenderResult
      );
      await waitForImagesReady([waveformImage, ...signatureImages]);
      await waitForWindowLayout(printWindow);

      printWindow.focus();
      printWindow.setTimeout(() => {
        printWindow.print();
      }, 180);
    } catch {
      printWindow.focus();
      printWindow.setTimeout(() => {
        printWindow.print();
      }, 180);
    }
  };

  void finalizePrint();

  return true;
};
