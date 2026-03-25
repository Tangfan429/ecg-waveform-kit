<script setup>
import { computed, useSlots } from "vue";
import AnalysisPlaceholder from "./AnalysisPlaceholder.vue";
import AnalysisTypeTabs from "./AnalysisTypeTabs.vue";
import AverageTemplateWorkspace from "./AverageTemplateWorkspace.vue";
import HighFrequencyEcgWorkspace from "./HighFrequencyEcgWorkspace.vue";
import QtDispersionWorkspace from "./QtDispersionWorkspace.vue";
import ReportWorkspace from "./ReportWorkspace.vue";
import SpectrumAnalysisWorkspace from "./SpectrumAnalysisWorkspace.vue";
import StandardWaveformWorkspace from "./StandardWaveformWorkspace.vue";
import VectorEcgWorkspace from "./VectorEcgWorkspace.vue";

defineOptions({
  name: "WaveformCenter",
});

const examModeModel = defineModel("examMode", {
  type: String,
  default: "standard_ecg",
});
const analysisTypeModel = defineModel("analysisType", {
  type: String,
  default: "waveform",
});

const props = defineProps({
  standardWaveformData: {
    type: Object,
    default: null,
  },
  standardSampleRate: {
    type: Number,
    default: 500,
  },
  standardDuration: {
    type: Number,
    default: 10,
  },
  measurementData: {
    type: Object,
    default: () => ({}),
  },
  standardPrintMeta: {
    type: Object,
    default: () => ({}),
  },
  reports: {
    type: Object,
    default: () => ({}),
  },
  spectrumData: {
    type: Object,
    default: null,
  },
  highFrequencyData: {
    type: Object,
    default: null,
  },
  qtDispersionData: {
    type: Object,
    default: null,
  },
  vectorData: {
    type: Object,
    default: null,
  },
});

const slots = useSlots();

const examModes = Object.freeze([
  { value: "standard_ecg", label: "常规心电" },
  { value: "dynamic_ecg", label: "动态心电" },
  { value: "dynamic_bp", label: "动态血压" },
]);

const analysisTabs = Object.freeze([
  { key: "waveform", label: "波形分析" },
  { key: "template", label: "平均模板" },
  { key: "rhythm", label: "节律波形" },
  { key: "spectrum", label: "频谱心电" },
  { key: "highFreq", label: "高频心电" },
  { key: "qtDispersion", label: "QT离散度" },
  { key: "vector", label: "心电向量" },
]);

const customAnalysisSlotName = computed(
  () => `analysis-${analysisTypeModel.value}`,
);
const hasCustomAnalysisSlot = computed(
  () => Boolean(slots[customAnalysisSlotName.value]),
);

const isStandardExamMode = computed(
  () => examModeModel.value === "standard_ecg",
);
const currentReport = computed(
  () => props.reports?.[examModeModel.value] || null,
);
const reportTitle = computed(() => {
  if (examModeModel.value === "dynamic_ecg") {
    return "动态心电报告";
  }

  if (examModeModel.value === "dynamic_bp") {
    return "动态血压报告";
  }

  return "动态报告";
});
const placeholderDescriptionMap = Object.freeze({
  spectrum: "预留为频谱分析画布或统计页接入点，宿主只负责统一页签与布局。",
  highFreq: "预留为高频心电分析页，可在业务项目中通过同名插槽直接接入。",
  qtDispersion: "预留为 QT 离散度分析页，适合接入表格、趋势图与批量统计结果。",
  vector: "预留为心电向量图或三维重建视图接入点。",
});
const builtinAnalysisComponentMap = Object.freeze({
  spectrum: SpectrumAnalysisWorkspace,
  highFreq: HighFrequencyEcgWorkspace,
  qtDispersion: QtDispersionWorkspace,
  vector: VectorEcgWorkspace,
});
const builtinAnalysisDataMap = computed(() => ({
  spectrum: props.spectrumData ?? undefined,
  highFreq: props.highFrequencyData ?? undefined,
  qtDispersion: props.qtDispersionData ?? undefined,
  vector: props.vectorData ?? undefined,
}));
const currentBuiltinAnalysisComponent = computed(
  () => builtinAnalysisComponentMap[analysisTypeModel.value] || null,
);
const currentBuiltinAnalysisData = computed(
  () => builtinAnalysisDataMap.value[analysisTypeModel.value],
);

