import { computed, onMounted, onUnmounted, reactive, ref, unref, watch } from "vue";

const BODY_MAP_BASE_WIDTH = 460;
const BODY_MAP_BASE_HEIGHT = 824;
const DEFAULT_MANUAL_ZOOM_PERCENT = 100;
const MIN_MANUAL_ZOOM_PERCENT = 60;
const MAX_MANUAL_ZOOM_PERCENT = 260;
const ZOOM_STEP_PERCENT = 10;

const clampValue = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const getCenteredOffset = (viewportSize, contentSize) =>
  Math.round((viewportSize - contentSize) / 2);

const clampOffset = (offset, viewportSize, contentSize) => {
  if (contentSize <= viewportSize) {
    return getCenteredOffset(viewportSize, contentSize);
  }

  const minOffset = viewportSize - contentSize;
  return clampValue(offset, minOffset, 0);
};

export const useBodyMapViewport = (options = {}) => {
  const viewportRef = options.viewportRef;
  const activeView = options.activeView;

  const viewportWidth = ref(BODY_MAP_BASE_WIDTH);
  const zoomMode = ref("fit");
  const manualZoomPercent = ref(DEFAULT_MANUAL_ZOOM_PERCENT);
  const panOffset = reactive({
    x: 0,
    y: 0,
  });

  let resizeObserver = null;

  const fitZoomPercent = computed(() => {
    const safeViewportWidth = Math.max(1, Number(viewportWidth.value) || 0);
    return Math.round((safeViewportWidth / BODY_MAP_BASE_WIDTH) * 100);
  });

  const zoomPercent = computed(() =>
    zoomMode.value === "fit"
      ? fitZoomPercent.value
      : clampValue(
          manualZoomPercent.value,
          MIN_MANUAL_ZOOM_PERCENT,
          MAX_MANUAL_ZOOM_PERCENT,
        ),
  );

  const scale = computed(() => zoomPercent.value / 100);
  // Default to fit-width so the full silhouette uses the available card width on entry.
  const viewportHeight = computed(() =>
    Math.round(BODY_MAP_BASE_HEIGHT * (fitZoomPercent.value / 100)),
  );
  const scaledWidth = computed(() => BODY_MAP_BASE_WIDTH * scale.value);
  const scaledHeight = computed(() => BODY_MAP_BASE_HEIGHT * scale.value);
  const canZoomOut = computed(() => zoomPercent.value > MIN_MANUAL_ZOOM_PERCENT);
  const canZoomIn = computed(() => zoomPercent.value < MAX_MANUAL_ZOOM_PERCENT);

  const updateViewportWidth = () => {
    viewportWidth.value = viewportRef?.value?.clientWidth || BODY_MAP_BASE_WIDTH;
  };

  const normalizePan = () => {
    panOffset.x = clampOffset(
      panOffset.x,
      viewportWidth.value,
      scaledWidth.value,
    );
    panOffset.y = clampOffset(
      panOffset.y,
      viewportHeight.value,
      scaledHeight.value,
    );
  };

  const resetPan = () => {
    panOffset.x = getCenteredOffset(viewportWidth.value, scaledWidth.value);
    panOffset.y = getCenteredOffset(viewportHeight.value, scaledHeight.value);
    normalizePan();
  };

  const zoomTo = (nextZoomPercent, { preserveViewportCenter = true } = {}) => {
    const resolvedZoomPercent = clampValue(
      Number(nextZoomPercent) || DEFAULT_MANUAL_ZOOM_PERCENT,
      MIN_MANUAL_ZOOM_PERCENT,
      MAX_MANUAL_ZOOM_PERCENT,
    );

    const previousScale = Math.max(scale.value, 0.001);
    const centerX = (-panOffset.x + viewportWidth.value / 2) / previousScale;
    const centerY = (-panOffset.y + viewportHeight.value / 2) / previousScale;

    zoomMode.value = "manual";
    manualZoomPercent.value = resolvedZoomPercent;

    if (!preserveViewportCenter) {
      resetPan();
      return;
    }

    const nextScale = resolvedZoomPercent / 100;
    panOffset.x = Math.round(viewportWidth.value / 2 - centerX * nextScale);
    panOffset.y = Math.round(viewportHeight.value / 2 - centerY * nextScale);
    normalizePan();
  };

  const activateFitZoom = () => {
    zoomMode.value = "fit";
    resetPan();
  };

  const resetToActualSize = () => {
    zoomTo(DEFAULT_MANUAL_ZOOM_PERCENT, {
      preserveViewportCenter: false,
    });
  };

  const zoomIn = () => {
    zoomTo(zoomPercent.value + ZOOM_STEP_PERCENT);
  };

  const zoomOut = () => {
    zoomTo(zoomPercent.value - ZOOM_STEP_PERCENT);
  };

  watch(
    [zoomPercent, viewportWidth],
    () => {
      normalizePan();
    },
    { immediate: true },
  );

  // Re-center after a view switch so the next silhouette does not inherit stale pan offsets.
  watch(
    () => unref(activeView),
    () => {
      resetPan();
    },
  );

  onMounted(() => {
    updateViewportWidth();

    if (!viewportRef?.value || typeof ResizeObserver === "undefined") {
      return;
    }

    resizeObserver = new ResizeObserver(() => {
      updateViewportWidth();
    });
    resizeObserver.observe(viewportRef.value);
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  return {
    BODY_MAP_BASE_HEIGHT,
    BODY_MAP_BASE_WIDTH,
    canZoomIn,
    canZoomOut,
    panOffset,
    resetPan,
    resetToActualSize,
    scale,
    viewportHeight,
    viewportWidth,
    zoomIn,
    zoomMode,
    zoomOut,
    zoomPercent,
    activateFitZoom,
  };
};

export default useBodyMapViewport;
