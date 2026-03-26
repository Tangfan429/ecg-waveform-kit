import {
  computed,
  onUnmounted,
  ref,
  toValue,
  watch,
} from "vue";
import {
  createEmptyWatchEcgViewModel,
  createWatchEcgViewModel,
} from "../utils/watchEcgAdapter";

const DEFAULT_WATCH_ECG_ENDPOINT = "/api/watch-ecg/latest";
const DEFAULT_WATCH_ECG_POLL_INTERVAL_MS = 15000;
const WATCH_ECG_RECORD_ENDPOINT_PREFIX = "/api/v1/watch-ecg/records";

export function useWatchEcgFeed(options = {}) {
  const viewModel = ref(createEmptyWatchEcgViewModel());
  const rawPayload = ref(null);
  const status = ref("idle");
  const errorMessage = ref("");
  const lastFetchedAt = ref("");

  let pollingTimerId = 0;
  let activeAbortController = null;

  const endpoint = computed(() => {
    const selectedRecordID = String(toValue(options.recordId) || "").trim();

    if (selectedRecordID) {
      return `${WATCH_ECG_RECORD_ENDPOINT_PREFIX}/${encodeURIComponent(selectedRecordID)}`;
    }

    const resolvedEndpoint =
      toValue(options.endpoint) ||
      import.meta.env.VITE_WATCH_ECG_ENDPOINT ||
      DEFAULT_WATCH_ECG_ENDPOINT;

    return String(resolvedEndpoint).trim() || DEFAULT_WATCH_ECG_ENDPOINT;
  });

  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const selectedRecordID = computed(() =>
    String(toValue(options.recordId) || "").trim(),
  );
  const pollIntervalMs = computed(() => {
    const resolvedValue = Number(
      toValue(options.pollIntervalMs) ?? DEFAULT_WATCH_ECG_POLL_INTERVAL_MS,
    );

    return Number.isFinite(resolvedValue) && resolvedValue >= 0
      ? resolvedValue
      : DEFAULT_WATCH_ECG_POLL_INTERVAL_MS;
  });
  const effectivePollIntervalMs = computed(() =>
    selectedRecordID.value ? 0 : pollIntervalMs.value,
  );

  const hasRecord = computed(() => Boolean(rawPayload.value));
  const isLoading = computed(() => status.value === "loading");
  const isRefreshing = computed(() => status.value === "refreshing");
  const hasError = computed(() => status.value === "error");

  const stopPolling = () => {
    if (pollingTimerId) {
      window.clearInterval(pollingTimerId);
      pollingTimerId = 0;
    }
  };

  const abortActiveRequest = () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  };

  const refresh = async ({ silent = false } = {}) => {
    if (!enabled.value) {
      return null;
    }

    abortActiveRequest();
    activeAbortController = new AbortController();
    errorMessage.value = "";
    status.value =
      silent && hasRecord.value ? "refreshing" : "loading";

    try {
      const response = await fetch(endpoint.value, {
        headers: {
          Accept: "application/json",
        },
        signal: activeAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Apple Watch ECG 接口请求失败：HTTP ${response.status}`);
      }

      const payload = await response.json();

      rawPayload.value = payload;
      viewModel.value = createWatchEcgViewModel(payload);
      lastFetchedAt.value = new Date().toISOString();
      status.value = "ready";

      return viewModel.value;
    } catch (error) {
      if (error?.name === "AbortError") {
        return null;
      }

      status.value = "error";
      errorMessage.value =
        error instanceof Error
          ? error.message
          : "Apple Watch ECG 接口返回异常。";

      if (!rawPayload.value) {
        viewModel.value = createEmptyWatchEcgViewModel();
      }

      return null;
    } finally {
      activeAbortController = null;
    }
  };

  watch(
    [enabled, endpoint, effectivePollIntervalMs],
    ([isEnabled]) => {
      stopPolling();
      abortActiveRequest();

      if (!isEnabled) {
        status.value = rawPayload.value ? "ready" : "idle";
        errorMessage.value = "";
        return;
      }

      refresh();

      if (effectivePollIntervalMs.value > 0) {
        pollingTimerId = window.setInterval(() => {
          refresh({ silent: true });
        }, effectivePollIntervalMs.value);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    stopPolling();
    abortActiveRequest();
  });

  return {
    endpoint,
    errorMessage,
    hasError,
    hasRecord,
    isLoading,
    isRefreshing,
    lastFetchedAt,
    selectedRecordID,
    rawPayload,
    refresh,
    status,
    viewModel,
  };
}

export default useWatchEcgFeed;
