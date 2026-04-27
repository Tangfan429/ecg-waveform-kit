<script setup>
import { computed, ref, watch } from "vue";
import {
  FullScreen,
  Minus,
  Plus,
  Rank,
} from "@element-plus/icons-vue";

defineOptions({
  name: "RhythmWaveformToolbar",
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
    default: "rhythm-triple",
  },
  layoutOptions: {
    type: Array,
    default: () => [],
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
  "zoom-change",
  "fullscreen",
  "gain-change",
  "speed-change",
  "layout-change",
]);

const gainOptions = Object.freeze([
  { label: "2.5mm/mV", value: "2.5" },
  { label: "5mm/mV", value: "5" },
  { label: "10mm/mV", value: "10" },
  { label: "20mm/mV", value: "20" },
  { label: "10/5mm/mV", value: "10/5" },
]);

const speedOptions = Object.freeze([
  { label: "25mm/s", value: "25" },
  { label: "50mm/s", value: "50" },
]);

const resolvedLayoutOptions = computed(() =>
  props.layoutOptions.length
    ? props.layoutOptions
    : [
        { label: "三节律", value: "rhythm-triple" },
        { label: "一节律", value: "rhythm-single" },
      ],
);

const gainValue = ref(props.gain);
const speedValue = ref(props.speed);
const layoutValue = ref(props.layout);

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

function handleZoomOut() {
  if (!isZoomOutDisabled.value) {
    emit("zoom-change", normalizedZoom.value - 10);
  }
}

function handleZoomIn() {
  if (!isZoomInDisabled.value) {
    emit("zoom-change", normalizedZoom.value + 10);
  }
}
</script>

<template>
  <div class="rhythm-waveform-toolbar">
    <div class="rhythm-waveform-toolbar__params">
      <el-select
        v-model="gainValue"
        placeholder="增益"
        class="rhythm-waveform-toolbar__select"
        @change="emit('gain-change', $event)"
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
        class="rhythm-waveform-toolbar__select"
        @change="emit('speed-change', $event)"
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
        placeholder="节律布局"
        class="rhythm-waveform-toolbar__select rhythm-waveform-toolbar__select--layout"
        @change="emit('layout-change', $event)"
      >
        <el-option
          v-for="option in resolvedLayoutOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>

    <div class="rhythm-waveform-toolbar__tools">
      <el-tooltip
        effect="light"
        placement="top"
        :content="parallelRulerActive ? '关闭平行尺' : '开启平行尺'"
      >
        <div
          class="rhythm-waveform-toolbar__tool-btn"
          :class="{
            'rhythm-waveform-toolbar__tool-btn--active': parallelRulerActive,
          }"
          :aria-pressed="String(parallelRulerActive)"
          @click="emit('ruler')"
        >
          <el-icon><Rank /></el-icon>
          <span>平行尺</span>
        </div>
      </el-tooltip>

      <div class="rhythm-waveform-toolbar__zoom-control">
        <div
          class="rhythm-waveform-toolbar__zoom-btn"
          :class="{
            'rhythm-waveform-toolbar__zoom-btn--disabled': isZoomOutDisabled,
          }"
          @click="handleZoomOut"
        >
          <el-icon><Minus /></el-icon>
        </div>
        <div class="rhythm-waveform-toolbar__zoom-value">
          {{ normalizedZoom }}%
        </div>
        <div
          class="rhythm-waveform-toolbar__zoom-btn"
          :class="{
            'rhythm-waveform-toolbar__zoom-btn--disabled': isZoomInDisabled,
          }"
          @click="handleZoomIn"
        >
          <el-icon><Plus /></el-icon>
        </div>
      </div>

      <el-tooltip
        effect="light"
        placement="top"
        :content="fullscreenActive ? '退出全屏' : '波形区全屏'"
      >
        <div
          class="rhythm-waveform-toolbar__tool-btn rhythm-waveform-toolbar__tool-btn--icon"
          :class="{
            'rhythm-waveform-toolbar__tool-btn--active': fullscreenActive,
          }"
          @click="emit('fullscreen')"
        >
          <el-icon><FullScreen /></el-icon>
        </div>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import "../styles/variables.scss";

.rhythm-waveform-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  width: 100%;
  min-height: 52px;

  &__params,
  &__tools {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;
  }

  &__params {
    min-width: 0;
  }

  &__select {
    width: 118px;
    flex-shrink: 0;

    &--layout {
      width: 132px;
    }
  }

  &__tool-btn {
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

  &__zoom-control {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  &__zoom-btn {
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

  &__zoom-value {
    min-width: 44px;
    text-align: center;
    font: $font-body-md;
    color: $text-primary;
  }
}

@media (max-width: 900px) {
  .rhythm-waveform-toolbar {
    flex-direction: column;
    align-items: stretch;

    &__tools {
      justify-content: flex-start;
    }
  }
}
</style>
