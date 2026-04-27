<script setup>
import { computed, ref, useTemplateRef } from "vue";
import { useWaveformSettings } from "../composables/useWaveformSettings";
import { useWaveformViewport } from "../composables/useWaveformViewport";
import { getStandardWaveformDuration } from "../utils/waveformLayouts";
import ECGWaveform from "./ECGWaveform/index.vue";
import RhythmWaveformToolbar from "./RhythmWaveformToolbar.vue";
import WaveformWorkspaceSidebar from "./WaveformWorkspaceSidebar.vue";

defineOptions({
  name: "RhythmWaveformWorkspace",
});

const RHYTHM_LAYOUT_OPTIONS = Object.freeze([
  { label: "三节律", value: "rhythm-triple" },
  { label: "一节律", value: "rhythm-single" },
]);

// 节律页导联是产品固定定义，不再暴露导联自由切换。
const RHYTHM_LAYOUT_LEADS = Object.freeze({
  "rhythm-single": ["II"],
  "rhythm-triple": ["II", "V1", "V5"],
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
});

const emit = defineEmits(["toolbar-action"]);

const workspaceRef = useTemplateRef("workspaceRef");
const waveformRef = useTemplateRef("waveformRef");

const rhythmLayout = ref("rhythm-triple");
const rhythmGain = ref("10");
const rhythmSpeed = ref("25");
const isParallelRulerActive = ref(false);

const {
  waveformAppearanceConfig,
} = useWaveformSettings();

const {
  zoomPercent: waveformZoomPercent,
  isFullscreen: isWaveformFullscreen,
  setZoom: setWaveformZoom,
  toggleFullscreen: toggleWaveformFullscreen,
} = useWaveformViewport(workspaceRef);

const rhythmDuration = computed(() =>
  getStandardWaveformDuration(rhythmSpeed.value, props.duration),
);

const rhythmAppearanceConfig = computed(() => ({
  ...waveformAppearanceConfig.value,
  // 节律页不显示左上角时间，也不再绘制底部时间轴和节律导航。
  canvasTopLeftText: "",
  canvasTopRightText: "",
  showCalibrationForAllLeads: true,
  showRhythmTimeAxis: false,
  showRhythmTimeLabels: false,
}));

const resolvedWaveformData = computed(() => {
  const source = props.waveformData || {};
  const leadNames = RHYTHM_LAYOUT_LEADS[rhythmLayout.value] || RHYTHM_LAYOUT_LEADS["rhythm-triple"];

  return leadNames.reduce((result, leadName) => {
    result[leadName] = Array.isArray(source?.[leadName]) ? source[leadName] : [];
    return result;
  }, {});
});

function formatMeasurementValue(value, unit = "") {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  const normalizedValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");

  return unit ? `${normalizedValue}${unit}` : normalizedValue;
}

function formatMetaField(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || "--";
}

const sidebarOverviewItems = computed(() => [
  {
    label: "节律布局",
    value:
      RHYTHM_LAYOUT_OPTIONS.find((item) => item.value === rhythmLayout.value)?.label ||
      rhythmLayout.value,
  },
  { label: "增益", value: `${rhythmGain.value}mm/mV` },
  { label: "走速", value: `${rhythmSpeed.value}mm/s` },
  { label: "时长", value: `${rhythmDuration.value}s` },
  { label: "采样率", value: `${props.sampleRate}Hz` },
  {
    label: "显示导联",
    value: (RHYTHM_LAYOUT_LEADS[rhythmLayout.value] || []).join(" / "),
  },
]);

const sidebarMetricItems = computed(() => [
  { label: "HR", value: formatMeasurementValue(props.measurementData?.hr, " bpm") },
  { label: "PR", value: formatMeasurementValue(props.measurementData?.pr, " ms") },
  { label: "QRS", value: formatMeasurementValue(props.measurementData?.qrs, " ms") },
  { label: "QT", value: formatMeasurementValue(props.measurementData?.qt, " ms") },
  { label: "QTc", value: formatMeasurementValue(props.measurementData?.qtc, " ms") },
  {
    label: "电轴",
    value: formatMeasurementValue(props.measurementData?.qrsAxis, "°"),
  },
]);

const sidebarPatientItems = computed(() => [
  { label: "姓名", value: formatMetaField(props.printMeta?.patientName) },
  { label: "性别", value: formatMetaField(props.printMeta?.gender) },
  { label: "年龄", value: formatMetaField(props.printMeta?.age) },
  { label: "科室", value: formatMetaField(props.printMeta?.department) },
  { label: "检查时间", value: formatMetaField(props.printMeta?.examTime) },
  { label: "报告标题", value: "节律波形" },
]);

