import { computed, onUnmounted, ref, toValue, watch } from "vue";
import { getPixelsPerMv, getSpeedConfig } from "../../utils/waveformLayouts";

/**
 * 电子尺最小有效拖拽尺寸（逻辑像素），
 * 低于该阈值视为误触，不绘制测量框。
 */
const MIN_RULER_RECT_SIZE = 6;

/** 电子尺矩形样式常量 */
const RULER_STROKE_COLOR = "#3562EC";
const RULER_FILL_COLOR = "rgba(53, 98, 236, 0.04)";
const RULER_LINE_WIDTH = 2;
const RULER_DASH_PATTERN = [8, 6];

/** 测量标签样式常量 */
const LABEL_FONT = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
const LABEL_COLOR = "#3562EC";
const LABEL_OFFSET_BOTTOM = 28;
const LABEL_OFFSET_TOP = 12;
const LABEL_HORIZONTAL_PADDING = 120;

function findLeadRegionAtY(y, leadRegions) {
  if (!leadRegions) {
    return null;
  }

  const allRegions = [...(leadRegions.main || []), ...(leadRegions.rhythm || [])];

  for (const region of allRegions) {
    const regionTop = region.y ?? 0;
    const regionBottom = regionTop + (region.height ?? 0);

    if (y >= regionTop && y <= regionBottom) {
      return region;
    }
  }

  return null;
}

/**
 * 标准波形电子尺 composable。
 * 拖拽过程只操作 Canvas，不触发 Vue 响应式更新；
 * 松手后才把最终测量结果同步到 ref。
 */
export function useWaveformRuler(options = {}) {
  const { canvasRef } = options;

  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const speed = computed(() => toValue(options.speed) || "25");
  const gain = computed(() => toValue(options.gain) || "10");
  const geometry = computed(() => toValue(options.geometry) || null);
  const zoomScale = computed(() => {
    const raw = Number(toValue(options.zoomScale));
    return Number.isFinite(raw) ? Math.max(0.01, raw) : 1;
  });
  const dpr = computed(() => {
    const raw = Number(toValue(options.dpr));

    if (Number.isFinite(raw) && raw > 0) {
      return raw;
    }

    if (typeof window === "undefined") {
      return 1;
    }

    return window.devicePixelRatio || 1;
  });

  const pixelsPerMs = computed(
    () => getSpeedConfig(speed.value).pixelsPerSecond / 1000,
  );
  const gridBounds = computed(() => geometry.value?.gridBounds || null);

  let dragging = false;
  let pointerId = null;
  let cachedRect = null;
  let lockedLeadRegion = null;
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

    const bounds = gridBounds.value;
    if (!bounds) {
      return null;
    }

    const visualX = clientX - cachedRect.left;
    const visualY = clientY - cachedRect.top;
    const rawX = visualX / zoomScale.value;
    const rawY = visualY / zoomScale.value;

    return {
      rawX,
      rawY,
      x: Math.min(bounds.endX, Math.max(bounds.startX, rawX)),
      y: Math.min(bounds.endY, Math.max(bounds.startY, rawY)),
    };
  }

  function isInsideGridBounds(rawX, rawY) {
    const bounds = gridBounds.value;
    if (!bounds) {
      return false;
    }

    return (
      rawX >= bounds.startX &&
      rawX <= bounds.endX &&
      rawY >= bounds.startY &&
      rawY <= bounds.endY
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

    return { ctx, dpr: dpr.value };
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

    const canvas = toValue(canvasRef);
    result.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawRulerFrame() {
    const result = getCanvasContext();
    if (!result) {
      return;
    }

    const { ctx, dpr: currentDpr } = result;
    const canvas = toValue(canvasRef);
    const bounds = gridBounds.value;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!bounds) {
      return;
    }

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width < MIN_RULER_RECT_SIZE || height < MIN_RULER_RECT_SIZE) {
      return;
    }

    ctx.save();
    ctx.scale(currentDpr, currentDpr);

    ctx.fillStyle = RULER_FILL_COLOR;
    ctx.fillRect(left, top, width, height);

    ctx.strokeStyle = RULER_STROKE_COLOR;
    ctx.lineWidth = RULER_LINE_WIDTH;
    ctx.setLineDash(RULER_DASH_PATTERN);
    ctx.strokeRect(left, top, width, height);
    ctx.setLineDash([]);

    const deltaTime = width / pixelsPerMs.value;
    const leadName = lockedLeadRegion?.leadName || "I";
    const amplitudeScale = getPixelsPerMv(gain.value, leadName);
    const deltaVoltage = height / amplitudeScale;
    const heartRate = deltaTime > 0 ? Math.round(60000 / deltaTime) : null;
    const labelText = [
      `${Math.round(deltaTime)}ms`,
      `${deltaVoltage.toFixed(3)}mV`,
      heartRate === null ? "--bpm" : `${heartRate}bpm`,
    ].join("  ");

    const preferredY = top + height + LABEL_OFFSET_BOTTOM;
    const fallbackY = top - LABEL_OFFSET_TOP;
    const labelY = preferredY <= bounds.endY - 8 ? preferredY : fallbackY;
    const labelX = Math.max(
      bounds.startX + LABEL_HORIZONTAL_PADDING,
      Math.min(bounds.endX - LABEL_HORIZONTAL_PADDING, left + width / 2),
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
    if (!enabled.value || !gridBounds.value) {
      return;
    }

    const canvas = toValue(canvasRef);
    if (!canvas) {
      return;
    }

    cachedRect = canvas.getBoundingClientRect();
    lockedLeadRegion = null;

    const pos = clientToLogical(event.clientX, event.clientY);
    if (!pos || !isInsideGridBounds(pos.rawX, pos.rawY)) {
      return;
    }

    lockedLeadRegion =
      findLeadRegionAtY(pos.rawY, geometry.value?.leadRegions) || null;

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
    const leadName = lockedLeadRegion?.leadName || "I";
    const amplitudeScale = getPixelsPerMv(gain.value, leadName);
    const deltaVoltage = height / amplitudeScale;
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
    lockedLeadRegion = null;
    cancelPendingRaf();
    clearCanvas();
    measureResult.value = null;
  }

  watch(enabled, (isEnabled) => {
    if (!isEnabled) {
      clearRuler();
    }
  });

  watch([speed, gain, dpr], () => {
    clearRuler();
  });

  watch(
    () => geometry.value?.renderToken,
    () => {
      clearRuler();
    },
  );

  onUnmounted(() => {
    cancelPendingRaf();
  });

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    clearRuler,
    measureResult,
  };
}
