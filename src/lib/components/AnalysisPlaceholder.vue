<script setup>
defineOptions({
  name: "AnalysisPlaceholder",
});

defineProps({
  title: {
    type: String,
    default: "分析扩展位",
  },
  description: {
    type: String,
    default: "当前区域预留为公司内部算法分析页面接入口。",
  },
});
</script>

<template>
  <section class="analysis-placeholder">
    <div class="analysis-placeholder__badge">Extension Slot</div>
    <h3 class="analysis-placeholder__title">{{ title }}</h3>
    <p class="analysis-placeholder__description">{{ description }}</p>
  </section>
</template>

<style scoped lang="scss">
.analysis-placeholder {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 14px;
  min-height: 420px;
  padding: 36px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(53, 98, 236, 0.12), transparent 24%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 248, 255, 0.98) 100%);
  border: 1px dashed rgba(53, 98, 236, 0.24);

  &__badge {
    padding: 6px 12px;
    border-radius: 999px;
    color: rgba(53, 98, 236, 0.92);
    background: rgba(53, 98, 236, 0.1);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    font-size: 28px;
  }

  &__description {
    margin: 0;
    max-width: 620px;
    color: rgba(15, 23, 42, 0.62);
    font-size: 15px;
  }
}
</style>
