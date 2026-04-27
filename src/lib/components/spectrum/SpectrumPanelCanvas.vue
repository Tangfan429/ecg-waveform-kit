<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";

defineOptions({
  name: "SpectrumPanelCanvas",
});

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  yUnit: {
    type: String,
    default: "",
  },
  xUnit: {
    type: String,
    default: "Hz",
  },
  xMin: {
    type: Number,
    default: 0,
  },
  xMax: {
    type: Number,
    default: 25,
  },
  yMin: {
    type: Number,
    default: 0,
  },
  yMax: {
    type: Number,
    default: 1,
  },
  height: {
    type: Number,
    default: 160,
  },
  series: {
    type: Array,
    default: () => [],
  },
  notes: {
    type: Array,
    default: () => [],
  },
  legendItems: {
    type: Array,
    default: () => [],
  },
  emptyLabel: {
    type: String,
    default: "",
  },
  xTickStep: {
    type: Number,
    default: 5,
  },
  yTickCount: {
    type: Number,
    default: 4,
  },
  emphasizeZeroLine: {
    type: Boolean,
    default: false,
  },
  titleAlign: {
    type: String,
    default: "center",
    validator: (value) => ["center", "right"].includes(value),
  },
  notesPlacement: {
    type: String,
    default: "top-right",
    validator: (value) => ["top-right", "top-left"].includes(value),
  },
  legendLayout: {
    type: String,
    default: "list",
    validator: (value) => ["list", "matrix"].includes(value),
  },
  axisDisplay: {
    type: String,
    default: "full",
    validator: (value) => ["full", "baseline"].includes(value),
  },
  peakMarker: {
    type: String,
    default: "none",
    validator: (value) => ["none", "max"].includes(value),
  },
});

const canvasRef = useTemplateRef("canvasRef");
const canvasWidth = ref(0);
const dpr = ref(1);

const FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", sans-serif';
const CHART_COLORS = Object.freeze({
  axis: "#8a8f98",
  zeroLine: "#656b74",
  text: "#60656f",
  mutedText: "#8a9099",
  title: "#5f6670",
  fallbackSeries: "#efb45e",
  background: "#ffffff",
});

const chartPadding = computed(() => ({
  top: props.axisDisplay === "baseline" ? 42 : 22,
  right:
    props.axisDisplay === "baseline"
      ? 24
      : props.legendItems.length && props.legendLayout === "list"
        ? 128
        : props.legendLayout === "matrix"
          ? 220
          : 34,
  bottom: props.axisDisplay === "baseline" ? 24 : 30,
  left:
    props.axisDisplay === "baseline"
      ? 20
      : props.yUnit
        ? 58
        : 52,
}));

let resizeObserver = null;
let renderFrameId = 0;

function scheduleRender() {
  if (renderFrameId) {
    return;
  }

  renderFrameId = window.requestAnimationFrame(() => {
    renderFrameId = 0;
    renderCanvas();
  });
}

function getNormalizedSeries() {
  return (props.series || []).map((series) => ({
    ...series,
    points: Array.isArray(series?.points)
      ? series.points.filter(
          (point) =>
            Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)),
        )
      : [],
  }));
}

function getLayout(width, height) {
  const padding = chartPadding.value;
  const plotLeft = padding.left;
  const plotTop = padding.top;
  const plotRight = width - padding.right;
  const plotBottom = height - padding.bottom;

  return {
    width,
    height,
    padding,
    plotLeft,
    plotTop,
    plotRight,
    plotBottom,
    plotWidth: Math.max(1, plotRight - plotLeft),
    plotHeight: Math.max(1, plotBottom - plotTop),
  };
}

