const WATCH_ANALYSIS_TABS = Object.freeze([
  { key: "waveform", label: "波形分析" },
  { key: "template", label: "平均模板" },
  { key: "rhythm", label: "R峰/RR" },
  { key: "spectrum", label: "频谱心电" },
]);

const WATCH_AVERAGE_TEMPLATE_LEAD_OPTIONS = Object.freeze([
  { value: "I", label: "I" },
]);

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function roundNumber(value, digits = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(numericValue * factor) / factor;
}

function normalizeWaveform(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((point) => toFiniteNumber(point, NaN))
    .filter((point) => Number.isFinite(point));
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middleIndex];
  }

  return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}

function standardDeviation(values) {
  if (values.length <= 1) {
    return 0;
  }

  const averageValue = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - averageValue) ** 2, 0) /
    (values.length - 1);

  return Math.sqrt(Math.max(0, variance));
}

function quantile(values, ratio) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const normalizedRatio = Math.min(1, Math.max(0, Number(ratio) || 0));
  const position = (sorted.length - 1) * normalizedRatio;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = position - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

function createOddWindowSize(sampleRate, milliseconds, minimumSize = 3) {
  let size = Math.max(
    minimumSize,
    Math.round((Math.max(1, Number(sampleRate) || 1) * milliseconds) / 1000),
  );

  if (size % 2 === 0) {
    size += 1;
  }

  return size;
}

function movingAverage(values, windowSize) {
  if (!values.length) {
    return [];
  }

  const safeWindowSize = Math.max(1, Math.floor(windowSize) || 1);
  const halfWindow = Math.floor(safeWindowSize / 2);
  const prefixSums = new Array(values.length + 1).fill(0);

  for (let index = 0; index < values.length; index += 1) {
    prefixSums[index + 1] = prefixSums[index] + values[index];
  }

  return values.map((_, index) => {
    const startIndex = Math.max(0, index - halfWindow);
    const endIndex = Math.min(values.length - 1, index + halfWindow);
    const total = prefixSums[endIndex + 1] - prefixSums[startIndex];
    return total / Math.max(1, endIndex - startIndex + 1);
  });
}

function highPassWaveform(values, sampleRate) {
  if (!values.length) {
    return [];
  }

  const baselineWindowSize = createOddWindowSize(sampleRate, 180, 9);
  const smoothingWindowSize = createOddWindowSize(sampleRate, 12, 3);
  const baseline = movingAverage(values, baselineWindowSize);
  const centeredValues = values.map((value, index) => value - baseline[index]);

  return movingAverage(centeredValues, smoothingWindowSize);
}

function refinePeakIndex(values, centerIndex, radius) {
  let resolvedIndex = centerIndex;
  let resolvedMagnitude = Math.abs(values[centerIndex] || 0);

  for (
    let index = Math.max(0, centerIndex - radius);
    index <= Math.min(values.length - 1, centerIndex + radius);
    index += 1
  ) {
    const magnitude = Math.abs(values[index] || 0);
    if (magnitude > resolvedMagnitude) {
      resolvedIndex = index;
      resolvedMagnitude = magnitude;
    }
  }

  return resolvedIndex;
}

