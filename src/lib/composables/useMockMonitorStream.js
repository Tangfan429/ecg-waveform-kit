import { onBeforeUnmount, ref, toValue, watch } from "vue";
import { getMonitorScenarioConfig } from "../demo/monitoringDemoData";

function createGaussian(x, center, width, amplitude) {
  return amplitude * Math.exp(-Math.pow((x - center) / width, 2));
}

function createEcgValue(time, signal) {
  const heartRate = signal.heartRate || 72;
  const beatPhase =
    (time * heartRate) / 60 +
    Math.sin(time * 0.7) * (signal.arrhythmia || 0) +
    Math.sin(time * 0.23 + 1.3) * (signal.arrhythmia || 0) * 0.5;
  const normalized = beatPhase - Math.floor(beatPhase);

  const waveform =
    createGaussian(normalized, 0.18, 0.028, 0.12) +
    createGaussian(normalized, 0.31, 0.01, -0.2) +
    createGaussian(normalized, 0.335, 0.0046, 1.18) +
    createGaussian(normalized, 0.36, 0.012, -0.32) +
    createGaussian(normalized, 0.62, 0.06, 0.34);
  const baseline = Math.sin(time * Math.PI * 0.32) * 0.04;
  const noise =
    Math.sin(time * Math.PI * 24) * 0.014 +
    Math.cos(time * Math.PI * 13) * 0.008;

  return waveform + baseline + noise;
}

function createRespValue(time, signal) {
  const angularVelocity = (Math.PI * 2 * (signal.respRate || 16)) / 60;
  return (
    Math.sin(time * angularVelocity) * 0.85 +
    Math.sin(time * angularVelocity * 2) * 0.08
  );
}

function createPlethValue(time, signal) {
  const heartRate = signal.heartRate || 72;
  const beat = (time * heartRate) / 60;
  const phase = beat - Math.floor(beat);
  const systolic = phase < 0.23 ? Math.sin((phase / 0.23) * Math.PI) : 0;
  const diastolic = phase >= 0.23 ? Math.exp(-(phase - 0.23) * 4.2) : 0;
  const envelope = (signal.plethAmplitude || 1) * 1.1;

  return Math.max(0, systolic * 1.12 + diastolic * 0.88) * envelope;
}

function createArtValue(time, signal) {
  const heartRate = signal.heartRate || 72;
  const beat = (time * heartRate) / 60;
  const phase = beat - Math.floor(beat);
  const pulse =
    phase < 0.18
      ? Math.sin((phase / 0.18) * Math.PI * 0.85)
      : Math.exp(-(phase - 0.18) * 4.6);
  const meanPressure = signal.meanPressure || 80;
  const pulsePressure = signal.pulsePressure || 30;

  return (
    meanPressure +
    pulse * pulsePressure +
    Math.sin(time * Math.PI * 0.12) * 3.2
  );
}

function createCo2Value(time, signal) {
  const cycle = (time * (signal.respRate || 16)) / 60;
  const phase = cycle - Math.floor(cycle);
  const level = signal.co2Level || 35;

  if (phase < 0.22) {
    return 0.5 + phase * 0.8;
  }

  if (phase < 0.55) {
    return (phase - 0.22) * (level / 0.33);
  }

  if (phase < 0.82) {
    return level + Math.sin(phase * 20) * 0.8;
  }

  return Math.max(0, level * (1 - (phase - 0.82) / 0.18));
}

function createCvpValue(time, signal) {
  const heartRate = signal.heartRate || 88;
  const beat = (time * heartRate) / 60;
  const phase = beat - Math.floor(beat);
  const baseline = signal.cvpBaseline || 8;

  return (
    baseline +
    createGaussian(phase, 0.14, 0.04, 2.1) +
    createGaussian(phase, 0.42, 0.035, 1.6) +
    createGaussian(phase, 0.7, 0.05, 1.2)
  );
}

function createChannelValue(kind, time, signal) {
  if (kind === "resp") {
    return createRespValue(time, signal);
  }

  if (kind === "pleth") {
    return createPlethValue(time, signal);
  }

  if (kind === "art") {
    return createArtValue(time, signal);
  }

  if (kind === "co2") {
    return createCo2Value(time, signal);
  }

  if (kind === "cvp") {
    return createCvpValue(time, signal);
  }

  return createEcgValue(time, signal);
}

function createChannelChunk(channel, signal, startTime, frameDuration) {
  const sampleCount = Math.max(1, Math.round(channel.samplingRate * frameDuration));
  const values = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = startTime + index / channel.samplingRate;
    values.push(createChannelValue(channel.kind, time, signal));
  }

  return values;
}

