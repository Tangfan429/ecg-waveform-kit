import { dynamicBloodPressureReport, dynamicEcgReport } from "./reportAssets";
import { ecgData } from "./sampleStandardEcg";
import { createDiagnosisSampleViewModel } from "../utils/sampleDataAdapter";

function createSpectrumSeries({
  xMax = 25,
  step = 0.1,
  peaks = [],
  baseline = 0,
  ripple = 0,
  decay = 0,
  clampMin = null,
} = {}) {
  const points = [];

  for (let x = 0; x <= xMax + 1e-6; x += step) {
    let y = baseline;

    peaks.forEach((peak) => {
      const width = Math.max(0.12, Number(peak.width) || 0.4);
      y +=
        (Number(peak.amplitude) || 0) *
        Math.exp(-Math.pow((x - peak.frequency) / width, 2));
    });

    if (ripple) {
      y += Math.sin(x * 2.2) * ripple + Math.cos(x * 0.75) * ripple * 0.35;
    }

    if (decay) {
      y *= Math.exp(-x / decay);
    }

    const resolvedY =
      clampMin === null ? y : Math.max(Number(clampMin) || 0, y);

    points.push({
      x: Number(x.toFixed(2)),
      y: Number(resolvedY.toFixed(3)),
    });
  }

  return points;
}

function createDualLeadPowerSeries(scale = 1) {
  return createSpectrumSeries({
    peaks: [
      { frequency: 2.1, amplitude: 780 * scale, width: 0.22 },
      { frequency: 3.7, amplitude: 880 * scale, width: 0.22 },
      { frequency: 5.2, amplitude: 1180 * scale, width: 0.24 },
      { frequency: 6.8, amplitude: 760 * scale, width: 0.24 },
      { frequency: 8.4, amplitude: 560 * scale, width: 0.28 },
      { frequency: 10.2, amplitude: 540 * scale, width: 0.28 },
      { frequency: 12.0, amplitude: 420 * scale, width: 0.28 },
      { frequency: 13.9, amplitude: 360 * scale, width: 0.3 },
      { frequency: 15.8, amplitude: 260 * scale, width: 0.34 },
      { frequency: 17.6, amplitude: 190 * scale, width: 0.36 },
      { frequency: 19.3, amplitude: 130 * scale, width: 0.38 },
      { frequency: 21.0, amplitude: 90 * scale, width: 0.4 },
      { frequency: 22.6, amplitude: 55 * scale, width: 0.42 },
    ],
    baseline: 2,
    ripple: 5,
    clampMin: 0,
  });
}

function createLeadPowerSeries({ baseScale, leadShift = 0, tailScale = 1 }) {
  return createSpectrumSeries({
    peaks: [
      { frequency: 1.2 + leadShift * 0.06, amplitude: 120 * baseScale, width: 0.25 },
      { frequency: 3.4 + leadShift * 0.04, amplitude: 160 * baseScale, width: 0.28 },
      { frequency: 4.8 + leadShift * 0.03, amplitude: 200 * baseScale, width: 0.26 },
      { frequency: 6.0 + leadShift * 0.03, amplitude: 150 * baseScale, width: 0.26 },
      { frequency: 7.2 + leadShift * 0.05, amplitude: 132 * baseScale, width: 0.28 },
      { frequency: 8.5 + leadShift * 0.06, amplitude: 118 * baseScale, width: 0.3 },
      { frequency: 9.7 + leadShift * 0.08, amplitude: 98 * baseScale * tailScale, width: 0.3 },
      { frequency: 10.9 + leadShift * 0.08, amplitude: 90 * baseScale * tailScale, width: 0.32 },
      { frequency: 12.0 + leadShift * 0.08, amplitude: 82 * baseScale * tailScale, width: 0.32 },
      { frequency: 13.1 + leadShift * 0.08, amplitude: 76 * baseScale * tailScale, width: 0.34 },
      { frequency: 14.3 + leadShift * 0.08, amplitude: 68 * baseScale * tailScale, width: 0.34 },
      { frequency: 15.2 + leadShift * 0.08, amplitude: 54 * baseScale * tailScale, width: 0.36 },
      { frequency: 16.1 + leadShift * 0.08, amplitude: 46 * baseScale * tailScale, width: 0.38 },
      { frequency: 17.0 + leadShift * 0.08, amplitude: 38 * baseScale * tailScale, width: 0.38 },
      { frequency: 18.0 + leadShift * 0.08, amplitude: 32 * baseScale * tailScale, width: 0.4 },
      { frequency: 19.0 + leadShift * 0.08, amplitude: 24 * baseScale * tailScale, width: 0.4 },
      { frequency: 20.0 + leadShift * 0.08, amplitude: 18 * baseScale * tailScale, width: 0.44 },
      { frequency: 21.2 + leadShift * 0.08, amplitude: 12 * baseScale * tailScale, width: 0.46 },
    ],
    baseline: 3,
    ripple: 4,
    clampMin: 0,
  });
}

