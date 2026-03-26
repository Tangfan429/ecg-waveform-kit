<script setup>
import { ElButton, ElMessage } from "element-plus";
import { computed, ref, useTemplateRef, watch } from "vue";
import { useWaveformSettings } from "../composables/useWaveformSettings";
import { useWaveformViewport } from "../composables/useWaveformViewport";
import { generateAllLeadsWaveform } from "../utils/mockWaveformData";
import { printStandardEcgDocument } from "../utils/standardEcgPrint";
import {
  LEAD_MODE_OPTIONS,
  getLeadModeConfig,
  getLeadModeLayoutOptions,
  getLeadModePrintMeta,
  getLeadModeWaveformData,
  isSingleLeadMode,
  normalizeLeadMode,
  normalizeLeadModeLayout,
} from "../utils/leadModes";
import {
  createWaveformContextMenuState,
  getWaveformContextMenuItemLabel,
} from "../utils/waveformContextMenu";
import {
  getLayoutConfig,
  getStandardWaveformDuration,
} from "../utils/waveformLayouts";
import ECGWaveform from "./ECGWaveform/index.vue";
import WaveformContextMenu from "./WaveformContextMenu.vue";
import WaveformSettingsDialog from "./WaveformSettingsDialog.vue";
import WaveformTimeNavigatorBar from "./WaveformTimeNavigatorBar.vue";
import WaveformToolbar from "./WaveformToolbar.vue";

defineOptions({
  name: "StandardWaveformWorkspace",
});

const props = defineProps({
  waveformData: {
    type: Object,
    default: null,
  },
  sampleRate: {
    type: Number,
    default: 500,
  },
  duration: {
    type: Number,
    default: 10,
  },
  measurementData: {
    type: Object,
    default: () => ({}),
  },
  printMeta: {
    type: Object,
    default: () => ({}),
  },
  leadMode: {
    type: String,
    default: "standard12",
  },
  leadModeOptions: {
    type: Array,
    default: () => [],
  },
  initialLayout: {
    type: String,
    default: "6x2+1R",
  },
  initialGain: {
    type: String,
    default: "10",
  },
  initialSpeed: {
    type: String,
    default: "25",
  },
  initialDisplayMode: {
    type: String,
    default: "sync",
  },
});

const emit = defineEmits(["toolbar-action", "print", "update:leadMode"]);

const workspaceRef = useTemplateRef("workspaceRef");
const waveformRef = useTemplateRef("waveformRef");

const waveformLayout = ref(
  normalizeLeadModeLayout(props.leadMode, props.initialLayout),
);
const waveformGain = ref(props.initialGain);
const waveformSpeed = ref(props.initialSpeed);
const waveformDisplayMode = ref(props.initialDisplayMode);
const isParallelRulerActive = ref(false);
const syncWindowStartMs = ref(0);

const waveformContextMenuPosition = ref({
  viewportX: 0,
  viewportY: 0,
  localX: 0,
  localY: 0,
});
const isWaveformContextMenuVisible = ref(false);
const waveformContextMenuState = ref(createWaveformContextMenuState());

const leadModeOptions = computed(() =>
  props.leadModeOptions.length ? props.leadModeOptions : LEAD_MODE_OPTIONS,
);
const resolvedLeadMode = computed(() => normalizeLeadMode(props.leadMode));
const resolvedLeadModeConfig = computed(() =>
  getLeadModeConfig(resolvedLeadMode.value),
);
const availableLayoutOptions = computed(() =>
  getLeadModeLayoutOptions(resolvedLeadMode.value),
);
const isSingleLeadView = computed(() => isSingleLeadMode(resolvedLeadMode.value));
const printActionLabel = computed(() =>
  isSingleLeadView.value ? "单导联打印待接入" : "打印波形",
);

