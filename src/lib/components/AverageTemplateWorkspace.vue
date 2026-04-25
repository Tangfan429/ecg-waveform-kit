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
        :ruler-active="isRulerEnabled"
        :measurement-action-disabled="!hasTemplateData"
        :export-disabled="!hasExportableMeasurementData"
        :lead-options="leadOptions"
        :show-overlay-compare="showOverlayCompare"
        @update:gain="handleGainChange"
        @update:speed="handleSpeedChange"
        @select-lead="handleLeadSelect"
        @update:overlay-compare="handleOverlayCompareChange"
        @toggle-ruler="handleToggleRuler"
        @open-measurement-data-dialog="handleOpenMeasurementDataDialog"
        @export-measurement="handleExportMeasurement"
        @reset="handleReset"
      />

      <div class="average-template-workspace__chart-shell">
        <AverageTemplateChart
          :lead="displayLead"
          :gain="gain"
          :speed="speed"
          :wave-payload="chartPayload"
          :sample-rate="props.analysisData?.sampleRate"
          :overlay-compare="overlayCompare"
          :ruler-enabled="isRulerEnabled"
          :appearance-settings="props.appearanceSettings"
          :markers="markerDefinitions"
          @update-marker="handleMarkerUpdate"
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
      :lead="displayLead"
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
        :lead="displayLead"
        :rows="measurementRows"
        class="average-template-workspace__drawer-panel"
      />
    </el-drawer>

    <AverageTemplateMeasurementDataDialog
      v-model="measurementDataDialogVisible"
      :columns="measurementTableColumns"
      :rows="measurementDataTableRows"
    />
  </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";
import { useDiagnosisLayout } from "../composables/useDiagnosisLayout";
import { useAverageTemplateState } from "../composables/useAverageTemplateState";
import { AVERAGE_TEMPLATE_MARKERS } from "../utils/averageTemplateChartConfig";
import {
  buildAverageTemplateMeasurementRowsFromLeadState,
  buildAverageTemplateWavePayloadFromLeadStateMap,
  createAverageTemplateLeadStateMap,
  updateAverageTemplateLeadStateMarker,
} from "../utils/averageTemplateMock";
import AverageTemplateChart from "./AverageTemplateChart.vue";
import AverageTemplateMeasurementDataDialog from "./AverageTemplateMeasurementDataDialog.vue";
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

const isRulerEnabled = ref(false);
const measurementDataDialogVisible = ref(false);

const {
  gain,
  speed,
  currentLead,
  displayLead,
  selectedLeads,
  allSelected,
  overlayCompare,
  leadOptions,
  lineLeadValues,
  selectLead,
  setOverlayCompare,
  resetControls,
} = useAverageTemplateState({
  leadOptions: computed(() => props.analysisData?.leadOptions),
  defaultLead: computed(() => props.analysisData?.defaultLead),
});

const usingStaticLeadState = computed(() => !props.analysisData?.wavesByLead);
const staticLeadStateMap = ref({});

const resetStaticLeadStateMap = () => {
  staticLeadStateMap.value = createAverageTemplateLeadStateMap(
    lineLeadValues.value,
    props.analysisData?.sampleRate,
  );
};

watch(
  [lineLeadValues, () => props.analysisData?.sampleRate, usingStaticLeadState],
  ([, , isStaticMode]) => {
    if (isStaticMode) {
      resetStaticLeadStateMap();
    }
  },
  { immediate: true },
);

const chartPayload = computed(() => {
  if (usingStaticLeadState.value) {
    return buildAverageTemplateWavePayloadFromLeadStateMap(
      staticLeadStateMap.value,
      displayLead.value,
      selectedLeads.value,
    );
  }

  const selectedDisplayLeads = selectedLeads.value.filter((leadValue) =>
    Object.prototype.hasOwnProperty.call(props.analysisData.wavesByLead, leadValue),
  );
  const safeDisplayLeads = selectedDisplayLeads.length
    ? selectedDisplayLeads
    : [props.analysisData.defaultLead || displayLead.value];
  const focusLead = safeDisplayLeads.includes(displayLead.value)
    ? displayLead.value
    : safeDisplayLeads[0];

  return {
    focusLead,
    focusMarkers: {},
    sampleRate: props.analysisData?.sampleRate,
    lines: safeDisplayLeads
      .map((leadValue) => ({
        id: leadValue,
        lead: leadValue,
        isPrimary: leadValue === focusLead,
        wave: props.analysisData.wavesByLead?.[leadValue] || [],
        sampleRate: props.analysisData?.sampleRate,
      }))
      .sort((left, right) => Number(left.isPrimary) - Number(right.isPrimary)),
  };
});