function createPhaseShiftSeries() {
  return createSpectrumSeries({
    peaks: [
      { frequency: 0.4, amplitude: 165, width: 0.18 },
      { frequency: 0.9, amplitude: -135, width: 0.2 },
      { frequency: 1.7, amplitude: 128, width: 0.18 },
      { frequency: 2.1, amplitude: -120, width: 0.18 },
      { frequency: 2.8, amplitude: 118, width: 0.18 },
      { frequency: 5.8, amplitude: 70, width: 0.24 },
      { frequency: 16.0, amplitude: -42, width: 0.24 },
      { frequency: 23.5, amplitude: 38, width: 0.28 },
    ],
    baseline: 0,
    ripple: 12,
  });
}

function createImpulseResponseSeries() {
  return createSpectrumSeries({
    peaks: [
      { frequency: 1.0, amplitude: 9, width: 0.28 },
      { frequency: 3.1, amplitude: -6, width: 0.26 },
      { frequency: 6.0, amplitude: 7, width: 0.28 },
      { frequency: 9.4, amplitude: -8, width: 0.26 },
      { frequency: 12.0, amplitude: 58, width: 0.08 },
      { frequency: 12.2, amplitude: -14, width: 0.08 },
      { frequency: 15.1, amplitude: 10, width: 0.28 },
      { frequency: 18.0, amplitude: -9, width: 0.26 },
      { frequency: 24.0, amplitude: 6, width: 0.3 },
    ],
    baseline: 0,
    ripple: 3.2,
  });
}

