import {
  getLayoutConfig,
  getLeadDisplayName,
  getPixelsPerMv,
  getSpeedConfig,
  isLimbLead,
} from "./waveformLayouts.js";

const DEFAULT_CONFIG = {
  smallGridSize: 5,
  largeGridSize: 25,
  smallGridColor: "#EFEFEF",
  largeGridColor: "#E0E0E0",
  gridRenderPreset: "dotted-small",
  backgroundColor: "#FFFFFF",
  waveformColor: "#3B3B3B",
  waveformLineWidth: 1,
  // 工具相关的默认颜色。
  // calibrationColor / separatorColor 主要作用于校准脉冲和分隔标记。
  calibrationColor: "#2BA471",
  separatorColor: "#2BA471",
  separatorLengthLargeGrid: 2,
  separatorLineWidth: 2,
  labelColor: "rgba(0, 0, 0, 0.9)",
  labelFont: '600 14px "PingFang SC", "Microsoft YaHei", sans-serif',
  metricColor: "#3562EC",
  metricFont: '600 16px "PingFang SC", "Microsoft YaHei", sans-serif',
  // timeMarkerColor 作为历史兼容保底色保留。
  // 当前诊断中心设置弹窗已经把时间标记拆成“线色”和“文本色”，
  // 这样“工具色”和“工具文本色”可以分别驱动不同的视觉元素。
  timeMarkerColor: "#2BA471",
  timeMarkerLineColor: "#2BA471",
  timeMarkerTextColor: "#2BA471",
  timeMarkerFont: '600 14px "PingFang SC", "Microsoft YaHei", sans-serif',
  timeMarkerText: "0.0S",
  syncWindowStartMs: 0,
  useRhythmNavigator: false,
  showRhythmTimeAxis: true,
  showRhythmTimeLabels: true,
  metricRows: null,
  padding: {
    top: 25,
    right: 16,
    bottom: 25,
    left: 9,
  },
  layoutType: "6x2+1R",
  gainValue: "10",
  speedValue: "25",
  sampleRate: 500,
  duration: 10,
  displayMode: "sync",
  showCalibrationForAllLeads: false,
  showRhythmLead: true,
  rhythmLeadName: "II",
  metricsBandHeight: 64,
  rhythmBandHeight: 54,
  metricsToRhythmGap: 14,
  metricRightPaddingLargeGrids: 1,
  metricPeakMinDistanceMs: 240,
  metricMinTextGapPx: 30,
  pixelRatio: null,
  // 打印场景专用配置
  gridExtendToCanvas: false,
  canvasTopLeftText: "",
  canvasTopRightText: "",
};

const DEFAULT_PEAK_MV = 1.6;
const X_AXIS_LEADING_LARGE_GRIDS = 1;
const X_AXIS_TRAILING_LARGE_GRIDS = 1;
const CALIBRATION_PULSE_WIDTH_LARGE_GRIDS = 1;
const CALIBRATION_BASELINE_SMALL_GRIDS = 1;
const GRID_RENDER_PRESET_CLASSIC = "classic";
const GRID_RENDER_PRESET_DOTTED_SMALL = "dotted-small";

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function alignCanvasExtentToGrid(
  value,
  gridSize,
  includeBoundaryPixel = false,
) {
  const safeValue = Math.max(0, Number(value) || 0);
  const safeGridSize = Math.max(1, Number(gridSize) || 1);
  const alignedValue = Math.ceil(safeValue / safeGridSize) * safeGridSize;
  return includeBoundaryPixel ? alignedValue + 1 : alignedValue;
}

function mergeConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    padding: { ...DEFAULT_CONFIG.padding, ...(config.padding || {}) },
  };
}

function getRhythmLeadNames(config) {
  const layout = getLayoutConfig(config.layoutType);
  if (!config.showRhythmLead || !layout.rhythmLeads.length) {
    return [];
  }

  return layout.rhythmLeads.map((leadName) =>
    leadName === "II" ? config.rhythmLeadName : leadName,
  );
}

function getTrackedLeadNames(config) {
  const layout = getLayoutConfig(config.layoutType);
  return [...new Set([...layout.leads.flat(), ...getRhythmLeadNames(config)])];
}

function getLeadPeakMv(config, leadName) {
  const waveformData = config.waveformData?.[leadName];
  if (!Array.isArray(waveformData) || !waveformData.length) {
    return DEFAULT_PEAK_MV;
  }

  const sampleRate = Number(config.sampleRate) || DEFAULT_CONFIG.sampleRate;
  const duration = Math.max(
    Number(config.duration) || DEFAULT_CONFIG.duration,
    1,
  );
  const visibleSamples = Math.max(1, Math.floor(sampleRate * duration));
  const segment = waveformData.slice(0, visibleSamples);

  let peakMv = 0;
  segment.forEach((value) => {
    const safeValue = Math.abs(Number(value) || 0);
    if (safeValue > peakMv) {
      peakMv = safeValue;
    }
  });

  return peakMv || DEFAULT_PEAK_MV;
}

function getMaxVerticalExcursionPx(config, leadNames) {
  return leadNames.reduce((maxValue, leadName) => {
    const excursion =
      getLeadPeakMv(config, leadName) *
      getPixelsPerMv(config.gainValue, leadName);
    return Math.max(maxValue, excursion);
  }, config.largeGridSize * 1.25);
}

