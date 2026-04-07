import { computed, ref, watch } from "vue";
import {
  getBodyTagMeta,
  getSymptomTemplateMeta,
} from "../data/bodySiteDictionary";

const buildSitePatchFromTemplate = (template) => ({
  templateId: template.id,
  tags: [...(template.tags || [])],
  severity: template.severity ?? 3,
  note: template.note || "",
});

const createSiteEntry = (siteCode, template) => ({
  siteCode,
  ...buildSitePatchFromTemplate(template),
});

export const useBodySiteSelector = () => {
  const activeTemplateId = ref("localized-pain");
  const selectionMode = ref("multiple");
  const selectedSites = ref([]);
  const activeSiteCode = ref("");
  const activeTemplate = computed(() =>
    getSymptomTemplateMeta(activeTemplateId.value),
  );

  const activeSite = computed(
    () =>
      selectedSites.value.find((item) => item.siteCode === activeSiteCode.value) ||
      null,
  );

  const selectedCount = computed(() => selectedSites.value.length);

  const markerPayload = computed(() =>
    selectedSites.value.map((item) => {
      const tagMeta = getBodyTagMeta(item.tags?.[0] || "other");
      const isActive = item.siteCode === activeSiteCode.value;

      return {
        siteCode: item.siteCode,
        fill: tagMeta.fill,
        stroke: isActive ? "#0f172a" : tagMeta.stroke,
        opacity: isActive ? 0.62 : 0.42,
      };
    }),
  );

  const setActiveSite = (siteCode) => {
    activeSiteCode.value = String(siteCode || "").trim();
  };

  const replaceWithSingleSite = (siteCode) => {
    selectedSites.value = [createSiteEntry(siteCode, activeTemplate.value)];
    setActiveSite(siteCode);
  };

  const toggleSite = (siteCode) => {
    const normalizedCode = String(siteCode || "").trim();

    if (!normalizedCode) {
      return;
    }

    const currentIndex = selectedSites.value.findIndex(
      (item) => item.siteCode === normalizedCode,
    );

    if (selectionMode.value === "single") {
      if (currentIndex !== -1 && selectedSites.value.length === 1) {
        selectedSites.value = [];
        activeSiteCode.value = "";
        return;
      }

      replaceWithSingleSite(normalizedCode);
      return;
    }

    if (currentIndex === -1) {
      selectedSites.value = [
        ...selectedSites.value,
        createSiteEntry(normalizedCode, activeTemplate.value),
      ];
      setActiveSite(normalizedCode);
      return;
    }

    selectedSites.value = selectedSites.value.filter(
      (item) => item.siteCode !== normalizedCode,
    );

    if (activeSiteCode.value === normalizedCode) {
      activeSiteCode.value = selectedSites.value[0]?.siteCode || "";
    }
  };

  const removeSite = (siteCode) => {
    const normalizedCode = String(siteCode || "").trim();
    selectedSites.value = selectedSites.value.filter(
      (item) => item.siteCode !== normalizedCode,
    );

    if (activeSiteCode.value === normalizedCode) {
      activeSiteCode.value = selectedSites.value[0]?.siteCode || "";
    }
  };

  const clearSites = () => {
    selectedSites.value = [];
    activeSiteCode.value = "";
  };

  const applyTemplateToSite = (siteCode, templateId = activeTemplateId.value) => {
    const normalizedCode = String(siteCode || "").trim();
    if (!normalizedCode) {
      return;
    }

    const template = getSymptomTemplateMeta(templateId);
    selectedSites.value = selectedSites.value.map((item) =>
      item.siteCode === normalizedCode
        ? {
            ...item,
            ...buildSitePatchFromTemplate(template),
          }
        : item,
    );
  };

  const applyTemplateToActiveSite = () => {
    if (!activeSiteCode.value) {
      return;
    }

    applyTemplateToSite(activeSiteCode.value);
  };

  const applyTemplateToAllSites = () => {
    const template = activeTemplate.value;
    selectedSites.value = selectedSites.value.map((item) => ({
      ...item,
      ...buildSitePatchFromTemplate(template),
    }));
  };

  const updateActiveSite = (patch) => {
    if (!activeSite.value) {
      return;
    }

    selectedSites.value = selectedSites.value.map((item) =>
      item.siteCode === activeSiteCode.value
        ? {
            ...item,
            ...patch,
          }
        : item,
    );
  };

  watch(selectionMode, (mode) => {
    if (mode !== "single" || selectedSites.value.length <= 1) {
      return;
    }

    // 单选模式下只保留焦点部位，避免外部还要再做一次裁剪。
    const preservedSiteCode = activeSiteCode.value || selectedSites.value[0]?.siteCode;
    const preservedSite = selectedSites.value.find(
      (item) => item.siteCode === preservedSiteCode,
    );

    if (preservedSite) {
      selectedSites.value = [preservedSite];
      activeSiteCode.value = preservedSite.siteCode;
    }
  });

  return {
    activeSite,
    activeSiteCode,
    activeTemplate,
    activeTemplateId,
    applyTemplateToActiveSite,
    applyTemplateToAllSites,
    clearSites,
    markerPayload,
    removeSite,
    selectedCount,
    selectedSites,
    setActiveTemplate: (templateId) => {
      activeTemplateId.value = String(templateId || "").trim();
    },
    selectionMode,
    setActiveSite,
    toggleSite,
    updateActiveSite,
  };
};
