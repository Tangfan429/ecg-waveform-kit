<template>
  <el-dialog
    v-model="dialogVisible"
    title="病历比较"
    class="diagnosis-case-compare-dialog"
    :width="dialogWidth"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @open="handleDialogOpen"
  >
    <div class="diagnosis-case-compare-dialog__toolbar">
      <el-select
        v-model="compareLayout"
        class="diagnosis-case-compare-dialog__layout-select"
      >
        <el-option
          v-for="option in layoutOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-button type="primary" @click="pickerVisible = true">
        切换对比
      </el-button>
    </div>

    <div class="diagnosis-case-compare-dialog__content">
      <DiagnosisCaseComparePanel
        :panel="currentPanel"
        :layout="compareLayout"
        :gain="currentGain"
        :speed="currentSpeed"
        :display-mode="currentDisplayMode"
        :duration="currentDuration"
        :appearance-settings="currentAppearanceSettings"
        :zoom="compareWaveformZoom"
        :sync-window-start-ms="compareSyncWindowStartMs"
        @sync-window-change="compareSyncWindowStartMs = $event"
      />

      <DiagnosisCaseComparePanel
        :panel="compareTargetPanel"
        :layout="compareLayout"
        :gain="currentGain"
        :speed="currentSpeed"
        :display-mode="currentDisplayMode"
        :duration="currentDuration"
        :appearance-settings="currentAppearanceSettings"
        :zoom="compareWaveformZoom"
        :sync-window-start-ms="compareSyncWindowStartMs"
        @sync-window-change="compareSyncWindowStartMs = $event"
        empty-text="暂无可对比波形"
      />
    </div>

    <DiagnosisCaseComparePickerDialog
      v-model="pickerVisible"
      :records="historyRecords"
      :exclude-case-id="currentPanel?.caseId"
      :selected-case-id="compareTargetCaseId"
      @confirm="handleConfirmCompareCase"
    />
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import DiagnosisCaseComparePanel from "./DiagnosisCaseComparePanel.vue";
import DiagnosisCaseComparePickerDialog from "./DiagnosisCaseComparePickerDialog.vue";
import {
  CASE_COMPARE_LAYOUT_OPTIONS,
  resolveCaseCompareRowId,
  resolveDefaultCompareCaseId,
} from "../utils/caseCompare";

defineOptions({
  name: "DiagnosisCaseCompareDialog",
});

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  currentPanel: {
    type: Object,
    default: null,
  },
  historyRecords: {
    type: Array,
    default: () => [],
  },
  currentLayout: {
    type: String,
    default: "6x2+1R",
  },
  currentGain: {
    type: String,
    default: "10",
  },
  currentSpeed: {
    type: String,
    default: "25",
  },
  currentDisplayMode: {
    type: String,
    default: "sync",
  },
  currentDuration: {
    type: Number,
    default: 0,
  },
  currentAppearanceSettings: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue"]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const dialogWidth = "calc(100vw - 48px)";
const layoutOptions = CASE_COMPARE_LAYOUT_OPTIONS;
const compareLayout = ref(props.currentLayout);
const pickerVisible = ref(false);
const compareTargetCaseId = ref("");
const compareSyncWindowStartMs = ref(0);

const compareTargetPanel = computed(
  () =>
    props.historyRecords.find(
      (record) => resolveCaseCompareRowId(record) === compareTargetCaseId.value,
    )?.panel || null,
);

const compareWaveformZoom = computed(() => {
  const zoomMap = {
    "12x1": 88,
    "6x1": 88,
    "6x2": 78,
    "6x2+1R": 74,
    "3x4": 82,
    "3x4+1R": 76,
    "3x4+3R": 70,
  };

  return zoomMap[compareLayout.value] || 76;
});

function resetCompareState() {
  pickerVisible.value = false;
  compareTargetCaseId.value = "";
  compareSyncWindowStartMs.value = 0;
}

function handleDialogOpen() {
  compareLayout.value = props.currentLayout || "6x2+1R";
  compareSyncWindowStartMs.value = 0;
  compareTargetCaseId.value = resolveDefaultCompareCaseId(
    props.currentPanel?.caseId,
    props.historyRecords,
  );
}

function handleConfirmCompareCase(row) {
  compareTargetCaseId.value = resolveCaseCompareRowId(row);
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      resetCompareState();
    }
  },
);
</script>

<style lang="scss" scoped>
@import "../../../lib/styles/variables.scss";

.diagnosis-case-compare-dialog {
  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-md;
  }

  &__layout-select {
    width: 160px;
  }

  &__content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: $spacing-md;
    align-items: start;
    min-height: 0;
  }
}

@media (max-width: 1023px) {
  .diagnosis-case-compare-dialog {
    &__content {
      grid-template-columns: 1fr;
    }

    &__toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    &__layout-select {
      width: 100%;
    }
  }
}
</style>
