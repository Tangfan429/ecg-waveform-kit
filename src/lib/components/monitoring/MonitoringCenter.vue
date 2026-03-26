<script setup>
import { computed, ref, useSlots, useTemplateRef } from "vue";
import { useWaveformViewport } from "../../composables/useWaveformViewport";
import {
  monitorScenarioOptions,
  ventilatorScenarioOptions,
} from "../../demo/monitoringDemoData";
import MonitorRealtimeWorkspace from "./MonitorRealtimeWorkspace.vue";
import MonitoringToolbar from "./MonitoringToolbar.vue";
import VentilatorRealtimeWorkspace from "./VentilatorRealtimeWorkspace.vue";

defineOptions({
  name: "MonitoringCenter",
});

const modeModel = defineModel("mode", {
  type: String,
  default: "monitor",
});

const props = defineProps({
  monitorPayload: {
    type: Object,
    default: null,
  },
  ventilatorPayload: {
    type: Object,
    default: null,
  },
  useMock: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: "监护波形中心",
  },
  subtitle: {
    type: String,
    default:
      "从 ICU 监护模块抽离出的通用波形能力区，当前使用 mock stream 模拟实时数据，并支持后续通过 adapter 接入真实 WebSocket。",
  },
});

const slots = useSlots();
const workspaceRef = useTemplateRef("workspaceRef");
const viewportRef = useTemplateRef("viewportRef");

const paused = ref(false);
const gridVisible = ref(true);
const timeWindow = ref(8);
const amplitudeScale = ref(1);
const monitorScenarioKey = ref("stable_sinus");
const ventilatorScenarioKey = ref("ac_volume");

const {
  zoomPercent,
  zoomScale,
  isFullscreen,
  zoomIn,
  zoomOut,
  resetZoom,
  toggleFullscreen,
} = useWaveformViewport(viewportRef);

const activeScenarioKey = computed({
  get() {
    return modeModel.value === "monitor"
      ? monitorScenarioKey.value
      : ventilatorScenarioKey.value;
  },
  set(value) {
    if (modeModel.value === "monitor") {
      monitorScenarioKey.value = value;
      return;
    }

    ventilatorScenarioKey.value = value;
  },
});

const activeScenarioOptions = computed(() =>
  modeModel.value === "monitor"
    ? monitorScenarioOptions
    : ventilatorScenarioOptions,
);

const viewportStyle = computed(() => ({
  transform: `scale(${zoomScale.value})`,
}));

const modeOptions = Object.freeze([
  { value: "monitor", label: "监护仪波形" },
  { value: "ventilator", label: "呼吸机波形" },
]);

const hasMonitorRightPanel = computed(() => Boolean(slots["monitor-right-panel"]));
const hasMonitorBottomPanel = computed(() => Boolean(slots["monitor-bottom-panel"]));
const hasMonitorAlarmPanel = computed(() => Boolean(slots["monitor-alarm-panel"]));
const hasVentilatorLeftPanel = computed(() => Boolean(slots["ventilator-left-panel"]));
const hasVentilatorBottomPanel = computed(() => Boolean(slots["ventilator-bottom-panel"]));
const hasVentilatorAlarmPanel = computed(() => Boolean(slots["ventilator-alarm-panel"]));
const hasVentilatorDeviceActions = computed(() =>
  Boolean(slots["ventilator-device-actions"]),
);

const handlePrint = () => {
  workspaceRef.value?.printWorkspace?.();
};
</script>

