<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import {
  HIGH_FREQUENCY_CHEST_LEADS,
  HIGH_FREQUENCY_LIMB_LEADS,
  getHighFrequencyDetailCanvasWidth,
  getHighFrequencyLeadOptions,
  getHighFrequencyPixelsPerMv,
  getHighFrequencyViewportDurationSeconds,
  normalizeHighFrequencyEcgData,
} from "../utils/highFrequencyEcg";

defineOptions({
  name: "HighFrequencyEcgWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const RHYTHM_HEIGHT = 170;
const HIGH_FREQUENCY_HEIGHT = 450;
const ECG_SMALL_GRID_SIZE = 5;
const ECG_LARGE_GRID_SIZE = ECG_SMALL_GRID_SIZE * 5;
const RHYTHM_HORIZONTAL_PADDING = 28;
const DETAIL_HORIZONTAL_PADDING = 24;
const DETAIL_LEAD_GAP = 20;

const workspaceRef = ref(null);
const rhythmCanvasRef = ref(null);
const highFrequencyCanvasRef = ref(null);
const selectedGain = ref("");
const selectedSpeed = ref("");
const selectedLeadGroup = ref("");
const selectedActiveLead = ref("");

let resizeObserver = null;
let renderFrameId = 0;

const normalizedData = computed(() => normalizeHighFrequencyEcgData(props.data));

const visibleHighFrequencyLeads = computed(() => {
  const groupLeads =
    selectedLeadGroup.value === "胸导联"
      ? HIGH_FREQUENCY_CHEST_LEADS
      : HIGH_FREQUENCY_LIMB_LEADS;
  const leads = normalizedData.value.highFrequencyLeads.filter((item) =>
    groupLeads.includes(item.lead),
  );

  return leads.length ? leads : normalizedData.value.highFrequencyLeads;
});

const tableColumns = computed(() => normalizedData.value.tableColumns);
const tableRows = computed(() => normalizedData.value.tableRows);
const controlOptions = computed(() => normalizedData.value.controlOptions);
const activeLeadOptions = computed(() =>
  getHighFrequencyLeadOptions(selectedLeadGroup.value),
);
const paperLabels = computed(() => ({
  gain: selectedGain.value || normalizedData.value.controls.gain,
  speed: selectedSpeed.value || normalizedData.value.controls.speed,
}));

const syncControlState = () => {
  const controls = normalizedData.value.controls;
  selectedGain.value = controls.gain;
  selectedSpeed.value = controls.speed;
  selectedLeadGroup.value = controls.leadGroup;
  selectedActiveLead.value = controls.activeLead;
};

const getDevicePixelRatio = () =>
  typeof window === "undefined" ? 1 : Math.max(window.devicePixelRatio || 1, 1);

const prepareCanvas = (canvas, height) => {
  if (!canvas) return null;

  const width = Math.max(Math.floor(canvas.clientWidth || 0), 1);
  const dpr = getDevicePixelRatio();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  return { ctx, width, height };
};

const drawEcgGrid = (ctx, width, height) => {
  ctx.fillStyle = "#fffdfd";
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  ctx.strokeStyle = "#ffe2e8";
  ctx.lineWidth = 1;
  for (let x = 0.5; x <= width; x += ECG_SMALL_GRID_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0.5; y <= height; y += ECG_SMALL_GRID_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = "#ffc7d1";
  ctx.lineWidth = 1;
  for (let x = 0.5; x <= width; x += ECG_LARGE_GRID_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0.5; y <= height; y += ECG_LARGE_GRID_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
};

const drawWaveform = (
  ctx,
  series,
  {
    left,
    baselineY,
    pixelsPerSample,
    pixelsPerMv,
    maxSamples,
    stroke = "#222222",
    lineWidth = 1,
  },
) => {
  if (!series.length) return;

  const drawableSeries = Number.isFinite(maxSamples)
    ? series.slice(0, Math.max(0, Math.floor(maxSamples)))
    : series;
  if (!drawableSeries.length) return;

  ctx.beginPath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawableSeries.forEach((value, index) => {
    const x = left + index * pixelsPerSample;
    const y = baselineY - (Number(value) || 0) * pixelsPerMv;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
};

const drawRhythmCanvas = () => {
  const canvasState = prepareCanvas(rhythmCanvasRef.value, RHYTHM_HEIGHT);
  if (!canvasState) return;

  const { ctx, width, height } = canvasState;
  const rhythm = normalizedData.value.rhythm;
  const baselineY = Math.round(height * 0.54) + 0.5;
  const axisY = height - 24.5;
  const pixelsPerMv = getHighFrequencyPixelsPerMv(paperLabels.value.gain) * 0.42;
  const drawableWidth = Math.max(1, width - RHYTHM_HORIZONTAL_PADDING * 2);
  const visibleDurationSeconds = getHighFrequencyViewportDurationSeconds({
    width,
    speedLabel: paperLabels.value.speed,
    horizontalPadding: RHYTHM_HORIZONTAL_PADDING,
  });
  const pixelsPerSample = drawableWidth / Math.max(rhythm.waveform.length - 1, 1);

  drawEcgGrid(ctx, width, height);

  ctx.fillStyle = "#1f1f1f";
  ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(paperLabels.value.gain, 6, 20);
  ctx.fillText(paperLabels.value.speed, 6, 42);
  ctx.fillText(selectedActiveLead.value || rhythm.lead, 8, baselineY + 16);

  ctx.strokeStyle = "rgba(43, 164, 113, 0.42)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(RHYTHM_HORIZONTAL_PADDING, axisY);
  ctx.lineTo(width - RHYTHM_HORIZONTAL_PADDING, axisY);
  ctx.stroke();

  drawWaveform(ctx, rhythm.waveform, {
    left: RHYTHM_HORIZONTAL_PADDING,
    baselineY,
    pixelsPerSample,
    pixelsPerMv,
    maxSamples: rhythm.waveform.length,
    stroke: "#1f1f1f",
    lineWidth: 1.1,
  });

  ctx.fillStyle = "#222222";
  ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText("0.0S", RHYTHM_HORIZONTAL_PADDING, axisY - 6);
  ctx.textAlign = "center";
  ctx.fillText(`${(visibleDurationSeconds / 2).toFixed(1)}S`, width / 2, axisY - 6);
  ctx.textAlign = "right";
  ctx.fillText(
    `${visibleDurationSeconds.toFixed(1)}S`,
    width - RHYTHM_HORIZONTAL_PADDING,
    axisY - 6,
  );
};

const drawHighFrequencyCanvas = () => {
  const canvas = highFrequencyCanvasRef.value;
  const viewportWidth = Math.max(Math.floor(workspaceRef.value?.clientWidth || 0), 1);
  const leads = visibleHighFrequencyLeads.value;
  // 细节画布按可视容器宽度绘制，避免 300mm/s 纸速把下方画布拉宽。
  const targetWidth = getHighFrequencyDetailCanvasWidth({
    viewportWidth,
  });
  if (canvas) {
    canvas.style.width = `${targetWidth}px`;
  }
  const canvasState = prepareCanvas(
    canvas,
    HIGH_FREQUENCY_HEIGHT,
  );
  if (!canvasState) return;

  const { ctx, width, height } = canvasState;
  const columns = Math.max(Math.min(leads.length, 6), 1);
  const marginTop = 54;
  const marginBottom = 28;
  const plotHeight = height - marginTop - marginBottom;
  const cellWidth =
    (width - DETAIL_HORIZONTAL_PADDING * 2 - DETAIL_LEAD_GAP * (columns - 1)) /
    columns;
  const cellHeight = plotHeight;
  const pixelsPerMv = getHighFrequencyPixelsPerMv(paperLabels.value.gain);
  const maxLeadSamples = Math.max(
    ...leads.map((lead) => lead.waveform.length),
    1,
  );
  const pixelsPerSample = cellWidth / Math.max(maxLeadSamples - 1, 1);

  drawEcgGrid(ctx, width, height);

  ctx.fillStyle = "#1f1f1f";
  ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(paperLabels.value.gain, 6, 36);
  ctx.fillText(paperLabels.value.speed, 6, 58);

  leads.forEach((lead, index) => {
    const column = index % columns;
    const cellLeft =
      DETAIL_HORIZONTAL_PADDING + column * (cellWidth + DETAIL_LEAD_GAP);
    const cellTop = marginTop;
    const baselineY = cellTop + cellHeight * 0.52;
    const waveformLeft = cellLeft;

    drawWaveform(ctx, lead.waveform, {
      left: waveformLeft,
      baselineY,
      pixelsPerSample,
      pixelsPerMv,
      maxSamples: lead.waveform.length,
      stroke: "#222222",
      lineWidth: 1.1,
    });

    ctx.fillStyle = "#1f1f1f";
    ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(lead.lead, cellLeft + ECG_SMALL_GRID_SIZE, baselineY + 24);
  });
};

const renderCanvases = () => {
  renderFrameId = 0;
  drawRhythmCanvas();
  drawHighFrequencyCanvas();
};

const scheduleRender = () => {
  if (typeof window === "undefined") return;
  if (renderFrameId) {
    window.cancelAnimationFrame(renderFrameId);
  }

  renderFrameId = window.requestAnimationFrame(renderCanvases);
};

watch(
  normalizedData,
  () => {
    syncControlState();
    nextTick(scheduleRender);
  },
  { immediate: true },
);

watch(
  [selectedGain, selectedSpeed, selectedLeadGroup, selectedActiveLead],
  () => nextTick(scheduleRender),
);

watch(selectedLeadGroup, () => {
  const options = activeLeadOptions.value;
  if (!options.includes(selectedActiveLead.value)) {
    selectedActiveLead.value =
      selectedLeadGroup.value === "肢体导联" && options.includes("II")
        ? "II"
        : options[0];
  }
});

onMounted(() => {
  nextTick(scheduleRender);

  if (workspaceRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => scheduleRender());
    resizeObserver.observe(workspaceRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;

  if (renderFrameId && typeof window !== "undefined") {
    window.cancelAnimationFrame(renderFrameId);
  }
});
</script>

<template>
  <section ref="workspaceRef" class="hf-ecg-workspace">
    <header class="hf-ecg-workspace__toolbar" aria-label="高频心电参数">
      <select v-model="selectedGain" class="hf-ecg-workspace__select">
        <option
          v-for="option in controlOptions.gains"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>

      <select v-model="selectedSpeed" class="hf-ecg-workspace__select">
        <option
          v-for="option in controlOptions.speeds"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>

      <select v-model="selectedLeadGroup" class="hf-ecg-workspace__select">
        <option
          v-for="option in controlOptions.leadGroups"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>

      <select v-model="selectedActiveLead" class="hf-ecg-workspace__select">
        <option
          v-for="option in activeLeadOptions"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>
    </header>

    <div class="hf-ecg-workspace__charts">
      <canvas
        ref="rhythmCanvasRef"
        class="hf-ecg-workspace__canvas hf-ecg-workspace__canvas--rhythm"
        aria-label="高频心电节律波形"
      />

      <div class="hf-ecg-workspace__detail-scroll">
        <canvas
          ref="highFrequencyCanvasRef"
          class="hf-ecg-workspace__canvas hf-ecg-workspace__canvas--detail"
          aria-label="高频心电导联波形"
        />
      </div>
    </div>

    <div class="hf-ecg-workspace__table-wrap">
      <table class="hf-ecg-workspace__table">
        <thead>
          <tr>
            <th v-for="column in tableColumns" :key="column.key" scope="col">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in tableRows" :key="rowIndex">
            <td v-for="column in tableColumns" :key="column.key">
              {{ row[column.key] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hf-ecg-workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-height: 0;
  background: #ffffff;

  &__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__select {
    width: 116px;
    height: 32px;
    padding: 5px 30px 5px 8px;
    border: 1px solid #dcdcdc;
    border-radius: 3px;
    background: #ffffff;
    color: rgba(0, 0, 0, 0.9);
    font-size: 14px;
    line-height: 22px;
  }

  &__charts {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  &__canvas {
    display: block;
    border: 1px solid #f5d4da;
    background: #fffdfd;
  }

  &__canvas--rhythm {
    width: 100%;
    height: 170px;
  }

  &__detail-scroll {
    width: 100%;
    overflow: hidden;
    overflow-y: hidden;
  }

  &__canvas--detail {
    min-width: 100%;
    height: 450px;
  }

  &__table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    min-width: 960px;
    border-collapse: collapse;
    table-layout: fixed;
    color: rgba(0, 0, 0, 0.9);
    font-size: 14px;
    line-height: 22px;

    th,
    td {
      height: 38px;
      padding: 8px 12px;
      border: 1px solid #e7e7e7;
      text-align: left;
      font-weight: 400;
      white-space: nowrap;
    }

    th {
      background: #f3f3f3;
      font-weight: 600;
    }
  }
}

@media (max-width: 768px) {
  .hf-ecg-workspace {
    gap: 14px;

    &__select {
      flex: 1 1 calc(50% - 4px);
      width: auto;
      min-width: 132px;
    }

    &__canvas--detail {
      height: 360px;
    }
  }
}
</style>
