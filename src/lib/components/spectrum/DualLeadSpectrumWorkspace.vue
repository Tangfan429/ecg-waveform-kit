<script setup>
import { computed } from "vue";
import SpectrumPanelCanvas from "./SpectrumPanelCanvas.vue";

defineOptions({
  name: "DualLeadSpectrumWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: null,
  },
});

const dualLeadPanels = computed(() => props.data?.panels || {});
const overlayChart = computed(() => props.data?.powerChart || null);
</script>

<template>
  <section class="dual-spectrum-workspace">
    <div class="dual-spectrum-workspace__top">
      <div class="dual-spectrum-workspace__left">
        <div class="dual-spectrum-workspace__panel">
          <SpectrumPanelCanvas
            v-bind="dualLeadPanels.phaseShift"
            :height="136"
            empty-label="当前数据源暂无双导相移图数据"
            emphasize-zero-line
          />
        </div>
        <div class="dual-spectrum-workspace__panel">
          <SpectrumPanelCanvas
            v-bind="dualLeadPanels.transferAmplitude"
            :height="136"
            empty-label="当前数据源暂无双导幅频图数据"
          />
        </div>
        <div class="dual-spectrum-workspace__panel">
          <SpectrumPanelCanvas
            v-bind="dualLeadPanels.coherence"
            :height="136"
            empty-label="当前数据源暂无相干函数数据"
          />
        </div>
      </div>

      <div class="dual-spectrum-workspace__right">
        <div class="dual-spectrum-workspace__panel">
          <SpectrumPanelCanvas
            v-bind="dualLeadPanels.impulseResponse"
            :height="203"
            axis-display="baseline"
            empty-label="当前数据源暂无脉冲响应数据"
            emphasize-zero-line
            notes-placement="top-left"
            peak-marker="max"
            title-align="right"
          />
        </div>
        <div class="dual-spectrum-workspace__panel dual-spectrum-workspace__panel--tall">
          <SpectrumPanelCanvas
            v-bind="dualLeadPanels.crossCorrelation"
            :height="205"
            axis-display="baseline"
            empty-label="当前数据源暂无互相关数据"
            emphasize-zero-line
            notes-placement="top-left"
            peak-marker="max"
            title-align="right"
          />
        </div>
      </div>
    </div>

    <div class="dual-spectrum-workspace__bottom">
      <SpectrumPanelCanvas
        v-if="overlayChart"
        v-bind="overlayChart"
        :height="318"
        empty-label="当前数据源暂无双导功率谱数据"
        legend-layout="matrix"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.dual-spectrum-workspace {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #c8cdd6;
  background: #ffffff;

  &__top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    border-bottom: 1px solid #c8cdd6;
  }

  &__left,
  &__right {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__left {
    border-right: 1px solid #c8cdd6;
  }

  &__panel {
    min-width: 0;
    border-bottom: 1px solid #c8cdd6;
    background: #ffffff;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__bottom {
    min-width: 0;
  }
}

@media (max-width: 1100px) {
  .dual-spectrum-workspace {
    &__top {
      grid-template-columns: 1fr;
    }

    &__left {
      border-right: 0;
      border-bottom: 1px solid #c8cdd6;
    }
  }
}
</style>
