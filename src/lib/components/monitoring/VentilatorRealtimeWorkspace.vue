<script setup>
import { computed, useTemplateRef } from "vue";
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

const sourceLabel = computed(() =>
  normalizedFrame.value.source === "mock" ? "Mock Stream" : "External Payload",
);
const updateText = computed(() =>
  new Date(normalizedFrame.value.timestamp || Date.now()).toLocaleTimeString(),
);

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
          {{ normalizedFrame.description || "模拟呼吸机压力、流速、容量三联波形与经典环图布局。" }}
        </p>
      </div>

      <div class="ventilator-workspace__chips">
        <span class="ventilator-workspace__chip">{{ normalizedFrame.ventilatorLabel || "呼吸设备" }}</span>
        <span class="ventilator-workspace__chip">{{ normalizedFrame.scenarioLabel || "呼吸机场景" }}</span>
        <span class="ventilator-workspace__chip">{{ sourceLabel }}</span>
        <span class="ventilator-workspace__chip">Tick {{ tickCount }}</span>
      </div>
    </header>

    <div class="ventilator-workspace__status">
      <span>更新时间 {{ updateText }}</span>
      <span>时间窗 {{ timeWindow }}s</span>
      <span>垂直缩放 {{ amplitudeScale.toFixed(2) }}x</span>
      <span>{{ paused ? "已暂停" : "实时中" }}</span>
    </div>

    <div
      v-if="normalizedFrame.waveforms.length"
      class="ventilator-workspace__wave-grid"
    >
      <MonitorWaveformCard
        v-for="waveform in normalizedFrame.waveforms"
        :key="waveform.id"
        :channel="waveform"
        :paused="paused"
        :time-window="timeWindow"
        :grid-visible="gridVisible"
        :amplitude-scale="amplitudeScale"
        :background-color="'#07131f'"
      />
    </div>

    <div
      v-if="normalizedFrame.loops.length"
      class="ventilator-workspace__loop-grid"
    >
      <VentilatorLoopChart
        v-for="loop in normalizedFrame.loops"
        :key="loop.id"
        :loop="loop"
      />
    </div>

    <div
      v-if="!normalizedFrame.waveforms.length && !normalizedFrame.loops.length"
      class="ventilator-workspace__empty"
    >
      暂无呼吸机波形数据。
    </div>
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

  &__title {
    margin: 0;
    color: #0f172a;
    font-size: 22px;
    line-height: 1.05;
  }

  &__description {
    margin: 10px 0 0;
    max-width: 720px;
    color: #475569;
    font-size: 14px;
    line-height: 1.7;
  }

  &__chips {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__chip {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(148, 163, 184, 0.18);
    color: #334155;
    font-size: 12px;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    color: #64748b;
    font-size: 12px;
  }

  &__wave-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  &__loop-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  &__empty {
    padding: 48px 24px;
    border: 1px dashed rgba(148, 163, 184, 0.34);
    border-radius: 22px;
    background: rgba(248, 250, 252, 0.72);
    color: #64748b;
    font-size: 14px;
    text-align: center;
  }
}

@media (max-width: 1080px) {
  .ventilator-workspace {
    &__wave-grid,
    &__loop-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (max-width: 720px) {
  .ventilator-workspace {
    &__wave-grid,
    &__loop-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
