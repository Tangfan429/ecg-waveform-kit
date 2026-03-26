import { onBeforeUnmount, ref, toValue, watch } from "vue";
import { getVentilatorScenarioConfig } from "../demo/monitoringDemoData";

function getCyclePhase(time, rate) {
  const beats = (time * rate) / 60;
  return beats - Math.floor(beats);
}

function createVentilatorState(time, signal) {
  const rate = signal.rate || 16;
  const phase = getCyclePhase(time, rate);
  const inspiratoryRatio = signal.inspiratoryRatio || 0.35;
  const peep = signal.peep || 5;
  const pip = signal.pip || 22;
  const plateau = signal.plateau || pip - 3;
  const tidalVolume = signal.tidalVolume || 480;
  const inspirationDuration = inspiratoryRatio;

  let pressure = peep;
  let flow = 0;
  let volume = 0;

  if (phase < inspirationDuration) {
    const inspirationPhase = phase / inspirationDuration;
    pressure =
      peep +
      (pip - peep) *
        Math.sin(Math.min(1, inspirationPhase * 1.25) * Math.PI * 0.5);
    pressure =
      inspirationPhase > 0.55
        ? plateau + (pip - plateau) * (1 - inspirationPhase)
        : pressure;
    flow =
      signal.inspiratoryFlow * (1 - inspirationPhase * 0.68) +
      Math.sin(inspirationPhase * Math.PI) * 3.2;
    volume =
      tidalVolume *
      Math.min(
        1,
        0.15 + inspirationPhase * 0.92 - inspirationPhase * inspirationPhase * 0.08,
      );
  } else {
    const expirationPhase =
      (phase - inspirationDuration) / (1 - inspirationDuration);
    pressure = peep + Math.exp(-expirationPhase * 5.4) * (plateau - peep);
    flow = (signal.expiratoryFlow || -28) * Math.exp(-expirationPhase * 2.8);
    volume = tidalVolume * Math.exp(-expirationPhase * 2.1);
  }

  pressure += Math.sin(time * Math.PI * 0.14) * 0.45;
  flow += Math.sin(time * Math.PI * 0.35) * 0.7;
  volume = Math.max(0, volume + Math.sin(time * Math.PI * 0.2) * 6);

  return {
    pressure,
    flow,
    volume,
  };
}

function createWaveChunk(channel, signal, startTime, frameDuration) {
  const sampleCount = Math.max(
    1,
    Math.round(channel.samplingRate * frameDuration),
  );
  const values = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = startTime + index / channel.samplingRate;
    const state = createVentilatorState(time, signal);

    if (channel.code === "FLOW") {
      values.push(state.flow);
      continue;
    }

    if (channel.code === "VOLUME") {
      values.push(state.volume);
      continue;
    }

    values.push(state.pressure);
  }

  return values;
}

function createLoopPoints(signal) {
  const loopPoints = [];
  const pointCount = 120;

  for (let index = 0; index < pointCount; index += 1) {
    const time = index / pointCount / ((signal.rate || 16) / 60);
    const state = createVentilatorState(time, signal);

    loopPoints.push({
      pressureVolume: [state.volume, state.pressure],
      flowPressure: [state.flow, state.pressure],
      volumeFlow: [state.volume, state.flow],
    });
  }

  return {
    "Paw-V": loopPoints.map((item) => item.pressureVolume),
    "Flow-Paw": loopPoints.map((item) => item.flowPressure),
    "V-Flow": loopPoints.map((item) => item.volumeFlow),
  };
}

function formatMetricValue(value, digits = 0) {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}

