import { computed, reactive, ref } from "vue";
import {
  REPORT_TEMPLATE_OPTIONS,
  buildWaveformAppearanceConfig,
  createWaveformAppearanceSettings,
  createWaveformReportSettings,
} from "../utils/waveformSettings";

export function useWaveformSettings() {
  // 这里维护的是诊断中心的页面级设置单一数据源。
  // 弹窗只编辑草稿；确认后再整体写回这里，保证颜色配置和报告配置同步生效。
  const isWaveformSettingsDialogOpen = ref(false);
  const waveformAppearanceSettings = reactive(
    createWaveformAppearanceSettings(),
  );
  const waveformReportSettings = ref(createWaveformReportSettings());

  // 渲染器使用的是扁平化后的外观配置，因此在这里集中做一次派生转换。
  const waveformAppearanceConfig = computed(() =>
    buildWaveformAppearanceConfig(waveformAppearanceSettings),
  );

  const openWaveformSettingsDialog = () => {
    isWaveformSettingsDialogOpen.value = true;
  };

  const closeWaveformSettingsDialog = () => {
    isWaveformSettingsDialogOpen.value = false;
  };

  const applyWaveformSettings = ({
    appearanceSettings,
    reportSettings,
  } = {}) => {
    // 页面级状态作为单一数据源，确认后再整体替换。
    Object.assign(
      waveformAppearanceSettings,
      createWaveformAppearanceSettings(appearanceSettings),
    );
    waveformReportSettings.value = createWaveformReportSettings(reportSettings);
    closeWaveformSettingsDialog();
  };

  return {
    reportTemplateOptions: REPORT_TEMPLATE_OPTIONS,
    waveformAppearanceConfig,
    waveformAppearanceSettings,
    waveformReportSettings,
    isWaveformSettingsDialogOpen,
    openWaveformSettingsDialog,
    closeWaveformSettingsDialog,
    applyWaveformSettings,
  };
}