const baseWaveformData = computed(() =>
  props.waveformData ||
  generateAllLeadsWaveform(Math.max(props.duration, 20), props.sampleRate),
);
const resolvedWaveformData = computed(() =>
  getLeadModeWaveformData(resolvedLeadMode.value, baseWaveformData.value),
);
const resolvedPrintMeta = computed(() =>
  getLeadModePrintMeta(resolvedLeadMode.value, props.printMeta),
);
const waveformDuration = computed(() =>
  getStandardWaveformDuration(waveformSpeed.value, props.duration),
);
const waveformVisibleDuration = computed(() => {
  const layoutConfig = getLayoutConfig(waveformLayout.value);
  const columns = Math.max(layoutConfig.columns || 1, 1);
  return waveformDuration.value / columns;
});
const waveformLayoutColumns = computed(() =>
  Math.max(getLayoutConfig(waveformLayout.value).columns || 1, 1),
);
const maxSyncWindowStartMs = computed(() =>
  Math.max(0, (waveformDuration.value - waveformVisibleDuration.value) * 1000),
);
const isWaveformTimeNavigatorVisible = computed(
  () =>
    waveformDisplayMode.value === "sync" &&
    ["3x4", "6x2"].includes(waveformLayout.value) &&
    maxSyncWindowStartMs.value > 0,
);
const waveformMetricRows = computed(() => ({
  showHeartRate: waveformContextMenuState.value.showRRBpm,
  showRrInterval: waveformContextMenuState.value.showRRMs,
  heartRate: [],
  rrInterval: [],
}));

const {
  reportTemplateOptions,
  waveformAppearanceConfig,
  waveformAppearanceSettings,
  waveformReportSettings,
  isWaveformSettingsDialogOpen,
  openWaveformSettingsDialog,
  applyWaveformSettings,
} = useWaveformSettings();

const {
  zoomPercent: waveformZoomPercent,
  isFullscreen: isWaveformFullscreen,
  setZoom: setWaveformZoom,
  toggleFullscreen: toggleWaveformFullscreen,
} = useWaveformViewport(workspaceRef);

const clampSyncWindowStartMs = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(maxSyncWindowStartMs.value, Math.max(0, numericValue));
};

watch(
  maxSyncWindowStartMs,
  () => {
    syncWindowStartMs.value = clampSyncWindowStartMs(syncWindowStartMs.value);
  },
  { immediate: true },
);

watch(
  () => [
    props.initialLayout,
    props.initialGain,
    props.initialSpeed,
    props.initialDisplayMode,
    props.leadMode,
  ],
  ([nextLayout, nextGain, nextSpeed, nextDisplayMode, nextLeadMode]) => {
    waveformLayout.value = normalizeLeadModeLayout(nextLeadMode, nextLayout);
    waveformGain.value = nextGain;
    waveformSpeed.value = nextSpeed;
    waveformDisplayMode.value = nextDisplayMode;
    syncWindowStartMs.value = 0;
  },
);

const closeWaveformContextMenu = () => {
  isWaveformContextMenuVisible.value = false;
};

const clearParallelRulers = () => {
  waveformRef.value?.clearParallelRulers();
};

const emitToolbarAction = (name, payload = {}) => {
  emit("toolbar-action", {
    name,
    layout: waveformLayout.value,
    gain: waveformGain.value,
    speed: waveformSpeed.value,
    displayMode: waveformDisplayMode.value,
    ...payload,
  });
};

const handleRuler = () => {
  closeWaveformContextMenu();
  isParallelRulerActive.value = !isParallelRulerActive.value;

  if (!isParallelRulerActive.value) {
    clearParallelRulers();
  }
};

const handleReanalyze = () => {
  emitToolbarAction("reanalyze");
};

const handleOpenWaveformSettings = () => {
  closeWaveformContextMenu();
  openWaveformSettingsDialog();
};

const handleWaveformContextMenu = (position) => {
  waveformContextMenuPosition.value = {
    viewportX: Number.isFinite(position?.clientX) ? position.clientX : 0,
    viewportY: Number.isFinite(position?.clientY) ? position.clientY : 0,
    localX: Number.isFinite(position?.localX) ? position.localX : 0,
    localY: Number.isFinite(position?.localY) ? position.localY : 0,
  };
  isWaveformContextMenuVisible.value = true;
};

const handleSyncWindowChange = (value) => {
  syncWindowStartMs.value = clampSyncWindowStartMs(value);
  closeWaveformContextMenu();
};

