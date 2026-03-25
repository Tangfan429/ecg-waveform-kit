<template>
  <div class="report-viewer-toolbar">
    <div class="report-viewer-toolbar__group report-viewer-toolbar__group--actions">
      <el-button text class="toolbar-text-btn" @click="handlePrint">
        <el-icon><Printer /></el-icon>
        <span>打印</span>
      </el-button>
    </div>

    <div class="report-viewer-toolbar__divider"></div>

    <div class="report-viewer-toolbar__group report-viewer-toolbar__group--zoom">
      <button
        type="button"
        class="toolbar-icon-btn"
        :class="{ 'toolbar-icon-btn--disabled': isZoomOutDisabled }"
        @click="handleZoomOut"
      >
        <el-icon><Minus /></el-icon>
      </button>

      <span class="zoom-value">{{ normalizedZoom }}%</span>

      <button
        type="button"
        class="toolbar-icon-btn"
        :class="{ 'toolbar-icon-btn--disabled': isZoomInDisabled }"
        @click="handleZoomIn"
      >
        <el-icon><Plus /></el-icon>
      </button>
    </div>

    <div class="report-viewer-toolbar__divider"></div>

    <div class="report-viewer-toolbar__group report-viewer-toolbar__group--fullscreen">
      <button
        type="button"
        class="toolbar-icon-btn"
        :class="{ 'toolbar-icon-btn--active': fullscreenActive }"
        @click="handleFullscreen"
      >
        <el-icon><FullScreen /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { FullScreen, Minus, Plus, Printer } from "@element-plus/icons-vue";

defineOptions({
  name: "ReportViewerToolbar",
});

const props = defineProps({
  zoomPercent: {
    type: Number,
    default: 100,
  },
  fullscreenActive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["print", "zoom-change", "fullscreen"]);

const normalizedZoom = computed(() => {
  const numericValue = Number(props.zoomPercent);

  if (!Number.isFinite(numericValue)) {
    return 100;
  }

  return Math.min(200, Math.max(50, Math.round(numericValue)));
});
const isZoomOutDisabled = computed(() => normalizedZoom.value <= 50);
const isZoomInDisabled = computed(() => normalizedZoom.value >= 200);

const handlePrint = () => {
  emit("print");
};

const handleFullscreen = () => {
  emit("fullscreen");
};

const handleZoomOut = () => {
  if (!isZoomOutDisabled.value) {
    emit("zoom-change", normalizedZoom.value - 10);
  }
};

const handleZoomIn = () => {
  if (!isZoomInDisabled.value) {
    emit("zoom-change", normalizedZoom.value + 10);
  }
};
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.report-viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: fit-content;
  max-width: 100%;
  padding: 6px 12px;
  background: linear-gradient(90deg, #eef3ff 0%, #f4efff 100%);
  border: 1px solid rgba(181, 199, 255, 0.8);
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(53, 98, 236, 0.12);

  &__group {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  &__divider {
    width: 1px;
    height: 16px;
    background-color: rgba(181, 199, 255, 0.9);
  }
}

.toolbar-text-btn {
  height: 28px;
  padding: 0 4px;
  color: $brand-7-normal;

  :deep(.el-button) {
    margin: 0;
  }

  :deep(span) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font: $font-body-md;
  }
}

.toolbar-icon-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0;
  border: none;
  background-color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.96);
  }

  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;

    &:hover {
      background-color: rgba(255, 255, 255, 0.75);
    }
  }

  &--active {
    background-color: rgba(217, 225, 255, 0.92);
    box-shadow: inset 0 0 0 1px rgba(53, 98, 236, 0.2);
  }
}

.zoom-value {
  min-width: 44px;
  font: $font-body-md;
  color: $text-primary;
  text-align: center;
  user-select: none;
}
</style>