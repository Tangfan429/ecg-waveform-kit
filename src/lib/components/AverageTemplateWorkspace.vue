<template>
  <div class="average-template-workspace">
    <div class="average-template-workspace__waveform">
      <AverageTemplateToolbar
        :gain="gain"
        :speed="speed"
        :current-lead="currentLead"
        :selected-leads="selectedLeads"
        :all-selected="allSelected"
        :overlay-compare="overlayCompare"
        :lead-options="leadOptions"
        :show-overlay-compare="showOverlayCompare"
        @update:gain="handleGainChange"
        @update:speed="handleSpeedChange"
        @select-lead="handleLeadSelect"
        @update:overlay-compare="handleOverlayCompareChange"
        @placeholder-action="handlePlaceholderAction"
        @reset="handleReset"
      />

      <div class="average-template-workspace__chart-shell">
        <AverageTemplateChart
          :lead="currentLead"
          :gain="gain"
          :speed="speed"
          :wave-payload="chartPayload"
          :sample-rate="props.analysisData?.sampleRate"
          :overlay-compare="overlayCompare"
          :appearance-settings="props.appearanceSettings"
          :markers="markerDefinitions"
        />
      </div>
    </div>

    <el-button
      v-if="isPanelDrawerMode && !isPanelDrawerOpen"
      class="average-template-workspace__panel-trigger"
      type="primary"
      plain
      @click="toggleDiagnosisPanel"
    >
      {{ uiText.measurementPanel }}
    </el-button>

    <AverageTemplateMeasurementPanel
      v-if="!isPanelDrawerMode"
      :lead="currentLead"
      :rows="measurementRows"
    />

    <el-drawer
      v-if="isPanelDrawerMode"
      v-model="isPanelDrawerOpen"
      :title="uiText.measurementPanel"
      direction="rtl"
      :size="diagnosisPanelDrawerSize"
      append-to-body
      class="average-template-workspace__panel-drawer"
      @close="closeDiagnosisPanel"
    >
      <AverageTemplateMeasurementPanel
        :lead="currentLead"
        :rows="measurementRows"
        class="average-template-workspace__drawer-panel"
      />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useDiagnosisLayout } from "../composables/useDiagnosisLayout";
import { useAverageTemplateState } from "../composables/useAverageTemplateState";
import {
  getAverageTemplateMeasurementRows,
  getAverageTemplateWavePayload,
} from "../utils/averageTemplateMock";
import AverageTemplateChart from "./AverageTemplateChart.vue";
import AverageTemplateMeasurementPanel from "./AverageTemplateMeasurementPanel.vue";
import AverageTemplateToolbar from "./AverageTemplateToolbar.vue";

defineOptions({
  name: "AverageTemplateWorkspace",
});

const props = defineProps({
  appearanceSettings: {
    type: Object,
    default: () => ({}),
  },
  analysisData: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["toolbar-action", "reset"]);

const {
  isPanelDrawerMode,
  diagnosisPanelDrawerSize,
  isDiagnosisPanelOpen: isPanelDrawerOpen,
  closeDiagnosisPanel,
  toggleDiagnosisPanel,
} = useDiagnosisLayout();

const uiText = {
  measurementPanel: "测量参数",
};

const {
  gain,
  speed,
  currentLead,
  selectedLeads,
  allSelected,
  overlayCompare,
  leadOptions,
  selectLead,
  setOverlayCompare,
  resetControls,
} = useAverageTemplateState({
  leadOptions: computed(() => props.analysisData?.leadOptions),
  defaultLead: computed(() => props.analysisData?.defaultLead),
});

const chartPayload = computed(() => {
  if (!props.analysisData?.wavesByLead) {
    return getAverageTemplateWavePayload(currentLead.value, selectedLeads.value);
  }

  const selectedDisplayLeads = selectedLeads.value.filter((leadValue) =>
    Object.prototype.hasOwnProperty.call(props.analysisData.wavesByLead, leadValue),
  );
  const safeDisplayLeads = selectedDisplayLeads.length
    ? selectedDisplayLeads
    : [props.analysisData.defaultLead || currentLead.value];
  const focusLead = safeDisplayLeads.includes(currentLead.value)
    ? currentLead.value
    : safeDisplayLeads[safeDisplayLeads.length - 1];

  return {
    focusLead,
    lines: safeDisplayLeads
      .map((leadValue) => ({
        id: leadValue,
        lead: leadValue,
        isPrimary: leadValue === focusLead,
        wave: props.analysisData.wavesByLead?.[leadValue] || [],
      }))
      .sort((left, right) => Number(left.isPrimary) - Number(right.isPrimary)),
  };
});

const measurementRows = computed(() => {
  if (!props.analysisData?.measurementRowsByLead) {
    return getAverageTemplateMeasurementRows(currentLead.value);
  }

  return props.analysisData.measurementRowsByLead?.[currentLead.value] || [];
});

const markerDefinitions = computed(() => props.analysisData?.markers || []);
const showOverlayCompare = computed(
  () =>
    Array.isArray(leadOptions.value) &&
    leadOptions.value.filter((item) => item?.value !== "ALL").length > 1,
);

const handlePlaceholderAction = (action) => {
  emit("toolbar-action", { action });
};

const handleGainChange = (value) => {
  gain.value = value;
};

const handleSpeedChange = (value) => {
  speed.value = value;
};

const handleLeadSelect = (value) => {
  selectLead(value);
};

const handleOverlayCompareChange = (value) => {
  setOverlayCompare(value);
};

const handleReset = () => {
  resetControls();
  emit("reset");
};
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.average-template-workspace {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background-color: $gray-white;
  overflow: hidden;

  &__waveform {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  &__chart-shell {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__panel-trigger {
    position: absolute;
    top: 50%;
    right: 0;
    z-index: 2;
    height: auto;
    min-height: 132px;
    padding: $spacing-md $spacing-xs;
    border-radius: 12px 0 0 12px;
    transform: translateY(-50%);
    writing-mode: vertical-rl;
    letter-spacing: 2px;
    box-shadow: 0 8px 20px rgba(52, 95, 221, 0.16);
  }

  &__panel-drawer {
    :deep(.el-drawer__header) {
      margin-bottom: 0;
      padding: $spacing-md $spacing-lg 0;
    }

    :deep(.el-drawer__body) {
      padding: 0;
      overflow: hidden;
    }
  }

  &__drawer-panel {
    width: 100%;
    height: 100%;
    border-left: none;
  }
}
</style>
