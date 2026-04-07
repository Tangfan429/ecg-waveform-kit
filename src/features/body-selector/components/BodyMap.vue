<script setup>
import { computed, ref, shallowRef, useTemplateRef, watch, watchPostEffect } from "vue";
import BodyMapToolbar from "./BodyMapToolbar.vue";
import BodyBackView from "./views/BodyBackView.vue";
import BodyFrontView from "./views/BodyFrontView.vue";
import BodyLeftView from "./views/BodyLeftView.vue";
import BodyRightView from "./views/BodyRightView.vue";
import { useBodyMapViewport } from "../composables/useBodyMapViewport";
import { resolveBodySiteLabels } from "../data/bodySiteDictionary";
import { resolvePreferredBodyView } from "../data/bodySiteViewMap";

defineOptions({
  name: "BodyMap",
});

const props = defineProps({
  markers: {
    type: Array,
    default: () => [],
  },
  activeSiteCode: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle-site", "view-change"]);

const wrapperRef = useTemplateRef("wrapper");
const viewportRef = useTemplateRef("viewport");
const currentView = ref("front");
const tooltipStyle = ref({
  left: "0px",
  top: "0px",
  display: "none",
});
const hoveredSiteCodes = ref([]);
const isChoosingAmbiguousSite = ref(false);

const viewComponents = shallowRef({
  front: BodyFrontView,
  back: BodyBackView,
  left: BodyLeftView,
  right: BodyRightView,
});

const {
  activateFitZoom,
  canZoomIn,
  canZoomOut,
  panOffset,
  resetToActualSize,
  scale,
  viewportHeight,
  zoomIn,
  zoomMode,
  zoomOut,
  zoomPercent,
} = useBodyMapViewport({
  viewportRef,
  activeView: currentView,
});

const defaultRegionStyle = Object.freeze({
  fill: "rgb(236, 234, 234)",
  stroke: "#D9D9D9",
  fillOpacity: "0.1",
});

const isFitZoom = computed(() => zoomMode.value === "fit");
const viewportStyle = computed(() => ({
  height: `${viewportHeight.value}px`,
}));
// Keep pan/zoom outside the SVG so hotspot geometry and marker lookup stay unchanged.
const stageStyle = computed(() => ({
  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale.value})`,
}));

const setRegionStyle = (siteCode, marker) => {
  const figureRoot = wrapperRef.value?.querySelector(".body-map__figure");
  const regionElement = figureRoot?.querySelector(`.${siteCode}`);

  if (!regionElement) {
    return;
  }

  regionElement.style.fill = marker.fill || defaultRegionStyle.fill;
  regionElement.style.stroke = marker.stroke || defaultRegionStyle.stroke;
  regionElement.style.fillOpacity = String(
    marker.opacity ?? defaultRegionStyle.fillOpacity,
  );
};

const resetRegionStyle = () => {
  const figureRoot = wrapperRef.value?.querySelector(".body-map__figure");
  const interactiveRegions = figureRoot?.querySelectorAll(".cursor-pointer") || [];

  interactiveRegions.forEach((regionElement) => {
    regionElement.style.fill = defaultRegionStyle.fill;
    regionElement.style.stroke = defaultRegionStyle.stroke;
    regionElement.style.fillOpacity = defaultRegionStyle.fillOpacity;
  });
};

const hideTooltip = () => {
  tooltipStyle.value.display = "none";
  hoveredSiteCodes.value = [];
  isChoosingAmbiguousSite.value = false;
};

const resolveSiteCodes = (target) =>
  [...(target?.classList || [])].filter((className) => className !== "cursor-pointer");

const resolveInteractiveSiteCodes = (target) => {
  if (!target?.classList?.contains("cursor-pointer")) {
    return [];
  }

  return resolveSiteCodes(target);
};

const positionTooltip = (target) => {
  const targetRect = target.getBoundingClientRect();
  tooltipStyle.value.left = `${targetRect.right + 12}px`;
  tooltipStyle.value.top = `${targetRect.top + targetRect.height / 2}px`;
  tooltipStyle.value.display = "block";
};

const handleViewportPointerDown = (event) => {
  hideTooltip();
};

const handleFigurePointerMove = (event) => {
  if (isChoosingAmbiguousSite.value) {
    return;
  }

  const target = event.target;
  if (!target?.classList?.contains("cursor-pointer")) {
    hideTooltip();
    return;
  }

  const siteCodes = resolveInteractiveSiteCodes(target);
  if (!siteCodes.length) {
    hideTooltip();
    return;
  }

  hoveredSiteCodes.value = siteCodes;
  positionTooltip(target);
};

const handleFigureLeave = () => {
  if (!isChoosingAmbiguousSite.value) {
    hideTooltip();
  }
};

const emitSiteToggle = (siteCode) => {
  emit("toggle-site", siteCode);
  hideTooltip();
};

const handleFigureClick = (event) => {
  if (props.disabled) {
    return;
  }

  const siteCodes = resolveInteractiveSiteCodes(event?.target);
  if (!siteCodes.length) {
    return;
  }

  // Some hotspots map to multiple regions and need one more confirmation.
  if (siteCodes.length > 1) {
    hoveredSiteCodes.value = siteCodes;
    positionTooltip(event.target);
    isChoosingAmbiguousSite.value = true;
    return;
  }

  emitSiteToggle(siteCodes[0]);
};

watch(currentView, (nextView) => {
  emit("view-change", nextView);
  hideTooltip();
});

watch(
  () => props.activeSiteCode,
  (nextSiteCode) => {
    const preferredView = resolvePreferredBodyView(
      nextSiteCode,
      currentView.value,
    );

    if (preferredView !== currentView.value) {
      currentView.value = preferredView;
    }
  },
  { immediate: true },
);

watchPostEffect(() => {
  currentView.value;
  props.markers;

  resetRegionStyle();
  props.markers.forEach((marker) => {
    if (marker?.siteCode) {
      setRegionStyle(marker.siteCode, marker);
    }
  });
});
</script>

<template>
  <section ref="wrapper" class="body-map">
    <div class="body-map__canvas">
      <BodyMapToolbar
        :view="currentView"
        :zoom-percent="zoomPercent"
        :is-fit-zoom="isFitZoom"
        :can-zoom-in="canZoomIn"
        :can-zoom-out="canZoomOut"
        @view-change="currentView = $event"
        @zoom-fit="activateFitZoom"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @zoom-reset="resetToActualSize"
      />

      <div
        class="body-map__figure-shell"
        :class="{ 'body-map__figure-shell--disabled': disabled }"
      >
        <div
          ref="viewport"
          class="body-map__viewport"
          :style="viewportStyle"
          @pointerdown="handleViewportPointerDown"
        >
          <div class="body-map__stage" :style="stageStyle">
            <component
              :is="viewComponents[currentView]"
              class="body-map__figure"
              @mousemove="handleFigurePointerMove"
              @mouseleave="handleFigureLeave"
              @click.stop="handleFigureClick"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="body-map__tooltip" :style="tooltipStyle">
      <div class="body-map__tooltip-card">
        <template v-if="isChoosingAmbiguousSite">
          <p class="body-map__tooltip-title">请选择具体部位</p>
          <div class="body-map__tooltip-options">
            <button
              v-for="item in resolveBodySiteLabels(hoveredSiteCodes)"
              :key="item.siteCode"
              type="button"
              class="body-map__tooltip-option"
              @click.stop="emitSiteToggle(item.siteCode)"
            >
              {{ item.label }}
            </button>
          </div>
        </template>
        <template v-else>
          <p
            v-for="item in resolveBodySiteLabels(hoveredSiteCodes)"
            :key="item.siteCode"
            class="body-map__tooltip-line"
          >
            {{ item.label }}
          </p>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.body-map {
  position: relative;

  &__canvas {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__figure-shell {
    padding: 18px;
    border-radius: 28px;
    background:
      radial-gradient(circle at top, rgba(191, 233, 255, 0.34) 0%, rgba(247, 250, 255, 0) 28%),
      linear-gradient(180deg, rgba(246, 249, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
    border: 1px solid rgba(148, 163, 184, 0.16);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);

    &--disabled {
      opacity: 0.68;
      pointer-events: none;
    }
  }

  &__viewport {
    position: relative;
    overflow: hidden;
    width: 100%;
    border-radius: 22px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.46) 0%, rgba(237, 245, 255, 0.72) 100%);
  }

  &__stage {
    position: absolute;
    inset: 0 auto auto 0;
    width: 460px;
    height: 824px;
    transform-origin: top left;
    will-change: transform;
  }

  &__figure {
    display: block;
    width: 460px;
    height: 824px;
  }

  &__tooltip {
    position: fixed;
    z-index: 3000;
    transform: translateY(-50%);
  }

  &__tooltip-card {
    min-width: 140px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.92);
    color: #f8fafc;
    box-shadow: 0 20px 32px rgba(15, 23, 42, 0.28);
  }

  &__tooltip-title {
    margin: 0 0 8px;
    font-size: 12px;
    color: rgba(226, 232, 240, 0.88);
  }

  &__tooltip-line {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
  }

  &__tooltip-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__tooltip-option {
    padding: 6px 10px;
    border: 1px solid rgba(125, 211, 252, 0.28);
    border-radius: 999px;
    background: rgba(30, 41, 59, 0.72);
    color: #f8fafc;
    cursor: pointer;
  }
}
</style>
