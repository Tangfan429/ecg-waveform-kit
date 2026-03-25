import { LEAD_ORDER } from "./waveformLayouts.js";

const DEFAULT_SAMPLE_RATE = 500;

const DEFAULT_MEASUREMENT_DATA = Object.freeze({
  hr: 70,
  p: 123,
  pr: 177,
  qrs: 81,
  qt: 384,
  qtc: 415,
  pAxis: 69,
  qrsAxis: 46,
  tAxis: 23,
  rv5: 1.517,
  sv1: 0.934,
  rv5sv1Sum: 2.451,
  rv6: 1.207,
  sv2: 1.278,
});

function toFiniteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeSignalChannel(channel) {
  if (!Array.isArray(channel)) {
    return [];
  }

  return channel.map((point) => toFiniteNumber(point, 0));
}

function buildWaveformData(rawDigitalEcgSignal) {
  return LEAD_ORDER.reduce((waveformData, leadName, index) => {
    waveformData[leadName] = normalizeSignalChannel(rawDigitalEcgSignal?.[index]);
    return waveformData;
  }, {});
}

function getWaveformDuration(waveformData, sampleRate) {
  const maxSamples = Math.max(
    0,
    ...Object.values(waveformData).map((channel) => channel.length),
  );

  if (!maxSamples || sampleRate <= 0) {
    return 0;
  }

  return Number((maxSamples / sampleRate).toFixed(3));
}

function formatDiagnosisText(diags) {
  const diagnosisItems = Array.isArray(diags)
    ? diags
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  return diagnosisItems
    .map((diagnosis, index) => `${index + 1}. ${diagnosis}`)
    .join("\n");
}

function buildMeasurementData(result = {}) {
  return {
    ...DEFAULT_MEASUREMENT_DATA,
    hr: toFiniteNumber(result.avgHr, DEFAULT_MEASUREMENT_DATA.hr),
    pr: toFiniteNumber(result.prIntervals, DEFAULT_MEASUREMENT_DATA.pr),
    qrs: toFiniteNumber(result.avgQrs, DEFAULT_MEASUREMENT_DATA.qrs),
    qt: toFiniteNumber(result.avgQt, DEFAULT_MEASUREMENT_DATA.qt),
    qtc: toFiniteNumber(result.avgQtc, DEFAULT_MEASUREMENT_DATA.qtc),
  };
}

export function createDiagnosisSampleViewModel(sampleData = {}) {
  const sampleRate = Math.max(
    1,
    Math.round(toFiniteNumber(sampleData.sampleRate, DEFAULT_SAMPLE_RATE)),
  );
  const waveformData = buildWaveformData(sampleData.rawDigitalEcgSignal);

  return {
    waveformData,
    sampleRate,
    duration: getWaveformDuration(waveformData, sampleRate),
    measurementData: buildMeasurementData(sampleData.result),
    prefilledDiagnosisResult: formatDiagnosisText(sampleData.result?.diags),
  };
}

export default createDiagnosisSampleViewModel;
