<script setup>
import { computed, ref, watch } from "vue";
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
  LEAD_MODE_OPTIONS,
  getLeadModeConfig,
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
const WATCH_AI_GATEWAY_PRESETS = Object.freeze([
  {
    id: "b022hub",
    label: "b022hub",
    description: "Responses API 预设，自动带出 /v1 + /responses。",
  },
]);

const examMode = ref("standard_ecg");
const analysisType = ref("waveform");
const leadMode = ref("standard12");
const dataSource = ref("demo");
const selectedWatchRecordId = ref("");
const currentLeadMode = computed(() => getLeadModeConfig(leadMode.value));
const isWatchApiSource = computed(() => dataSource.value === "watchApi");
const isViewingHistoryRecord = computed(() =>
  Boolean(selectedWatchRecordId.value),
);
const availableLeadModeOptions = computed(() =>
  isWatchApiSource.value
    ? LEAD_MODE_OPTIONS.filter((option) => option.value === LEAD_MODE_LEAD_I)
    : LEAD_MODE_OPTIONS,
);
const availableExamModeOptions = computed(() =>
  isWatchApiSource.value
    ? EXAM_MODE_OPTIONS.filter((option) => option.value === "standard_ecg")
    : [],
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
const availableAnalysisTabs = computed(() =>
  isWatchApiSource.value ? watchSupportedAnalysisTabs.value : [],
);
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
  if (isWatchApiSource.value && isViewingHistoryRecord.value) {
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

  if (isViewingHistoryRecord.value) {
    return "当前固定浏览本地 SQLite 中的历史心电记录，已暂停自动跟随最新同步。";
  }

  if (hasWatchRecord.value) {
    return "Apple Watch 数据源只驱动常规心电工作台，并固定为 Lead I 单导联。";
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
  isViewingHistoryRecord.value ? "历史记录" : "最新同步",
);
const watchSelectedRecordLabel = computed(() => {
  if (!isViewingHistoryRecord.value) {
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
    EXAM_MODE_OPTIONS.find((option) => option.value === examMode.value)
      ?.label || "常规心电",
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

function handleSelectHistoryRecord(recordID) {
  selectedWatchRecordId.value = String(recordID || "").trim();
}

function handleShowLatestRecord() {
  selectedWatchRecordId.value = "";
}

function handleChangeHistoryPage(nextPage) {
  setWatchHistoryPage(nextPage);
}

async function handleDeleteHistoryRecord(recordID) {
  const resolvedRecordID = String(recordID || "").trim();

  if (!resolvedRecordID) {
    return;
  }

  const targetRecord =
    watchHistoryItems.value.find((item) => item.id === resolvedRecordID) ||
    null;
  const targetRecordLabel = targetRecord
    ? formatDateTimeLabel(targetRecord.recordedAt)
    : resolvedRecordID;

  const confirmed = window.confirm(
    `确定删除这条历史心电吗？\n${targetRecordLabel}`,
  );

  if (!confirmed) {
    return;
  }

  const deleted = await deleteWatchHistoryRecord(resolvedRecordID);

  if (!deleted) {
    return;
  }

  if (selectedWatchRecordId.value === resolvedRecordID) {
    selectedWatchRecordId.value = "";
  }

  await refreshWatchFeed({ silent: true });
}
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

            <div class="hero-panel__data-source-switch">
              <button
                v-for="option in DATA_SOURCE_OPTIONS"
                :key="option.value"
                type="button"
                class="hero-panel__data-source-button"
                :class="{
                  'hero-panel__data-source-button--active':
                    dataSource === option.value,
                }"
                @click="dataSource = option.value"
              >
                <span class="hero-panel__data-source-title">{{
                  option.label
                }}</span>
                <span class="hero-panel__data-source-description">
                  {{ option.description }}
                </span>
              </button>
            </div>

            <div class="hero-panel__lead-mode-switch">
              <button
                v-for="option in availableLeadModeOptions"
                :key="option.value"
                type="button"
                class="hero-panel__lead-mode-button"
                :class="{
                  'hero-panel__lead-mode-button--active':
                    leadMode === option.value,
                }"
                @click="leadMode = option.value"
              >
                <span class="hero-panel__lead-mode-title">{{
                  option.label
                }}</span>
                <span class="hero-panel__lead-mode-description">
                  {{ option.description }}
                </span>
              </button>
            </div>

            <div class="hero-panel__watch-status">
              <div class="hero-panel__watch-status-card">
                <span class="hero-panel__watch-status-label">数据源状态</span>
                <strong class="hero-panel__watch-status-value">
                  {{ watchStatusLabel }}
                </strong>
                <p class="hero-panel__watch-status-description">
                  {{ watchStatusDescription }}
                </p>
              </div>

              <div class="hero-panel__watch-status-card">
                <span class="hero-panel__watch-status-label">接口地址</span>
                <strong
                  class="hero-panel__watch-status-value hero-panel__watch-status-value--mono"
                >
                  {{ watchEndpoint }}
                </strong>
                <div class="hero-panel__watch-status-meta">
                  <span>记录时间：{{ watchRecordTimeLabel }}</span>
                  <span>上次拉取：{{ watchFetchedAtLabel }}</span>
                  <span>浏览模式：{{ watchHistoryModeLabel }}</span>
                </div>
              </div>

              <div class="hero-panel__watch-status-card">
                <span class="hero-panel__watch-status-label">最新摘要</span>
                <strong class="hero-panel__watch-status-value">
                  心率 {{ watchHeartRateLabel }}
                </strong>
                <div class="hero-panel__watch-status-meta">
                  <span>当前：{{ watchSelectedRecordLabel }}</span>
                  <span>
                    分类：{{ watchEcgViewModel.classification || "--" }}
                  </span>
                  <span>
                    波形点数：{{
                      resolvedStandardEcg.waveformData?.I?.length || 0
                    }}
                  </span>
                </div>
                <button
                  type="button"
                  class="hero-panel__watch-refresh"
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
                      : isViewingHistoryRecord
                        ? "刷新当前"
                        : "立即拉取"
                  }}
                </button>
              </div>
            </div>

            <WatchHistorySelector
              v-if="isWatchApiSource"
              class="hero-panel__watch-history"
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
              class="hero-panel__watch-ai-settings"
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
              class="hero-panel__watch-ai"
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
          </div>

          <div class="hero-panel__summary">
            <div class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">模式</span>
              <strong class="hero-panel__summary-value">
                {{ currentExamModeLabel }}
              </strong>
            </div>
            <div class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">数据源</span>
              <strong class="hero-panel__summary-value">
                {{
                  DATA_SOURCE_OPTIONS.find(
                    (option) => option.value === dataSource,
                  )?.label || "演示数据"
                }}
              </strong>
            </div>
            <div class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">导联</span>
              <strong class="hero-panel__summary-value">
                {{ currentLeadMode.shortLabel }}
              </strong>
            </div>
            <div v-if="isWatchApiSource" class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">本地库存</span>
              <strong class="hero-panel__summary-value">
                {{ watchHistoryTotal }} 条
              </strong>
            </div>
            <div v-if="isWatchApiSource" class="hero-panel__summary-card">
              <span class="hero-panel__summary-label">AI 网关</span>
              <strong class="hero-panel__summary-value">
                {{ isWatchAiGatewayConfigured ? "已配置" : "待配置" }}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="workspace-panel">
      <WaveformCenter
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
}

