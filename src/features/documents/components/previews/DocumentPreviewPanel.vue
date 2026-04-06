<script setup>
import DocumentPaperPage from "./DocumentPaperPage.vue";

defineOptions({
  name: "DocumentPreviewPanel",
});

defineProps({
  template: {
    type: Object,
    default: null,
  },
  record: {
    type: Object,
    default: () => ({}),
  },
  pages: {
    type: Array,
    default: () => [],
  },
  isPaginating: {
    type: Boolean,
    default: false,
  },
  printedAt: {
    type: String,
    default: "--",
  },
  printSettings: {
    type: Object,
    default: () => ({}),
  },
  previewScale: {
    type: Number,
    default: 0.82,
  },
  paginationError: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <section class="document-preview-panel">
    <header class="document-preview-panel__header">
      <div>
        <p class="document-preview-panel__eyebrow">Preview</p>
        <h3 class="document-preview-panel__title">A4 分页预览</h3>
      </div>
      <div class="document-preview-panel__status">
        <ElTag v-if="isPaginating" type="warning" effect="plain">
          分页计算中
        </ElTag>
        <ElTag v-else type="success" effect="plain">
          共 {{ pages.length }} 页
        </ElTag>
      </div>
    </header>

    <ElAlert
      v-if="paginationError"
      type="error"
      :closable="false"
      :title="paginationError"
      class="document-preview-panel__alert"
    />

    <ElEmpty
      v-if="!pages.length && !isPaginating && !paginationError"
      description="暂无分页结果"
      class="document-preview-panel__empty"
    />

    <ElScrollbar
      v-else
      class="document-preview-panel__scrollbar"
    >
      <div class="document-preview-panel__stack">
        <div
          v-for="page in pages"
          :key="page.number"
          class="document-preview-panel__page-shell"
          :style="{ '--preview-scale': previewScale }"
        >
          <DocumentPaperPage
            :page="page"
            :template="template"
            :record="record"
            :print-settings="printSettings"
            :printed-at="printedAt"
          />
        </div>
      </div>
    </ElScrollbar>
  </section>
</template>

<style scoped lang="scss">
.document-preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(53, 98, 236, 0.84);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 20px;
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__empty,
  &__scrollbar {
    flex: 1;
    min-height: 0;
  }

  &__stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    padding: 8px 0 16px;
  }

  &__page-shell {
    width: calc(794px * var(--preview-scale));
    transform: scale(var(--preview-scale));
    transform-origin: top center;
  }
}
</style>
