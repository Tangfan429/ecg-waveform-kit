<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import {
  drawVectorEcgPlot,
  drawVectorWaveformPanel,
  normalizeVectorEcgData,
} from "../utils/vectorEcg";

defineOptions({
  name: "VectorEcgWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const workspaceRef = ref(null);
const canvasRefs = ref({});
const activeScale = shallowRef("20mm/mV");
const activeRatio = shallowRef("100/20/40 mm/mv");
const activePlane = shallowRef("all");
const activeLoop = shallowRef("all");

let resizeObserver = null;
let renderFrameId = 0;

const normalizedData = computed(() => normalizeVectorEcgData(props.data));
const primaryPlots = computed(() => normalizedData.value.plots.slice(0, 2));
const secondaryPlot = computed(() => normalizedData.value.plots[2] || normalizedData.value.plots[1]);
const visiblePlotKeys = computed(() => {
  if (activePlane.value === "all") {
    return new Set(normalizedData.value.plots.map((plot) => plot.key));
  }

  return new Set([activePlane.value]);
});

const isPlotVisible = (plot) => visiblePlotKeys.value.has(plot?.key);

const setCanvasRef = (key, element) => {
  if (element) {
    canvasRefs.value[key] = element;
    return;
  }

  delete canvasRefs.value[key];
};

const syncStateFromData = () => {
  const data = normalizedData.value;

  activeScale.value = data.activeScale;
  activeRatio.value = data.activeRatio;
  activePlane.value = data.activePlane;
  activeLoop.value = data.activeLoop;
};

const setupCanvas = (canvas, width, height) => {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Canvas 绘制使用 CSS 像素坐标，DPR 只负责让网格与曲线在高清屏保持清晰。
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
};

const renderCanvas = (key, fallbackWidth, fallbackHeight, draw) => {
  const canvas = canvasRefs.value[key];
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width || canvas.clientWidth || fallbackWidth);
  const height = Math.max(1, rect.height || canvas.clientHeight || fallbackHeight);
  const ctx = setupCanvas(canvas, width, height);
  if (!ctx) return;

  draw(ctx, width, height);
};

const renderPlot = (plot) => {
  renderCanvas(plot.key, 620, 360, (ctx, width, height) => {
    drawVectorEcgPlot(ctx, {
      width,
      height,
      plot,
      loopMode: activeLoop.value,
      scale: activeScale.value,
    });
  });
};

const renderAll = () => {
  renderFrameId = 0;
  normalizedData.value.plots.forEach(renderPlot);

  renderCanvas("waveform", 722, 396, (ctx, width, height) => {
    drawVectorWaveformPanel(ctx, {
      width,
      height,
      waveformSeries: normalizedData.value.waveformSeries,
      scale: activeScale.value,
    });
  });
};

const scheduleRender = () => {
  if (typeof window === "undefined") return;
  if (renderFrameId) {
    window.cancelAnimationFrame(renderFrameId);
  }

  renderFrameId = window.requestAnimationFrame(renderAll);
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
  [activeScale, activeRatio, activePlane, activeLoop],
  () => nextTick(scheduleRender),
);

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
  <section ref="workspaceRef" class="vector-workspace">
    <header class="vector-workspace__toolbar" aria-label="心电向量分析工具栏">
      <div class="vector-workspace__control-group vector-workspace__control-group--ratio">
        <span class="vector-workspace__control-label">P/QRS/T</span>
        <select v-model="activeRatio" class="vector-workspace__select vector-workspace__select--ratio" aria-label="P/QRS/T比例">
          <option
            v-for="option in normalizedData.ratioOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="vector-workspace__divider" aria-hidden="true"></div>

      <div class="vector-workspace__segmented" aria-label="平面切换">
        <button
          v-for="mode in normalizedData.planeModes"
          :key="mode.value"
          type="button"
          :class="[
            'vector-workspace__segment',
            { 'vector-workspace__segment--active': activePlane === mode.value },
          ]"
          :aria-pressed="activePlane === mode.value"
          @click="activePlane = mode.value"
        >
          {{ mode.label }}
        </button>
      </div>

      <div class="vector-workspace__control-group vector-workspace__control-group--loop">
        <span class="vector-workspace__control-label">向量环选择</span>
        <div class="vector-workspace__segmented" aria-label="向量环切换">
          <button
            v-for="mode in normalizedData.loopModes"
            :key="mode.value"
            type="button"
            :class="[
              'vector-workspace__segment',
              { 'vector-workspace__segment--active': activeLoop === mode.value },
            ]"
            :aria-pressed="activeLoop === mode.value"
            @click="activeLoop = mode.value"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>
    </header>

    <main class="vector-workspace__body" aria-label="心电向量专业分析区">
      <section class="vector-workspace__plots" aria-label="心电向量图">
        <article
          v-for="plot in primaryPlots"
          :key="plot.key"
          class="vector-panel vector-panel--plot"
          :class="{ 'vector-panel--muted': !isPlotVisible(plot) }"
          :aria-hidden="!isPlotVisible(plot)"
        >
          <canvas
            :ref="(element) => setCanvasRef(plot.key, element)"
            class="vector-panel__canvas"
            :aria-label="`${plot.label}-${plot.plane}`"
          />
        </article>
      </section>

      <section class="vector-workspace__lower">
        <article class="vector-panel vector-panel--waveform">
          <canvas
            :ref="(element) => setCanvasRef('waveform', element)"
            class="vector-panel__canvas"
            aria-label="X/Y/Z 波形图"
          />
        </article>

        <article
          v-if="secondaryPlot"
          class="vector-panel vector-panel--plot"
          :class="{ 'vector-panel--muted': !isPlotVisible(secondaryPlot) }"
          :aria-hidden="!isPlotVisible(secondaryPlot)"
        >
          <canvas
            :ref="(element) => setCanvasRef(secondaryPlot.key, element)"
            class="vector-panel__canvas"
            :aria-label="`${secondaryPlot.label}-${secondaryPlot.plane}`"
          />
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped lang="scss">
.vector-workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(100%, 1480px);
  min-width: 0;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: 0;
  background: #ffffff;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
}

