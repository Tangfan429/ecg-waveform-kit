import { dynamicBloodPressureReport, dynamicEcgReport } from "./reportAssets";
import { ecgData } from "./sampleStandardEcg";
import { createDiagnosisSampleViewModel } from "../utils/sampleDataAdapter";

const createSpectrumPoints = () =>
  Array.from({ length: 28 }, (_, index) => {
    const frequency = index * 2;
    const envelope = Math.exp(-Math.pow((frequency - 18) / 12, 2)) * 28;
    const ripple = (Math.sin(index * 0.72) + 1.1) * 4.6;

    return {
      frequency,
      amplitude: Number((envelope + ripple + 2.8).toFixed(2)),
    };
  });

const createHighFrequencySeries = (length = 180) =>
  Array.from({ length }, (_, index) => {
    const phase = index / 7.2;
    const burst = Math.sin(index / 18) * 0.22 + 0.92;

    return Number(
      (
        Math.sin(phase * 2.8) * 0.82 * burst +
        Math.cos(phase * 1.4) * 0.28 +
        Math.sin(phase * 5.1) * 0.16
      ).toFixed(4),
    );
  });

const createEnvelopeSeries = (length = 180) =>
  Array.from({ length }, (_, index) =>
    Number(
      (
        0.34 +
        Math.abs(Math.sin(index / 16)) * 0.42 +
        Math.cos(index / 33) * 0.08
      ).toFixed(4),
    ),
  );

const createVectorLoopPoints = ({ amplitudeX, amplitudeY, phaseShift = 0 }) =>
  Array.from({ length: 42 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 41 + phaseShift;

    return {
      x: Number((Math.cos(angle) * amplitudeX + Math.sin(angle * 2) * 0.18).toFixed(4)),
      y: Number((Math.sin(angle) * amplitudeY + Math.cos(angle * 1.5) * 0.14).toFixed(4)),
    };
  });

export const demoStandardEcg = createDiagnosisSampleViewModel(ecgData);

export const demoReports = Object.freeze({
  dynamic_ecg: dynamicEcgReport,
  dynamic_bp: dynamicBloodPressureReport,
});

export const demoStandardPrintMeta = Object.freeze({
  hospitalName: "公司通用波形组件示例",
  reportTitle: "十二导联心电图",
  examItem: "标准化波形打印演示",
  examTime: "2026-03-25 10:30:00",
  registrationNo: "WF-20260325-001",
  patientName: "演示患者",
  gender: "男",
  age: 42,
  department: "心电中心",
  ward: "演示病区",
  patientType: "outpatient",
  patientNo: "DEMO-0001",
  diagnosisDoctor: "系统用户",
  diagnosisTime: "2026-03-25 10:36:00",
  diagnosisResult: "窦性心律\n节律规则\n用于演示通用波形打印模板。",
  qtQtcText: "352/415ms",
  axisText: "46°",
});

export const demoSpectrumAnalysis = Object.freeze({
  title: "频谱心电",
  subtitle: "统一展示频域能量分布、频带摘要和关键频点标记。",
  activeLead: "II",
  leadOptions: ["I", "II", "V1", "V5"],
  points: createSpectrumPoints(),
  bands: [
    { label: "VLF", range: "0-5Hz", power: "14.2%" },
    { label: "LF", range: "5-15Hz", power: "39.7%" },
    { label: "MF", range: "15-25Hz", power: "31.5%" },
    { label: "HF", range: "25-40Hz", power: "14.6%" },
  ],
  summaryRows: [
    { label: "主峰频率", value: "18Hz" },
    { label: "频谱重心", value: "16.4Hz" },
    { label: "低频/高频比", value: "2.72" },
    { label: "工频干扰", value: "已滤除" },
  ],
  markers: [
    { label: "主峰", frequency: 18 },
    { label: "次峰", frequency: 28 },
  ],
});

export const demoHighFrequencyEcg = Object.freeze({
  title: "高频心电",
  subtitle: "聚焦晚电位、高频碎裂及导联能量画像的复用工作台。",
  activeLead: "V1",
  riskLevel: "轻度异常",
  leadProfiles: [
    { lead: "V1", energy: 88, rms40: 21, las40: 41 },
    { lead: "V2", energy: 76, rms40: 24, las40: 38 },
    { lead: "V3", energy: 62, rms40: 27, las40: 33 },
    { lead: "V5", energy: 48, rms40: 32, las40: 27 },
  ],
  waveform: createHighFrequencySeries(),
  envelope: createEnvelopeSeries(),
  summaryRows: [
    { label: "fQRS", value: "2 导联" },
    { label: "RMS40", value: "24μV" },
    { label: "LAS40", value: "38ms" },
    { label: "噪声水平", value: "0.34μV" },
  ],
});

export const demoQtDispersion = Object.freeze({
  title: "QT离散度",
  subtitle: "按导联排序展示 QT / QTc 差异和离散权重。",
  rows: [
    { lead: "I", qt: 404, qtc: 420 },
    { lead: "II", qt: 412, qtc: 436 },
    { lead: "III", qt: 397, qtc: 418 },
    { lead: "aVF", qt: 388, qtc: 409 },
    { lead: "V2", qt: 419, qtc: 447 },
    { lead: "V5", qt: 392, qtc: 401 },
  ],
  summaryRows: [
    { label: "QT最大值", value: "419ms" },
    { label: "QT最小值", value: "388ms" },
    { label: "QTc离散度", value: "46ms" },
    { label: "平均QTc", value: "421ms" },
  ],
  maxLead: "V2 / 447ms",
  minLead: "V5 / 401ms",
});

export const demoVectorEcg = Object.freeze({
  title: "心电向量",
  subtitle: "提供额面、横面、侧面向量环的通用展示底座。",
  loops: [
    {
      key: "frontal",
      label: "额面向量环",
      plane: "Frontal",
      color: "#3562ec",
      points: createVectorLoopPoints({ amplitudeX: 0.92, amplitudeY: 0.74 }),
    },
    {
      key: "horizontal",
      label: "横面向量环",
      plane: "Horizontal",
      color: "#2ba471",
      points: createVectorLoopPoints({ amplitudeX: 0.76, amplitudeY: 0.94, phaseShift: 0.38 }),
    },
    {
      key: "sagittal",
      label: "侧面向量环",
      plane: "Sagittal",
      color: "#0ea5e9",
      points: createVectorLoopPoints({ amplitudeX: 0.68, amplitudeY: 0.82, phaseShift: -0.26 }),
    },
  ],
  summaryRows: [
    { label: "QRS主轴", value: "+46°" },
    { label: "T环方向", value: "+28°" },
    { label: "最大向量", value: "1.42mV" },
    { label: "环形态", value: "顺时针" },
  ],
});