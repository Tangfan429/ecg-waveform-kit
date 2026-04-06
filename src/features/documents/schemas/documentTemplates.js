const createTrendPoint = (time, overrides = {}) => ({
  time,
  pulse: "",
  systolic: "",
  diastolic: "",
  spo2: "",
  etco2: "",
  respiration: "",
  temperature: "",
  ...overrides,
});

const createEventMarker = (time, label, lane = "麻醉事件") => ({
  time,
  label,
  lane,
});

const createMedicationRow = (
  time = "",
  name = "",
  dose = "",
  unit = "mg",
  route = "",
  remark = "",
) => ({
  time,
  name,
  dose,
  unit,
  route,
  remark,
});

const createFluidRow = (
  time = "",
  name = "",
  volume = "",
  unit = "mL",
  kind = "",
  remark = "",
) => ({
  time,
  name,
  volume,
  unit,
  kind,
  remark,
});

const NARRATIVE_TEMPLATES = [
  {
    id: "outpatient-visit",
    kind: "narrative",
    title: "门急诊病历",
    shortTitle: "门诊",
    tone: "blue",
    summary:
      "适合首诊、复诊与心电检查后补充诊疗意见，突出主诉、现病史与处理意见。",
    documentCode: "EMR-OP-01",
    editorGroups: [
      { key: "organization", title: "机构信息" },
      { key: "patient", title: "患者信息" },
      { key: "encounter", title: "就诊信息" },
      { key: "signoff", title: "签章信息" },
    ],
    fields: [
      {
        key: "hospitalName",
        label: "医院名称",
        printLabel: "医院",
        group: "organization",
        type: "text",
        span: 12,
      },
      {
        key: "department",
        label: "科室",
        printLabel: "科室",
        group: "organization",
        type: "text",
        span: 12,
      },
      {
        key: "patientName",
        label: "患者姓名",
        printLabel: "姓名",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "gender",
        label: "性别",
        printLabel: "性别",
        group: "patient",
        type: "select",
        span: 8,
        options: [
          { label: "男", value: "男" },
          { label: "女", value: "女" },
        ],
      },
      {
        key: "age",
        label: "年龄",
        printLabel: "年龄",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "patientType",
        label: "就诊类型",
        printLabel: "类型",
        group: "patient",
        type: "select",
        span: 8,
        options: [
          { label: "门诊", value: "门诊" },
          { label: "急诊", value: "急诊" },
          { label: "复诊", value: "复诊" },
        ],
      },
      {
        key: "patientNo",
        label: "病历号",
        printLabel: "病历号",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "bedNo",
        label: "床号",
        printLabel: "床号",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "visitDate",
        label: "就诊日期",
        printLabel: "日期",
        group: "encounter",
        type: "date",
        span: 8,
      },
      {
        key: "registrationNo",
        label: "挂号号",
        printLabel: "挂号号",
        group: "encounter",
        type: "text",
        span: 8,
      },
      {
        key: "chiefDoctor",
        label: "接诊医师",
        printLabel: "接诊医师",
        group: "encounter",
        type: "text",
        span: 8,
      },
      {
        key: "authorName",
        label: "书写医师",
        printLabel: "书写医师",
        group: "signoff",
        type: "text",
        span: 8,
      },
      {
        key: "reviewerName",
        label: "审核医师",
        printLabel: "审核医师",
        group: "signoff",
        type: "text",
        span: 8,
      },
      {
        key: "signedDate",
        label: "签署日期",
        printLabel: "签署日期",
        group: "signoff",
        type: "date",
        span: 8,
      },
    ],
    headerFieldKeys: [
      "department",
      "patientName",
      "gender",
      "age",
      "patientType",
      "patientNo",
      "registrationNo",
      "visitDate",
    ],
    sectionFields: [
      {
        key: "chiefComplaint",
        label: "主诉",
        placeholder: "请输入患者本次最主要的不适与持续时间。",
        rows: 4,
      },
      {
        key: "presentIllness",
        label: "现病史",
        placeholder: "请输入症状演变、诱因、既往处理与本次就诊重点。",
        rows: 6,
      },
      {
        key: "pastHistory",
        label: "既往史",
        placeholder: "请输入既往疾病、手术、药物过敏与重要家族史。",
        rows: 5,
      },
      {
        key: "physicalExam",
        label: "体格检查",
        placeholder: "请输入查体要点、生命体征与阳性体征。",
        rows: 5,
      },
      {
        key: "auxiliaryExam",
        label: "辅助检查",
        placeholder: "请输入心电图、化验、影像或院外检查结果。",
        rows: 5,
      },
      {
        key: "diagnosis",
        label: "初步诊断",
        placeholder: "请输入诊断结果，支持分行填写。",
        rows: 4,
      },
      {
        key: "treatmentPlan",
        label: "处理意见",
        placeholder: "请输入用药、复诊、随访和患者宣教内容。",
        rows: 5,
      },
    ],
    signoff: {
      authorLabel: "书写医师",
      reviewerLabel: "审核医师",
    },
    defaultRecord: {
      hospitalName: "示例医院",
      department: "心电门诊",
      patientName: "王小明",
      gender: "男",
      age: "58岁",
      patientType: "门诊",
      patientNo: "OP20260403001",
      bedNo: "--",
      visitDate: "2026-04-03",
      registrationNo: "GH-20260403-008",
      chiefDoctor: "陈医生",
      authorName: "陈医生",
      reviewerName: "李主任",
      signedDate: "2026-04-03",
      chiefComplaint: "间断胸闷、心悸 3 天，加重半天。",
      presentIllness:
        "患者 3 天前无明显诱因出现胸闷、心悸，活动后加重，休息后可部分缓解。半天前再次发作，伴轻度乏力，无明显胸痛、黑朦、晕厥。外院未系统治疗，今日来院完善心电图及进一步评估。",
      pastHistory:
        "既往高血压病史 8 年，规律服用降压药物。否认糖尿病、冠脉介入及重大手术史。否认青霉素等药物过敏史。",
      physicalExam:
        "T 36.5℃，P 92 次/分，R 18 次/分，BP 146/88 mmHg。神志清，双肺呼吸音清，心律尚齐，未闻及明显病理性杂音。双下肢无水肿。",
      auxiliaryExam:
        "常规十二导联心电图提示窦性心律，偶发房性早搏；ST-T 未见急性缺血性改变。建议结合心肌酶谱及动态心电图进一步评估。",
      diagnosis: "1. 心悸待查\n2. 高血压病",
      treatmentPlan:
        "建议继续监测血压，避免熬夜和浓茶咖啡刺激。完善动态心电图检查，如再发胸闷胸痛及时急诊就医。门诊 3 日后复诊，携带既往检查结果。",
    },
  },
  {
    id: "daily-course-record",
    kind: "narrative",
    title: "病程记录",
    shortTitle: "病程",
    tone: "green",
    summary:
      "适合住院连续记录、查房意见与治疗调整，支持长文本自动续页打印。",
    documentCode: "EMR-IP-07",
    editorGroups: [
      { key: "organization", title: "机构信息" },
      { key: "patient", title: "患者信息" },
      { key: "encounter", title: "住院信息" },
      { key: "signoff", title: "签章信息" },
    ],
    fields: [
      {
        key: "hospitalName",
        label: "医院名称",
        printLabel: "医院",
        group: "organization",
        type: "text",
        span: 12,
      },
      {
        key: "department",
        label: "病区 / 科室",
        printLabel: "病区",
        group: "organization",
        type: "text",
        span: 12,
      },
      {
        key: "patientName",
        label: "患者姓名",
        printLabel: "姓名",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "gender",
        label: "性别",
        printLabel: "性别",
        group: "patient",
        type: "select",
        span: 8,
        options: [
          { label: "男", value: "男" },
          { label: "女", value: "女" },
        ],
      },
      {
        key: "age",
        label: "年龄",
        printLabel: "年龄",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "patientNo",
        label: "住院号",
        printLabel: "住院号",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "bedNo",
        label: "床号",
        printLabel: "床号",
        group: "patient",
        type: "text",
        span: 8,
      },
      {
        key: "patientType",
        label: "身份",
        printLabel: "身份",
        group: "patient",
        type: "select",
        span: 8,
        options: [
          { label: "住院", value: "住院" },
          { label: "ICU", value: "ICU" },
        ],
      },
      {
        key: "visitDate",
        label: "记录日期",
        printLabel: "记录日期",
        group: "encounter",
        type: "datetime",
        span: 8,
      },
      {
        key: "registrationNo",
        label: "住院流水号",
        printLabel: "流水号",
        group: "encounter",
        type: "text",
        span: 8,
      },
      {
        key: "chiefDoctor",
        label: "主管医师",
        printLabel: "主管医师",
        group: "encounter",
        type: "text",
        span: 8,
      },
      {
        key: "authorName",
        label: "记录医师",
        printLabel: "记录医师",
        group: "signoff",
        type: "text",
        span: 8,
      },
      {
        key: "reviewerName",
        label: "上级医师",
        printLabel: "上级医师",
        group: "signoff",
        type: "text",
        span: 8,
      },
      {
        key: "signedDate",
        label: "确认日期",
        printLabel: "确认日期",
        group: "signoff",
        type: "datetime",
        span: 8,
      },
    ],
    headerFieldKeys: [
      "department",
      "patientName",
      "gender",
      "age",
      "patientNo",
      "bedNo",
      "registrationNo",
      "visitDate",
    ],
    sectionFields: [
      {
        key: "courseSummary",
        label: "病情变化",
        placeholder: "请输入本次记录前后的病情变化与主诉诉求。",
        rows: 6,
      },
      {
        key: "roundsNotes",
        label: "查房记录",
        placeholder: "请输入查房要点、诊疗判断与上级意见。",
        rows: 7,
      },
      {
        key: "positiveFindings",
        label: "阳性体征",
        placeholder: "请输入查体变化、监护参数与重点体征。",
        rows: 5,
      },
      {
        key: "auxiliaryExam",
        label: "辅助检查",
        placeholder: "请输入化验、影像、心电图及关键趋势。",
        rows: 6,
      },
      {
        key: "treatmentAdjustment",
        label: "治疗调整",
        placeholder: "请输入新增医嘱、停药、复查与会诊安排。",
        rows: 6,
      },
      {
        key: "doctorAdvice",
        label: "医师意见",
        placeholder: "请输入风险提示、家属沟通与后续观察重点。",
        rows: 5,
      },
    ],
    signoff: {
      authorLabel: "记录医师",
      reviewerLabel: "上级医师",
    },
    defaultRecord: {
      hospitalName: "示例医院",
      department: "心内科二病区",
      patientName: "刘秀兰",
      gender: "女",
      age: "67岁",
      patientType: "住院",
      patientNo: "ZY20260328018",
      bedNo: "12A",
      visitDate: "2026-04-03 10:30:00",
      registrationNo: "IP-20260328-018",
      chiefDoctor: "周医生",
      authorName: "周医生",
      reviewerName: "赵主任",
      signedDate: "2026-04-03 11:10:00",
      courseSummary:
        "患者诉昨夜胸闷较前减轻，仍有间断心悸，无明显胸痛、呼吸困难。夜间监护未见持续性恶性心律失常，睡眠尚可，饮食一般。",
      roundsNotes:
        "今日上级医师查房，结合患者症状、既往高血压及阵发性房颤病史，考虑当前仍以节律波动和容量负荷变化相关。建议继续心电监护，评估电解质与容量状态，必要时完善动态心电图及超声心动图复查。",
      positiveFindings:
        "神志清，双肺呼吸音清，心率 88 次/分，律欠齐。双下肢轻度凹陷性水肿较前改善，未见发绀。",
      auxiliaryExam:
        "今日复查心电图示窦性心律伴短阵房性心动过速；NT-proBNP 较入院时下降。血钾 4.2 mmol/L，肌酐平稳。胸片未见新增渗出改变。",
      treatmentAdjustment:
        "继续维持控制心率及抗凝治疗，调整利尿剂剂量并嘱严密记录出入量。明晨复查电解质及肾功能，根据结果再评估是否调整方案。",
      doctorAdvice:
        "已向患者及家属说明当前病情及治疗计划，强调若出现胸闷明显加重、呼吸困难或头晕黑朦需立即呼叫医护人员。",
    },
  },
];

