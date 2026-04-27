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

const TWELVE_LEAD_DISPLAY_ORDER = Object.freeze([
  "I",
  "V1",
  "II",
  "V2",
  "III",
  "V3",
  "aVR",
  "V4",
  "aVL",
  "V5",
  "aVF",
  "V6",
]);

function resolveChartLeadName(chart) {
  return String(chart?.leadName || chart?.title || "");
}

const charts = computed(() => {
  const sourceCharts = Array.isArray(props.data?.charts) ? props.data.charts : [];
  const chartMap = new Map(
    sourceCharts.map((chart) => [resolveChartLeadName(chart), chart]),
  );

  const orderedCharts = TWELVE_LEAD_DISPLAY_ORDER
    .map((leadName) => chartMap.get(leadName))
    .filter(Boolean);

  return orderedCharts.length === sourceCharts.length ? orderedCharts : sourceCharts;
});
</script>

<template>
  <section class="twelve-spectrum-workspace">
    <div
      v-for="chart in charts"
      :key="resolveChartLeadName(chart)"
      class="twelve-spectrum-workspace__panel"
    >
      <SpectrumPanelCanvas
        v-bind="chart"
        :height="138"
        :empty-label="chart.emptyLabel"
        variant="twelve-lead"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.twelve-spectrum-workspace {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  border: 1px solid #e7e7e7;
  background: #f8f8f8;

  &__panel {
    min-width: 0;
    background: #f8f8f8;
    border-right: 1px solid #e7e7e7;
    border-bottom: 1px solid #e7e7e7;

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
        border-bottom: 1px solid #e7e7e7;
      }

      &:last-child {
        border-bottom: 0;
      }
    }
  }
}
</style>
