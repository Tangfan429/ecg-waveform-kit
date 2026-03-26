<script setup>
import { computed, ref, watch } from "vue";
import MonitoringCenter from "./lib/components/monitoring/MonitoringCenter.vue";
import WatchAiAnalysisCard from "./lib/components/WatchAiAnalysisCard.vue";
import WatchAiGatewaySettings from "./lib/components/WatchAiGatewaySettings.vue";
import WatchHistorySelector from "./lib/components/WatchHistorySelector.vue";
import WaveformCenter from "./lib/components/WaveformCenter.vue";
import { useWatchEcgAiConfig } from "./lib/composables/useWatchEcgAiConfig";
import { useWatchEcgAiAnalysis } from "./lib/composables/useWatchEcgAiAnalysis";
import { useWatchEcgFeed } from "./lib/composables/useWatchEcgFeed";
import { useWatchEcgHistory } from "./lib/composables/useWatchEcgHistory";
import { useWatchLeadAnalysis } from "./lib/composables/useWatchLeadAnalysis";
import {
  demoHighFrequencyEcg,
  demoQtDispersion,
  demoReports,
  demoSpectrumAnalysis,
  demoStandardEcg,
  demoStandardPrintMeta,
  demoVectorEcg,
} from "./lib/demo/demoData";
import {
  LEAD_MODE_LEAD_I,
  LEAD_MODE_STANDARD,
} from "./lib/utils/leadModes";

const DATA_SOURCE_OPTIONS = Object.freeze([
  {
    value: "demo",
    label: "演示数据",
    description: "使用仓库内置的十二导联样例数据。",
  },
  {
    value: "watchApi",
    label: "Apple Watch API",
    description: "读取 /api/watch-ecg/latest 的 Lead I 单导联数据。",
  },
]);
const EXAM_MODE_OPTIONS = Object.freeze([
  { value: "standard_ecg", label: "常规心电" },
  { value: "dynamic_ecg", label: "动态心电" },
  { value: "dynamic_bp", label: "动态血压" },
]);
const DIAGNOSIS_LEAD_MODE_OPTIONS = Object.freeze([
  {
    value: LEAD_MODE_STANDARD,
    label: "十二导联",
    shortLabel: "12 Lead",
    description: "标准十二导联联动视图。",
  },
  {
    value: LEAD_MODE_LEAD_I,
    label: "Lead I 单导联",
    shortLabel: "Lead I",
    description: "适配 Apple Watch 单导联视图。",
  },
]);
const WATCH_AI_GATEWAY_PRESETS = Object.freeze([
  {
    id: "b022hub",
    label: "b022hub",
    description: "Responses API 预设，自动带出 /v1 + /responses。",
  },
]);
const WATCH_FALLBACK_ANALYSIS_TABS = Object.freeze([
  { key: "waveform", label: "波形分析" },
]);

const surfaceMode = ref("diagnosis");
const examMode = ref("standard_ecg");
const analysisType = ref("waveform");
const monitoringMode = ref("monitor");
const leadMode = ref(LEAD_MODE_STANDARD);
const dataSource = ref("demo");
const selectedWatchRecordId = ref("");

const surfaceOptions = Object.freeze([
  {
    value: "diagnosis",
    label: "诊断波形",
    description: "诊断工作台保留十二导联、动态心电、动态血压和分析扩展能力。",
  },
  {
    value: "monitoring",
    label: "监护波形",
    description: "监护工作台承接 ICU 监护仪与呼吸机波形，并保留工具栏、打印和全屏能力。",
  },
]);

const activeSurfaceSummary = computed(
  () =>
    surfaceOptions.find((item) => item.value === surfaceMode.value) ||
    surfaceOptions[0],
);
const isDiagnosisSurface = computed(() => surfaceMode.value === "diagnosis");
const isWatchApiSource = computed(
  () => isDiagnosisSurface.value && dataSource.value === "watchApi",
);
const currentLeadMode = computed(
  () =>
    DIAGNOSIS_LEAD_MODE_OPTIONS.find((option) => option.value === leadMode.value) ||
    DIAGNOSIS_LEAD_MODE_OPTIONS[0],
);
const currentDataSourceLabel = computed(
  () =>
    DATA_SOURCE_OPTIONS.find((option) => option.value === dataSource.value)?.label ||
    "演示数据",
);
const availableLeadModeOptions = computed(() =>
  isWatchApiSource.value
    ? DIAGNOSIS_LEAD_MODE_OPTIONS.filter(
        (option) => option.value === LEAD_MODE_LEAD_I,
      )
    : DIAGNOSIS_LEAD_MODE_OPTIONS,
);
const availableExamModeOptions = computed(() =>
  isWatchApiSource.value
    ? EXAM_MODE_OPTIONS.filter((option) => option.value === "standard_ecg")
    : EXAM_MODE_OPTIONS,
);

