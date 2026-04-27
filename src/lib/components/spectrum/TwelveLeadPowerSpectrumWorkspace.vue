<script setup>
import { computed } from "vue";
import SpectrumPanelCanvas from "./SpectrumPanelCanvas.vue";

defineOptions({
  name: "TwelveLeadPowerSpectrumWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: null,
  },
});

const charts = computed(() => (Array.isArray(props.data?.charts) ? props.data.charts : []));
</script>

<template>
  <section class="twelve-spectrum-workspace">
    <div
      v-for="chart in charts"
      :key="chart.leadName"
      class="twelve-spectrum-workspace__panel"
    >
      <SpectrumPanelCanvas
        v-bind="chart"
        :height="110"
        :empty-label="chart.emptyLabel"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.twelve-spectrum-workspace {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid #d4d4d4;
  background: #ffffff;

  &__panel {
    min-width: 0;
    border-right: 1px solid #d4d4d4;
    border-bottom: 1px solid #d4d4d4;

    &:nth-child(2n) {
      border-right: 0;
    }

    &:nth-last-child(-n + 2) {
      border-bottom: 0;
    }
  }
}

@media (max-width: 1100px) {
  .twelve-spectrum-workspace {
    grid-template-columns: 1fr;

    &__panel {
      border-right: 0;

      &:nth-last-child(-n + 2) {
        border-bottom: 1px solid #d4d4d4;
      }

      &:last-child {
        border-bottom: 0;
      }
    }
  }
}
</style>
