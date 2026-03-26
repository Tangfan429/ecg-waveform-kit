import { LEAD_MODE_LEAD_I } from "./leadModes";

const DEFAULT_SAMPLE_RATE = 512;
const DEFAULT_DURATION = 30;

const DEFAULT_MEASUREMENT_DATA = Object.freeze({
  hr: 0,
  p: 0,
  pr: 0,
  qrs: 0,
  qt: 0,
  qtc: 0,
  pAxis: 0,
  qrsAxis: 0,
  tAxis: 0,
  rv5: 0,
  sv1: 0,
  rv5sv1Sum: 0,
  rv6: 0,
  sv2: 0,
});

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeSignalValues(channel) {
  if (!Array.isArray(channel)) {
    return [];
  }

  return channel
    .map((point) => {
      if (typeof point === "number") {
        return toFiniteNumber(point, 0);
      }

      if (point && typeof point === "object") {
        return toFiniteNumber(
          point.voltage ?? point.value ?? point.measurement ?? point.mv,
          0,
        );
      }

      return toFiniteNumber(point, 0);
    })
    .filter((point) => Number.isFinite(point));
}

function resolveWaveformChannel(payload = {}) {
  const directChannel =
    payload.waveform ??
    payload.samples ??
    payload.voltageMeasurements ??
    payload.voltages ??
    payload.signal ??
    payload.ecg?.waveform ??
    payload.ecg?.samples ??
    payload.ecg?.voltageMeasurements ??
    payload.data?.waveform ??
    payload.data?.samples ??
    payload.record?.waveform ??
    payload.record?.samples;

  return normalizeSignalValues(directChannel);
}

function resolveSummary(payload = {}) {
  return (
    payload.summary ||
    payload.result ||
    payload.metrics ||
    payload.ecg?.summary ||
    payload.data?.summary ||
    payload.record?.summary ||
    {}
  );
}

function formatClassificationLabel(classification) {
  const normalizedValue = String(classification || "").trim();

  if (!normalizedValue) {
    return "";
  }

  const classificationMap = {
    sinus_rhythm: "窦性心律",
    atrial_fibrillation: "房颤提示",
    inconclusive: "结果不确定",
    high_heart_rate: "心率过快",
    low_heart_rate: "心率过慢",
    poor_recording: "记录质量欠佳",
  };

  return (
    classificationMap[normalizedValue] ||
    normalizedValue.replaceAll("_", " ").replace(/\b\w/gu, (char) =>
      char.toUpperCase(),
    )
  );
}

function resolveRecordedAt(payload = {}) {
  return (
    payload.recordedAt ||
    payload.recorded_at ||
    payload.endDate ||
    payload.end_date ||
    payload.startDate ||
    payload.start_date ||
    payload.ecg?.recordedAt ||
    payload.data?.recordedAt ||
    payload.record?.recordedAt ||
    ""
  );
}

function resolveSampleRate(payload = {}, waveform = []) {
  const summary = resolveSummary(payload);
  const resolvedSampleRate = Math.max(
    1,
    Math.round(
      toFiniteNumber(
        payload.sampleRate ??
          payload.samplingFrequency ??
          payload.frequency ??
          summary.sampleRate ??
          summary.samplingFrequency,
        DEFAULT_SAMPLE_RATE,
      ),
    ),
  );

  if (waveform.length) {
    return resolvedSampleRate;
  }

  return DEFAULT_SAMPLE_RATE;
}

function resolveDuration(payload = {}, waveform = [], sampleRate = DEFAULT_SAMPLE_RATE) {
  const summary = resolveSummary(payload);
  const explicitDuration = toFiniteNumber(
    payload.duration ??
      payload.durationSeconds ??
      payload.duration_seconds ??
      summary.duration ??
      summary.durationSeconds,
    0,
  );

  if (explicitDuration > 0) {
    return Number(explicitDuration.toFixed(3));
  }

  if (waveform.length && sampleRate > 0) {
    return Number((waveform.length / sampleRate).toFixed(3));
  }

  return DEFAULT_DURATION;
}

