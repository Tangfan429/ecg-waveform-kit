import { computed, onUnmounted, ref, toValue, watch } from "vue";
import { requestWatchEcgAiAnalysis } from "../utils/watchEcgAiGateway";

function resolveRecordKey(viewModel = {}) {
  const recordId = String(viewModel?.recordId || "").trim();

  if (recordId) {
    return recordId;
  }

  const recordedAt = String(viewModel?.recordedAt || "").trim();
  const waveformLength = Array.isArray(viewModel?.waveformData?.I)
    ? viewModel.waveformData.I.length
    : 0;

  return recordedAt ? `${recordedAt}:${waveformLength}` : "";
}

export function useWatchEcgAiAnalysis(options = {}) {
  const result = ref(null);
  const status = ref("idle");
  const errorMessage = ref("");
  const analyzedRecordKey = ref("");

  let activeAbortController = null;

  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const gatewayConfig = computed(() => toValue(options.gatewayConfig) || null);
  const gatewayConfigKey = computed(() =>
    JSON.stringify(gatewayConfig.value || {}),
  );
  const viewModel = computed(() => toValue(options.viewModel) || {});
  const rhythmAnalysis = computed(
    () => toValue(options.rhythmAnalysis) || null,
  );
  const spectrumAnalysis = computed(
    () => toValue(options.spectrumAnalysis) || null,
  );
  const recordKey = computed(() => resolveRecordKey(viewModel.value));

  const isLoading = computed(() => status.value === "loading");
  const hasResult = computed(
    () => Boolean(result.value) && analyzedRecordKey.value === recordKey.value,
  );
  const analysis = computed(() => result.value?.analysis || null);
  const advisory = computed(() => String(result.value?.advisory || "").trim());
  const provider = computed(() => String(result.value?.provider || "").trim());
  const model = computed(() => String(result.value?.model || "").trim());
  const createdAt = computed(() =>
    String(result.value?.createdAt || "").trim(),
  );
  const rawText = computed(() => String(result.value?.rawText || "").trim());

  const abortActiveRequest = () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  };

  const reset = () => {
    abortActiveRequest();
    result.value = null;
    status.value = "idle";
    errorMessage.value = "";
    analyzedRecordKey.value = "";
  };

  const analyze = async () => {
    if (!enabled.value) {
      return null;
    }

    if (!recordKey.value) {
      status.value = "error";
      errorMessage.value = "当前还没有可分析的心电记录。";
      return null;
    }

    abortActiveRequest();
    activeAbortController = new AbortController();
    status.value = "loading";
    errorMessage.value = "";

    try {
      const payload = await requestWatchEcgAiAnalysis({
        gatewayConfig: gatewayConfig.value,
        viewModel: viewModel.value,
        rhythmAnalysis: rhythmAnalysis.value,
        spectrumAnalysis: spectrumAnalysis.value,
        signal: activeAbortController.signal,
      });

      result.value = payload;
      analyzedRecordKey.value = recordKey.value;
      status.value = "ready";
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        return null;
      }

      result.value = null;
      analyzedRecordKey.value = "";
      status.value = "error";
      errorMessage.value =
        error instanceof Error
          ? error.message
          : "Apple Watch ECG AI 分析失败。";

      return null;
    } finally {
      activeAbortController = null;
    }
  };

  watch(
    [enabled, recordKey, gatewayConfigKey],
    ([isEnabled, nextRecordKey, nextGatewayConfigKey], previousValue = []) => {
      const [previousEnabled, previousRecordKey, previousGatewayConfigKey] =
        previousValue;

      if (!isEnabled) {
        reset();
        return;
      }

      if (!nextRecordKey) {
        result.value = null;
        status.value = "idle";
        errorMessage.value = "";
        analyzedRecordKey.value = "";
        return;
      }

      if (
        previousEnabled &&
        ((previousRecordKey && previousRecordKey !== nextRecordKey) ||
          previousGatewayConfigKey !== nextGatewayConfigKey)
      ) {
        result.value = null;
        status.value = "idle";
        errorMessage.value = "";
        analyzedRecordKey.value = "";
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    abortActiveRequest();
  });

  return {
    advisory,
    analysis,
    analyze,
    analyzedRecordKey,
    createdAt,
    errorMessage,
    hasResult,
    isLoading,
    model,
    provider,
    rawText,
    recordKey,
    reset,
    result,
    status,
  };
}

export default useWatchEcgAiAnalysis;