function getWaveformHeightMeta(config = {}) {
  const mergedConfig = mergeConfig(config);
  const layout = getLayoutConfig(mergedConfig.layoutType);
  const rhythmLeads = getRhythmLeadNames(mergedConfig);
  const trackedLeadNames = getTrackedLeadNames(mergedConfig);
  const maxVerticalExcursionPx = getMaxVerticalExcursionPx(
    mergedConfig,
    trackedLeadNames,
  );
  const mainRowHeight = Math.max(
    mergedConfig.largeGridSize * 3.5,
    Math.ceil(maxVerticalExcursionPx * 2 + mergedConfig.smallGridSize * 5),
  );
  const rhythmBandHeight = rhythmLeads.length
    ? Math.max(
        mergedConfig.largeGridSize * 3,
        Math.ceil(
          maxVerticalExcursionPx * 1.8 + mergedConfig.smallGridSize * 4,
        ),
      )
    : 0;
  const metricsBandHeight = rhythmLeads.length
    ? mergedConfig.metricsBandHeight
    : 0;
  const metricsToRhythmGap = rhythmLeads.length
    ? mergedConfig.metricsToRhythmGap
    : 0;
  const rhythmTotalHeight = rhythmBandHeight * rhythmLeads.length;

  return {
    mergedConfig,
    layout,
    rhythmLeads,
    mainRowHeight,
    metricsBandHeight,
    rhythmBandHeight,
    metricsToRhythmGap,
    rhythmTotalHeight,
  };
}

export function getRequiredWaveformWidth(config = {}) {
  const mergedConfig = mergeConfig(config);
  const speed = getSpeedConfig(mergedConfig.speedValue);
  // 支持通过配置覆盖前后留白大格数，未配置时使用默认常量。
  const leadingGrids = mergedConfig.xAxisLeadingLargeGrids ?? X_AXIS_LEADING_LARGE_GRIDS;
  const trailingGrids = mergedConfig.xAxisTrailingLargeGrids ?? X_AXIS_TRAILING_LARGE_GRIDS;
  const baseLeft = mergedConfig.largeGridSize * leadingGrids;
  const rightTail = mergedConfig.largeGridSize * trailingGrids;
  const totalWave = speed.pixelsPerSecond * mergedConfig.duration;

  const width = Math.ceil(
    mergedConfig.padding.left +
      baseLeft +
      totalWave +
      rightTail +
      mergedConfig.padding.right,
  );

  // 打印场景：确保画布宽度为大格整数倍，消除边缘残缺方格
  if (mergedConfig.gridExtendToCanvas) {
    return alignCanvasExtentToGrid(width, mergedConfig.largeGridSize, true);
  }

  return width;
}

export function getRequiredWaveformHeight(config = {}) {
  const {
    mergedConfig,
    layout,
    mainRowHeight,
    metricsBandHeight,
    metricsToRhythmGap,
    rhythmTotalHeight,
  } = getWaveformHeightMeta(config);

  const snapToSmallGrid = (v) =>
    Math.round(Math.max(0, Number(v) || 0) / mergedConfig.smallGridSize) *
    mergedConfig.smallGridSize;

  const paddingTop = snapToSmallGrid(mergedConfig.padding.top);
  const paddingBottom = snapToSmallGrid(mergedConfig.padding.bottom);
  const rawContentHeight =
    layout.rows * mainRowHeight +
    metricsBandHeight +
    metricsToRhythmGap +
    rhythmTotalHeight;
  // 向上对齐到 largeGridSize 整数倍，确保网格大格完整渲染
  const alignedContentHeight =
    Math.ceil(rawContentHeight / mergedConfig.largeGridSize) *
    mergedConfig.largeGridSize;

  const height = paddingTop + alignedContentHeight + paddingBottom;

  // 打印场景：确保画布高度为大格整数倍，消除边缘残缺方格
  if (mergedConfig.gridExtendToCanvas) {
    return alignCanvasExtentToGrid(height, mergedConfig.largeGridSize, true);
  }

  return height;
}

export class ECGCanvasRenderer {
  constructor(options = {}) {
    this.config = mergeConfig(options);
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.staticCanvas = null;
    this.staticCtx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = this._resolvePixelRatio();
    this.gridBounds = null;
    this.leadRegions = null;
    this.rhythmNavigatorGeometry = null;
    this.waveformData = null;
    this.resizeObserver = null;

    this._handleResize = this._handleResize.bind(this);
  }

  _resolvePixelRatio() {
    const configuredRatio = Number(this.config.pixelRatio);
    if (Number.isFinite(configuredRatio) && configuredRatio > 0) {
      return configuredRatio;
    }

    return window.devicePixelRatio || 1;
  }

  initialize(container) {
    if (!container) throw new Error("ECGCanvasRenderer: container is required");
    this.container = container;
    this._createCanvas();
    this._updateSize();
    this.render();
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.staticCanvas = null;
    this.staticCtx = null;
    this.waveformData = null;
    this.gridBounds = null;
    this.leadRegions = null;
    this.rhythmNavigatorGeometry = null;
  }

