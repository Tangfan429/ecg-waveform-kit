// 波形区域右键菜单配置。
// 这里维护的是前端菜单描述，不涉及后端接口或业务落库。

export const WAVEFORM_CONTEXT_MENU_ITEMS = Object.freeze([
  {
    key: "rr-bpm",
    label: "R-R(bpm)",
    type: "toggle",
    stateKey: "showRRBpm",
  },
  {
    key: "rr-ms",
    label: "R-R(ms)",
    type: "toggle",
    stateKey: "showRRMs",
  },
  {
    key: "refilter",
    label: "重新滤波",
    type: "action",
  },
  {
    key: "rename-lead",
    label: "修改导联名称",
    type: "action",
  },
  {
    key: "infant-mode",
    label: "幼儿模式",
    type: "mode",
  },
  {
    key: "s5-mode",
    label: "S5导联模式",
    type: "mode",
  },
  {
    key: "positional-q",
    label: "位置性Q波模式",
    type: "mode",
  },
  {
    key: "brugada-1",
    label: "Brugada(上移一肋间)模式",
    type: "mode",
  },
  {
    key: "brugada-2",
    label: "Brugada(上移两肋间)模式",
    type: "mode",
  },
  {
    key: "right-heart",
    label: "右心模式",
    type: "mode",
  },
  {
    key: "down-1",
    label: "下移一个肋间模式",
    type: "mode",
  },
  {
    key: "down-2",
    label: "下移两个肋间模式",
    type: "mode",
  },
]);

export function createWaveformContextMenuState(overrides = {}) {
  return {
    showRRBpm: overrides.showRRBpm ?? true,
    showRRMs: overrides.showRRMs ?? true,
    activeMode: overrides.activeMode || "",
  };
}

export function getWaveformContextMenuItemLabel(command) {
  return (
    WAVEFORM_CONTEXT_MENU_ITEMS.find((item) => item.key === command)?.label ||
    ""
  );
}