function buildMeasurementData(payload = {}) {
  const summary = resolveSummary(payload);

  return {
    ...DEFAULT_MEASUREMENT_DATA,
    hr: toFiniteNumber(
      summary.hr ??
        summary.heartRate ??
        summary.averageHeartRate ??
        payload.hr ??
        payload.heartRate,
      DEFAULT_MEASUREMENT_DATA.hr,
    ),
    pr: toFiniteNumber(
      summary.pr ??
        summary.prInterval ??
        summary.prIntervals ??
        payload.pr,
      DEFAULT_MEASUREMENT_DATA.pr,
    ),
    qrs: toFiniteNumber(
      summary.qrs ??
        summary.qrsDuration ??
        summary.avgQrs ??
        payload.qrs,
      DEFAULT_MEASUREMENT_DATA.qrs,
    ),
    qt: toFiniteNumber(
      summary.qt ?? summary.avgQt ?? payload.qt,
      DEFAULT_MEASUREMENT_DATA.qt,
    ),
    qtc: toFiniteNumber(
      summary.qtc ?? summary.avgQtc ?? payload.qtc,
      DEFAULT_MEASUREMENT_DATA.qtc,
    ),
  };
}

function buildDiagnosisText(payload = {}) {
  const summary = resolveSummary(payload);
  const diagnosisItems = [
    formatClassificationLabel(
      summary.classification ?? payload.classification ?? payload.status,
    ),
    summary.note,
    payload.note,
    ...(Array.isArray(summary.diags) ? summary.diags : []),
    ...(Array.isArray(payload.diags) ? payload.diags : []),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return diagnosisItems
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");
}

function resolveRecordID(payload = {}) {
  return String(
    payload.id ??
      payload.recordId ??
      payload.record_id ??
      payload.uuid ??
      "",
  ).trim();
}

function resolveDeviceLabel(payload = {}) {
  const device =
    payload.device ||
    payload.ecg?.device ||
    payload.data?.device ||
    payload.record?.device ||
    {};

  const deviceParts = [
    device.name,
    device.model,
    device.hardwareModel,
    device.manufacturer,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return deviceParts[0] || "";
}

export function createEmptyWatchEcgViewModel() {
  return {
    source: "apple-watch",
    sourceLabel: "Apple Watch API",
    leadMode: LEAD_MODE_LEAD_I,
    waveformData: { I: [] },
    sampleRate: DEFAULT_SAMPLE_RATE,
    duration: DEFAULT_DURATION,
    measurementData: { ...DEFAULT_MEASUREMENT_DATA },
    prefilledDiagnosisResult: "",
    recordedAt: "",
    recordId: "",
    classification: "",
    classificationCode: "",
  };
}

export function createWatchEcgViewModel(payload = {}) {
  const waveform = resolveWaveformChannel(payload);
  const sampleRate = resolveSampleRate(payload, waveform);
  const duration = resolveDuration(payload, waveform, sampleRate);
  const summary = resolveSummary(payload);
  const classificationCode = String(
    summary.classification ?? payload.classification ?? payload.status ?? "",
  ).trim();

  return {
    source: "apple-watch",
    sourceLabel: "Apple Watch API",
    leadMode: LEAD_MODE_LEAD_I,
    waveformData: {
      I: waveform,
    },
    sampleRate,
    duration,
    measurementData: buildMeasurementData(payload),
    prefilledDiagnosisResult: buildDiagnosisText(payload),
    recordedAt: resolveRecordedAt(payload),
    recordId: resolveRecordID(payload),
    classification: formatClassificationLabel(classificationCode),
    classificationCode,
  };
}

export function createWatchEcgHistoryItem(payload = {}) {
  const summary = resolveSummary(payload);
  const sampleRate = resolveSampleRate(payload);
  const duration = resolveDuration(payload, [], sampleRate);
  const classificationCode = String(
    summary.classification ?? payload.classification ?? payload.status ?? "",
  ).trim();
  const heartRate = toFiniteNumber(
    summary.hr ??
      summary.heartRate ??
      summary.averageHeartRate ??
      payload.hr ??
      payload.heartRate,
    0,
  );

  return {
    id: resolveRecordID(payload),
    patientId: String(payload.patientId || payload.patient_id || "").trim(),
    encounterId: String(payload.encounterId || payload.encounter_id || "").trim(),
    sourceRecordId: String(
      payload.sourceRecordId ?? payload.source_record_id ?? "",
    ).trim(),
    recordedAt: resolveRecordedAt(payload),
    sampleRate,
    duration,
    leadMode: String(payload.leadMode || payload.lead_mode || LEAD_MODE_LEAD_I).trim(),
    leadName: String(payload.leadName || payload.lead_name || "I").trim(),
    classification: formatClassificationLabel(classificationCode),
    classificationCode,
    heartRate,
    deviceLabel: resolveDeviceLabel(payload),
  };
}

export default createWatchEcgViewModel;
