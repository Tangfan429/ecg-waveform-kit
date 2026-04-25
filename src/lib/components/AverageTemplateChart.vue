<template>
  <div class="average-template-chart">
    <svg
      ref="svgRef"
      class="average-template-chart__svg"
      :width="chartSize.width"
      :height="chartSize.height"
      :viewBox="`0 0 ${chartSize.width} ${chartSize.height}`"
      :style="svgCursorStyle"
      aria-label="average-template-waveform"
      @pointermove="handleMarkerPointerMove"
      @pointerup="handleMarkerPointerUp"
      @pointercancel="handleMarkerPointerCancel"
    >
      <defs>
        <clipPath id="average-template-wave-clip">
          <rect
            :x="plotArea.left"
            :y="plotArea.top"
            :width="plotArea.width"
            :height="plotArea.height"
            rx="2"
          />
        </clipPath>
      </defs>

      <rect
        :width="chartSize.width"
        :height="chartSize.height"
        :fill="chartBackgroundColor"
      />
      <rect
        :x="plotArea.left"
        :y="plotArea.top"
        :width="plotArea.width"
        :height="plotArea.height"
        :fill="chartBackgroundColor"
        :stroke="plotBorderColor"
        stroke-width="1"
      />

      <g class="average-template-chart__grid">
        <template v-if="useDottedSmallGrid">
          <rect
            v-for="dot in smallGridDots"
            :key="dot.key"
            :x="dot.x"
            :y="dot.y"
            :width="smallGridDotSize"
            :height="smallGridDotSize"
            :fill="smallGridColor"
          />
        </template>

        <template v-else>
          <line
            v-for="x in smallVerticalLines"
            :key="`small-v-${x}`"
            :x1="x"
            :x2="x"
            :y1="plotArea.top"
            :y2="plotArea.bottom"
            :stroke="smallGridColor"
            stroke-width="1"
            shape-rendering="crispEdges"
          />
          <line
            v-for="y in smallHorizontalLines"
            :key="`small-h-${y}`"
            :x1="plotArea.left"
            :x2="plotArea.right"
            :y1="y"
            :y2="y"
            :stroke="smallGridColor"
            stroke-width="1"
            shape-rendering="crispEdges"
          />
        </template>

        <line
          v-for="x in largeVerticalLines"
          :key="`large-v-${x}`"
          :x1="x"
          :x2="x"
          :y1="plotArea.top"
          :y2="plotArea.bottom"
          :stroke="largeGridColor"
          stroke-width="1"
          shape-rendering="crispEdges"
        />
        <line
          v-for="y in largeHorizontalLines"
          :key="`large-h-${y}`"
          :x1="plotArea.left"
          :x2="plotArea.right"
          :y1="y"
          :y2="y"
          :stroke="largeGridColor"
          stroke-width="1"
          shape-rendering="crispEdges"
        />
      </g>

      <g clip-path="url(#average-template-wave-clip)">
        <path
          v-for="line in chartLines"
          :key="line.id"
          :d="line.path"
          fill="none"
          :stroke="line.stroke"
          :stroke-width="line.strokeWidth"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>

      <g class="average-template-chart__markers">
        <g
          v-for="marker in markerPositions"
          :key="marker.key"
          class="average-template-chart__marker"
          :class="{
            'average-template-chart__marker--dragging':
              activeMarkerSourceKey === marker.sourceKey,
          }"
          @pointerdown="handleMarkerPointerDown(marker, $event)"
        >
          <rect
            :x="marker.x - marker.hitWidth / 2"
            :y="plotArea.top"
            :width="marker.hitWidth"
            :height="plotArea.height"
            fill="transparent"
          />
          <line
            :x1="marker.x"
            :x2="marker.x"
            :y1="plotArea.top"
            :y2="plotArea.bottom"
            :stroke="
              activeMarkerSourceKey === marker.sourceKey ? '#1F9B67' : '#2BA471'
            "
            stroke-width="1"
          />
          <rect
            :x="marker.x - marker.width / 2"
            :y="marker.labelY"
            :width="marker.width"
            height="26"
            fill="#FFFDFE"
            rx="2"
          />
          <text
            :x="marker.x"
            :y="marker.labelY + 18"
            text-anchor="middle"
            fill="rgba(0, 0, 0, 0.9)"
            font-size="14"
            font-family="PingFang SC, Microsoft YaHei, sans-serif"
            font-weight="400"
          >
            {{ marker.key }}
          </text>
        </g>
      </g>

      <text
        :x="plotArea.left + 18"
        :y="plotArea.top + 56"
        fill="rgba(0, 0, 0, 0.9)"
        font-size="14"
        font-family="PingFang SC, Microsoft YaHei, sans-serif"
        font-weight="600"
      >
        {{ leadDisplayLabel }}
      </text>
    </svg>

    <!-- 电子尺覆盖层独立于 SVG 渲染，避免拖拽时重复计算路径。 -->
    <AverageTemplateRulerOverlay
      :ruler-enabled="rulerEnabled"
      :speed="speed"
      :gain="gain"
      :has-wave-data="hasWaveData"
      :wave-key="waveKey"
    />
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from "vue";
import {
  AVERAGE_TEMPLATE_CHART_SIZE,
  AVERAGE_TEMPLATE_MARKERS,
  AVERAGE_TEMPLATE_PLOT_AREA,
  AVERAGE_TEMPLATE_SAMPLE_RATE,
  AVERAGE_TEMPLATE_WAVE_LAYOUT,
  getAverageTemplatePixelsPerMv,
  getAverageTemplatePixelsPerSecond,
} from "../utils/averageTemplateChartConfig";
import AverageTemplateRulerOverlay from "./AverageTemplateRulerOverlay.vue";