const measurementRows = computed(() => {
  if (usingStaticLeadState.value) {
    return buildAverageTemplateMeasurementRowsFromLeadState(
      staticLeadStateMap.value?.[displayLead.value],
    );
  }

  return props.analysisData?.measurementRowsByLead?.[displayLead.value] || [];
});

const markerDefinitions = computed(() =>
  Array.isArray(props.analysisData?.markers) && props.analysisData.markers.length
    ? props.analysisData.markers
    : AVERAGE_TEMPLATE_MARKERS,
);
const hasTemplateData = computed(() =>
  chartPayload.value.lines.some(
    (line) => Array.isArray(line?.wave) && line.wave.length > 1,
  ),
);
const showOverlayCompare = computed(
  () =>
    Array.isArray(leadOptions.value) &&
    leadOptions.value.filter((item) => item?.value !== "ALL").length > 1,
);
const hasExportableMeasurementData = computed(
  () =>
    hasTemplateData.value &&
    measurementRows.value.some((row) => String(row?.value ?? "").trim() !== "--"),
);
const measurementTableColumns = computed(() =>
  lineLeadValues.value.map((leadValue) => ({
    key: leadValue,
    label:
      leadOptions.value.find((item) => item?.value === leadValue)?.label || leadValue,
  })),
);

const buildMeasurementDataTableRows = (rowResolver) => {
  const rowMap = new Map();

  measurementTableColumns.value.forEach((column) => {
    rowResolver(column.key).forEach((row, index) => {
      const label = String(row?.label ?? "").trim() || `指标${index + 1}`;

      if (!rowMap.has(label)) {
        rowMap.set(label, {
          label,
          values: {},
        });
      }

      rowMap.get(label).values[column.key] =
        String(row?.value ?? "").trim() || "--";
    });
  });

  return Array.from(rowMap.values()).map((row) => ({
    label: row.label,
    cells: measurementTableColumns.value.map(
      (column) => row.values[column.key] || "--",
    ),
  }));
};

const measurementDataTableRows = computed(() => {
  if (usingStaticLeadState.value) {
    return buildMeasurementDataTableRows((leadKey) =>
      buildAverageTemplateMeasurementRowsFromLeadState(
        staticLeadStateMap.value?.[leadKey],
      ),
    );
  }

  return buildMeasurementDataTableRows(
    (leadKey) => props.analysisData?.measurementRowsByLead?.[leadKey] || [],
  );
});

watch(hasTemplateData, (nextValue) => {
  if (!nextValue) {
    isRulerEnabled.value = false;
    measurementDataDialogVisible.value = false;
  }
});

const escapeCsvValue = (value) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

const buildMeasurementCsv = () => {
  const headerRows = [
    ["导联", displayLead.value],
    ["导出时间", new Date().toLocaleString()],
    [],
    ["指标", "数值"],
  ];
  const bodyRows = measurementRows.value.map((row) => [row.label, row.value]);

  return (
    "\uFEFF" +
    [...headerRows, ...bodyRows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n")
  );
};

const downloadCsv = (content, fileName) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8;",
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(objectUrl);
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

const handleMarkerUpdate = ({ leadName, markerSourceKey, sampleIndex }) => {
  if (!usingStaticLeadState.value) {
    return;
  }

  const currentLeadState = staticLeadStateMap.value?.[leadName];
  if (!currentLeadState) {
    return;
  }

  staticLeadStateMap.value = {
    ...staticLeadStateMap.value,
    [leadName]: updateAverageTemplateLeadStateMarker(
      currentLeadState,
      markerSourceKey,
      sampleIndex,
    ),
  };
};

const handleToggleRuler = () => {
  if (!hasTemplateData.value) {
    ElMessage.warning("当前暂无可测量的平均模板波形");
    return;
  }

  isRulerEnabled.value = !isRulerEnabled.value;
  emit("toolbar-action", {
    action: "ruler",
    active: isRulerEnabled.value,
  });
  ElMessage.success(isRulerEnabled.value ? "电子尺已开启" : "电子尺已关闭");
};

const handleOpenMeasurementDataDialog = () => {
  if (!hasTemplateData.value) {
    ElMessage.warning("当前暂无平均模板数据");
    return;
  }

  measurementDataDialogVisible.value = true;
  emit("toolbar-action", { action: "measurement" });
};

const handleExportMeasurement = () => {
  if (!hasExportableMeasurementData.value) {
    ElMessage.warning("当前暂无可导出的测量数据");
    return;
  }

  downloadCsv(
    buildMeasurementCsv(),
    `average-template-${displayLead.value || "lead"}.csv`,
  );
  emit("toolbar-action", { action: "export" });
  ElMessage.success("测量数据已导出");
};

const handleReset = () => {
  resetControls();
  resetStaticLeadStateMap();
  isRulerEnabled.value = false;
  measurementDataDialogVisible.value = false;
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
