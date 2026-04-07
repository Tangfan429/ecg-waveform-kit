<script setup>
import { computed } from "vue";

defineOptions({
  name: "WaveformWorkspaceSidebar",
});

const props = defineProps({
  overviewItems: {
    type: Array,
    default: () => [],
  },
  metricItems: {
    type: Array,
    default: () => [],
  },
  patientItems: {
    type: Array,
    default: () => [],
  },
  diagnosisLines: {
    type: Array,
    default: () => [],
  },
  tips: {
    type: Array,
    default: () => [],
  },
});

const visibleMetricItems = computed(() =>
  props.metricItems.filter((item) => item?.value && item.value !== "--"),
);
const visiblePatientItems = computed(() =>
  props.patientItems.filter((item) => item?.value && item.value !== "--"),
);
const visibleDiagnosisLines = computed(() =>
  props.diagnosisLines
    .map((line) => String(line || "").trim())
    .filter(Boolean),
);
</script>

<template>
  <aside class="waveform-workspace-sidebar">
    <section class="waveform-workspace-sidebar__card">
      <header class="waveform-workspace-sidebar__card-header">
        <span class="waveform-workspace-sidebar__eyebrow">ECG Workspace</span>
        <h3 class="waveform-workspace-sidebar__title">当前视图</h3>
      </header>
      <dl class="waveform-workspace-sidebar__meta-list">
        <div
          v-for="item in overviewItems"
          :key="item.label"
          class="waveform-workspace-sidebar__meta-item"
        >
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>
    </section>

    <section class="waveform-workspace-sidebar__card">
      <header class="waveform-workspace-sidebar__card-header">
        <span class="waveform-workspace-sidebar__eyebrow">Measurements</span>
        <h3 class="waveform-workspace-sidebar__title">关键测量</h3>
      </header>
      <div
        v-if="visibleMetricItems.length"
        class="waveform-workspace-sidebar__metric-grid"
      >
        <article
          v-for="item in visibleMetricItems"
          :key="item.label"
          class="waveform-workspace-sidebar__metric-card"
        >
          <span class="waveform-workspace-sidebar__metric-label">
            {{ item.label }}
          </span>
          <strong class="waveform-workspace-sidebar__metric-value">
            {{ item.value }}
          </strong>
        </article>
      </div>
      <p v-else class="waveform-workspace-sidebar__empty">
        当前记录暂无结构化测量结果。
      </p>
    </section>

    <section
      v-if="visiblePatientItems.length"
      class="waveform-workspace-sidebar__card"
    >
      <header class="waveform-workspace-sidebar__card-header">
        <span class="waveform-workspace-sidebar__eyebrow">Record</span>
        <h3 class="waveform-workspace-sidebar__title">患者与检查</h3>
      </header>
      <dl class="waveform-workspace-sidebar__meta-list">
        <div
          v-for="item in visiblePatientItems"
          :key="item.label"
          class="waveform-workspace-sidebar__meta-item"
        >
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>
    </section>

    <section class="waveform-workspace-sidebar__card">
      <header class="waveform-workspace-sidebar__card-header">
        <span class="waveform-workspace-sidebar__eyebrow">Interpretation</span>
        <h3 class="waveform-workspace-sidebar__title">诊断摘要</h3>
      </header>
      <ol
        v-if="visibleDiagnosisLines.length"
        class="waveform-workspace-sidebar__diagnosis-list"
      >
        <li
          v-for="line in visibleDiagnosisLines"
          :key="line"
          class="waveform-workspace-sidebar__diagnosis-item"
        >
          {{ line }}
        </li>
      </ol>
      <p v-else class="waveform-workspace-sidebar__empty">
        暂无诊断文本，可继续在报告区补充判读结论。
      </p>
    </section>

    <section class="waveform-workspace-sidebar__card">
      <header class="waveform-workspace-sidebar__card-header">
        <span class="waveform-workspace-sidebar__eyebrow">Tips</span>
        <h3 class="waveform-workspace-sidebar__title">阅图提示</h3>
      </header>
      <ul class="waveform-workspace-sidebar__tips-list">
        <li
          v-for="tip in tips"
          :key="tip"
          class="waveform-workspace-sidebar__tip-item"
        >
          {{ tip }}
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped lang="scss">
.waveform-workspace-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 320px;
  min-width: 320px;
  padding: 18px 18px 20px;
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.96) 0%, rgba(239, 245, 255, 0.88) 100%);
  border-left: 1px solid rgba(148, 163, 184, 0.18);
  overflow-y: auto;
}

.waveform-workspace-sidebar__card {
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.12),
    0 16px 32px rgba(15, 23, 42, 0.06);
}

.waveform-workspace-sidebar__card-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.waveform-workspace-sidebar__eyebrow {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(53, 98, 236, 0.72);
}

.waveform-workspace-sidebar__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  color: rgba(15, 23, 42, 0.92);
}

.waveform-workspace-sidebar__meta-list {
  display: grid;
  gap: 10px;
  margin: 0;
}

.waveform-workspace-sidebar__meta-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  dt {
    font-size: 12px;
    color: rgba(15, 23, 42, 0.48);
  }

  dd {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: rgba(15, 23, 42, 0.88);
    text-align: right;
  }
}

.waveform-workspace-sidebar__metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.waveform-workspace-sidebar__metric-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(244, 248, 255, 0.96) 0%, rgba(235, 243, 255, 0.86) 100%);
}

.waveform-workspace-sidebar__metric-label {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.52);
}

.waveform-workspace-sidebar__metric-value {
  font-size: 18px;
  line-height: 1.1;
  color: rgba(23, 37, 84, 0.92);
}

.waveform-workspace-sidebar__diagnosis-list,
.waveform-workspace-sidebar__tips-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
}

.waveform-workspace-sidebar__diagnosis-item,
.waveform-workspace-sidebar__tip-item {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(15, 23, 42, 0.74);
}

.waveform-workspace-sidebar__empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(15, 23, 42, 0.52);
}
</style>
