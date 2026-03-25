<script setup>
import { ElMessage } from "element-plus";
import { computed, useTemplateRef } from "vue";
import { useWaveformViewport } from "../composables/useWaveformViewport";
import { printReportDocument } from "../utils/reportPrint";
import ReportDocumentViewer from "./ReportDocumentViewer.vue";
import ReportViewerToolbar from "./ReportViewerToolbar.vue";

defineOptions({
  name: "ReportWorkspace",
});

const props = defineProps({
  report: {
    type: Object,
    default: null,
  },
  title: {
    type: String,
    default: "动态报告查看",
  },
});

const emit = defineEmits(["print"]);

const workspaceRef = useTemplateRef("workspaceRef");
const {
  zoomPercent,
  isFullscreen,
  setZoom,
  toggleFullscreen,
} = useWaveformViewport(workspaceRef);

const reportLabel = computed(() => props.report?.fileName || props.title);

const handlePrint = () => {
  const success = printReportDocument(props.report);

  if (!success) {
    ElMessage.warning("当前报告无法生成打印内容。");
    return;
  }

  emit("print", {
    title: props.title,
    report: props.report,
  });
};
</script>

<template>
  <section ref="workspaceRef" class="report-workspace">
    <header class="report-workspace__header">
      <div class="report-workspace__meta">
        <span class="report-workspace__eyebrow">Report Mode</span>
        <h3 class="report-workspace__title">{{ title }}</h3>
        <p class="report-workspace__file">{{ reportLabel }}</p>
      </div>

      <ReportViewerToolbar
        :zoom-percent="zoomPercent"
        :fullscreen-active="isFullscreen"
        @print="handlePrint"
        @zoom-change="setZoom"
        @fullscreen="toggleFullscreen"
      />
    </header>

    <ReportDocumentViewer
      :report="report"
      :zoom-percent="zoomPercent"
      :fullscreen-active="isFullscreen"
    />
  </section>
</template>

<style scoped lang="scss">
.report-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 18px 20px;
    background:
      linear-gradient(180deg, rgba(249, 251, 255, 0.96) 0%, rgba(242, 246, 255, 0.96) 100%);
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  }

  &__meta {
    min-width: 0;
  }

  &__eyebrow {
    display: block;
    margin-bottom: 6px;
    color: rgba(53, 98, 236, 0.88);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    font-size: 22px;
  }

  &__file {
    margin: 6px 0 0;
    color: rgba(15, 23, 42, 0.58);
    font-size: 13px;
  }
}

@media (max-width: 960px) {
  .report-workspace {
    &__header {
      flex-direction: column;
      align-items: stretch;
    }
  }
}
</style>
