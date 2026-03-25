const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

// 设置弹窗左侧颜色配置项。
// 这些字段是“用户可编辑的业务字段”，并不直接等同于 renderer 的底层配置 key。
export const COLOR_SETTING_FIELDS = Object.freeze([
  { key: "waveformColor", label: "波线色" },
  { key: "gridColor", label: "网格色" },
  { key: "toolColor", label: "工具色" },
  { key: "backgroundColor", label: "背景色" },
  { key: "waveformTextColor", label: "波形文本色" },
  { key: "toolTextColor", label: "工具文本色" },
]);

export const REPORT_TEMPLATE_OPTIONS = Object.freeze([
  { label: "模板一", value: "template-1" },
  { label: "模板二", value: "template-2" },
  { label: "模板三", value: "template-3" },
]);

export const DEFAULT_WAVEFORM_APPEARANCE_SETTINGS = Object.freeze({
  waveformColor: "#3B3B3B",
  gridColor: "#F08A92",
  gridRenderPreset: "dotted-small",
  toolColor: "#2BA471",
  backgroundColor: "#FFFFFF",
  waveformTextColor: "#1F1F1F",
  toolTextColor: "#3562EC",
});

export const GRID_RENDER_PRESET_OPTIONS = Object.freeze([
  "classic",
  "dotted-small",
]);

export const DEFAULT_WAVEFORM_REPORT_SETTINGS = Object.freeze([
  {
    key: "routine",
    label: "常规心电图报告",
    enabled: true,
    template: "template-1",
  },
  {
    key: "averageTemplate",
    label: "平均模板报告",
    enabled: false,
    template: "template-1",
  },
  {
    key: "spectrum",
    label: "频谱心电报告",
    enabled: false,
    template: "template-1",
  },
  {
    key: "highFrequency",
    label: "高频心电报告",
    enabled: false,
    template: "template-1",
  },
  {
    key: "rhythmWaveform",
    label: "节律波形报告",
    enabled: false,
    template: "template-1",
  },
  {
    key: "vectorcardiogram",
    label: "心电向量图报告",
    enabled: false,
    template: "template-1",
  },
]);

function clampRgbChannel(value) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hexToRgb(hexColor) {
  const normalizedColor = normalizeHexColor(
    hexColor,
    DEFAULT_WAVEFORM_APPEARANCE_SETTINGS.backgroundColor,
  );

  return {
    r: Number.parseInt(normalizedColor.slice(1, 3), 16),
    g: Number.parseInt(normalizedColor.slice(3, 5), 16),
    b: Number.parseInt(normalizedColor.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => clampRgbChannel(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function isValidHexColor(color) {
  return HEX_COLOR_PATTERN.test(String(color || "").trim());
}

export function normalizeHexColor(color, fallbackColor) {
  const safeColor = String(color || "").trim();
  if (isValidHexColor(safeColor)) {
    return safeColor.toUpperCase();
  }

  return String(fallbackColor || "")
    .trim()
    .toUpperCase();
}

export function mixHexColors(baseColor, targetColor, targetWeight = 0.5) {
  const clampedWeight = Math.min(1, Math.max(0, Number(targetWeight) || 0));
  const baseRgb = hexToRgb(baseColor);
  const targetRgb = hexToRgb(targetColor);

  return rgbToHex({
    r: baseRgb.r + (targetRgb.r - baseRgb.r) * clampedWeight,
    g: baseRgb.g + (targetRgb.g - baseRgb.g) * clampedWeight,
    b: baseRgb.b + (targetRgb.b - baseRgb.b) * clampedWeight,
  });
}

export function createWaveformAppearanceSettings(overrides = {}) {
  // ???????????????????????????????????
  const colorSettings = COLOR_SETTING_FIELDS.reduce((settings, field) => {
    settings[field.key] = normalizeHexColor(
      overrides[field.key],
      DEFAULT_WAVEFORM_APPEARANCE_SETTINGS[field.key],
    );
    return settings;
  }, {});

  return {
    ...colorSettings,
    gridRenderPreset: GRID_RENDER_PRESET_OPTIONS.includes(
      overrides.gridRenderPreset,
    )
      ? overrides.gridRenderPreset
      : DEFAULT_WAVEFORM_APPEARANCE_SETTINGS.gridRenderPreset,
  };
}

export function createWaveformReportSettings(overrides = []) {
  const overrideMap = new Map(
    (Array.isArray(overrides) ? overrides : []).map((item) => [item.key, item]),
  );

  return DEFAULT_WAVEFORM_REPORT_SETTINGS.map((defaultItem) => {
    const overrideItem = overrideMap.get(defaultItem.key) || {};
    return {
      ...defaultItem,
      enabled: Boolean(overrideItem.enabled ?? defaultItem.enabled),
      template: overrideItem.template || defaultItem.template,
    };
  });
}

export function buildWaveformAppearanceConfig(settings = {}) {
  const appearanceSettings = createWaveformAppearanceSettings(settings);
  const backgroundColor = appearanceSettings.backgroundColor;
  const gridColor = appearanceSettings.gridColor;

  // 这里完成“设置弹窗字段”到“renderer 配置 token”的映射。
  // 映射规则如下：
  // 1. 波线色 -> waveformColor
  // 2. 网格色 -> smallGridColor / largeGridColor（按同色系深浅自动派生）
  // 3. 波形文本色 -> labelColor
  // 4. 工具色 -> calibrationColor / separatorColor / timeMarkerLineColor
  // 5. 工具文本色 -> metricColor / timeMarkerTextColor
  // 之所以单独拆分 timeMarkerLineColor 和 timeMarkerTextColor，
  // 是为了满足设计稿里“工具色”和“工具文本色”分离配置的要求。
  return {
    backgroundColor,
    gridRenderPreset: appearanceSettings.gridRenderPreset,
    waveformColor: appearanceSettings.waveformColor,
    // 网格只暴露一个配置色，渲染层使用同色系深浅差生成大小网格。
    smallGridColor: mixHexColors(backgroundColor, gridColor, 0.28),
    largeGridColor: mixHexColors(backgroundColor, gridColor, 0.5),
    labelColor: appearanceSettings.waveformTextColor,
    calibrationColor: appearanceSettings.toolColor,
    separatorColor: appearanceSettings.toolColor,
    timeMarkerLineColor: appearanceSettings.toolColor,
    metricColor: appearanceSettings.toolTextColor,
    timeMarkerTextColor: appearanceSettings.toolTextColor,
  };
}