.hero-panel {
  margin-bottom: 18px;
  padding: 28px 30px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 28px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(244, 248, 255, 0.92) 100%
  );
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

  &__lead-mode-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    max-width: 720px;
    margin-top: 18px;
  }

  &__data-source-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    max-width: 720px;
    margin-top: 18px;
  }

  &__data-source-button {
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

    &:hover:not(.hero-panel__data-source-button--active) {
      border-color: rgba(43, 164, 113, 0.24);
      background: rgba(246, 252, 249, 0.96);
    }

    &--active {
      color: #ffffff;
      border-color: rgba(43, 164, 113, 0.18);
      background: linear-gradient(135deg, #177a4d 0%, #2ba471 100%);
      box-shadow: 0 18px 36px rgba(43, 164, 113, 0.22);

      &:hover {
        color: #ffffff;
        border-color: rgba(43, 164, 113, 0.18);
        background: linear-gradient(135deg, #177a4d 0%, #2ba471 100%);
      }
    }
  }

  &__data-source-title {
    font-size: 15px;
    font-weight: 700;
  }

  &__data-source-description {
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.86;
  }

  &__lead-mode-button {
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

    &:hover:not(.hero-panel__lead-mode-button--active) {
      border-color: rgba(53, 98, 236, 0.24);
      background: rgba(246, 249, 255, 0.94);
    }

    &--active {
      color: #ffffff;
      border-color: rgba(53, 98, 236, 0.2);
      background: linear-gradient(135deg, #3562ec 0%, #5b82ff 100%);
      box-shadow: 0 18px 36px rgba(53, 98, 236, 0.22);

      &:hover {
        color: #ffffff;
        border-color: rgba(53, 98, 236, 0.2);
        background: linear-gradient(135deg, #3562ec 0%, #5b82ff 100%);
      }
    }
  }

  &__lead-mode-title {
    font-size: 15px;
    font-weight: 700;
  }

  &__lead-mode-description {
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.86;
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    min-width: min(100%, 380px);
  }

  &__watch-status {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 18px;
    max-width: 1080px;
  }

  &__watch-status-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 132px;
    padding: 16px 18px;
    border-radius: 22px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(255, 255, 255, 0.82);
  }

  &__watch-status-label {
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }

  &__watch-status-value {
    color: rgba(15, 23, 42, 0.92);
    font-size: 17px;
    line-height: 1.35;

    &--mono {
      font-family: "SFMono-Regular", "Menlo", "Monaco", monospace;
      font-size: 13px;
      word-break: break-all;
    }
  }

  &__watch-status-description {
    margin: 0;
    color: rgba(15, 23, 42, 0.64);
    font-size: 12px;
    line-height: 1.55;
  }

  &__watch-status-meta {
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

    &__watch-status {
      grid-template-columns: 1fr;
      width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 16px;
  }

  .hero-panel {
    padding: 20px;

    &__data-source-switch {
      grid-template-columns: 1fr;
    }

    &__lead-mode-switch {
      grid-template-columns: 1fr;
    }

    &__watch-status {
      grid-template-columns: 1fr;
    }

    &__summary {
      grid-template-columns: 1fr;
    }
  }
}
</style>
