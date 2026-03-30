<script setup>
import { computed, useSlots, useTemplateRef } from "vue";
import { normalizeVentilatorPayload } from "../../adapters/normalizeVentilatorPayload";
import { useMockVentilatorStream } from "../../composables/useMockVentilatorStream";
import { printMonitoringDocument } from "../../utils/monitoringPrint";
import MonitorWaveformCard from "./MonitorWaveformCard.vue";
import VentilatorLoopChart from "./VentilatorLoopChart.vue";

defineOptions({
  name: "VentilatorRealtimeWorkspace",
});

const props = defineProps({
  payload: {
    type: Object,
    default: null,
  },
  useMock: {
    type: Boolean,
    default: true,
  },
  scenario: {
    type: String,
    default: "ac_volume",
  },
  paused: {
    type: Boolean,
    default: false,
  },
  timeWindow: {
    type: Number,
    default: 8,
  },
  gridVisible: {
    type: Boolean,
    default: true,
  },
  amplitudeScale: {
    type: Number,
    default: 1,
  },
  title: {
    type: String,
    default: "呼吸机波形工作区",
  },
});

const slots = useSlots();
const workspaceRef = useTemplateRef("workspaceRef");

const { payload: mockPayload, tickCount } = useMockVentilatorStream({
  scenario: () => props.scenario,
  active: () => props.useMock && !props.payload,
});

const normalizedFrame = computed(() =>
  normalizeVentilatorPayload(
    props.payload || (props.useMock ? mockPayload.value : null) || {},
  ),
);
const displayFrame = computed(() => ({
  ...normalizedFrame.value,
  waveforms: (normalizedFrame.value.waveforms || []).map((waveform) => ({
    ...waveform,
    renderMode: "sweep",
    fillArea: false,
  })),
}));

const sourceLabel = computed(() =>
  normalizedFrame.value.source === "mock" ? "Mock 数据流" : "外部数据",
);
const updateText = computed(() =>
  new Date(normalizedFrame.value.timestamp || Date.now()).toLocaleTimeString(),
);
const hasBottomPanel = computed(() => Boolean(slots["bottom-panel"]));
const hasDeviceActions = computed(() => Boolean(slots["device-actions"]));

const printWorkspace = () =>
  printMonitoringDocument({
    title: props.title,
    subtitle: `${normalizedFrame.value.scenarioLabel || "呼吸机波形"} · ${sourceLabel.value} · ${updateText.value}`,
    html: workspaceRef.value?.outerHTML || "",
  });

defineExpose({
  printWorkspace,
});
</script>

