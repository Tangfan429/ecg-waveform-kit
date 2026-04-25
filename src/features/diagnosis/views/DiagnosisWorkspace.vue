<template>
  <section class="diagnosis-workspace">
    <WaveformCenter
      v-model:exam-mode="examModeModel"
      v-model:analysis-type="analysisTypeModel"
      v-model:lead-mode="leadModeModel"
      :exam-mode-options="examModeOptions"
      :analysis-tabs="analysisTabs"
      :lead-mode-options="leadModeOptions"
      :standard-waveform-data="standardWaveformData"
      :standard-sample-rate="standardSampleRate"
      :standard-duration="standardDuration"
      :measurement-data="measurementData"
      :standard-print-meta="standardPrintMeta"
      :average-template-analysis="averageTemplateAnalysis"
      :rhythm-analysis="rhythmAnalysis"
      :reports="reports"
      :spectrum-data="spectrumData"
      :high-frequency-data="highFrequencyData"
      :qt-dispersion-data="qtDispersionData"
      :vector-data="vectorData"
      @toolbar-action="handleToolbarAction"
      @print-standard="$emit('print-standard', $event)"
      @print-report="$emit('print-report', $event)"
    />

    <DiagnosisCaseCompareDialog
      v-model="isCaseCompareDialogVisible"
      :current-panel="currentComparePanel"
      :history-records="historyComparePanels"
      :current-layout="compareLayout"
      :current-gain="compareGain"
      :current-speed="compareSpeed"
      :current-display-mode="compareDisplayMode"
      :current-duration="compareDuration"
      :current-appearance-settings="compareAppearanceSettings"
    />
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import WaveformCenter from "../../../lib/components/WaveformCenter.vue";
import DiagnosisCaseCompareDialog from "../components/DiagnosisCaseCompareDialog.vue";
import {
  createCaseComparePanelModel,
  createCurrentCasePanelModel,
  createStaticCaseCompareHistoryRecords,
} from "../utils/caseCompare";

defineOptions({
  name: "DiagnosisWorkspace",
});

const examModeModel = defineModel("examMode", {
  type: String,
  default: "standard_ecg",
});
const analysisTypeModel = defineModel("analysisType", {
  type: String,
  default: "waveform",
});
const leadModeModel = defineModel("leadMode", {
  type: String,
  default: "standard12",
});

const props = defineProps({
  examModeOptions: {
    type: Array,
    default: () => [],
  },
  analysisTabs: {
    type: Array,
    default: () => [],
  },
  leadModeOptions: {
    type: Array,
    default: () => [],
  },
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
  averageTemplateAnalysis: {
    type: Object,
    default: null,
  },
  rhythmAnalysis: {
    type: Object,
    default: null,
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

const emit = defineEmits(["toolbar-action", "print-standard", "print-report"]);

const historyComparePanels = ref(
  createStaticCaseCompareHistoryRecords().map((record) => ({
    ...record,
    panel: createCaseComparePanelModel({
      caseId: record.caseId,
      patientInfo: {
        patientName: record.patientName,
        sexName: record.patientGender,
        ageDisplay: record.ageDisplay,
      },
      diagnosisDetail: {
        examTime: record.checkTime,
        diagnosisResult: record.diagnoseResult,
        featureDescription: record.featureDescription,
      },
      diagnosisResultOverride: record.diagnoseResult,
      featureDescriptionOverride: record.featureDescription,
      waveformViewModel: record.waveformViewModel,
    }),
  })),
);

const isCaseCompareDialogVisible = ref(false);
const compareLayout = ref("6x2+1R");
const compareGain = ref("10");
const compareSpeed = ref("25");
const compareDisplayMode = ref("sync");
const compareDuration = ref(0);
const compareAppearanceSettings = ref(null);

const currentCaseId = computed(
  () =>
    String(
      props.standardPrintMeta?.registrationNo ||
        props.standardPrintMeta?.patientNo ||
        "WF-CURRENT",
    ).trim() || "WF-CURRENT",
);
const currentComparePanel = computed(() =>
  createCurrentCasePanelModel({
    caseId: currentCaseId.value,
    standardPrintMeta: props.standardPrintMeta,
    waveformViewModel: {
      waveformData: props.standardWaveformData,
      measurementData: props.measurementData,
      sampleRate: props.standardSampleRate,
      duration: props.standardDuration,
      leadDisplayNames: {},
      metricRows: {
        showHeartRate: true,
        showRrInterval: true,
        heartRate: [],
        rrInterval: [],
      },
    },
  }),
);

function handleToolbarAction(payload = {}) {
  if (
    payload?.name === "compare" &&
    examModeModel.value === "standard_ecg" &&
    analysisTypeModel.value === "waveform"
  ) {
    compareLayout.value = payload.layout || "6x2+1R";
    compareGain.value = payload.gain || "10";
    compareSpeed.value = payload.speed || "25";
    compareDisplayMode.value = payload.displayMode || "sync";
    compareDuration.value = Number(payload.duration || props.standardDuration || 0);
    compareAppearanceSettings.value = payload.appearanceSettings || null;
    isCaseCompareDialogVisible.value = true;
    return;
  }

  emit("toolbar-action", payload);
}
</script>

<style lang="scss" scoped>
.diagnosis-workspace {
  min-height: 0;
}
</style>
