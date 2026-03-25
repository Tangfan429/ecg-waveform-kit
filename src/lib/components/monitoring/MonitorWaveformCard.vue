<script setup>
import { computed, watch } from "vue";
import { useStreamingWaveformBuffer } from "../../composables/useStreamingWaveformBuffer";
import StreamingWaveformCanvas from "./StreamingWaveformCanvas.vue";

defineOptions({
  name: "MonitorWaveformCard",
});

const props = defineProps({
  channel: {
    type: Object,
    default: null,
  },
  timeWindow: {
    type: Number,
    default: 8,
  },
  paused: {
    type: Boolean,
    default: false,
  },
  gridVisible: {
    type: Boolean,
    default: true,
  },
  amplitudeScale: {
    type: Number,
    default: 1,
  },
  canvasHeight: {
    type: Number,
    default: 168,
  },
  showXAxisLabels: {
    type: Boolean,
    default: true,
  },
  backgroundColor: {
    type: String,
    default: "#081226",
  },
});

const resolvedChannel = computed(() => props.channel || {});

const {
  visibleSamples,
  displayLower,
  displayUpper,
  appendSamples,
  clear,
} = useStreamingWaveformBuffer({
  samplingRate: () => resolvedChannel.value.samplingRate || 80,
  seconds: () => props.timeWindow,
  initialLower: () => resolvedChannel.value.lowerLimit ?? -1,
  initialUpper: () => resolvedChannel.value.upperLimit ?? 1,
  autoRange: () => resolvedChannel.value.autoRange !== false,
  minSpan: () =>
    Math.max(
      0.15,
      ((resolvedChannel.value.upperLimit ?? 1) -
        (resolvedChannel.value.lowerLimit ?? -1)) *
        0.1,
    ),
});

const currentValue = computed(() => {
  const lastValue = visibleSamples.value.at(-1);

  if (!Number.isFinite(lastValue)) {
    return "--";
  }

  if (Math.abs(lastValue) >= 100) {
    return lastValue.toFixed(0);
  }

  if (Math.abs(lastValue) >= 10) {
    return lastValue.toFixed(1);
  }

  return lastValue.toFixed(2);
});

const effectiveRange = computed(() => {
  const lower = displayLower.value;
  const upper = displayUpper.value;
  const center = (upper + lower) / 2;
  const span = Math.max(upper - lower, 0.1);
  const zoomScale = Math.max(0.6, Number(props.amplitudeScale) || 1);
  const scaledSpan = span / zoomScale;

  return {
    lower: center - scaledSpan / 2,
    upper: center + scaledSpan / 2,
  };
});

watch(
  () => resolvedChannel.value.id,
  () => {
    clear();
  },
  { immediate: true },
);

watch(
  () => resolvedChannel.value.samples,
  (samples) => {
    if (props.paused) {
      return;
    }

    appendSamples(samples);
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <article class="monitor-waveform-card">
    <header class="monitor-waveform-card__header">
      <div class="monitor-waveform-card__title-wrap">
        <span
          class="monitor-waveform-card__tone"
          :style="{ backgroundColor: resolvedChannel.color || '#4f7cff' }"
        />
        <div>
          <h3 class="monitor-waveform-card__title">
            {{ resolvedChannel.label || resolvedChannel.code || "波形通道" }}
          </h3>
          <p class="monitor-waveform-card__meta">
            {{ resolvedChannel.code || "CH" }}
            ·
            {{ resolvedChannel.samplingRate || 0 }} Hz
            ·
            {{ resolvedChannel.unit || "a.u." }}
          </p>
        </div>
      </div>

      <div class="monitor-waveform-card__reading">
        <span class="monitor-waveform-card__value">{{ currentValue }}</span>
        <span class="monitor-waveform-card__unit">
          {{ resolvedChannel.unit || "a.u." }}
        </span>
      </div>
    </header>

    <StreamingWaveformCanvas
      :samples="visibleSamples"
      :seconds="timeWindow"
      :line-color="resolvedChannel.color || '#4f7cff'"
      :lower-limit="effectiveRange.lower"
      :upper-limit="effectiveRange.upper"
      :grid-visible="gridVisible"
      :show-y-axis-min-max-labels="true"
      :show-x-axis-labels="showXAxisLabels"
      :x-axis-label-max="timeWindow"
      :x-axis-label-interval="Math.max(1, Math.round(timeWindow / 4))"
      :height="canvasHeight"
      :background-color="backgroundColor"
    />
  </article>
</template>

<style scoped lang="scss">
.monitor-waveform-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.94) 0%, rgba(241, 245, 249, 0.96) 100%);
  box-shadow:
    0 16px 38px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__title-wrap {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  &__tone {
    width: 10px;
    height: 46px;
    margin-top: 2px;
    border-radius: 999px;
    flex: 0 0 auto;
  }

  &__title {
    margin: 0;
    color: #0f172a;
    font-size: 16px;
    line-height: 1.1;
  }

  &__meta {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
  }

  &__reading {
    display: flex;
    align-items: baseline;
    gap: 6px;
    white-space: nowrap;
    color: #0f172a;
  }

  &__value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }

  &__unit {
    color: #64748b;
    font-size: 12px;
  }
}
</style>