defineOptions({
  name: "AverageTemplateChart",
});

const emit = defineEmits(["update-marker"]);

const GRID_RENDER_PRESET_DOTTED_SMALL = "dotted-small";
const DEFAULT_CHART_BACKGROUND_COLOR = "#FFFCFC";
const DEFAULT_PLOT_BORDER_COLOR = "#F2DEDE";
const DEFAULT_SMALL_GRID_COLOR = "#FAEEEE";
const DEFAULT_LARGE_GRID_COLOR = "#F3E0E0";
const DEFAULT_SMALL_GRID_DOT_SIZE = 1.2;

const props = defineProps({
  lead: {
    type: String,
    default: "II",
  },
  sampleRate: {
    type: Number,
    default: AVERAGE_TEMPLATE_SAMPLE_RATE,
  },
  gain: {
    type: String,
    default: "100",
  },
  speed: {
    type: String,
    default: "200",
  },
  wavePayload: {
    type: Object,
    default: () => ({
      focusLead: "II",
      focusMarkers: {},
      lines: [],
    }),
  },
  overlayCompare: {
    type: Boolean,
    default: false,
  },
  rulerEnabled: {
    type: Boolean,
    default: false,
  },
  appearanceSettings: {
    type: Object,
    default: () => ({}),
  },
  markers: {
    type: Array,
    default: () => AVERAGE_TEMPLATE_MARKERS,
  },
});

const chartSize = AVERAGE_TEMPLATE_CHART_SIZE;
const plotArea = AVERAGE_TEMPLATE_PLOT_AREA;
const svgRef = ref(null);
const activeMarkerSourceKey = ref("");
const svgCursorStyle = computed(() => ({
  cursor: activeMarkerSourceKey.value ? "grabbing" : undefined,
}));

let draggingMarkerSourceKey = "";
let draggingPointerId = null;
let cachedSvgRect = null;
let pendingMarkerUpdate = null;
let rafId = null;

