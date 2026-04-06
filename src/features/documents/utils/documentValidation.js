import { isAnesthesiaTemplate } from "../schemas/documentTemplates";

const REQUIRED_NARRATIVE_FIELDS = Object.freeze([
  ["hospitalName", "医院名称"],
  ["patientName", "患者姓名"],
  ["department", "科室"],
  ["visitDate", "日期"],
  ["authorName", "书写医师"],
  ["reviewerName", "审核医师"],
]);

const REQUIRED_ANESTHESIA_FIELDS = Object.freeze([
  ["hospitalName", "医院名称"],
  ["patientName", "患者姓名"],
  ["patientNo", "住院号"],
  ["registrationNo", "手术号"],
  ["operatingRoom", "手术间"],
  ["anesthesiaMethod", "麻醉方式"],
  ["asaGrade", "ASA 分级"],
  ["entryRoomTime", "入室时间"],
  ["anesthesiaStartTime", "麻醉开始"],
  ["anesthesiaEndTime", "麻醉结束"],
  ["exitRoomTime", "出室时间"],
  ["signoffDoctor", "签字麻醉医师"],
  ["reviewerName", "审核医师"],
]);

const METRIC_RANGES = Object.freeze({
  pulse: { min: 30, max: 220, label: "脉搏" },
  systolic: { min: 50, max: 260, label: "收缩压" },
  diastolic: { min: 20, max: 180, label: "舒张压" },
  spo2: { min: 50, max: 100, label: "SpO2" },
  etco2: { min: 0, max: 100, label: "ETCO2" },
  respiration: { min: 4, max: 60, label: "呼吸" },
  temperature: { min: 30, max: 43, label: "体温" },
});

const parseClockMinutes = (value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!/^\d{2}:\d{2}$/u.test(normalizedValue)) {
    return null;
  }

  const [hoursText, minutesText] = normalizedValue.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const collectRequiredFieldErrors = (record, fieldDefs) =>
  fieldDefs
    .filter(([fieldKey]) => !String(record?.[fieldKey] ?? "").trim())
    .map(([_fieldKey, label]) => `${label}未填写`);

const validateMetricRange = (trendPoints, metricKey) => {
  const range = METRIC_RANGES[metricKey];

  return (trendPoints || [])
    .filter((point) => String(point?.[metricKey] ?? "").trim())
    .map((point) => ({
      time: String(point.time || "").trim(),
      value: Number(point[metricKey]),
    }))
    .filter(({ value }) => Number.isFinite(value))
    .filter(({ value }) => value < range.min || value > range.max)
    .map(
      ({ time, value }) =>
        `${range.label}在 ${time || "未标注时间"} 的值 ${value} 超出常规范围`,
    );
};

const countFiveMinuteGaps = (record, trendMap) => {
  const start = parseClockMinutes(record.anesthesiaStartTime);
  const end = parseClockMinutes(record.anesthesiaEndTime);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return {
      missingCount: 0,
      missingSlots: [],
    };
  }

  const missingSlots = [];

  for (let cursor = start; cursor <= end; cursor += 5) {
    const hours = String(Math.floor(cursor / 60)).padStart(2, "0");
    const minutes = String(cursor % 60).padStart(2, "0");
    const slotLabel = `${hours}:${minutes}`;
    const point = trendMap.get(slotLabel);
    const hasPulse = String(point?.pulse ?? "").trim();
    const hasBp =
      String(point?.systolic ?? "").trim() && String(point?.diastolic ?? "").trim();

    if (!hasPulse || !hasBp) {
      missingSlots.push(slotLabel);
    }
  }

  return {
    missingCount: missingSlots.length,
    missingSlots,
  };
};

