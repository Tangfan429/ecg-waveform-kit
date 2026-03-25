<script setup>
import { computed } from "vue";

defineOptions({
  name: "HighFrequencyEcgWorkspace",
});

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      title: "高频心电",
      subtitle: "用于观察高频碎裂和晚电位信号的通用工作区。",
      activeLead: "V1",
      riskLevel: "低风险",
      leadProfiles: [],
      waveform: [],
      envelope: [],
      summaryRows: [],
    }),
  },
});

const chart = Object.freeze({
  width: 940,
  height: 360,
  padding: {
    top: 28,
    right: 28,
    bottom: 28,
    left: 24,
  },
});

const normalizedWaveform = computed(() => {
  const waveform = Array.isArray(props.data.waveform) ? props.data.waveform : [];

  if (!waveform.length) {
    return [];
  }

  const maxAmplitude = Math.max(
    ...waveform.map((value) => Math.abs(Number(value) || 0)),
    1,
  );
  const innerWidth = chart.width - chart.padding.left - chart.padding.right;
  const innerHeight = chart.height - chart.padding.top - chart.padding.bottom;
  const baselineY = chart.padding.top + innerHeight / 2;

  return waveform.map((value, index) => ({
    x:
      chart.padding.left +
      (index / Math.max(waveform.length - 1, 1)) * innerWidth,
    y: baselineY - ((Number(value) || 0) / maxAmplitude) * (innerHeight * 0.42),
  }));
});

const normalizedEnvelope = computed(() => {
  const envelope = Array.isArray(props.data.envelope) ? props.data.envelope : [];

  if (!envelope.length) {
    return [];
  }

  const maxAmplitude = Math.max(...envelope.map((value) => Number(value) || 0), 1);
  const innerWidth = chart.width - chart.padding.left - chart.padding.right;
  const innerHeight = chart.height - chart.padding.top - chart.padding.bottom;
  const baselineY = chart.padding.top + innerHeight / 2;

  return envelope.map((value, index) => ({
    x:
      chart.padding.left +
      (index / Math.max(envelope.length - 1, 1)) * innerWidth,
    yTop: baselineY - ((Number(value) || 0) / maxAmplitude) * (innerHeight * 0.38),
    yBottom: baselineY + ((Number(value) || 0) / maxAmplitude) * (innerHeight * 0.38),
  }));
});

const waveformPath = computed(() =>
  normalizedWaveform.value
    .map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(" "),
);