function formatTimeline(seconds) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const remainSeconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainSeconds}`;
}

function roundValue(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function createMonitorVitals(signal, time) {
  const meanPressure = signal.meanPressure || 80;
  const pulsePressure = signal.pulsePressure || 30;
  const sys = meanPressure + pulsePressure * 0.72 + Math.sin(time * 0.3) * 2.4;
  const dia = meanPressure - pulsePressure * 0.44 + Math.cos(time * 0.28) * 1.8;

  return {
    HR: Math.round((signal.heartRate || 72) + Math.sin(time * 0.55) * 3),
    RR: Math.round((signal.respRate || 16) + Math.cos(time * 0.35) * 1.4),
    SpO2: Math.min(100, Math.max(90, Math.round(97 + Math.sin(time * 0.18) * 1.2))),
    MAP: Math.round(meanPressure + Math.sin(time * 0.24) * 3),
    SYS: Math.round(sys),
    DIA: Math.round(dia),
    ETCO2: Math.round((signal.co2Level || 35) + Math.sin(time * 0.32) * 1.1),
    CVP: signal.cvpBaseline
      ? roundValue(signal.cvpBaseline + Math.sin(time * 0.25) * 0.6, 1)
      : undefined,
  };
}

function createNibpHistory(signal, elapsedSeconds) {
  const recordCount = Math.min(5, Math.max(1, Math.floor(elapsedSeconds / 12) + 1));
  const list = [];

  for (let index = 0; index < recordCount; index += 1) {
    const secondsAgo = Math.max(0, elapsedSeconds - (recordCount - 1 - index) * 12);
    const wobble = Math.sin(secondsAgo * 0.16 + index) * 2.5;
    const mean = (signal.meanPressure || 82) + wobble;
    const pulse = (signal.pulsePressure || 30) + Math.cos(secondsAgo * 0.18 + index) * 2;
    const sys = mean + pulse * 0.72;
    const dia = mean - pulse * 0.44;

    list.push({
      id: `nibp-${index}`,
      time: formatTimeline(secondsAgo),
      raw_text: `${Math.round(sys)}/${Math.round(dia)}(${Math.round(mean)}) mmHg`,
    });
  }

  return list;
}

function createMonitorWarnings(scenario, vitals, elapsedSeconds) {
  const warnings = [];

  if (scenario.key === "afib_fast") {
    warnings.push({
      id: "afib-rate",
      level: "warning",
      title: "节律提示",
      text: `心率偏快，当前 ${vitals.HR} bpm`,
      time: formatTimeline(elapsedSeconds),
    });
  }

  if (scenario.key === "invasive_support") {
    warnings.push({
      id: "art-line",
      level: "info",
      title: "有创压通道",
      text: "动脉压通道处于实时刷新状态",
      time: formatTimeline(elapsedSeconds),
    });
  }

  return warnings;
}

export function useMockMonitorStream(options = {}) {
  const payload = ref({
    source: "mock",
    waveforms: [],
    vitals: {},
    warning: [],
    nibp_history: [],
    timestamp: Date.now(),
    scenarioKey: "stable_sinus",
    scenarioLabel: "稳定窦律监护",
    monitorLabel: "通用监护仪",
    description: "",
  });
  const tickCount = ref(0);
  let timer = null;
  let elapsedSeconds = 0;

  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const emitFrame = () => {
    const scenario = getMonitorScenarioConfig(toValue(options.scenario));
    const intervalMs = Math.max(40, Number(toValue(options.intervalMs) || 80));
    const frameDuration = intervalMs / 1000;
    const frameStart = elapsedSeconds;

    elapsedSeconds += frameDuration;
    tickCount.value += 1;

    const vitals = createMonitorVitals(scenario.signal, elapsedSeconds);

    payload.value = {
      source: "mock",
      timestamp: Date.now(),
      scenarioKey: scenario.key,
      scenarioLabel: scenario.label,
      monitorLabel: scenario.monitorLabel,
      description: scenario.description,
      vitals,
      warning: createMonitorWarnings(scenario, vitals, elapsedSeconds),
      nibp_history: createNibpHistory(scenario.signal, elapsedSeconds),
      waveforms: scenario.channels.map((channel) => ({
        code: channel.code,
        label: channel.label,
        color: channel.color,
        unit: channel.unit,
        samplingRate: channel.samplingRate,
        lowerLimit: channel.lowerLimit,
        upperLimit: channel.upperLimit,
        autoRange: channel.autoRange ?? true,
        renderMode: channel.renderMode || "scroll",
        fillArea: channel.fillArea ?? true,
        y: createChannelChunk(channel, scenario.signal, frameStart, frameDuration),
      })),
    };
  };

  const start = () => {
    stop();
    elapsedSeconds = 0;
    tickCount.value = 0;
    emitFrame();

    if (!toValue(options.active)) {
      return;
    }

    const intervalMs = Math.max(40, Number(toValue(options.intervalMs) || 80));
    timer = window.setInterval(emitFrame, intervalMs);
  };

  watch(
    () => [toValue(options.scenario), toValue(options.active)],
    ([, isActive]) => {
      if (isActive) {
        start();
        return;
      }

      stop();
    },
    { immediate: true },
  );

  onBeforeUnmount(stop);

  return {
    payload,
    tickCount,
    start,
    stop,
  };
}

export default useMockMonitorStream;
