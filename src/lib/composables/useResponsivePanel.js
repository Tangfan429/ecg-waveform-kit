import { computed, ref, watch } from "vue";
import { useWindowSize } from "@vueuse/core";

const PANEL_DRAWER_BREAKPOINT = 1440;
const PANEL_DRAWER_COMPACT_SIZE = "92vw";
const PANEL_DRAWER_DESKTOP_SIZE = 460;

export function useResponsivePanel() {
  const { width } = useWindowSize();
  const isPanelDrawerMode = computed(
    () => width.value < PANEL_DRAWER_BREAKPOINT,
  );
  const panelDrawerSize = computed(() =>
    width.value < 1200 ? PANEL_DRAWER_COMPACT_SIZE : PANEL_DRAWER_DESKTOP_SIZE,
  );
  const isPanelOpen = ref(false);

  watch(
    isPanelDrawerMode,
    (enabled) => {
      if (!enabled) {
        isPanelOpen.value = false;
      }
    },
    { immediate: true },
  );

  const closePanel = () => {
    isPanelOpen.value = false;
  };

  const togglePanel = () => {
    if (isPanelDrawerMode.value) {
      isPanelOpen.value = !isPanelOpen.value;
    }
  };

  return {
    isPanelDrawerMode,
    panelDrawerSize,
    isPanelOpen,
    closePanel,
    togglePanel,
  };
}

export function useDiagnosisLayout() {
  const panelState = useResponsivePanel();

  return {
    isPanelDrawerMode: panelState.isPanelDrawerMode,
    diagnosisPanelDrawerSize: panelState.panelDrawerSize,
    isDiagnosisPanelOpen: panelState.isPanelOpen,
    closeDiagnosisPanel: panelState.closePanel,
    toggleDiagnosisPanel: panelState.togglePanel,
  };
}

export default useResponsivePanel;