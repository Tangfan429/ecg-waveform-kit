<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

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
  paused: {
    type: Boolean,
    default: false,
  },
  lineColor: {
    type: String,
    default: "#4f7cff",
  },
  backgroundColor: {
    type: String,
    default: "#081226",
  },
  surfaceTone: {
    type: String,
    default: "dark",
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
  fillArea: {
    type: Boolean,
    default: true,
  },
  oscilloscopeMode: {
    type: Boolean,
    default: false,
  },
  showSweepHead: {
    type: Boolean,
    default: false,
  },
  sweepHeadIndex: {
    type: Number,
    default: 0,
  },
  sweepCycleLength: {
    type: Number,
    default: 0,
  },
});

const rootRef = useTemplateRef("rootRef");
const canvasRef = useTemplateRef("canvasRef");
const stageWidth = shallowRef(640);

let resizeObserver = null;
let animationFrameId = 0;
let lastSweepFrameAt = 0;

const sweepCurrentSegment = shallowRef([]);
const sweepNextSegment = shallowRef([]);
const sweepQueuedSegment = shallowRef([]);
const sweepRevealX = shallowRef(0);

const resolvedSurfaceTone = computed(() =>
  props.surfaceTone === "light" ? "light" : "dark",
);
const resolvedBackgroundColor = computed(() => {
  if (String(props.backgroundColor || "").trim()) {
    return props.backgroundColor;
  }

  return resolvedSurfaceTone.value === "light" ? "#ffffff" : "#081226";
});
const stageClasses = computed(() => [
  "streaming-waveform-canvas__stage",
  `streaming-waveform-canvas__stage--${resolvedSurfaceTone.value}`,
]);
const palette = computed(() =>
  resolvedSurfaceTone.value === "light"
    ? {
        minorGrid: "rgba(148, 163, 184, 0.18)",
        majorGrid: "rgba(100, 116, 139, 0.28)",
        baseline: "rgba(71, 85, 105, 0.32)",
        labelText: "rgba(15, 23, 42, 0.72)",
        labelBackground: "rgba(255, 255, 255, 0.94)",
        emptyText: "rgba(51, 65, 85, 0.72)",
        sweepHeadLine: "rgba(37, 99, 235, 0.85)",
        sweepHeadGlowStart: "rgba(37, 99, 235, 0)",
        sweepHeadGlowMid: "rgba(59, 130, 246, 0.16)",
        sweepHeadGlowEnd: "rgba(59, 130, 246, 0.38)",
        xAxisText: "rgba(51, 65, 85, 0.78)",
      }
    : {
        minorGrid: "rgba(148, 163, 184, 0.12)",
        majorGrid: "rgba(203, 213, 225, 0.18)",
        baseline: "rgba(148, 163, 184, 0.45)",
        labelText: "rgba(226, 232, 240, 0.9)",
        labelBackground: "rgba(8, 18, 38, 0.66)",
        emptyText: "rgba(203, 213, 225, 0.76)",
        sweepHeadLine: "rgba(255, 255, 255, 0.92)",
        sweepHeadGlowStart: "rgba(255, 255, 255, 0)",
        sweepHeadGlowMid: "rgba(255, 255, 255, 0.12)",
        sweepHeadGlowEnd: "rgba(255, 255, 255, 0.3)",
        xAxisText: "rgba(203, 213, 225, 0.82)",
      },
);

const normalizedSamples = computed(() =>
  props.samples.map((sample) => {
    if (sample === null || sample === undefined || sample === "") {
      return null;
    }

    const numericValue = Number(sample);
    return Number.isFinite(numericValue) ? numericValue : null;
  }),
);
const sweepCleanSamples = computed(() =>
  normalizedSamples.value.filter((sample) => sample !== null),
);
const hasDrawableSamples = computed(() =>
  props.oscilloscopeMode
    ? sweepCurrentSegment.value.length > 0 || sweepQueuedSegment.value.length > 0
    : normalizedSamples.value.some((sample) => sample !== null),
);
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

