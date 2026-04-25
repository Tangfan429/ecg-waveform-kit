<template>
  <canvas
    ref="canvasRef"
    class="average-template-ruler-overlay"
    :class="{ 'average-template-ruler-overlay--active': rulerEnabled }"
    :width="physicalWidth"
    :height="physicalHeight"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  />
</template>

<script setup>
import { computed, ref } from "vue";
import { AVERAGE_TEMPLATE_CHART_SIZE } from "../utils/averageTemplateChartConfig";
import { useAverageTemplateRuler } from "./useAverageTemplateRuler";

defineOptions({
  name: "AverageTemplateRulerOverlay",
});

const props = defineProps({
  rulerEnabled: {
    type: Boolean,
    default: false,
  },
  speed: {
    type: String,
    default: "200",
  },
  gain: {
    type: String,
    default: "100",
  },
  hasWaveData: {
    type: Boolean,
    default: false,
  },
  waveKey: {
    type: [String, Number],
    default: "",
  },
});

const canvasRef = ref(null);
const chartSize = AVERAGE_TEMPLATE_CHART_SIZE;
const dpr = computed(() =>
  typeof window === "undefined" ? 1 : Math.max(window.devicePixelRatio || 1, 1),
);
const physicalWidth = computed(() => chartSize.width * dpr.value);
const physicalHeight = computed(() => chartSize.height * dpr.value);

const {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
} = useAverageTemplateRuler({
  canvasRef,
  enabled: computed(() => props.rulerEnabled),
  chartSize,
  speed: computed(() => props.speed),
  gain: computed(() => props.gain),
  hasWaveData: computed(() => props.hasWaveData),
  waveKey: computed(() => props.waveKey),
});
</script>

<style lang="scss" scoped>
.average-template-ruler-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 1373px;
  height: 841px;
  z-index: 1;
  pointer-events: none;

  &--active {
    pointer-events: auto;
    cursor: crosshair;
    user-select: none;
    touch-action: none;
  }
}
</style>
