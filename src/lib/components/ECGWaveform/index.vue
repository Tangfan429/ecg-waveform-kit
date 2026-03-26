<template>
  <div
    ref="scrollRef"
    class="ecg-waveform-scroll"
    :class="{ 'ecg-waveform-scroll--compact': isCompactLayout }"
    :style="waveformViewportStyle"
    @contextmenu.prevent="handleContextMenu"
    @scroll.passive="handleContextMenuClose"
  >
    <div
      class="ecg-waveform-shell"
      :class="{ 'ecg-waveform-shell--compact': isCompactLayout }"
    >
      <div class="ecg-waveform-stage" :style="waveformStageStyle">
        <div
          ref="containerRef"
          class="ecg-waveform"
          :class="{ 'ecg-waveform--compact': isCompactLayout }"
          :style="canvasContainerStyle"
        >
          <!-- Keep interaction layers outside the canvas renderer. -->
          <WaveformRhythmNavigatorOverlay
            :visible="isRhythmNavigatorVisible"
            :geometry="waveformGeometry"
            :layout="layout"
            :speed="speed"
            :zoom-scale="zoomScale"
            :rhythm-lead-name="rhythmLeadName"
            :sync-window-start-ms="syncWindowStartMs"
            :appearance-settings="appearanceSettings"
            @sync-window-change="handleSyncWindowChange"
          />

          <WaveformParallelRulerOverlay
            ref="parallelRulerOverlayRef"
            :visible="parallelRulerActive"
            :geometry="waveformGeometry"
            :speed="speed"
            :zoom-scale="zoomScale"
            :appearance-settings="appearanceSettings"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import {
  ECGCanvasRenderer,
  getRequiredWaveformHeight,
  getRequiredWaveformWidth,
} from "../../utils/ecgCanvasRenderer";
import { generateAllLeadsWaveform } from "../../utils/mockWaveformData";
import { getLayoutConfig } from "../../utils/waveformLayouts";
import WaveformParallelRulerOverlay from "./WaveformParallelRulerOverlay.vue";
import WaveformRhythmNavigatorOverlay from "./WaveformRhythmNavigatorOverlay.vue";

defineOptions({
  name: "ECGWaveform",
});

// This component only renders the waveform and exposes geometry data.
const props = defineProps({
  waveformData: {
    type: Object,
    default: null,
  },
  metricRows: {
    type: Object,
    default: null,
  },
  layout: {
    type: String,
    default: "6x2+1R",
  },
  gain: {
    type: String,
    default: "10",
  },
  speed: {
    type: String,
    default: "25",
  },
  displayMode: {
    type: String,
    default: "sync",
  },
  duration: {
    type: Number,
    default: 10,
  },
  sampleRate: {
    type: Number,
    default: 500,
  },
  showRhythmLead: {
    type: Boolean,
    default: true,
  },
  rhythmLeadName: {
    type: String,
    default: "II",
  },
  appearanceSettings: {
    type: Object,
    default: null,
  },
  parallelRulerActive: {
    type: Boolean,
    default: false,
  },
  zoom: {
    type: Number,
    default: 100,
  },
  syncWindowStartMs: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  "rendered",
  "error",
  "context-menu",
  "context-menu-close",
  "sync-window-change",
]);

const scrollRef = ref(null);
const containerRef = ref(null);
const parallelRulerOverlayRef = useTemplateRef("parallelRulerOverlayRef");
const canvasWidth = ref(0);
const canvasHeight = ref(0);
const currentWaveformData = ref(null);

// Cache renderer geometry so overlays can update after parameter changes.
const waveformGeometry = ref(null);
const renderVersion = ref(0);
let renderer = null;
let resizeObserver = null;
let syncWindowRenderFrameId = 0;
let pendingSyncWindowStartMs = 0;

// Keep waveform padding close to the average-template layout.
const WAVEFORM_CANVAS_PADDING = Object.freeze({
  top: 10,
  right: 16,
  bottom: 25,
  left: 10,
});

const zoomScale = computed(() => {
  const numericZoom = Number(props.zoom);
  if (!Number.isFinite(numericZoom)) {
    return 1;
  }

  return Math.min(2, Math.max(0.5, numericZoom / 100));
});
const layoutConfig = computed(() => getLayoutConfig(props.layout));
const isCompactLayout = computed(() => {
  const { columns = 1, rows = 1, rhythmLeads = [] } = layoutConfig.value || {};
  return columns === 1 && rows === 1 && !rhythmLeads.length;
});