function detectRPeakIndexes(values, sampleRate) {
  if (values.length < 3) {
    return [];
  }

  const absoluteValues = values.map((value) => Math.abs(value));
  const maxMagnitude = Math.max(...absoluteValues, 0);

  if (maxMagnitude <= 0) {
    return [];
  }

  const threshold = Math.max(
    maxMagnitude * 0.22,
    quantile(absoluteValues, 0.985) * 0.34,
    standardDeviation(absoluteValues) * 2.1,
  );
  const refractorySamples = Math.max(
    1,
    Math.round((Math.max(1, Number(sampleRate) || 1) * 240) / 1000),
  );
  const refinementRadius = Math.max(
    1,
    Math.round((Math.max(1, Number(sampleRate) || 1) * 30) / 1000),
  );
  const peakIndexes = [];

  for (let index = 1; index < absoluteValues.length - 1; index += 1) {
    const currentMagnitude = absoluteValues[index];

    if (currentMagnitude < threshold) {
      continue;
    }

    if (
      currentMagnitude < absoluteValues[index - 1] ||
      currentMagnitude < absoluteValues[index + 1]
    ) {
      continue;
    }

    const refinedIndex = refinePeakIndex(values, index, refinementRadius);
    const lastAcceptedIndex = peakIndexes[peakIndexes.length - 1];

    if (
      Number.isFinite(lastAcceptedIndex) &&
      refinedIndex - lastAcceptedIndex < refractorySamples
    ) {
      if (absoluteValues[refinedIndex] > absoluteValues[lastAcceptedIndex]) {
        peakIndexes[peakIndexes.length - 1] = refinedIndex;
      }
      continue;
    }

    peakIndexes.push(refinedIndex);
  }

  return peakIndexes.filter(
    (peakIndex, index) =>
      index === 0 || peakIndex > peakIndexes[index - 1],
  );
}

function buildRrIntervals(peakIndexes, sampleRate) {
  if (peakIndexes.length < 2) {
    return [];
  }

  return peakIndexes
    .slice(1)
    .map((peakIndex, index) =>
      ((peakIndex - peakIndexes[index]) / Math.max(1, sampleRate)) * 1000,
    )
    .filter((value) => Number.isFinite(value) && value > 0);
}

function buildAverageTemplate(values, peakIndexes, sampleRate) {
  const preSamples = Math.max(1, Math.round(sampleRate * 0.28));
  const postSamples = Math.max(1, Math.round(sampleRate * 0.42));
  const segmentLength = preSamples + postSamples + 1;
  const validPeakIndexes = peakIndexes.filter(
    (peakIndex) =>
      peakIndex - preSamples >= 0 &&
      peakIndex + postSamples < values.length,
  );
  const segments = validPeakIndexes.map((peakIndex) => {
    const rawSegment = values.slice(
      peakIndex - preSamples,
      peakIndex + postSamples + 1,
    );
    const baseline = mean(
      rawSegment.slice(0, Math.max(8, Math.round(preSamples * 0.25))),
    );

    return rawSegment.map((point) => point - baseline);
  });

  if (!segments.length) {
    return {
      wave: [],
      markers: [],
      segmentCount: 0,
      templateDurationMs: 0,
    };
  }

  const averageWave = new Array(segmentLength).fill(0);

  segments.forEach((segment) => {
    segment.forEach((point, index) => {
      averageWave[index] += point;
    });
  });

  const normalizedWave = averageWave.map((point) =>
    roundNumber(point / segments.length, 4),
  );

  return {
    wave: normalizedWave,
    markers: [
      {
        key: "R",
        ratio: preSamples / Math.max(1, segmentLength - 1),
        width: 16,
      },
    ],
    segmentCount: segments.length,
    templateDurationMs: roundNumber((segmentLength / sampleRate) * 1000, 0),
  };
}