function formatTickLabel(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function drawAxes(ctx, layout) {
  ctx.strokeStyle = CHART_COLORS.axis;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(layout.plotLeft, layout.plotBottom + 0.5);
  ctx.lineTo(layout.plotRight, layout.plotBottom + 0.5);
  ctx.moveTo(layout.plotLeft + 0.5, layout.plotTop);
  ctx.lineTo(layout.plotLeft + 0.5, layout.plotBottom);
  ctx.stroke();
}

function drawZeroLine(ctx, layout, ySpan) {
  if (!props.emphasizeZeroLine || props.yMin >= 0 || props.yMax <= 0) {
    return;
  }

  const zeroY =
    layout.plotBottom - ((0 - props.yMin) / ySpan) * layout.plotHeight;
  ctx.strokeStyle = CHART_COLORS.zeroLine;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(layout.plotLeft, zeroY + 0.5);
  ctx.lineTo(layout.plotRight, zeroY + 0.5);
  ctx.stroke();
}

function drawTicks(ctx, layout, xSpan, ySpan) {
  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";

  const yTickCount = Math.max(2, props.yTickCount);
  for (let index = 0; index < yTickCount; index += 1) {
    const ratio = index / (yTickCount - 1);
    const value = props.yMax - ySpan * ratio;
    const y = layout.plotTop + layout.plotHeight * ratio;

    ctx.beginPath();
    ctx.moveTo(layout.plotLeft - 4, y + 0.5);
    ctx.lineTo(layout.plotLeft, y + 0.5);
    ctx.strokeStyle = CHART_COLORS.axis;
    ctx.stroke();
    ctx.fillText(formatTickLabel(value), layout.plotLeft - 8, y);
  }

  const xTickStep = Math.max(1, props.xTickStep);
  ctx.textBaseline = "top";
  for (let value = props.xMin; value <= props.xMax; value += xTickStep) {
    const x = layout.plotLeft + ((value - props.xMin) / xSpan) * layout.plotWidth;
    const isFirstTick = value === props.xMin;
    const isLastTick = value + xTickStep > props.xMax;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, layout.plotBottom);
    ctx.lineTo(x + 0.5, layout.plotBottom + 4);
    ctx.strokeStyle = CHART_COLORS.axis;
    ctx.stroke();
    ctx.textAlign = isFirstTick ? "left" : isLastTick ? "right" : "center";
    ctx.fillText(String(value), x, layout.plotBottom + 7);
  }
}

function drawSeries(ctx, layout, normalizedSeries, xSpan, ySpan) {
  normalizedSeries.forEach((series) => {
    if (!series.points.length) {
      return;
    }

    ctx.strokeStyle = series.color || CHART_COLORS.fallbackSeries;
    ctx.lineWidth = series.lineWidth || 0.95;
    ctx.beginPath();

    series.points.forEach((point, index) => {
      const x =
        layout.plotLeft + ((Number(point.x) - props.xMin) / xSpan) * layout.plotWidth;
      const y =
        layout.plotBottom -
        ((Number(point.y) - props.yMin) / ySpan) * layout.plotHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  });
}

function findPeakPoint(normalizedSeries) {
  let peakPoint = null;
  let peakDistance = 0;

  normalizedSeries.forEach((series) => {
    series.points.forEach((point) => {
      const y = Number(point.y);
      const distance = Math.abs(y);
      if (distance > peakDistance) {
        peakDistance = distance;
        peakPoint = point;
      }
    });
  });

  return peakPoint;
}

function drawPeakMarker(ctx, layout, normalizedSeries, xSpan, ySpan) {
  if (props.peakMarker !== "max" || props.axisDisplay !== "baseline") {
    return;
  }

  const peakPoint = findPeakPoint(normalizedSeries);
  if (!peakPoint) {
    return;
  }

  const x =
    layout.plotLeft +
    ((Number(peakPoint.x) - props.xMin) / xSpan) * layout.plotWidth;
  const peakY =
    layout.plotBottom -
    ((Number(peakPoint.y) - props.yMin) / ySpan) * layout.plotHeight;
  const zeroY = layout.plotBottom - ((0 - props.yMin) / ySpan) * layout.plotHeight;

  // Baseline charts use this marker as a peak locator, not as an axis.
  ctx.strokeStyle = "#8f969f";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, zeroY);
  ctx.lineTo(x + 0.5, peakY);
  ctx.stroke();
}

function drawEmptyState(ctx, layout) {
  if (!props.emptyLabel) {
    return;
  }

  ctx.fillStyle = CHART_COLORS.mutedText;
  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    props.emptyLabel,
    layout.plotLeft + layout.plotWidth / 2,
    layout.plotTop + layout.plotHeight / 2,
  );
}

function drawLabels(ctx, layout) {
  ctx.fillStyle = CHART_COLORS.title;
  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.textAlign = props.titleAlign === "right" ? "right" : "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    props.title,
    props.titleAlign === "right" ? layout.width - 24 : layout.width / 2,
    5,
  );

  if (props.yUnit) {
    ctx.save();
    ctx.translate(18, layout.plotTop + 13);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(props.yUnit, 0, 0);
    ctx.restore();
  }

  if (props.xUnit) {
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(props.xUnit, layout.width - 8, layout.plotBottom + 7);
  }
}