function createCrossCorrelationSeries() {
  return createSpectrumSeries({
    peaks: [
      { frequency: 3.2, amplitude: 18, width: 0.12 },
      { frequency: 6.1, amplitude: 42, width: 0.11 },
      { frequency: 9.2, amplitude: 58, width: 0.11 },
      { frequency: 12.0, amplitude: 73, width: 0.1 },
      { frequency: 15.0, amplitude: 61, width: 0.11 },
      { frequency: 18.1, amplitude: 43, width: 0.12 },
      { frequency: 21.2, amplitude: 21, width: 0.12 },
      { frequency: 24.8, amplitude: 6, width: 0.15 },
    ],
    baseline: 0,
    ripple: 4,
  });
}

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
  modeOptions: [
    { key: "dual-lead", label: "双导对应谱分析" },
    { key: "twelve-lead", label: "12导联功率谱" },
  ],
  defaultMode: "dual-lead",
  dualLead: {
    panels: {
      phaseShift: {
        title: "相移图(QXY)",
        xUnit: "Hz",
        yUnit: "",
        xMin: 0,
        xMax: 25,
        yMin: -180,
        yMax: 180,
        yTickCount: 5,
        series: [{ color: "#ebb768", points: createPhaseShiftSeries() }],
        notes: ["D", "-", "PV", "-", "M", "-"],
      },
      transferAmplitude: {
        title: "幅频图(HXY)",
        xUnit: "Hz",
        yUnit: "",
        xMin: 0,
        xMax: 25,
        yMin: 0,
        yMax: 5,
        yTickCount: 6,
        series: [
          {
            color: "#ebb768",
            points: createSpectrumSeries({
              peaks: [
                { frequency: 0.2, amplitude: 3.8, width: 0.14 },
                { frequency: 0.7, amplitude: 2.2, width: 0.16 },
                { frequency: 2.9, amplitude: 2.8, width: 0.14 },
                { frequency: 22.8, amplitude: 1.8, width: 0.36 },
              ],
              baseline: 0.6,
              ripple: 0.18,
              clampMin: 0,
            }),
          },
        ],
      },
      coherence: {
        title: "相干函数(RF)",
        xUnit: "Hz",
        yUnit: "",
        xMin: 0,
        xMax: 25,
        yMin: 0,
        yMax: 1,
        yTickCount: 3,
        series: [
          {
            color: "#ebb768",
            points: createSpectrumSeries({
              peaks: [],
              baseline: 1,
              ripple: 0,
              clampMin: 1,
            }),
          },
        ],
        notes: ["Cp", "-", "CT", "-", "CbL", "-"],
      },
      impulseResponse: {
        title: "脉冲响应(PIH)",
        xUnit: "",
        yUnit: "",
        xMin: 0,
        xMax: 25,
        yMin: -20,
        yMax: 70,
        yTickCount: 3,
        series: [{ color: "#ebb768", points: createImpulseResponseSeries() }],
        notes: ["PV", "-", "M", "-"],
      },
      crossCorrelation: {
        title: "互相关(XYV)",
        xUnit: "",
        yUnit: "",
        xMin: 0,
        xMax: 25,
        yMin: -20,
        yMax: 90,
        yTickCount: 3,
        series: [{ color: "#ebb768", points: createCrossCorrelationSeries() }],
        notes: ["RV", "-", "RD", "-", "NW", "+"],
      },
    },
    powerChart: {
      title: "功率谱图(V5-II)",
      xUnit: "Hz",
      yUnit: "pW",
      xMin: 0,
      xMax: 25,
      yMin: 0,
      yMax: 4050,
      yTickCount: 6,
      series: [
        { color: "#efb45e", points: createDualLeadPowerSeries(2.9) },
        { color: "#55c2d7", points: createDualLeadPowerSeries(1.45) },
      ],
      notes: ["1/2", "1-N", "5/10", "TU"],
      legendItems: [
        { label: "V5", color: "#efb45e" },
        { label: "II", color: "#55c2d7" },
      ],
    },
  },
  twelveLead: {
    charts: [
      { leadName: "I", title: "I", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 616, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 3.1, leadShift: 0.1, tailScale: 0.7 }) }] },
      { leadName: "V1", title: "V1", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 1260, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 6.2, leadShift: 0.7, tailScale: 1.05 }) }] },
      { leadName: "II", title: "II", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 834, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 4.2, leadShift: 0.3, tailScale: 0.85 }) }] },
      { leadName: "V2", title: "V2", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 2698, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 12.4, leadShift: 1.1, tailScale: 1.1 }) }] },
      { leadName: "III", title: "III", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 110, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 0.62, leadShift: 0.4, tailScale: 0.9 }) }] },
      { leadName: "V3", title: "V3", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 1050, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 5.5, leadShift: 1.4, tailScale: 1.15 }) }] },
      { leadName: "aVR", title: "aVR", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 707, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 3.8, leadShift: 0.2, tailScale: 0.75 }) }] },
      { leadName: "V4", title: "V4", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 1094, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 5.8, leadShift: 1.6, tailScale: 1.05 }) }] },
      { leadName: "aVL", title: "aVL", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 205, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 1.15, leadShift: 0.15, tailScale: 0.65 }) }] },
      { leadName: "V5", title: "V5", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 1282, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 6.1, leadShift: 1.9, tailScale: 0.98 }) }] },
      { leadName: "aVF", title: "aVF", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 277, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 1.55, leadShift: 0.45, tailScale: 0.82 }) }] },
      { leadName: "V6", title: "V6", xUnit: "Hz", yUnit: "pW", xMin: 0, xMax: 25, yMin: 0, yMax: 1023, yTickCount: 2, series: [{ color: "#e8b66b", points: createLeadPowerSeries({ baseScale: 5.1, leadShift: 2.1, tailScale: 0.92 }) }] },
    ],
  },
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