function computeSpectrumPoints(values, sampleRate) {
  if (!values.length) {
    return [];
  }

  const downsampleFactor =
    sampleRate > 128 ? Math.max(1, Math.round(sampleRate / 128)) : 1;
  const downsampledSampleRate = sampleRate / downsampleFactor;
  const downsampledValues = values.filter(
    (_, index) => index % downsampleFactor === 0,
  );
  const spectrumSamples = downsampledValues.slice(
    0,
    Math.min(downsampledValues.length, 2048),
  );

  if (spectrumSamples.length < 16) {
    return [];
  }

  const averageValue = mean(spectrumSamples);
  const normalizedSamples = spectrumSamples.map((value, index) => {
    const window =
      0.5 *
      (1 -
        Math.cos(
          (2 * Math.PI * index) / Math.max(1, spectrumSamples.length - 1),
        ));

    return (value - averageValue) * window;
  });
  const frequencies = Array.from({ length: 21 }, (_, index) => index * 2);

  return frequencies.map((frequency) => {
    if (frequency === 0) {
      return {
        frequency,
        amplitude: roundNumber(
          Math.abs(mean(normalizedSamples)) * 1000,
          4,
        ),
      };
    }

    let realPart = 0;
    let imaginaryPart = 0;

    normalizedSamples.forEach((value, index) => {
      const angle =
        (2 * Math.PI * frequency * index) / Math.max(1, downsampledSampleRate);
      realPart += value * Math.cos(angle);
      imaginaryPart -= value * Math.sin(angle);
    });

    return {
      frequency,
      amplitude: roundNumber(
        (Math.hypot(realPart, imaginaryPart) / normalizedSamples.length) * 1000,
        4,
      ),
    };
  });
}

function buildSpectrumData(values, sampleRate) {
  const points = computeSpectrumPoints(values, sampleRate);

  if (!points.length) {
    return {
      title: "频谱心电",
      subtitle: "Lead I 频域分析将在拿到足够波形点后生成。",
      activeLead: "I",
      leadOptions: ["I"],
      points: [],
      bands: [],
      summaryRows: [
        { label: "状态", value: "等待足够波形数据" },
      ],
      markers: [],
    };
  }

  const bandDefinitions = [
    { label: "VLF", rangeLabel: "0-5Hz", min: 0, max: 5 },
    { label: "LF", rangeLabel: "5-15Hz", min: 5, max: 15 },
    { label: "MF", rangeLabel: "15-25Hz", min: 15, max: 25 },
    { label: "HF", rangeLabel: "25-40Hz", min: 25, max: 40 },
  ];
  const totalAmplitude = points.reduce(
    (sum, point) => sum + Math.max(0, point.amplitude),
    0,
  );
  const bands = bandDefinitions.map((definition) => {
    const bandAmplitude = points
      .filter(
        (point) =>
          point.frequency >= definition.min && point.frequency < definition.max,
      )
      .reduce((sum, point) => sum + Math.max(0, point.amplitude), 0);

    return {
      label: definition.label,
      range: definition.rangeLabel,
      power:
        totalAmplitude > 0
          ? `${roundNumber((bandAmplitude / totalAmplitude) * 100, 1)}%`
          : "--",
      amplitude: bandAmplitude,
    };
  });
  const sortedPeaks = points
    .filter((point) => point.frequency > 0)
    .sort((left, right) => right.amplitude - left.amplitude);
  const mainPeak = sortedPeaks[0] || null;
  const secondaryPeak = sortedPeaks[1] || null;
  const spectrumCentroid =
    totalAmplitude > 0
      ? points.reduce(
          (sum, point) => sum + point.frequency * Math.max(0, point.amplitude),
          0,
        ) / totalAmplitude
      : 0;
  const lowAmplitude = bands
    .filter((band) => ["LF", "MF"].includes(band.label))
    .reduce((sum, band) => sum + band.amplitude, 0);
  const highAmplitude = bands.find((band) => band.label === "HF")?.amplitude || 0;

  return {
    title: "频谱心电",
    subtitle: "对 Apple Watch Lead I 波形做简化频域分解，观察主频和能量带分布。",
    activeLead: "I",
    leadOptions: ["I"],
    points,
    bands: bands.map(({ amplitude, ...band }) => band),
    summaryRows: [
      {
        label: "主峰频率",
        value: mainPeak ? `${roundNumber(mainPeak.frequency, 1)}Hz` : "--",
      },
      {
        label: "次峰频率",
        value: secondaryPeak
          ? `${roundNumber(secondaryPeak.frequency, 1)}Hz`
          : "--",
      },
      {
        label: "频谱重心",
        value: `${roundNumber(spectrumCentroid, 1)}Hz`,
      },
      {
        label: "低/高频比",
        value:
          highAmplitude > 0
            ? roundNumber(lowAmplitude / highAmplitude, 2).toFixed(2)
            : "--",
      },
    ],
    markers: [mainPeak, secondaryPeak]
      .filter(Boolean)
      .map((peak, index) => ({
        label: index === 0 ? "主峰" : "次峰",
        frequency: peak.frequency,
      })),
  };
}

