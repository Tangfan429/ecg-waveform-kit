import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import {
  createDocumentCollectionRow,
  createDocumentRecord,
  getDocumentTemplate,
  getDocumentTemplates,
  isAnesthesiaTemplate,
} from "../schemas/documentTemplates";
import {
  DEFAULT_DOCUMENT_PRINT_SETTINGS,
  paginateNarrativeDocumentRecord,
} from "../utils/documentPretextLayout";
import { paginateAnesthesiaRecord } from "../utils/anesthesiaRecordLayout";
import { validateDocumentRecord } from "../utils/documentValidation";
import { printDocumentRecord } from "../utils/documentPrint";

const createNextRecord = (templateId) => createDocumentRecord(templateId);

const updateListAtIndex = (listValue, index, updater) =>
  listValue.map((item, itemIndex) =>
    itemIndex === index ? updater(item) : item,
  );

export const useDocumentWorkspace = () => {
  const templates = getDocumentTemplates();
  const activeTemplateId = ref(templates[0].id);
  const record = ref(createNextRecord(activeTemplateId.value));
  const printSettings = ref({
    ...DEFAULT_DOCUMENT_PRINT_SETTINGS,
  });
  const previewScale = ref(0.82);
  const focusMode = ref("split");
  const isPrintSettingsOpen = ref(false);
  const pages = ref([]);
  const printedAt = ref("--");
  const isPaginating = ref(false);
  const paginationError = ref("");

  const activeTemplate = computed(() =>
    getDocumentTemplate(activeTemplateId.value),
  );
  const isAnesthesiaRecord = computed(() =>
    isAnesthesiaTemplate(activeTemplate.value),
  );

  const pageCount = computed(() => pages.value.length);
  const narrativeCharacterCount = computed(() =>
    (activeTemplate.value.sectionFields || []).reduce((total, section) => {
      const nextValue = String(record.value?.[section.key] || "");
      return total + nextValue.trim().length;
    }, 0),
  );
  const anesthesiaMetrics = computed(() => ({
    trendPointCount: (record.value.trendPoints || []).filter((point) =>
      Object.values(point).some((fieldValue) => String(fieldValue || "").trim()),
    ).length,
    eventCount: (record.value.eventMarkers || []).filter(
      (row) => String(row.label || "").trim() || String(row.time || "").trim(),
    ).length,
    medicationCount: (record.value.medications || []).filter(
      (row) => String(row.name || "").trim(),
    ).length,
    fluidCount: (record.value.fluids || []).filter(
      (row) => String(row.name || "").trim(),
    ).length,
  }));
  const signatureReady = computed(() =>
    isAnesthesiaRecord.value
      ? Boolean(String(record.value.signoffDoctor || "").trim()) &&
        Boolean(String(record.value.reviewerName || "").trim())
      : Boolean(String(record.value.authorName || "").trim()) &&
        Boolean(String(record.value.reviewerName || "").trim()),
  );
  const validationSummary = computed(() =>
    validateDocumentRecord({
      template: activeTemplate.value,
      record: record.value,
      pages: pages.value,
    }),
  );

  const runPagination = async () => {
    isPaginating.value = true;
    paginationError.value = "";

    try {
      const layoutResult = isAnesthesiaRecord.value
        ? await paginateAnesthesiaRecord({
            template: activeTemplate.value,
            record: record.value,
            printSettings: printSettings.value,
          })
        : await paginateNarrativeDocumentRecord({
            template: activeTemplate.value,
            record: record.value,
            printSettings: printSettings.value,
          });

      pages.value = layoutResult.pages;
      printedAt.value = layoutResult.printedAt;
    } catch (error) {
      pages.value = [];
      paginationError.value =
        error instanceof Error ? error.message : "文书分页失败";
    } finally {
      isPaginating.value = false;
    }
  };

  const debouncedPagination = useDebounceFn(runPagination, 120);

  watch(
    activeTemplateId,
    (templateId) => {
      const nextTemplate = getDocumentTemplate(templateId);
      record.value = createNextRecord(templateId);
      previewScale.value = nextTemplate.kind === "anesthesiaSheet" ? 0.72 : 0.82;
      void runPagination();
    },
    { immediate: true },
  );

  watch(
    [record, printSettings],
    () => {
      void debouncedPagination();
    },
    { deep: true },
  );

  const updateField = (fieldKey, value) => {
    record.value = {
      ...record.value,
      [fieldKey]: value,
    };
  };

  const updatePrintSetting = (settingKey, value) => {
    printSettings.value = {
      ...printSettings.value,
      [settingKey]: value,
    };
  };

  const updateCollectionRow = (collectionKey, index, rowPatch) => {
    record.value = {
      ...record.value,
      [collectionKey]: updateListAtIndex(
        record.value[collectionKey] || [],
        index,
        (currentRow) => ({
          ...currentRow,
          ...rowPatch,
        }),
      ),
    };
  };

  const addCollectionRow = (collectionKey) => {
    record.value = {
      ...record.value,
      [collectionKey]: [
        ...(record.value[collectionKey] || []),
        createDocumentCollectionRow(collectionKey),
      ],
    };
  };

  const removeCollectionRow = (collectionKey, index) => {
    record.value = {
      ...record.value,
      [collectionKey]: (record.value[collectionKey] || []).filter(
        (_item, itemIndex) => itemIndex !== index,
      ),
    };
  };

  const resetCurrentTemplate = () => {
    record.value = createNextRecord(activeTemplateId.value);
  };

  const printCurrentRecord = async () => {
    await runPagination();

    return printDocumentRecord({
      template: activeTemplate.value,
      record: record.value,
      pages: pages.value,
      printedAt: printedAt.value,
      printSettings: printSettings.value,
    });
  };

  return {
    activeTemplate,
    activeTemplateId,
    addCollectionRow,
    anesthesiaMetrics,
    focusMode,
    isAnesthesiaRecord,
    isPaginating,
    isPrintSettingsOpen,
    narrativeCharacterCount,
    pageCount,
    pages,
    paginationError,
    previewScale,
    printCurrentRecord,
    printedAt,
    printSettings,
    record,
    removeCollectionRow,
    resetCurrentTemplate,
    setActiveTemplate: (templateId) => {
      activeTemplateId.value = templateId;
    },
    setFocusMode: (mode) => {
      focusMode.value = mode;
    },
    setPrintSettingsOpen: (nextValue) => {
      isPrintSettingsOpen.value = nextValue;
    },
    setPreviewScale: (nextValue) => {
      previewScale.value = nextValue;
    },
    signatureReady,
    templates,
    validationSummary,
    updateCollectionRow,
    updateField,
    updatePrintSetting,
  };
};
