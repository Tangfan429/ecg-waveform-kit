<template>
  <div class="average-template-toolbar">
    <div class="average-template-toolbar__left">
      <el-select
        :model-value="gain"
        class="average-template-toolbar__select"
        @change="emit('update:gain', $event)"
      >
        <el-option
          v-for="option in gainOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-select
        :model-value="speed"
        class="average-template-toolbar__select"
        @change="emit('update:speed', $event)"
      >
        <el-option
          v-for="option in speedOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <div class="average-template-toolbar__lead-group">
        <button
          v-for="lead in props.leadOptions"
          :key="lead.value"
          type="button"
          :class="[
            'lead-chip',
            { 'lead-chip--active': isLeadActive(lead.value) },
          ]"
          @click="emit('select-lead', lead.value)"
        >
          {{ lead.label }}
        </button>
      </div>

      <el-checkbox
        v-if="props.showOverlayCompare"
        :model-value="overlayCompare"
        class="average-template-toolbar__checkbox"
        @change="emit('update:overlay-compare', $event)"
      >
        {{ uiText.overlayCompare }}
      </el-checkbox>
    </div>

    <div class="average-template-toolbar__right">
      <el-button
        :class="[
          'average-template-toolbar__primary-btn',
          { 'average-template-toolbar__primary-btn--active': rulerActive },
        ]"
        :disabled="measurementActionDisabled"
        @click="emit('toggle-ruler')"
      >
        {{ uiText.ruler }}
      </el-button>

      <el-button
        class="average-template-toolbar__primary-btn"
        :disabled="measurementActionDisabled"
        @click="emit('open-measurement-data-dialog')"
      >
        {{ uiText.measurement }}
      </el-button>

      <el-button
        class="average-template-toolbar__outline-btn"
        :disabled="exportDisabled"
        @click="emit('export-measurement')"
      >
        {{ uiText.exportMeasurement }}
      </el-button>

      <el-button
        class="average-template-toolbar__outline-btn average-template-toolbar__reset-btn"
        @click="emit('reset')"
      >
        {{ uiText.reset }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { AVERAGE_TEMPLATE_LEAD_OPTIONS } from "../utils/averageTemplateMock";
import {
  AVERAGE_TEMPLATE_GAIN_OPTIONS,
  AVERAGE_TEMPLATE_SPEED_OPTIONS,
} from "../utils/averageTemplateChartConfig";

defineOptions({
  name: "AverageTemplateToolbar",
});

const props = defineProps({
  gain: {
    type: String,
    default: "100",
  },
  speed: {
    type: String,
    default: "200",
  },
  currentLead: {
    type: String,
    default: "II",
  },
  selectedLeads: {
    type: Array,
    default: () => [],
  },
  allSelected: {
    type: Boolean,
    default: false,
  },
  overlayCompare: {
    type: Boolean,
    default: false,
  },
  rulerActive: {
    type: Boolean,
    default: false,
  },
  measurementActionDisabled: {
    type: Boolean,
    default: false,
  },
  exportDisabled: {
    type: Boolean,
    default: false,
  },
  leadOptions: {
    type: Array,
    default: () => AVERAGE_TEMPLATE_LEAD_OPTIONS,
  },
  showOverlayCompare: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  "update:gain",
  "update:speed",
  "select-lead",
  "update:overlay-compare",
  "toggle-ruler",
  "open-measurement-data-dialog",
  "export-measurement",
  "reset",
]);

const uiText = {
  overlayCompare: "\u53e0\u52a0\u6bd4\u8f83",
  ruler: "\u7535\u5b50\u5c3a",
  measurement: "\u6d4b\u91cf\u6570\u636e",
  exportMeasurement: "\u5bfc\u51fa\u6d4b\u91cf\u6570\u636e",
  reset: "\u91cd\u7f6e",
};

const gainOptions = AVERAGE_TEMPLATE_GAIN_OPTIONS;
const speedOptions = AVERAGE_TEMPLATE_SPEED_OPTIONS;

const isLeadActive = (leadValue) => {
  if (props.allSelected) {
    return leadValue === "ALL";
  }

  if (props.overlayCompare) {
    return props.selectedLeads.includes(leadValue);
  }

  return props.currentLead === leadValue;
};
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.average-template-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $spacing-sm $spacing-md;
  min-height: $tabs-height;
  padding: $spacing-sm $spacing-md;
  background-color: $gray-white;

  &__left {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-sm;
    min-width: 0;
  }

  &__right {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-sm;
    flex-shrink: 0;
  }

  &__select {
    width: 124px;
    flex-shrink: 0;

    :deep(.el-input__wrapper) {
      border-radius: $radius-sm;
      box-shadow: 0 0 0 1px $gray-4 inset;
    }
  }

  &__lead-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__checkbox {
    flex-shrink: 0;
    margin-left: $spacing-xs;

    :deep(.el-checkbox__label) {
      color: $text-primary;
      white-space: nowrap;
    }
  }

  &__primary-btn,
  &__outline-btn {
    margin-left: 0;
    height: 32px;
    padding: 5px 16px;
    border-radius: $radius-md;
    font: $font-body-md;
  }

  &__primary-btn {
    color: $text-white-90;
    background-color: $brand-7-normal;
    border-color: $brand-7-normal;

    &:hover,
    &:focus-visible {
      color: $text-white-90;
      background-color: $brand-6-hover;
      border-color: $brand-6-hover;
    }

    &--active {
      background-color: $brand-6-hover;
      border-color: $brand-6-hover;
      box-shadow: 0 10px 22px rgba(52, 95, 221, 0.2);
    }
  }

  &__outline-btn {
    color: rgba(0, 0, 0, 0.8);
    background-color: $gray-white;
    border-color: $gray-6;

    &:hover,
    &:focus-visible {
      color: rgba(0, 0, 0, 0.8);
      background-color: $gray-1;
      border-color: $gray-6;
    }
  }

  &__reset-btn {
    min-width: 61px;
  }
}

.lead-chip {
  flex-shrink: 0;
  min-width: 38px;
  height: 32px;
  padding: 5px 4px;
  border: none;
  border-radius: $radius-sm;
  background-color: $gray-1;
  color: $text-primary;
  font: $font-body-md;
  line-height: 22px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: $brand-2-focus;
  }

  &--active {
    color: $text-white-90;
    background-color: #0052d9;
  }
}

:deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
