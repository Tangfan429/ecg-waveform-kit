<script setup>
import { computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import AnesthesiaRecordEditor from "../components/anesthesia/AnesthesiaRecordEditor.vue";
import AnesthesiaRecordPreview from "../components/anesthesia/AnesthesiaRecordPreview.vue";
import DocumentEditorPanel from "../components/record/DocumentEditorPanel.vue";
import DocumentPrintSettingsDrawer from "../components/record/DocumentPrintSettingsDrawer.vue";
import DocumentQualityPanel from "../components/record/DocumentQualityPanel.vue";
import DocumentTemplateSidebar from "../components/record/DocumentTemplateSidebar.vue";
import DocumentPreviewPanel from "../components/previews/DocumentPreviewPanel.vue";
import { useDocumentWorkspace } from "../composables/useDocumentWorkspace";
import { buildDocumentHeaderEntries } from "../schemas/documentTemplates";

defineOptions({
  name: "DocumentsWorkspace",
});

const {
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
  setActiveTemplate,
  setFocusMode,
  setPrintSettingsOpen,
  setPreviewScale,
  signatureReady,
  templates,
  validationSummary,
  updateCollectionRow,
  updateField,
  updatePrintSetting,
} = useDocumentWorkspace();

const patientSummaryEntries = computed(() =>
  buildDocumentHeaderEntries(activeTemplate.value, record.value).slice(0, 6),
);

const layoutClassName = computed(() => {
  if (focusMode.value === "editor") {
    return "documents-workspace__layout documents-workspace__layout--editor";
  }

  if (focusMode.value === "preview") {
    return "documents-workspace__layout documents-workspace__layout--preview";
  }

  return "documents-workspace__layout";
});

const summaryCards = computed(() => {
  if (isAnesthesiaRecord.value) {
    return [
      { label: "模板类型", value: "麻醉记录单" },
      { label: "生命体征点", value: `${anesthesiaMetrics.value.trendPointCount} 条` },
      { label: "事件标记", value: `${anesthesiaMetrics.value.eventCount} 条` },
      { label: "打印页数", value: `${pageCount.value} 页` },
      { label: "术中用药", value: `${anesthesiaMetrics.value.medicationCount} 项` },
      { label: "液体出入量", value: `${anesthesiaMetrics.value.fluidCount} 项` },
      { label: "签章状态", value: signatureReady.value ? "已填写" : "待完善" },
    ];
  }

  return [
    { label: "当前模板", value: activeTemplate.value.title },
    { label: "正文字符数", value: narrativeCharacterCount.value },
    { label: "打印页数", value: `${pageCount.value} 页` },
    { label: "签章状态", value: signatureReady.value ? "已填写" : "待完善" },
  ];
});

const handleFieldUpdate = ({ key, value }) => {
  updateField(key, value);
};

const handleCollectionRowUpdate = ({ collectionKey, index, rowPatch }) => {
  updateCollectionRow(collectionKey, index, rowPatch);
};

const handlePrintSettingUpdate = ({ key, value }) => {
  updatePrintSetting(key, value);
};

const handlePrint = async () => {
  if (validationSummary.value.errors.length) {
    await ElMessageBox.alert(
      validationSummary.value.errors.map((item) => `- ${item}`).join("\n"),
      "打印前需先修复以下问题",
      {
        type: "error",
        confirmButtonText: "我知道了",
      },
    );
    return;
  }

  if (validationSummary.value.warnings.length) {
    try {
      await ElMessageBox.confirm(
        validationSummary.value.warnings
          .slice(0, 8)
          .map((item) => `- ${item}`)
          .join("\n"),
        "仍存在打印警告，是否继续打印？",
        {
          type: "warning",
          confirmButtonText: "继续打印",
          cancelButtonText: "返回检查",
        },
      );
    } catch {
      return;
    }
  }

  const success = await printCurrentRecord();

  if (!success) {
    ElMessage.warning("当前文书无法生成打印内容。");
    return;
  }

  ElMessage.success("已打开打印预览窗口。");
};
</script>

<template>
  <section class="documents-workspace">
    <header class="documents-workspace__header">
      <div class="documents-workspace__copy">
        <p class="documents-workspace__eyebrow">Hospital Documents</p>
        <h2 class="documents-workspace__title">医院文书工作台</h2>
        <p class="documents-workspace__summary">
          模板、预览和打印统一收口。麻醉记录单采用宽表趋势图版式，其余病历保留叙述型分页方案。
        </p>
      </div>

      <div class="documents-workspace__toolbar">
        <div class="documents-workspace__focus-switch">
          <ElButton
            :type="focusMode === 'split' ? 'primary' : 'default'"
            plain
            @click="setFocusMode('split')"
          >
            双栏
          </ElButton>
          <ElButton
            :type="focusMode === 'editor' ? 'primary' : 'default'"
            plain
            @click="setFocusMode('editor')"
          >
            专注编辑
          </ElButton>
          <ElButton
            :type="focusMode === 'preview' ? 'primary' : 'default'"
            plain
            @click="setFocusMode('preview')"
          >
            专注预览
          </ElButton>
        </div>

        <ElButton @click="resetCurrentTemplate">重置模板</ElButton>
        <ElButton @click="setPrintSettingsOpen(true)">打印设置</ElButton>
        <ElButton type="primary" @click="handlePrint">打印文书</ElButton>
      </div>
    </header>

    <section class="documents-workspace__overview">
      <ElDescriptions
        :column="3"
        border
        class="documents-workspace__descriptions"
      >
        <ElDescriptionsItem
          v-for="entry in patientSummaryEntries"
          :key="entry.key"
          :label="entry.label"
        >
          {{ entry.value }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <div class="documents-workspace__stats">
        <article
          v-for="item in summaryCards"
          :key="item.label"
          class="documents-workspace__stat-card"
        >
          <span class="documents-workspace__stat-label">{{ item.label }}</span>
          <strong class="documents-workspace__stat-value">{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <DocumentQualityPanel :validation-summary="validationSummary" />

    <section :class="layoutClassName">
      <DocumentTemplateSidebar
        class="documents-workspace__sidebar"
        :templates="templates"
        :active-template-id="activeTemplateId"
        @select-template="setActiveTemplate"
      />

      <AnesthesiaRecordEditor
        v-if="isAnesthesiaRecord && focusMode !== 'preview'"
        class="documents-workspace__editor"
        :record="record"
        @update-field="handleFieldUpdate"
        @update-collection-row="handleCollectionRowUpdate"
        @add-collection-row="addCollectionRow"
        @remove-collection-row="removeCollectionRow"
      />

      <DocumentEditorPanel
        v-else-if="focusMode !== 'preview'"
        class="documents-workspace__editor"
        :template="activeTemplate"
        :record="record"
        @update-field="handleFieldUpdate"
      />

      <section
        v-if="focusMode !== 'editor'"
        class="documents-workspace__preview-shell"
      >
        <div class="documents-workspace__preview-toolbar">
          <div class="documents-workspace__preview-meta">
            <ElTag v-if="isPaginating" type="warning" effect="plain">
              版式计算中
            </ElTag>
            <ElTag v-else type="success" effect="plain">
              打印时间 {{ printedAt }}
            </ElTag>
            <ElTag
              v-if="paginationError"
              type="danger"
              effect="plain"
            >
              排版异常
            </ElTag>
          </div>

          <div class="documents-workspace__preview-scale">
            <span class="documents-workspace__preview-scale-label">预览比例</span>
            <ElSlider
              :model-value="previewScale"
              :min="0.6"
              :max="1"
              :step="0.02"
              style="width: 180px;"
              @update:model-value="setPreviewScale"
            />
          </div>
        </div>

        <AnesthesiaRecordPreview
          v-if="isAnesthesiaRecord"
          :template="activeTemplate"
          :record="record"
          :pages="pages"
          :is-paginating="isPaginating"
          :printed-at="printedAt"
          :print-settings="printSettings"
          :preview-scale="previewScale"
          :pagination-error="paginationError"
        />

        <DocumentPreviewPanel
          v-else
          :template="activeTemplate"
          :record="record"
          :pages="pages"
          :is-paginating="isPaginating"
          :printed-at="printedAt"
          :print-settings="printSettings"
          :preview-scale="previewScale"
          :pagination-error="paginationError"
        />
      </section>
    </section>

    <DocumentPrintSettingsDrawer
      v-model="isPrintSettingsOpen"
      :settings="printSettings"
      @update-setting="handlePrintSettingUpdate"
    />
  </section>
</template>

<style scoped lang="scss">
.documents-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    padding: 24px 26px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 28px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(239, 247, 255, 0.98) 100%);
    box-shadow: 0 24px 56px rgba(15, 23, 42, 0.08);
  }

  &__copy {
    max-width: 760px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(53, 98, 236, 0.84);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 30px;
  }

  &__summary {
    margin: 12px 0 0;
    color: rgba(15, 23, 42, 0.64);
    font-size: 14px;
    line-height: 1.7;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  &__focus-switch {
    display: flex;
    gap: 8px;
    padding: 6px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.84);
  }

  &__overview {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
    gap: 18px;
  }

  &__descriptions,
  &__stats {
    padding: 18px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  &__stat-card {
    padding: 16px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(248, 251, 255, 0.96) 0%, rgba(255, 255, 255, 1) 100%);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  &__stat-label {
    display: block;
    color: rgba(15, 23, 42, 0.54);
    font-size: 12px;
  }

  &__stat-value {
    display: block;
    margin-top: 8px;
    color: rgba(15, 23, 42, 0.92);
    font-size: 18px;
  }

  &__layout {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr) minmax(0, 1.2fr);
    gap: 18px;
    min-height: 900px;

    &--editor {
      grid-template-columns: 320px minmax(0, 1fr);
    }

    &--preview {
      grid-template-columns: 320px minmax(0, 1fr);
    }
  }

  &__sidebar,
  &__editor,
  &__preview-shell {
    min-height: 0;
  }

  &__preview-shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  &__preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
  }

  &__preview-meta,
  &__preview-scale {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__preview-scale-label {
    color: rgba(15, 23, 42, 0.58);
    font-size: 12px;
  }
}

@media (max-width: 1360px) {
  .documents-workspace {
    &__overview,
    &__layout,
    &__layout--editor,
    &__layout--preview {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 768px) {
  .documents-workspace {
    &__header {
      padding: 20px;
    }

    &__title {
      font-size: 24px;
    }

    &__stats {
      grid-template-columns: 1fr;
    }

    &__preview-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
  }
}
</style>
