<template>
  <el-dialog
    v-model="dialogVisible"
    title="测量数据"
    width="min(1180px, 92vw)"
    append-to-body
    class="average-template-measurement-data-dialog"
  >
    <div class="average-template-measurement-data-dialog__table-shell">
      <table class="average-template-measurement-data-dialog__table">
        <thead>
          <tr>
            <th>指标</th>
            <th v-for="column in columns" :key="column.key">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <td>{{ row.label }}</td>
            <td
              v-for="(cell, index) in row.cells"
              :key="`${row.label}-${columns[index]?.key || index}`"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from "vue";

defineOptions({
  name: "AverageTemplateMeasurementDataDialog",
});

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  columns: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue"]);

const dialogVisible = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  },
});
</script>

<style lang="scss" scoped>
.average-template-measurement-data-dialog {
  &__table-shell {
    max-height: min(70vh, 680px);
    overflow: auto;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 16px;
    background: #ffffff;
  }

  &__table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    table-layout: fixed;

    th,
    td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(226, 232, 240, 0.9);
      color: rgba(15, 23, 42, 0.84);
      font-size: 14px;
      line-height: 1.4;
      text-align: left;
      vertical-align: middle;
      background: #ffffff;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      font-weight: 600;
      background: #f8fafc;
    }

    td:first-child,
    th:first-child {
      min-width: 180px;
      font-weight: 600;
      background: #fcfdff;
    }
  }
}
</style>
