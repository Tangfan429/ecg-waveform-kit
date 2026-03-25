<script setup>
import { computed } from "vue";

defineOptions({
  name: "VectorEcgWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      title: "心电向量",
      subtitle: "用于展示额面、横面和侧面向量环的通用工作区。",
      loops: [],
      summaryRows: [],
    }),
  },
});

const chartSize = Object.freeze({
  width: 280,
  height: 280,
});

const normalizedLoops = computed(() => {
  const loops = Array.isArray(props.data.loops) ? props.data.loops : [];

  return loops.map((loop) => {
    const points = Array.isArray(loop.points) ? loop.points : [];
    const maxX = Math.max(
      ...points.map((item) => Math.abs(Number(item.x) || 0)),
      1,
    );
    const maxY = Math.max(
      ...points.map((item) => Math.abs(Number(item.y) || 0)),
      1,
    );

    const normalizedPoints = points.map((point) => ({
      x: chartSize.width / 2 + ((Number(point.x) || 0) / maxX) * 90,
      y: chartSize.height / 2 - ((Number(point.y) || 0) / maxY) * 90,
    }));

    return {
      ...loop,
      path: normalizedPoints
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
        )
        .join(" "),
    };
  });
});
</script>

<template>
  <section class="vector-workspace">
    <header class="vector-workspace__header">
      <div>
        <div class="vector-workspace__eyebrow">Vector ECG</div>
        <h3 class="vector-workspace__title">{{ data.title }}</h3>
        <p class="vector-workspace__subtitle">{{ data.subtitle }}</p>
      </div>
    </header>

    <div class="vector-workspace__body">
      <div class="vector-workspace__loop-grid">
        <article
          v-for="loop in normalizedLoops"
          :key="loop.key"
          class="vector-loop-card"
        >
          <div class="vector-loop-card__header">
            <h4 class="vector-loop-card__title">{{ loop.label }}</h4>
            <span class="vector-loop-card__tag">{{ loop.plane }}</span>
          </div>

          <svg
            class="vector-loop-card__svg"
            :viewBox="`0 0 ${chartSize.width} ${chartSize.height}`"
            :aria-label="`${loop.label}-vector-loop`"
          >
            <rect width="280" height="280" rx="24" fill="#f8fbff" />
            <line
              x1="140"
              x2="140"
              y1="28"
              y2="252"
              stroke="rgba(148,163,184,0.24)"
              stroke-dasharray="4 6"
            />
            <line
              x1="28"
              x2="252"
              y1="140"
              y2="140"
              stroke="rgba(148,163,184,0.24)"
              stroke-dasharray="4 6"
            />
            <circle cx="140" cy="140" r="74" fill="none" stroke="rgba(53,98,236,0.08)" />
            <path
              :d="loop.path"
              fill="none"
              :stroke="loop.color"
              stroke-width="4"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
        </article>
      </div>

      <aside class="vector-summary-card">
        <div class="vector-summary-card__header">
          <h4 class="vector-summary-card__title">向量摘要</h4>
        </div>

        <div class="vector-summary-card__rows">
          <div
            v-for="row in data.summaryRows"
            :key="row.label"
            class="vector-summary-card__row"
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
.vector-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.1), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 250, 255, 0.96) 100%);
}

.vector-workspace__eyebrow {
  margin-bottom: 8px;
  color: rgba(14, 165, 233, 0.92);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.vector-workspace__title {
  margin: 0;
  font-size: 24px;
}

.vector-workspace__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.58);
  font-size: 14px;
}

.vector-workspace__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  min-height: 0;
}

.vector-workspace__loop-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.vector-loop-card,
.vector-summary-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
}

.vector-loop-card {
  padding: 16px;
}

.vector-loop-card__header,
.vector-summary-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.vector-loop-card__title,
.vector-summary-card__title {
  margin: 0;
  font-size: 16px;
}

.vector-loop-card__tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.08);
  color: #0284c7;
  font-size: 12px;
  font-weight: 700;
}

.vector-loop-card__svg {
  width: 100%;
  height: auto;
}

.vector-summary-card {
  padding: 18px;
}

.vector-summary-card__rows {
  display: grid;
  gap: 10px;
}

.vector-summary-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.96);

  span {
    color: rgba(15, 23, 42, 0.56);
  }
}

@media (max-width: 1200px) {
  .vector-workspace__body {
    grid-template-columns: 1fr;
  }

  .vector-workspace__loop-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .vector-workspace {
    padding: 16px;
  }
}
</style>