const handleExamModeChange = (mode) => {
  examModeModel.value = mode;

  if (mode !== "standard_ecg") {
    analysisTypeModel.value = "waveform";
  }
};
</script>

<template>
  <section class="waveform-center">
    <header class="waveform-center__header">
      <div class="waveform-center__mode-group">
        <button
          v-for="mode in examModes"
          :key="mode.value"
          type="button"
          :class="[
            'waveform-center__mode-pill',
            {
              'waveform-center__mode-pill--active':
                examModeModel === mode.value,
            },
          ]"
          @click="handleExamModeChange(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>

      <div class="waveform-center__header-note">
        通用宿主仅保留波形、报告、打印与分析扩展入口，不内置病例收藏、会诊申请、审核保存等业务流程。
      </div>
    </header>

    <div
      v-if="isStandardExamMode"
      class="waveform-center__analysis-tabs"
    >
      <AnalysisTypeTabs
        v-model="analysisTypeModel"
        :tabs="analysisTabs"
      />
    </div>

    <div class="waveform-center__body">
      <StandardWaveformWorkspace
        v-if="isStandardExamMode && ['waveform', 'rhythm'].includes(analysisTypeModel)"
        :key="analysisTypeModel"
        :waveform-data="standardWaveformData"
        :sample-rate="standardSampleRate"
        :duration="standardDuration"
        :measurement-data="measurementData"
        :print-meta="standardPrintMeta"
        :initial-layout="analysisTypeModel === 'rhythm' ? '3x4+1R' : '6x2+1R'"
        @toolbar-action="$emit('toolbar-action', $event)"
        @print="$emit('print-standard', $event)"
      />

      <AverageTemplateWorkspace
        v-else-if="isStandardExamMode && analysisTypeModel === 'template'"
        @toolbar-action="$emit('toolbar-action', { name: 'average-template-action', ...$event })"
      />

      <slot
        v-else-if="isStandardExamMode && hasCustomAnalysisSlot"
        :name="customAnalysisSlotName"
        :analysis-type="analysisTypeModel"
      />

      <component
        :is="currentBuiltinAnalysisComponent"
        v-else-if="isStandardExamMode && currentBuiltinAnalysisComponent"
        :data="currentBuiltinAnalysisData"
      />

      <AnalysisPlaceholder
        v-else-if="isStandardExamMode"
        :title="analysisTabs.find((item) => item.key === analysisTypeModel)?.label || '分析扩展区'"
        :description="placeholderDescriptionMap[analysisTypeModel]"
      />

      <ReportWorkspace
        v-else
        :report="currentReport"
        :title="reportTitle"
        @print="$emit('print-report', $event)"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.waveform-center {
  display: flex;
  flex-direction: column;
  min-height: 720px;
  height: 100%;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(252, 253, 255, 0.96) 0%, rgba(245, 248, 255, 0.96) 100%);
  box-shadow:
    0 30px 70px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 8px 8px 16px;
  }

  &__mode-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  &__mode-pill {
    padding: 10px 16px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: rgba(15, 23, 42, 0.72);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(53, 98, 236, 0.24);
    }

    &--active {
      color: #ffffff;
      background: linear-gradient(135deg, #3562ec 0%, #2ba471 100%);
      border-color: transparent;
      box-shadow: 0 10px 24px rgba(53, 98, 236, 0.22);
    }
  }

  &__header-note {
    max-width: 640px;
    color: rgba(15, 23, 42, 0.56);
    font-size: 13px;
    text-align: right;
  }

  &__analysis-tabs {
    padding: 0 8px 14px;
  }

  &__body {
    flex: 1;
    min-height: 0;
  }
}

@media (max-width: 1024px) {
  .waveform-center {
    min-height: 680px;

    &__header {
      flex-direction: column;
      align-items: stretch;
    }

    &__header-note {
      max-width: none;
      text-align: left;
    }
  }
}

@media (max-width: 768px) {
  .waveform-center {
    min-height: 620px;
    padding: 10px;
    border-radius: 22px;

    &__mode-pill {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>