const waveformViewportStyle = computed(() => ({
  backgroundColor: props.appearanceSettings?.backgroundColor || "#FFFFFF",
}));

// The stage only reserves the scrollable area; renderer owns paper coordinates.
const waveformStageStyle = computed(() => ({
  width: `${canvasWidth.value * zoomScale.value}px`,
  height: `${canvasHeight.value * zoomScale.value}px`,
}));

const canvasContainerStyle = computed(() => ({
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
  backgroundColor: props.appearanceSettings?.backgroundColor || "#FFFFFF",
  transform: `scale(${zoomScale.value})`,
  transformOrigin: "top left",
}));
const isRhythmNavigatorVisible = computed(() => props.displayMode === "sync");

// Derive a single renderer config from props to keep rendering consistent.
const getRendererConfig = () => ({
  metricRows: props.metricRows,
  layoutType: props.layout,
  gainValue: props.gain,
  speedValue: props.speed,
  displayMode: props.displayMode,
  duration: props.duration,
  sampleRate: props.sampleRate,
  showRhythmLead: props.showRhythmLead,
  rhythmLeadName: props.rhythmLeadName,
  syncWindowStartMs: props.syncWindowStartMs,
  useRhythmNavigator: isRhythmNavigatorVisible.value && props.showRhythmLead,
  padding: WAVEFORM_CANVAS_PADDING,
  ...(props.appearanceSettings || {}),
});

const createWaveformData = () =>
  props.waveformData ||
  generateAllLeadsWaveform(Math.max(props.duration, 20), props.sampleRate);

const updateCanvasSize = (waveformData = currentWaveformData.value) => {
  const viewportHeight = scrollRef.value?.clientHeight || 0;
  const rendererConfig = {
    ...getRendererConfig(),
    waveformData,
  };
  const requiredCanvasHeight = getRequiredWaveformHeight(rendererConfig);
  const minimumCanvasHeight = isCompactLayout.value ? 240 : viewportHeight;

  canvasWidth.value = getRequiredWaveformWidth(rendererConfig);
  canvasHeight.value = Math.max(minimumCanvasHeight, requiredCanvasHeight);
};

const syncWaveformGeometry = () => {
  if (!renderer) {
    waveformGeometry.value = null;
    return;
  }

  renderVersion.value += 1;
  waveformGeometry.value = {
    gridBounds: renderer.getGridBounds(),
    leadRegions: renderer.getLeadRegions(),
    rhythmNavigator: renderer.getRhythmNavigatorGeometry(),
    smallGridSize: renderer.config?.smallGridSize || 5,
    renderToken: renderVersion.value,
  };
};

const renderWaveforms = (waveformData, { syncGeometry = true } = {}) => {
  if (!renderer || !waveformData) return;

  try {
    renderer.syncSize?.();
    renderer.renderWaveforms(waveformData);
    if (syncGeometry) {
      syncWaveformGeometry();
    }
    emit("rendered", { success: true });
  } catch (error) {
    emit("error", error);
  }
};

// Emit only the base context-menu coordinates; the page owns the menu state.
const handleContextMenu = (event) => {
  const scrollElement = scrollRef.value;
  if (!scrollElement) return;

  const rect = scrollElement.getBoundingClientRect();
  const safeZoomScale = Math.max(zoomScale.value, 0.01);

  emit("context-menu", {
    clientX: event.clientX,
    clientY: event.clientY,
    localX:
      (event.clientX - rect.left + scrollElement.scrollLeft) / safeZoomScale,
    localY:
      (event.clientY - rect.top + scrollElement.scrollTop) / safeZoomScale,
  });
};

const handleContextMenuClose = () => {
  emit("context-menu-close");
};

const handleSyncWindowChange = (value) => {
  emit("sync-window-change", value);
};

const cancelSyncWindowRender = () => {
  if (
    typeof window !== "undefined" &&
    syncWindowRenderFrameId &&
    typeof window.cancelAnimationFrame === "function"
  ) {
    window.cancelAnimationFrame(syncWindowRenderFrameId);
  }

  syncWindowRenderFrameId = 0;
};

const scheduleSyncWindowRender = () => {
  if (!renderer || !currentWaveformData.value) return;

  pendingSyncWindowStartMs = props.syncWindowStartMs;

  const runRender = () => {
    syncWindowRenderFrameId = 0;

    if (!renderer || !currentWaveformData.value) return;

    try {
      renderer.setConfig({ syncWindowStartMs: pendingSyncWindowStartMs });
      if (typeof renderer.renderDynamicWaveforms === "function") {
        renderer.renderDynamicWaveforms(currentWaveformData.value);
        emit("rendered", { success: true });
        return;
      }

      renderWaveforms(currentWaveformData.value, { syncGeometry: false });
    } catch (error) {
      emit("error", error);
    }
  };

  if (syncWindowRenderFrameId) {
    return;
  }

  if (
    typeof window === "undefined" ||
    typeof window.requestAnimationFrame !== "function"
  ) {
    runRender();
    return;
  }

  syncWindowRenderFrameId = window.requestAnimationFrame(runRender);
};

