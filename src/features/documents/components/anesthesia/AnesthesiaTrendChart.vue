<script setup>
import { computed } from "vue";
import { createAnesthesiaTrendChartModel } from "../../utils/anesthesiaTrendChart";

defineOptions({
  name: "AnesthesiaTrendChart",
});

const props = defineProps({
  timelineSlots: {
    type: Array,
    default: () => [],
  },
  trendSeries: {
    type: Array,
    default: () => [],
  },
  width: {
    type: Number,
    default: 990,
  },
  height: {
    type: Number,
    default: 320,
  },
});

const chartModel = computed(() =>
  createAnesthesiaTrendChartModel({
    timelineSlots: props.timelineSlots,
    trendSeries: props.trendSeries,
    width: props.width,
    height: props.height,
  }),
);
</script>

<template>
  <svg
    class="anesthesia-trend-chart"
    :viewBox="`0 0 ${chartModel.width} ${chartModel.height}`"
    aria-label="术中生命体征趋势图"
    role="img"
  >
    <g class="anesthesia-trend-chart__grid">
      <g v-for="line in chartModel.bpHorizontalLines" :key="`bp-${line.value}`">
        <line
          :x1="chartModel.chartPadding.left"
          :y1="line.y"
          :x2="chartModel.width - chartModel.chartPadding.right"
          :y2="line.y"
        />
        <text x="8" :y="line.y + 4">{{ line.value }}</text>
      </g>

      <g v-for="line in chartModel.pulseHorizontalLines" :key="`pulse-${line.value}`">
        <line
          :x1="chartModel.chartPadding.left"
          :y1="line.y"
          :x2="chartModel.width - chartModel.chartPadding.right"
          :y2="line.y"
          class="anesthesia-trend-chart__grid-line--dashed"
        />
      </g>

      <line
        v-for="line in chartModel.verticalLines"
        :key="`vertical-${line.x}`"
        :x1="line.x"
        :y1="line.y1"
        :x2="line.x"
        :y2="line.y2"
      />
    </g>

    <g class="anesthesia-trend-chart__series">
      <path
        v-if="chartModel.pulsePath"
        :d="chartModel.pulsePath"
        class="anesthesia-trend-chart__pulse-path"
      />

      <circle
        v-for="point in chartModel.pulsePoints"
        :key="`pulse-point-${point.x}`"
        :cx="point.x"
        :cy="point.y"
        r="3.4"
        class="anesthesia-trend-chart__pulse-point"
      />

      <g v-for="segment in chartModel.bpSegments" :key="`bp-segment-${segment.x}`">
        <line
          :x1="segment.x"
          :y1="segment.systolicY"
          :x2="segment.x"
          :y2="segment.diastolicY"
          class="anesthesia-trend-chart__bp-line"
        />
        <circle
          :cx="segment.x"
          :cy="segment.systolicY"
          r="3.8"
          class="anesthesia-trend-chart__bp-point"
        />
        <circle
          :cx="segment.x"
          :cy="segment.diastolicY"
          r="3.8"
          class="anesthesia-trend-chart__bp-point anesthesia-trend-chart__bp-point--secondary"
        />
      </g>
    </g>

    <g class="anesthesia-trend-chart__labels">
      <text x="8" :y="chartModel.bpZone.top - 6">血压</text>
      <text x="8" :y="chartModel.pulseZone.top - 6">脉搏</text>
      <text
        v-for="slot in chartModel.slotPositions"
        :key="`slot-${slot.label}`"
        :x="slot.x"
        :y="chartModel.height - 16"
        text-anchor="middle"
      >
        {{ slot.label }}
      </text>
    </g>
  </svg>
</template>

<style scoped lang="scss">
.anesthesia-trend-chart {
  width: 100%;
  height: auto;
  display: block;

  &__grid {
    line,
    text {
      stroke: rgba(15, 23, 42, 0.14);
      fill: rgba(15, 23, 42, 0.56);
      font-size: 12px;
    }
  }

  &__grid-line--dashed {
    stroke-dasharray: 4 4;
  }

  &__pulse-path {
    fill: none;
    stroke: #2ba471;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__pulse-point {
    fill: #2ba471;
  }

  &__bp-line {
    stroke: #2563eb;
    stroke-width: 2;
  }

  &__bp-point {
    fill: #2563eb;

    &--secondary {
      fill: #60a5fa;
    }
  }

  &__labels text {
    fill: rgba(15, 23, 42, 0.58);
    font-size: 12px;
  }
}
</style>
