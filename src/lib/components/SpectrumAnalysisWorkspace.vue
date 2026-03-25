<script setup>
import { computed } from "vue";

defineOptions({
  name: "SpectrumAnalysisWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      title: "频谱心电",
      subtitle: "基于波形频域分布的能量分析。",
      activeLead: "II",
      leadOptions: [],
      points: [],
      bands: [],
      summaryRows: [],
      markers: [],
    }),
  },
});

const chart = Object.freeze({
  width: 900,
  height: 420,
  padding: {
    top: 36,
    right: 28,
    bottom: 40,
    left: 48,
  },
});

const plotWidth = computed(
  () => chart.width - chart.padding.left - chart.padding.right,
);
const plotHeight = computed(
  () => chart.height - chart.padding.top - chart.padding.bottom,
);

const normalizedPoints = computed(() => {
  const points = Array.isArray(props.data.points) ? props.data.points : [];

  if (!points.length) {
    return [];
  }

  const maxFrequency = Math.max(
    ...points.map((item) => Number(item.frequency) || 0),
    1,
  );
  const maxAmplitude = Math.max(
    ...points.map((item) => Number(item.amplitude) || 0),
    1,
  );

  return points.map((item, index) => ({
    key: `${item.frequency}-${index}`,
    frequency: Number(item.frequency) || 0,
    amplitude: Number(item.amplitude) || 0,
    x:
      chart.padding.left +
      ((Number(item.frequency) || 0) / maxFrequency) * plotWidth.value,
    y:
      chart.padding.top +
      plotHeight.value -
      ((Number(item.amplitude) || 0) / maxAmplitude) * plotHeight.value,
  }));
});

const spectrumPath = computed(() => {
  if (!normalizedPoints.value.length) {
    return "";
  }

  return normalizedPoints.value
    .map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(" ");
});

