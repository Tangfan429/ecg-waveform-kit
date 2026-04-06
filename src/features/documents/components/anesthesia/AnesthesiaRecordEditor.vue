<script setup>
import { computed, ref } from "vue";

defineOptions({
  name: "AnesthesiaRecordEditor",
});

const props = defineProps({
  record: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  "update-field",
  "update-collection-row",
  "add-collection-row",
  "remove-collection-row",
]);

const bulkImportVisible = ref(false);
const bulkImportText = ref("");
const eventPresets = Object.freeze([
  { label: "麻醉开始", lane: "麻醉事件", timeKey: "anesthesiaStartTime" },
  { label: "诱导", lane: "麻醉事件", timeKey: "anesthesiaStartTime" },
  { label: "插管", lane: "气道管理", timeKey: "anesthesiaStartTime" },
  { label: "切皮", lane: "手术事件", timeKey: "surgeryStartTime" },
  { label: "手术结束", lane: "手术事件", timeKey: "surgeryEndTime" },
  { label: "拔管", lane: "气道管理", timeKey: "anesthesiaEndTime" },
  { label: "出室", lane: "麻醉事件", timeKey: "exitRoomTime" },
]);
const medicationPresets = Object.freeze([
  { name: "咪达唑仑", dose: "2", unit: "mg", route: "静推" },
  { name: "丙泊酚", dose: "120", unit: "mg", route: "静推" },
  { name: "舒芬太尼", dose: "20", unit: "μg", route: "静推" },
  { name: "罗库溴铵", dose: "50", unit: "mg", route: "静推" },
  { name: "昂丹司琼", dose: "4", unit: "mg", route: "静推" },
]);
const fluidPresets = Object.freeze([
  { name: "乳酸钠林格液", volume: "500", unit: "mL", kind: "晶体液" },
  { name: "生理盐水", volume: "250", unit: "mL", kind: "晶体液" },
  { name: "羟乙基淀粉", volume: "250", unit: "mL", kind: "胶体液" },
  { name: "尿量", volume: "100", unit: "mL", kind: "出量" },
  { name: "出血量", volume: "50", unit: "mL", kind: "出量" },
]);

const updateField = (key, value) => {
  emit("update-field", { key, value });
};

const updateCollectionCell = (collectionKey, index, key, value) => {
  emit("update-collection-row", {
    collectionKey,
    index,
    rowPatch: { [key]: value },
  });
};

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

const formatClockLabel = (minutesValue) => {
  const normalizedValue = ((minutesValue % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedValue / 60);
  const minutes = normalizedValue % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const resolveTrendWindow = () => {
  const values = [
    props.record.entryRoomTime,
    props.record.anesthesiaStartTime,
    props.record.surgeryStartTime,
    props.record.surgeryEndTime,
    props.record.anesthesiaEndTime,
    props.record.exitRoomTime,
    ...(props.record.trendPoints || []).map((point) => point.time),
  ]
    .map(parseClockMinutes)
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return { start: 8 * 60, end: 10 * 60 };
  }

  const start = Math.floor(Math.min(...values) / 5) * 5;
  const end = Math.ceil(Math.max(...values) / 5) * 5;
  return { start, end: end > start ? end : start + 60 };
};

const trendRangeLabel = computed(() => {
  const { start, end } = resolveTrendWindow();
  return `${formatClockLabel(start)} - ${formatClockLabel(end)}`;
});

const trendPointCount = computed(() => (props.record.trendPoints || []).length);
const eventCount = computed(() => (props.record.eventMarkers || []).length);

const generateFiveMinuteRows = () => {
  const { start, end } = resolveTrendWindow();
  const sourceMap = new Map(
    (props.record.trendPoints || []).map((row) => [String(row.time || ""), row]),
  );
  const nextRows = [];

  for (let cursor = start; cursor <= end; cursor += 5) {
    const timeLabel = formatClockLabel(cursor);
    const sourceRow = sourceMap.get(timeLabel);

    nextRows.push({
      time: timeLabel,
      pulse: sourceRow?.pulse || "",
      systolic: sourceRow?.systolic || "",
      diastolic: sourceRow?.diastolic || "",
      spo2: sourceRow?.spo2 || "",
      etco2: sourceRow?.etco2 || "",
      respiration: sourceRow?.respiration || "",
      temperature: sourceRow?.temperature || "",
    });
  }

  updateField("trendPoints", nextRows);
};

const openBulkImport = () => {
  bulkImportText.value = "";
  bulkImportVisible.value = true;
};

const applyBulkImport = () => {
  const nextRows = bulkImportText.value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[\t,，]+/u).map((item) => item.trim()))
    .filter((parts) => parts.length && /^\d{2}:\d{2}$/u.test(parts[0] || ""))
    .map((parts) => ({
      time: parts[0] || "",
      pulse: parts[1] || "",
      systolic: parts[2] || "",
      diastolic: parts[3] || "",
      spo2: parts[4] || "",
      etco2: parts[5] || "",
      respiration: parts[6] || "",
      temperature: parts[7] || "",
    }));

  if (nextRows.length) {
    updateField("trendPoints", nextRows);
  }

  bulkImportVisible.value = false;
};