const {
  endpoint: watchEndpoint,
  errorMessage: watchErrorMessage,
  hasError: hasWatchFeedError,
  hasRecord: hasWatchRecord,
  isLoading: isWatchFeedLoading,
  isRefreshing: isWatchFeedRefreshing,
  lastFetchedAt,
  refresh: refreshWatchFeed,
  status: watchFeedStatus,
  viewModel: watchEcgViewModel,
} = useWatchEcgFeed({
  enabled: isWatchApiSource,
  pollIntervalMs: 15000,
  recordId: selectedWatchRecordId,
});
const {
  deletingRecordId: watchHistoryDeletingRecordId,
  deleteRecord: deleteWatchHistoryRecord,
  errorMessage: watchHistoryErrorMessage,
  hasNextPage: watchHistoryHasNextPage,
  hasPrevPage: watchHistoryHasPrevPage,
  isLoading: isWatchHistoryLoading,
  isRefreshing: isWatchHistoryRefreshing,
  items: watchHistoryItems,
  page: watchHistoryPage,
  pageSize: watchHistoryPageSize,
  refresh: refreshWatchHistory,
  setPage: setWatchHistoryPage,
  total: watchHistoryTotal,
} = useWatchEcgHistory({
  enabled: isWatchApiSource,
  pollIntervalMs: 30000,
  pageSize: 12,
});
const {
  supportedAnalysisTabs: watchSupportedAnalysisTabs,
  averageTemplateAnalysis: watchAverageTemplateAnalysis,
  rhythmAnalysis: watchRhythmAnalysis,
  spectrumAnalysis: watchSpectrumAnalysis,
} = useWatchLeadAnalysis(watchEcgViewModel, {
  enabled: isWatchApiSource,
});
const currentWatchRecordId = computed(() =>
  String(watchEcgViewModel.value.recordId || "").trim(),
);
const {
  configSourceLabel: watchAiConfigSourceLabel,
  draftConfig: watchAiDraftConfig,
  effectiveConfig: watchAiEffectiveConfig,
  errorMessage: watchAiConfigErrorMessage,
  hasSavedConfig: hasSavedWatchAiConfig,
  isConfigured: isWatchAiGatewayConfigured,
  applyDraftPreset: applyWatchAiDraftPreset,
  resetConfig: resetWatchAiConfig,
  saveConfig: saveWatchAiConfig,
  statusMessage: watchAiConfigStatusMessage,
  updateDraftConfig: updateWatchAiDraftConfig,
} = useWatchEcgAiConfig();
const {
  advisory: watchAiAdvisory,
  analysis: watchAiAnalysis,
  analyze: analyzeCurrentWatchRecord,
  createdAt: watchAiCreatedAt,
  errorMessage: watchAiErrorMessage,
  hasResult: hasWatchAiResult,
  isLoading: isWatchAiLoading,
  model: watchAiModel,
  provider: watchAiProvider,
  rawText: watchAiRawText,
} = useWatchEcgAiAnalysis({
  enabled: isWatchApiSource,
  gatewayConfig: watchAiEffectiveConfig,
  viewModel: watchEcgViewModel,
  rhythmAnalysis: watchRhythmAnalysis,
  spectrumAnalysis: watchSpectrumAnalysis,
});
const availableAnalysisTabs = computed(() => {
  if (!isWatchApiSource.value) {
    return [];
  }

  return watchSupportedAnalysisTabs.value.length
    ? watchSupportedAnalysisTabs.value
    : WATCH_FALLBACK_ANALYSIS_TABS;
});
const selectedHistoryRecord = computed(
  () =>
    watchHistoryItems.value.find(
      (item) => item.id === selectedWatchRecordId.value,
    ) ||
    (selectedWatchRecordId.value &&
    currentWatchRecordId.value === selectedWatchRecordId.value
      ? {
          id: currentWatchRecordId.value,
          recordedAt: watchEcgViewModel.value.recordedAt,
        }
      : null),
);

watch(
  availableLeadModeOptions,
  (options) => {
    const currentOption = options.find(
      (option) => option.value === leadMode.value,
    );

    if (!currentOption && options[0]) {
      leadMode.value = options[0].value;
    }
  },
  { immediate: true },
);