const envelopeTopPath = computed(() =>
  normalizedEnvelope.value
    .map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.yTop.toFixed(2)}`,
    )
    .join(" "),
);

const envelopeBottomPath = computed(() =>
  normalizedEnvelope.value
    .map((point, index) =>
      `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.yBottom.toFixed(2)}`,
    )
    .join(" "),
);

const maxEnergy = computed(() =>
  Math.max(
    ...(Array.isArray(props.data.leadProfiles)
      ? props.data.leadProfiles.map((item) => Number(item.energy) || 0)
      : [0]),
    1,
  ),
);
</script>

<template>
  <section class="hf-workspace">
    <header class="hf-workspace__header">
      <div>
        <div class="hf-workspace__eyebrow">High Frequency ECG</div>
        <h3 class="hf-workspace__title">{{ data.title }}</h3>
        <p class="hf-workspace__subtitle">{{ data.subtitle }}</p>
      </div>

      <div class="hf-workspace__risk-card">
        <span class="hf-workspace__risk-label">综合评估</span>
        <strong class="hf-workspace__risk-value">{{ data.riskLevel }}</strong>
      </div>
    </header>

    <div class="hf-workspace__body">
      <article class="signal-card">
        <div class="signal-card__header">
          <h4 class="signal-card__title">滤波信号与包络</h4>
          <span class="signal-card__meta">Lead {{ data.activeLead }}</span>
        </div>

        <svg
          class="signal-card__svg"
          :viewBox="`0 0 ${chart.width} ${chart.height}`"
          aria-label="high-frequency-ecg-waveform"
        >
          <rect width="940" height="360" rx="24" fill="#f8fbff" />

          <line
            :x1="chart.padding.left"
            :x2="chart.width - chart.padding.right"
            :y1="chart.height / 2"
            :y2="chart.height / 2"
            stroke="rgba(148,163,184,0.22)"
            stroke-dasharray="4 6"
          />

          <path
            v-if="envelopeTopPath"
            :d="envelopeTopPath"
            fill="none"
            stroke="rgba(43,164,113,0.38)"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <path
            v-if="envelopeBottomPath"
            :d="envelopeBottomPath"
            fill="none"
            stroke="rgba(43,164,113,0.38)"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <path
            v-if="waveformPath"
            :d="waveformPath"
            fill="none"
            stroke="#0f172a"
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
      </article>

      <aside class="profile-card">
        <div class="profile-card__header">
          <h4 class="profile-card__title">导联能量画像</h4>
        </div>

        <div class="profile-card__list">
          <div
            v-for="profile in data.leadProfiles"
            :key="profile.lead"
            class="profile-card__item"
          >
            <div class="profile-card__lead-row">
              <strong>{{ profile.lead }}</strong>
              <span>{{ profile.energy }}%</span>
            </div>
            <div class="profile-card__bar-track">
              <div
                class="profile-card__bar-fill"
                :style="{ width: `${(Number(profile.energy) / maxEnergy) * 100}%` }"
              />
            </div>
            <div class="profile-card__metrics">
              <span>RMS40 {{ profile.rms40 }}μV</span>
              <span>LAS40 {{ profile.las40 }}ms</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <footer class="hf-workspace__footer">
      <div
        v-for="row in data.summaryRows"
        :key="row.label"
        class="hf-workspace__summary-pill"
      >
        <span>{{ row.label }}</span>
        <strong>{{ row.value }}</strong>
      </div>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.hf-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at left top, rgba(43, 164, 113, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 251, 249, 0.96) 100%);
}

.hf-workspace__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.hf-workspace__eyebrow {
  margin-bottom: 8px;
  color: rgba(43, 164, 113, 0.88);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hf-workspace__title {
  margin: 0;
  font-size: 24px;
}

.hf-workspace__subtitle {
  margin: 8px 0 0;
  color: rgba(15, 23, 42, 0.58);
  font-size: 14px;
}

.hf-workspace__risk-card {
  min-width: 140px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(43, 164, 113, 0.08);
}

.hf-workspace__risk-label {
  display: block;
  margin-bottom: 6px;
  color: rgba(15, 23, 42, 0.52);
  font-size: 12px;
}

.hf-workspace__risk-value {
  color: #15803d;
  font-size: 18px;
}

.hf-workspace__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  min-height: 0;
}

.signal-card,
.profile-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
}

.signal-card {
  padding: 18px;
}

.signal-card__header,
.profile-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.signal-card__title,
.profile-card__title {
  margin: 0;
  font-size: 16px;
}

.signal-card__meta {
  color: rgba(15, 23, 42, 0.58);
  font-size: 13px;
}

.signal-card__svg {
  width: 100%;
  height: auto;
}

.profile-card {
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.profile-card__list {
  display: grid;
  gap: 12px;
}

.profile-card__item {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.96);
}

.profile-card__lead-row,
.profile-card__metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.profile-card__metrics {
  margin-top: 8px;
  color: rgba(15, 23, 42, 0.54);
  font-size: 12px;
}

.profile-card__bar-track {
  margin-top: 10px;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  overflow: hidden;
}

.profile-card__bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2ba471 0%, #16a34a 100%);
}

.hf-workspace__footer {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.hf-workspace__summary-pill {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);

  span {
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }
}

@media (max-width: 1100px) {
  .hf-workspace__body {
    grid-template-columns: 1fr;
  }

  .hf-workspace__footer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .hf-workspace {
    padding: 16px;
  }

  .hf-workspace__header {
    flex-direction: column;
  }

  .hf-workspace__footer {
    grid-template-columns: 1fr;
  }
}
</style>