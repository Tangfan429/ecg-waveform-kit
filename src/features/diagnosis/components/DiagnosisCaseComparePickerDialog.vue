<template>
  <el-dialog
    v-model="dialogVisible"
    title="切换对比"
    class="diagnosis-case-compare-picker-dialog"
    :width="dialogWidth"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @open="handleDialogOpen"
  >
    <div class="diagnosis-case-compare-picker-dialog__filters">
      <el-input
        v-model="queryForm.patientCode"
        class="diagnosis-case-compare-picker-dialog__filter-input"
        placeholder="登记号"
        clearable
        @keyup.enter="handleQuery"
      />
      <el-input
        v-model="queryForm.visitNo"
        class="diagnosis-case-compare-picker-dialog__filter-input"
        placeholder="就诊号"
        clearable
        @keyup.enter="handleQuery"
      />
      <el-input
        v-model="queryForm.patientName"
        class="diagnosis-case-compare-picker-dialog__filter-input"
        placeholder="姓名"
        clearable
        @keyup.enter="handleQuery"
      />
      <el-date-picker
        v-model="queryForm.checkDate"
        class="diagnosis-case-compare-picker-dialog__filter-date"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        range-separator="-"
        unlink-panels
      />
      <el-button type="primary" @click="handleQuery">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <div class="diagnosis-case-compare-picker-dialog__table-shell">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="rows"
        height="100%"
        table-layout="fixed"
        highlight-current-row
        empty-text="暂无可对比病例"
        @current-change="handleCurrentChange"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDoubleClick"
      >
        <el-table-column label="序号" width="72" align="center">
          <template #default="{ $index }">
            {{ $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column
          prop="patientName"
          label="姓名"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column label="性别" width="88" align="center">
          <template #default="{ row }">
            {{ row?.patientGender || row?.patientSex || "--" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="examDeptName"
          label="检查科室"
          width="128"
          show-overflow-tooltip
        />
        <el-table-column
          prop="checkTime"
          label="检查时间"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column label="诊断医生" width="136" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row?.diagnoseDoctorName || "--" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="diagnoseTime"
          label="诊断时间"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column label="诊断结果" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row?.diagnoseResult || "--" }}
          </template>
        </el-table-column>
        <el-table-column label="审核医生" width="136" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row?.reviewerName || "--" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="reviewTime"
          label="审核时间"
          width="180"
          show-overflow-tooltip
        />
      </el-table>
    </div>

    <template #footer>
      <div class="diagnosis-case-compare-picker-dialog__footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { ElMessage } from "element-plus";
import { useDiagnosisCaseComparePicker } from "../composables/useDiagnosisCaseComparePicker";

defineOptions({
  name: "DiagnosisCaseComparePickerDialog",
});

const dialogWidth = "min(1380px, calc(100vw - 48px))";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  records: {
    type: Array,
    default: () => [],
  },
  excludeCaseId: {
    type: [String, Number],
    default: "",
  },
  selectedCaseId: {
    type: [String, Number],
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "confirm"]);

const tableRef = ref(null);
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const {
  loading,
  queryForm,
  rows,
  selectedRow,
  resetQueryForm,
  queryRows,
  selectRow,
} = useDiagnosisCaseComparePicker(computed(() => props.records));

function syncCurrentRow() {
  nextTick(() => {
    tableRef.value?.setCurrentRow(selectedRow.value);
  });
}

function fetchRows() {
  queryRows({
    excludeCaseId: props.excludeCaseId,
  });
  syncCurrentRow();
}

function handleDialogOpen() {
  resetQueryForm({
    selectedCaseId: props.selectedCaseId,
  });
  fetchRows();
}

function handleCurrentChange(row) {
  selectRow(row);
}

function handleRowClick(row) {
  tableRef.value?.setCurrentRow(row);
  selectRow(row);
}

function handleQuery() {
  fetchRows();
}

function handleReset() {
  resetQueryForm({
    selectedCaseId: props.selectedCaseId,
  });
  fetchRows();
}

function emitConfirmSelection() {
  if (!selectedRow.value) {
    ElMessage.warning("请选择对比病例");
    return;
  }

  emit("confirm", selectedRow.value);
  dialogVisible.value = false;
}

function handleRowDoubleClick(row) {
  selectRow(row);
  emitConfirmSelection();
}

function handleConfirm() {
  emitConfirmSelection();
}
</script>

<style lang="scss" scoped>
@import "../../../lib/styles/variables.scss";

.diagnosis-case-compare-picker-dialog {
  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  &__filter-input {
    width: 170px;
  }

  &__filter-date {
    width: 300px;
  }

  &__table-shell {
    height: min(62vh, 720px);
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
  }
}

@media (max-width: 1023px) {
  .diagnosis-case-compare-picker-dialog {
    &__filter-input,
    &__filter-date {
      width: 100%;
    }
  }
}
</style>