const ANESTHESIA_TEMPLATE = {
  id: "anesthesia-record",
  kind: "anesthesiaSheet",
  title: "麻醉记录单",
  shortTitle: "麻醉",
  tone: "warning",
  summary:
    "用于术中生命体征、麻醉事件、用药液体和离室情况的结构化记录，支持打印续页。",
  documentCode: "ANES-OR-01",
  fields: [
    { key: "department", label: "科室", printLabel: "科室" },
    { key: "patientName", label: "姓名", printLabel: "姓名" },
    { key: "gender", label: "性别", printLabel: "性别" },
    { key: "age", label: "年龄", printLabel: "年龄" },
    { key: "patientNo", label: "住院号", printLabel: "住院号" },
    { key: "bedNo", label: "床号", printLabel: "床号" },
    { key: "registrationNo", label: "手术号", printLabel: "手术号" },
    { key: "visitDate", label: "日期", printLabel: "日期" },
    { key: "operatingRoom", label: "手术间", printLabel: "手术间" },
    { key: "anesthesiaMethod", label: "麻醉方式", printLabel: "麻醉方式" },
    { key: "asaGrade", label: "ASA", printLabel: "ASA" },
    { key: "surgeryName", label: "手术名称", printLabel: "手术名称" },
  ],
  headerFieldKeys: [
    "department",
    "patientName",
    "gender",
    "age",
    "patientNo",
    "bedNo",
    "registrationNo",
    "visitDate",
    "operatingRoom",
    "anesthesiaMethod",
    "asaGrade",
    "surgeryName",
  ],
  continuationTextFields: [
    {
      key: "specialSituation",
      label: "术前特殊情况",
      placeholder: "记录术前评估、气道风险、基础疾病和麻醉计划要点。",
    },
    {
      key: "anesthesiaSummary",
      label: "麻醉经过与总结",
      placeholder: "记录麻醉诱导、维持、术中处理以及术毕评估。",
    },
    {
      key: "outRoomCondition",
      label: "离室情况",
      placeholder: "记录离室生命体征、镇痛、意识状态和去向。",
    },
    {
      key: "remark",
      label: "备注",
      placeholder: "记录补充说明、并发症处置或家属沟通情况。",
    },
  ],
  defaultRecord: {
    hospitalName: "示例医院",
    department: "麻醉科",
    patientName: "赵建军",
    gender: "男",
    age: "46岁",
    patientNo: "ZY20260403016",
    bedNo: "07床",
    visitDate: "2026-04-03",
    registrationNo: "OR-20260403-016",
    operatingRoom: "3号手术间",
    surgeryName: "腹腔镜胆囊切除术",
    preoperativeDiagnosis: "胆囊结石伴慢性胆囊炎",
    postoperativeDiagnosis: "胆囊结石伴慢性胆囊炎",
    anesthesiaMethod: "全身麻醉",
    asaGrade: "II级",
    surgeryPosition: "平卧位",
    surgeonName: "陈主任",
    anesthesiologistName: "王麻医",
    assistantName: "刘麻医",
    scrubNurseName: "周护士",
    entryRoomTime: "08:00",
    anesthesiaStartTime: "08:10",
    surgeryStartTime: "08:32",
    surgeryEndTime: "10:08",
    anesthesiaEndTime: "10:25",
    exitRoomTime: "10:40",
    specialSituation:
      "术前评估 Mallampati II 级，否认食物及药物过敏史。合并高血压病史 5 年，晨起血压控制稳定。拟行全身麻醉气管插管。",
    anesthesiaSummary:
      "入室后常规监测，静脉诱导顺利，气管插管一次成功。术中血流动力学总体平稳，间断追加镇痛及肌松药物，未见明显低氧及严重心律失常。术毕自主呼吸恢复，拔管后送返恢复区观察。",
    outRoomCondition:
      "离室时神志可唤醒，生命体征平稳，气道通畅，疼痛评分 2 分，拟送 PACU 继续监测。",
    remark:
      "术中出血少，尿量可。已向手术医师及 PACU 护士完成交接。",
    signoffDoctor: "王麻医",
    reviewerName: "刘麻医",
    signedDate: "2026-04-03 10:45:00",
    trendPoints: [
      createTrendPoint("08:00", {
        pulse: "78",
        systolic: "132",
        diastolic: "78",
        spo2: "99",
        etco2: "",
        respiration: "16",
        temperature: "36.5",
      }),
      createTrendPoint("08:05", {
        pulse: "80",
        systolic: "136",
        diastolic: "80",
        spo2: "99",
        etco2: "",
        respiration: "16",
        temperature: "36.5",
      }),
      createTrendPoint("08:10", {
        pulse: "86",
        systolic: "142",
        diastolic: "84",
        spo2: "99",
        etco2: "34",
        respiration: "14",
        temperature: "36.4",
      }),
      createTrendPoint("08:15", {
        pulse: "72",
        systolic: "118",
        diastolic: "70",
        spo2: "100",
        etco2: "36",
        respiration: "14",
        temperature: "36.4",
      }),
      createTrendPoint("08:20", {
        pulse: "74",
        systolic: "116",
        diastolic: "68",
        spo2: "100",
        etco2: "37",
        respiration: "14",
        temperature: "36.4",
      }),
      createTrendPoint("08:30", {
        pulse: "76",
        systolic: "122",
        diastolic: "72",
        spo2: "100",
        etco2: "35",
        respiration: "13",
        temperature: "36.4",
      }),
      createTrendPoint("08:45", {
        pulse: "82",
        systolic: "128",
        diastolic: "74",
        spo2: "99",
        etco2: "36",
        respiration: "13",
        temperature: "36.3",
      }),
      createTrendPoint("09:00", {
        pulse: "84",
        systolic: "126",
        diastolic: "76",
        spo2: "99",
        etco2: "35",
        respiration: "13",
        temperature: "36.3",
      }),
      createTrendPoint("09:30", {
        pulse: "81",
        systolic: "124",
        diastolic: "74",
        spo2: "99",
        etco2: "36",
        respiration: "13",
        temperature: "36.2",
      }),
      createTrendPoint("10:00", {
        pulse: "79",
        systolic: "128",
        diastolic: "76",
        spo2: "100",
        etco2: "37",
        respiration: "14",
        temperature: "36.3",
      }),
      createTrendPoint("10:20", {
        pulse: "88",
        systolic: "138",
        diastolic: "82",
        spo2: "100",
        etco2: "",
        respiration: "16",
        temperature: "36.4",
      }),
      createTrendPoint("10:40", {
        pulse: "84",
        systolic: "134",
        diastolic: "80",
        spo2: "100",
        etco2: "",
        respiration: "16",
        temperature: "36.5",
      }),
    ],
    eventMarkers: [
      createEventMarker("08:10", "麻醉开始", "麻醉事件"),
      createEventMarker("08:12", "诱导", "麻醉事件"),
      createEventMarker("08:15", "插管", "气道管理"),
      createEventMarker("08:32", "切皮", "手术事件"),
      createEventMarker("10:08", "手术结束", "手术事件"),
      createEventMarker("10:20", "拔管", "气道管理"),
      createEventMarker("10:25", "麻醉结束", "麻醉事件"),
    ],
    medications: [
      createMedicationRow("08:10", "咪达唑仑", "2", "mg", "静推", "诱导前"),
      createMedicationRow("08:11", "丙泊酚", "120", "mg", "静推", "诱导"),
      createMedicationRow("08:11", "舒芬太尼", "20", "μg", "静推", ""),
      createMedicationRow("08:12", "罗库溴铵", "50", "mg", "静推", "插管"),
      createMedicationRow("09:20", "瑞芬太尼", "0.1", "mg", "泵注", "维持"),
      createMedicationRow("10:05", "昂丹司琼", "4", "mg", "静推", "止吐"),
    ],
    fluids: [
      createFluidRow("08:00", "乳酸钠林格液", "500", "mL", "晶体液", ""),
      createFluidRow("09:00", "羟乙基淀粉", "250", "mL", "胶体液", ""),
      createFluidRow("10:10", "尿量", "180", "mL", "出量", ""),
      createFluidRow("10:20", "出血量", "50", "mL", "出量", ""),
    ],
  },
};

