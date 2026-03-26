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

const sourceLabel = computed(() =>
  normalizedFrame.value.source === "mock" ? "Mock 数据流" : "外部数据",
);
const updateText = computed(() =>
  new Date(normalizedFrame.value.timestamp || Date.now()).toLocaleTimeString(),
);
const hasLeftPanel = computed(() => Boolean(slots["left-panel"]));
const hasAlarmPanel = computed(() => Boolean(slots["alarm-panel"]));
const hasBottomPanel = computed(() => Boolean(slots["bottom-panel"]));
const hasDeviceActions = computed(() => Boolean(slots["device-actions"]));
const bodyClass = computed(() => ({
  "ventilator-workspace__body--with-left": hasLeftPanel.value,
  "ventilator-workspace__body--with-alarm": hasAlarmPanel.value,
  "ventilator-workspace__body--with-both":
    hasLeftPanel.value && hasAlarmPanel.value,
}));

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
          {{
            normalizedFrame.description ||
              "保留呼吸机压力、流速、容量波形与环图能力，呼吸机波形默认采用从左到右扫屏渲染，并通过插槽承接左侧指标、报警和设备动作扩展。"
          }}
        </p>
      </div>

      <div class="ventilator-workspace__header-side">
        <div class="ventilator-workspace__chips">
          <span class="ventilator-workspace__chip">
            {{ normalizedFrame.ventilatorLabel || "呼吸机设备" }}
          </span>
          <span class="ventilator-workspace__chip">
            {{ normalizedFrame.scenarioLabel || "呼吸机场景" }}
          </span>
          <span class="ventilator-workspace__chip">{{ sourceLabel }}</span>
          <span class="ventilator-workspace__chip">Tick {{ tickCount }}</span>
        </div>

        <div
          v-if="hasDeviceActions"
          class="ventilator-workspace__device-actions"
        >
          <slot
            name="device-actions"
            :frame="normalizedFrame"
          />
        </div>
      </div>
    </header>

    <div class="ventilator-workspace__status">
      <span>更新时间 {{ updateText }}</span>
      <span>时间窗 {{ timeWindow }}s</span>
      <span>垂直缩放 {{ amplitudeScale.toFixed(2) }}x</span>
      <span>{{ paused ? "已暂停" : "实时中" }}</span>
      <span v-if="normalizedFrame.metrics.length">
        指标 {{ normalizedFrame.metrics.length }} 项
      </span>
      <span v-if="normalizedFrame.warning.length">
        报警 {{ normalizedFrame.warning.length }}
      </span>
    </div>

    <div
      class="ventilator-workspace__body"
      :class="bodyClass"
    >
      <section
        v-if="hasLeftPanel"
        class="ventilator-workspace__panel"
      >
        <slot
          name="left-panel"
          :frame="normalizedFrame"
        />
      </section>

      <div class="ventilator-workspace__main">
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
      </div>

      <section
        v-if="hasAlarmPanel"
        class="ventilator-workspace__panel"
      >
        <slot
          name="alarm-panel"
          :frame="normalizedFrame"
        />
      </section>
    </div>

    <section
      v-if="hasBottomPanel"
      class="ventilator-workspace__bottom-panel"
    >
      <slot
        name="bottom-panel"
        :frame="normalizedFrame"
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
  }

  &__title {
    margin: 0;
    color: #0f172a;
    font-size: 22px;
    line-height: 1.05;
  }

  &__description {
    margin: 10px 0 0;
    max-width: 760px;
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

  &__device-actions {
    width: 100%;
    min-width: 0;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    color: #64748b;
    font-size: 12px;
  }

  &__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    align-items: start;

    &--with-left {
      grid-template-columns: 280px minmax(0, 1fr);
    }

    &--with-alarm {
      grid-template-columns: minmax(0, 1fr) 280px;
    }

    &--with-both {
      grid-template-columns: 280px minmax(0, 1fr) 280px;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
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

  &__panel,
  &__bottom-panel {
    min-width: 0;
    padding: 16px;
    border-radius: 22px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255, 255, 255, 0.72);
    box-shadow:
      0 14px 30px rgba(15, 23, 42, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
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

@media (max-width: 1320px) {
  .ventilator-workspace {
    &__body,
    &__body--with-left,
    &__body--with-alarm,
    &__body--with-both {
      grid-template-columns: minmax(0, 1fr);
    }
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
    &__header-side {
      align-items: stretch;
    }

    &__wave-grid,
    &__loop-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
