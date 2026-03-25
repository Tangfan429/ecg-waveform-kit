<template>
  <div class="waveform-time-navigator">
    <div class="waveform-time-navigator__meta">
      <div class="waveform-time-navigator__summary">
        <span class="waveform-time-navigator__label">时间窗口</span>
        <span class="waveform-time-navigator__value">
          {{ startLabel }} - {{ endLabel }}
        </span>
      </div>

      <div class="waveform-time-navigator__actions">
        <el-button
          text
          class="waveform-time-navigator__action"
          :disabled="isPrevDisabled"
          @click="handlePrevSegment"
        >
          上一段
        </el-button>
        <el-button
          text
          class="waveform-time-navigator__action"
          :disabled="isNextDisabled"
          @click="handleNextSegment"
        >
          下一段
        </el-button>
      </div>
    </div>

    <el-slider
      :model-value="normalizedModelValue"
      :min="0"
      :max="normalizedMax"
      :step="normalizedStep"
      :marks="sliderMarks"
      :show-tooltip="false"
      @update:model-value="handleValueChange"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";

defineOptions({
  name: "WaveformTimeNavigatorBar",
});

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 0,
  },
  visibleDuration: {
    type: Number,
    default: 0,
  },
  totalDuration: {
    type: Number,
    default: 0,
  },
  columns: {
    type: Number,
    default: 1,
  },
});

const emit = defineEmits(["update:modelValue"]);

const normalizedMax = computed(() => Math.max(0, Number(props.max) || 0));
const normalizedModelValue = computed(() => {
  const numericValue = Number(props.modelValue) || 0;
  return Math.min(normalizedMax.value, Math.max(0, numericValue));
});
const normalizedVisibleDuration = computed(() =>
  Math.max(0, Number(props.visibleDuration) || 0),
);
const normalizedTotalDuration = computed(() =>
  Math.max(normalizedVisibleDuration.value, Number(props.totalDuration) || 0),
);
const normalizedColumns = computed(() => Math.max(1, Number(props.columns) || 1));
const segmentDuration = computed(() =>
  normalizedColumns.value > 0
    ? normalizedTotalDuration.value / normalizedColumns.value
    : normalizedTotalDuration.value,
);
const normalizedStep = computed(() =>
  Math.max(50, Math.round(segmentDuration.value / 100) || 50),
);
const isPrevDisabled = computed(() => normalizedModelValue.value <= 0);
const isNextDisabled = computed(
  () => normalizedModelValue.value >= normalizedMax.value,
);

const formatSeconds = (value) =>
  `${(Math.max(0, Number(value) || 0) / 1000).toFixed(1)}s`;

const startLabel = computed(() => formatSeconds(normalizedModelValue.value));
const endLabel = computed(() =>
  formatSeconds(normalizedModelValue.value + normalizedVisibleDuration.value),
);

const sliderMarks = computed(() => {
  const marks = {};
  const segmentCount = normalizedColumns.value;

  // Align marks with each column's time-window start so multi-column layouts
  // can jump and drag across later segments consistently.
  for (let index = 0; index < segmentCount; index += 1) {
    const rawValue = segmentDuration.value * index;
    const clampedValue = Math.min(normalizedMax.value, Math.max(0, rawValue));
    marks[Math.round(clampedValue)] = formatSeconds(clampedValue);
  }

  return marks;
});

const clampValue = (value) =>
  Math.min(normalizedMax.value, Math.max(0, Number(value) || 0));

const emitChange = (value) => {
  emit("update:modelValue", clampValue(value));
};

const handleValueChange = (value) => {
  emitChange(value);
};

const handlePrevSegment = () => {
  emitChange(normalizedModelValue.value - segmentDuration.value);
};

const handleNextSegment = () => {
  emitChange(normalizedModelValue.value + segmentDuration.value);
};
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.waveform-time-navigator {
  padding: 10px $spacing-md $spacing-md;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, #f5f8fe 100%);
  border-top: 1px solid rgba(53, 98, 236, 0.08);
}

.waveform-time-navigator__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  margin-bottom: $spacing-sm;
}

.waveform-time-navigator__summary {
  display: flex;
  align-items: baseline;
  gap: $spacing-xs;
  min-width: 0;
}

.waveform-time-navigator__label {
  font: $font-body-sm;
  color: $text-secondary;
}

.waveform-time-navigator__value {
  font: $font-body-md;
  color: $text-primary;
  font-weight: 600;
  white-space: nowrap;
}

.waveform-time-navigator__actions {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.waveform-time-navigator__action {
  padding: 0;
}

.waveform-time-navigator {
  :deep(.el-slider) {
    margin: 0;
  }

  :deep(.el-slider__runway) {
    height: 6px;
    background-color: rgba(15, 23, 42, 0.08);
  }

  :deep(.el-slider__bar) {
    height: 6px;
    background: linear-gradient(90deg, rgba(43, 164, 113, 0.22) 0%, rgba(43, 164, 113, 0.62) 100%);
  }

  :deep(.el-slider__button) {
    width: 14px;
    height: 14px;
    border: 2px solid #2ba471;
  }

  :deep(.el-slider__marks-text) {
    margin-top: 8px;
    font-size: 12px;
    color: $text-secondary;
  }
}
</style>