const gridRenderPreset = computed(
  () => props.appearanceSettings?.gridRenderPreset || "dotted-small",
);
const useDottedSmallGrid = computed(
  () => gridRenderPreset.value === GRID_RENDER_PRESET_DOTTED_SMALL,
);
const chartBackgroundColor = computed(
  () => props.appearanceSettings?.backgroundColor || DEFAULT_CHART_BACKGROUND_COLOR,
);
const smallGridColor = computed(
  () => props.appearanceSettings?.smallGridColor || DEFAULT_SMALL_GRID_COLOR,
);
const largeGridColor = computed(
  () => props.appearanceSettings?.largeGridColor || DEFAULT_LARGE_GRID_COLOR,
);
const plotBorderColor = computed(
  () => props.appearanceSettings?.largeGridColor || DEFAULT_PLOT_BORDER_COLOR,
);
const smallGridDotSize = computed(() => DEFAULT_SMALL_GRID_DOT_SIZE);

const createLinePositions = (start, end, step) => {
  const positions = [];

  for (let current = start; current <= end + 0.001; current += step) {
    positions.push(Number(current.toFixed(1)));
  }

  return positions;
};

const isOnLargeGrid = (position, origin, largeGridSize) => {
  const offset = Math.abs((Number(position) || 0) - (Number(origin) || 0));
  const safeLargeGridSize = Math.max(1, Number(largeGridSize) || 1);
  const remainder = offset % safeLargeGridSize;
  return remainder < 0.001 || safeLargeGridSize - remainder < 0.001;
};

const smallVerticalLines = createLinePositions(
  plotArea.left,
  plotArea.right,
  plotArea.smallGridSize,
);
const smallHorizontalLines = createLinePositions(
  plotArea.top,
  plotArea.bottom,
  plotArea.smallGridSize,
);
const largeVerticalLines = createLinePositions(
  plotArea.left,
  plotArea.right,
  plotArea.largeGridSize,
);
const largeHorizontalLines = createLinePositions(
  plotArea.top,
  plotArea.bottom,
  plotArea.largeGridSize,
);
const smallGridDots = computed(() => {
  const halfDotSize = smallGridDotSize.value / 2;
  const dots = [];

  smallVerticalLines.forEach((x) => {
    if (isOnLargeGrid(x, plotArea.left, plotArea.largeGridSize)) {
      return;
    }

    smallHorizontalLines.forEach((y) => {
      if (isOnLargeGrid(y, plotArea.top, plotArea.largeGridSize)) {
        return;
      }

      dots.push({
        key: `${x}-${y}`,
        x: x - halfDotSize,
        y: y - halfDotSize,
      });
    });
  });

  return dots;
});

const waveMetrics = computed(() => {
  const lines = props.wavePayload?.lines || [];
  const primaryLine = lines.find((line) => line.isPrimary) || lines[0] || null;
  const sampleRate = Math.max(
    1,
    Number(
      primaryLine?.sampleRate ||
        props.wavePayload?.sampleRate ||
        props.sampleRate ||
        AVERAGE_TEMPLATE_SAMPLE_RATE,
    ) || AVERAGE_TEMPLATE_SAMPLE_RATE,
  );
  const sampleCount = Math.max(primaryLine?.wave?.length || 0, 2);
  const pixelsPerSecond = getAverageTemplatePixelsPerSecond(props.speed);
  const pixelsPerSample = pixelsPerSecond / sampleRate;
  const startX = plotArea.left + AVERAGE_TEMPLATE_WAVE_LAYOUT.startPadding;
  const renderEndX = plotArea.right - AVERAGE_TEMPLATE_WAVE_LAYOUT.trailingPadding;
  const rawWaveWidth = Math.max(
    plotArea.largeGridSize * 4,
    (sampleCount - 1) * pixelsPerSample,
  );
  const dataEndX = Math.min(startX + rawWaveWidth, renderEndX);
  const amplitudeScale = getAverageTemplatePixelsPerMv(props.gain);

  let maxPositive = 0;
  let maxNegative = 0;

  lines.forEach((line) => {
    (line.wave || []).forEach((point) => {
      const safePoint = Number(point) || 0;
      if (safePoint > maxPositive) {
        maxPositive = safePoint;
      }
      if (safePoint < maxNegative) {
        maxNegative = safePoint;
      }
    });
  });

  const usableTop = plotArea.top + AVERAGE_TEMPLATE_WAVE_LAYOUT.topPadding;
  const usableBottom = plotArea.bottom - AVERAGE_TEMPLATE_WAVE_LAYOUT.bottomPadding;
  const baselineMin = usableTop + maxPositive * amplitudeScale;
  const baselineMax = usableBottom - Math.abs(maxNegative) * amplitudeScale;

  let baselineY = AVERAGE_TEMPLATE_WAVE_LAYOUT.preferredBaselineY;
  if (baselineMin <= baselineMax) {
    baselineY = Math.min(Math.max(baselineY, baselineMin), baselineMax);
  } else {
    baselineY = (usableTop + usableBottom) / 2;
  }

  return {
    sampleCount,
    sampleRate,
    pixelsPerSample,
    amplitudeScale,
    startX,
    dataEndX,
    renderEndX,
    baselineY,
  };
});