function buildAverageTemplateRows({
  recordedAt,
  recordId,
  sampleRate,
  waveformLength,
  classificationLabel,
  heartRate,
  peakCount,
  rrIntervalsMs,
  averageTemplate,
}) {
  const averageRr = rrIntervalsMs.length ? roundNumber(mean(rrIntervalsMs), 0) : 0;
  const minRr = rrIntervalsMs.length ? roundNumber(Math.min(...rrIntervalsMs), 0) : 0;
  const maxRr = rrIntervalsMs.length ? roundNumber(Math.max(...rrIntervalsMs), 0) : 0;
  const sdnn = rrIntervalsMs.length ? roundNumber(standardDeviation(rrIntervalsMs), 0) : 0;

  return [
    { label: "记录编号", value: recordId || "--" },
    { label: "记录时间", value: recordedAt || "--" },
    { label: "采样率", value: `${sampleRate}Hz` },
    { label: "波形点数", value: String(waveformLength) },
    { label: "分类", value: classificationLabel || "--" },
    { label: "平均HR", value: heartRate ? `${heartRate}bpm` : "--" },
    { label: "检测R峰", value: String(peakCount) },
    { label: "平均RR(ms)", value: averageRr ? String(averageRr) : "--" },
    { label: "最短RR(ms)", value: minRr ? String(minRr) : "--" },
    { label: "最长RR(ms)", value: maxRr ? String(maxRr) : "--" },
    { label: "SDNN(ms)", value: sdnn ? String(sdnn) : "--" },
    {
      label: "模板叠加数",
      value: String(averageTemplate.segmentCount || 0),
    },
    {
      label: "模板窗长",
      value: averageTemplate.templateDurationMs
        ? `${averageTemplate.templateDurationMs}ms`
        : "--",
    },
  ];
}

function buildRhythmData({
  sampleRate,
  duration,
  peakIndexes,
  rrIntervalsMs,
  classificationLabel,
  heartRate,
}) {
  const averageRr = rrIntervalsMs.length ? roundNumber(mean(rrIntervalsMs), 0) : 0;
  const medianRr = rrIntervalsMs.length ? roundNumber(median(rrIntervalsMs), 0) : 0;
  const sdnn = rrIntervalsMs.length ? roundNumber(standardDeviation(rrIntervalsMs), 0) : 0;
  const rrSeries = rrIntervalsMs.map((value, index) => ({
    key: `rr-${index + 1}`,
    label: `RR${index + 1}`,
    value: roundNumber(value, 0),
    timeSeconds: roundNumber(peakIndexes[index + 1] / Math.max(1, sampleRate), 2),
  }));

  return {
    title: "R峰 / RR 分析",
    subtitle: "基于 Lead I 波形自动检测 R 峰，并统计相邻心搏间期变化。",
    leadName: "I",
    sampleRate,
    duration,
    classificationLabel: classificationLabel || "--",
    summaryRows: [
      { label: "检测R峰", value: String(peakIndexes.length) },
      { label: "RR间期", value: String(rrIntervalsMs.length) },
      { label: "平均HR", value: heartRate ? `${heartRate} bpm` : "--" },
      { label: "平均RR", value: averageRr ? `${averageRr} ms` : "--" },
      { label: "中位RR", value: medianRr ? `${medianRr} ms` : "--" },
      { label: "SDNN", value: sdnn ? `${sdnn} ms` : "--" },
    ],
    rrSeries,
    intervalRows: rrSeries.slice(-12).reverse(),
  };
}

