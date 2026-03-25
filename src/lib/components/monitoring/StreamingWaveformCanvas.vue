<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

defineOptions({
  name: "StreamingWaveformCanvas",
});

const props = defineProps({
  samples: {
    type: Array,
    default: () => [],
  },
  lowerLimit: {
    type: Number,
    default: -1,
  },
  upperLimit: {
    type: Number,
    default: 1,
  },
  seconds: {
    type: Number,
    default: 8,
  },
  lineColor: {
    type: String,
    default: "#4f7cff",
  },
  backgroundColor: {
    type: String,
    default: "#081226",
  },
  gridVisible: {
    type: Boolean,
    default: true,
  },
  showYAxisMinMaxLabels: {
    type: Boolean,
    default: true,
  },
  showXAxisLabels: {
    type: Boolean,
    default: true,
  },
  xAxisLabelMin: {
    type: Number,
    default: 0,
  },
  xAxisLabelMax: {
    type: Number,
    default: 8,
  },
  xAxisLabelInterval: {
    type: Number,
    default: 2,
  },
  height: {
    type: Number,
    default: 168,
  },
});

const rootRef = ref(null);
const canvasRef = ref(null);
const stageWidth = ref(640);

let resizeObserver = null;
let animationFrameId = 0;

const xAxisTicks = computed(() => {
  if (!props.showXAxisLabels) {
    return [];
  }

  const start = Number.isFinite(props.xAxisLabelMin) ? props.xAxisLabelMin : 0;
  const end = Number.isFinite(props.xAxisLabelMax)
    ? props.xAxisLabelMax
    : props.seconds;
  const interval = Math.max(1, Number(props.xAxisLabelInterval) || 1);
  const ticks = [];

  for (let value = start; value <= end + 0.0001; value += interval) {
    ticks.push(Number(value.toFixed(2)));
  }

  return ticks;
});

const formatAxisLabel = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  if (Math.abs(numericValue) >= 100) {
    return numericValue.toFixed(0);
  }

  if (Math.abs(numericValue) >= 10) {
    return numericValue.toFixed(1);
  }

  return numericValue.toFixed(2);
};

const scheduleRender = () => {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
  }

  animationFrameId = window.requestAnimationFrame(() => {
    animationFrameId = 0;
    renderWaveform();
  });
};

const syncCanvasSize = () => {
  const rootElement = rootRef.value;
  const canvasElement = canvasRef.value;

  if (!rootElement || !canvasElement) {
    return;
  }

  const width = Math.max(320, Math.round(rootElement.clientWidth));
  const height = Math.max(120, Math.round(props.height));
  const pixelRatio = window.devicePixelRatio || 1;

  stageWidth.value = width;
  canvasElement.width = Math.round(width * pixelRatio);
  canvasElement.height = Math.round(height * pixelRatio);
  canvasElement.style.width = `${width}px`;
  canvasElement.style.height = `${height}px`;
};