const markerPositions = computed(() => {
  const { sampleCount, pixelsPerSample, startX, dataEndX } = waveMetrics.value;
  const maxIndex = Math.max(0, sampleCount - 1);
  const focusMarkers = props.wavePayload?.focusMarkers || {};

  return (props.markers || []).map((marker) => {
    const markerIndex = Number(focusMarkers?.[marker.sourceKey]?.index);
    const sampleIndex = Number.isFinite(markerIndex)
      ? Math.min(maxIndex, Math.max(0, Math.round(markerIndex)))
      : Math.round(maxIndex * marker.ratio);
    const markerX = Math.min(dataEndX, startX + sampleIndex * pixelsPerSample);

    return {
      ...marker,
      sampleIndex,
      hitWidth: Math.max(marker.width + 16, 28),
      x: markerX,
      labelY: AVERAGE_TEMPLATE_WAVE_LAYOUT.markerLabelY,
    };
  });
});

function clearMarkerDragFrame() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  pendingMarkerUpdate = null;
}

function getSvgLogicalX(clientX) {
  const svgElement = svgRef.value;
  if (!svgElement) {
    return null;
  }

  cachedSvgRect = cachedSvgRect || svgElement.getBoundingClientRect();
  if (!cachedSvgRect?.width) {
    return null;
  }

  return ((clientX - cachedSvgRect.left) / cachedSvgRect.width) * chartSize.width;
}

function getMarkerOrderBounds(markerSourceKey) {
  const markerIndex = markerPositions.value.findIndex(
    (marker) => marker.sourceKey === markerSourceKey,
  );
  const maxIndex = Math.max(0, waveMetrics.value.sampleCount - 1);

  if (markerIndex === -1) {
    return {
      minIndex: 0,
      maxIndex,
    };
  }

  const previousMarker = markerPositions.value[markerIndex - 1];
  const nextMarker = markerPositions.value[markerIndex + 1];
  return {
    minIndex: previousMarker?.sampleIndex ?? 0,
    maxIndex: nextMarker?.sampleIndex ?? maxIndex,
  };
}

function clampMarkerSampleIndex(markerSourceKey, sampleIndex) {
  const maxIndex = Math.max(0, waveMetrics.value.sampleCount - 1);
  const { minIndex, maxIndex: nextMaxIndex } = getMarkerOrderBounds(
    markerSourceKey,
  );

  return Math.min(
    nextMaxIndex,
    Math.max(minIndex, Math.min(maxIndex, Math.round(sampleIndex))),
  );
}

function emitMarkerUpdate(markerSourceKey, sampleIndex) {
  emit("update-marker", {
    leadName: props.lead,
    markerSourceKey,
    sampleIndex,
  });
}

function scheduleMarkerUpdate(markerSourceKey, sampleIndex) {
  pendingMarkerUpdate = {
    markerSourceKey,
    sampleIndex,
  };
  if (rafId !== null) {
    return;
  }

  rafId = requestAnimationFrame(() => {
    const nextUpdate = pendingMarkerUpdate;
    rafId = null;
    pendingMarkerUpdate = null;
    if (!nextUpdate) {
      return;
    }

    emitMarkerUpdate(nextUpdate.markerSourceKey, nextUpdate.sampleIndex);
  });
}

