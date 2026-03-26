import { computed, ref, toValue, watch } from "vue";
import {
  AVERAGE_TEMPLATE_DEFAULT_LEAD,
  AVERAGE_TEMPLATE_LEAD_OPTIONS,
  AVERAGE_TEMPLATE_LINE_LEADS,
  getAverageTemplateDisplayLead,
} from "../utils/averageTemplateMock";
import {
  AVERAGE_TEMPLATE_GAIN_OPTIONS,
  AVERAGE_TEMPLATE_SPEED_OPTIONS,
} from "../utils/averageTemplateChartConfig";

export function useAverageTemplateState(options = {}) {
  const leadOptions = computed(() => {
    const nextLeadOptions = toValue(options.leadOptions);
    return Array.isArray(nextLeadOptions) && nextLeadOptions.length
      ? nextLeadOptions
      : AVERAGE_TEMPLATE_LEAD_OPTIONS;
  });
  const lineLeadValues = computed(() => {
    const normalizedLeadValues = leadOptions.value
      .map((item) => String(item?.value || "").trim())
      .filter(Boolean)
      .filter((value) => value !== "ALL");

    return normalizedLeadValues.length
      ? normalizedLeadValues
      : AVERAGE_TEMPLATE_LINE_LEADS;
  });
  const defaultLead = computed(() => {
    const requestedDefaultLead = String(toValue(options.defaultLead) || "").trim();

    if (lineLeadValues.value.includes(requestedDefaultLead)) {
      return requestedDefaultLead;
    }

    return lineLeadValues.value[0] || AVERAGE_TEMPLATE_DEFAULT_LEAD;
  });
  const gain = ref("100");
  const speed = ref("200");
  const currentLead = ref(defaultLead.value);
  const selectedLeads = ref([defaultLead.value]);
  const allSelected = ref(false);
  const overlayCompare = ref(false);

  const displayLead = computed(() =>
    getAverageTemplateDisplayLead(currentLead.value),
  );

  watch(
    [defaultLead, lineLeadValues],
    ([nextDefaultLead, nextLeadValues]) => {
      if (!nextLeadValues.includes(currentLead.value)) {
        currentLead.value = nextDefaultLead;
      }

      selectedLeads.value = selectedLeads.value.filter((leadValue) =>
        nextLeadValues.includes(leadValue),
      );

      if (!selectedLeads.value.length) {
        selectedLeads.value = [currentLead.value];
      }

      if (!selectedLeads.value.includes(currentLead.value)) {
        selectedLeads.value = [currentLead.value];
      }

      if (allSelected.value) {
        selectedLeads.value = [...nextLeadValues];
      }
    },
    { immediate: true },
  );

  const selectLead = (leadValue) => {
    if (leadValue === "ALL") {
      allSelected.value = true;
      selectedLeads.value = [...lineLeadValues.value];
      return;
    }

    if (!lineLeadValues.value.includes(leadValue)) {
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
          defaultLead.value;
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
        selectedLeads.value = [...lineLeadValues.value];
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
      selectedLeads.value = [...lineLeadValues.value];
      return;
    }

    selectedLeads.value = [currentLead.value];
  };

  const resetControls = () => {
    gain.value = "100";
    speed.value = "200";
    currentLead.value = defaultLead.value;
    selectedLeads.value = [defaultLead.value];
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
    leadOptions,
    lineLeadValues,
    displayLead,
    defaultLead,
    gainOptions: AVERAGE_TEMPLATE_GAIN_OPTIONS,
    speedOptions: AVERAGE_TEMPLATE_SPEED_OPTIONS,
    selectLead,
    setOverlayCompare,
    resetControls,
  };
}