watch(
  availableAnalysisTabs,
  (tabs) => {
    if (!tabs.length) {
      return;
    }

    const currentTab = tabs.find((tab) => tab.key === analysisType.value);
    if (!currentTab && tabs[0]) {
      analysisType.value = tabs[0].key;
    }
  },
  { immediate: true },
);

watch(
  isWatchApiSource,
  (enabled) => {
    if (!enabled) {
      return;
    }

    leadMode.value = LEAD_MODE_LEAD_I;
    examMode.value = "standard_ecg";
    analysisType.value = "waveform";
  },
  { immediate: true },
);

const resolvedStandardEcg = computed(() =>
  isWatchApiSource.value ? watchEcgViewModel.value : demoStandardEcg,
);
const resolvedSpectrumAnalysis = computed(() =>
  isWatchApiSource.value ? watchSpectrumAnalysis.value : demoSpectrumAnalysis,
);
const resolvedPrintMeta = computed(() => {
  if (!isWatchApiSource.value) {
    return demoStandardPrintMeta;
  }

  return {
    ...demoStandardPrintMeta,
    reportTitle: "Lead I 单导联心电图",
    examItem: "Apple Watch ECG 联动预览",
    examTime: formatDateTimeLabel(watchEcgViewModel.value.recordedAt),
    registrationNo: watchEcgViewModel.value.recordId || "WATCH-LATEST",
  };
});
const watchStatusLabel = computed(() => {
  if (!isWatchApiSource.value) {
    return "演示数据";
  }

  if (selectedWatchRecordId.value) {
    return "历史记录";
  }

  const statusMap = {
    idle: "未启用",
    loading: "加载中",
    refreshing: "轮询同步中",
    ready: "已同步",
    error: "请求失败",
  };

  return statusMap[watchFeedStatus.value] || "未知状态";
});
const watchStatusDescription = computed(() => {
  if (!isWatchApiSource.value) {
    return "当前使用仓库内置演示数据。";
  }

  if (hasWatchFeedError.value) {
    return watchErrorMessage.value || "Apple Watch ECG 接口暂不可用。";
  }

  if (selectedWatchRecordId.value) {
    return "当前固定浏览本地 SQLite 中的历史心电记录，已暂停自动跟随最新同步。";
  }

  if (hasWatchRecord.value) {
    return "Apple Watch 数据源只驱动诊断工作台，并固定为 Lead I 单导联。";
  }

  return "等待 /api/watch-ecg/latest 返回最新 ECG 记录。";
});
const watchRecordTimeLabel = computed(() =>
  formatDateTimeLabel(watchEcgViewModel.value.recordedAt),
);
const watchFetchedAtLabel = computed(() =>
  formatDateTimeLabel(lastFetchedAt.value),
);
const watchHistoryModeLabel = computed(() =>
  selectedWatchRecordId.value ? "历史记录" : "最新同步",
);
const watchSelectedRecordLabel = computed(() => {
  if (!selectedWatchRecordId.value) {
    return "最新同步";
  }

  return selectedHistoryRecord.value
    ? formatDateTimeLabel(selectedHistoryRecord.value.recordedAt)
    : formatDateTimeLabel(watchEcgViewModel.value.recordedAt);
});
const watchHeartRateLabel = computed(() => {
  const heartRate = Number(resolvedStandardEcg.value.measurementData?.hr);
  return Number.isFinite(heartRate) && heartRate > 0
    ? `${heartRate} bpm`
    : "--";
});
const currentExamModeLabel = computed(
  () =>
    EXAM_MODE_OPTIONS.find((option) => option.value === examMode.value)?.label ||
    "常规心电",
);
const currentDiagnosisSummary = computed(() =>
  isWatchApiSource.value
    ? "当前诊断面已切换到 Apple Watch Lead I 数据源，保留历史记录、AI 网关和辅助分析能力。"
    : "当前诊断面使用仓库内置演示数据，保留十二导联、动态心电、动态血压与分析工作区。",
);

function formatDateTimeLabel(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "--";
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue;
  }

  return parsedDate.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

async function refreshWatchData() {
  await Promise.all([
    refreshWatchFeed(),
    refreshWatchHistory({ silent: true }),
  ]);
}