function handleMarkerPointerDown(marker, event) {
  if (props.rulerEnabled || !hasWaveData.value) {
    return;
  }

  const svgElement = svgRef.value;
  if (!svgElement) {
    return;
  }

  draggingMarkerSourceKey = marker.sourceKey;
  draggingPointerId = event.pointerId;
  activeMarkerSourceKey.value = marker.sourceKey;
  cachedSvgRect = svgElement.getBoundingClientRect();
  svgElement.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handleMarkerPointerMove(event) {
  if (!draggingMarkerSourceKey || event.pointerId !== draggingPointerId) {
    return;
  }

  const logicalX = getSvgLogicalX(event.clientX);
  if (logicalX === null) {
    return;
  }

  const nextIndex = clampMarkerSampleIndex(
    draggingMarkerSourceKey,
    (logicalX - waveMetrics.value.startX) / waveMetrics.value.pixelsPerSample,
  );
  scheduleMarkerUpdate(draggingMarkerSourceKey, nextIndex);
}

function finishMarkerDrag(event, shouldClearFrame = true) {
  if (!draggingMarkerSourceKey || event.pointerId !== draggingPointerId) {
    return;
  }

  const svgElement = svgRef.value;
  if (svgElement?.hasPointerCapture?.(event.pointerId)) {
    svgElement.releasePointerCapture(event.pointerId);
  }

  if (shouldClearFrame) {
    clearMarkerDragFrame();
  }

  draggingMarkerSourceKey = "";
  draggingPointerId = null;
  cachedSvgRect = null;
  activeMarkerSourceKey.value = "";
}

function handleMarkerPointerUp(event) {
  finishMarkerDrag(event, false);
}

function handleMarkerPointerCancel(event) {
  finishMarkerDrag(event, true);
}

function buildPath(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return "";
  }

  const {
    amplitudeScale,
    baselineY,
    startX,
    pixelsPerSample,
    dataEndX,
    renderEndX,
  } = waveMetrics.value;
  const path = [];
  let lastX = startX;
  let lastY = baselineY;

  points.forEach((point, index) => {
    const x = Math.min(dataEndX, startX + index * pixelsPerSample);
    const y = baselineY - (Number(point) || 0) * amplitudeScale;
    const command = index === 0 ? "M" : "L";
    path.push(`${command} ${x.toFixed(2)} ${y.toFixed(2)}`);
    lastX = x;
    lastY = y;
  });

  if (lastX < renderEndX) {
    path.push(`L ${renderEndX.toFixed(2)} ${lastY.toFixed(2)}`);
  }

  return path.join(" ");
}

const chartLines = computed(() =>
  (props.wavePayload?.lines || []).map((line) => ({
    id: line.id,
    path: buildPath(line.wave),
    stroke: line.isPrimary ? "#D54941" : "#DCDCDC",
    strokeWidth: line.isPrimary ? 1.35 : props.overlayCompare ? 1.1 : 1,
  })),
);
const hasWaveData = computed(() =>
  (props.wavePayload?.lines || []).some(
    (line) => Array.isArray(line?.wave) && line.wave.length > 1,
  ),
);
const waveKey = computed(() =>
  [
    props.wavePayload?.focusLead || props.lead,
    ...((props.wavePayload?.lines || []).map(
      (line) => `${line.id}:${Array.isArray(line.wave) ? line.wave.length : 0}`,
    )),
  ].join("|"),
);

const leadDisplayLabel = computed(() => props.lead);

onUnmounted(() => {
  clearMarkerDragFrame();
});
</script>

<style lang="scss" scoped>
.average-template-chart {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fffdfd;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #c5c5c5 transparent;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: #c5c5c5;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &__svg {
    width: 1373px;
    height: 841px;
    display: block;
  }

  &__marker {
    cursor: grab;
  }

  &__marker--dragging {
    cursor: grabbing;

    text {
      fill: #1f9b67;
      font-weight: 600;
    }
  }
}
</style>