<template>
  <section class="monitoring-center">
    <header class="monitoring-center__header">
      <div>
        <p class="monitoring-center__eyebrow">Monitoring Subsystem</p>
        <h1 class="monitoring-center__title">{{ title }}</h1>
        <p class="monitoring-center__subtitle">
          {{ subtitle }}
        </p>
      </div>

      <div class="monitoring-center__mode-group">
        <button
          v-for="mode in modeOptions"
          :key="mode.value"
          type="button"
          :class="[
            'monitoring-center__mode-pill',
            {
              'monitoring-center__mode-pill--active': modeModel === mode.value,
            },
          ]"
          @click="modeModel = mode.value"
        >
          {{ mode.label }}
        </button>
      </div>
    </header>

    <div class="monitoring-center__note">
      已剥离病人切换、设备绑定和会诊审核等业务逻辑，当前保留波形、环图、打印、全屏与工具栏能力，并为 ICU 右侧指标、报警及底部扩展面板预留插槽。
    </div>

    <MonitoringToolbar
      v-model:paused="paused"
      v-model:grid-visible="gridVisible"
      v-model:time-window="timeWindow"
      v-model:amplitude-scale="amplitudeScale"
      v-model:scenario-key="activeScenarioKey"
      :mode-label="modeModel === 'monitor' ? '监护仪场景' : '呼吸机场景'"
      :scenario-options="activeScenarioOptions"
      :zoom-percent="zoomPercent"
      :is-fullscreen="isFullscreen"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @zoom-reset="resetZoom"
      @toggle-fullscreen="toggleFullscreen"
      @print="handlePrint"
    />

    <div
      ref="viewportRef"
      class="monitoring-center__viewport-shell"
    >
      <div
        class="monitoring-center__viewport"
        :style="viewportStyle"
      >
        <MonitorRealtimeWorkspace
          v-if="modeModel === 'monitor'"
          ref="workspaceRef"
          :payload="monitorPayload"
          :use-mock="useMock"
          :scenario="monitorScenarioKey"
          :paused="paused"
          :time-window="timeWindow"
          :grid-visible="gridVisible"
          :amplitude-scale="amplitudeScale"
        >
          <template
            v-if="hasMonitorRightPanel"
            #right-panel="slotProps"
          >
            <slot
              name="monitor-right-panel"
              v-bind="slotProps"
            />
          </template>

          <template
            v-if="hasMonitorBottomPanel"
            #bottom-panel="slotProps"
          >
            <slot
              name="monitor-bottom-panel"
              v-bind="slotProps"
            />
          </template>

          <template
            v-if="hasMonitorAlarmPanel"
            #alarm-panel="slotProps"
          >
            <slot
              name="monitor-alarm-panel"
              v-bind="slotProps"
            />
          </template>
        </MonitorRealtimeWorkspace>

        <VentilatorRealtimeWorkspace
          v-else
          ref="workspaceRef"
          :payload="ventilatorPayload"
          :use-mock="useMock"
          :scenario="ventilatorScenarioKey"
          :paused="paused"
          :time-window="timeWindow"
          :grid-visible="gridVisible"
          :amplitude-scale="amplitudeScale"
        >
          <template
            v-if="hasVentilatorLeftPanel"
            #left-panel="slotProps"
          >
            <slot
              name="ventilator-left-panel"
              v-bind="slotProps"
            />
          </template>

          <template
            v-if="hasVentilatorBottomPanel"
            #bottom-panel="slotProps"
          >
            <slot
              name="ventilator-bottom-panel"
              v-bind="slotProps"
            />
          </template>

          <template
            v-if="hasVentilatorAlarmPanel"
            #alarm-panel="slotProps"
          >
            <slot
              name="ventilator-alarm-panel"
              v-bind="slotProps"
            />
          </template>

          <template
            v-if="hasVentilatorDeviceActions"
            #device-actions="slotProps"
          >
            <slot
              name="ventilator-device-actions"
              v-bind="slotProps"
            />
          </template>
        </VentilatorRealtimeWorkspace>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.monitoring-center {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 720px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(79, 124, 255, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(252, 253, 255, 0.96) 0%, rgba(245, 248, 255, 0.96) 100%);
  box-shadow:
    0 30px 70px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }

  &__eyebrow {
    margin: 0;
    color: #4f46e5;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 32px;
    line-height: 0.98;
  }

  &__subtitle {
    margin: 12px 0 0;
    max-width: 760px;
    color: #475569;
    font-size: 14px;
    line-height: 1.7;
  }

  &__mode-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__mode-pill {
    padding: 11px 18px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      color 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(79, 124, 255, 0.3);
      box-shadow: 0 12px 26px rgba(79, 124, 255, 0.14);
    }

    &--active {
      border-color: transparent;
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      color: #ffffff;
    }
  }

  &__note {
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.7);
    color: #475569;
    font-size: 13px;
    line-height: 1.6;
  }

  &__viewport-shell {
    overflow: auto;
    border-radius: 26px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.66));
  }

  &__viewport {
    transform-origin: top center;
    transition: transform 0.22s ease;
  }
}

@media (max-width: 768px) {
  .monitoring-center {
    padding: 14px;

    &__title {
      font-size: 26px;
    }
  }
}
</style>
