import { computed, reactive, ref, toValue } from "vue";
import {
  normalizeCaseComparePickerRows,
  resolveCaseCompareRowId,
} from "../utils/caseCompare";

export function useDiagnosisCaseComparePicker(recordsSource) {
  const loading = ref(false);
  const rows = ref([]);
  const selectedRowId = ref("");
  const queryForm = reactive({
    patientCode: "",
    visitNo: "",
    patientName: "",
    checkDate: [],
  });

  const selectedRow = computed(
    () =>
      rows.value.find(
        (row) => resolveCaseCompareRowId(row) === selectedRowId.value,
      ) || null,
  );

  const resetQueryForm = ({ selectedCaseId = "" } = {}) => {
    rows.value = [];
    selectedRowId.value = String(selectedCaseId ?? "").trim();
    queryForm.patientCode = "";
    queryForm.visitNo = "";
    queryForm.patientName = "";
    queryForm.checkDate = [];
  };

  const queryRows = ({ excludeCaseId = "" } = {}) => {
    loading.value = true;

    try {
      rows.value = normalizeCaseComparePickerRows(toValue(recordsSource), {
        excludeCaseId,
        queryForm,
      });

      const hasSelectedRow = rows.value.some(
        (row) => resolveCaseCompareRowId(row) === selectedRowId.value,
      );

      if (!hasSelectedRow) {
        selectedRowId.value = "";
      }

      return rows.value;
    } finally {
      loading.value = false;
    }
  };

  const selectRow = (row) => {
    selectedRowId.value = resolveCaseCompareRowId(row);
  };

  return {
    loading,
    queryForm,
    rows,
    selectedRow,
    resetQueryForm,
    queryRows,
    selectRow,
  };
}