function handleApplyWatchAiPreset(presetId) {
  if (presetId !== "b022hub") {
    return;
  }

  applyWatchAiDraftPreset({
    baseUrl: "https://api.b022mc.us.ci/v1",
    apiKey: watchAiDraftConfig.value.apiKey || "",
    model: watchAiDraftConfig.value.model || "latest-model-name",
    provider: "b022hub",
    wireApi: "responses",
    path: "/responses",
    headerName: "Authorization",
    headerPrefix: "Bearer ",
  });
}

function handleSelectHistoryRecord(recordId) {
  selectedWatchRecordId.value = String(recordId || "").trim();
}

function handleShowLatestRecord() {
  selectedWatchRecordId.value = "";
}

function handleChangeHistoryPage(nextPage) {
  setWatchHistoryPage(nextPage);
}

async function handleDeleteHistoryRecord(recordId) {
  const resolvedRecordId = String(recordId || "").trim();

  if (!resolvedRecordId) {
    return;
  }

  const targetRecord =
    watchHistoryItems.value.find((item) => item.id === resolvedRecordId) ||
    null;
  const targetRecordLabel = targetRecord
    ? formatDateTimeLabel(targetRecord.recordedAt)
    : resolvedRecordId;
  const confirmed = window.confirm(
    `确定删除这条历史心电吗？\n${targetRecordLabel}`,
  );

  if (!confirmed) {
    return;
  }

  const deleted = await deleteWatchHistoryRecord(resolvedRecordId);

  if (!deleted) {
    return;
  }

  if (selectedWatchRecordId.value === resolvedRecordId) {
    selectedWatchRecordId.value = "";
  }

  await refreshWatchFeed({ silent: true });
}
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="app-shell__header-copy">
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

    <section
      v-if="surfaceMode === 'diagnosis'"
      class="app-shell__diagnosis-panel"
    >
      <div class="app-shell__panel-head">
        <div>
          <p class="app-shell__panel-eyebrow">Diagnosis Workspace</p>
          <h2 class="app-shell__panel-title">诊断波形扩展区</h2>
          <p class="app-shell__panel-summary">
            {{ currentDiagnosisSummary }}
          </p>
        </div>

        <div class="app-shell__summary-grid">
          <div class="app-shell__summary-card">
            <span class="app-shell__summary-label">模式</span>
            <strong class="app-shell__summary-value">
              {{ currentExamModeLabel }}
            </strong>
          </div>
          <div class="app-shell__summary-card">
            <span class="app-shell__summary-label">数据源</span>
            <strong class="app-shell__summary-value">
              {{ currentDataSourceLabel }}
            </strong>
          </div>
          <div class="app-shell__summary-card">
            <span class="app-shell__summary-label">导联</span>
            <strong class="app-shell__summary-value">
              {{ currentLeadMode.shortLabel }}
            </strong>
          </div>
          <div
            v-if="isWatchApiSource"
            class="app-shell__summary-card"
          >
            <span class="app-shell__summary-label">本地库存</span>
            <strong class="app-shell__summary-value">
              {{ watchHistoryTotal }} 条
            </strong>
          </div>
          <div
            v-if="isWatchApiSource"
            class="app-shell__summary-card"
          >
            <span class="app-shell__summary-label">AI 网关</span>
            <strong class="app-shell__summary-value">
              {{ isWatchAiGatewayConfigured ? "已配置" : "待配置" }}
            </strong>
          </div>
        </div>
      </div>

      <div class="app-shell__choice-block">
        <div class="app-shell__choice-title">数据源切换</div>
        <div class="app-shell__choice-grid">
          <button
            v-for="option in DATA_SOURCE_OPTIONS"
            :key="option.value"
            type="button"
            class="app-shell__choice-button"
            :class="{
              'app-shell__choice-button--active': dataSource === option.value,
            }"
            @click="dataSource = option.value"
          >
            <span class="app-shell__choice-label">{{ option.label }}</span>
            <span class="app-shell__choice-description">
              {{ option.description }}
            </span>
          </button>
        </div>
      </div>

      <div class="app-shell__choice-block">
        <div class="app-shell__choice-title">导联模式</div>
        <div class="app-shell__choice-grid">
          <button
            v-for="option in availableLeadModeOptions"
            :key="option.value"
            type="button"
            class="app-shell__choice-button"
            :class="{
              'app-shell__choice-button--active': leadMode === option.value,
            }"
            @click="leadMode = option.value"
          >
            <span class="app-shell__choice-label">{{ option.label }}</span>
            <span class="app-shell__choice-description">
              {{ option.description }}
            </span>
          </button>
        </div>
      </div>

      <div
        v-if="isWatchApiSource"
        class="app-shell__watch-grid"
      >
        <article class="app-shell__watch-card">
          <span class="app-shell__watch-label">数据源状态</span>
          <strong class="app-shell__watch-value">{{ watchStatusLabel }}</strong>
          <p class="app-shell__watch-text">{{ watchStatusDescription }}</p>
        </article>

        <article class="app-shell__watch-card">
          <span class="app-shell__watch-label">接口地址</span>
          <strong class="app-shell__watch-value app-shell__watch-value--mono">
            {{ watchEndpoint }}
          </strong>
          <div class="app-shell__watch-meta">
            <span>记录时间：{{ watchRecordTimeLabel }}</span>
            <span>上次拉取：{{ watchFetchedAtLabel }}</span>
            <span>浏览模式：{{ watchHistoryModeLabel }}</span>
          </div>
        </article>

        <article class="app-shell__watch-card">
          <span class="app-shell__watch-label">最新摘要</span>
          <strong class="app-shell__watch-value">
            心率 {{ watchHeartRateLabel }}
          </strong>
          <div class="app-shell__watch-meta">
            <span>当前：{{ watchSelectedRecordLabel }}</span>
            <span>分类：{{ watchEcgViewModel.classification || "--" }}</span>
            <span>
              波形点数：{{ resolvedStandardEcg.waveformData?.I?.length || 0 }}
            </span>
          </div>
          <button
            type="button"
            class="app-shell__watch-refresh"
            :disabled="
              !isWatchApiSource ||
              isWatchFeedLoading ||
              isWatchFeedRefreshing
            "
            @click="refreshWatchData()"
          >
            {{
              isWatchFeedLoading || isWatchFeedRefreshing
                ? "同步中..."
                : selectedWatchRecordId
                  ? "刷新当前"
                  : "立即拉取"
            }}
          </button>
        </article>
      </div>

      <WatchHistorySelector
        v-if="isWatchApiSource"
        class="app-shell__watch-history"
        :items="watchHistoryItems"
        :selected-record-id="selectedWatchRecordId"
        :selected-record-label="watchSelectedRecordLabel"
        :page="watchHistoryPage"
        :page-size="watchHistoryPageSize"
        :total="watchHistoryTotal"
        :is-loading="isWatchHistoryLoading"
        :is-refreshing="isWatchHistoryRefreshing"
        :deleting-record-id="watchHistoryDeletingRecordId"
        :has-prev-page="watchHistoryHasPrevPage"
        :has-next-page="watchHistoryHasNextPage"
        :error-message="watchHistoryErrorMessage"
        @update:selected-record-id="handleSelectHistoryRecord"
        @refresh="refreshWatchHistory()"
        @change-page="handleChangeHistoryPage"
        @delete-record="handleDeleteHistoryRecord"
        @show-latest="handleShowLatestRecord"
      />

      <WatchAiGatewaySettings
        v-if="isWatchApiSource"
        class="app-shell__watch-settings"
        :config="watchAiDraftConfig"
        :effective-config="watchAiEffectiveConfig"
        :presets="WATCH_AI_GATEWAY_PRESETS"
        :has-saved-config="hasSavedWatchAiConfig"
        :is-configured="isWatchAiGatewayConfigured"
        :config-source-label="watchAiConfigSourceLabel"
        :error-message="watchAiConfigErrorMessage"
        :status-message="watchAiConfigStatusMessage"
        @apply-preset="handleApplyWatchAiPreset"
        @update:config="updateWatchAiDraftConfig"
        @save="saveWatchAiConfig"
        @reset="resetWatchAiConfig"
      />

      <WatchAiAnalysisCard
        v-if="isWatchApiSource"
        class="app-shell__watch-analysis"
        :record-id="currentWatchRecordId"
        :recorded-at="watchEcgViewModel.recordedAt"
        :classification="watchEcgViewModel.classification"
        :heart-rate-label="watchHeartRateLabel"
        :is-gateway-configured="isWatchAiGatewayConfigured"
        :is-loading="isWatchAiLoading"
        :has-result="hasWatchAiResult"
        :error-message="watchAiErrorMessage"
        :analysis="watchAiAnalysis"
        :advisory="watchAiAdvisory"
        :provider="watchAiProvider"
        :model="watchAiModel"
        :created-at="watchAiCreatedAt"
        :raw-text="watchAiRawText"
        @analyze="analyzeCurrentWatchRecord()"
      />
    </section>

    <section class="workspace-panel">
      <MonitoringCenter
        v-if="surfaceMode === 'monitoring'"
        v-model:mode="monitoringMode"
      />

      <WaveformCenter
        v-else
        v-model:exam-mode="examMode"
        v-model:analysis-type="analysisType"
        v-model:lead-mode="leadMode"
        :exam-mode-options="availableExamModeOptions"
        :analysis-tabs="availableAnalysisTabs"
        :lead-mode-options="availableLeadModeOptions"
        :standard-waveform-data="resolvedStandardEcg.waveformData"
        :standard-sample-rate="resolvedStandardEcg.sampleRate"
        :standard-duration="resolvedStandardEcg.duration"
        :measurement-data="resolvedStandardEcg.measurementData"
        :standard-print-meta="resolvedPrintMeta"
        :average-template-analysis="
          isWatchApiSource ? watchAverageTemplateAnalysis : null
        "
        :rhythm-analysis="isWatchApiSource ? watchRhythmAnalysis : null"
        :reports="demoReports"
        :spectrum-data="resolvedSpectrumAnalysis"
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

  &__header-copy {
    max-width: 860px;
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

  &__diagnosis-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 18px;
    padding: 24px 26px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 26px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.94) 0%,
      rgba(246, 249, 255, 0.94) 100%
    );
    box-shadow:
      0 24px 60px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
  }

  &__panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }

  &__panel-eyebrow {
    margin: 0;
    color: rgba(53, 98, 236, 0.88);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  &__panel-title {
    margin: 10px 0 0;
    color: #0f172a;
    font-size: 24px;
    line-height: 1.08;
  }

  &__panel-summary {
    margin: 10px 0 0;
    max-width: 860px;
    color: #475569;
    font-size: 14px;
    line-height: 1.7;
  }

  &__summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    min-width: min(100%, 420px);
  }

  &__summary-card {
    padding: 16px 14px;
    border-radius: 20px;
    background: linear-gradient(
      180deg,
      rgba(238, 243, 255, 0.9) 0%,
      rgba(255, 255, 255, 0.96) 100%
    );
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

  &__choice-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__choice-title {
    color: #0f172a;
    font-size: 13px;
    font-weight: 700;
  }

  &__choice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }

  &__choice-button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 16px 18px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 20px;
    color: rgba(15, 23, 42, 0.78);
    background: rgba(255, 255, 255, 0.86);
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(.app-shell__choice-button--active) {
      border-color: rgba(53, 98, 236, 0.24);
      background: rgba(246, 249, 255, 0.94);
    }

    &--active {
      color: #ffffff;
      border-color: rgba(53, 98, 236, 0.2);
      background: linear-gradient(135deg, #3562ec 0%, #5b82ff 100%);
      box-shadow: 0 18px 36px rgba(53, 98, 236, 0.22);
    }
  }

  &__choice-label {
    font-size: 15px;
    font-weight: 700;
  }

  &__choice-description {
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.86;
  }

  &__watch-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  &__watch-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 144px;
    padding: 16px 18px;
    border-radius: 22px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(255, 255, 255, 0.82);
  }

  &__watch-label {
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }

  &__watch-value {
    color: rgba(15, 23, 42, 0.92);
    font-size: 17px;
    line-height: 1.35;

    &--mono {
      font-family: "SFMono-Regular", "Menlo", "Monaco", monospace;
      font-size: 13px;
      word-break: break-all;
    }
  }

  &__watch-text {
    margin: 0;
    color: rgba(15, 23, 42, 0.64);
    font-size: 12px;
    line-height: 1.55;
  }

  &__watch-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: rgba(15, 23, 42, 0.58);
    font-size: 12px;
  }

  &__watch-refresh {
    margin-top: auto;
    align-self: flex-start;
    height: 34px;
    padding: 0 14px;
    border: 1px solid rgba(43, 164, 113, 0.16);
    border-radius: 999px;
    color: rgba(15, 23, 42, 0.82);
    background: rgba(240, 251, 245, 0.94);
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.workspace-panel {
  min-height: calc(100vh - 56px);
}

@media (max-width: 1200px) {
  .app-shell {
    &__panel-head {
      flex-direction: column;
    }

    &__summary-grid {
      width: 100%;
      min-width: 0;
    }

    &__watch-grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 16px;

    &__title {
      font-size: 26px;
    }

    &__diagnosis-panel {
      padding: 20px;
    }

    &__choice-grid,
    &__summary-grid,
    &__watch-grid {
      grid-template-columns: 1fr;
    }
  }

  .workspace-panel {
    min-height: calc(100vh - 32px);
  }
}
</style>