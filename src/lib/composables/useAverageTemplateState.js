import { computed, ref } from "vue";
import {
  AVERAGE_TEMPLATE_DEFAULT_LEAD,
  AVERAGE_TEMPLATE_LINE_LEADS,
  getAverageTemplateDisplayLead,
  getAverageTemplateMeasurementRows,
  getAverageTemplateWavePayload,
} from "../utils/averageTemplateMock";
import {
  AVERAGE_TEMPLATE_GAIN_OPTIONS,
  AVERAGE_TEMPLATE_SPEED_OPTIONS,
} from "../utils/averageTemplateChartConfig";

export function useAverageTemplateState() {
  const gain = ref("100");
  const speed = ref("200");
  const currentLead = ref(AVERAGE_TEMPLATE_DEFAULT_LEAD);
  const selectedLeads = ref([AVERAGE_TEMPLATE_DEFAULT_LEAD]);
  const allSelected = ref(false);
  const overlayCompare = ref(false);

  const displayLead = computed(() =>
    getAverageTemplateDisplayLead(currentLead.value),
  );
  const chartPayload = computed(() =>
    getAverageTemplateWavePayload(currentLead.value, selectedLeads.value),
  );
  const measurementRows = computed(() =>
    getAverageTemplateMeasurementRows(displayLead.value),
  );

  const selectLead = (leadValue) => {
    if (leadValue === "ALL") {
      allSelected.value = true;
      selectedLeads.value = [...AVERAGE_TEMPLATE_LINE_LEADS];
      return;
    }

    if (!AVERAGE_TEMPLATE_LINE_LEADS.includes(leadValue)) {
      return;
    }

    if (!overlayCompare.value || allSelected.value) {
      allSelected.value = false;
      currentLead.value = leadValue;
      selectedLeads.value = [leadValue];
      return;
    }

    const nextSelectedLeads = [...selectedLeads.value];
    const existingIndex = nextSelectedLeads.indexOf(leadValue);

    if (existingIndex > -1) {
      if (nextSelectedLeads.length === 1) {
        return;
      }

      nextSelectedLeads.splice(existingIndex, 1);

      if (currentLead.value === leadValue) {
        currentLead.value =
          nextSelectedLeads[nextSelectedLeads.length - 1] ||
          AVERAGE_TEMPLATE_DEFAULT_LEAD;
      }
    } else {
      nextSelectedLeads.push(leadValue);
      currentLead.value = leadValue;
    }

    allSelected.value = false;
    selectedLeads.value = nextSelectedLeads;
  };

  const setOverlayCompare = (value) => {
    overlayCompare.value = Boolean(value);

    if (overlayCompare.value) {
      if (allSelected.value) {
        selectedLeads.value = [...AVERAGE_TEMPLATE_LINE_LEADS];
        return;
      }

      if (!selectedLeads.value.length) {
        selectedLeads.value = [currentLead.value];
      }

      if (!selectedLeads.value.includes(currentLead.value)) {
        selectedLeads.value = [...selectedLeads.value, currentLead.value];
      }

      return;
    }

    if (allSelected.value) {
      selectedLeads.value = [...AVERAGE_TEMPLATE_LINE_LEADS];
      return;
    }

    selectedLeads.value = [currentLead.value];
  };

  const resetControls = () => {
    gain.value = "100";
    speed.value = "200";
    currentLead.value = AVERAGE_TEMPLATE_DEFAULT_LEAD;
    selectedLeads.value = [AVERAGE_TEMPLATE_DEFAULT_LEAD];
    allSelected.value = false;
    overlayCompare.value = false;
  };

  return {
    gain,
    speed,
    currentLead,
    selectedLeads,
    allSelected,
    overlayCompare,
    displayLead,
    chartPayload,
    measurementRows,
    defaultLead: AVERAGE_TEMPLATE_DEFAULT_LEAD,
    gainOptions: AVERAGE_TEMPLATE_GAIN_OPTIONS,
    speedOptions: AVERAGE_TEMPLATE_SPEED_OPTIONS,
    selectLead,
    setOverlayCompare,
    resetControls,
  };
}