const appendCollectionRow = (collectionKey, rowPatch) => {
  updateField(collectionKey, [...(props.record[collectionKey] || []), rowPatch]);
};

const appendEventPreset = (preset) => {
  appendCollectionRow("eventMarkers", {
    time: props.record[preset.timeKey] || "",
    label: preset.label,
    lane: preset.lane,
  });
};

const appendMedicationPreset = (preset) => {
  appendCollectionRow("medications", {
    time: props.record.anesthesiaStartTime || "",
    name: preset.name,
    dose: preset.dose,
    unit: preset.unit,
    route: preset.route,
    remark: "",
  });
};

const appendFluidPreset = (preset) => {
  appendCollectionRow("fluids", {
    time: props.record.entryRoomTime || "",
    name: preset.name,
    volume: preset.volume,
    unit: preset.unit,
    kind: preset.kind,
    remark: "",
  });
};
</script>

<template>
  <section class="anesthesia-record-editor">
    <header class="anesthesia-record-editor__header">
      <div>
        <p class="anesthesia-record-editor__eyebrow">Anesthesia Sheet</p>
        <h3 class="anesthesia-record-editor__title">麻醉记录单编辑</h3>
      </div>
      <ElTag type="warning" effect="plain">
        手工录入一期
      </ElTag>
    </header>

    <ElTabs class="anesthesia-record-editor__tabs">
      <ElTabPane label="基础信息">
        <section class="anesthesia-record-editor__panel">
          <div class="anesthesia-record-editor__section-head">
            <h4 class="anesthesia-record-editor__panel-title">患者与手术信息</h4>
            <ElTag type="info" effect="plain">用于页眉与打印识别</ElTag>
          </div>

          <ElForm label-position="top">
            <div class="anesthesia-record-editor__grid">
              <ElFormItem label="医院名称" class="anesthesia-record-editor__span-12"><ElInput :model-value="record.hospitalName" @update:model-value="updateField('hospitalName', $event)" /></ElFormItem>
              <ElFormItem label="科室" class="anesthesia-record-editor__span-12"><ElInput :model-value="record.department" @update:model-value="updateField('department', $event)" /></ElFormItem>
              <ElFormItem label="患者姓名" class="anesthesia-record-editor__span-8"><ElInput :model-value="record.patientName" @update:model-value="updateField('patientName', $event)" /></ElFormItem>
              <ElFormItem label="性别" class="anesthesia-record-editor__span-4"><ElSelect :model-value="record.gender" @update:model-value="updateField('gender', $event)"><ElOption label="男" value="男" /><ElOption label="女" value="女" /></ElSelect></ElFormItem>
              <ElFormItem label="年龄" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.age" @update:model-value="updateField('age', $event)" /></ElFormItem>
              <ElFormItem label="住院号" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.patientNo" @update:model-value="updateField('patientNo', $event)" /></ElFormItem>
              <ElFormItem label="床号" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.bedNo" @update:model-value="updateField('bedNo', $event)" /></ElFormItem>
              <ElFormItem label="手术日期" class="anesthesia-record-editor__span-6"><ElDatePicker :model-value="record.visitDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" style="width: 100%;" @update:model-value="updateField('visitDate', $event)" /></ElFormItem>
              <ElFormItem label="手术号" class="anesthesia-record-editor__span-6"><ElInput :model-value="record.registrationNo" @update:model-value="updateField('registrationNo', $event)" /></ElFormItem>
              <ElFormItem label="手术间" class="anesthesia-record-editor__span-6"><ElInput :model-value="record.operatingRoom" @update:model-value="updateField('operatingRoom', $event)" /></ElFormItem>
              <ElFormItem label="ASA 分级" class="anesthesia-record-editor__span-6"><ElSelect :model-value="record.asaGrade" @update:model-value="updateField('asaGrade', $event)"><ElOption label="I级" value="I级" /><ElOption label="II级" value="II级" /><ElOption label="III级" value="III级" /><ElOption label="IV级" value="IV级" /></ElSelect></ElFormItem>
              <ElFormItem label="拟施手术" class="anesthesia-record-editor__span-12"><ElInput :model-value="record.surgeryName" @update:model-value="updateField('surgeryName', $event)" /></ElFormItem>
              <ElFormItem label="术前诊断" class="anesthesia-record-editor__span-12"><ElInput :model-value="record.preoperativeDiagnosis" @update:model-value="updateField('preoperativeDiagnosis', $event)" /></ElFormItem>
              <ElFormItem label="术后诊断" class="anesthesia-record-editor__span-12"><ElInput :model-value="record.postoperativeDiagnosis" @update:model-value="updateField('postoperativeDiagnosis', $event)" /></ElFormItem>
              <ElFormItem label="麻醉方式" class="anesthesia-record-editor__span-8"><ElSelect :model-value="record.anesthesiaMethod" @update:model-value="updateField('anesthesiaMethod', $event)"><ElOption label="全身麻醉" value="全身麻醉" /><ElOption label="椎管内麻醉" value="椎管内麻醉" /><ElOption label="神经阻滞" value="神经阻滞" /><ElOption label="局部麻醉" value="局部麻醉" /><ElOption label="镇静麻醉" value="镇静麻醉" /></ElSelect></ElFormItem>
              <ElFormItem label="手术体位" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.surgeryPosition" @update:model-value="updateField('surgeryPosition', $event)" /></ElFormItem>
              <ElFormItem label="术者" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.surgeonName" @update:model-value="updateField('surgeonName', $event)" /></ElFormItem>
              <ElFormItem label="麻醉医师" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.anesthesiologistName" @update:model-value="updateField('anesthesiologistName', $event)" /></ElFormItem>
              <ElFormItem label="助手" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.assistantName" @update:model-value="updateField('assistantName', $event)" /></ElFormItem>
              <ElFormItem label="洗手护士" class="anesthesia-record-editor__span-4"><ElInput :model-value="record.scrubNurseName" @update:model-value="updateField('scrubNurseName', $event)" /></ElFormItem>
            </div>
          </ElForm>
        </section>
      </ElTabPane>

      <ElTabPane label="术中趋势">
        <section class="anesthesia-record-editor__panel">
          <div class="anesthesia-record-editor__section-head">
            <h4 class="anesthesia-record-editor__panel-title">关键时间点</h4>
            <ElTag type="info" effect="plain">建议按 5 分钟刻度补录</ElTag>
          </div>
          <ElForm label-position="top">
            <div class="anesthesia-record-editor__grid">
              <ElFormItem label="入室时间" class="anesthesia-record-editor__span-4"><ElTimePicker :model-value="record.entryRoomTime" value-format="HH:mm" format="HH:mm" style="width: 100%;" @update:model-value="updateField('entryRoomTime', $event)" /></ElFormItem>
              <ElFormItem label="麻醉开始" class="anesthesia-record-editor__span-4"><ElTimePicker :model-value="record.anesthesiaStartTime" value-format="HH:mm" format="HH:mm" style="width: 100%;" @update:model-value="updateField('anesthesiaStartTime', $event)" /></ElFormItem>
              <ElFormItem label="手术开始" class="anesthesia-record-editor__span-4"><ElTimePicker :model-value="record.surgeryStartTime" value-format="HH:mm" format="HH:mm" style="width: 100%;" @update:model-value="updateField('surgeryStartTime', $event)" /></ElFormItem>
              <ElFormItem label="手术结束" class="anesthesia-record-editor__span-4"><ElTimePicker :model-value="record.surgeryEndTime" value-format="HH:mm" format="HH:mm" style="width: 100%;" @update:model-value="updateField('surgeryEndTime', $event)" /></ElFormItem>
              <ElFormItem label="麻醉结束" class="anesthesia-record-editor__span-4"><ElTimePicker :model-value="record.anesthesiaEndTime" value-format="HH:mm" format="HH:mm" style="width: 100%;" @update:model-value="updateField('anesthesiaEndTime', $event)" /></ElFormItem>
              <ElFormItem label="出室时间" class="anesthesia-record-editor__span-4"><ElTimePicker :model-value="record.exitRoomTime" value-format="HH:mm" format="HH:mm" style="width: 100%;" @update:model-value="updateField('exitRoomTime', $event)" /></ElFormItem>
            </div>
          </ElForm>
        </section>

        <section class="anesthesia-record-editor__panel">
          <div class="anesthesia-record-editor__section-head">
            <div>
              <h4 class="anesthesia-record-editor__panel-title">生命体征采样点</h4>
              <p class="anesthesia-record-editor__section-help">当前窗口：{{ trendRangeLabel }}，共 {{ trendPointCount }} 条。</p>
            </div>
            <div class="anesthesia-record-editor__actions">
              <ElButton size="small" @click="generateFiveMinuteRows">生成 5 分钟刻度</ElButton>
              <ElButton size="small" @click="openBulkImport">批量粘贴</ElButton>
              <ElButton size="small" @click="emit('add-collection-row', 'trendPoints')">新增采样点</ElButton>
            </div>
          </div>

          <ElTable :data="record.trendPoints" border size="small" max-height="300">
            <ElTableColumn label="时间" width="96"><template #default="{ row, $index }"><ElInput :model-value="row.time" placeholder="HH:mm" @update:model-value="updateCollectionCell('trendPoints', $index, 'time', $event)" /></template></ElTableColumn>
            <ElTableColumn label="脉搏" width="92"><template #default="{ row, $index }"><ElInput :model-value="row.pulse" @update:model-value="updateCollectionCell('trendPoints', $index, 'pulse', $event)" /></template></ElTableColumn>
            <ElTableColumn label="收缩压" width="92"><template #default="{ row, $index }"><ElInput :model-value="row.systolic" @update:model-value="updateCollectionCell('trendPoints', $index, 'systolic', $event)" /></template></ElTableColumn>
            <ElTableColumn label="舒张压" width="92"><template #default="{ row, $index }"><ElInput :model-value="row.diastolic" @update:model-value="updateCollectionCell('trendPoints', $index, 'diastolic', $event)" /></template></ElTableColumn>
            <ElTableColumn label="SpO2" width="88"><template #default="{ row, $index }"><ElInput :model-value="row.spo2" @update:model-value="updateCollectionCell('trendPoints', $index, 'spo2', $event)" /></template></ElTableColumn>
            <ElTableColumn label="ETCO2" width="88"><template #default="{ row, $index }"><ElInput :model-value="row.etco2" @update:model-value="updateCollectionCell('trendPoints', $index, 'etco2', $event)" /></template></ElTableColumn>
            <ElTableColumn label="呼吸" width="88"><template #default="{ row, $index }"><ElInput :model-value="row.respiration" @update:model-value="updateCollectionCell('trendPoints', $index, 'respiration', $event)" /></template></ElTableColumn>
            <ElTableColumn label="体温" width="88"><template #default="{ row, $index }"><ElInput :model-value="row.temperature" @update:model-value="updateCollectionCell('trendPoints', $index, 'temperature', $event)" /></template></ElTableColumn>
            <ElTableColumn label="操作" width="72" fixed="right"><template #default="{ $index }"><ElButton link type="danger" @click="emit('remove-collection-row', 'trendPoints', $index)">删除</ElButton></template></ElTableColumn>
          </ElTable>
        </section>

        <section class="anesthesia-record-editor__panel">
          <div class="anesthesia-record-editor__section-head">
            <div>
              <h4 class="anesthesia-record-editor__panel-title">事件标记</h4>
              <p class="anesthesia-record-editor__section-help">当前共 {{ eventCount }} 条，按泳道区分麻醉、气道和手术节点。</p>
            </div>
            <ElButton size="small" @click="emit('add-collection-row', 'eventMarkers')">新增事件</ElButton>
          </div>
          <div class="anesthesia-record-editor__preset-row">
            <ElButton
              v-for="preset in eventPresets"
              :key="preset.label"
              size="small"
              text
              @click="appendEventPreset(preset)"
            >
              {{ preset.label }}
            </ElButton>
          </div>
          <ElTable :data="record.eventMarkers" border size="small" max-height="240">
            <ElTableColumn label="时间" width="100"><template #default="{ row, $index }"><ElInput :model-value="row.time" placeholder="HH:mm" @update:model-value="updateCollectionCell('eventMarkers', $index, 'time', $event)" /></template></ElTableColumn>
            <ElTableColumn label="事件" min-width="180"><template #default="{ row, $index }"><ElInput :model-value="row.label" @update:model-value="updateCollectionCell('eventMarkers', $index, 'label', $event)" /></template></ElTableColumn>
            <ElTableColumn label="泳道" width="140"><template #default="{ row, $index }"><ElSelect :model-value="row.lane" @update:model-value="updateCollectionCell('eventMarkers', $index, 'lane', $event)"><ElOption label="麻醉事件" value="麻醉事件" /><ElOption label="气道管理" value="气道管理" /><ElOption label="手术事件" value="手术事件" /></ElSelect></template></ElTableColumn>
            <ElTableColumn label="操作" width="72"><template #default="{ $index }"><ElButton link type="danger" @click="emit('remove-collection-row', 'eventMarkers', $index)">删除</ElButton></template></ElTableColumn>
          </ElTable>
        </section>
      </ElTabPane>

      <ElTabPane label="用药液体">
        <section class="anesthesia-record-editor__panel">
          <div class="anesthesia-record-editor__section-head">
            <h4 class="anesthesia-record-editor__panel-title">术中用药</h4>
            <ElButton size="small" @click="emit('add-collection-row', 'medications')">新增用药</ElButton>
          </div>
          <div class="anesthesia-record-editor__preset-row">
            <ElButton
              v-for="preset in medicationPresets"
              :key="preset.name"
              size="small"
              text
              @click="appendMedicationPreset(preset)"
            >
              {{ preset.name }}
            </ElButton>
          </div>
          <ElTable :data="record.medications" border size="small" max-height="260">
            <ElTableColumn label="时间" width="96"><template #default="{ row, $index }"><ElInput :model-value="row.time" placeholder="HH:mm" @update:model-value="updateCollectionCell('medications', $index, 'time', $event)" /></template></ElTableColumn>
            <ElTableColumn label="药品" min-width="140"><template #default="{ row, $index }"><ElInput :model-value="row.name" @update:model-value="updateCollectionCell('medications', $index, 'name', $event)" /></template></ElTableColumn>
            <ElTableColumn label="剂量" width="96"><template #default="{ row, $index }"><ElInput :model-value="row.dose" @update:model-value="updateCollectionCell('medications', $index, 'dose', $event)" /></template></ElTableColumn>
            <ElTableColumn label="单位" width="88"><template #default="{ row, $index }"><ElInput :model-value="row.unit" @update:model-value="updateCollectionCell('medications', $index, 'unit', $event)" /></template></ElTableColumn>
            <ElTableColumn label="途径" width="100"><template #default="{ row, $index }"><ElInput :model-value="row.route" @update:model-value="updateCollectionCell('medications', $index, 'route', $event)" /></template></ElTableColumn>
            <ElTableColumn label="备注" min-width="140"><template #default="{ row, $index }"><ElInput :model-value="row.remark" @update:model-value="updateCollectionCell('medications', $index, 'remark', $event)" /></template></ElTableColumn>
            <ElTableColumn label="操作" width="72"><template #default="{ $index }"><ElButton link type="danger" @click="emit('remove-collection-row', 'medications', $index)">删除</ElButton></template></ElTableColumn>
          </ElTable>
        </section>

        <section class="anesthesia-record-editor__panel">
          <div class="anesthesia-record-editor__section-head">
            <h4 class="anesthesia-record-editor__panel-title">液体与出入量</h4>
            <ElButton size="small" @click="emit('add-collection-row', 'fluids')">新增条目</ElButton>
          </div>
          <div class="anesthesia-record-editor__preset-row">
            <ElButton
              v-for="preset in fluidPresets"
              :key="preset.name"
              size="small"
              text
              @click="appendFluidPreset(preset)"
            >
              {{ preset.name }}
            </ElButton>
          </div>
          <ElTable :data="record.fluids" border size="small" max-height="260">
            <ElTableColumn label="时间" width="96"><template #default="{ row, $index }"><ElInput :model-value="row.time" placeholder="HH:mm" @update:model-value="updateCollectionCell('fluids', $index, 'time', $event)" /></template></ElTableColumn>
            <ElTableColumn label="项目" min-width="150"><template #default="{ row, $index }"><ElInput :model-value="row.name" @update:model-value="updateCollectionCell('fluids', $index, 'name', $event)" /></template></ElTableColumn>
            <ElTableColumn label="数量" width="96"><template #default="{ row, $index }"><ElInput :model-value="row.volume" @update:model-value="updateCollectionCell('fluids', $index, 'volume', $event)" /></template></ElTableColumn>
            <ElTableColumn label="单位" width="88"><template #default="{ row, $index }"><ElInput :model-value="row.unit" @update:model-value="updateCollectionCell('fluids', $index, 'unit', $event)" /></template></ElTableColumn>
            <ElTableColumn label="类别" width="120"><template #default="{ row, $index }"><ElInput :model-value="row.kind" @update:model-value="updateCollectionCell('fluids', $index, 'kind', $event)" /></template></ElTableColumn>
            <ElTableColumn label="备注" min-width="120"><template #default="{ row, $index }"><ElInput :model-value="row.remark" @update:model-value="updateCollectionCell('fluids', $index, 'remark', $event)" /></template></ElTableColumn>
            <ElTableColumn label="操作" width="72"><template #default="{ $index }"><ElButton link type="danger" @click="emit('remove-collection-row', 'fluids', $index)">删除</ElButton></template></ElTableColumn>
          </ElTable>
        </section>
      </ElTabPane>

      <ElTabPane label="术毕记录">
        <section class="anesthesia-record-editor__panel">
          <h4 class="anesthesia-record-editor__panel-title">文本记录</h4>
          <div class="anesthesia-record-editor__notes">
            <ElFormItem label="术前特殊情况"><ElInput :model-value="record.specialSituation" type="textarea" :rows="4" resize="vertical" @update:model-value="updateField('specialSituation', $event)" /></ElFormItem>
            <ElFormItem label="麻醉经过与总结"><ElInput :model-value="record.anesthesiaSummary" type="textarea" :rows="5" resize="vertical" @update:model-value="updateField('anesthesiaSummary', $event)" /></ElFormItem>
            <ElFormItem label="离室情况"><ElInput :model-value="record.outRoomCondition" type="textarea" :rows="4" resize="vertical" @update:model-value="updateField('outRoomCondition', $event)" /></ElFormItem>
            <ElFormItem label="备注"><ElInput :model-value="record.remark" type="textarea" :rows="4" resize="vertical" @update:model-value="updateField('remark', $event)" /></ElFormItem>
          </div>
        </section>

        <section class="anesthesia-record-editor__panel">
          <h4 class="anesthesia-record-editor__panel-title">签章信息</h4>
          <div class="anesthesia-record-editor__grid">
            <ElFormItem label="签字麻醉医师" class="anesthesia-record-editor__span-8"><ElInput :model-value="record.signoffDoctor" @update:model-value="updateField('signoffDoctor', $event)" /></ElFormItem>
            <ElFormItem label="审核医师" class="anesthesia-record-editor__span-8"><ElInput :model-value="record.reviewerName" @update:model-value="updateField('reviewerName', $event)" /></ElFormItem>
            <ElFormItem label="签署时间" class="anesthesia-record-editor__span-8"><ElDatePicker :model-value="record.signedDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" format="YYYY-MM-DD HH:mm:ss" style="width: 100%;" @update:model-value="updateField('signedDate', $event)" /></ElFormItem>
          </div>
        </section>
      </ElTabPane>
    </ElTabs>

    <ElDialog v-model="bulkImportVisible" title="批量导入生命体征" width="720px">
      <div class="anesthesia-record-editor__dialog-copy">
        每行格式：`时间,脉搏,收缩压,舒张压,SpO2,ETCO2,呼吸,体温`
      </div>
      <ElInput v-model="bulkImportText" type="textarea" :rows="12" resize="vertical" placeholder="例如：08:00,78,132,78,99,35,16,36.5" />
      <template #footer>
        <ElButton @click="bulkImportVisible = false">取消</ElButton>
        <ElButton type="primary" @click="applyBulkImport">应用到采样点</ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<style scoped lang="scss">
