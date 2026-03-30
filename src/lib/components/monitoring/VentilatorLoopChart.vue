<script setup>
import { computed } from "vue";

defineOptions({
  name: "VentilatorLoopChart",
});

const props = defineProps({
  loop: {
    type: Object,
    default: null,
  },
});

const resolvedLoop = computed(() => props.loop || {});
const points = computed(() => resolvedLoop.value.points || []);
const gridTicks = Object.freeze([0, 25, 50, 75, 100]);

const bounds = computed(() => {
  if (!points.value.length) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
    };
  }

  const xs = points.value.map((item) => item[0]);
  const ys = points.value.map((item) => item[1]);
  const rawMinX = Math.min(...xs);
  const rawMaxX = Math.max(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxY = Math.max(...ys);
  const spanX = Math.max(rawMaxX - rawMinX, 1);
  const spanY = Math.max(rawMaxY - rawMinY, 1);

  return {
    minX: rawMinX - spanX * 0.08,
    maxX: rawMaxX + spanX * 0.08,
    minY: rawMinY - spanY * 0.08,
    maxY: rawMaxY + spanY * 0.08,
  };
});

const formatValue = (value) => {
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

const polylinePoints = computed(() => {
  if (!points.value.length) {
    return "";
  }

  const spanX = Math.max(bounds.value.maxX - bounds.value.minX, 0.001);
  const spanY = Math.max(bounds.value.maxY - bounds.value.minY, 0.001);

  return points.value
    .map(([x, y]) => {
      const projectedX = ((x - bounds.value.minX) / spanX) * 100;
      const projectedY = 100 - ((y - bounds.value.minY) / spanY) * 100;

      return `${projectedX.toFixed(2)},${projectedY.toFixed(2)}`;
    })
    .join(" ");
});
</script>

<template>
  <article class="ventilator-loop-chart">
    <header class="ventilator-loop-chart__header">
      <div>
        <h3 class="ventilator-loop-chart__title">
          {{ resolvedLoop.label || resolvedLoop.key || "环图" }}
        </h3>
        <p class="ventilator-loop-chart__meta">
          X: {{ resolvedLoop.xUnit || "-" }}
          ·
          Y: {{ resolvedLoop.yUnit || "-" }}
        </p>
      </div>
    </header>

    <div class="ventilator-loop-chart__stage">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        class="ventilator-loop-chart__svg"
      >
        <g class="ventilator-loop-chart__grid">
          <line
            v-for="tick in gridTicks"
            :key="`v-${tick}`"
            :x1="tick"
            y1="0"
            :x2="tick"
            y2="100"
          />
          <line
            v-for="tick in gridTicks"
            :key="`h-${tick}`"
            x1="0"
            :y1="tick"
            x2="100"
            :y2="tick"
          />
        </g>

        <polyline
          v-if="polylinePoints"
          :points="polylinePoints"
          :stroke="resolvedLoop.color || '#4f7cff'"
          class="ventilator-loop-chart__path"
        />
      </svg>

      <div
        v-if="!polylinePoints"
        class="ventilator-loop-chart__empty"
      >
        等待环图数据
      </div>
    </div>

    <footer class="ventilator-loop-chart__footer">
      <span>Xmin {{ formatValue(bounds.minX) }}</span>
      <span>Xmax {{ formatValue(bounds.maxX) }}</span>
      <span>Ymin {{ formatValue(bounds.minY) }}</span>
      <span>Ymax {{ formatValue(bounds.maxY) }}</span>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.ventilator-loop-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(203, 213, 225, 0.92);
  border-radius: 18px;
  background: #ffffff;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__title {
    margin: 0;
    color: #0f172a;
    font-size: 15px;
    line-height: 1.1;
  }

  &__meta {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
  }

  &__stage {
    position: relative;
    overflow: hidden;
    aspect-ratio: 1.04 / 1;
    border-radius: 14px;
    border: 1px solid rgba(203, 213, 225, 0.92);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 1) 100%);
  }

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  &__grid {
    stroke: rgba(148, 163, 184, 0.32);
    stroke-width: 0.45;
  }

  &__path {
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #64748b;
    font-size: 13px;
  }

  &__footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    color: #64748b;
    font-size: 11px;
  }
}
</style>