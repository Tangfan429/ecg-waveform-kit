import { computed, ref, toValue, watch } from "vue";

const MIN_VISIBLE_POINTS = 2;

function quantile(values, ratio) {
  if (!values.length) {
    return NaN;
  }

  const sorted = values.slice().sort((left, right) => left - right);
  const position = (sorted.length - 1) * ratio;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = position - lowerIndex;
  return (
    sorted[lowerIndex] +
    (sorted[upperIndex] - sorted[lowerIndex]) * weight
  );
}

function sanitizeSamples(samples) {
  if (!Array.isArray(samples)) {
    return [];
  }

  return samples
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function clampBufferLength(buffer, maxLength) {
  if (buffer.length <= maxLength) {
    return buffer;
  }

  return buffer.slice(buffer.length - maxLength);
}

export function useStreamingWaveformBuffer(options = {}) {
  const buffer = ref([]);
  const displayLower = ref(Number(toValue(options.initialLower) ?? -1));
  const displayUpper = ref(Number(toValue(options.initialUpper) ?? 1));
  const latestSample = ref(NaN);
  const sweepHeadIndex = ref(0);

  const resolveSamplingRate = () =>
    Math.max(1, Number(toValue(options.samplingRate) || 1));
  const resolveWindowSeconds = () =>
    Math.max(2, Number(toValue(options.seconds) || 8));
  const resolvePadStrategy = () => toValue(options.padStrategy) || "hold";
  const resolveRenderMode = () =>
    toValue(options.mode) === "sweep" ? "sweep" : "scroll";
  const resolveVisibleLength = () =>
    Math.max(
      MIN_VISIBLE_POINTS,
      Math.round(resolveSamplingRate() * resolveWindowSeconds()),
    );
  const sweepCycleLength = computed(() => resolveVisibleLength());

  const applyFixedRange = () => {
    displayLower.value = Number(toValue(options.initialLower) ?? -1);
    displayUpper.value = Number(toValue(options.initialUpper) ?? 1);
  };

  const trimBuffer = () => {
    const bufferMaxLength = Math.max(
      Math.round(resolveVisibleLength() * 2.4),
      resolveSamplingRate() * 2,
    );

    buffer.value = clampBufferLength(buffer.value, bufferMaxLength);
  };

  const smoothRange = (targetLower, targetUpper) => {
    const span = Math.max(targetUpper - targetLower, 0.1);
    const safeLower = targetLower;
    const safeUpper = safeLower + span;

    if (
      !Number.isFinite(displayLower.value) ||
      !Number.isFinite(displayUpper.value)
    ) {
      displayLower.value = safeLower;
      displayUpper.value = safeUpper;
      return;
    }

    const expandFactor = 0.34;
    const shrinkFactor = 0.12;

    if (safeLower < displayLower.value) {
      displayLower.value += (safeLower - displayLower.value) * expandFactor;
    } else {
      displayLower.value += (safeLower - displayLower.value) * shrinkFactor;
    }

    if (safeUpper > displayUpper.value) {
      displayUpper.value += (safeUpper - displayUpper.value) * expandFactor;
    } else {
      displayUpper.value += (safeUpper - displayUpper.value) * shrinkFactor;
    }
  };

  const recalculateAutoRange = () => {
    if (!toValue(options.autoRange)) {
      applyFixedRange();
      return;
    }

    const currentBuffer = buffer.value;
    if (!currentBuffer.length) {
      applyFixedRange();
      return;
    }

    const sampleStep =
      currentBuffer.length > 1600
        ? Math.ceil(currentBuffer.length / 1600)
        : 1;
    const sampled = [];

    for (let index = 0; index < currentBuffer.length; index += sampleStep) {
      sampled.push(currentBuffer[index]);
    }

    const lowerBase = quantile(sampled, 0.06);
    const upperBase = quantile(sampled, 0.94);
    const minSpan = Number(toValue(options.minSpan) || 0.2);

    if (!Number.isFinite(lowerBase) || !Number.isFinite(upperBase)) {
      applyFixedRange();
      return;
    }

    const span = Math.max(upperBase - lowerBase, minSpan);
    const margin = span * 0.15;

    smoothRange(lowerBase - margin, upperBase + margin);
  };

  const appendSamples = (samples) => {
    const cleanSamples = sanitizeSamples(samples);

    if (!cleanSamples.length) {
      return;
    }

    latestSample.value = cleanSamples.at(-1);
    buffer.value = buffer.value.concat(cleanSamples);
    trimBuffer();
    recalculateAutoRange();

    if (resolveRenderMode() === "sweep") {
      sweepHeadIndex.value =
        (sweepHeadIndex.value + cleanSamples.length) % resolveVisibleLength();
    }
  };

  const clear = () => {
    buffer.value = [];
    latestSample.value = NaN;
    applyFixedRange();
    sweepHeadIndex.value = 0;
  };

  const visibleSamples = computed(() => {
    const samplingRate = resolveSamplingRate();
    const windowSeconds = resolveWindowSeconds();
    const targetLength = Math.max(
      MIN_VISIBLE_POINTS,
      Math.round(samplingRate * windowSeconds),
    );
    const sliced = buffer.value.slice(-targetLength);

    if (resolveRenderMode() === "sweep") {
      return sliced;
    }

    if (sliced.length >= targetLength || resolvePadStrategy() === "none") {
      return sliced;
    }

    if (!sliced.length) {
      return [];
    }

    const fillerValue =
      resolvePadStrategy() === "zero" ? 0 : Number(latestSample.value || 0);
    const result = sliced.slice();

    while (result.length < targetLength) {
      result.unshift(fillerValue);
    }

    return result;
  });

  watch(
    () => [toValue(options.seconds), toValue(options.samplingRate), toValue(options.mode)],
    () => {
      trimBuffer();
      recalculateAutoRange();
      sweepHeadIndex.value =
        resolveRenderMode() === "sweep"
          ? buffer.value.length % resolveVisibleLength()
          : 0;
    },
    { immediate: true },
  );

  watch(
    () => [
      toValue(options.initialLower),
      toValue(options.initialUpper),
      toValue(options.autoRange),
    ],
    () => {
      if (!toValue(options.autoRange)) {
        applyFixedRange();
      } else {
        recalculateAutoRange();
      }
    },
    { immediate: true },
  );

  return {
    buffer,
    visibleSamples,
    sweepCycleLength,
    displayLower,
    displayUpper,
    latestSample,
    sweepHeadIndex,
    appendSamples,
    clear,
    recalculateAutoRange,
  };
}

export default useStreamingWaveformBuffer;