const handleWaveformContextMenuToggle = (command) => {
  if (command === "rr-bpm") {
    waveformContextMenuState.value = {
      ...waveformContextMenuState.value,
      showRRBpm: !waveformContextMenuState.value.showRRBpm,
    };
    closeWaveformContextMenu();
    return;
  }

  if (command === "rr-ms") {
    waveformContextMenuState.value = {
      ...waveformContextMenuState.value,
      showRRMs: !waveformContextMenuState.value.showRRMs,
    };
  }

  closeWaveformContextMenu();
};

const handleWaveformContextMenuSelect = (command) => {
  const label = getWaveformContextMenuItemLabel(command);

  if (!label) {
    closeWaveformContextMenu();
    return;
  }

  if (command === "refilter" || command === "rename-lead") {
    emitToolbarAction("context-action", { command, label });
    closeWaveformContextMenu();
    return;
  }

  waveformContextMenuState.value = {
    ...waveformContextMenuState.value,
    activeMode: command,
  };
  emitToolbarAction("context-mode-change", { command, label });
  closeWaveformContextMenu();
};

const handleApplyWaveformSettings = (settingsPayload) => {
  applyWaveformSettings(settingsPayload);
  ElMessage.success("波形设置已更新。");
};

const handleZoomChange = (value) => {
  setWaveformZoom(value);
  closeWaveformContextMenu();
};

const handleFullscreen = async () => {
  closeWaveformContextMenu();
  await toggleWaveformFullscreen();
};

const handlePrint = () => {
  if (isSingleLeadView.value) {
    ElMessage.info("Lead I 单导联浏览已接通，打印模板暂未单独适配。");
    return;
  }

  const success = printStandardEcgDocument({
    waveformData: resolvedWaveformData.value,
    sampleRate: props.sampleRate,
    duration: waveformDuration.value,
    gain: waveformGain.value,
    speed: waveformSpeed.value,
    appearanceSettings: waveformAppearanceConfig.value,
    measurementData: props.measurementData,
    meta: resolvedPrintMeta.value,
  });

  if (!success) {
    ElMessage.warning("当前波形无法生成打印内容。");
    return;
  }

  emit("print", {
    gain: waveformGain.value,
    speed: waveformSpeed.value,
    layout: waveformLayout.value,
  });
};

const handleGainValueChange = (value) => {
  waveformGain.value = value;
};

const handleSpeedValueChange = (value) => {
  waveformSpeed.value = value;
};

const handleLayoutValueChange = (value) => {
  waveformLayout.value = normalizeLeadModeLayout(resolvedLeadMode.value, value);
};

const handleDisplayModeValueChange = (value) => {
  waveformDisplayMode.value = value;
};

const handleLeadModeValueChange = (value) => {
  const normalizedLeadMode = normalizeLeadMode(value);
  const leadModeChanged = normalizedLeadMode !== resolvedLeadMode.value;

  waveformLayout.value = normalizeLeadModeLayout(
    normalizedLeadMode,
    props.initialLayout,
  );
  syncWindowStartMs.value = 0;
  closeWaveformContextMenu();

  if (isParallelRulerActive.value) {
    clearParallelRulers();
    isParallelRulerActive.value = false;
  }

  if (!leadModeChanged) {
    return;
  }

  emit("update:leadMode", normalizedLeadMode);
  emitToolbarAction("lead-mode-change", {
    leadMode: normalizedLeadMode,
    leadModeLabel: getLeadModeConfig(normalizedLeadMode).label,
  });
};
</script>

