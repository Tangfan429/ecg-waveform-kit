<script setup>
import { computed, useTemplateRef } from "vue";
import { normalizeMonitorPayload } from "../../adapters/normalizeMonitorPayload";
import { useMockMonitorStream } from "../../composables/useMockMonitorStream";
import { printMonitoringDocument } from "../../utils/monitoringPrint";
import MonitorWaveformCard from "./MonitorWaveformCard.vue";

defineOptions({
  name: "MonitorRealtimeWorkspace",
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
    default: "stable_sinus",
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
    default: "监护仪波形工作区",
  },
});

const workspaceRef = useTemplateRef("workspaceRef");

const { payload: mockPayload, tickCount } = useMockMonitorStream({
  scenario: () => props.scenario,
  active: () => props.useMock && !props.payload,
});

const normalizedFrame = computed(() =>
  normalizeMonitorPayload(
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
    subtitle: `${normalizedFrame.value.scenarioLabel || "监护波形"} · ${sourceLabel.value} · ${updateText.value}`,
    html: workspaceRef.value?.outerHTML || "",
  });

defineExpose({
  printWorkspace,
});
</script>

<template>
  <section
    ref="workspaceRef"
    class="monitor-workspace"
  >
    <header class="monitor-workspace__header">
      <div>
        <h2 class="monitor-workspace__title">{{ title }}</h2>
        <p class="monitor-workspace__description">
          {{ normalizedFrame.description || "面向 ICU 监护仪波形的 mock 实时演示，仅保留波形渲染能力。" }}
        </p>
      </div>

      <div class="monitor-workspace__chips">
        <span class="monitor-workspace__chip">{{ normalizedFrame.monitorLabel || "监护设备" }}</span>
        <span class="monitor-workspace__chip">{{ normalizedFrame.scenarioLabel || "监护场景" }}</span>
        <span class="monitor-workspace__chip">{{ sourceLabel }}</span>
        <span class="monitor-workspace__chip">Tick {{ tickCount }}</span>
      </div>
    </header>

    <div class="monitor-workspace__status">
      <span>更新时间 {{ updateText }}</span>
      <span>时间窗 {{ timeWindow }}s</span>
      <span>垂直缩放 {{ amplitudeScale.toFixed(2) }}x</span>
      <span>{{ paused ? "已暂停" : "实时中" }}</span>
    </div>

    <div
      v-if="normalizedFrame.channels.length"
      class="monitor-workspace__grid"
    >
      <MonitorWaveformCard
        v-for="channel in normalizedFrame.channels"
        :key="channel.id"
        :channel="channel"
        :paused="paused"
        :time-window="timeWindow"
        :grid-visible="gridVisible"
        :amplitude-scale="amplitudeScale"
      />
    </div>

    <div
      v-else
      class="monitor-workspace__empty"
    >
      暂无监护仪波形数据。
    </div>
  </section>
</template>

<style scoped lang="scss">
.monitor-workspace {
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

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

@media (max-width: 960px) {
  .monitor-workspace {
    &__grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
