<script setup>
import AnesthesiaRecordPaper from "./AnesthesiaRecordPaper.vue";

defineOptions({
  name: "AnesthesiaRecordPreview",
});

defineProps({
  template: { type: Object, default: null },
  record: { type: Object, default: () => ({}) },
  pages: { type: Array, default: () => [] },
  printedAt: { type: String, default: "--" },
  printSettings: { type: Object, default: () => ({}) },
  previewScale: { type: Number, default: 0.72 },
  isPaginating: { type: Boolean, default: false },
  paginationError: { type: String, default: "" },
});
</script>

<template>
  <section class="anesthesia-record-preview">
    <header class="anesthesia-record-preview__header">
      <div>
        <p class="anesthesia-record-preview__eyebrow">Preview</p>
        <h3 class="anesthesia-record-preview__title">麻醉记录单打印预览</h3>
      </div>
      <ElTag v-if="isPaginating" type="warning" effect="plain">
        版式计算中
      </ElTag>
      <ElTag v-else type="success" effect="plain">
        共 {{ pages.length }} 页
      </ElTag>
    </header>

    <ElAlert
      v-if="paginationError"
      :closable="false"
      type="error"
      :title="paginationError"
      class="anesthesia-record-preview__alert"
    />

    <ElScrollbar class="anesthesia-record-preview__scrollbar">
      <div class="anesthesia-record-preview__stack">
        <div
          v-for="page in pages"
          :key="page.number"
          class="anesthesia-record-preview__page-shell"
          :style="{ '--preview-scale': previewScale }"
        >
          <AnesthesiaRecordPaper
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
.anesthesia-record-preview {
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
    color: rgba(234, 88, 12, 0.84);
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
    width: calc(1123px * var(--preview-scale));
    transform: scale(var(--preview-scale));
    transform-origin: top center;
  }
}
</style>
