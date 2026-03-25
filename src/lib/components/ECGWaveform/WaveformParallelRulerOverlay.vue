<template>
  <div
    v-if="visible && geometry?.gridBounds"
    ref="overlayRef"
    class="parallel-ruler"
    :style="overlayStyle"
  >
    <div
      v-for="line in lineItems"
      :key="line.key"
      class="parallel-ruler__line"
      :style="buildLineStyle(line)"
    ></div>

    <template v-if="controlModel">
      <div
        class="parallel-ruler__bridge"
        :style="buildBridgeStyle(controlModel)"
      ></div>
      <div
        class="parallel-ruler__stem"
        :style="buildStemStyle(controlModel)"
      ></div>

      <button
        type="button"
        class="parallel-ruler__handle parallel-ruler__handle--translate"
        :style="buildTranslateHandleStyle(controlModel)"
        aria-label="平移平行尺"
        @pointerdown="handleTranslateHandlePointerDown"
      ></button>

      <button
        type="button"
        class="parallel-ruler__handle parallel-ruler__handle--resize"
        :style="buildResizeHandleStyle(controlModel.leftX, controlModel.railY)"
        aria-label="调整左侧间距"
        @pointerdown="handleLeftHandlePointerDown"
      ></button>

      <button
        type="button"
        class="parallel-ruler__handle parallel-ruler__handle--resize"
        :style="buildResizeHandleStyle(controlModel.rightX, controlModel.railY)"
        aria-label="调整右侧间距"
        @pointerdown="handleRightHandlePointerDown"
      ></button>

      <div
        class="parallel-ruler__metrics"
        :style="buildMetricsStyle(controlModel)"
      >
        <span>{{ controlModel.intervalLabel }}</span>
        <span>{{ controlModel.bpmLabel }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, useTemplateRef } from "vue";
import { useParallelRuler } from "./useParallelRuler";

defineOptions({
  name: "WaveformParallelRulerOverlay",
});

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  geometry: {
    type: Object,
    default: null,
  },
  speed: {
    type: String,
    default: "25",
  },
  zoomScale: {
    type: Number,
    default: 1,
  },
  appearanceSettings: {
    type: Object,
    default: null,
  },
});

const overlayRef = useTemplateRef("overlayRef");

const {
  clearRulers,
  controlModel,
  handleLeftHandlePointerDown,
  handleRightHandlePointerDown,
  handleTranslateHandlePointerDown,
  lineItems,
} = useParallelRuler({
  enabled: computed(() => props.visible),
  overlayRef,
  geometry: computed(() => props.geometry),
  speed: computed(() => props.speed),
  zoomScale: computed(() => props.zoomScale),
});

function hexToRgba(hexColor, alpha) {
  const normalizedColor = String(hexColor || "#2BA471").replace("#", "");
  if (normalizedColor.length !== 6) {
    return `rgba(43, 164, 113, ${alpha})`;
  }

  const red = Number.parseInt(normalizedColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const lineColor = computed(
  () =>
    props.appearanceSettings?.timeMarkerLineColor ||
    props.appearanceSettings?.calibrationColor ||
    "#3562EC",
);
const textColor = computed(
  () =>
    props.appearanceSettings?.timeMarkerTextColor ||
    props.appearanceSettings?.metricColor ||
    "#3562EC",
);

const overlayStyle = computed(() => ({
  "--parallel-ruler-line-color": lineColor.value,
  "--parallel-ruler-line-soft": hexToRgba(lineColor.value, 0.12),
  "--parallel-ruler-text-color": textColor.value,
  "--parallel-ruler-surface": "rgba(255,255,255,0.96)",
}));

function buildLineStyle(line) {
  return {
    left: `${line.x}px`,
    top: `${line.top}px`,
    height: `${line.height}px`,
  };
}

function buildBridgeStyle(control) {
  return {
    left: `${control.midX}px`,
    top: `${control.railY}px`,
    width: `${control.width}px`,
  };
}

function buildStemStyle(control) {
  return {
    left: `${control.midX}px`,
    top: `${control.translateHandleY}px`,
    height: `${control.railY - control.translateHandleY}px`,
  };
}

function buildTranslateHandleStyle(control) {
  return {
    left: `${control.midX}px`,
    top: `${control.translateHandleY}px`,
  };
}

function buildResizeHandleStyle(x, y) {
  return {
    left: `${x}px`,
    top: `${y}px`,
  };
}

function buildMetricsStyle(control) {
  return {
    left: `${control.midX}px`,
    top: `${control.labelY}px`,
  };
}

defineExpose({
  clearRulers,
});
</script>

<style lang="scss" scoped>
.parallel-ruler {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  user-select: none;
  touch-action: none;
}

.parallel-ruler__line {
  position: absolute;
  width: 1px;
  transform: translateX(-50%);
  background: var(--parallel-ruler-line-color);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.7),
    0 0 0 6px var(--parallel-ruler-line-soft);
}

.parallel-ruler__bridge,
.parallel-ruler__stem {
  position: absolute;
  pointer-events: none;
  background: var(--parallel-ruler-line-color);
}

.parallel-ruler__bridge {
  height: 2px;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.78);
}

.parallel-ruler__stem {
  width: 2px;
  transform: translate(-50%, 0);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.78);
}

.parallel-ruler__handle {
  position: absolute;
  pointer-events: auto;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--parallel-ruler-line-color);
  background: #ffffff;
  transform: translate(-50%, -50%);
  cursor: ew-resize;
  box-shadow: 0 8px 18px rgba(53, 98, 236, 0.16);
}

.parallel-ruler__handle--translate {
  cursor: grab;
}

.parallel-ruler__handle--translate:active {
  cursor: grabbing;
}

.parallel-ruler__metrics {
  position: absolute;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  transform: translate(-50%, 0);
  color: var(--parallel-ruler-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.92);
}
</style>
