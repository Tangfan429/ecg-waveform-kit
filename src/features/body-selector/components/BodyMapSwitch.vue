<script setup>
import { BODY_VIEW_OPTIONS } from "../data/bodySiteDictionary";

defineOptions({
  name: "BodyMapSwitch",
});

const currentView = defineModel({
  type: String,
  default: "front",
});
</script>

<template>
  <div class="body-map-switch">
    <button
      v-for="option in BODY_VIEW_OPTIONS"
      :key="option.value"
      type="button"
      class="body-map-switch__button"
      :class="{
        'body-map-switch__button--active': currentView === option.value,
      }"
      @click="currentView = option.value"
    >
      <span class="body-map-switch__label">{{ option.label }}</span>
      <span class="body-map-switch__caption">{{ option.shortLabel }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.body-map-switch {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  &__button {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 14px;
    background: rgba(248, 250, 252, 0.9);
    color: rgba(15, 23, 42, 0.76);
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(37, 99, 235, 0.26);
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.1);
    }

    &--active {
      border-color: rgba(14, 116, 144, 0.34);
      background: linear-gradient(180deg, rgba(230, 247, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
      color: #0f172a;
    }
  }

  &__label {
    font-size: 14px;
    font-weight: 700;
  }

  &__caption {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}
</style>
