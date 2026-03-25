<script setup>
import { computed, ref } from "vue";
import MonitoringCenter from "./lib/components/monitoring/MonitoringCenter.vue";
import WaveformCenter from "./lib/components/WaveformCenter.vue";
import {
  demoHighFrequencyEcg,
  demoQtDispersion,
  demoReports,
  demoSpectrumAnalysis,
  demoStandardEcg,
  demoStandardPrintMeta,
  demoVectorEcg,
} from "./lib/demo/demoData";

const surfaceMode = ref("monitoring");
const examMode = ref("standard_ecg");
const analysisType = ref("waveform");
const monitoringMode = ref("monitor");

const surfaceOptions = Object.freeze([
  {
    value: "monitoring",
    label: "监护波形",
    description: "ICU 监护仪与呼吸机波形，使用 mock stream 模拟实时数据。",
  },
  {
    value: "diagnosis",
    label: "诊断波形",
    description: "现有十二导联诊断中心演示入口。",
  },
]);

const activeSurfaceSummary = computed(
  () =>
    surfaceOptions.find((item) => item.value === surfaceMode.value) ||
    surfaceOptions[0],
);
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div>
        <p class="app-shell__eyebrow">Reusable Medical Waveform Library</p>
        <h1 class="app-shell__title">ecg-web 组件库演示台</h1>
        <p class="app-shell__summary">
          {{ activeSurfaceSummary.description }}
        </p>
      </div>

      <div class="app-shell__mode-group">
        <button
          v-for="item in surfaceOptions"
          :key="item.value"
          type="button"
          :class="[
            'app-shell__mode-pill',
            {
              'app-shell__mode-pill--active': surfaceMode === item.value,
            },
          ]"
          @click="surfaceMode = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </header>

    <section class="workspace-panel">
      <MonitoringCenter
        v-if="surfaceMode === 'monitoring'"
        v-model:mode="monitoringMode"
      />

      <WaveformCenter
        v-else
        v-model:exam-mode="examMode"
        v-model:analysis-type="analysisType"
        :standard-waveform-data="demoStandardEcg.waveformData"
        :standard-sample-rate="demoStandardEcg.sampleRate"
        :standard-duration="demoStandardEcg.duration"
        :measurement-data="demoStandardEcg.measurementData"
        :standard-print-meta="demoStandardPrintMeta"
        :reports="demoReports"
        :spectrum-data="demoSpectrumAnalysis"
        :high-frequency-data="demoHighFrequencyEcg"
        :qt-dispersion-data="demoQtDispersion"
        :vector-data="demoVectorEcg"
      />
    </section>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  padding: 28px;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  &__eyebrow {
    margin: 0;
    color: #4f46e5;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 32px;
    line-height: 1.02;
  }

  &__summary {
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
}

.workspace-panel {
  min-height: calc(100vh - 56px);
}

@media (max-width: 768px) {
  .app-shell {
    padding: 16px;

    &__title {
      font-size: 26px;
    }
  }

  .workspace-panel {
    min-height: calc(100vh - 32px);
  }
}
</style>