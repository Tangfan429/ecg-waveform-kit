<script setup>
import { computed } from "vue";
import { getBodyTagMeta } from "../data/bodySiteDictionary";

defineOptions({
  name: "BodySymptomTemplatePanel",
});

const props = defineProps({
  activeTemplateId: {
    type: String,
    default: "",
  },
  activeSiteCode: {
    type: String,
    default: "",
  },
  selectedCount: {
    type: Number,
    default: 0,
  },
  templates: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "apply-template-to-active",
  "apply-template-to-all",
  "select-template",
]);

const resolvedTemplates = computed(() =>
  props.templates.map((template) => ({
    ...template,
    accent: getBodyTagMeta(template.tags?.[0] || "other"),
  })),
);
</script>

<template>
  <section class="body-symptom-template-panel">
    <header class="body-symptom-template-panel__header">
      <div>
        <p class="body-symptom-template-panel__eyebrow">Symptom Templates</p>
        <h3 class="body-symptom-template-panel__title">症状类型模板</h3>
      </div>
      <ElTag type="warning" effect="plain">
        新选部位自动套用
      </ElTag>
    </header>

    <div class="body-symptom-template-panel__grid">
      <button
        v-for="template in resolvedTemplates"
        :key="template.id"
        type="button"
        class="body-symptom-template-panel__card"
        :class="{
          'body-symptom-template-panel__card--active': activeTemplateId === template.id,
        }"
        @click="emit('select-template', template.id)"
      >
        <div class="body-symptom-template-panel__card-head">
          <strong class="body-symptom-template-panel__card-title">
            {{ template.label }}
          </strong>
          <ElTag
            size="small"
            effect="plain"
            :style="{
              borderColor: template.accent.stroke,
              color: template.accent.stroke,
            }"
          >
            {{ template.accent.label }}
          </ElTag>
        </div>

        <p class="body-symptom-template-panel__card-copy">
          {{ template.description }}
        </p>

        <div class="body-symptom-template-panel__card-meta">
          <span>默认强度 {{ template.severity }}/5</span>
          <span>{{ template.note }}</span>
        </div>
      </button>
    </div>

    <div class="body-symptom-template-panel__actions">
      <ElButton
        size="small"
        :disabled="!activeSiteCode"
        @click="emit('apply-template-to-active')"
      >
        套用到焦点部位
      </ElButton>
      <ElButton
        size="small"
        :disabled="!selectedCount"
        @click="emit('apply-template-to-all')"
      >
        套用到全部已选部位
      </ElButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.body-symptom-template-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.14);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(147, 51, 234, 0.78);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 18px;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(99, 102, 241, 0.2);
      box-shadow: 0 14px 28px rgba(99, 102, 241, 0.08);
    }

    &--active {
      border-color: rgba(79, 70, 229, 0.28);
      box-shadow: 0 16px 28px rgba(79, 70, 229, 0.12);
      background: linear-gradient(180deg, rgba(238, 242, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
    }
  }

  &__card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  &__card-title {
    color: #0f172a;
    font-size: 15px;
  }

  &__card-copy {
    margin: 0;
    color: rgba(51, 65, 85, 0.72);
    font-size: 13px;
    line-height: 1.7;
  }

  &__card-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: rgba(100, 116, 139, 0.88);
    font-size: 12px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
}

@media (max-width: 1200px) {
  .body-symptom-template-panel {
    &__grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
