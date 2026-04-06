<script setup>
import { computed } from "vue";

defineOptions({
  name: "DocumentPrintSettingsDrawer",
});

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  settings: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:modelValue", "update-setting"]);

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const handleSettingUpdate = (key, value) => {
  emit("update-setting", {
    key,
    value,
  });
};
</script>

<template>
  <ElDrawer
    v-model="drawerVisible"
    title="打印设置"
    size="380px"
    destroy-on-close
  >
    <div class="document-print-settings">
      <ElForm label-position="top">
        <ElFormItem label="页边距（mm）">
          <ElSlider
            :model-value="settings.pageMarginMm"
            :min="4"
            :max="12"
            :step="1"
            show-input
            @update:model-value="handleSettingUpdate('pageMarginMm', $event)"
          />
        </ElFormItem>

        <ElFormItem label="正文字号（px）">
          <ElSlider
            :model-value="settings.bodyFontSize"
            :min="13"
            :max="16"
            :step="1"
            show-input
            @update:model-value="handleSettingUpdate('bodyFontSize', $event)"
          />
        </ElFormItem>

        <ElFormItem label="行高（px）">
          <ElSlider
            :model-value="settings.lineHeight"
            :min="22"
            :max="28"
            :step="1"
            show-input
            @update:model-value="handleSettingUpdate('lineHeight', $event)"
          />
        </ElFormItem>

        <ElFormItem label="显示水印">
          <ElSwitch
            :model-value="settings.showWatermark"
            @update:model-value="handleSettingUpdate('showWatermark', $event)"
          />
        </ElFormItem>

        <ElFormItem label="水印内容">
          <ElInput
            :model-value="settings.watermarkText"
            placeholder="请输入水印文字"
            :disabled="!settings.showWatermark"
            @update:model-value="handleSettingUpdate('watermarkText', $event)"
          />
        </ElFormItem>

        <ElFormItem label="显示页码">
          <ElSwitch
            :model-value="settings.showPageNumber"
            @update:model-value="handleSettingUpdate('showPageNumber', $event)"
          />
        </ElFormItem>

        <ElFormItem label="显示打印时间">
          <ElSwitch
            :model-value="settings.showPrintTime"
            @update:model-value="handleSettingUpdate('showPrintTime', $event)"
          />
        </ElFormItem>
      </ElForm>
    </div>
  </ElDrawer>
</template>

<style scoped lang="scss">
.document-print-settings {
  padding-right: 8px;
}
</style>
