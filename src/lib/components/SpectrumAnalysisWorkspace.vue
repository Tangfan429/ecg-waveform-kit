<script setup>
import { computed, ref, watch } from "vue";
import DualLeadSpectrumWorkspace from "./spectrum/DualLeadSpectrumWorkspace.vue";
import TwelveLeadPowerSpectrumWorkspace from "./spectrum/TwelveLeadPowerSpectrumWorkspace.vue";

defineOptions({
  name: "SpectrumAnalysisWorkspace",
});

const DEFAULT_MODE_OPTIONS = Object.freeze([
  { key: "dual-lead", label: "双导对应谱分析" },
  { key: "twelve-lead", label: "12导联功率谱" },
]);

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

function createEmptySpectrumData() {
  return {
    modeOptions: DEFAULT_MODE_OPTIONS,
    defaultMode: "dual-lead",
    dualLead: null,
    twelveLead: {
      charts: [],
    },
  };
}

const resolvedData = computed(() => {
  if (Array.isArray(props.data?.modeOptions) && props.data.modeOptions.length) {
    return {
      ...createEmptySpectrumData(),
      ...props.data,
    };
  }

  return createEmptySpectrumData();
});

const activeMode = ref(resolvedData.value.defaultMode);

watch(
  resolvedData,
  (nextData) => {
    const availableModes = nextData.modeOptions.map((item) => item.key);
    if (!availableModes.includes(activeMode.value)) {
      activeMode.value = nextData.defaultMode || availableModes[0] || "dual-lead";
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="spectrum-analysis-workspace">
    <div class="spectrum-analysis-workspace__mode-switch">
      <button
        v-for="option in resolvedData.modeOptions"
        :key="option.key"
        type="button"
        class="spectrum-analysis-workspace__mode-button"
        :class="{
          'spectrum-analysis-workspace__mode-button--active':
            activeMode === option.key,
        }"
        @click="activeMode = option.key"
      >
        {{ option.label }}
      </button>
    </div>

    <DualLeadSpectrumWorkspace
      v-if="activeMode === 'dual-lead'"
      :data="resolvedData.dualLead"
    />

    <TwelveLeadPowerSpectrumWorkspace
      v-else
      :data="resolvedData.twelveLead"
    />
  </section>
</template>

<style scoped lang="scss">
.spectrum-analysis-workspace {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
  padding: 0;
  background: #ffffff;

  &__mode-switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
  }

  &__mode-button {
    min-width: 130px;
    height: 36px;
    padding: 0 18px;
    border: 1px solid #d5dce8;
    border-radius: 4px;
    background: #f3f6fb;
    color: #26384f;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      border-color: #2f6fe4;
      color: #2f6fe4;
    }

    &--active {
      border-color: #1f6ed4;
      background: #1f6ed4;
      color: #ffffff;

      &:hover {
        color: #ffffff;
      }
    }
  }
}
</style>
