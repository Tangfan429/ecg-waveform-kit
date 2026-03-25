import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  toValue,
  watch,
} from "vue";
import { getSpeedConfig } from "../../utils/waveformLayouts";

const DEFAULT_INTERVAL_MS = 860;
const DEFAULT_PHASE_MS = 0;
const MIN_INTERVAL_MS = 120;
const MIN_HANDLE_GAP_PX = 24;
const PREFERRED_CONTROL_PAIR_INDEX = 7;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value) {
  return Math.max(1, Math.round(Number(value) || 0));
}

function getPreferredControlStartStep(steps) {
  if (steps.length < 2) return null;
  if (steps.length > PREFERRED_CONTROL_PAIR_INDEX + 1) {
    return steps[PREFERRED_CONTROL_PAIR_INDEX];
  }

  const middleIndex = Math.max(0, Math.floor((steps.length - 2) / 2));
  return steps[middleIndex];
}

export function useParallelRuler(options = {}) {
  const overlayRef = options.overlayRef;
  const geometry = computed(() => toValue(options.geometry) || null);
  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const speedValue = computed(() => toValue(options.speed) || "25");
  const zoomScale = computed(() => {
    const numericScale = Number(toValue(options.zoomScale));

    if (!Number.isFinite(numericScale)) {
      return 1;
    }

    return Math.max(0.01, numericScale);
  });
  const speedConfig = computed(() => getSpeedConfig(speedValue.value));
  const pixelsPerMs = computed(() => speedConfig.value.pixelsPerSecond / 1000);

  const intervalMs = ref(DEFAULT_INTERVAL_MS);
  const phaseMs = ref(DEFAULT_PHASE_MS);
  const controlStartStep = ref(null);

  const dragState = reactive({
    mode: "",
    startClientX: 0,
    startPhaseMs: 0,
    fixedTimeMs: 0,
    fixedStep: 0,
  });

  const lineBounds = computed(() => {
    const gridBounds = geometry.value?.gridBounds;
    const leadRegions = geometry.value?.leadRegions;
    if (!gridBounds || !leadRegions) return null;

    const waveStartX = leadRegions.waveStartX ?? 0;
    const waveEndX = leadRegions.waveEndX ?? waveStartX;
    const safePixelsPerMs = Math.max(pixelsPerMs.value, 0.001);

    return {
      waveStartX,
      waveEndX,
      top: gridBounds.startY,
      bottom: gridBounds.endY,
      height: Math.max(0, gridBounds.endY - gridBounds.startY),
      durationMs: Math.max(0, (waveEndX - waveStartX) / safePixelsPerMs),
    };
  });

  const controlY = computed(() => {
    const bounds = lineBounds.value;
    if (!bounds) return 0;

    const mainRegions = geometry.value?.leadRegions?.main || [];
    if (!mainRegions.length) {
      return bounds.top + Math.min(140, bounds.height * 0.22);
    }

    const rowIndexes = [
      ...new Set(mainRegions.map((region) => region.rowIndex)),
    ]
      .filter((rowIndex) => Number.isInteger(rowIndex))
      .sort((left, right) => left - right);
    const targetRowIndex = rowIndexes[1] ?? rowIndexes[0];
    const targetRegion =
      mainRegions.find(
        (region) =>
          region.rowIndex === targetRowIndex && (region.colIndex ?? 0) === 0,
      ) ||
      mainRegions.find((region) => region.rowIndex === targetRowIndex) ||
      mainRegions[0];

    return clamp(targetRegion.centerY, bounds.top + 36, bounds.bottom - 64);
  });

  function getOverlayElement() {
    return overlayRef?.value || null;
  }

  function getLocalPoint(event) {
    const overlayElement = getOverlayElement();
    if (!overlayElement) return null;

    const rect = overlayElement.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / zoomScale.value,
      y: (event.clientY - rect.top) / zoomScale.value,
    };
  }

  function getIntervalBoundsMs() {
    const bounds = lineBounds.value;
    const safePixelsPerMs = Math.max(pixelsPerMs.value, 0.001);
    const minIntervalMs = Math.max(
      MIN_INTERVAL_MS,
      MIN_HANDLE_GAP_PX / (safePixelsPerMs * zoomScale.value),
    );
    const maxIntervalMs = Math.max(
      minIntervalMs,
      bounds?.durationMs || DEFAULT_INTERVAL_MS,
    );

    return {
      minIntervalMs,
      maxIntervalMs,
    };
  }

  function timeToX(timeMs) {
    if (!lineBounds.value) return 0;
    return lineBounds.value.waveStartX + timeMs * pixelsPerMs.value;
  }

  function xToTime(localX) {
    if (!lineBounds.value) return 0;

    return clamp(
      (localX - lineBounds.value.waveStartX) /
        Math.max(pixelsPerMs.value, 0.001),
      0,
      lineBounds.value.durationMs,
    );
  }

  const lineItems = computed(() => {
    const bounds = lineBounds.value;
    if (!enabled.value || !bounds || intervalMs.value <= 0) {
      return [];
    }

    const startStep = Math.ceil((0 - phaseMs.value) / intervalMs.value);
    const endStep = Math.floor(
      (bounds.durationMs - phaseMs.value) / intervalMs.value,
    );
    const items = [];

    for (let step = startStep; step <= endStep; step += 1) {
      const timeMs = phaseMs.value + step * intervalMs.value;
      items.push({
        key: `${step}-${Math.round(timeMs * 1000)}`,
        step,
        timeMs,
        x: timeToX(timeMs),
        top: bounds.top,
        height: bounds.height,
      });
    }

    return items;
  });

  const resolvedControlStartStep = computed(() => {
    if (!enabled.value || intervalMs.value <= 0) return null;

    if (Number.isInteger(controlStartStep.value)) {
      return controlStartStep.value;
    }

    return getPreferredControlStartStep(
      lineItems.value.map((item) => item.step),
    );
  });

  const controlModel = computed(() => {
    const bounds = lineBounds.value;
    const startStep = resolvedControlStartStep.value;
    if (!enabled.value || !bounds || !Number.isInteger(startStep)) {
      return null;
    }

    const leftTimeMs = phaseMs.value + startStep * intervalMs.value;
    const rightTimeMs = leftTimeMs + intervalMs.value;
    const leftX = timeToX(leftTimeMs);
    const rightX = timeToX(rightTimeMs);
    const width = rightX - leftX;
    if (!Number.isFinite(width) || width <= 0) {
      return null;
    }

    return {
      leftStep: startStep,
      rightStep: startStep + 1,
      leftTimeMs,
      rightTimeMs,
      leftX,
      rightX,
      midX: leftX + width / 2,
      width,
      railY: controlY.value,
      translateHandleY: controlY.value - 38,
      labelY: controlY.value + 18,
      intervalLabel: `${roundMetric(intervalMs.value)}ms`,
      bpmLabel: `${roundMetric(60000 / intervalMs.value)}bpm`,
      bpm: roundMetric(60000 / intervalMs.value),
    };
  });

  function stopDragging() {
    dragState.mode = "";
    dragState.startClientX = 0;
    dragState.startPhaseMs = 0;
    dragState.fixedTimeMs = 0;
    dragState.fixedStep = 0;
  }

  function clearRulers() {
    intervalMs.value = DEFAULT_INTERVAL_MS;
    phaseMs.value = DEFAULT_PHASE_MS;
    controlStartStep.value = null;
    stopDragging();
  }

  // 保留旧的暴露 API，避免父组件在重构过程中出现空引用。
  function removeSelectedRuler() {}

  function handleTranslateHandlePointerDown(event) {
    if (!enabled.value || !controlModel.value) return;

    event.preventDefault();
    event.stopPropagation();

    controlStartStep.value = controlModel.value.leftStep;
    dragState.mode = "move-group";
    dragState.startClientX = event.clientX;
    dragState.startPhaseMs = phaseMs.value;
  }

  function handleLeftHandlePointerDown(event) {
    if (!enabled.value || !controlModel.value) return;

    event.preventDefault();
    event.stopPropagation();

    controlStartStep.value = controlModel.value.leftStep;
    dragState.mode = "resize-left";
    dragState.fixedTimeMs = controlModel.value.rightTimeMs;
    dragState.fixedStep = controlModel.value.rightStep;
  }

  function handleRightHandlePointerDown(event) {
    if (!enabled.value || !controlModel.value) return;

    event.preventDefault();
    event.stopPropagation();

    controlStartStep.value = controlModel.value.leftStep;
    dragState.mode = "resize-right";
    dragState.fixedTimeMs = controlModel.value.leftTimeMs;
    dragState.fixedStep = controlModel.value.leftStep;
  }

  function handleWindowPointerMove(event) {
    if (!dragState.mode || !enabled.value || !lineBounds.value) return;

    if (dragState.mode === "move-group") {
      phaseMs.value =
        dragState.startPhaseMs +
        (event.clientX - dragState.startClientX) /
          Math.max(pixelsPerMs.value * zoomScale.value, 0.001);
      return;
    }

    const point = getLocalPoint(event);
    if (!point) return;

    const targetTimeMs = xToTime(point.x);
    const { minIntervalMs, maxIntervalMs } = getIntervalBoundsMs();

    if (dragState.mode === "resize-left") {
      intervalMs.value = clamp(
        dragState.fixedTimeMs - targetTimeMs,
        minIntervalMs,
        maxIntervalMs,
      );
      phaseMs.value =
        dragState.fixedTimeMs - dragState.fixedStep * intervalMs.value;
      return;
    }

    if (dragState.mode === "resize-right") {
      intervalMs.value = clamp(
        targetTimeMs - dragState.fixedTimeMs,
        minIntervalMs,
        maxIntervalMs,
      );
      phaseMs.value =
        dragState.fixedTimeMs - dragState.fixedStep * intervalMs.value;
    }
  }

  function handleWindowPointerUp() {
    stopDragging();
  }

  watch(
    () => enabled.value,
    (isEnabled) => {
      if (!isEnabled) {
        clearRulers();
      }
    },
    { immediate: true },
  );

  onMounted(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  });

  onUnmounted(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
  });

  return {
    clearRulers,
    controlModel,
    handleLeftHandlePointerDown,
    handleRightHandlePointerDown,
    handleTranslateHandlePointerDown,
    lineItems,
    removeSelectedRuler,
  };
}

export default useParallelRuler;