.anesthesia-record-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);

  &__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; }
  &__eyebrow { margin: 0; color: rgba(234, 88, 12, 0.84); font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
  &__title { margin: 8px 0 0; color: #0f172a; font-size: 20px; }
  &__tabs { flex: 1; min-height: 0; }
  &__panel { margin-top: 6px; padding: 16px; border-radius: 20px; border: 1px solid rgba(148, 163, 184, 0.14); background: linear-gradient(180deg, rgba(248, 251, 255, 0.96) 0%, rgba(255, 255, 255, 1) 100%); }
  &__panel + &__panel { margin-top: 14px; }
  &__panel-title { margin: 0; color: #0f172a; font-size: 15px; }
  &__section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  &__section-help { margin: 6px 0 0; color: rgba(15, 23, 42, 0.56); font-size: 12px; line-height: 1.6; }
  &__actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
  &__preset-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
  &__grid { display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); gap: 10px 12px; }
  &__span-4 { grid-column: span 4; }
  &__span-6 { grid-column: span 6; }
  &__span-8 { grid-column: span 8; }
  &__span-12 { grid-column: span 12; }
  &__notes { display: grid; gap: 12px; }
  &__dialog-copy { margin-bottom: 12px; color: rgba(15, 23, 42, 0.58); font-size: 12px; }
}

@media (max-width: 1100px) {
  .anesthesia-record-editor {
    &__section-head { flex-direction: column; align-items: stretch; }
    &__actions { justify-content: flex-start; }
    &__span-4, &__span-6, &__span-8, &__span-12 { grid-column: span 24; }
  }
}
</style>
