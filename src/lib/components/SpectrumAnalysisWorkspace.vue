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
  gap: 0;
  height: 100%;
  min-height: 0;
  padding: 0;
  background: #ffffff;

  &__mode-switch {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 54px;
    padding: 8px 12px;
  }

  &__mode-button {
    min-width: 130px;
    height: 38px;
    padding: 0 20px;
    border: 0;
    border-radius: 4px 4px 0 0;
    background: #f3f3f3;
    color: #666666;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      background: #e9edfb;
      color: #333333;
    }

    &--active {
      background: #d9e1ff;
      color: #333333;
      font-weight: 600;

      &:hover {
        background: #d9e1ff;
        color: #333333;
      }
    }
  }
}
</style>