// Route every re-render through one path so size, config, and data stay in sync.
const syncWaveforms = ({ regenerate = false } = {}) => {
  cancelSyncWindowRender();

  const waveformData = regenerate
    ? createWaveformData()
    : props.waveformData || currentWaveformData.value || createWaveformData();

  currentWaveformData.value = waveformData;
  updateCanvasSize(waveformData);

  nextTick(() => {
    if (!renderer) return;

    renderer.setConfig(getRendererConfig());
    renderWaveforms(waveformData);
  });
};

const initRenderer = async () => {
  const waveformData = createWaveformData();
  currentWaveformData.value = waveformData;
  updateCanvasSize(waveformData);
  await nextTick();

  if (!containerRef.value) return;

  renderer = new ECGCanvasRenderer(getRendererConfig());
  renderer.initialize(containerRef.value);
  renderWaveforms(waveformData);
};

const setupResizeObserver = () => {
  if (!scrollRef.value || typeof ResizeObserver === "undefined") return;

  resizeObserver = new ResizeObserver(() => {
    syncWaveforms();
  });

  resizeObserver.observe(scrollRef.value);
};

watch(
  () => props.waveformData,
  (waveformData) => {
    if (waveformData) {
      currentWaveformData.value = waveformData;
      syncWaveforms();
      return;
    }

    syncWaveforms({ regenerate: true });
  },
  { deep: true },
);

watch(
  () => props.metricRows,
  () => {
    if (!renderer) return;

    updateCanvasSize(currentWaveformData.value);
    nextTick(() => {
      renderer.setConfig({ metricRows: props.metricRows });
      renderWaveforms(currentWaveformData.value);
    });
  },
  { deep: true },
);

watch(
  () => props.appearanceSettings,
  () => {
    if (!renderer) return;

    nextTick(() => {
      renderer.setConfig(getRendererConfig());
      renderWaveforms(currentWaveformData.value);
    });
  },
  { deep: true },
);

watch(
  () => props.syncWindowStartMs,
  () => {
    if (!renderer) return;

    scheduleSyncWindowRender();
  },
);

watch(
  () => [
    props.layout,
    props.gain,
    props.speed,
    props.displayMode,
    props.duration,
    props.sampleRate,
    props.showRhythmLead,
    props.rhythmLeadName,
  ],
  () => {
    syncWaveforms({ regenerate: !props.waveformData });
  },
);

onMounted(() => {
  initRenderer();
  setupResizeObserver();
});

onUnmounted(() => {
  cancelSyncWindowRender();

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  if (renderer) {
    renderer.destroy();
    renderer = null;
  }

  waveformGeometry.value = null;
});

defineExpose({
  // Expose a local refresh hook for record switches and mode toggles.
  refresh() {
    renderer?.renderWaveforms(currentWaveformData.value);
    syncWaveformGeometry();
  },
  clearParallelRulers() {
    parallelRulerOverlayRef.value?.clearRulers();
  },
  setWaveformData(waveformData) {
    currentWaveformData.value = waveformData;
    updateCanvasSize(waveformData);
    renderWaveforms(waveformData);
  },
  getRenderer() {
    return renderer;
  },
  getGridBounds() {
    return renderer?.getGridBounds();
  },
  getLeadRegions() {
    return renderer?.getLeadRegions();
  },
});
</script>

<style lang="scss" scoped>
.ecg-waveform-scroll {
  width: 100%;
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(53, 98, 236, 0.35) transparent;

  &--compact {
    align-self: flex-start;
  }

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(53, 98, 236, 0.35);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.ecg-waveform-shell {
  display: flex;
  align-items: flex-start;
  min-width: 100%;
  min-height: 100%;

  &--compact {
    min-height: 0;
  }
}

.ecg-waveform {
  position: relative;
  min-height: 400px;
  flex: none;
  will-change: transform;

  &--compact {
    min-height: 240px;
  }
}

.ecg-waveform-stage {
  position: relative;
  flex: none;
  // Match the average-template layout so the paper starts from the left edge.
  margin-inline: 0;
}
</style>
