import { computed, ref } from "vue";
import { useFullscreen } from "@vueuse/core";

const DEFAULT_ZOOM_PERCENT = 100;
const MIN_ZOOM_PERCENT = 50;
const MAX_ZOOM_PERCENT = 200;
const ZOOM_STEP_PERCENT = 10;

function normalizeZoomPercent(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_ZOOM_PERCENT;
  }

  return Math.min(
    MAX_ZOOM_PERCENT,
    Math.max(MIN_ZOOM_PERCENT, Math.round(numericValue)),
  );
}

export function useWaveformViewport(targetRef) {
  const zoomPercent = ref(DEFAULT_ZOOM_PERCENT);
  const { isFullscreen, toggle } = useFullscreen(targetRef);

  const zoomScale = computed(() => zoomPercent.value / 100);

  const setZoom = (value) => {
    zoomPercent.value = normalizeZoomPercent(value);
  };

  const zoomIn = () => {
    setZoom(zoomPercent.value + ZOOM_STEP_PERCENT);
  };

  const zoomOut = () => {
    setZoom(zoomPercent.value - ZOOM_STEP_PERCENT);
  };

  const resetZoom = () => {
    setZoom(DEFAULT_ZOOM_PERCENT);
  };

  return {
    zoomPercent,
    zoomScale,
    isFullscreen,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen: toggle,
  };
}

export default useWaveformViewport;
