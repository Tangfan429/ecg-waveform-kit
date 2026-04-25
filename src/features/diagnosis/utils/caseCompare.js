import { demoStandardEcg, demoStandardPrintMeta } from "../../../lib/demo/demoData";

const DIAGNOSIS_RESULT_KEYS = Object.freeze([
  "diagnosisResult",
  "diagnoseResult",
  "diagnoseResultText",
]);

const FEATURE_DESCRIPTION_KEYS = Object.freeze([
  "featureDescription",
  "diagnosisDetail",
  "diagnoseDetail",
  "featureDesc",
  "description",
]);

const SEX_TEXT_MAP = Object.freeze({
  男: "男",
  女: "女",
  male: "男",
  female: "女",
  man: "男",
  woman: "女",
  "0": "男",
  "1": "女",
});

export const CASE_COMPARE_LAYOUT_OPTIONS = Object.freeze([
  { label: "12x1", value: "12x1" },
  { label: "3x4", value: "3x4" },
  { label: "6x2", value: "6x2" },
  { label: "3x4+1R", value: "3x4+1R" },
  { label: "3x4+3R", value: "3x4+3R" },
  { label: "6x2+1R", value: "6x2+1R" },
  { label: "6x1", value: "6x1" },
]);

export const CASE_COMPARE_MEASUREMENT_ITEMS = Object.freeze([
  {
    key: "hr",
    label: "HR(bpm)",
    fields: ["hr"],
  },
  {
    key: "p",
    label: "P(ms)",
    fields: ["p"],
  },
  {
    key: "pr",
    label: "PR(ms)",
    fields: ["pr"],
  },
  {
    key: "qrs",
    label: "QRS(ms)",
    fields: ["qrs"],
  },
  {
    key: "qtqtc",
    label: "QT/QTc(ms)",
    fields: ["qt", "qtc"],
  },
  {
    key: "axis",
    label: "P/QRS/T(deg.)",
    fields: ["pAxis", "qrsAxis", "tAxis"],
  },
  {
    key: "rv5sv1",
    label: "RV5/SV1(mV)",
    fields: ["rv5", "sv1"],
  },
  {
    key: "rv5sv1sum",
    label: "RV5+SV1(mV)",
    fields: ["rv5sv1Sum"],
  },
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeFallbackText(value, fallback = "--") {
  const normalizedValue = normalizeText(value);
  return normalizedValue || fallback;
}

function parseTimestamp(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return 0;
  }

  const parsedValue = Date.parse(normalizedValue.replace(/-/g, "/"));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function resolveSexText(rawDetail = {}, fallback = "") {
  const candidates = [
    rawDetail.sexName,
    rawDetail.genderName,
    rawDetail.patientGender,
    rawDetail.patientSex,
    rawDetail.gender,
    rawDetail.sex,
    fallback,
  ];

  for (const candidate of candidates) {
    const normalizedValue = normalizeText(candidate);
    if (!normalizedValue) {
      continue;
    }

    return SEX_TEXT_MAP[normalizedValue.toLowerCase()] || normalizedValue;
  }

  return "--";
}

function resolveAgeText(rawDetail = {}, fallback = "") {
  const ageDisplay = normalizeText(fallback || rawDetail.ageDisplay);
  if (ageDisplay) {
    return ageDisplay;
  }

  const patientAge = normalizeText(rawDetail.patientAge);
  if (patientAge) {
    return patientAge;
  }

  const numericAge = normalizeText(rawDetail.age);
  if (numericAge) {
    return `${numericAge}岁`;
  }

  return "--";
}

function pickFirstDefinedValue(source = {}, keys = [], fallback = "") {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }

  return fallback;
}

function cloneWaveformData(waveformData = {}) {
  return Object.fromEntries(
    Object.entries(waveformData).map(([leadName, points]) => [
      leadName,
      Array.isArray(points) ? points.map((point) => Number(point) || 0) : [],
    ]),
  );
}

function cloneMeasurementData(measurementData = {}) {
  return JSON.parse(JSON.stringify(measurementData || {}));
}

function hasWaveformData(waveformData = {}) {
  return Object.values(waveformData).some(
    (points) => Array.isArray(points) && points.length > 1,
  );
}

function createMetricRows() {
  return {
    showHeartRate: true,
    showRrInterval: true,
    heartRate: [],
    rrInterval: [],
  };
}

function buildVariantWaveformData(
  baseWaveformData = {},
  { leadAdjustments = {}, rippleFrequency = 40 } = {},
) {
  return Object.fromEntries(
    Object.entries(baseWaveformData).map(([leadName, points]) => {
      const adjustment = leadAdjustments[leadName] || {};
      const amplitudeScale = Number(adjustment.amplitudeScale ?? 1);
      const baselineShift = Number(adjustment.baselineShift ?? 0);
      const rippleScale = Number(adjustment.rippleScale ?? 0);

      return [
        leadName,
        points.map((point, index) =>
          Number(
            (
              point * amplitudeScale +
              baselineShift +
              Math.sin(index / rippleFrequency) * rippleScale
            ).toFixed(6),
          ),
        ),
      ];
    }),
  );
}

function createVariantWaveformViewModel(
  baseViewModel,
  {
    measurementPatch = {},
    leadAdjustments = {},
  } = {},
) {
  const waveformData = buildVariantWaveformData(baseViewModel.waveformData, {
    leadAdjustments,
  });

  return {
    waveformData,
    leadDisplayNames: { ...(baseViewModel.leadDisplayNames || {}) },
    measurementData: {
      ...cloneMeasurementData(baseViewModel.measurementData),
      ...measurementPatch,
    },
    metricRows: createMetricRows(),
    sampleRate: Number(baseViewModel.sampleRate || 0),
    duration: Number(baseViewModel.duration || 0),
  };
}

export const resolveCaseCompareRowId = (row = {}) =>
  normalizeText(row?.caseId ?? row?.id);

export function sortCaseCompareRecords(records = []) {
  return [...records]
    .filter((record) => resolveCaseCompareRowId(record))
    .sort((left, right) => {
      const timeDiff = parseTimestamp(right?.checkTime) - parseTimestamp(left?.checkTime);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return resolveCaseCompareRowId(right).localeCompare(resolveCaseCompareRowId(left));
    });
}

export function resolveDefaultCompareCaseId(currentCaseId, records = []) {
  const normalizedCurrentCaseId = normalizeText(currentCaseId);
  const nextCompareRecord = sortCaseCompareRecords(records).find(
    (record) => resolveCaseCompareRowId(record) !== normalizedCurrentCaseId,
  );
  return nextCompareRecord?.caseId ?? nextCompareRecord?.id ?? "";
}

export function formatCaseCompareMetricValue(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  if (Number.isInteger(numericValue)) {
    return `${numericValue}`;
  }

  return numericValue.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
}

export function createCaseComparePanelModel({
  caseId = "",
  patientInfo = {},
  diagnosisDetail = {},
  diagnosisResultOverride = "",
  featureDescriptionOverride = "",
  waveformViewModel = {},
} = {}) {
  const rawDetail = diagnosisDetail || {};
  const normalizedCaseId = normalizeText(caseId || rawDetail?.caseId);
  const waveformData = waveformViewModel?.waveformData || null;

  return {
    caseId: normalizedCaseId,
    patientName: normalizeFallbackText(
      patientInfo?.patientName ?? rawDetail?.patientName,
    ),
    sexName: resolveSexText(rawDetail, patientInfo?.sexName),
    ageDisplay: resolveAgeText(rawDetail, patientInfo?.ageDisplay),
    examTime: normalizeFallbackText(
      rawDetail?.examTime ??
        rawDetail?.checkTime ??
        rawDetail?.diagnosisTime ??
        rawDetail?.reviewTime,
    ),
    diagnosisDescription: normalizeFallbackText(
      featureDescriptionOverride ||
        rawDetail?.featureDescription ||
        pickFirstDefinedValue(rawDetail, FEATURE_DESCRIPTION_KEYS, ""),
    ),
    diagnosisResult: normalizeFallbackText(
      diagnosisResultOverride ||
        rawDetail?.diagnosisResult ||
        pickFirstDefinedValue(rawDetail, DIAGNOSIS_RESULT_KEYS, ""),
    ),
    measurementData: waveformViewModel?.measurementData || {},
    waveformData,
    leadDisplayNames: waveformViewModel?.leadDisplayNames || {},
    sampleRate: Number(waveformViewModel?.sampleRate || 0),
    metricRows: waveformViewModel?.metricRows || createMetricRows(),
    hasWaveformData: hasWaveformData(waveformData),
  };
}

export function normalizeCaseComparePickerRows(
  records = [],
  { excludeCaseId = "", queryForm = {} } = {},
) {
  const normalizedExcludeCaseId = normalizeText(excludeCaseId);
  const patientCode = normalizeText(queryForm?.patientCode);
  const visitNo = normalizeText(queryForm?.visitNo);
  const patientName = normalizeText(queryForm?.patientName);
  const checkDate = Array.isArray(queryForm?.checkDate) ? queryForm.checkDate : [];
  const checkTimeStart = normalizeText(checkDate[0]);
  const checkTimeEnd = normalizeText(checkDate[1]);

  return sortCaseCompareRecords(records).filter((record) => {
    const rowId = resolveCaseCompareRowId(record);
    if (!rowId || rowId === normalizedExcludeCaseId) {
      return false;
    }

    if (patientCode && !normalizeText(record.patientCode).includes(patientCode)) {
      return false;
    }

    if (visitNo && !normalizeText(record.visitNo).includes(visitNo)) {
      return false;
    }

    if (patientName && !normalizeText(record.patientName).includes(patientName)) {
      return false;
    }

    if (checkTimeStart && checkTimeEnd) {
      const recordDate = normalizeText(record.checkTime).slice(0, 10);
      if (recordDate < checkTimeStart || recordDate > checkTimeEnd) {
        return false;
      }
    }

    return true;
  });
}

const STATIC_HISTORY_CASES = Object.freeze(
  [
    {
      caseId: "WF-20260321-014",
      patientCode: "ZH20260321014",
      visitNo: "MZ20260321014",
      patientName: "演示患者",
      patientGender: "男",
      ageDisplay: "42岁",
      examDeptName: "心电中心",
      checkTime: "2026-03-21 09:15:00",
      diagnoseDoctorName: "李医生",
      diagnoseTime: "2026-03-21 09:28:00",
      diagnoseResult: "窦性心律，前壁导联 T 波低平。",
      reviewerName: "王主任",
      reviewTime: "2026-03-21 09:46:00",
      featureDescription: "V2-V4 导联 T 波较当前病例更低平，胸前导联振幅略低。",
      waveformViewModel: createVariantWaveformViewModel(demoStandardEcg, {
        measurementPatch: {
          hr: 72,
          p: 120,
          pr: 181,
          qrs: 84,
          qt: 392,
          qtc: 423,
          rv5: 1.402,
          sv1: 0.968,
          rv5sv1Sum: 2.37,
        },
        leadAdjustments: {
          II: { amplitudeScale: 0.96, rippleScale: 0.006 },
          V2: { amplitudeScale: 0.92, baselineShift: -0.01 },
          V3: { amplitudeScale: 0.91, baselineShift: -0.012 },
          V4: { amplitudeScale: 0.95, rippleScale: 0.008 },
        },
      }),
    },
    {
      caseId: "WF-20260319-009",
      patientCode: "ZH20260319009",
      visitNo: "ZY20260319009",
      patientName: "演示患者",
      patientGender: "男",
      ageDisplay: "42岁",
      examDeptName: "心电中心",
      checkTime: "2026-03-19 14:05:00",
      diagnoseDoctorName: "陈医生",
      diagnoseTime: "2026-03-19 14:18:00",
      diagnoseResult: "窦性心律，轻度左室高电压表现。",
      reviewerName: "周主任",
      reviewTime: "2026-03-19 14:42:00",
      featureDescription: "V5-V6 导联 R 波振幅较高，胸导联整体电压高于当前病例。",
      waveformViewModel: createVariantWaveformViewModel(demoStandardEcg, {
        measurementPatch: {
          hr: 68,
          p: 118,
          pr: 175,
          qrs: 80,
          qt: 387,
          qtc: 412,
          rv5: 1.768,
          sv1: 0.945,
          rv5sv1Sum: 2.713,
        },
        leadAdjustments: {
          II: { amplitudeScale: 1.02, rippleScale: 0.004 },
          V5: { amplitudeScale: 1.18, rippleScale: 0.005 },
          V6: { amplitudeScale: 1.14, rippleScale: 0.004 },
        },
      }),
    },
    {
      caseId: "WF-20260315-003",
      patientCode: "ZH20260315003",
      visitNo: "MZ20260315003",
      patientName: "赵敏",
      patientGender: "女",
      ageDisplay: "39岁",
      examDeptName: "门诊心电室",
      checkTime: "2026-03-15 10:20:00",
      diagnoseDoctorName: "王医生",
      diagnoseTime: "2026-03-15 10:34:00",
      diagnoseResult: "窦性心律，胸前导联轻度 ST-T 改变。",
      reviewerName: "林主任",
      reviewTime: "2026-03-15 10:51:00",
      featureDescription: "V3-V5 导联 ST 段轻度下移，T 波较平坦，QRS 时限略宽。",
      waveformViewModel: createVariantWaveformViewModel(demoStandardEcg, {
        measurementPatch: {
          hr: 78,
          p: 126,
          pr: 184,
          qrs: 88,
          qt: 401,
          qtc: 438,
          rv5: 1.311,
          sv1: 1.024,
          rv5sv1Sum: 2.335,
        },
        leadAdjustments: {
          II: { amplitudeScale: 0.94, baselineShift: -0.008 },
          V3: { amplitudeScale: 0.9, baselineShift: -0.014, rippleScale: 0.008 },
          V4: { amplitudeScale: 0.92, baselineShift: -0.016, rippleScale: 0.009 },
          V5: { amplitudeScale: 0.95, baselineShift: -0.012, rippleScale: 0.007 },
        },
      }),
    },
  ].map((record) => ({
    ...record,
    waveformViewModel: {
      ...record.waveformViewModel,
      leadDisplayNames: { ...(record.waveformViewModel.leadDisplayNames || {}) },
      metricRows: record.waveformViewModel.metricRows || createMetricRows(),
    },
  })),
);

export function createStaticCaseCompareHistoryRecords() {
  return STATIC_HISTORY_CASES.map((record) => ({
    ...record,
    waveformViewModel: {
      ...record.waveformViewModel,
      waveformData: cloneWaveformData(record.waveformViewModel.waveformData),
      measurementData: cloneMeasurementData(record.waveformViewModel.measurementData),
      leadDisplayNames: { ...(record.waveformViewModel.leadDisplayNames || {}) },
      metricRows: createMetricRows(),
    },
  }));
}

export function createCurrentCasePanelModel({
  caseId = "",
  standardPrintMeta = {},
  waveformViewModel = {},
} = {}) {
  return createCaseComparePanelModel({
    caseId: caseId || standardPrintMeta.registrationNo || standardPrintMeta.patientNo,
    patientInfo: {
      patientName: standardPrintMeta.patientName,
      sexName: standardPrintMeta.gender,
      ageDisplay: standardPrintMeta.age ? `${standardPrintMeta.age}岁` : "",
    },
    diagnosisDetail: {
      examTime: standardPrintMeta.examTime,
      diagnosisResult: standardPrintMeta.diagnosisResult,
      featureDescription: standardPrintMeta.examItem,
    },
    diagnosisResultOverride: standardPrintMeta.diagnosisResult,
    featureDescriptionOverride: standardPrintMeta.examItem,
    waveformViewModel,
  });
}
