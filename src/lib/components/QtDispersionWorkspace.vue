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
  drawQtDispersionGrid,
  normalizeQtDispersionData,
} from "../utils/qtDispersion";

defineOptions({
  name: "QtDispersionWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const QT_CANVAS_HEIGHT = 785;

const canvasRef = ref(null);
const canvasShellRef = ref(null);
const selectedGain = ref("");
const selectedSpeed = ref("");
const selectedLeadGroup = ref("");
const selectedActiveLead = ref("");
const selectedMode = ref("single");
const selectedBeatIds = ref([]);

let resizeObserver = null;
let renderFrameId = 0;

const normalizedData = computed(() => normalizeQtDispersionData(props.data));
const controls = computed(() => normalizedData.value.controls);
const controlOptions = computed(() => normalizedData.value.controlOptions);
const measurementRows = computed(() => normalizedData.value.measurementRows);
const summary = computed(() => normalizedData.value.summary);
const selectionValidation = computed(() => normalizedData.value.selectionValidation);

const syncStateFromData = () => {
  selectedGain.value = controls.value.gain;
  selectedSpeed.value = controls.value.speed;
  selectedLeadGroup.value = controls.value.leadGroup;
  selectedActiveLead.value = controls.value.activeLead;
  selectedMode.value = controls.value.mode;
  selectedBeatIds.value = [...normalizedData.value.selectedBeatIds];
};

const getDevicePixelRatio = () =>
  typeof window === "undefined" ? 1 : Math.max(window.devicePixelRatio || 1, 1);

const prepareCanvas = () => {
  const canvas = canvasRef.value;
  const canvasShell = canvasShellRef.value;
  if (!canvas || !canvasShell) return null;

  const width = Math.max(Math.floor(canvasShell.clientWidth || canvas.clientWidth || 0), 1);
  const height = Math.max(Math.floor(canvasShell.clientHeight || QT_CANVAS_HEIGHT), 1);
  const dpr = getDevicePixelRatio();
  const backingWidth = Math.round(width * dpr);
  const backingHeight = Math.round(height * dpr);

  if (canvas.width !== backingWidth) {
    canvas.width = backingWidth;
  }

  if (canvas.height !== backingHeight) {
    canvas.height = backingHeight;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  return { ctx, width, height };
};

const drawWaveform = (ctx, series, region) => {
  if (!Array.isArray(series) || !series.length) return;

  const maxAmplitude = Math.max(
    ...series.map((value) => Math.abs(Number(value) || 0)),
    1,
  );
  const width = Math.max(region.right - region.left, 1);

  ctx.beginPath();
  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  series.forEach((value, index) => {
    const x = region.left + (index / Math.max(series.length - 1, 1)) * width;
    const y = region.baselineY - ((Number(value) || 0) / maxAmplitude) * region.amplitude;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
};

const drawBeatMarkers = (ctx, width, top, bottom) => {
  const beats = normalizedData.value.beats;
  const selected = new Set(selectedBeatIds.value);

  beats.forEach((beat) => {
    const x = 38 + beat.position * Math.max(width - 74, 1);
    const isSelected = selected.has(beat.id);

    ctx.strokeStyle = isSelected ? "#2ba471" : "rgba(43, 164, 113, 0.55)";
    ctx.lineWidth = isSelected ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, top);
    ctx.lineTo(x + 0.5, bottom);
    ctx.stroke();

    if (isSelected) {
      ctx.fillStyle = selectedMode.value === "single" ? "#ff6f61" : "#3562ec";
      ctx.beginPath();
      ctx.moveTo(x - 9, top);
      ctx.lineTo(x + 9, top);
      ctx.lineTo(x, top + 18);
      ctx.closePath();
      ctx.fill();
    }
  });
};

const renderCanvas = () => {
  renderFrameId = 0;
  const state = prepareCanvas();
  if (!state) return;

  const { ctx, width, height } = state;
  const left = 36;
  const right = width - 28;
  const top = 8;
  const bottom = height - 28;
  const rowHeight = (bottom - top) / normalizedData.value.leadWaveforms.length;

  drawQtDispersionGrid(ctx, width, height);
  drawBeatMarkers(ctx, width, top, bottom);

  normalizedData.value.leadWaveforms.forEach((lead, index) => {
    const rowTop = top + index * rowHeight;
    const baselineY = rowTop + rowHeight * 0.55;

    ctx.fillStyle = "#1f1f1f";
    ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(lead.lead, 8, baselineY - 6);

    drawWaveform(ctx, lead.waveform, {
      left,
      right,
      baselineY,
      amplitude: rowHeight * 0.42,
    });
  });

  // 底部时间标注跟随画布宽度换算，保持与 Figma 的测量窗口一致。
  ctx.fillStyle = "#222222";
  ctx.font = "600 14px PingFang SC, Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("0.6S", left, height - 8);
  ctx.textAlign = "center";
  ctx.fillText("3.1S", width / 2, height - 8);
  ctx.textAlign = "right";
  ctx.fillText("5.6S", right, height - 8);
};

const scheduleRender = () => {
  if (typeof window === "undefined") return;
  if (renderFrameId) {
    window.cancelAnimationFrame(renderFrameId);
  }

  renderFrameId = window.requestAnimationFrame(renderCanvas);
};

const handleModeChange = (mode) => {
  selectedMode.value = mode;
  const selectable = normalizedData.value.beats.filter(
    (beat) => beat.kind === "normal" && !beat.blocked && beat.tWaveClear,
  );

  selectedBeatIds.value =
    mode === "three"
      ? selectable.slice(0, 3).map((beat) => beat.id)
      : [selectable[0]?.id].filter(Boolean);
};

watch(
  normalizedData,
  () => {
    syncStateFromData();
    nextTick(scheduleRender);
  },
  { immediate: true },
);

watch(
  [selectedGain, selectedSpeed, selectedLeadGroup, selectedActiveLead, selectedMode, selectedBeatIds],
  () => nextTick(scheduleRender),
  { deep: true },
);

onMounted(() => {
  nextTick(scheduleRender);

  if (canvasShellRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => scheduleRender());
    resizeObserver.observe(canvasShellRef.value);
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
  <section class="qt-dispersion-workspace">
    <header class="qt-dispersion-workspace__toolbar">
      <select v-model="selectedGain" class="qt-dispersion-workspace__select">
        <option v-for="option in controlOptions.gains" :key="option" :value="option">
          {{ option }}
        </option>
      </select>

      <select v-model="selectedSpeed" class="qt-dispersion-workspace__select">
        <option v-for="option in controlOptions.speeds" :key="option" :value="option">
          {{ option }}
        </option>
      </select>

      <select v-model="selectedLeadGroup" class="qt-dispersion-workspace__select">
        <option
          v-for="option in controlOptions.leadGroups"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>

      <select v-model="selectedActiveLead" class="qt-dispersion-workspace__select">
        <option
          v-for="option in controlOptions.activeLeads"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>

      <div class="qt-dispersion-workspace__mode-group" aria-label="QT测量模式">
        <button
          v-for="mode in controlOptions.modes"
          :key="mode.value"
          type="button"
          class="qt-dispersion-workspace__mode-btn"
          :class="{ 'qt-dispersion-workspace__mode-btn--active': selectedMode === mode.value }"
          @click="handleModeChange(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>

      <span
        v-if="!selectionValidation.valid"
        class="qt-dispersion-workspace__selection-warning"
      >
        {{ selectionValidation.reason }}
      </span>
    </header>

    <div class="qt-dispersion-workspace__body">
      <div ref="canvasShellRef" class="qt-dispersion-workspace__canvas-shell">
        <canvas
          ref="canvasRef"
          class="qt-dispersion-workspace__canvas"
          aria-label="QT离散度十二导联测量波形"
        />
      </div>

      <aside class="qt-dispersion-workspace__panel">
        <table class="qt-dispersion-workspace__table">
          <thead>
            <tr>
              <th scope="col">Lead</th>
              <th scope="col">QT/QTc(ms)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in measurementRows" :key="row.lead">
              <td>{{ row.lead }}</td>
              <td>{{ row.qt }}/{{ row.qtc }}</td>
            </tr>
            <tr>
              <td>QTd(ms)</td>
              <td>{{ summary.qtd }}</td>
            </tr>
            <tr>
              <td>QTcd(ms)</td>
              <td>{{ summary.qtcd }}</td>
            </tr>
          </tbody>
        </table>
      </aside>
    </div>
  </section>
</template>

<style scoped lang="scss">
.qt-dispersion-workspace {
  --qt-canvas-height: 785px;

  display: flex;
  flex-direction: column;
  gap: 8px;
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

  &__mode-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 4px;
  }

  &__mode-btn {
    height: 32px;
    padding: 0 14px;
    border: 1px solid #dcdcdc;
    border-radius: 3px;
    background: #ffffff;
    color: rgba(0, 0, 0, 0.72);
    font-size: 14px;
    cursor: pointer;
  }

  &__mode-btn--active {
    border-color: #3562ec;
    background: #3562ec;
    color: #ffffff;
  }

  &__selection-warning {
    color: #d54941;
    font-size: 14px;
  }

  &__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 414px;
    gap: 12px;
    align-items: start;
    min-height: 0;
  }

  &__canvas-shell {
    min-width: 0;
    height: var(--qt-canvas-height);
    border: 1px solid #f5d4da;
    background: #fffdfd;
    overflow: hidden;
  }

  &__canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__panel {
    min-width: 0;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    color: rgba(0, 0, 0, 0.9);
    font-size: 14px;
    line-height: 22px;

    th,
    td {
      height: 31px;
      padding: 4px 12px;
      border: 1px solid #dcdcdc;
      text-align: left;
      font-weight: 400;
      white-space: nowrap;
    }

    th {
      height: 40px;
      background: #f3f3f3;
      font-weight: 600;
    }
  }
}

@media (max-width: 1200px) {
  .qt-dispersion-workspace {
    --qt-canvas-height: 680px;

    &__body {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 768px) {
  .qt-dispersion-workspace {
    --qt-canvas-height: 560px;

    &__select {
      flex: 1 1 calc(50% - 4px);
      width: auto;
      min-width: 132px;
    }

    &__mode-group {
      width: 100%;
      margin-left: 0;
    }

    &__mode-btn {
      flex: 1;
    }
  }
}
</style>