.vector-workspace__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  min-height: 48px;
  padding: 8px 12px;
  background: #ffffff;
  overflow-x: auto;
}

.vector-workspace__control-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.vector-workspace__control-group--ratio {
  width: 255px;
}

.vector-workspace__control-label {
  color: rgba(0, 0, 0, 0.56);
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
}

.vector-workspace__select {
  width: 112px;
  height: 32px;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  background: #ffffff;
  color: rgba(0, 0, 0, 0.9);
  font-size: 14px;
}

.vector-workspace__select--ratio {
  flex: 1 1 auto;
  min-width: 0;
  width: 175px;
  height: 32px;
  border: 1px solid #dcdcdc;
  border-radius: 3px;
  background: #ffffff;
  color: rgba(0, 0, 0, 0.9);
  font-size: 14px;
}

.vector-workspace__divider {
  width: 1px;
  height: 24px;
  background: #e4e4e4;
  flex: 0 0 auto;
}

.vector-workspace__segmented {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.vector-workspace__segment {
  height: 32px;
  border: 1px solid #d0d0d0;
  background: #ffffff;
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
  line-height: 22px;
  white-space: nowrap;
  cursor: pointer;
}

.vector-workspace__segment {
  min-width: 76px;
  margin-left: -1px;

  &:first-child {
    margin-left: 0;
    border-radius: 4px 0 0 4px;
  }

  &:last-child {
    border-radius: 0 4px 4px 0;
  }
}

.vector-workspace__segment--active {
  position: relative;
  z-index: 1;
  border-color: #0052d9;
  background: #0052d9;
  color: rgba(255, 255, 255, 0.9);
}

.vector-workspace__body {
  display: grid;
  grid-template-rows: auto auto;
  gap: 12px;
  min-height: 0;
  flex: 1 1 auto;
  padding: 0 12px 12px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.22) transparent;
}

.vector-workspace__body::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.vector-workspace__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
}

.vector-workspace__plots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
  align-items: stretch;
}

.vector-workspace__lower {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
  align-items: stretch;
}

.vector-panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  width: 100%;
  aspect-ratio: 722 / 396;
  max-height: 396px;
  border: 1px solid #dcdcdc;
  border-radius: 12px;
  overflow: hidden;
  background: #fffcfd;
}

.vector-panel--plot {
  min-height: 0;
}

.vector-panel--waveform {
  min-height: 0;
}

.vector-panel--muted {
  opacity: 0.28;
}

.vector-panel__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 1180px) {
  .vector-workspace__body {
    grid-template-rows: auto auto;
  }
}

@media (max-width: 760px) {
  .vector-workspace {
    padding: 8px;
  }

  .vector-workspace__plots,
  .vector-workspace__lower {
    grid-template-columns: 1fr;
  }

  .vector-workspace__lower {
    grid-auto-rows: minmax(210px, auto);
  }
}
</style>