const DOCUMENT_TEMPLATES = Object.freeze([
  ...NARRATIVE_TEMPLATES,
  ANESTHESIA_TEMPLATE,
]);

const templateMap = new Map(
  DOCUMENT_TEMPLATES.map((template) => [template.id, template]),
);

const fieldMapCache = new Map();

const collectionRowFactoryMap = Object.freeze({
  trendPoints: () => createTrendPoint(""),
  eventMarkers: () => createEventMarker("", "", "麻醉事件"),
  medications: () => createMedicationRow(),
  fluids: () => createFluidRow(),
});

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

export const getDocumentTemplates = () => DOCUMENT_TEMPLATES;

export const getDocumentTemplate = (templateId) =>
  templateMap.get(templateId) || DOCUMENT_TEMPLATES[0];

export const isNarrativeTemplate = (template) => template?.kind === "narrative";

export const isAnesthesiaTemplate = (template) =>
  template?.kind === "anesthesiaSheet";

export const createDocumentRecord = (templateId) =>
  cloneValue(getDocumentTemplate(templateId).defaultRecord);

export const createDocumentCollectionRow = (collectionKey) =>
  collectionRowFactoryMap[collectionKey]?.() || {};

export const getTemplateFieldMap = (template) => {
  const templateId = template?.id || "default";

  if (fieldMapCache.has(templateId)) {
    return fieldMapCache.get(templateId);
  }

  const fieldMap = new Map(
    [...(template?.fields || []), ...(template?.sectionFields || [])].map(
      (field) => [field.key, field],
    ),
  );

  fieldMapCache.set(templateId, fieldMap);
  return fieldMap;
};

export const formatRecordValue = (value) => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || "--";
};

export const buildDocumentHeaderEntries = (template, record) =>
  (template?.headerFieldKeys || [])
    .map((fieldKey) => {
      const fieldMap = getTemplateFieldMap(template);
      const field = fieldMap.get(fieldKey);

      if (field) {
        return {
          key: field.key,
          label: field.printLabel || field.label,
          value: formatRecordValue(record?.[field.key]),
        };
      }

      return {
        key: fieldKey,
        label: fieldKey,
        value: formatRecordValue(record?.[fieldKey]),
      };
    })
    .filter(Boolean);
