<script setup>
import { computed, useSlots, useTemplateRef } from "vue";
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

const slots = useSlots();
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
const displayFrame = computed(() => ({
  ...normalizedFrame.value,
  channels: (normalizedFrame.value.channels || []).map((channel) => ({
    ...channel,
    // 监护仪统一切换为扫屏模式，以贴近 ICU 页面中的连续扫描体验。
    renderMode: "sweep",
  })),
}));

const sourceLabel = computed(() =>
  normalizedFrame.value.source === "mock" ? "Mock 数据流" : "外部数据",
);
const updateText = computed(() =>
  new Date(normalizedFrame.value.timestamp || Date.now()).toLocaleTimeString(),
);
const hasBottomPanel = computed(() => Boolean(slots["bottom-panel"]));

const printWorkspace = () =>
  printMonitoringDocument({
    title: props.title,
    subtitle: `${normalizedFrame.value.scenarioLabel || "监护仪波形"} · ${sourceLabel.value} · ${updateText.value}`,
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
          监护仪模式保留 ecg-web 的通用容器结构，但将波形区切换为更接近 ICU 设备的连续扫屏条带展示。
        </p>
      </div>

      <div class="monitor-workspace__summary-group">
        <div class="monitor-workspace__summary-card">
          <span class="monitor-workspace__summary-label">场景</span>
          <strong class="monitor-workspace__summary-value">
            {{ displayFrame.scenarioLabel || "监护场景" }}
          </strong>
        </div>
        <div class="monitor-workspace__summary-card">
          <span class="monitor-workspace__summary-label">数据源</span>
          <strong class="monitor-workspace__summary-value">{{ sourceLabel }}</strong>
        </div>
        <div class="monitor-workspace__summary-card">
          <span class="monitor-workspace__summary-label">刷新</span>
          <strong class="monitor-workspace__summary-value">{{ updateText }}</strong>
        </div>
      </div>
    </header>

    <div class="monitor-workspace__status-bar">
      <span>时间窗 {{ timeWindow }}s</span>
      <span>垂直缩放 {{ amplitudeScale.toFixed(2) }}x</span>
      <span>{{ paused ? "已暂停" : "实时扫屏" }}</span>
      <span>通道 {{ displayFrame.channels.length }}</span>
      <span>Tick {{ tickCount }}</span>
      <span v-if="displayFrame.warning.length">报警 {{ displayFrame.warning.length }}</span>
      <span v-if="displayFrame.nibpHistory.length">NIBP {{ displayFrame.nibpHistory.length }} 条</span>
    </div>

    <div class="monitor-workspace__board">
      <div
        v-if="displayFrame.channels.length"
        class="monitor-workspace__track-list"
      >
        <MonitorWaveformCard
          v-for="(channel, index) in displayFrame.channels"
          :key="channel.id"
          :channel="channel"
          :paused="paused"
          :time-window="timeWindow"
          :grid-visible="gridVisible"
          :amplitude-scale="amplitudeScale"
          :canvas-height="index === displayFrame.channels.length - 1 ? 150 : 132"
          :show-x-axis-labels="index === displayFrame.channels.length - 1"
          shell-variant="strip"
          surface-tone="light"
          background-color="#ffffff"
          :meta-column-width="132"
        />
      </div>

      <div
        v-else
        class="monitor-workspace__empty"
      >
        暂无监护仪波形数据。
      </div>
    </div>

    <section
      v-if="hasBottomPanel"
      class="monitor-workspace__bottom-panel"
    >
      <slot
        name="bottom-panel"
        :frame="displayFrame"
      />
    </section>
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
    grid-template-columns: repeat(3, minmax(132px, 1fr));
    gap: 12px;
    width: min(100%, 480px);
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

  &__board {
    padding: 14px;
    border: 1px solid rgba(203, 213, 225, 0.86);
    border-radius: 24px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 100%);
  }

  &__track-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
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
  .monitor-workspace {
    &__summary-group {
      grid-template-columns: repeat(2, minmax(132px, 1fr));
      width: 100%;
    }
  }
}

@media (max-width: 720px) {
  .monitor-workspace {
    &__summary-group {
      grid-template-columns: minmax(0, 1fr);
    }

    &__board {
      padding: 10px;
    }
  }
}
</style>