function drawNotes(ctx, layout) {
  if (!props.notes.length || props.legendLayout === "matrix") {
    return;
  }

  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = `9px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";

  if (props.notesPlacement === "top-left") {
    for (let index = 0; index < props.notes.length; index += 2) {
      const column = index / 2;
      const x = layout.plotLeft + 18 + column * 28;
      ctx.textAlign = "center";
      ctx.fillText(String(props.notes[index]), x, 14);
      ctx.fillText(String(props.notes[index + 1] ?? ""), x, 28);
    }
    return;
  }

  // Notes are clinical markers, so keep them in the header band rather than
  // reserving chart width for them.
  const notesText = props.notes.map((note) => String(note)).join("   ");
  ctx.textAlign = "right";
  ctx.fillText(notesText, layout.plotRight - 2, 6);
}

function drawLegend(ctx, layout) {
  if (!props.legendItems.length) {
    return;
  }

  if (props.legendLayout === "matrix") {
    drawMatrixLegend(ctx, layout);
    return;
  }

  let cursorY = 20;
  const legendX = layout.plotRight + 22;
  props.legendItems.forEach((item) => {
    ctx.fillStyle = item.color || CHART_COLORS.fallbackSeries;
    ctx.fillRect(legendX, cursorY, 12, 12);
    ctx.strokeStyle = item.color || CHART_COLORS.fallbackSeries;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(legendX, cursorY, 12, 12);
    ctx.fillStyle = CHART_COLORS.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `10px ${FONT_FAMILY}`;
    ctx.fillText(item.label, legendX + 17, cursorY + 6);
    cursorY += 18;
  });
}

function drawMatrixLegend(ctx, layout) {
  const legendX = layout.plotRight + 18;
  const labelX = legendX + 18;
  const headerY = 16;
  const firstRowY = 36;
  const rowGap = 20;
  const columnStartX = labelX + 36;
  const columnGap = 36;

  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = CHART_COLORS.text;
  props.notes.forEach((note, index) => {
    ctx.textAlign = "center";
    ctx.fillText(String(note), columnStartX + index * columnGap, headerY);
  });

  // The design uses a compact matrix legend: lead labels on the left and
  // clinical marker states aligned under each marker header on the right.
  props.legendItems.forEach((item, rowIndex) => {
    const y = firstRowY + rowIndex * rowGap;
    ctx.fillStyle = item.color || CHART_COLORS.fallbackSeries;
    ctx.fillRect(legendX, y - 7, 12, 12);
    ctx.strokeStyle = item.color || CHART_COLORS.fallbackSeries;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(legendX, y - 7, 12, 12);
    ctx.fillStyle = CHART_COLORS.text;
    ctx.textAlign = "left";
    ctx.fillText(item.label, labelX, y);

    const markers = Array.isArray(item.markers) ? item.markers : [];
    props.notes.forEach((_, columnIndex) => {
      ctx.textAlign = "center";
      ctx.fillText(
        String(markers[columnIndex] ?? "-"),
        columnStartX + columnIndex * columnGap,
        y,
      );
    });
  });
}

function renderCanvas() {
  const canvas = canvasRef.value;
  if (!canvas || canvasWidth.value <= 0) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const width = canvasWidth.value;
  const height = props.height;
  const pixelRatio = dpr.value;
  const layout = getLayout(width, height);
  const xSpan = Math.max(1, props.xMax - props.xMin);
  const ySpan = Math.max(1e-6, props.yMax - props.yMin);
  const normalizedSeries = getNormalizedSeries();
  const hasVisibleSeries = normalizedSeries.some((series) => series.points.length);

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = CHART_COLORS.background;
  ctx.fillRect(0, 0, width, height);

  if (props.axisDisplay === "full") {
    drawAxes(ctx, layout);
    drawZeroLine(ctx, layout, ySpan);
    drawTicks(ctx, layout, xSpan, ySpan);
  } else {
    drawZeroLine(ctx, layout, ySpan);
    drawPeakMarker(ctx, layout, normalizedSeries, xSpan, ySpan);
  }

  if (hasVisibleSeries) {
    drawSeries(ctx, layout, normalizedSeries, xSpan, ySpan);
  } else {
    drawEmptyState(ctx, layout);
  }

  drawLabels(ctx, layout);
  drawNotes(ctx, layout);
  drawLegend(ctx, layout);
}

onMounted(async () => {
  await nextTick();
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  dpr.value = Math.max(window.devicePixelRatio || 1, 1);
  canvasWidth.value = canvas.clientWidth;
  resizeObserver = new ResizeObserver(() => {
    canvasWidth.value = canvas.clientWidth;
    scheduleRender();
  });
  resizeObserver.observe(canvas);
  scheduleRender();
});

onUnmounted(() => {
  if (renderFrameId) {
    window.cancelAnimationFrame(renderFrameId);
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

watch(
  () => [
    props.title,
    props.xMin,
    props.xMax,
    props.yMin,
    props.yMax,
    props.height,
    props.yUnit,
    props.xUnit,
    props.xTickStep,
    props.yTickCount,
    props.emphasizeZeroLine,
    props.titleAlign,
    props.notesPlacement,
    props.legendLayout,
    props.axisDisplay,
    props.peakMarker,
    props.emptyLabel,
    props.notes,
    props.legendItems,
    props.series,
  ],
  () => {
    scheduleRender();
  },
  { deep: true },
);
</script>

<template>
  <canvas ref="canvasRef" class="spectrum-panel-canvas" />
</template>

<style scoped lang="scss">
.spectrum-panel-canvas {
  display: block;
  width: 100%;
}
</style>