const validateTimeOrder = (record) => {
  const checkpoints = [
    ["入室时间", parseClockMinutes(record.entryRoomTime)],
    ["麻醉开始", parseClockMinutes(record.anesthesiaStartTime)],
    ["手术开始", parseClockMinutes(record.surgeryStartTime)],
    ["手术结束", parseClockMinutes(record.surgeryEndTime)],
    ["麻醉结束", parseClockMinutes(record.anesthesiaEndTime)],
    ["出室时间", parseClockMinutes(record.exitRoomTime)],
  ];
  const errors = [];

  for (let index = 1; index < checkpoints.length; index += 1) {
    const [previousLabel, previousValue] = checkpoints[index - 1];
    const [currentLabel, currentValue] = checkpoints[index];

    if (
      Number.isFinite(previousValue) &&
      Number.isFinite(currentValue) &&
      currentValue < previousValue
    ) {
      errors.push(`${currentLabel}早于${previousLabel}`);
    }
  }

  return errors;
};

const validateStructuredRows = (rows, label, requiredKeys) =>
  (rows || [])
    .filter((row) =>
      Object.values(row || {}).some((value) => String(value ?? "").trim()),
    )
    .flatMap((row, index) => {
      const missing = requiredKeys.filter(
        (item) => !String(row?.[item.key] ?? "").trim(),
      );

      if (!missing.length) {
        return [];
      }

      return [
        `${label}第 ${index + 1} 行缺少：${missing
          .map((item) => item.label)
          .join("、")}`,
      ];
    });

export const validateDocumentRecord = ({ template, record, pages }) => {
  const errors = [];
  const warnings = [];
  const checks = [];

  if (!pages?.length) {
    errors.push("当前未生成可打印页面");
  }

  if (isAnesthesiaTemplate(template)) {
    errors.push(...collectRequiredFieldErrors(record, REQUIRED_ANESTHESIA_FIELDS));
    errors.push(...validateTimeOrder(record));

    const trendMap = new Map(
      (record?.trendPoints || []).map((point) => [String(point.time || ""), point]),
    );
    const gapResult = countFiveMinuteGaps(record, trendMap);

    if (!record?.trendPoints?.length) {
      errors.push("未录入术中生命体征采样点");
    }

    if (gapResult.missingCount) {
      warnings.push(
        `麻醉开始至麻醉结束区间内仍有 ${gapResult.missingCount} 个 5 分钟采样点未完整填写`,
      );
    }

    Object.keys(METRIC_RANGES).forEach((metricKey) => {
      warnings.push(...validateMetricRange(record.trendPoints, metricKey));
    });

    warnings.push(
      ...validateStructuredRows(record.medications, "术中用药", [
        { key: "time", label: "时间" },
        { key: "name", label: "药品" },
        { key: "dose", label: "剂量" },
      ]),
    );

    warnings.push(
      ...validateStructuredRows(record.fluids, "液体与出入量", [
        { key: "time", label: "时间" },
        { key: "name", label: "项目" },
        { key: "volume", label: "数量" },
      ]),
    );

    warnings.push(
      ...validateStructuredRows(record.eventMarkers, "事件标记", [
        { key: "time", label: "时间" },
        { key: "label", label: "事件" },
      ]),
    );

    checks.push({
      label: "主单页数",
      value: pages?.filter((page) => page.kind === "anesthesia-main").length || 0,
    });
    checks.push({
      label: "续页数量",
      value: pages?.filter((page) => page.kind === "anesthesia-note").length || 0,
    });
    checks.push({
      label: "溢出表格",
      value:
        pages?.reduce(
          (total, page) => total + ((page.overflowTables || []).length || 0),
          0,
        ) || 0,
    });
  } else {
    errors.push(...collectRequiredFieldErrors(record, REQUIRED_NARRATIVE_FIELDS));

    if (
      !(template?.sectionFields || []).some((section) =>
        String(record?.[section.key] ?? "").trim(),
      )
    ) {
      warnings.push("正文区尚未填写内容");
    }

    checks.push({
      label: "打印页数",
      value: pages?.length || 0,
    });
  }

  return {
    errors,
    warnings,
    checks,
  };
};