const drawGrid = (context, width, height) => {
  const majorVerticalStep = width / Math.max(props.seconds, 1);
  const minorVerticalStep = majorVerticalStep / 5;
  const horizontalBands = 6;
  const majorHorizontalStep = height / horizontalBands;
  const minorHorizontalStep = majorHorizontalStep / 2;

  context.save();

  context.strokeStyle = "rgba(148, 163, 184, 0.12)";
  context.lineWidth = 1;

  for (let x = 0; x <= width + 0.5; x += minorVerticalStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height + 0.5; y += minorHorizontalStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(203, 213, 225, 0.18)";

  for (let x = 0; x <= width + 0.5; x += majorVerticalStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height + 0.5; y += majorHorizontalStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();
};

const renderWaveform = () => {
  const canvasElement = canvasRef.value;

  if (!canvasElement) {
    return;
  }

  const context = canvasElement.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  const width = stageWidth.value;
  const height = Math.max(120, props.height);

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = props.backgroundColor;
  context.fillRect(0, 0, width, height);

  if (props.gridVisible) {
    drawGrid(context, width, height);
  }

  if (!props.samples.length) {
    context.strokeStyle = "rgba(148, 163, 184, 0.45)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
    return;
  }

  const topPadding = 8;
  const bottomPadding = 8;
  const safeHeight = height - topPadding - bottomPadding;
  const range = Math.max(props.upperLimit - props.lowerLimit, 0.001);
  const sampleCount = props.samples.length;

  const yFor = (value) => {
    const normalizedValue = (value - props.lowerLimit) / range;
    const clampedValue = Math.min(1.2, Math.max(-0.2, normalizedValue));
    return topPadding + (1 - clampedValue) * safeHeight;
  };

  const areaGradient = context.createLinearGradient(0, 0, 0, height);
  areaGradient.addColorStop(0, `${props.lineColor}40`);
  areaGradient.addColorStop(1, `${props.lineColor}00`);

  context.beginPath();

  props.samples.forEach((sample, index) => {
    const x =
      sampleCount === 1 ? 0 : (index / (sampleCount - 1)) * width;
    const y = yFor(Number(sample));

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.lineTo(width, height - bottomPadding);
  context.lineTo(0, height - bottomPadding);
  context.closePath();
  context.fillStyle = areaGradient;
  context.fill();

  context.beginPath();
  props.samples.forEach((sample, index) => {
    const x =
      sampleCount === 1 ? 0 : (index / (sampleCount - 1)) * width;
    const y = yFor(Number(sample));

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.strokeStyle = props.lineColor;
  context.lineWidth = 1.75;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowColor = `${props.lineColor}66`;
  context.shadowBlur = 10;
  context.stroke();
  context.shadowBlur = 0;
};

onMounted(() => {
  syncCanvasSize();
  scheduleRender();

  if (rootRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
      scheduleRender();
    });
    resizeObserver.observe(rootRef.value);
  }
});

watch(
  () => [
    props.samples,
    props.lowerLimit,
    props.upperLimit,
    props.lineColor,
    props.backgroundColor,
    props.gridVisible,
    props.height,
  ],
  () => {
    syncCanvasSize();
    scheduleRender();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
  }
});
</script>

<template>
  <div
    ref="rootRef"
    class="streaming-waveform-canvas"
    :style="{ '--waveform-height': `${height}px` }"
  >
    <div class="streaming-waveform-canvas__stage">
      <canvas
        ref="canvasRef"
        class="streaming-waveform-canvas__surface"
      />

      <div
        v-if="showYAxisMinMaxLabels"
        class="streaming-waveform-canvas__y-label streaming-waveform-canvas__y-label--top"
      >
        {{ formatAxisLabel(upperLimit) }}
      </div>
      <div
        v-if="showYAxisMinMaxLabels"
        class="streaming-waveform-canvas__y-label streaming-waveform-canvas__y-label--bottom"
      >
        {{ formatAxisLabel(lowerLimit) }}
      </div>

      <div
        v-if="!samples.length"
        class="streaming-waveform-canvas__empty"
      >
        等待波形数据
      </div>
    </div>

    <div
      v-if="showXAxisLabels"
      class="streaming-waveform-canvas__x-axis"
    >
      <span
        v-for="tick in xAxisTicks"
        :key="tick"
      >
        {{ tick }}s
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.streaming-waveform-canvas {
  width: 100%;
  min-width: 0;

  &__stage {
    position: relative;
    height: var(--waveform-height);
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: #081226;
  }

  &__surface {
    display: block;
    width: 100%;
    height: var(--waveform-height);
  }

  &__y-label {
    position: absolute;
    right: 10px;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(8, 18, 38, 0.66);
    color: rgba(226, 232, 240, 0.9);
    font-size: 11px;
    line-height: 1;

    &--top {
      top: 10px;
    }

    &--bottom {
      bottom: 10px;
    }
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: rgba(203, 213, 225, 0.76);
    font-size: 13px;
    letter-spacing: 0.02em;
  }

  &__x-axis {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 6px 0;
    color: rgba(71, 85, 105, 0.88);
    font-size: 11px;
    line-height: 1;
  }
}
</style>