  _createCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "ecg-canvas";
    this.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;";
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this._createStaticCanvas();
  }

  _createStaticCanvas() {
    this.staticCanvas = document.createElement("canvas");
    this.staticCtx = this.staticCanvas.getContext("2d");
  }

  _setupResizeObserver() {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this._handleResize);
      this.resizeObserver.observe(this.container);
    }
  }

  _handleResize() {
    this._updateSize();
    this.render();
  }

  _updateSize() {
    const rect = this.container.getBoundingClientRect();
    // 缩放查看态只应该影响视觉尺寸，不应该反向污染 renderer 的基础纸张几何。
    // clientWidth/clientHeight 读取的是布局尺寸，能避免 transform 造成的双重放大。
    this.width = this.container.clientWidth || rect.width;
    this.height = this.container.clientHeight || rect.height;
    this.dpr = this._resolvePixelRatio();
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.staticCanvas && this.staticCtx) {
      this.staticCanvas.width = this.width * this.dpr;
      this.staticCanvas.height = this.height * this.dpr;
      this.staticCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  setConfig(newConfig = {}) {
    this.config = {
      ...this.config,
      ...newConfig,
      padding: { ...this.config.padding, ...(newConfig.padding || {}) },
    };
  }

  getGridBounds() {
    return this.gridBounds;
  }

  getLeadRegions() {
    return this.leadRegions;
  }

  getRhythmNavigatorGeometry() {
    return this.rhythmNavigatorGeometry;
  }

  syncSize() {
    this._updateSize();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  _runWithContext(ctx, callback) {
    const previousCtx = this.ctx;
    this.ctx = ctx;

    try {
      callback();
    } finally {
      this.ctx = previousCtx;
    }
  }

  _renderStaticLayer() {
    if (!this.staticCtx || !this.staticCanvas) {
      return;
    }

    this._runWithContext(this.staticCtx, () => {
      this.clear();
      this._drawGrid();
      this._drawCanvasTopLabels();

      const drawStaticRegion = (region) => {
        this._drawLeadLabelsAndCalibration(region);
      };

      this.leadRegions.main.forEach(drawStaticRegion);
      this.leadRegions.rhythm.forEach(drawStaticRegion);
      this._drawSeparators();
      this._drawRhythmStartLine();
      this._drawMetricsAndTime();
    });
  }

  _renderDynamicLayer() {
    this.clear();

    if (this.staticCanvas) {
      this.ctx.drawImage(this.staticCanvas, 0, 0, this.width, this.height);
    }

    const drawDynamicRegion = (region) => {
      const waveformData = this.waveformData?.[region.leadName];
      this._drawWave(region, waveformData);
    };

    this.leadRegions.main.forEach(drawDynamicRegion);
    this.leadRegions.rhythm.forEach(drawDynamicRegion);
  }

  _calculateGeometry() {
    const { padding, largeGridSize, smallGridSize } = this.config;
    const speed = getSpeedConfig(this.config.speedValue);
    const {
      layout,
      rhythmLeads,
      mainRowHeight: minMainRowHeight,
      metricsBandHeight: baseMetricsBandHeight,
      rhythmBandHeight: baseRhythmBandHeight,
      metricsToRhythmGap: baseMetricsToRhythmGap,
    } = getWaveformHeightMeta({
      ...this.config,
      waveformData: this.waveformData,
    });

    const snapToSmallGrid = (value) => {
      const safeValue = Math.max(0, Number(value) || 0);
      return Math.round(safeValue / smallGridSize) * smallGridSize;
    };

    const left = snapToSmallGrid(padding.left);
    const top = snapToSmallGrid(padding.top);
    const rawBottom = Math.max(
      top,
      this.height - snapToSmallGrid(padding.bottom),
    );
    const rawHeight = Math.max(0, rawBottom - top);
    // 向下对齐到 largeGridSize 整数倍，兜底确保网格大格完整渲染
    const height = Math.floor(rawHeight / largeGridSize) * largeGridSize;
    const bottom = top + height;

    let metricsBandHeight = baseMetricsBandHeight;
    let rhythmBandHeight = baseRhythmBandHeight;
    let metricsToRhythmGap = baseMetricsToRhythmGap;
    let rhythmTotalHeight = rhythmBandHeight * rhythmLeads.length;

    const requiredHeight =
      layout.rows * minMainRowHeight +
      metricsBandHeight +
      metricsToRhythmGap +
      rhythmTotalHeight;

    if (rhythmLeads.length && requiredHeight > height) {
      const overflow = requiredHeight - height;
      if (baseMetricsBandHeight > 0) {
        metricsBandHeight = Math.max(36, metricsBandHeight - overflow * 0.35);
      }
      rhythmBandHeight = Math.max(
        48,
        rhythmBandHeight - (overflow * 0.25) / rhythmLeads.length,
      );
      if (baseMetricsToRhythmGap > 0) {
        metricsToRhythmGap = Math.max(
          6,
          metricsToRhythmGap - overflow * 0.08,
        );
      }
      rhythmTotalHeight = rhythmBandHeight * rhythmLeads.length;
    }

    const mainHeight = Math.max(
      0,
      height - metricsBandHeight - metricsToRhythmGap - rhythmTotalHeight,
    );
    const mainRowHeight = layout.rows > 0 ? mainHeight / layout.rows : 0;

    // 支持通过配置覆盖前后留白大格数，未配置时使用默认常量。
    const leadingGrids = this.config.xAxisLeadingLargeGrids ?? X_AXIS_LEADING_LARGE_GRIDS;
    const trailingGrids = this.config.xAxisTrailingLargeGrids ?? X_AXIS_TRAILING_LARGE_GRIDS;
    const leftMeta = largeGridSize * leadingGrids;
    const rightTail = largeGridSize * trailingGrids;
    const waveStartX = left + leftMeta;
    const standardWaveWidth = speed.pixelsPerSecond * this.config.duration;
    const waveWidth = standardWaveWidth;
    const waveEndX = waveStartX + waveWidth;
    const right = waveEndX + rightTail;

    this.gridBounds = {
      startX: left,
      startY: top,
      endX: right,
      endY: bottom,
      width: right - left,
      height,
    };

    const columnWaveWidth =
      layout.columns > 0 ? waveWidth / layout.columns : waveWidth;
    const snapToLargeGridX = (value) => {
      const offset = (Number(value) || 0) - left;
      return left + Math.round(offset / largeGridSize) * largeGridSize;
    };

    const shouldKeepEqualColumns = ["3x4+1R", "3x4+3R"].includes(
      this.config.layoutType,
    );
    const columnStartXs = [waveStartX];
    for (let columnIndex = 1; columnIndex < layout.columns; columnIndex++) {
      const rawBoundaryX = waveStartX + columnIndex * columnWaveWidth;

      if (shouldKeepEqualColumns) {
        // The 3x4 rhythm layouts follow the design spec: waveform columns stay strictly equal.
        columnStartXs.push(rawBoundaryX);
        continue;
      }

      const snappedBoundaryX = snapToLargeGridX(rawBoundaryX);
      const minBoundaryX = columnStartXs[columnIndex - 1] + smallGridSize;
      const maxBoundaryX =
        waveEndX - smallGridSize * (layout.columns - columnIndex);
      columnStartXs.push(
        Math.min(Math.max(snappedBoundaryX, minBoundaryX), maxBoundaryX),
      );
    }

    const separatorXs = columnStartXs.slice(1);
    const main = [];
    const labelOffsetX = this.config.smallGridSize * 0.8;
    const labelOffsetY = this.config.largeGridSize * 0.26;

    layout.leads.forEach((rowLeads, rowIndex) => {
      rowLeads.forEach((leadName, colIndex) => {
        const y = top + rowIndex * mainRowHeight;
        const centerY = y + mainRowHeight / 2;
        const leadWaveStartX = columnStartXs[colIndex] ?? waveStartX;
        const leadWaveEndX =
          colIndex < layout.columns - 1
            ? columnStartXs[colIndex + 1]
            : waveEndX;

        main.push({
          type: "main",
          leadName,
          rowIndex,
          colIndex,
          y,
          height: mainRowHeight,
          centerY,
          waveStartX: leadWaveStartX,
          waveEndX: leadWaveEndX,
          waveWidth: Math.max(0, leadWaveEndX - leadWaveStartX),
          labelX: leadWaveStartX + labelOffsetX,
          labelY: centerY - labelOffsetY,
        });
      });
    });

    const rhythm = [];
    const rhythmStartY =
      top + mainHeight + metricsBandHeight + metricsToRhythmGap;
    rhythmLeads.forEach((leadName, idx) => {
      const y = rhythmStartY + idx * rhythmBandHeight;
      const centerY = y + rhythmBandHeight / 2;
      rhythm.push({
        type: "rhythm",
        leadName,
        rowIndex: layout.rows + idx,
        y,
        height: rhythmBandHeight,
        centerY,
        waveStartX,
        waveEndX,
        waveWidth,
        labelX: waveStartX + labelOffsetX,
        labelY: centerY - labelOffsetY,
      });
    });
    // 允许布局显式指定导航框绑定的节律导联，避免 3x4+3R 默认落到首条 II。
    const navigatorLeadName = layout.navigatorLead || this.config.rhythmLeadName;
    const activeRhythmRegion =
      rhythm.find((item) => item.leadName === navigatorLeadName) ||
      rhythm.find((item) => item.leadName === this.config.rhythmLeadName) ||
      rhythm[0] ||
      null;
    const navigatorAxisInset = Math.max(6, smallGridSize * 0.8);
    const navigatorTopInset = Math.max(4, smallGridSize * 0.6);
    const navigatorBottomInset = Math.max(4, smallGridSize * 0.6);
    const navigatorLabelGap = Math.max(10, smallGridSize * 1.8);
    const navigatorLabelMaxY = Math.round(bottom - smallGridSize * 0.8);

    this.rhythmNavigatorGeometry = activeRhythmRegion
      ? (() => {
          // Canvas 1px strokes stay crisp on half-pixels, but the baseline itself
          // must still sit on the last grid row rather than an inset inside the rhythm band.
          const axisY = Math.round(bottom) + 0.5;
          const labelY = Math.min(
            navigatorLabelMaxY,
            Math.round(axisY + navigatorLabelGap),
          );
          const barTop = activeRhythmRegion.y + navigatorTopInset;
          const barBottom = Math.max(
            barTop + 20,
            axisY - navigatorBottomInset,
          );

          return {
            leadName: activeRhythmRegion.leadName,
            trackX: activeRhythmRegion.waveStartX,
            trackWidth: activeRhythmRegion.waveWidth,
            windowWidth: columnWaveWidth,
            barTop,
            barHeight: Math.max(20, barBottom - barTop),
            axisY,
            labelY,
            dragTargetHeight: Math.max(
              32,
              Math.round(labelY - barTop + 24),
            ),
          };
        })()
      : null;

    this.leadRegions = {
      main,
      rhythm,
      rhythmNavigator: this.rhythmNavigatorGeometry,
      separatorXs,
      waveStartX,
      waveEndX,
      columnWaveWidth,
      startAnchorXs: columnStartXs.slice(0, layout.columns),
      calibrationX: left,
      metricsBand: {
        x: waveStartX,
        y: top + mainHeight,
        width: waveWidth,
        height: metricsBandHeight,
      },
      metricsToRhythmGap,
    };
  }

  _getGridPositions(origin, lowerBound, upperBound, step) {
    const positions = [];

    for (let value = origin; value <= upperBound; value += step) {
      positions.push(value);
    }

    for (let value = origin - step; value >= lowerBound; value -= step) {
      positions.push(value);
    }

    return positions;
  }

  _isOnLargeGrid(position, origin, largeGridSize) {
    const offset = Math.abs((Number(position) || 0) - (Number(origin) || 0));
    const safeLargeGridSize = Math.max(1, Number(largeGridSize) || 1);
    const remainder = offset % safeLargeGridSize;
    return remainder < 0.001 || safeLargeGridSize - remainder < 0.001;
  }

  _drawSmallGridLines({
    ctx,
    startX,
    startY,
    gridStartX,
    gridStartY,
    gridEndX,
    gridEndY,
    smallGridSize,
    smallGridColor,
  }) {
    ctx.strokeStyle = smallGridColor;
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.beginPath();

    for (let x = startX; x <= gridEndX; x += smallGridSize) {
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridEndY);
    }
    for (let x = startX - smallGridSize; x >= gridStartX; x -= smallGridSize) {
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridEndY);
    }

    for (let y = startY; y <= gridEndY; y += smallGridSize) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridEndX, py);
    }
    for (let y = startY - smallGridSize; y >= gridStartY; y -= smallGridSize) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridEndX, py);
    }

    ctx.stroke();
  }

  _drawSmallGridDots({
    ctx,
    startX,
    startY,
    gridStartX,
    gridStartY,
    gridEndX,
    gridEndY,
    smallGridSize,
    largeGridSize,
    smallGridColor,
  }) {
    const xPositions = this._getGridPositions(
      startX,
      gridStartX,
      gridEndX,
      smallGridSize,
    );
    const yPositions = this._getGridPositions(
      startY,
      gridStartY,
      gridEndY,
      smallGridSize,
    );
    const dotSize = Math.max(1, Math.min(1.4, smallGridSize * 0.24));
    const halfDotSize = dotSize / 2;

    ctx.fillStyle = smallGridColor;

    xPositions.forEach((x) => {
      if (this._isOnLargeGrid(x, startX, largeGridSize)) {
        return;
      }

      const px = Math.round(x);

      yPositions.forEach((y) => {
        if (this._isOnLargeGrid(y, startY, largeGridSize)) {
          return;
        }

        const py = Math.round(y);
        ctx.fillRect(
          px - halfDotSize,
          py - halfDotSize,
          dotSize,
          dotSize,
        );
      });
    });
  }

  _drawGrid() {
    const ctx = this.ctx;
    const {
      smallGridSize,
      largeGridSize,
      smallGridColor,
      largeGridColor,
      backgroundColor,
      gridExtendToCanvas,
      gridRenderPreset,
    } = this.config;
    const { startX, startY, endX, endY } = this.gridBounds;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    const gridStartX = gridExtendToCanvas ? 0 : startX;
    const gridStartY = gridExtendToCanvas ? 0 : startY;
    const gridEndX = gridExtendToCanvas ? this.width : endX;
    const gridEndY = gridExtendToCanvas ? this.height : endY;

    if (gridRenderPreset === GRID_RENDER_PRESET_DOTTED_SMALL) {
      this._drawSmallGridDots({
        ctx,
        startX,
        startY,
        gridStartX,
        gridStartY,
        gridEndX,
        gridEndY,
        smallGridSize,
        largeGridSize,
        smallGridColor,
      });
    } else {
      this._drawSmallGridLines({
        ctx,
        startX,
        startY,
        gridStartX,
        gridStartY,
        gridEndX,
        gridEndY,
        smallGridSize,
        smallGridColor,
      });
    }

    // ????
    ctx.strokeStyle = largeGridColor;
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (let x = startX; x <= gridEndX; x += largeGridSize) {
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridEndY);
    }
    for (let x = startX - largeGridSize; x >= gridStartX; x -= largeGridSize) {
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridEndY);
    }
    for (let y = startY; y <= gridEndY; y += largeGridSize) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridEndX, py);
    }
    for (let y = startY - largeGridSize; y >= gridStartY; y -= largeGridSize) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridEndX, py);
    }
    ctx.stroke();
  }

  _drawLeadLabelsAndCalibration(region) {
    const ctx = this.ctx;
    const pulseHeight = getPixelsPerMv(this.config.gainValue, region.leadName);
    const calibrationWidth =
      this.config.largeGridSize * CALIBRATION_PULSE_WIDTH_LARGE_GRIDS;
    const calibrationBaselineWidth =
      this.config.smallGridSize * CALIBRATION_BASELINE_SMALL_GRIDS;
    const calibrationPlateauWidth = Math.max(
      this.config.smallGridSize,
      calibrationWidth - calibrationBaselineWidth * 2,
    );

    ctx.fillStyle = this.config.labelColor;
    ctx.font = this.config.labelFont;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(
      getLeadDisplayName(region.leadName),
      region.labelX,
      region.labelY ?? region.centerY,
    );

    // 节律页需要在 V1/V5 等胸导联旁也显示校准脉冲，因此支持配置强制全导联绘制。
    if (
      !this.config.showCalibrationForAllLeads &&
      !isLimbLead(region.leadName)
    ) {
      return;
    }

    const x = this.leadRegions.calibrationX;
    const y = region.centerY;
    const topY = y - pulseHeight;
    const riseX = x + calibrationBaselineWidth;
    const fallX = riseX + calibrationPlateauWidth;
    const endX = fallX + calibrationBaselineWidth;
    ctx.strokeStyle = this.config.calibrationColor;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(riseX, y);
    ctx.lineTo(riseX, topY);
    ctx.lineTo(fallX, topY);
    ctx.lineTo(fallX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  _drawCanvasTopLabels() {
    const { canvasTopLeftText, canvasTopRightText } = this.config;
    if (!canvasTopLeftText && !canvasTopRightText) return;
    if (!this.leadRegions || !this.gridBounds) return;

    const ctx = this.ctx;
    const { waveStartX, waveEndX } = this.leadRegions;
    const labelY = Math.max(
      2,
      this.gridBounds.startY -
        this.config.largeGridSize +
        this.config.smallGridSize,
    );

    ctx.fillStyle = this.config.labelColor;
    ctx.font = this.config.labelFont;
    // 顶部标签需要完整落在画布内，避免小 top padding 场景被裁切。
    ctx.textBaseline = "top";

    // 左侧文本（时间）
    if (canvasTopLeftText) {
      ctx.textAlign = "left";
      ctx.fillText(canvasTopLeftText, waveStartX, labelY);
    }

    // 右侧文本（走速/增益）
    if (canvasTopRightText) {
      ctx.textAlign = "right";
      ctx.fillText(canvasTopRightText, waveEndX, labelY);
    }
  }

  _drawWave(region, data) {
    if (!data?.length || region.waveWidth <= 0) return;

    const ctx = this.ctx;
    const speed = getSpeedConfig(this.config.speedValue);
    const pixelsPerSample = speed.pixelsPerSecond / this.config.sampleRate;
    const maxSamples = Math.floor(region.waveWidth / pixelsPerSample);
    const totalVisibleSamples = Math.max(
      1,
      Math.floor(this.config.sampleRate * this.config.duration),
    );
    const availableSamples = Math.min(data.length, totalVisibleSamples);
    const maxStartSample = Math.max(0, availableSamples - maxSamples);
    let startSample = 0;

    if (region.type === "main") {
      if (this.config.displayMode === "async") {
        const layout = getLayoutConfig(this.config.layoutType);
        if (layout.columns > 1 && typeof region.colIndex === "number") {
          startSample = clampValue(region.colIndex * maxSamples, 0, maxStartSample);
        }
      } else {
        // 同步模式下所有主导联共享同一个时间窗口起点。
        
        const requestedStartSample = Math.round(
          ((Number(this.config.syncWindowStartMs) || 0) / 1000) *
            this.config.sampleRate,
        );
        startSample = clampValue(requestedStartSample, 0, maxStartSample);
      }
    }

    const drawData = data.slice(startSample, startSample + maxSamples);
    const pixelsPerMv = getPixelsPerMv(this.config.gainValue, region.leadName);

    ctx.strokeStyle = this.config.waveformColor;
    ctx.lineWidth = this.config.waveformLineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    drawData.forEach((value, index) => {
      const x = region.waveStartX + index * pixelsPerSample;
      const y = region.centerY - value * pixelsPerMv;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  _drawSeparators() {
    const ctx = this.ctx;
    const mainRegions = this.leadRegions.main || [];
    if (!mainRegions.length) return;

    ctx.strokeStyle = this.config.separatorColor;
    ctx.lineWidth = this.config.separatorLineWidth;
    ctx.lineCap = "butt";
    const length =
      this.config.largeGridSize * this.config.separatorLengthLargeGrid;
    const rightStartRegions = mainRegions.filter(
      (region) => typeof region.colIndex === "number" && region.colIndex > 0,
    );

    rightStartRegions.forEach((region) => {
      const px = Math.round(region.waveStartX) + 0.5;
      const startY = region.centerY;
      const endY = region.centerY - length;
      ctx.beginPath();
      ctx.moveTo(px, startY);
      ctx.lineTo(px, endY);
      ctx.stroke();
    });
  }

  _formatRhythmTimeLabel(timeSeconds) {
    return `${Math.max(0, Number(timeSeconds) || 0).toFixed(1)}S`;
  }

  _getRhythmTimeMarkers() {
    if (!this.leadRegions) return [];

    const { waveStartX, waveEndX, startAnchorXs } = this.leadRegions;
    const rawMarkers = [...(startAnchorXs || []), waveEndX]
      .filter((x) => Number.isFinite(x))
      .sort((a, b) => a - b);

    if (!rawMarkers.length) {
      return [];
    }

    const uniqueMarkers = rawMarkers.filter(
      (x, index) => index === 0 || Math.abs(x - rawMarkers[index - 1]) > 0.5,
    );
    const totalSeconds = Math.max(0, Number(this.config.duration) || 0);
    const waveWidth = Math.max(1, waveEndX - waveStartX);

    return uniqueMarkers.map((x, index) => {
      let textAlign = "center";
      if (index === 0) {
        textAlign = "left";
      } else if (index === uniqueMarkers.length - 1) {
        textAlign = "right";
      }

      const elapsedSeconds = ((x - waveStartX) / waveWidth) * totalSeconds;
      return {
        x,
        textAlign,
        label: this._formatRhythmTimeLabel(elapsedSeconds),
      };
    });
  }

  _drawRhythmStartLine() {
    const rhythmRegions = this.leadRegions?.rhythm || [];
    if (!rhythmRegions.length) return;
    if (this.config.useRhythmNavigator) return;
    if (!this.config.showRhythmTimeAxis) return;

    const ctx = this.ctx;
    const markers = this._getRhythmTimeMarkers();
    if (!markers.length) return;

    const y = this.rhythmNavigatorGeometry?.axisY ?? Math.round(this.gridBounds.endY) + 0.5;
    const lineStartX = markers[0].x;
    const lineEndX = markers[markers.length - 1].x;

    // Draw the continuous rhythm time axis from column anchors through the waveform end.
    ctx.strokeStyle =
      this.config.timeMarkerLineColor || this.config.timeMarkerColor;
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(lineStartX, y);
    ctx.lineTo(lineEndX, y);
    ctx.stroke();

    markers.forEach(({ x }) => {
      const px = Math.round(x) + 0.5;
      const topY = y - this.config.largeGridSize * 0.42;
      ctx.beginPath();
      ctx.moveTo(px, topY);
      ctx.lineTo(px, y);
      ctx.stroke();
    });
  }

  _snapToLargeGridX(x) {
    const { startX } = this.gridBounds;
    const { largeGridSize } = this.config;
    return startX + Math.round((x - startX) / largeGridSize) * largeGridSize;
  }

  _getFallbackMetricAnchorXs(slots, minX, maxX) {
    if (slots <= 0) return [];
    const anchors = [];
    const span = Math.max(0, maxX - minX);
    const minGap = Math.max(
      Number(this.config.metricMinTextGapPx) || 30,
      this.config.largeGridSize,
    );

    for (let index = 0; index < slots; index++) {
      const ratio = slots === 1 ? 0 : index / (slots - 1);
      const x = minX + span * ratio;
      const snapped = Math.min(maxX, Math.max(minX, this._snapToLargeGridX(x)));
      const prev = anchors[index - 1];
      if (index > 0 && snapped - prev < minGap) {
        anchors.push(Math.min(maxX, prev + minGap));
      } else {
        anchors.push(snapped);
      }
    }

    return anchors;
  }

  _detectRhythmQrsSampleIndexes(region, data) {
    if (!region || !data?.length) return [];
    const speed = getSpeedConfig(this.config.speedValue);
    const sampleRate = Number(this.config.sampleRate) || 500;
    const pixelsPerSample = speed.pixelsPerSecond / sampleRate;
    if (!pixelsPerSample) return [];

    const maxSamples = Math.max(
      0,
      Math.floor(region.waveWidth / pixelsPerSample),
    );
    const drawData = data.slice(0, maxSamples);
    if (drawData.length < 3) return [];

    let absMax = 0;
    drawData.forEach((value) => {
      const abs = Math.abs(value);
      if (abs > absMax) absMax = abs;
    });

    const threshold = absMax * 0.45;
    const minDistanceSamples = Math.max(
      1,
      Math.round(
        ((Number(this.config.metricPeakMinDistanceMs) || 240) / 1000) *
          sampleRate,
      ),
    );

    const peaks = [];
    let lastPeak = -minDistanceSamples;
    for (let index = 1; index < drawData.length - 1; index++) {
      const prevAbs = Math.abs(drawData[index - 1]);
      const currAbs = Math.abs(drawData[index]);
      const nextAbs = Math.abs(drawData[index + 1]);
      if (currAbs < threshold) continue;
      if (currAbs < prevAbs || currAbs < nextAbs) continue;
      if (index - lastPeak < minDistanceSamples) continue;
      peaks.push(index);
      lastPeak = index;
    }

    return peaks;
  }

  _getMetricRows() {
    const metricRows = this.config.metricRows || {};
    const showHeartRate = Boolean(metricRows.showHeartRate);
    const showRrInterval = Boolean(metricRows.showRrInterval);
    return {
      showHeartRate,
      showRrInterval,
      heartRate:
        showHeartRate && Array.isArray(metricRows.heartRate)
          ? metricRows.heartRate
          : [],
      rrInterval:
        showRrInterval && Array.isArray(metricRows.rrInterval)
          ? metricRows.rrInterval
          : [],
    };
  }

  _getMetricRegion() {
    const rhythmRegions = this.leadRegions?.rhythm || [];
    return (
      rhythmRegions.find(
        (item) => item.leadName === this.config.rhythmLeadName,
      ) ||
      rhythmRegions[0] ||
      null
    );
  }

  _getMetricBounds(region) {
    const rightGap =
      this.config.largeGridSize *
      Math.max(1, Number(this.config.metricRightPaddingLargeGrids) || 1);
    const minX = region.waveStartX;
    const maxX = Math.max(minX, region.waveEndX - rightGap);
    return { minX, maxX };
  }

  _buildMetricEntries() {
    const region = this._getMetricRegion();
    if (!region) return [];

    const { showHeartRate, showRrInterval, heartRate, rrInterval } =
      this._getMetricRows();
    if (!showHeartRate && !showRrInterval) return [];

    const fallbackSlots = Math.max(heartRate.length, rrInterval.length);
    const { minX, maxX } = this._getMetricBounds(region);
    const fallbackAnchors = this._getFallbackMetricAnchorXs(
      fallbackSlots,
      minX,
      maxX,
    );
    const fallbackEntries = fallbackAnchors
      .map((x, index) => ({
        x,
        hr: showHeartRate ? heartRate[index] : undefined,
        rr: showRrInterval ? rrInterval[index] : undefined,
      }))
      .filter((entry) => entry.hr !== undefined || entry.rr !== undefined);

    const leadData = this.waveformData?.[region.leadName];
    const peakSamples = this._detectRhythmQrsSampleIndexes(region, leadData);
    if (!peakSamples.length) return fallbackEntries;

    const speed = getSpeedConfig(this.config.speedValue);
    const sampleRate = Number(this.config.sampleRate) || 500;
    const pixelsPerSample = speed.pixelsPerSecond / sampleRate;
    if (!pixelsPerSample) return fallbackEntries;

    const minGap = Math.max(
      Number(this.config.metricMinTextGapPx) || 30,
      this.config.largeGridSize,
    );
    const entries = [];

    peakSamples.forEach((sample, index) => {
      const rawX = region.waveStartX + sample * pixelsPerSample;
      const x = Math.min(maxX, Math.max(minX, rawX));
      const prevEntry = entries[entries.length - 1];
      if (prevEntry && x - prevEntry.x < minGap) return;

      const nextSample = peakSamples[index + 1];
      const prevSample = peakSamples[index - 1];
      const intervalSamples =
        Number.isFinite(nextSample) && nextSample > sample
          ? nextSample - sample
          : Number.isFinite(prevSample) && sample > prevSample
            ? sample - prevSample
            : undefined;
      const computedRr =
        Number.isFinite(intervalSamples) && intervalSamples > 0
          ? Math.round((intervalSamples / sampleRate) * 1000)
          : undefined;
      const computedHr =
        Number.isFinite(computedRr) && computedRr > 0
          ? Math.round(60000 / computedRr)
          : undefined;

      entries.push({
        x,
        hr: showHeartRate ? heartRate[index] ?? computedHr : undefined,
        rr: showRrInterval ? rrInterval[index] ?? computedRr : undefined,
      });
    });

    return entries.some(
      (entry) => entry.hr !== undefined || entry.rr !== undefined,
    )
      ? entries
      : fallbackEntries;
  }

  _drawMetricsAndTime() {
    const { metricsBand } = this.leadRegions;
    if (!metricsBand.height) return;

    const ctx = this.ctx;
    const entries = this._buildMetricEntries();
    const y1 = metricsBand.y + metricsBand.height * 0.3;
    const y2 = metricsBand.y + metricsBand.height * 0.7;

    if (entries.length) {
      ctx.fillStyle = this.config.metricColor;
      ctx.font = this.config.metricFont;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      const offsetX = this.config.smallGridSize * 0.5;
      const offsetY = this.config.smallGridSize * 1.2;

      entries.forEach(({ x, hr, rr }) => {
        if (hr !== undefined)
          ctx.fillText(String(hr), x - offsetX, y1 - offsetY);
        if (rr !== undefined)
          ctx.fillText(String(rr), x - offsetX, y2 - offsetY);
      });
    }

    // 时间标记文本优先使用“工具文本色”，与时间标记线分离，
    // 对应设置弹窗中的“工具文本色”配置项。
    if (!this.config.useRhythmNavigator && this.config.showRhythmTimeLabels) {
      ctx.fillStyle =
        this.config.timeMarkerTextColor || this.config.timeMarkerColor;
      ctx.font = this.config.timeMarkerFont;
      ctx.textBaseline = "alphabetic";
      const markerY = this.rhythmNavigatorGeometry?.labelY ?? this.gridBounds.endY - this.config.smallGridSize * 0.8;
      const markerOffsetX = this.config.smallGridSize * 0.35;
      const markers = this._getRhythmTimeMarkers();

      markers.forEach(({ x, label, textAlign }) => {
        ctx.textAlign = textAlign;
        const labelX =
          textAlign === "left"
            ? x + markerOffsetX
            : textAlign === "right"
              ? x - markerOffsetX
              : x;
        ctx.fillText(label, labelX, markerY);
      });
    }
  }

  renderWaveforms(waveformData) {
    this.waveformData = waveformData;
    this.render();
  }

  renderDynamicWaveforms(waveformData) {
    this.waveformData = waveformData;

    if (!this.width || !this.height) return;
    if (!this.gridBounds || !this.leadRegions || !this.staticCanvas) {
      this.render();
      return;
    }

    this._renderDynamicLayer();
  }

  render() {
    if (!this.width || !this.height) return;
    this._calculateGeometry();
    this._renderStaticLayer();
    this._renderDynamicLayer();
  }
}

export function createECGCanvasRenderer(options = {}) {
  return new ECGCanvasRenderer(options);
}

export default ECGCanvasRenderer;
