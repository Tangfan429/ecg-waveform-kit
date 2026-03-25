<template>
  <div
    v-if="visible && navigatorModel"
    class="rhythm-navigator"
    :style="overlayStyle"
  >
    <div
      v-for="segment in navigatorModel.axisSegments"
      :key="segment.key"
      class="rhythm-navigator__track"
      :style="buildTrackStyle(segment, navigatorModel.railY)"
    ></div>

    <button
      type="button"
      class="rhythm-navigator__drag-target"
      :style="buildDragTargetStyle(navigatorModel)"
      aria-label="Drag rhythm time window"
      @pointerdown="handleNavigatorPointerDown"
      @pointermove="handleNavigatorPointerMove"
      @pointerup="handleNavigatorPointerUp"
      @pointercancel="handleNavigatorPointerCancel"
    >
      <span
        class="rhythm-navigator__window"
        :style="buildWindowStyle(navigatorModel)"
      ></span>
    </button>

    <template v-if="navigatorModel.useSegmentedAxis">
      <div
        v-for="tick in navigatorModel.axisTicks"
        :key="tick.key"
        class="rhythm-navigator__tick"
        :style="buildTickStyle(tick.x, navigatorModel.railY)"
      ></div>
    </template>

    <template v-else>
      <div
        class="rhythm-navigator__tick"
        :style="buildTickStyle(navigatorModel.startX, navigatorModel.railY)"
      ></div>
      <div
        class="rhythm-navigator__tick"
        :style="buildTickStyle(navigatorModel.endX, navigatorModel.railY)"
      ></div>
    </template>

    <div
      v-for="label in navigatorModel.axisLabels"
      :key="label.key"
      class="rhythm-navigator__time"
      :style="buildTimeStyle(label)"
    >
      {{ label.text }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRhythmNavigator } from "./useRhythmNavigator";

defineOptions({
  name: "WaveformRhythmNavigatorOverlay",
});

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  geometry: {
    type: Object,
    default: null,
  },
  layout: {
    type: String,
    default: "6x2+1R",
  },
  speed: {
    type: String,
    default: "25",
  },
  zoomScale: {
    type: Number,
    default: 1,
  },
  rhythmLeadName: {
    type: String,
    default: "II",
  },
  syncWindowStartMs: {
    type: Number,
    default: 0,
  },
  appearanceSettings: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["sync-window-change"]);

const {
  navigatorModel,
  handleNavigatorPointerDown,
  handleNavigatorPointerMove,
  handleNavigatorPointerUp,
  handleNavigatorPointerCancel,
} = useRhythmNavigator({
  enabled: computed(() => props.visible),
  geometry: computed(() => props.geometry),
  layout: computed(() => props.layout),
  speed: computed(() => props.speed),
  zoomScale: computed(() => props.zoomScale),
  rhythmLeadName: computed(() => props.rhythmLeadName),
  syncWindowStartMs: computed(() => props.syncWindowStartMs),
  onChange(value) {
    emit("sync-window-change", value);
  },
});

const trackColor = computed(
  () =>
    props.appearanceSettings?.timeMarkerLineColor ||
    props.appearanceSettings?.timeMarkerColor ||
    "#2BA471",
);
const textColor = computed(
  () =>
    props.appearanceSettings?.timeMarkerTextColor ||
    props.appearanceSettings?.timeMarkerColor ||
    "#2BA471",
);

const overlayStyle = computed(() => ({
  "--rhythm-navigator-track-color": trackColor.value,
  "--rhythm-navigator-text-color": textColor.value,
}));

function buildTrackStyle(segment, railY) {
  return {
    left: `${segment.x}px`,
    top: `${railY}px`,
    width: `${segment.width}px`,
  };
}

function buildDragTargetStyle(model) {
  return {
    left: `${model.startX}px`,
    top: `${model.barY}px`,
    width: `${model.windowWidth}px`,
    height: `${model.dragTargetHeight}px`,
  };
}

function buildWindowStyle(model) {
  return {
    height: `${model.barHeight}px`,
  };
}

function buildTickStyle(x, y) {
  return {
    left: `${x}px`,
    top: `${y}px`,
  };
}

function buildTimeStyle(label) {
  return {
    left: `${label.x}px`,
    top: `${label.y}px`,
    transform: label.align === "left" ? "none" : "translateX(-50%)",
    textAlign: label.align,
  };
}
</script>

<style lang="scss" scoped>
.rhythm-navigator {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  user-select: none;
  touch-action: none;
}

.rhythm-navigator__track {
  position: absolute;
  height: 1px;
  background: var(--rhythm-navigator-track-color);
}

.rhythm-navigator__drag-target {
  position: absolute;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  will-change: left;
}

.rhythm-navigator__drag-target:active {
  cursor: grabbing;
}

.rhythm-navigator__window {
  display: block;
  width: 100%;
  border-radius: 6px;
  background: linear-gradient(
    180deg,
    rgba(169, 227, 252, 0.5) 0%,
    rgba(0, 82, 217, 0.5) 100%
  );
  box-shadow: inset 0 0 0 1px rgba(53, 98, 236, 0.22);
  pointer-events: none;
}

.rhythm-navigator__tick {
  position: absolute;
  width: 1px;
  height: 10px;
  background: var(--rhythm-navigator-track-color);
  transform: translate(-50%, -100%);
}

.rhythm-navigator__time {
  position: absolute;
  color: var(--rhythm-navigator-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}
</style>