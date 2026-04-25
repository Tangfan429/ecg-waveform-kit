import { computed, onUnmounted, ref, toValue, watch } from "vue";
import {
  AVERAGE_TEMPLATE_PLOT_AREA,
  getAverageTemplatePixelsPerMv,
  getAverageTemplatePixelsPerSecond,
} from "../utils/averageTemplateChartConfig";

const MIN_RULER_RECT_SIZE = 6;

const RULER_STROKE_COLOR = "#3562EC";
const RULER_FILL_COLOR = "rgba(53, 98, 236, 0.04)";
const RULER_LINE_WIDTH = 2;
const RULER_DASH_PATTERN = [8, 6];

const LABEL_FONT = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
const LABEL_COLOR = "#3562EC";
const LABEL_OFFSET_BOTTOM = 28;
const LABEL_OFFSET_TOP = 12;
const LABEL_HORIZONTAL_PADDING = 120;

const plotArea = AVERAGE_TEMPLATE_PLOT_AREA;

export function useAverageTemplateRuler(options = {}) {
  const { canvasRef, chartSize } = options;

  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const speed = computed(() => toValue(options.speed) || "200");
  const gain = computed(() => toValue(options.gain) || "100");
  const hasWaveData = computed(() => Boolean(toValue(options.hasWaveData)));
  const waveKey = computed(() => toValue(options.waveKey));

  const pixelsPerMs = computed(
    () => getAverageTemplatePixelsPerSecond(speed.value) / 1000,
  );
  const amplitudeScale = computed(() => getAverageTemplatePixelsPerMv(gain.value));

  let dragging = false;
  let pointerId = null;
  let cachedRect = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;
  let rafPending = false;

  const measureResult = ref(null);

  function clientToLogical(clientX, clientY) {
    if (!cachedRect || !cachedRect.width || !cachedRect.height) {
      return null;
    }

    const rawX = ((clientX - cachedRect.left) / cachedRect.width) * chartSize.width;
    const rawY = ((clientY - cachedRect.top) / cachedRect.height) * chartSize.height;

    return {
      rawX,
      rawY,
      x: Math.min(plotArea.right, Math.max(plotArea.left, rawX)),
      y: Math.min(plotArea.bottom, Math.max(plotArea.top, rawY)),
    };
  }

  function isInsidePlotArea(rawX, rawY) {
    return (
      rawX >= plotArea.left &&
      rawX <= plotArea.right &&
      rawY >= plotArea.top &&
      rawY <= plotArea.bottom
    );
  }

  function getCanvasContext() {
    const canvas = toValue(canvasRef);
    if (!canvas) {
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const dpr =
      typeof window === "undefined" ? 1 : Math.max(window.devicePixelRatio || 1, 1);

    return { ctx, dpr };
  }

  function cancelPendingRaf() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    rafPending = false;
  }

  function clearCanvas() {
    const result = getCanvasContext();
    if (!result) {
      return;
    }

    const { ctx, dpr } = result;
    ctx.clearRect(0, 0, chartSize.width * dpr, chartSize.height * dpr);
  }

  function drawRulerFrame() {
    const result = getCanvasContext();
    if (!result) {
      return;
    }

    const { ctx, dpr } = result;
    ctx.clearRect(0, 0, chartSize.width * dpr, chartSize.height * dpr);

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width < MIN_RULER_RECT_SIZE || height < MIN_RULER_RECT_SIZE) {
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = RULER_FILL_COLOR;
    ctx.fillRect(left, top, width, height);

    ctx.strokeStyle = RULER_STROKE_COLOR;
    ctx.lineWidth = RULER_LINE_WIDTH;
    ctx.setLineDash(RULER_DASH_PATTERN);
    ctx.strokeRect(left, top, width, height);
    ctx.setLineDash([]);

    const deltaTime = width / pixelsPerMs.value;
    const deltaVoltage = height / amplitudeScale.value;
    const heartRate = deltaTime > 0 ? Math.round(60000 / deltaTime) : null;
    const labelText = [
      `${Math.round(deltaTime)}ms`,
      `${deltaVoltage.toFixed(3)}mV`,
      heartRate === null ? "--bpm" : `${heartRate}bpm`,
    ].join("  ");

    const preferredY = top + height + LABEL_OFFSET_BOTTOM;
    const fallbackY = top - LABEL_OFFSET_TOP;
    const labelY = preferredY <= plotArea.bottom - 8 ? preferredY : fallbackY;
    const labelX = Math.max(
      plotArea.left + LABEL_HORIZONTAL_PADDING,
      Math.min(plotArea.right - LABEL_HORIZONTAL_PADDING, left + width / 2),
    );

    ctx.font = LABEL_FONT;
    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, labelX, labelY);

    ctx.restore();
  }

  function drawRuler() {
    if (!dragging) {
      return;
    }

    drawRulerFrame();
  }

  function scheduleDrawRuler() {
    if (rafPending) {
      return;
    }

    rafPending = true;
    rafId = requestAnimationFrame(() => {
      rafPending = false;
      drawRuler();
    });
  }

  function handlePointerDown(event) {
    if (!enabled.value || !hasWaveData.value) {
      return;
    }

    const canvas = toValue(canvasRef);
    if (!canvas) {
      return;
    }

    cachedRect = canvas.getBoundingClientRect();
    const pos = clientToLogical(event.clientX, event.clientY);

    if (!pos || !isInsidePlotArea(pos.rawX, pos.rawY)) {
      return;
    }

    dragging = true;
    pointerId = event.pointerId;
    startX = pos.x;
    startY = pos.y;
    currentX = pos.x;
    currentY = pos.y;
    measureResult.value = null;

    canvas.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) {
      return;
    }

    const pos = clientToLogical(event.clientX, event.clientY);
    if (!pos) {
      return;
    }

    currentX = pos.x;
    currentY = pos.y;
    scheduleDrawRuler();
  }

  function handlePointerUp(event) {
    if (!dragging || event.pointerId !== pointerId) {
      return;
    }

    const canvas = toValue(canvasRef);
    if (canvas?.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    dragging = false;
    pointerId = null;
    cancelPendingRaf();

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width < MIN_RULER_RECT_SIZE || height < MIN_RULER_RECT_SIZE) {
      clearCanvas();
      measureResult.value = null;
      return;
    }

    drawRulerFrame();

    const deltaTime = width / pixelsPerMs.value;
    const deltaVoltage = height / amplitudeScale.value;
    const heartRate = deltaTime > 0 ? Math.round(60000 / deltaTime) : null;

    measureResult.value = {
      deltaTimeMs: deltaTime,
      deltaVoltageMv: deltaVoltage,
      heartRate,
    };
  }

  function handlePointerCancel(event) {
    if (!dragging || event.pointerId !== pointerId) {
      return;
    }

    const canvas = toValue(canvasRef);
    if (canvas?.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    dragging = false;
    pointerId = null;
    cancelPendingRaf();
    clearCanvas();
    measureResult.value = null;
  }

  function clearRuler() {
    dragging = false;
    pointerId = null;
    cancelPendingRaf();
    clearCanvas();
    measureResult.value = null;
  }

  watch(enabled, (isEnabled) => {
    if (!isEnabled) {
      clearRuler();
    }
  });

  watch([speed, gain], () => {
    clearRuler();
  });

  watch(waveKey, () => {
    clearRuler();
  });

  onUnmounted(() => {
    cancelPendingRaf();
  });

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    measureResult,
  };
}
