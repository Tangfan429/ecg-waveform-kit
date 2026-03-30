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
    default: "",
  },
  surfaceTone: {
    type: String,
    default: "dark",
  },
  shellVariant: {
    type: String,
    default: "panel",
  },
  metaColumnWidth: {
    type: Number,
    default: 136,
  },
});

const resolvedChannel = computed(() => props.channel || {});
const resolvedSurfaceTone = computed(() =>
  props.surfaceTone === "light" ? "light" : "dark",
);
const resolvedRenderMode = computed(() =>
  resolvedChannel.value.renderMode === "sweep" ? "sweep" : "scroll",
);
const resolvedFillArea = computed(() => resolvedChannel.value.fillArea !== false);
const resolvedBackgroundColor = computed(() => {
  if (String(props.backgroundColor || "").trim()) {
    return props.backgroundColor;
  }

  return resolvedSurfaceTone.value === "light" ? "#ffffff" : "#081226";
});
const isStripShell = computed(() => props.shellVariant === "strip");
const cardClasses = computed(() => [
  "monitor-waveform-card",
  `monitor-waveform-card--${isStripShell.value ? "strip" : "panel"}`,
  `monitor-waveform-card--${resolvedSurfaceTone.value}`,
]);

const {
  buffer,
  visibleSamples,
  sweepCycleLength,
  displayLower,
  displayUpper,
  latestSample,
  sweepHeadIndex,
  appendSamples,
  clear,
} = useStreamingWaveformBuffer({
  samplingRate: () => resolvedChannel.value.samplingRate || 80,
  seconds: () => props.timeWindow,
  initialLower: () => resolvedChannel.value.lowerLimit ?? -1,
  initialUpper: () => resolvedChannel.value.upperLimit ?? 1,
  autoRange: () => resolvedChannel.value.autoRange !== false,
  mode: () => resolvedRenderMode.value,
  minSpan: () =>
    Math.max(
      0.15,
      ((resolvedChannel.value.upperLimit ?? 1) -
        (resolvedChannel.value.lowerLimit ?? -1)) *
        0.1,
    ),
});

const renderSamples = computed(() =>
  resolvedRenderMode.value === "sweep" ? buffer.value : visibleSamples.value,
);

const currentValue = computed(() => {
  const numericValue = Number(latestSample.value);

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
  <article :class="cardClasses">
    <template v-if="isStripShell">
      <div
        class="monitor-waveform-card__meta-block"
        :style="{ '--meta-column-width': `${metaColumnWidth}px` }"
      >
        <div class="monitor-waveform-card__title-wrap">
          <span
            class="monitor-waveform-card__tone"
            :style="{ backgroundColor: resolvedChannel.color || '#4f7cff' }"
          />
          <div class="monitor-waveform-card__copy">
            <h3 class="monitor-waveform-card__title">
              {{ resolvedChannel.label || resolvedChannel.code || "波形通道" }}
            </h3>
            <p class="monitor-waveform-card__meta">
              {{ resolvedChannel.code || "CH" }}
              ·
              {{ resolvedChannel.samplingRate || 0 }} Hz
            </p>
          </div>
        </div>

        <div class="monitor-waveform-card__reading monitor-waveform-card__reading--strip">
          <span class="monitor-waveform-card__value">{{ currentValue }}</span>
          <span class="monitor-waveform-card__unit">
            {{ resolvedChannel.unit || "a.u." }}
          </span>
        </div>
      </div>

      <div class="monitor-waveform-card__chart-shell">
        <StreamingWaveformCanvas
          :samples="renderSamples"
          :paused="paused"
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
          :background-color="resolvedBackgroundColor"
          :surface-tone="resolvedSurfaceTone"
          :fill-area="resolvedFillArea"
          :oscilloscope-mode="resolvedRenderMode === 'sweep'"
          :show-sweep-head="resolvedRenderMode === 'sweep'"
          :sweep-head-index="sweepHeadIndex"
          :sweep-cycle-length="sweepCycleLength"
        />
      </div>
    </template>

    <template v-else>
      <header class="monitor-waveform-card__header">
        <div class="monitor-waveform-card__title-wrap">
          <span
            class="monitor-waveform-card__tone"
            :style="{ backgroundColor: resolvedChannel.color || '#4f7cff' }"
          />
          <div class="monitor-waveform-card__copy">
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
        :samples="renderSamples"
        :paused="paused"
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
        :background-color="resolvedBackgroundColor"
        :surface-tone="resolvedSurfaceTone"
        :fill-area="resolvedFillArea"
        :oscilloscope-mode="resolvedRenderMode === 'sweep'"
        :show-sweep-head="resolvedRenderMode === 'sweep'"
        :sweep-head-index="sweepHeadIndex"
        :sweep-cycle-length="sweepCycleLength"
      />
    </template>
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

  &--light {
    border-color: rgba(203, 213, 225, 0.88);
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    box-shadow: none;
  }

  &--strip {
    display: grid;
    grid-template-columns: minmax(120px, var(--meta-column-width, 136px)) minmax(0, 1fr);
    align-items: stretch;
    gap: 14px;
    padding: 10px 12px;
    border-radius: 18px;
    border-color: rgba(148, 163, 184, 0.7);
    box-shadow:
      0 10px 24px rgba(15, 23, 42, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.92);
  }

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

  &__copy {
    min-width: 0;
  }

  &__tone {
    width: 12px;
    height: 54px;
    margin-top: 2px;
    border-radius: 999px;
    flex: 0 0 auto;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.8),
      0 10px 18px rgba(15, 23, 42, 0.12);
  }

  &__title {
    margin: 0;
    color: #0f172a;
    font-size: 17px;
    line-height: 1.1;
    white-space: nowrap;
  }

  &__meta {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
    white-space: nowrap;
  }

  &__reading {
    display: flex;
    align-items: baseline;
    gap: 6px;
    white-space: nowrap;
    color: #0f172a;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  &__unit {
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
  }

  &__meta-block {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid rgba(226, 232, 240, 0.98);
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(241, 245, 249, 0.92) 100%);
  }

  &__reading--strip {
    gap: 8px;
  }

  &__chart-shell {
    min-width: 0;
  }
}

@media (max-width: 880px) {
  .monitor-waveform-card {
    &--strip {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
    }

    &__meta-block {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
}
</style>