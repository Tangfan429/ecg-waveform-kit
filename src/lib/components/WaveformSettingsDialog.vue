<template>
  <el-dialog
    v-model="dialogVisible"
    title="设置"
    width="960px"
    align-center
    :close-on-click-modal="false"
    class="waveform-settings-dialog"
  >
    <div class="waveform-settings-dialog__content">
      <!-- 左侧颜色配置：控制工具色、波形文本色、工具文本色等视觉参数 -->
      <section class="settings-panel">
        <h3 class="settings-panel__title">颜色配置</h3>

        <el-form
          label-position="left"
          label-width="104px"
          class="color-settings-form"
        >
          <el-form-item
            v-for="field in COLOR_SETTING_FIELDS"
            :key="field.key"
            :label="field.label"
            class="color-settings-form__item"
          >
            <div class="color-setting-row">
              <el-color-picker
                :model-value="draftAppearanceSettings[field.key]"
                @change="handleColorPickerChange(field.key, $event)"
              />
              <el-input
                v-model.trim="draftColorInputs[field.key]"
                maxlength="7"
                @blur="syncColorInput(field.key)"
                @keyup.enter="syncColorInput(field.key)"
              />
            </div>
          </el-form-item>
        </el-form>
      </section>

      <!-- 右侧报告配置：控制诊断报告相关模板的启用状态和默认模板 -->
      <section class="settings-panel settings-panel--report">
        <h3 class="settings-panel__title">报告配置</h3>

        <div class="report-settings">
          <div
            v-for="item in draftReportSettings"
            :key="item.key"
            class="report-settings__row"
          >
            <el-checkbox v-model="item.enabled" class="report-settings__toggle">
              {{ item.label }}
            </el-checkbox>

            <span class="report-settings__template-label">当前模板</span>

            <el-select
              v-model="item.template"
              class="report-settings__select"
              :disabled="!item.enabled"
            >
              <el-option
                v-for="option in templateOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="waveform-settings-dialog__footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  COLOR_SETTING_FIELDS,
  REPORT_TEMPLATE_OPTIONS,
  createWaveformAppearanceSettings,
  createWaveformReportSettings,
  isValidHexColor,
  normalizeHexColor,
} from "../utils/waveformSettings";

defineOptions({
  name: "WaveformSettingsDialog",
});

// 弹窗只编辑草稿数据；真正生效的数据仍由页面容器在确认后统一接管。
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  appearanceSettings: {
    type: Object,
    default: () => createWaveformAppearanceSettings(),
  },
  reportSettings: {
    type: Array,
    default: () => createWaveformReportSettings(),
  },
  templateOptions: {
    type: Array,
    default: () => REPORT_TEMPLATE_OPTIONS,
  },
});

const emit = defineEmits(["update:modelValue", "confirm"]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// 草稿副本用于承接“取消”场景，避免用户边改边污染页面上的实时配置。
const draftAppearanceSettings = reactive(createWaveformAppearanceSettings());
const draftColorInputs = reactive(createWaveformAppearanceSettings());
const draftReportSettings = ref(createWaveformReportSettings());

const syncDraftSettings = () => {
  const nextAppearanceSettings = createWaveformAppearanceSettings(
    props.appearanceSettings,
  );

  Object.assign(draftAppearanceSettings, nextAppearanceSettings);
  Object.assign(draftColorInputs, nextAppearanceSettings);
  draftReportSettings.value = createWaveformReportSettings(
    props.reportSettings,
  );
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      syncDraftSettings();
    }
  },
  { immediate: true },
);

const syncColorInput = (fieldKey, { notify = true } = {}) => {
  const rawValue = draftColorInputs[fieldKey];

  // 输入框只接受标准 6 位十六进制颜色值，避免给渲染器传入非法颜色。
  if (!isValidHexColor(rawValue)) {
    if (notify) {
      const fieldLabel =
        COLOR_SETTING_FIELDS.find((field) => field.key === fieldKey)?.label ||
        "颜色值";
      ElMessage.warning(`${fieldLabel}请输入 6 位十六进制颜色值`);
    }

    draftColorInputs[fieldKey] = draftAppearanceSettings[fieldKey];
    return false;
  }

  const normalizedColor = normalizeHexColor(
    rawValue,
    draftAppearanceSettings[fieldKey],
  );
  draftAppearanceSettings[fieldKey] = normalizedColor;
  draftColorInputs[fieldKey] = normalizedColor;
  return true;
};

// 调色盘和输入框双向联动，保证颜色显示和文本值始终一致。
const handleColorPickerChange = (fieldKey, color) => {
  const normalizedColor = normalizeHexColor(
    color,
    draftAppearanceSettings[fieldKey],
  );
  draftAppearanceSettings[fieldKey] = normalizedColor;
  draftColorInputs[fieldKey] = normalizedColor;
};

const handleCancel = () => {
  dialogVisible.value = false;
};

const handleConfirm = () => {
  // 确认前再次统一校验，避免个别输入框还停留在非法值。
  const invalidField = COLOR_SETTING_FIELDS.find(
    (field) => !syncColorInput(field.key, { notify: false }),
  );

  if (invalidField) {
    ElMessage.warning(`${invalidField.label}请输入 6 位十六进制颜色值`);
    return;
  }

  emit("confirm", {
    appearanceSettings: createWaveformAppearanceSettings(
      draftAppearanceSettings,
    ),
    reportSettings: createWaveformReportSettings(draftReportSettings.value),
  });
};
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.waveform-settings-dialog {
  :deep(.el-dialog__header) {
    margin-right: 0;
    padding: $spacing-lg $spacing-xl $spacing-md;
    border-bottom: 1px solid $gray-3;
  }

  :deep(.el-dialog__title) {
    font: $font-title-xl;
    color: $text-primary;
  }

  :deep(.el-dialog__body) {
    padding: $spacing-lg $spacing-xl;
  }

  :deep(.el-dialog__footer) {
    padding: 0 $spacing-xl $spacing-xl;
  }

  &__content {
    display: grid;
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
    gap: $spacing-xl;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-md;
  }
}

.settings-panel {
  padding: $spacing-lg;
  border: 1px solid $gray-3;
  border-radius: $radius-xl;

  &__title {
    margin: 0 0 $spacing-lg;
    color: $brand-7-normal;
    font: $font-title-md;
  }

  &--report {
    min-width: 0;
  }
}

.color-settings-form {
  &__item {
    margin-bottom: $spacing-md;
  }
}

.color-setting-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: $spacing-sm;
  align-items: center;
  width: 100%;

  :deep(.el-color-picker__trigger) {
    width: 40px;
    height: 32px;
    border-radius: $radius-md;
  }
}

.report-settings {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 220px;
    gap: $spacing-md;
    align-items: center;
  }

  &__toggle {
    min-width: 0;

    :deep(.el-checkbox__label) {
      white-space: nowrap;
    }
  }

  &__template-label {
    color: $text-secondary;
    font: $font-body-md;
    white-space: nowrap;
  }

  &__select {
    width: 220px;
  }
}

@media (max-width: 992px) {
  .waveform-settings-dialog {
    :deep(.el-dialog) {
      width: calc(100vw - 32px);
      max-width: 960px;
    }

    &__content {
      grid-template-columns: 1fr;
    }
  }

  .report-settings {
    &__row {
      grid-template-columns: 1fr;
      justify-items: stretch;
    }

    &__select {
      width: 100%;
    }
  }
}
</style>
