<script setup>
import { ref } from "vue";
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

const examMode = ref("standard_ecg");
const analysisType = ref("waveform");
</script>

<template>
  <div class="app-shell">
    <section>
      <div class="hero-panel">
        <div class="hero-panel__eyebrow">Component Repository</div>
        <div class="hero-panel__header">
          <div>
            <h1 class="hero-panel__title">ECG Waveform Kit</h1>
            <p class="hero-panel__subtitle">
              从诊断中心页面中抽离出的通用波形组件仓库，保留常规心电、动态心电、动态血压、波形分析、平均模板、节律波形、频谱心电、高频心电、QT离散度、心电向量、打印与工具栏能力，去除收藏病例、会诊、审核等业务动作。
            </p>
          </div>

          <div class="hero-panel__summary">
            <div class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">模式</span>
              <strong class="hero-panel__summary-value">三类检查</strong>
            </div>
            <div class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">分析</span>
              <strong class="hero-panel__summary-value">七类标签全内置</strong>
            </div>
            <div class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">输出</span>
              <strong class="hero-panel__summary-value">打印与扩展插槽</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="workspace-panel">
      <WaveformCenter
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
}

.hero-panel {
  margin-bottom: 18px;
  padding: 28px 30px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(244, 248, 255, 0.92) 100%);
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);

  &__eyebrow {
    margin-bottom: 14px;
    color: rgba(53, 98, 236, 0.88);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }

  &__title {
    margin: 0 0 10px;
    font-size: clamp(30px, 4vw, 44px);
    line-height: 1.05;
  }

  &__subtitle {
    margin: 0;
    max-width: 960px;
    color: rgba(15, 23, 42, 0.68);
    font-size: 15px;
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(120px, 1fr));
    gap: 12px;
    min-width: min(100%, 380px);
  }

  &__summary-card {
    padding: 16px 14px;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(238, 243, 255, 0.9) 0%, rgba(255, 255, 255, 0.96) 100%);
    border: 1px solid rgba(53, 98, 236, 0.12);
  }

  &__summary-label {
    display: block;
    margin-bottom: 8px;
    color: rgba(15, 23, 42, 0.5);
    font-size: 12px;
  }

  &__summary-value {
    display: block;
    color: rgba(15, 23, 42, 0.92);
    font-size: 15px;
  }
}

.workspace-panel {
  min-height: calc(100vh - 214px);
}

@media (max-width: 1200px) {
  .hero-panel {
    &__header {
      flex-direction: column;
    }

    &__summary {
      width: 100%;
      min-width: 0;
    }
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 16px;
  }

  .hero-panel {
    padding: 20px;

    &__summary {
      grid-template-columns: 1fr;
    }
  }
}
</style>