<template>
  <canvas
    ref="canvasRef"
    class="waveform-ruler-overlay"
    :class="{ 'waveform-ruler-overlay--active': enabled }"
    :width="physicalWidth"
    :height="physicalHeight"
    :style="canvasStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  />
</template>

<script setup>
import { computed, onUnmounted, ref } from "vue";
import { useWaveformRuler } from "./useWaveformRuler";

defineOptions({
  name: "WaveformRulerOverlay",
});

const props = defineProps({
  enabled: {
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
  gain: {
    type: String,
    default: "10",
  },
  zoomScale: {
    type: Number,
    default: 1,
  },
  width: {
    type: Number,
    default: 0,
  },
  height: {
    type: Number,
    default: 0,
  },
});

const canvasRef = ref(null);
const dpr = ref(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
let dprMediaQuery = null;

function updateDpr() {
  if (typeof window === "undefined") {
    dpr.value = 1;
    return;
  }

  dpr.value = window.devicePixelRatio || 1;
  listenDprChange();
}

function listenDprChange() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }

  if (dprMediaQuery) {
    dprMediaQuery.removeEventListener("change", updateDpr);
  }

  dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  dprMediaQuery.addEventListener("change", updateDpr);
}

listenDprChange();

onUnmounted(() => {
  if (dprMediaQuery) {
    dprMediaQuery.removeEventListener("change", updateDpr);
    dprMediaQuery = null;
  }
});

const physicalWidth = computed(() => props.width * dpr.value);
const physicalHeight = computed(() => props.height * dpr.value);
const canvasStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}));

const {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  clearRuler,
  measureResult,
} = useWaveformRuler({
  canvasRef,
  enabled: computed(() => props.enabled),
  geometry: computed(() => props.geometry),
  speed: computed(() => props.speed),
  gain: computed(() => props.gain),
  zoomScale: computed(() => props.zoomScale),
  dpr,
});

defineExpose({
  clearRuler,
  measureResult,
});
</script>

<style lang="scss" scoped>
.waveform-ruler-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  pointer-events: none;

  &--active {
    pointer-events: auto;
    cursor: crosshair;
    user-select: none;
    touch-action: none;
  }
}
</style>