<template>
  <section ref="workspaceRef" class="standard-waveform-workspace">
    <header class="standard-waveform-workspace__toolbar-row">
      <WaveformToolbar
        :gain="waveformGain"
        :speed="waveformSpeed"
        :layout="waveformLayout"
        :layout-options="availableLayoutOptions"
        :display-mode="waveformDisplayMode"
        :lead-mode="resolvedLeadMode"
        :lead-mode-options="leadModeOptions"
        :zoom="waveformZoomPercent"
        :fullscreen-active="isWaveformFullscreen"
        :parallel-ruler-active="isParallelRulerActive"
        @ruler="handleRuler"
        @lead-mode-change="handleLeadModeValueChange"
        @reanalyze="handleReanalyze"
        @open-settings="handleOpenWaveformSettings"
        @zoom-change="handleZoomChange"
        @fullscreen="handleFullscreen"
        @gain-change="handleGainValueChange"
        @speed-change="handleSpeedValueChange"
        @layout-change="handleLayoutValueChange"
        @display-mode-change="handleDisplayModeValueChange"
      />

      <div class="standard-waveform-workspace__actions">
        <div class="standard-waveform-workspace__lead-mode-badge">
          <span class="standard-waveform-workspace__lead-mode-label">
            当前联动
          </span>
          <strong class="standard-waveform-workspace__lead-mode-value">
            {{ resolvedLeadModeConfig.shortLabel }}
          </strong>
        </div>

        <ElButton type="primary" plain @click="handlePrint">
          {{ printActionLabel }}
        </ElButton>
      </div>
    </header>

    <div class="standard-waveform-workspace__body">
      <div class="standard-waveform-workspace__waveform">
        <ECGWaveform
          ref="waveformRef"
          :waveform-data="resolvedWaveformData"
          :layout="waveformLayout"
          :gain="waveformGain"
          :metric-rows="waveformMetricRows"
          :speed="waveformSpeed"
          :display-mode="waveformDisplayMode"
          :duration="waveformDuration"
          :sample-rate="props.sampleRate"
          :appearance-settings="waveformAppearanceConfig"
          :zoom="waveformZoomPercent"
          :parallel-ruler-active="isParallelRulerActive"
          :sync-window-start-ms="syncWindowStartMs"
          @context-menu="handleWaveformContextMenu"
          @context-menu-close="closeWaveformContextMenu"
          @sync-window-change="handleSyncWindowChange"
        />

        <WaveformTimeNavigatorBar
          v-if="isWaveformTimeNavigatorVisible"
          :model-value="syncWindowStartMs"
          :max="maxSyncWindowStartMs"
          :visible-duration="waveformVisibleDuration * 1000"
          :total-duration="waveformDuration * 1000"
          :columns="waveformLayoutColumns"
          @update:model-value="handleSyncWindowChange"
        />
      </div>
    </div>

    <WaveformSettingsDialog
      v-model="isWaveformSettingsDialogOpen"
      :appearance-settings="waveformAppearanceSettings"
      :report-settings="waveformReportSettings"
      :template-options="reportTemplateOptions"
      @confirm="handleApplyWaveformSettings"
    />

    <WaveformContextMenu
      :visible="isWaveformContextMenuVisible"
      :viewport-x="waveformContextMenuPosition.viewportX"
      :viewport-y="waveformContextMenuPosition.viewportY"
      :checked-state="waveformContextMenuState"
      :active-mode="waveformContextMenuState.activeMode"
      @close="closeWaveformContextMenu"
      @toggle="handleWaveformContextMenuToggle"
      @select="handleWaveformContextMenuSelect"
    />
  </section>
</template>

<style scoped lang="scss">
@import "../styles/variables.scss";

.standard-waveform-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);

  &__toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    padding: $spacing-md;
    background:
      linear-gradient(180deg, rgba(250, 252, 255, 0.94) 0%, rgba(241, 246, 255, 0.96) 100%);
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-shrink: 0;
  }

  &__lead-mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    color: rgba(15, 23, 42, 0.78);
    background: rgba(239, 244, 255, 0.88);
    border: 1px solid rgba(53, 98, 236, 0.14);
  }

  &__lead-mode-label {
    font-size: 12px;
    color: rgba(15, 23, 42, 0.52);
  }

  &__lead-mode-value {
    font-size: 13px;
    color: rgba(15, 23, 42, 0.9);
  }

  &__body {
    flex: 1;
    min-height: 0;
    padding: 0;
  }

  &__waveform {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: $gray-white;
  }
}

@media (max-width: 1080px) {
  .standard-waveform-workspace {
    &__toolbar-row {
      flex-direction: column;
      align-items: stretch;
    }

    &__actions {
      justify-content: flex-end;
    }
  }
}
</style>
