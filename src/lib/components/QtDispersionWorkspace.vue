<script setup>
import { computed } from "vue";

defineOptions({
  name: "QtDispersionWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      title: "QT离散度",
      subtitle: "从多导联 QT / QTc 差异观察复极离散性。",
      rows: [],
      summaryRows: [],
      maxLead: "",
      minLead: "",
    }),
  },
});

const sortedRows = computed(() => {
  const rows = Array.isArray(props.data.rows) ? props.data.rows : [];

  return [...rows].sort(
    (left, right) => (Number(right.qtc) || 0) - (Number(left.qtc) || 0),
  );
});

const maxQtc = computed(() =>
  Math.max(...sortedRows.value.map((item) => Number(item.qtc) || 0), 1),
);
</script>

<template>
  <section class="qt-workspace">
    <header class="qt-workspace__header">
      <div>
        <div class="qt-workspace__eyebrow">QT Dispersion</div>
        <h3 class="qt-workspace__title">{{ data.title }}</h3>
        <p class="qt-workspace__subtitle">{{ data.subtitle }}</p>
      </div>

      <div class="qt-workspace__extremes">
        <div class="qt-workspace__extreme-card">
          <span>最长导联</span>
          <strong>{{ data.maxLead }}</strong>
        </div>
        <div class="qt-workspace__extreme-card">
          <span>最短导联</span>
          <strong>{{ data.minLead }}</strong>
        </div>
      </div>
    </header>

    <div class="qt-workspace__body">
      <article class="qt-table-card">
        <div class="qt-table-card__header">
          <h4 class="qt-table-card__title">多导联 QT / QTc</h4>
        </div>

        <div class="qt-table-card__table">
          <div class="qt-table-card__row qt-table-card__row--head">
            <span>导联</span>
            <span>QT(ms)</span>
            <span>QTc(ms)</span>
            <span>离散权重</span>
          </div>

          <div
            v-for="row in sortedRows"
            :key="row.lead"
            class="qt-table-card__row"
          >
            <strong>{{ row.lead }}</strong>
            <span>{{ row.qt }}</span>
            <span>{{ row.qtc }}</span>
            <div class="qt-table-card__weight-cell">
              <div class="qt-table-card__weight-track">
                <div
                  class="qt-table-card__weight-fill"
                  :style="{ width: `${(Number(row.qtc) / maxQtc) * 100}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </article>

      <aside class="qt-summary-card">
        <div class="qt-summary-card__header">
          <h4 class="qt-summary-card__title">分析摘要</h4>
        </div>

        <div class="qt-summary-card__rows">
          <div
            v-for="row in data.summaryRows"
            :key="row.label"
            class="qt-summary-card__row"
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
.qt-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at right top, rgba(217, 70, 239, 0.08), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 247, 255, 0.96) 100%);
}

.qt-workspace__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.qt-workspace__eyebrow {
  margin-bottom: 8px;
  color: rgba(167, 85, 247, 0.9);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.qt-workspace__title {
  margin: 0;
  font-size: 24px;
}

.qt-workspace__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.58);
  font-size: 14px;
}

.qt-workspace__extremes {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 10px;
}

.qt-workspace__extreme-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(167, 85, 247, 0.08);

  span {
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }
}

.qt-workspace__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  min-height: 0;
}

.qt-table-card,
.qt-summary-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
}

.qt-table-card {
  padding: 18px;
}

.qt-table-card__header,
.qt-summary-card__header {
  margin-bottom: 14px;
}

.qt-table-card__title,
.qt-summary-card__title {
  margin: 0;
  font-size: 16px;
}

.qt-table-card__table {
  display: grid;
  gap: 8px;
}

.qt-table-card__row {
  display: grid;
  grid-template-columns: 80px 100px 100px minmax(0, 1fr);
  gap: 14px;
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

.qt-table-card__weight-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.qt-table-card__weight-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #a855f7 0%, #ec4899 100%);
}

.qt-summary-card {
  padding: 18px;
}

.qt-summary-card__rows {
  display: grid;
  gap: 10px;
}

.qt-summary-card__row {
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

@media (max-width: 1100px) {
  .qt-workspace__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .qt-workspace {
    padding: 16px;
  }

  .qt-workspace__header {
    flex-direction: column;
  }

  .qt-workspace__extremes {
    width: 100%;
  }

  .qt-table-card__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>