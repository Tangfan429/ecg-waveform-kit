import { computed, reactive, ref, toValue, watch } from "vue";
import { getSpeedConfig } from "../../utils/waveformLayouts";

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatSecondsLabel(timeMs) {
  return `${(Math.max(0, Number(timeMs) || 0) / 1000).toFixed(1)}S`;
}

export function useRhythmNavigator(options = {}) {
  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const geometry = computed(() => toValue(options.geometry) || null);
  const speedValue = computed(() => toValue(options.speed) || "25");
  const zoomScale = computed(() => {
    const scale = Number(toValue(options.zoomScale));
    if (!Number.isFinite(scale)) {
      return 1;
    }

    return Math.max(0.01, scale);
  });
  const syncWindowStartMs = computed(() =>
    Number(toValue(options.syncWindowStartMs)) || 0,
  );
  const speedConfig = computed(() => getSpeedConfig(speedValue.value));
  const pixelsPerMs = computed(() => speedConfig.value.pixelsPerSecond / 1000);
  const previewWindowStartMs = ref(0);
  const rhythmNavigatorGeometry = computed(
    () =>
      geometry.value?.rhythmNavigator ||
      geometry.value?.leadRegions?.rhythmNavigator ||
      null,
  );

  const segmentedAxisAnchors = computed(() => {
    const leadRegions = geometry.value?.leadRegions;
    const navigatorGeometry = rhythmNavigatorGeometry.value;
    if (!leadRegions || !navigatorGeometry) {
      return [];
    }

    // Follow renderer-provided column anchors so all multi-column rhythm
    // layouts share the same navigator coordinate model.
    const rawAnchors = [
      ...(Array.isArray(leadRegions.startAnchorXs)
        ? leadRegions.startAnchorXs
        : []),
      leadRegions.waveEndX,
    ].filter((value) => Number.isFinite(value));

    if (rawAnchors.length >= 2) {
      return rawAnchors.filter(
        (value, index) =>
          index === 0 || Math.abs(value - rawAnchors[index - 1]) > 0.5,
      );
    }

    const fallbackTrackX =
      Number(navigatorGeometry.trackX) || leadRegions.waveStartX;
    const fallbackTrackWidth = Math.max(
      0,
      Number(navigatorGeometry.trackWidth) ||
        Math.max(0, leadRegions.waveEndX - leadRegions.waveStartX),
    );

    return [fallbackTrackX, fallbackTrackX + fallbackTrackWidth].filter(
      (value, index, anchors) =>
        Number.isFinite(value) &&
        (index === 0 || Math.abs(value - anchors[index - 1]) > 0.5),
    );
  });

  const useSegmentedAxis = computed(() => segmentedAxisAnchors.value.length > 2);

  const segmentedAxisWindowWidth = computed(() => {
    const anchors = segmentedAxisAnchors.value;
    if (anchors.length < 2) {
      return 0;
    }

    return Math.max(0, anchors[1] - anchors[0]);
  });

  const totalDurationMs = computed(() => {
    const leadRegions = geometry.value?.leadRegions;
    if (!leadRegions) {
      return 0;
    }

    return Math.max(
      0,
      (leadRegions.waveEndX - leadRegions.waveStartX) /
        Math.max(pixelsPerMs.value, 0.001),
    );
  });

  const visibleDurationMs = computed(() => {
    if (!totalDurationMs.value) {
      return 0;
    }

    if (useSegmentedAxis.value) {
      // Use one segment width as the visible window for every multi-column rhythm layout.
      return segmentedAxisWindowWidth.value / Math.max(pixelsPerMs.value, 0.001);
    }

    const leadRegions = geometry.value?.leadRegions;
    if (!leadRegions) {
      return 0;
    }

    return Math.max(
      0,
      leadRegions.columnWaveWidth / Math.max(pixelsPerMs.value, 0.001),
    );
  });

  const maxWindowStartMs = computed(() =>
    Math.max(0, totalDurationMs.value - visibleDurationMs.value),
  );

  const clampWindowStartMs = (value) =>
    clampValue(Number(value) || 0, 0, maxWindowStartMs.value);

  const committedWindowStartMs = computed(() =>
    clampWindowStartMs(syncWindowStartMs.value),
  );

  const dragState = reactive({
    active: false,
    startClientX: 0,
    startWindowStartMs: 0,
    pointerId: null,
    pointerTarget: null,
  });

  const currentWindowStartMs = computed(() =>
    dragState.active ? previewWindowStartMs.value : committedWindowStartMs.value,
  );

  let emitFrameId = 0;
  let pendingWindowStartMs = 0;

  const navigatorModel = computed(() => {
    const leadRegions = geometry.value?.leadRegions;
    const navigatorGeometry = rhythmNavigatorGeometry.value;

    if (
      !enabled.value ||
      !leadRegions ||
      !navigatorGeometry ||
      visibleDurationMs.value <= 0
    ) {
      return null;
    }

    const trackX = Number(navigatorGeometry.trackX) || leadRegions.waveStartX;
    const trackWidth = Math.max(
      0,
      Number(navigatorGeometry.trackWidth) ||
        Math.max(0, leadRegions.waveEndX - leadRegions.waveStartX),
    );
    const segmentAnchors = segmentedAxisAnchors.value;
    const windowWidth = useSegmentedAxis.value
      ? segmentedAxisWindowWidth.value
      : Math.max(
          0,
          Number(navigatorGeometry.windowWidth) || leadRegions.columnWaveWidth,
        );
    const startX = trackX + currentWindowStartMs.value * pixelsPerMs.value;
    const endX = startX + windowWidth;
    const barY = Number(navigatorGeometry.barTop) || 0;
    const barHeight = Math.max(20, Number(navigatorGeometry.barHeight) || 0);
    const railY = Number(navigatorGeometry.axisY) || 0;
    const labelY = Number(navigatorGeometry.labelY) || railY + 10;

    // Keep all segmented axis geometry derived from the same equal-quarter anchors.
    const axisSegments = useSegmentedAxis.value
      ? segmentAnchors.slice(0, -1).map((anchorX, index) => ({
          key: `axis-segment-${index}`,
          x: anchorX,
          width: Math.max(0, segmentAnchors[index + 1] - anchorX),
        }))
      : [
          {
            key: "axis-track",
            x: trackX,
            width: trackWidth,
          },
        ];

    const axisTicks = useSegmentedAxis.value
      ? segmentAnchors.slice(0, -1).map((anchorX, index) => ({
          key: `axis-tick-${index}`,
          x: anchorX,
        }))
      : [];

    // All four segmented labels show the same sync-window start time.
    const axisLabels = useSegmentedAxis.value
      ? segmentAnchors.slice(0, -1).map((anchorX, index) => ({
          key: `axis-label-${index}`,
          x: anchorX,
          y: labelY,
          text: formatSecondsLabel(currentWindowStartMs.value),
          align: "left",
        }))
      : [
          {
            key: "axis-label-start",
            x: startX,
            y: labelY,
            text: formatSecondsLabel(currentWindowStartMs.value),
            align: "center",
          },
          {
            key: "axis-label-end",
            x: endX,
            y: labelY,
            text: formatSecondsLabel(
              currentWindowStartMs.value + visibleDurationMs.value,
            ),
            align: "center",
          },
        ];

    return {
      trackX,
      trackWidth,
      startX,
      endX,
      windowWidth,
      barY,
      barHeight,
      railY,
      labelY,
      useSegmentedAxis: useSegmentedAxis.value,
      axisSegments,
      axisTicks,
      axisLabels,
      dragTargetHeight: Math.max(
        32,
        Number(navigatorGeometry.dragTargetHeight) ||
          Math.round(labelY - barY + 24),
      ),
    };
  });

  function syncPreviewWithCommitted() {
    previewWindowStartMs.value = committedWindowStartMs.value;
    pendingWindowStartMs = committedWindowStartMs.value;
  }

  function cancelScheduledEmit() {
    if (emitFrameId && typeof window !== "undefined") {
      window.cancelAnimationFrame(emitFrameId);
      emitFrameId = 0;
    }
  }

  function emitWindowChange(nextWindowStartMs) {
    if (typeof options.onChange === "function") {
      options.onChange(clampWindowStartMs(nextWindowStartMs));
    }
  }

  function flushScheduledEmit() {
    if (!emitFrameId) {
      return;
    }

    cancelScheduledEmit();
    emitWindowChange(pendingWindowStartMs);
  }

  function scheduleEmit(nextWindowStartMs) {
    pendingWindowStartMs = clampWindowStartMs(nextWindowStartMs);

    if (
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      emitWindowChange(pendingWindowStartMs);
      return;
    }

    if (emitFrameId) {
      return;
    }

    emitFrameId = window.requestAnimationFrame(() => {
      emitFrameId = 0;
      emitWindowChange(pendingWindowStartMs);
    });
  }

  function stopDragging() {
    if (
      dragState.pointerTarget &&
      dragState.pointerId !== null &&
      typeof dragState.pointerTarget.releasePointerCapture === "function"
    ) {
      dragState.pointerTarget.releasePointerCapture(dragState.pointerId);
    }

    dragState.active = false;
    dragState.startClientX = 0;
    dragState.startWindowStartMs = 0;
    dragState.pointerId = null;
    dragState.pointerTarget = null;
  }

  function handleNavigatorPointerDown(event) {
    if (!enabled.value || !navigatorModel.value) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragState.active = true;
    dragState.startClientX = event.clientX;
    dragState.startWindowStartMs = committedWindowStartMs.value;
    dragState.pointerId = event.pointerId;
    dragState.pointerTarget = event.currentTarget;
    previewWindowStartMs.value = committedWindowStartMs.value;
    pendingWindowStartMs = committedWindowStartMs.value;

    if (typeof event.currentTarget?.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handleNavigatorPointerMove(event) {
    if (
      !dragState.active ||
      !enabled.value ||
      !navigatorModel.value ||
      event.pointerId !== dragState.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const deltaMs =
      (event.clientX - dragState.startClientX) /
      Math.max(pixelsPerMs.value * zoomScale.value, 0.001);
    const nextWindowStartMs = clampWindowStartMs(
      dragState.startWindowStartMs + deltaMs,
    );

    previewWindowStartMs.value = nextWindowStartMs;
    scheduleEmit(nextWindowStartMs);
  }

  function handleNavigatorPointerUp(event) {
    if (!dragState.active || event.pointerId !== dragState.pointerId) {
      return;
    }

    flushScheduledEmit();
    stopDragging();
  }

  function handleNavigatorPointerCancel(event) {
    if (!dragState.active || event.pointerId !== dragState.pointerId) {
      return;
    }

    cancelScheduledEmit();
    stopDragging();
    syncPreviewWithCommitted();
  }

  watch(
    committedWindowStartMs,
    () => {
      if (!dragState.active) {
        syncPreviewWithCommitted();
      }
    },
    { immediate: true },
  );

  watch(
    () => enabled.value,
    (isEnabled) => {
      if (!isEnabled) {
        cancelScheduledEmit();
        stopDragging();
        syncPreviewWithCommitted();
      }
    },
  );

  return {
    navigatorModel,
    handleNavigatorPointerDown,
    handleNavigatorPointerMove,
    handleNavigatorPointerUp,
    handleNavigatorPointerCancel,
  };
}

export default useRhythmNavigator;