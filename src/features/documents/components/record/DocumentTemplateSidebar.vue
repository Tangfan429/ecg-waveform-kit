<script setup>
defineOptions({
  name: "DocumentTemplateSidebar",
});

defineProps({
  templates: {
    type: Array,
    default: () => [],
  },
  activeTemplateId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["select-template"]);
</script>

<template>
  <aside class="document-template-sidebar">
    <div class="document-template-sidebar__header">
      <p class="document-template-sidebar__eyebrow">Document Catalog</p>
      <h3 class="document-template-sidebar__title">医院文书模板</h3>
      <p class="document-template-sidebar__summary">
        模板和打印样式一一对应。叙述型文书走段落分页，麻醉记录单走表单与趋势图版式。
      </p>
    </div>

    <button
      v-for="template in templates"
      :key="template.id"
      type="button"
      class="document-template-sidebar__card"
      :class="{
        'document-template-sidebar__card--active': activeTemplateId === template.id,
      }"
      @click="emit('select-template', template.id)"
    >
      <div class="document-template-sidebar__card-head">
        <strong class="document-template-sidebar__card-title">
          {{ template.title }}
        </strong>
        <ElTag
          size="small"
          :type="template.kind === 'anesthesiaSheet' ? 'warning' : template.tone === 'green' ? 'success' : 'primary'"
          effect="plain"
        >
          {{ template.kind === "anesthesiaSheet" ? "图表型" : "叙述型" }}
        </ElTag>
      </div>

      <div class="document-template-sidebar__meta">
        <span>{{ template.shortTitle }}</span>
        <span>{{ template.documentCode }}</span>
      </div>

      <p class="document-template-sidebar__card-summary">
        {{ template.summary }}
      </p>
    </button>
  </aside>
</template>

<style scoped lang="scss">
.document-template-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);

  &__header {
    padding-bottom: 4px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(53, 98, 236, 0.82);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  &__title {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 20px;
  }

  &__summary {
    margin: 10px 0 0;
    color: rgba(15, 23, 42, 0.6);
    font-size: 13px;
    line-height: 1.6;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 18px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(249, 251, 255, 0.96) 0%, rgba(255, 255, 255, 0.96) 100%);
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(53, 98, 236, 0.22);
      box-shadow: 0 14px 32px rgba(53, 98, 236, 0.12);
    }

    &--active {
      border-color: rgba(53, 98, 236, 0.26);
      background: linear-gradient(180deg, rgba(238, 244, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
      box-shadow: 0 18px 36px rgba(53, 98, 236, 0.16);
    }
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__card-title {
    color: #0f172a;
    font-size: 16px;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: rgba(15, 23, 42, 0.52);
    font-size: 12px;
  }

  &__card-summary {
    margin: 0;
    color: rgba(15, 23, 42, 0.66);
    font-size: 13px;
    line-height: 1.6;
  }
}
</style>