<template>
  <section
    ref="workspaceRef"
    class="ventilator-workspace"
  >
    <header class="ventilator-workspace__header">
      <div>
        <h2 class="ventilator-workspace__title">{{ title }}</h2>
        <p class="ventilator-workspace__description">
          呼吸机模式保留三条主波形与环图区域，视觉上贴近 ICU 页面，但移除左侧参数表和右侧报警业务面板。
        </p>
      </div>

      <div class="ventilator-workspace__header-side">
        <div class="ventilator-workspace__summary-group">
          <div class="ventilator-workspace__summary-card">
            <span class="ventilator-workspace__summary-label">模式</span>
            <strong class="ventilator-workspace__summary-value">
              {{ displayFrame.scenarioLabel || "呼吸机场景" }}
            </strong>
          </div>
          <div class="ventilator-workspace__summary-card">
            <span class="ventilator-workspace__summary-label">数据源</span>
            <strong class="ventilator-workspace__summary-value">{{ sourceLabel }}</strong>
          </div>
        </div>

        <div
          v-if="hasDeviceActions"
          class="ventilator-workspace__device-actions"
        >
          <slot
            name="device-actions"
            :frame="displayFrame"
          />
        </div>
      </div>
    </header>

    <div class="ventilator-workspace__status-bar">
      <span>时间窗 {{ timeWindow }}s</span>
      <span>垂直缩放 {{ amplitudeScale.toFixed(2) }}x</span>
      <span>{{ paused ? "已暂停" : "实时扫屏" }}</span>
      <span>主波形 {{ displayFrame.waveforms.length }}</span>
      <span>环图 {{ displayFrame.loops.length }}</span>
      <span>Tick {{ tickCount }}</span>
      <span v-if="displayFrame.metrics.length">指标 {{ displayFrame.metrics.length }}</span>
    </div>

    <div class="ventilator-workspace__wave-board">
      <div
        v-if="displayFrame.waveforms.length"
        class="ventilator-workspace__wave-list"
      >
        <MonitorWaveformCard
          v-for="(waveform, index) in displayFrame.waveforms"
          :key="waveform.id"
          :channel="waveform"
          :paused="paused"
          :time-window="timeWindow"
          :grid-visible="gridVisible"
          :amplitude-scale="amplitudeScale"
          :canvas-height="148"
          :show-x-axis-labels="index === displayFrame.waveforms.length - 1"
          shell-variant="strip"
          surface-tone="light"
          background-color="#ffffff"
          :meta-column-width="140"
        />
      </div>

      <div
        v-else
        class="ventilator-workspace__empty"
      >
        暂无呼吸机波形数据。
      </div>
    </div>

    <section
      v-if="displayFrame.loops.length"
      class="ventilator-workspace__loop-board"
    >
      <header class="ventilator-workspace__section-head">
        <h3 class="ventilator-workspace__section-title">环图</h3>
        <p class="ventilator-workspace__section-copy">
          保留 ICU 页面中的环图观察区，用于辅助查看压力、流速与容量之间的关系。
        </p>
      </header>

      <div class="ventilator-workspace__loop-grid">
        <VentilatorLoopChart
          v-for="loop in displayFrame.loops"
          :key="loop.id"
          :loop="loop"
        />
      </div>
    </section>

    <section
      v-if="hasBottomPanel"
      class="ventilator-workspace__bottom-panel"
    >
      <slot
        name="bottom-panel"
        :frame="displayFrame"
      />
    </section>
  </section>
</template>

<style scoped lang="scss">
.ventilator-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }

  &__header-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    min-width: min(100%, 320px);
  }

  &__title {
    margin: 0;
    color: #0f172a;
    font-size: 24px;
    line-height: 1.02;
  }

  &__description {
    margin: 10px 0 0;
    max-width: 760px;
    color: #64748b;
    font-size: 14px;
    line-height: 1.7;
  }

  &__summary-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(132px, 1fr));
    gap: 12px;
    width: 100%;
  }

  &__summary-card {
    padding: 14px 16px;
    border: 1px solid rgba(203, 213, 225, 0.88);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.84);
  }

  &__summary-label {
    display: block;
    color: #64748b;
    font-size: 12px;
  }

  &__summary-value {
    display: block;
    margin-top: 7px;
    color: #0f172a;
    font-size: 14px;
    line-height: 1.4;
  }

  &__device-actions {
    width: 100%;
  }

  &__status-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    span {
      padding: 7px 12px;
      border-radius: 999px;
      border: 1px solid rgba(203, 213, 225, 0.92);
      background: rgba(255, 255, 255, 0.78);
      color: #475569;
      font-size: 12px;
      line-height: 1;
    }
  }

  &__wave-board,
  &__loop-board {
    padding: 14px;
    border: 1px solid rgba(203, 213, 225, 0.86);
    border-radius: 24px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 100%);
  }

  &__wave-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  &__section-title {
    margin: 0;
    color: #0f172a;
    font-size: 18px;
    line-height: 1.1;
  }

  &__section-copy {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.6;
  }

  &__loop-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  &__bottom-panel {
    padding: 16px;
    border-radius: 22px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255, 255, 255, 0.72);
  }

  &__empty {
    padding: 56px 24px;
    border: 1px dashed rgba(148, 163, 184, 0.34);
    border-radius: 18px;
    background: rgba(248, 250, 252, 0.72);
    color: #64748b;
    font-size: 14px;
    text-align: center;
  }
}

@media (max-width: 1080px) {
  .ventilator-workspace {
    &__header-side {
      align-items: stretch;
    }

    &__loop-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (max-width: 720px) {
  .ventilator-workspace {
    &__summary-group,
    &__loop-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    &__wave-board,
    &__loop-board {
      padding: 10px;
    }
  }
}
</style>