function createVentilatorMetrics(scenario, currentState) {
  const signal = scenario.signal;
  const ieDenominator = Math.max(
    1,
    Math.round((1 - signal.inspiratoryRatio) / signal.inspiratoryRatio),
  );
  const minuteVentilation = (signal.tidalVolume * signal.rate) / 1000;

  return [
    {
      id: "resp-rate",
      name: "呼吸频率",
      unit: "次/分",
      preset_value: signal.rate,
      value: Math.round(
        signal.rate + Math.sin(currentState.pressure * 0.02) * 1.2,
      ),
    },
    {
      id: "tidal-volume",
      name: "潮气量",
      unit: "mL",
      preset_value: signal.tidalVolume,
      value: Math.round(
        signal.tidalVolume + Math.sin(currentState.volume * 0.004) * 12,
      ),
    },
    {
      id: "peep",
      name: "PEEP",
      unit: "cmH2O",
      preset_value: signal.peep,
      value: formatMetricValue(
        signal.peep + Math.sin(currentState.pressure * 0.08) * 0.3,
        1,
      ),
    },
    {
      id: "pip",
      name: "PIP",
      unit: "cmH2O",
      preset_value: signal.pip,
      value: formatMetricValue(
        signal.pip + Math.cos(currentState.pressure * 0.04) * 0.6,
        1,
      ),
    },
    {
      id: "minute-ventilation",
      name: "分钟通气量",
      unit: "L/min",
      preset_value: formatMetricValue(minuteVentilation, 1),
      value: formatMetricValue(
        minuteVentilation + Math.sin(currentState.flow * 0.03) * 0.3,
        1,
      ),
    },
    {
      id: "ie-ratio",
      name: "I:E",
      unit: "",
      preset_value: `1:${ieDenominator}`,
      value: `1:${ieDenominator}`,
    },
  ];
}

function createVentilatorWarnings(scenario, currentState, timestamp) {
  const warnings = [];

  if (scenario.key === "pressure_control") {
    warnings.push({
      id: "pressure-platform",
      level: "info",
      title: "平台压趋势",
      text: `平台压 ${formatMetricValue(currentState.pressure, 1)} cmH2O`,
      time: timestamp,
    });
  }

  if (scenario.key === "weaning_trial") {
    warnings.push({
      id: "weaning-observe",
      level: "warning",
      title: "撤机观察",
      text: "自主呼吸增强，请关注流速回零情况。",
      time: timestamp,
    });
  }

  return warnings;
}

export function useMockVentilatorStream(options = {}) {
  const payload = ref({
    source: "mock",
    waveList: [],
    circleList: [],
    list: [],
    warning: [],
    timestamp: Date.now(),
    scenarioKey: "ac_volume",
    scenarioLabel: "容量控制通气",
    ventilatorLabel: "呼吸机",
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
    const scenario = getVentilatorScenarioConfig(toValue(options.scenario));
    const intervalMs = Math.max(50, Number(toValue(options.intervalMs) || 90));
    const frameDuration = intervalMs / 1000;
    const frameStart = elapsedSeconds;

    elapsedSeconds += frameDuration;
    tickCount.value += 1;

    const loops = createLoopPoints(scenario.signal);
    const currentState = createVentilatorState(elapsedSeconds, scenario.signal);
    const frameTime = new Date().toLocaleTimeString();

    payload.value = {
      source: "mock",
      timestamp: Date.now(),
      scenarioKey: scenario.key,
      scenarioLabel: scenario.label,
      ventilatorLabel: scenario.ventilatorLabel,
      description: scenario.description,
      list: createVentilatorMetrics(scenario, currentState),
      warning: createVentilatorWarnings(scenario, currentState, frameTime),
      waveList: scenario.waveforms.map((waveform) => ({
        name: waveform.code,
        label: waveform.label,
        color: waveform.color,
        unit: waveform.unit,
        samplingRate: waveform.samplingRate,
        lowerLimit: waveform.lowerLimit,
        upperLimit: waveform.upperLimit,
        autoRange: waveform.autoRange ?? false,
        renderMode: waveform.renderMode || "sweep",
        fillArea: waveform.fillArea ?? false,
        value: createWaveChunk(
          waveform,
          scenario.signal,
          frameStart,
          frameDuration,
        ),
      })),
      circleList: scenario.loops.map((loop) => ({
        name: loop.key,
        label: loop.label,
        xUnit: loop.xUnit,
        yUnit: loop.yUnit,
        color: loop.color,
        list: loops[loop.key] || [],
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

    const intervalMs = Math.max(50, Number(toValue(options.intervalMs) || 90));
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

export default useMockVentilatorStream;
