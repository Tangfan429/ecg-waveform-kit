<template>
  <aside class="average-template-panel">
    <div class="average-template-panel__header">
      测量信息({{ lead }})
    </div>

    <el-scrollbar class="average-template-panel__scrollbar">
      <div class="average-template-panel__table">
        <div
          v-for="(row, index) in rows"
          :key="`${row.label}-${index}`"
          class="average-template-panel__row"
        >
          <div class="average-template-panel__label">{{ row.label }}</div>
          <div class="average-template-panel__value">{{ row.value }}</div>
        </div>
      </div>
    </el-scrollbar>
  </aside>
</template>

<script setup>
defineOptions({
  name: "AverageTemplateMeasurementPanel",
});

defineProps({
  lead: {
    type: String,
    default: "II",
  },
  rows: {
    type: Array,
    default: () => [],
  },
});
</script>

<style lang="scss" scoped>
@import "../styles/variables.scss";

.average-template-panel {
  width: 521px;
  flex-shrink: 0;
  padding: $spacing-md $spacing-md 13px;
  background-color: $gray-white;
  border-left: 1px solid $gray-3;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 $spacing-md;
    color: $text-primary;
    font: $font-title-md;
    background: $bg-panel-header;
    border: 1px solid $gray-3;
  }

  &__scrollbar {
    height: calc(100% - 32px);
    border-right: 1px solid $gray-3;
    border-bottom: 1px solid $gray-3;
    border-left: 1px solid $gray-3;
  }

  &__table {
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: flex;
    min-height: 32px;
  }

  &__label,
  &__value {
    display: flex;
    align-items: center;
    min-height: 32px;
    padding: 0 $spacing-md;
    color: $text-primary;
    font: $font-body-md;
    background-color: $gray-white;
    border-bottom: 1px solid $gray-3;
  }

  &__label {
    width: 206px;
    border-right: 1px solid $gray-3;
  }

  &__value {
    flex: 1;
    min-width: 0;
  }
}
</style>
