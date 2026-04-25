<template>
  <div class="diagnosis-case-compare-panel" v-loading="loading">
    <div
      v-if="panel"
      class="diagnosis-case-compare-panel__summary"
    >
      <div class="diagnosis-case-compare-panel__col">
        <div class="diagnosis-case-compare-panel__patient-item">
          姓名:{{ panel.patientName }}
        </div>
        <div class="diagnosis-case-compare-panel__patient-item">
          性别:{{ panel.sexName }}
        </div>
        <div class="diagnosis-case-compare-panel__patient-item">
          年龄:{{ panel.ageDisplay }}
        </div>
        <div class="diagnosis-case-compare-panel__patient-item">
          日期:{{ panel.examTime }}
        </div>
      </div>

      <div
        v-for="(group, index) in metricGroups"
        :key="index"
        class="diagnosis-case-compare-panel__col"
      >
        <div
          v-for="item in group"
          :key="item.key"
          class="diagnosis-case-compare-panel__metric-item"
        >
          <span class="diagnosis-case-compare-panel__metric-label">
            {{ item.label }}
          </span>
          <el-tooltip
            :content="`${item.label} ${item.value}`"
            :disabled="!isMetricOverflowing(item.key)"
            :show-after="300"
            placement="top"
          >
            <span
              class="diagnosis-case-compare-panel__metric-value"
              @mouseenter="checkOverflow(item.key, $event)"
              @mouseleave="clearOverflow(item.key)"
            >
              {{ item.value }}
            </span>
          </el-tooltip>
        </div>
      </div>
    </div>

    <div v-if="panel" class="diagnosis-case-compare-panel__waveform">
      <ECGWaveform
        v-if="panel.hasWaveformData"
        :waveform-data="panel.waveformData"
        :lead-display-names="panel.leadDisplayNames"
        :metric-rows="panel.metricRows"
        :layout="layout"
        :gain="gain"
        :speed="speed"
        :display-mode="displayMode"
        :duration="duration"
        :sample-rate="panel.sampleRate"
        :appearance-settings="appearanceSettings"
        :zoom="zoom"
        :sync-window-start-ms="syncWindowStartMs"
        @sync-window-change="emit('sync-window-change', $event)"
      />
      <div v-else class="diagnosis-case-compare-panel__waveform-empty">
        <el-empty :description="emptyText" />
      </div>
    </div>

    <div v-if="panel" class="diagnosis-case-compare-panel__footer">
      <section class="diagnosis-case-compare-panel__text-block">
        <h3 class="diagnosis-case-compare-panel__text-title">诊断描述:</h3>
        <p class="diagnosis-case-compare-panel__text-content">
          {{ panel.diagnosisDescription }}
        </p>
      </section>

      <section class="diagnosis-case-compare-panel__text-block">
        <h3 class="diagnosis-case-compare-panel__text-title">诊断结果:</h3>
        <p class="diagnosis-case-compare-panel__text-content">
          {{ panel.diagnosisResult }}
        </p>
      </section>
    </div>

    <div v-else class="diagnosis-case-compare-panel__empty-card">
      <div class="diagnosis-case-compare-panel__empty-title">暂无对比病例</div>
      <p class="diagnosis-case-compare-panel__empty-text">
        点击“切换对比”选择静态病例，查看双栏波形与诊断结果对比。
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from "vue";
import ECGWaveform from "../../../lib/components/ECGWaveform/index.vue";
import {
  CASE_COMPARE_MEASUREMENT_ITEMS,
  formatCaseCompareMetricValue,
} from "../utils/caseCompare";

defineOptions({
  name: "DiagnosisCaseComparePanel",
});

const overflowState = reactive({});

function checkOverflow(itemKey, event) {
  const currentTarget = event.currentTarget;
  overflowState[itemKey] =
    currentTarget instanceof HTMLElement
      ? currentTarget.scrollWidth > currentTarget.clientWidth
      : false;
}

function clearOverflow(itemKey) {
  overflowState[itemKey] = false;
}

function isMetricOverflowing(itemKey) {
  return Boolean(overflowState[itemKey]);
}

const props = defineProps({
  panel: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  layout: {
    type: String,
    default: "6x2+1R",
  },
  gain: {
    type: String,
    default: "10",
  },
  speed: {
    type: String,
    default: "25",
  },
  displayMode: {
    type: String,
    default: "sync",
  },
  duration: {
    type: Number,
    default: 0,
  },
  appearanceSettings: {
    type: Object,
    default: null,
  },
  zoom: {
    type: Number,
    default: 100,
  },
  syncWindowStartMs: {
    type: Number,
    default: 0,
  },
  emptyText: {
    type: String,
    default: "当前病例暂无波形数据",
  },
});

const emit = defineEmits(["sync-window-change"]);

function formatMeasurementGroupValue(data = {}, fields = []) {
  if (!Array.isArray(fields) || !fields.length) {
    return "--";
  }

  return fields
    .map((field) => formatCaseCompareMetricValue(data[field]))
    .join(" / ");
}

const measurementItems = computed(() =>
  CASE_COMPARE_MEASUREMENT_ITEMS.map((item) => ({
    ...item,
    value: formatMeasurementGroupValue(props.panel?.measurementData, item.fields),
  })),
);

const metricGroups = computed(() => {
  const items = measurementItems.value;
  return [items.slice(0, 4), items.slice(4)];
});
</script>

<style lang="scss" scoped>
@import "../../../lib/styles/variables.scss";

.diagnosis-case-compare-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: $gray-white;
  border: 1px solid $gray-3;
  border-radius: $radius-lg;
  overflow: hidden;

  &__summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $spacing-sm $spacing-lg;
    padding: $spacing-md;
    background-color: $brand-1-light;
    border-bottom: 1px solid $gray-3;
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    min-width: 0;
  }

  &__patient-item,
  &__metric-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
    min-height: 28px;
    color: $text-primary;
    font: $font-body-md;
  }

  &__metric-label {
    flex-shrink: 0;
    color: rgba(15, 23, 42, 0.68);
  }

  &__metric-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__waveform {
    min-height: 0;
    height: 440px;
    background: #ffffff;
  }

  &__waveform-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: $spacing-lg;
  }

  &__footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $spacing-md;
    align-items: stretch;
    padding: $spacing-md;
    border-top: 1px solid $gray-3;
    background-color: rgba(248, 250, 252, 0.9);
  }

  &__text-block {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 132px;
    padding: $spacing-md;
    border: 1px solid $gray-3;
    border-radius: $radius-md;
    background: rgba(255, 255, 255, 0.92);
  }

  &__text-title {
    margin: 0 0 $spacing-xs;
    color: $text-primary;
    font: $font-title-sm;
  }

  &__text-content {
    flex: 1;
    margin: 0;
    color: rgba(15, 23, 42, 0.76);
    font: $font-body-md;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  &__empty-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    min-height: 520px;
    padding: $spacing-xl;
    text-align: center;
  }

  &__empty-title {
    color: $text-primary;
    font: $font-title-md;
  }

  &__empty-text {
    max-width: 320px;
    margin: 0;
    color: rgba(15, 23, 42, 0.58);
    font: $font-body-md;
    line-height: 1.6;
  }
}

@media (max-width: 1023px) {
  .diagnosis-case-compare-panel {
    &__summary,
    &__footer {
      grid-template-columns: 1fr;
    }

    &__waveform {
      height: 360px;
    }
  }
}
</style>
