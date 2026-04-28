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
  getHighFrequencyLeadOptions,
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
  const smallGridSize = 14;
  const largeGridSize = smallGridSize * 5;

  ctx.fillStyle = "#fffdfd";
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  ctx.strokeStyle = "#ffe2e8";
  ctx.lineWidth = 1;
  for (let x = 0.5; x <= width; x += smallGridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0.5; y <= height; y += smallGridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = "#ffc7d1";
  ctx.lineWidth = 1;
  for (let x = 0.5; x <= width; x += largeGridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0.5; y <= height; y += largeGridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
};

const getSeriesAmplitude = (series) =>
  Math.max(...series.map((value) => Math.abs(Number(value) || 0)), 1);

const drawWaveform = (
  ctx,
  series,
  { left, right, baselineY, amplitudePx, stroke = "#222222", lineWidth = 1 },
) => {
  if (!series.length) return;

  const maxAmplitude = getSeriesAmplitude(series);
  const plotWidth = Math.max(right - left, 1);

  ctx.beginPath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  series.forEach((value, index) => {
    const x = left + (index / Math.max(series.length - 1, 1)) * plotWidth;
    const y = baselineY - ((Number(value) || 0) / maxAmplitude) * amplitudePx;

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
  const marginX = 28;
  const baselineY = Math.round(height * 0.54) + 0.5;
  const axisY = height - 24.5;

  drawEcgGrid(ctx, width, height);

  ctx.fillStyle = "#1f1f1f";
  ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(rhythm.gainLabel, 6, 20);
  ctx.fillText(rhythm.speedLabel, 6, 42);
  ctx.fillText(selectedActiveLead.value || rhythm.lead, 8, baselineY + 16);

  ctx.strokeStyle = "rgba(43, 164, 113, 0.42)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, axisY);
  ctx.lineTo(width - marginX, axisY);
  ctx.stroke();

  // 设计稿中节律条有一段绿色测量游标，这里按画布宽度换算位置。
  const cursorX = marginX + (width - marginX * 2) * 0.12;
  ctx.strokeStyle = "rgba(43, 164, 113, 0.62)";
  ctx.beginPath();
  ctx.moveTo(cursorX, 28);
  ctx.lineTo(cursorX, axisY - 4);
  ctx.moveTo(cursorX + 16, 28);
  ctx.lineTo(cursorX + 16, axisY - 4);
  ctx.stroke();

  drawWaveform(ctx, rhythm.waveform, {
    left: marginX,
    right: width - marginX,
    baselineY,
    amplitudePx: 58,
    stroke: "#1f1f1f",
    lineWidth: 1.1,
  });

  ctx.fillStyle = "#222222";
  ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText("0.0S", marginX, axisY - 6);
  ctx.textAlign = "center";
  ctx.fillText("5.0S", width / 2, axisY - 6);
  ctx.textAlign = "right";
  ctx.fillText(`${rhythm.durationSeconds.toFixed(1)}S`, width - marginX, axisY - 6);
};

const drawHighFrequencyCanvas = () => {
  const canvasState = prepareCanvas(
    highFrequencyCanvasRef.value,
    HIGH_FREQUENCY_HEIGHT,
  );
  if (!canvasState) return;

  const { ctx, width, height } = canvasState;
  const highFrequency = normalizedData.value.highFrequency;
  const leads = visibleHighFrequencyLeads.value;
  const columns = Math.max(Math.min(leads.length, 6), 1);
  const rows = Math.max(Math.ceil(leads.length / columns), 1);
  const marginX = 12;
  const marginTop = 54;
  const marginBottom = 28;
  const plotWidth = width - marginX * 2;
  const plotHeight = height - marginTop - marginBottom;
  const cellWidth = plotWidth / columns;
  const cellHeight = plotHeight / rows;

  drawEcgGrid(ctx, width, height);

  ctx.fillStyle = "#1f1f1f";
  ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(highFrequency.gainLabel, 6, 36);
  ctx.fillText(highFrequency.speedLabel, 6, 58);

  leads.forEach((lead, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellLeft = marginX + column * cellWidth;
    const cellRight = cellLeft + cellWidth;
    const cellTop = marginTop + row * cellHeight;
    const baselineY = cellTop + cellHeight * 0.52;
    const waveformLeft = cellLeft + cellWidth * 0.04;
    const waveformRight = cellRight - cellWidth * 0.08;

    drawWaveform(ctx, lead.waveform, {
      left: waveformLeft,
      right: waveformRight,
      baselineY,
      amplitudePx: cellHeight * 0.34,
      stroke: "#222222",
      lineWidth: 1.1,
    });

    ctx.fillStyle = "#1f1f1f";
    ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(lead.lead, cellLeft + cellWidth * 0.05, baselineY + 24);
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

      <canvas
        ref="highFrequencyCanvasRef"
        class="hf-ecg-workspace__canvas hf-ecg-workspace__canvas--detail"
        aria-label="高频心电导联波形"
      />
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
    width: 100%;
    border: 1px solid #f5d4da;
    background: #fffdfd;
  }

  &__canvas--rhythm {
    height: 170px;
  }

  &__canvas--detail {
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