const spectrumAreaPath = computed(() => {
  if (!normalizedPoints.value.length) {
    return "";
  }

  const firstPoint = normalizedPoints.value[0];
  const lastPoint = normalizedPoints.value[normalizedPoints.value.length - 1];
  const baselineY = chart.padding.top + plotHeight.value;

  return [
    `M${firstPoint.x.toFixed(2)},${baselineY.toFixed(2)}`,
    ...normalizedPoints.value.map(
      (point) => `L${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    ),
    `L${lastPoint.x.toFixed(2)},${baselineY.toFixed(2)}`,
    "Z",
  ].join(" ");
});

const gridLines = computed(() =>
  Array.from({ length: 6 }, (_, index) => ({
    key: `grid-${index}`,
    y: chart.padding.top + (plotHeight.value / 5) * index,
  })),
);

const bandColumns = computed(() => {
  const bands = Array.isArray(props.data.bands) ? props.data.bands : [];
  const columnWidth = plotWidth.value / Math.max(bands.length, 1);

  return bands.map((band, index) => ({
    ...band,
    x: chart.padding.left + index * columnWidth,
    width: Math.max(columnWidth - 12, 0),
  }));
});

const markerDots = computed(() => {
  const markers = Array.isArray(props.data.markers) ? props.data.markers : [];

  return markers
    .map((marker) => {
      const point = normalizedPoints.value.find(
        (item) => item.frequency >= marker.frequency,
      );

      if (!point) {
        return null;
      }

      return {
        ...marker,
        x: point.x,
        y: point.y,
      };
    })
    .filter(Boolean);
});
</script>

<template>
  <section class="analysis-workspace">
    <header class="analysis-workspace__header">
      <div>
        <div class="analysis-workspace__eyebrow">Spectrum ECG</div>
        <h3 class="analysis-workspace__title">{{ data.title }}</h3>
        <p class="analysis-workspace__subtitle">{{ data.subtitle }}</p>
      </div>

      <div class="analysis-workspace__lead-pills">
        <span class="analysis-workspace__lead-label">分析导联</span>
        <span
          v-for="lead in data.leadOptions"
          :key="lead"
          :class="[
            'analysis-workspace__lead-pill',
            { 'analysis-workspace__lead-pill--active': lead === data.activeLead },
          ]"
        >
          {{ lead }}
        </span>
      </div>
    </header>

    <div class="analysis-workspace__body">
      <article class="chart-card">
        <div class="chart-card__header">
          <h4 class="chart-card__title">频域能量分布</h4>
          <span class="chart-card__meta">Lead {{ data.activeLead }}</span>
        </div>

        <svg
          class="chart-card__svg"
          :viewBox="`0 0 ${chart.width} ${chart.height}`"
          aria-label="spectrum-analysis-chart"
        >
          <defs>
            <linearGradient id="spectrum-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(53,98,236,0.52)" />
              <stop offset="100%" stop-color="rgba(53,98,236,0.04)" />
            </linearGradient>
          </defs>

          <rect width="900" height="420" rx="24" fill="#f8fbff" />

          <line
            v-for="line in gridLines"
            :key="line.key"
            :x1="chart.padding.left"
            :x2="chart.padding.left + plotWidth"
            :y1="line.y"
            :y2="line.y"
            stroke="rgba(148,163,184,0.18)"
            stroke-dasharray="4 6"
          />

          <rect
            v-for="band in bandColumns"
            :key="band.label"
            :x="band.x"
            :y="chart.padding.top"
            :width="band.width"
            :height="plotHeight"
            rx="16"
            fill="rgba(255,255,255,0.52)"
          />

          <path
            v-if="spectrumAreaPath"
            :d="spectrumAreaPath"
            fill="url(#spectrum-area-gradient)"
          />

          <path
            v-if="spectrumPath"
            :d="spectrumPath"
            fill="none"
            stroke="#3562ec"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          <g v-for="marker in markerDots" :key="marker.label">
            <circle :cx="marker.x" :cy="marker.y" r="6" fill="#2ba471" />
            <rect
              :x="marker.x - 28"
              :y="marker.y - 38"
              width="56"
              height="24"
              rx="12"
              fill="#ffffff"
            />
            <text
              :x="marker.x"
              :y="marker.y - 22"
              text-anchor="middle"
              fill="#0f172a"
              font-size="12"
              font-weight="700"
            >
              {{ marker.label }}
            </text>
          </g>

          <text
            v-for="band in bandColumns"
            :key="`${band.label}-text`"
            :x="band.x + band.width / 2"
            :y="chart.height - 12"
            text-anchor="middle"
            fill="rgba(15,23,42,0.58)"
            font-size="12"
          >
            {{ band.label }}
          </text>
        </svg>
      </article>

      <aside class="summary-card">
        <div class="summary-card__header">
          <h4 class="summary-card__title">频带摘要</h4>
        </div>

        <div class="summary-card__band-list">
          <div
            v-for="band in data.bands"
            :key="band.label"
            class="summary-card__band-item"
          >
            <div>
              <div class="summary-card__band-label">{{ band.label }}</div>
              <div class="summary-card__band-range">{{ band.range }}</div>
            </div>
            <strong class="summary-card__band-value">{{ band.power }}</strong>
          </div>
        </div>

        <div class="summary-card__metrics">
          <div
            v-for="row in data.summaryRows"
            :key="row.label"
            class="summary-card__metric-row"
          >
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped lang="scss">
.analysis-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at right top, rgba(53, 98, 236, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 249, 255, 0.96) 100%);
}

.analysis-workspace__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.analysis-workspace__eyebrow {
  margin-bottom: 8px;
  color: rgba(53, 98, 236, 0.88);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.analysis-workspace__title {
  margin: 0;
  font-size: 24px;
}

.analysis-workspace__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.58);
  font-size: 14px;
}

.analysis-workspace__lead-pills {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.analysis-workspace__lead-label {
  color: rgba(15, 23, 42, 0.48);
  font-size: 12px;
}

.analysis-workspace__lead-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.42);
  color: rgba(15, 23, 42, 0.68);
  font-size: 13px;
  font-weight: 600;

  &--active {
    background: rgba(53, 98, 236, 0.12);
    color: #3562ec;
  }
}

.analysis-workspace__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  min-height: 0;
}

.chart-card,
.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
}

.chart-card {
  padding: 18px;
}

.chart-card__header,
.summary-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.chart-card__title,
.summary-card__title {
  margin: 0;
  font-size: 16px;
}

.chart-card__meta {
  color: rgba(15, 23, 42, 0.56);
  font-size: 13px;
}

.chart-card__svg {
  width: 100%;
  height: auto;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
}

.summary-card__band-list,
.summary-card__metrics {
  display: grid;
  gap: 10px;
}

.summary-card__band-item,
.summary-card__metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.94);
}

.summary-card__band-label {
  font-weight: 700;
}

.summary-card__band-range {
  margin-top: 4px;
  color: rgba(15, 23, 42, 0.5);
  font-size: 12px;
}

.summary-card__band-value {
  color: #3562ec;
}

.summary-card__metric-row {
  span {
    color: rgba(15, 23, 42, 0.6);
  }
}

@media (max-width: 1100px) {
  .analysis-workspace__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .analysis-workspace {
    padding: 16px;
  }

  .analysis-workspace__header {
    flex-direction: column;
  }

  .analysis-workspace__lead-pills {
    justify-content: flex-start;
  }
}
</style>