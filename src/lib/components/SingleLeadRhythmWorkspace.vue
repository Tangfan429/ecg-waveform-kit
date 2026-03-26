<script setup>
import { computed } from "vue";

defineOptions({
  name: "SingleLeadRhythmWorkspace",
});

const props = defineProps({
  analysis: {
    type: Object,
    default: () => ({
      title: "R峰 / RR 分析",
      subtitle: "等待波形数据。",
      leadName: "I",
      sampleRate: 0,
      duration: 0,
      classificationLabel: "--",
      summaryRows: [],
      rrSeries: [],
      intervalRows: [],
    }),
  },
});

const chart = Object.freeze({
  width: 920,
  height: 320,
  padding: {
    top: 28,
    right: 24,
    bottom: 42,
    left: 42,
  },
});

const plotWidth = computed(
  () => chart.width - chart.padding.left - chart.padding.right,
);
const plotHeight = computed(
  () => chart.height - chart.padding.top - chart.padding.bottom,
);
const normalizedRrSeries = computed(() =>
  Array.isArray(props.analysis.rrSeries) ? props.analysis.rrSeries : [],
);
const rrRange = computed(() => {
  const values = normalizedRrSeries.value.map((item) => Number(item.value) || 0);

  if (!values.length) {
    return {
      min: 0,
      max: 1,
    };
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(rawMax - rawMin, 1);
  const padding = Math.max(span * 0.16, 24);

  return {
    min: Math.max(0, rawMin - padding),
    max: rawMax + padding,
  };
});

const rrPath = computed(() => {
  if (!normalizedRrSeries.value.length) {
    return "";
  }

  const minValue = rrRange.value.min;
  const maxValue = rrRange.value.max;
  const valueSpan = Math.max(1, maxValue - minValue);

  return normalizedRrSeries.value
    .map((item, index) => {
      const x =
        chart.padding.left +
        (index / Math.max(normalizedRrSeries.value.length - 1, 1)) * plotWidth.value;
      const y =
        chart.padding.top +
        plotHeight.value -
        (((Number(item.value) || 0) - minValue) / valueSpan) * plotHeight.value;

      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
});

const rrPoints = computed(() => {
  if (!normalizedRrSeries.value.length) {
    return [];
  }

  const minValue = rrRange.value.min;
  const maxValue = rrRange.value.max;
  const valueSpan = Math.max(1, maxValue - minValue);

  return normalizedRrSeries.value.map((item, index) => ({
    ...item,
    x:
      chart.padding.left +
      (index / Math.max(normalizedRrSeries.value.length - 1, 1)) * plotWidth.value,
    y:
      chart.padding.top +
      plotHeight.value -
      (((Number(item.value) || 0) - minValue) / valueSpan) * plotHeight.value,
  }));
});

const chartGridLines = computed(() =>
  Array.from({ length: 5 }, (_, index) => ({
    key: `rr-grid-${index}`,
    y: chart.padding.top + (plotHeight.value / 4) * index,
  })),
);

const intervalRows = computed(() =>
  Array.isArray(props.analysis.intervalRows) ? props.analysis.intervalRows : [],
);
</script>

<template>
  <section class="single-lead-rhythm">
    <header class="single-lead-rhythm__header">
      <div>
        <div class="single-lead-rhythm__eyebrow">Lead {{ analysis.leadName }}</div>
        <h3 class="single-lead-rhythm__title">{{ analysis.title }}</h3>
        <p class="single-lead-rhythm__subtitle">{{ analysis.subtitle }}</p>
      </div>

      <div class="single-lead-rhythm__meta">
        <span>采样率 {{ analysis.sampleRate || "--" }}Hz</span>
        <span>时长 {{ analysis.duration || "--" }}s</span>
        <span>分类 {{ analysis.classificationLabel || "--" }}</span>
      </div>
    </header>

    <div class="single-lead-rhythm__summary">
      <div
        v-for="row in analysis.summaryRows"
        :key="row.label"
        class="single-lead-rhythm__summary-card"
      >
        <span class="single-lead-rhythm__summary-label">{{ row.label }}</span>
        <strong class="single-lead-rhythm__summary-value">{{ row.value }}</strong>
      </div>
    </div>

    <div class="single-lead-rhythm__body">
      <article class="single-lead-rhythm__chart-card">
        <div class="single-lead-rhythm__card-header">
          <h4>RR 间期趋势</h4>
          <span>{{ normalizedRrSeries.length }} 个间期</span>
        </div>

        <svg
          class="single-lead-rhythm__chart"
          :viewBox="`0 0 ${chart.width} ${chart.height}`"
          aria-label="watch-lead-rhythm-analysis"
        >
          <rect :width="chart.width" :height="chart.height" rx="24" fill="#f8fbff" />

          <line
            v-for="line in chartGridLines"
            :key="line.key"
            :x1="chart.padding.left"
            :x2="chart.padding.left + plotWidth"
            :y1="line.y"
            :y2="line.y"
            stroke="rgba(148,163,184,0.18)"
            stroke-dasharray="4 6"
          />

          <path
            v-if="rrPath"
            :d="rrPath"
            fill="none"
            stroke="#2ba471"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          <circle
            v-for="point in rrPoints"
            :key="point.key"
            :cx="point.x"
            :cy="point.y"
            r="5.5"
            fill="#ffffff"
            stroke="#2ba471"
            stroke-width="3"
          />

          <text
            v-if="!rrPoints.length"
            :x="chart.width / 2"
            :y="chart.height / 2"
            text-anchor="middle"
            fill="rgba(15,23,42,0.48)"
            font-size="16"
          >
            当前记录还不足以生成 RR 间期趋势
          </text>
        </svg>
      </article>

      <aside class="single-lead-rhythm__table-card">
        <div class="single-lead-rhythm__card-header">
          <h4>最近 RR 间期</h4>
          <span>按最新记录倒序</span>
        </div>

        <div class="single-lead-rhythm__table">
          <div class="single-lead-rhythm__table-row single-lead-rhythm__table-row--head">
            <span>序号</span>
            <span>时间点</span>
            <span>RR(ms)</span>
          </div>

          <div
            v-for="item in intervalRows"
            :key="item.key"
            class="single-lead-rhythm__table-row"
          >
            <strong>{{ item.label }}</strong>
            <span>{{ item.timeSeconds }}s</span>
            <span>{{ item.value }}</span>
          </div>

          <div
            v-if="!intervalRows.length"
            class="single-lead-rhythm__empty"
          >
            暂无可展示的 RR 间期
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped lang="scss">
.single-lead-rhythm {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(43, 164, 113, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 251, 248, 0.96) 100%);
}

.single-lead-rhythm__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.single-lead-rhythm__eyebrow {
  margin-bottom: 8px;
  color: rgba(43, 164, 113, 0.9);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.single-lead-rhythm__title {
  margin: 0;
  font-size: 24px;
}

.single-lead-rhythm__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.58);
  font-size: 14px;
}

.single-lead-rhythm__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  span {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.88);
    color: rgba(15, 23, 42, 0.72);
    font-size: 12px;
    font-weight: 600;
  }
}

