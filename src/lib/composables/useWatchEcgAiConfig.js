import { computed, ref } from "vue";
import {
  getWatchEcgAiGatewayConfig,
  normalizeWatchEcgAiGatewayConfig,
} from "../utils/watchEcgAiGateway";

const WATCH_ECG_AI_CONFIG_STORAGE_KEY = "watch-ecg-ai-gateway-config";

function toEditableConfig(config = {}) {
  const normalizedConfig = normalizeWatchEcgAiGatewayConfig(config);

  return {
    baseUrl: normalizedConfig.baseUrl,
    apiKey: normalizedConfig.apiKey,
    model: normalizedConfig.model,
    provider: normalizedConfig.provider,
    wireApi: normalizedConfig.wireApi,
    path: normalizedConfig.path,
    headerName: normalizedConfig.headerName,
    headerPrefix: normalizedConfig.headerPrefix,
    temperature: normalizedConfig.temperature,
  };
}

function readStoredConfig() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(
      WATCH_ECG_AI_CONFIG_STORAGE_KEY,
    );

    if (!rawValue) {
      return null;
    }

    return toEditableConfig(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function useWatchEcgAiConfig() {
  const envConfig = getWatchEcgAiGatewayConfig();
  const savedConfig = ref(readStoredConfig());
  const draftConfig = ref(
    savedConfig.value ? { ...savedConfig.value } : toEditableConfig(envConfig),
  );
  const errorMessage = ref("");
  const statusMessage = ref("");

  const effectiveConfig = computed(() =>
    savedConfig.value
      ? normalizeWatchEcgAiGatewayConfig(savedConfig.value)
      : envConfig,
  );
  const hasSavedConfig = computed(() => Boolean(savedConfig.value));
  const configSourceLabel = computed(() =>
    hasSavedConfig.value ? "页面配置" : "环境变量",
  );
  const isConfigured = computed(() => effectiveConfig.value.isConfigured);

  const updateDraftConfig = (nextConfig) => {
    draftConfig.value = toEditableConfig(nextConfig);
  };

  const applyDraftPreset = (presetConfig = {}) => {
    errorMessage.value = "";
    statusMessage.value = "";

    draftConfig.value = toEditableConfig({
      ...draftConfig.value,
      ...presetConfig,
    });
  };

  const saveConfig = () => {
    errorMessage.value = "";
    statusMessage.value = "";

    const normalizedConfig = toEditableConfig(draftConfig.value);

    try {
      window.localStorage.setItem(
        WATCH_ECG_AI_CONFIG_STORAGE_KEY,
        JSON.stringify(normalizedConfig),
      );
      savedConfig.value = normalizedConfig;
      draftConfig.value = { ...normalizedConfig };
      statusMessage.value = "页面配置已保存";
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "保存前端 AI 配置失败。";
    }
  };

  const resetConfig = () => {
    errorMessage.value = "";
    statusMessage.value = "";

    try {
      window.localStorage.removeItem(WATCH_ECG_AI_CONFIG_STORAGE_KEY);
      savedConfig.value = null;
      draftConfig.value = toEditableConfig(envConfig);
      statusMessage.value = "已切回环境变量配置";
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "重置前端 AI 配置失败。";
    }
  };

  return {
    configSourceLabel,
    draftConfig,
    effectiveConfig,
    errorMessage,
    hasSavedConfig,
    isConfigured,
    applyDraftPreset,
    resetConfig,
    saveConfig,
    statusMessage,
    updateDraftConfig,
  };
}

export default useWatchEcgAiConfig;