const sidebarDiagnosisLines = computed(() => {
  const diagnosisText = String(props.printMeta?.diagnosisResult || "").trim();

  if (!diagnosisText) {
    return [];
  }

  return diagnosisText
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);
});

const sidebarTips = computed(() => [
  "节律波形页固定按节律布局展示，不再混入十二导联拼接布局。",
  "平行尺仅作为测量辅助，不改变纸速、增益和导联排列。",
  "右侧信息栏保留关键测量与诊断摘要，减少阅图时来回切换。",
]);

function emitToolbarAction(name, payload = {}) {
  emit("toolbar-action", {
    name,
    layout: rhythmLayout.value,
    gain: rhythmGain.value,
    speed: rhythmSpeed.value,
    ...payload,
  });
}

function clearParallelRulers() {
  waveformRef.value?.clearParallelRulers();
}

function handleToggleRuler() {
  isParallelRulerActive.value = !isParallelRulerActive.value;

  if (!isParallelRulerActive.value) {
    clearParallelRulers();
  }

  emitToolbarAction("ruler", { active: isParallelRulerActive.value });
}

async function handleFullscreen() {
  await toggleWaveformFullscreen();
  emitToolbarAction("fullscreen", { active: isWaveformFullscreen.value });
}

function handleZoomChange(value) {
  setWaveformZoom(value);
  emitToolbarAction("zoom-change", { zoom: value });
}

function handleGainChange(value) {
  rhythmGain.value = value;
  emitToolbarAction("gain-change");
}

function handleSpeedChange(value) {
  rhythmSpeed.value = value;
  emitToolbarAction("speed-change");
}

function handleLayoutChange(value) {
  rhythmLayout.value = value;
  clearParallelRulers();
  emitToolbarAction("layout-change");
}
</script>

<template>
  <section ref="workspaceRef" class="rhythm-waveform-workspace">
    <header class="rhythm-waveform-workspace__toolbar-row">
      <RhythmWaveformToolbar
        :gain="rhythmGain"
        :speed="rhythmSpeed"
        :layout="rhythmLayout"
        :layout-options="RHYTHM_LAYOUT_OPTIONS"
        :parallel-ruler-active="isParallelRulerActive"
        :zoom="waveformZoomPercent"
        :fullscreen-active="isWaveformFullscreen"
        @ruler="handleToggleRuler"
        @zoom-change="handleZoomChange"
        @fullscreen="handleFullscreen"
        @gain-change="handleGainChange"
        @speed-change="handleSpeedChange"
        @layout-change="handleLayoutChange"
      />
    </header>

    <div class="rhythm-waveform-workspace__body">
      <div class="rhythm-waveform-workspace__waveform">
        <ECGWaveform
          ref="waveformRef"
          :waveform-data="resolvedWaveformData"
          :layout="rhythmLayout"
          :gain="rhythmGain"
          :speed="rhythmSpeed"
          display-mode="async"
          :duration="rhythmDuration"
          :sample-rate="props.sampleRate"
          :appearance-settings="rhythmAppearanceConfig"
          :zoom="waveformZoomPercent"
          :parallel-ruler-active="isParallelRulerActive"
          :show-rhythm-lead="false"
        />
      </div>

      <WaveformWorkspaceSidebar
        class="rhythm-waveform-workspace__sidebar"
        :overview-items="sidebarOverviewItems"
        :metric-items="sidebarMetricItems"
        :patient-items="sidebarPatientItems"
        :diagnosis-lines="sidebarDiagnosisLines"
        :tips="sidebarTips"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
@import "../styles/variables.scss";

.rhythm-waveform-workspace {
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
    gap: $spacing-md;
    padding: $spacing-md;
    background:
      linear-gradient(180deg, rgba(250, 252, 255, 0.94) 0%, rgba(241, 246, 255, 0.96) 100%);
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }

  &__body {
    flex: 1;
    display: flex;
    align-items: flex-start;
    min-width: 0;
    min-height: 0;
  }

  &__waveform {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    background: $gray-white;
  }

  &__sidebar {
    display: none;
  }
}

@media (min-width: 1360px) {
  .rhythm-waveform-workspace {
    &__sidebar {
      display: flex;
    }
  }
}
</style>
