import { computed, onUnmounted, ref, toValue, watch } from "vue";
import { createWatchEcgHistoryItem } from "../utils/watchEcgAdapter";

const DEFAULT_WATCH_ECG_HISTORY_ENDPOINT = "/api/watch-ecg/records";
const DEFAULT_WATCH_ECG_HISTORY_PAGE = 1;
const DEFAULT_WATCH_ECG_HISTORY_PAGE_SIZE = 12;
const DEFAULT_WATCH_ECG_HISTORY_POLL_INTERVAL_MS = 30000;

function parseApiError(payload, fallbackMessage) {
  const apiMessage = String(payload?.error?.message || "").trim();
  return apiMessage || fallbackMessage;
}

export function useWatchEcgHistory(options = {}) {
  const items = ref([]);
  const total = ref(0);
  const page = ref(DEFAULT_WATCH_ECG_HISTORY_PAGE);
  const status = ref("idle");
  const errorMessage = ref("");
  const deletingRecordId = ref("");
  const lastFetchedAt = ref("");

  let pollingTimerId = 0;
  let activeAbortController = null;

  const endpoint = computed(() => {
    const resolvedEndpoint =
      toValue(options.endpoint) ||
      import.meta.env.VITE_WATCH_ECG_HISTORY_ENDPOINT ||
      DEFAULT_WATCH_ECG_HISTORY_ENDPOINT;

    return (
      String(resolvedEndpoint).trim() || DEFAULT_WATCH_ECG_HISTORY_ENDPOINT
    );
  });
  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const pageSize = computed(() => {
    const resolvedPageSize = Number(
      toValue(options.pageSize) ?? DEFAULT_WATCH_ECG_HISTORY_PAGE_SIZE,
    );

    if (!Number.isFinite(resolvedPageSize)) {
      return DEFAULT_WATCH_ECG_HISTORY_PAGE_SIZE;
    }

    return Math.max(1, Math.min(100, Math.round(resolvedPageSize)));
  });
  const pollIntervalMs = computed(() => {
    const resolvedValue = Number(
      toValue(options.pollIntervalMs) ??
        DEFAULT_WATCH_ECG_HISTORY_POLL_INTERVAL_MS,
    );

    return Number.isFinite(resolvedValue) && resolvedValue >= 0
      ? resolvedValue
      : DEFAULT_WATCH_ECG_HISTORY_POLL_INTERVAL_MS;
  });
  const patientId = computed(() =>
    String(toValue(options.patientId) || "").trim(),
  );
  const requestURL = computed(() => {
    const searchParams = new URLSearchParams();

    searchParams.set("page", String(page.value));
    searchParams.set("pageSize", String(pageSize.value));

    if (patientId.value) {
      searchParams.set("patientId", patientId.value);
    }

    return `${endpoint.value}?${searchParams.toString()}`;
  });

  const totalPages = computed(() =>
    total.value > 0 ? Math.ceil(total.value / pageSize.value) : 1,
  );
  const hasPrevPage = computed(() => page.value > 1);
  const hasNextPage = computed(() => page.value < totalPages.value);
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

  const setPage = (nextPage) => {
    const resolvedPage = Math.max(1, Math.round(Number(nextPage) || 1));

    if (page.value === resolvedPage) {
      return;
    }

    page.value = resolvedPage;
  };

  const refresh = async ({ silent = false } = {}) => {
    if (!enabled.value) {
      return [];
    }

    abortActiveRequest();
    activeAbortController = new AbortController();
    errorMessage.value = "";
    status.value = silent && items.value.length ? "refreshing" : "loading";

    try {
      const response = await fetch(requestURL.value, {
        headers: {
          Accept: "application/json",
        },
        signal: activeAbortController.signal,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          parseApiError(
            payload,
            `Apple Watch ECG 历史记录请求失败：HTTP ${response.status}`,
          ),
        );
      }

      const nextItems = Array.isArray(payload?.items)
        ? payload.items
            .map((item) => createWatchEcgHistoryItem(item))
            .filter((item) => item.id)
        : [];

      items.value = nextItems;
      total.value = Math.max(0, Number(payload?.total) || 0);
      page.value = Math.max(1, Number(payload?.page) || page.value);
      lastFetchedAt.value = new Date().toISOString();
      status.value = "ready";

      return nextItems;
    } catch (error) {
      if (error?.name === "AbortError") {
        return items.value;
      }

      status.value = "error";
      errorMessage.value =
        error instanceof Error
          ? error.message
          : "Apple Watch ECG 历史记录接口返回异常。";

      return items.value;
    } finally {
      activeAbortController = null;
    }
  };

  const deleteRecord = async (recordId) => {
    const resolvedRecordId = String(recordId || "").trim();

    if (!enabled.value || !resolvedRecordId) {
      return false;
    }

    deletingRecordId.value = resolvedRecordId;
    errorMessage.value = "";

    try {
      const response = await fetch(
        `${endpoint.value}/${encodeURIComponent(resolvedRecordId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          parseApiError(
            payload,
            `Apple Watch ECG 历史记录删除失败：HTTP ${response.status}`,
          ),
        );
      }

      const shouldStepBackPage =
        items.value.length <= 1 && page.value > 1 && total.value > 1;

      if (shouldStepBackPage) {
        page.value -= 1;
      }

      await refresh();
      return true;
    } catch (error) {
      status.value = "error";
      errorMessage.value =
        error instanceof Error
          ? error.message
          : "Apple Watch ECG 历史记录删除失败。";

      return false;
    } finally {
      deletingRecordId.value = "";
    }
  };

  watch(
    () => toValue(options.initialPage),
    (nextPage) => {
      const resolvedPage = Math.max(
        1,
        Math.round(Number(nextPage) || DEFAULT_WATCH_ECG_HISTORY_PAGE),
      );

      if (page.value !== resolvedPage) {
        page.value = resolvedPage;
      }
    },
    { immediate: true },
  );

  watch(
    [enabled, requestURL, pollIntervalMs],
    ([isEnabled]) => {
      stopPolling();
      abortActiveRequest();

      if (!isEnabled) {
        status.value = items.value.length ? "ready" : "idle";
        errorMessage.value = "";
        return;
      }

      refresh();

      if (pollIntervalMs.value > 0) {
        pollingTimerId = window.setInterval(() => {
          refresh({ silent: true });
        }, pollIntervalMs.value);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    stopPolling();
    abortActiveRequest();
  });

  return {
    deletingRecordId,
    deleteRecord,
    endpoint,
    errorMessage,
    hasError,
    hasNextPage,
    hasPrevPage,
    isLoading,
    isRefreshing,
    items,
    lastFetchedAt,
    page,
    pageSize,
    refresh,
    requestURL,
    setPage,
    status,
    total,
    totalPages,
  };
}

export default useWatchEcgHistory;
