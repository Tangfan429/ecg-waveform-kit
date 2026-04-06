<script setup>
defineOptions({
  name: "DocumentQualityPanel",
});

defineProps({
  validationSummary: {
    type: Object,
    default: () => ({
      errors: [],
      warnings: [],
      checks: [],
    }),
  },
});
</script>

<template>
  <section class="document-quality-panel">
    <header class="document-quality-panel__header">
      <div>
        <p class="document-quality-panel__eyebrow">Quality Check</p>
        <h3 class="document-quality-panel__title">打印前检查</h3>
      </div>
      <div class="document-quality-panel__counts">
        <ElTag type="danger" effect="plain">
          错误 {{ validationSummary.errors.length }}
        </ElTag>
        <ElTag type="warning" effect="plain">
          警告 {{ validationSummary.warnings.length }}
        </ElTag>
      </div>
    </header>

    <div
      v-if="validationSummary.checks.length"
      class="document-quality-panel__checks"
    >
      <article
        v-for="item in validationSummary.checks"
        :key="item.label"
        class="document-quality-panel__check-card"
      >
        <span class="document-quality-panel__check-label">{{ item.label }}</span>
        <strong class="document-quality-panel__check-value">{{ item.value }}</strong>
      </article>
    </div>

    <ElAlert
      v-if="validationSummary.errors.length"
      type="error"
      :closable="false"
      class="document-quality-panel__alert"
    >
      <template #title>
        存在必须修复的问题
      </template>
      <ul class="document-quality-panel__list">
        <li v-for="item in validationSummary.errors" :key="item">{{ item }}</li>
      </ul>
    </ElAlert>

    <ElAlert
      v-if="validationSummary.warnings.length"
      type="warning"
      :closable="false"
      class="document-quality-panel__alert"
    >
      <template #title>
        建议打印前确认以下项
      </template>
      <ul class="document-quality-panel__list">
        <li v-for="item in validationSummary.warnings" :key="item">{{ item }}</li>
      </ul>
    </ElAlert>
  </section>
</template>

<style scoped lang="scss">
.document-quality-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__eyebrow {
    margin: 0;
    color: rgba(53, 98, 236, 0.84);
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

  &__counts {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__checks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
  }

  &__check-card {
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 14px;
    background: rgba(248, 251, 255, 0.96);
  }

  &__check-label {
    display: block;
    color: rgba(15, 23, 42, 0.54);
    font-size: 12px;
  }

  &__check-value {
    display: block;
    margin-top: 6px;
    color: #0f172a;
    font-size: 16px;
  }

  &__alert {
    margin-top: 2px;
  }

  &__list {
    margin: 8px 0 0;
    padding-left: 18px;
    color: rgba(15, 23, 42, 0.76);
    font-size: 13px;
    line-height: 1.6;
  }
}
</style>
