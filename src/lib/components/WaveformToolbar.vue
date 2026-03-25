<template>
  <div class="waveform-toolbar">
    <div class="toolbar-row toolbar-row--waveform">
      <div class="waveform-params">
        <el-select
          v-model="gainValue"
          placeholder="增益"
          class="param-select"
          @change="handleGainChange"
        >
          <el-option
            v-for="option in gainOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-select
          v-model="speedValue"
          placeholder="走速"
          class="param-select"
          @change="handleSpeedChange"
        >
          <el-option
            v-for="option in speedOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-select
          v-model="layoutValue"
          placeholder="布局"
          class="param-select"
          @change="handleLayoutChange"
        >
          <el-option
            v-for="option in layoutOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-select
          v-model="displayModeValue"
          placeholder="显示模式"
          class="param-select"
          @change="handleDisplayModeChange"
        >
          <el-option label="同步模式" value="sync" />
          <el-option label="连续模式" value="async" />
        </el-select>
      </div>

      <div class="waveform-tools">
        <el-tooltip
          effect="light"
          placement="top"
          :content="parallelRulerActive ? '关闭平行尺' : '开启平行尺'"
        >
          <div
            class="tool-btn"
            :class="{ 'tool-btn--active': parallelRulerActive }"
            :aria-pressed="String(parallelRulerActive)"
            @click="handleRuler"
          >
            <el-icon><Rank /></el-icon>
            <span>平行尺</span>
          </div>
        </el-tooltip>

        <div class="tool-btn" @click="handleLeadSwitch">
          <el-icon><Switch /></el-icon>
          <span>导联切换</span>
        </div>

        <div class="tool-divider"></div>

        <div class="tool-btn" @click="handleReanalyze">
          <el-icon><Refresh /></el-icon>
          <span>重新分析</span>
        </div>

        <div class="tool-divider"></div>

        <div class="tool-btn" @click="handleOpenSettings">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </div>

        <div class="tool-divider"></div>

        <div class="zoom-control">
          <div
            class="zoom-btn"
            :class="{ 'zoom-btn--disabled': isZoomOutDisabled }"
            @click="handleZoomOut"
          >
            <el-icon><Minus /></el-icon>
          </div>
          <div class="zoom-value">{{ normalizedZoom }}%</div>
          <div
            class="zoom-btn"
            :class="{ 'zoom-btn--disabled': isZoomInDisabled }"
            @click="handleZoomIn"
          >
            <el-icon><Plus /></el-icon>
          </div>
        </div>

        <div class="tool-divider"></div>

        <el-tooltip
          effect="light"
          placement="top"
          :content="fullscreenActive ? '退出全屏' : '波形区全屏'"
        >
          <div
            class="tool-btn tool-btn--icon"
            :class="{ 'tool-btn--active': fullscreenActive }"
            @click="handleFullscreen"
          >
            <el-icon><FullScreen /></el-icon>
          </div>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import {
  FullScreen,
  Minus,
  Plus,
  Rank,
  Refresh,
  Setting,
  Switch,
} from "@element-plus/icons-vue";

defineOptions({
  name: "WaveformToolbar",
});

const props = defineProps({
  gain: {
    type: String,
    default: "10",
  },
  speed: {
    type: String,
    default: "25",
  },
  layout: {
    type: String,
    default: "6x2+1R",
  },
  displayMode: {
    type: String,
    default: "sync",
  },
  parallelRulerActive: {
    type: Boolean,
    default: false,
  },
  zoom: {
    type: Number,
    default: 100,
  },
  fullscreenActive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "ruler",
  "lead-switch",
  "reanalyze",
  "open-settings",
  "zoom-change",
  "fullscreen",
  "gain-change",
  "speed-change",
  "layout-change",
  "display-mode-change",
]);

const gainOptions = [
  { label: "2.5mm/mV", value: "2.5" },
  { label: "5mm/mV", value: "5" },
  { label: "10mm/mV", value: "10" },
  { label: "20mm/mV", value: "20" },
  { label: "10/5mm/mV", value: "10/5" },
];

const speedOptions = [
  { label: "25mm/s", value: "25" },
  { label: "50mm/s", value: "50" },
];

const layoutOptions = [
  { label: "12×1", value: "12x1" },
  { label: "3×4", value: "3x4" },
  { label: "6×2", value: "6x2" },
  { label: "3×4+1R", value: "3x4+1R" },
  { label: "3×4+3R", value: "3x4+3R" },
  { label: "6×2+1R", value: "6x2+1R" },
  { label: "6×1", value: "6x1" },
];

const gainValue = ref(props.gain);
const speedValue = ref(props.speed);
const layoutValue = ref(props.layout);
const displayModeValue = ref(props.displayMode);

const normalizedZoom = computed(() => {
  const numericValue = Number(props.zoom);

  if (!Number.isFinite(numericValue)) {
    return 100;
  }

  return Math.min(200, Math.max(50, Math.round(numericValue)));
});
const isZoomOutDisabled = computed(() => normalizedZoom.value <= 50);
const isZoomInDisabled = computed(() => normalizedZoom.value >= 200);

watch(
  () => props.gain,
  (value) => {
    gainValue.value = value;
  },
);

watch(
  () => props.speed,
  (value) => {
    speedValue.value = value;
  },
);

watch(
  () => props.layout,
  (value) => {
    layoutValue.value = value;
  },
);

watch(
  () => props.displayMode,
  (value) => {
    displayModeValue.value = value;
  },
);

const handleRuler = () => {
  emit("ruler");
};

const handleLeadSwitch = () => {
  emit("lead-switch");
};

const handleReanalyze = () => {
  emit("reanalyze");
};

const handleOpenSettings = () => {
  emit("open-settings");
};

const handleZoomOut = () => {
  if (!isZoomOutDisabled.value) {
    emit("zoom-change", normalizedZoom.value - 10);
  }
};

const handleZoomIn = () => {
  if (!isZoomInDisabled.value) {
    emit("zoom-change", normalizedZoom.value + 10);
  }
};

const handleFullscreen = () => {
  emit("fullscreen");
};

const handleGainChange = (value) => {
  emit("gain-change", value);
};

const handleSpeedChange = (value) => {
  emit("speed-change", value);
};

const handleLayoutChange = (value) => {
  emit("layout-change", value);
};

const handleDisplayModeChange = (value) => {
  emit("display-mode-change", value);
};
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.waveform-toolbar {
  width: 100%;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  min-height: 52px;
}

.waveform-params {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  min-width: 0;
  flex-wrap: wrap;
}

.param-select {
  width: 118px;
  flex-shrink: 0;
}

.waveform-tools {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  color: $text-primary;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(53, 98, 236, 0.22);
    background-color: rgba(243, 247, 255, 0.96);
  }

  &--active {
    color: $brand-7-normal;
    border-color: rgba(53, 98, 236, 0.26);
    background-color: rgba(217, 225, 255, 0.62);
  }

  &--icon {
    padding: 0 10px;
  }
}

.tool-divider {
  width: 1px;
  height: 16px;
  background: rgba(148, 163, 184, 0.24);
}

.zoom-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.zoom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  color: $text-primary;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  cursor: pointer;

  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.zoom-value {
  min-width: 44px;
  text-align: center;
  font: $font-body-md;
  color: $text-primary;
}

@media (max-width: 900px) {
  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .waveform-tools {
    justify-content: flex-start;
  }
}
</style>