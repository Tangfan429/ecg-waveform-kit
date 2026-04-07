<script setup>
import { computed } from "vue";

defineOptions({
  name: "BodyMapToolbar",
});

const VIEW_OPTIONS = Object.freeze([
  { value: "front", label: "正面", shortLabel: "Front" },
  { value: "back", label: "背面", shortLabel: "Back" },
  { value: "left", label: "左侧", shortLabel: "Left" },
  { value: "right", label: "右侧", shortLabel: "Right" },
]);

const props = defineProps({
  canZoomIn: {
    type: Boolean,
    default: true,
  },
  canZoomOut: {
    type: Boolean,
    default: true,
  },
  isFitZoom: {
    type: Boolean,
    default: false,
  },
  view: {
    type: String,
    default: "front",
  },
  zoomPercent: {
    type: Number,
    default: 100,
  },
});

const emit = defineEmits([
  "view-change",
  "zoom-fit",
  "zoom-in",
  "zoom-out",
  "zoom-reset",
]);

const zoomLabel = computed(() => `${Math.round(props.zoomPercent)}%`);
</script>

<template>
  <div class="body-map-toolbar">
    <div class="body-map-toolbar__group">
      <span class="body-map-toolbar__group-label">视角</span>
      <div class="body-map-toolbar__button-row">
        <button
          v-for="option in VIEW_OPTIONS"
          :key="option.value"
          type="button"
          class="body-map-toolbar__button"
          :class="{
            'body-map-toolbar__button--active': view === option.value,
          }"
          @click="emit('view-change', option.value)"
        >
          <span class="body-map-toolbar__button-label">{{ option.label }}</span>
          <span class="body-map-toolbar__button-caption">{{ option.shortLabel }}</span>
        </button>
      </div>
    </div>

    <div class="body-map-toolbar__group body-map-toolbar__group--zoom">
      <span class="body-map-toolbar__group-label">缩放</span>
      <div class="body-map-toolbar__button-row">
        <button
          type="button"
          class="body-map-toolbar__button body-map-toolbar__button--compact"
          :class="{ 'body-map-toolbar__button--active': isFitZoom }"
          @click="emit('zoom-fit')"
        >
          适应宽度
        </button>

        <button
          type="button"
          class="body-map-toolbar__button body-map-toolbar__button--compact"
          :class="{ 'body-map-toolbar__button--active': !isFitZoom && zoomLabel === '100%' }"
          @click="emit('zoom-reset')"
        >
          100%
        </button>

        <button
          type="button"
          class="body-map-toolbar__button body-map-toolbar__button--icon"
          :disabled="!canZoomOut"
          @click="emit('zoom-out')"
        >
          -
        </button>

        <span class="body-map-toolbar__zoom-value">{{ zoomLabel }}</span>

        <button
          type="button"
          class="body-map-toolbar__button body-map-toolbar__button--icon"
          :disabled="!canZoomIn"
          @click="emit('zoom-in')"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.body-map-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(249, 251, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);

  &__group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;

    &--zoom {
      align-items: flex-end;
    }
  }

  &__group-label {
    color: rgba(100, 116, 139, 0.86);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  &__button-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 42px;
    padding: 10px 14px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 14px;
    background: rgba(248, 250, 252, 0.92);
    color: rgba(15, 23, 42, 0.78);
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease,
      color 0.2s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(14, 116, 144, 0.24);
      box-shadow: 0 10px 20px rgba(14, 116, 144, 0.08);
    }

    &:disabled {
      opacity: 0.46;
      cursor: not-allowed;
    }

    &--active {
      border-color: rgba(2, 132, 199, 0.28);
      background: linear-gradient(180deg, rgba(224, 242, 254, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
      color: #0f172a;
      box-shadow: 0 14px 24px rgba(2, 132, 199, 0.12);
    }

    &--compact {
      min-height: 38px;
      padding-inline: 12px;
      font-size: 13px;
      font-weight: 600;
    }

    &--icon {
      min-width: 38px;
      min-height: 38px;
      padding: 0;
      font-size: 20px;
      line-height: 1;
    }
  }

  &__button-label {
    font-size: 14px;
    font-weight: 700;
  }

  &__button-caption {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__zoom-value {
    min-width: 54px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
  }
}

@media (max-width: 1080px) {
  .body-map-toolbar {
    &__group,
    &__group--zoom {
      width: 100%;
      align-items: flex-start;
    }
  }
}
</style>
