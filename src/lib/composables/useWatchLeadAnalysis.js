import { computed, toValue } from "vue";
import {
  WATCH_SUPPORTED_ANALYSIS_TABS,
  analyzeWatchLead,
  createEmptyWatchLeadAnalysis,
} from "../utils/watchLeadAnalysis";

export function useWatchLeadAnalysis(viewModelSource, options = {}) {
  const enabled = computed(() => Boolean(toValue(options.enabled)));
  const analysis = computed(() =>
    enabled.value
      ? analyzeWatchLead(toValue(viewModelSource))
      : createEmptyWatchLeadAnalysis(),
  );

  const supportedAnalysisTabs = computed(() =>
    enabled.value
      ? analysis.value.supportedAnalysisTabs
      : WATCH_SUPPORTED_ANALYSIS_TABS,
  );

  return {
    analysis,
    supportedAnalysisTabs,
    averageTemplateAnalysis: computed(() => analysis.value.averageTemplateData),
    rhythmAnalysis: computed(() => analysis.value.rhythmData),
    spectrumAnalysis: computed(() => analysis.value.spectrumData),
  };
}

export default useWatchLeadAnalysis;