export function createEmptyWatchLeadAnalysis() {
  return {
    supportedAnalysisTabs: WATCH_ANALYSIS_TABS,
    averageTemplateData: {
      sampleRate: 0,
      leadOptions: WATCH_AVERAGE_TEMPLATE_LEAD_OPTIONS,
      defaultLead: "I",
      wavesByLead: { I: [] },
      measurementRowsByLead: {
        I: [{ label: "状态", value: "等待 Apple Watch ECG 数据" }],
      },
      markers: [],
    },
    rhythmData: {
      title: "R峰 / RR 分析",
      subtitle: "等待 Apple Watch Lead I 波形数据。",
      leadName: "I",
      sampleRate: 0,
      duration: 0,
      classificationLabel: "--",
      summaryRows: [{ label: "状态", value: "暂无记录" }],
      rrSeries: [],
      intervalRows: [],
    },
    spectrumData: {
      title: "频谱心电",
      subtitle: "等待 Apple Watch Lead I 波形数据。",
      activeLead: "I",
      leadOptions: ["I"],
      points: [],
      bands: [],
      summaryRows: [{ label: "状态", value: "暂无记录" }],
      markers: [],
    },
  };
}

export function analyzeWatchLead(viewModel = {}) {
  const waveform = normalizeWaveform(viewModel.waveformData?.I);

  if (!waveform.length) {
    return createEmptyWatchLeadAnalysis();
  }

  const sampleRate = Math.max(1, Math.round(toFiniteNumber(viewModel.sampleRate, 512)));
  const duration =
    toFiniteNumber(viewModel.duration, 0) > 0
      ? roundNumber(viewModel.duration, 3)
      : roundNumber(waveform.length / sampleRate, 3);
  const filteredWaveform = highPassWaveform(waveform, sampleRate);
  const peakIndexes = detectRPeakIndexes(filteredWaveform, sampleRate);
  const rrIntervalsMs = buildRrIntervals(peakIndexes, sampleRate);
  const computedHeartRate =
    rrIntervalsMs.length > 0 ? roundNumber(60000 / median(rrIntervalsMs), 0) : 0;
  const summaryHeartRate = roundNumber(
    toFiniteNumber(viewModel.measurementData?.hr, 0),
    0,
  );
  const resolvedHeartRate = computedHeartRate || summaryHeartRate;
  const averageTemplate = buildAverageTemplate(
    filteredWaveform,
    peakIndexes,
    sampleRate,
  );
  const averageTemplateRows = buildAverageTemplateRows({
    recordedAt: viewModel.recordedAt,
    recordId: viewModel.recordId,
    sampleRate,
    waveformLength: waveform.length,
    classificationLabel: viewModel.classification,
    heartRate: resolvedHeartRate,
    peakCount: peakIndexes.length,
    rrIntervalsMs,
    averageTemplate,
  });

  return {
    supportedAnalysisTabs: WATCH_ANALYSIS_TABS,
    averageTemplateData: {
      sampleRate,
      leadOptions: WATCH_AVERAGE_TEMPLATE_LEAD_OPTIONS,
      defaultLead: "I",
      wavesByLead: {
        I: averageTemplate.wave,
      },
      measurementRowsByLead: {
        I: averageTemplateRows,
      },
      markers: averageTemplate.markers,
    },
    rhythmData: buildRhythmData({
      sampleRate,
      duration,
      peakIndexes,
      rrIntervalsMs,
      classificationLabel: viewModel.classification,
      heartRate: resolvedHeartRate,
    }),
    spectrumData: buildSpectrumData(filteredWaveform, sampleRate),
  };
}

export const WATCH_SUPPORTED_ANALYSIS_TABS = WATCH_ANALYSIS_TABS;

export default analyzeWatchLead;