const formatXAxisTick = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }

  return numericValue.toFixed(1);
};

const resolveSweepCycleLength = () =>
  Math.max(
    2,
    Math.round(Number(props.sweepCycleLength) || sweepCleanSamples.value.length || 2),
  );

const createSweepSnapshot = () => {
  const cycleLength = resolveSweepCycleLength();
  const cleanSamples = sweepCleanSamples.value;

  return cleanSamples.slice(-cycleLength);
};

const ensureSweepSnapshots = () => {
  const snapshot = createSweepSnapshot();

  sweepQueuedSegment.value = snapshot;

  if (!sweepCurrentSegment.value.length) {
    sweepCurrentSegment.value = snapshot;
  }

  if (!sweepNextSegment.value.length) {
    sweepNextSegment.value = snapshot;
  }
};

const resetSweepState = () => {
  sweepCurrentSegment.value = [];
  sweepNextSegment.value = [];
  sweepQueuedSegment.value = [];
  sweepRevealX.value = 0;
  lastSweepFrameAt = 0;
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
  context.strokeStyle = palette.value.minorGrid;
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

  context.strokeStyle = palette.value.majorGrid;

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

const drawBaseline = (context, width, height) => {
  context.save();
  context.strokeStyle = palette.value.baseline;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
  context.restore();
};

const createYMapper = (height) => {
  const topPadding = 8;
  const bottomPadding = 8;
  const safeHeight = height - topPadding - bottomPadding;
  const range = Math.max(props.upperLimit - props.lowerLimit, 0.001);

  const yFor = (value) => {
    const normalizedValue = (value - props.lowerLimit) / range;
    const clampedValue = Math.min(1.2, Math.max(-0.2, normalizedValue));
    return topPadding + (1 - clampedValue) * safeHeight;
  };

  return {
    yFor,
  };
};

const drawContinuousWaveform = (
  context,
  samples,
  width,
  height,
  yFor,
  fillArea,
) => {
  if (!samples.length) {
    return;
  }

  const sampleCount = Math.max(samples.length, 1);
  const xFor = (index) =>
    sampleCount === 1 ? 0 : (index / (sampleCount - 1)) * width;

  if (fillArea && sampleCount > 1) {
    const areaGradient = context.createLinearGradient(0, 0, 0, height);
    areaGradient.addColorStop(0, `${props.lineColor}30`);
    areaGradient.addColorStop(1, `${props.lineColor}00`);

    context.beginPath();

    samples.forEach((sample, index) => {
      const x = xFor(index);
      const y = yFor(sample);

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    context.lineTo(width, height - 8);
    context.lineTo(0, height - 8);
    context.closePath();
    context.fillStyle = areaGradient;
    context.fill();
  }

  context.beginPath();

  samples.forEach((sample, index) => {
    const x = xFor(index);
    const y = yFor(sample);

    if (index === 0) {
      context.moveTo(x, y);
      return;
    }

    context.lineTo(x, y);
  });

  context.strokeStyle = props.lineColor;
  context.lineWidth = props.oscilloscopeMode ? 2.4 : 1.8;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowColor = `${props.lineColor}52`;
  context.shadowBlur = props.oscilloscopeMode ? 6 : 8;
  context.stroke();
  context.shadowBlur = 0;
};

const drawScrollWaveform = (context, width, height, yFor) => {
  const samples = normalizedSamples.value;
  const hasGaps = samples.some((sample) => sample === null);
  const sampleCount = Math.max(samples.length, 1);
  const xFor = (index) =>
    sampleCount === 1 ? 0 : (index / (sampleCount - 1)) * width;

  if (props.fillArea && !hasGaps) {
    drawContinuousWaveform(
      context,
      samples.filter((sample) => sample !== null),
      width,
      height,
      yFor,
      true,
    );
  }

  context.beginPath();
  let hasOpenSegment = false;

  samples.forEach((sample, index) => {
    if (sample === null) {
      hasOpenSegment = false;
      return;
    }

    const x = xFor(index);
    const y = yFor(sample);

    if (!hasOpenSegment) {
      context.moveTo(x, y);
      hasOpenSegment = true;
      return;
    }

    context.lineTo(x, y);
  });

  context.strokeStyle = props.lineColor;
  context.lineWidth = 1.8;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowColor = `${props.lineColor}4D`;
  context.shadowBlur = 8;
  context.stroke();
  context.shadowBlur = 0;
};

const drawSweepWaveform = (context, width, height, yFor) => {
  const currentSamples = sweepCurrentSegment.value;
  const nextSamples = sweepNextSegment.value.length
    ? sweepNextSegment.value
    : sweepCurrentSegment.value;
  const revealX = Math.round(Math.max(0, Math.min(width, sweepRevealX.value)));

  if (!currentSamples.length && !nextSamples.length) {
    return;
  }

  if (currentSamples.length && revealX < width) {
    context.save();
    context.beginPath();
    context.rect(revealX, 0, width - revealX, height);
    context.clip();
    drawContinuousWaveform(
      context,
      currentSamples,
      width,
      height,
      yFor,
      props.fillArea,
    );
    context.restore();
  }

  if (nextSamples.length && revealX > 0) {
    context.save();
    context.beginPath();
    context.rect(0, 0, revealX, height);
    context.clip();
    drawContinuousWaveform(
      context,
      nextSamples,
      width,
      height,
      yFor,
      props.fillArea,
    );
    context.restore();
  }

  if (props.showSweepHead) {
    const headX = Math.max(0, Math.min(width, revealX));
    const bandStart = Math.max(0, headX - 18);
    const bandWidth = Math.min(width - bandStart, 26);
    const glow = context.createLinearGradient(
      bandStart,
      0,
      bandStart + bandWidth,
      0,
    );
    glow.addColorStop(0, palette.value.sweepHeadGlowStart);
    glow.addColorStop(0.5, palette.value.sweepHeadGlowMid);
    glow.addColorStop(1, palette.value.sweepHeadGlowEnd);

    // 扫描头按屏幕像素连续推进，满屏后才切换到下一段，避免中途在画面中间重启。
    context.save();
    context.fillStyle = glow;
    context.fillRect(bandStart, 0, bandWidth, height);
    context.fillStyle = resolvedBackgroundColor.value;
    context.fillRect(headX, 0, 2, height);
    context.strokeStyle = palette.value.sweepHeadLine;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(headX + 0.5, 0);
    context.lineTo(headX + 0.5, height);
    context.stroke();
    context.restore();
  }
};

const renderWaveform = () => {
  const canvasElement = canvasRef.value;

  if (!canvasElement) {
    return;
  }

  const context = canvasElement.getContext("2d");

  if (!context) {
    return;
  }

  const pixelRatio = window.devicePixelRatio || 1;
  const width = stageWidth.value;
  const height = Math.max(120, props.height);
  const { yFor } = createYMapper(height);

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = resolvedBackgroundColor.value;
  context.fillRect(0, 0, width, height);

  if (props.gridVisible) {
    drawGrid(context, width, height);
  }

  if (!hasDrawableSamples.value) {
    drawBaseline(context, width, height);
    return;
  }

  drawBaseline(context, width, height);

  if (props.oscilloscopeMode) {
    drawSweepWaveform(context, width, height, yFor);
    return;
  }

  drawScrollWaveform(context, width, height, yFor);
};

const advanceSweep = (timestamp) => {
  if (!props.oscilloscopeMode) {
    lastSweepFrameAt = 0;
    return;
  }

  ensureSweepSnapshots();

  if (!sweepCurrentSegment.value.length) {
    return;
  }

  if (lastSweepFrameAt === 0) {
    lastSweepFrameAt = timestamp;
    return;
  }

  if (props.paused) {
    lastSweepFrameAt = timestamp;
    return;
  }

  const deltaSec = Math.max(0, (timestamp - lastSweepFrameAt) / 1000);
  const speedPxPerSec = stageWidth.value / Math.max(2, Number(props.seconds) || 8);

  lastSweepFrameAt = timestamp;
  sweepRevealX.value += speedPxPerSec * deltaSec;

  if (sweepRevealX.value >= stageWidth.value) {
    const latestSnapshot = sweepQueuedSegment.value.length
      ? [...sweepQueuedSegment.value]
      : createSweepSnapshot();

    sweepCurrentSegment.value = sweepNextSegment.value.length
      ? [...sweepNextSegment.value]
      : latestSnapshot;
    sweepNextSegment.value = latestSnapshot;
    sweepRevealX.value = 0;
  }
};

const animationLoop = (timestamp) => {
  advanceSweep(timestamp);
  renderWaveform();
  animationFrameId = window.requestAnimationFrame(animationLoop);
};

onMounted(() => {
  syncCanvasSize();
  ensureSweepSnapshots();

  if (rootRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
    });
    resizeObserver.observe(rootRef.value);
  }

  animationFrameId = window.requestAnimationFrame(animationLoop);
});

watch(
  () => [props.samples, props.sweepCycleLength, props.oscilloscopeMode],
  () => {
    if (!props.oscilloscopeMode) {
      return;
    }

    const snapshot = createSweepSnapshot();
    sweepQueuedSegment.value = snapshot;

    if (!sweepCurrentSegment.value.length) {
      sweepCurrentSegment.value = snapshot;
      sweepNextSegment.value = snapshot;
    }
  },
  { deep: true, immediate: true },
);

watch(
  () => props.paused,
  () => {
    lastSweepFrameAt = 0;
  },
);

watch(
  () => [
    props.lowerLimit,
    props.upperLimit,
    props.lineColor,
    props.backgroundColor,
    props.surfaceTone,
    props.gridVisible,
    props.height,
    props.fillArea,
    props.seconds,
    props.showXAxisLabels,
    props.showYAxisMinMaxLabels,
    props.xAxisLabelMin,
    props.xAxisLabelMax,
    props.xAxisLabelInterval,
  ],
  () => {
    syncCanvasSize();
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
    <div :class="stageClasses">
      <canvas
        ref="canvasRef"
        class="streaming-waveform-canvas__surface"
      />

      <div
        v-if="showYAxisMinMaxLabels"
        class="streaming-waveform-canvas__y-label streaming-waveform-canvas__y-label--top"
        :style="{
          color: palette.labelText,
          backgroundColor: palette.labelBackground,
        }"
      >
        {{ formatAxisLabel(upperLimit) }}
      </div>
      <div
        v-if="showYAxisMinMaxLabels"
        class="streaming-waveform-canvas__y-label streaming-waveform-canvas__y-label--bottom"
        :style="{
          color: palette.labelText,
          backgroundColor: palette.labelBackground,
        }"
      >
        {{ formatAxisLabel(lowerLimit) }}
      </div>

      <div
        v-if="!hasDrawableSamples"
        class="streaming-waveform-canvas__empty"
        :style="{ color: palette.emptyText }"
      >
        等待波形数据
      </div>
    </div>

    <div
      v-if="showXAxisLabels"
      class="streaming-waveform-canvas__x-axis"
      :style="{ color: palette.xAxisText }"
    >
      <span
        v-for="tick in xAxisTicks"
        :key="tick"
      >
        {{ formatXAxisTick(tick) }}s
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
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.14);

    &--light {
      border-color: rgba(148, 163, 184, 0.78);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.82),
        0 8px 18px rgba(15, 23, 42, 0.04);
    }

    &--dark {
      border-color: rgba(148, 163, 184, 0.14);
    }
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
    font-size: 13px;
    letter-spacing: 0.02em;
  }

  &__x-axis {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 6px 0;
    font-size: 11px;
    line-height: 1;
  }
}
</style>