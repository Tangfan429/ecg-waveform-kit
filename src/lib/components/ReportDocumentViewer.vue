<template>
  <div
    class="report-document-viewer"
    :class="{
      'report-document-viewer--fullscreen': fullscreenActive,
    }"
  >
    <el-empty
      v-if="!hasReport"
      description="暂无报告文件"
      class="report-document-viewer__empty"
    />

    <div v-else-if="isPdfReport" class="report-document-viewer__pdf-wrapper">
      <iframe
        :src="pdfPreviewSrc"
        class="report-document-viewer__pdf-frame"
        title="报告预览"
      />
    </div>

    <el-scrollbar v-else class="report-document-viewer__scrollbar">
      <div class="report-document-viewer__pages">
        <figure
          v-for="page in report.pages"
          :key="page.id"
          class="report-document-viewer__page"
        >
          <img
            :src="page.url"
            :alt="page.alt"
            :style="pageImageStyle"
            class="report-document-viewer__image"
          />
        </figure>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed } from "vue";

defineOptions({
  name: "ReportDocumentViewer",
});

const props = defineProps({
  report: {
    type: Object,
    default: null,
  },
  zoomPercent: {
    type: Number,
    default: 100,
  },
  fullscreenActive: {
    type: Boolean,
    default: false,
  },
});

const normalizedZoom = computed(() => {
  const numericValue = Number(props.zoomPercent);

  if (!Number.isFinite(numericValue)) {
    return 100;
  }

  return Math.min(200, Math.max(50, Math.round(numericValue)));
});
const hasReport = computed(() => {
  if (!props.report) {
    return false;
  }

  if (props.report.sourceType === "pdf") {
    return Boolean(props.report.url);
  }

  return Array.isArray(props.report.pages) && props.report.pages.length > 0;
});
const isPdfReport = computed(() => props.report?.sourceType === "pdf");
const pageImageStyle = computed(() => ({
  width: `${Math.round(780 * (normalizedZoom.value / 100))}px`,
}));

// 先兼容浏览器原生 PDF 预览，后续如果切到 pdf.js，只需要替换这个预览地址生成逻辑。
const pdfPreviewSrc = computed(() => {
  const reportUrl = props.report?.url;

  if (!reportUrl) {
    return "";
  }

  const hash = `toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=${normalizedZoom.value}`;
  return `${reportUrl}#${hash}`;
});
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.report-document-viewer {
  flex: 1;
  min-height: 0;
  background-color: #eef1f7;

  &--fullscreen {
    background-color: #e8edf7;
  }

  &__empty {
    height: 100%;
  }

  &__pdf-wrapper {
    height: 100%;
    padding: 60px $spacing-md $spacing-md;
  }

  &__pdf-frame {
    width: 100%;
    height: 100%;
    border: 0;
    background-color: $gray-white;
  }

  &__scrollbar {
    height: 100%;
  }

  &__pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-lg;
    min-width: max-content;
    padding: 60px 0 $spacing-xl;
  }

  &__page {
    margin: 0;
    padding: 0;
    background-color: $gray-white;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  }

  &__image {
    display: block;
    height: auto;
    max-width: none;
  }
}
</style>