.single-lead-rhythm__summary {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.single-lead-rhythm__summary-card,
.single-lead-rhythm__chart-card,
.single-lead-rhythm__table-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
}

.single-lead-rhythm__summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.single-lead-rhythm__summary-label {
  color: rgba(15, 23, 42, 0.52);
  font-size: 12px;
}

.single-lead-rhythm__summary-value {
  color: rgba(15, 23, 42, 0.92);
  font-size: 18px;
}

.single-lead-rhythm__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  min-height: 0;
}

.single-lead-rhythm__chart-card,
.single-lead-rhythm__table-card {
  padding: 18px;
}

.single-lead-rhythm__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h4 {
    margin: 0;
    font-size: 16px;
  }

  span {
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }
}

.single-lead-rhythm__chart {
  width: 100%;
  height: auto;
}

.single-lead-rhythm__table {
  display: grid;
  gap: 8px;
}

.single-lead-rhythm__table-row {
  display: grid;
  grid-template-columns: 72px 1fr 80px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.96);

  &--head {
    background: rgba(241, 245, 249, 0.96);
    color: rgba(15, 23, 42, 0.56);
    font-size: 12px;
    font-weight: 700;
  }
}

.single-lead-rhythm__empty {
  padding: 18px 14px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.96);
  color: rgba(15, 23, 42, 0.52);
  text-align: center;
}

@media (max-width: 1280px) {
  .single-lead-rhythm__summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .single-lead-rhythm__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .single-lead-rhythm {
    padding: 16px;
  }

  .single-lead-rhythm__header {
    flex-direction: column;
  }

  .single-lead-rhythm__meta {
    justify-content: flex-start;
  }

  .single-lead-rhythm__summary {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
