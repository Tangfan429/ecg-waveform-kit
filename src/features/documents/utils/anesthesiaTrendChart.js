const BP_RANGE = Object.freeze({
  min: 40,
  max: 200,
});

const PULSE_RANGE = Object.freeze({
  min: 40,
  max: 160,
});

const createLinePath = (points) =>
  points.reduce((path, point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${path}${command}${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
  }, "").trim();

const resolveValueY = (value, range, top, bottom) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  const ratio = (value - range.min) / (range.max - range.min);
  return bottom - Math.max(0, Math.min(1, ratio)) * (bottom - top);
};

export const createAnesthesiaTrendChartModel = ({
  timelineSlots,
  trendSeries,
  width = 990,
  height = 320,
}) => {
  const chartPadding = {
    top: 24,
    right: 28,
    bottom: 68,
    left: 44,
  };
  const bpZone = {
    top: chartPadding.top,
    bottom: 176,
  };
  const pulseZone = {
    top: 196,
    bottom: 280,
  };
  const timelineWidth = Math.max(1, width - chartPadding.left - chartPadding.right);
  const slotCount = Math.max(1, timelineSlots.length - 1);

  const slotPositions = timelineSlots.map((slotLabel, index) => ({
    label: slotLabel,
    x: chartPadding.left + (timelineWidth / slotCount) * index,
  }));

  const verticalLines = slotPositions.map((slot) => ({
    x: slot.x,
    y1: bpZone.top,
    y2: pulseZone.bottom,
  }));

  const bpAxisValues = [200, 180, 160, 140, 120, 100, 80, 60, 40];
  const pulseAxisValues = [160, 140, 120, 100, 80, 60, 40];

  const bpHorizontalLines = bpAxisValues.map((value) => ({
    value,
    y: resolveValueY(value, BP_RANGE, bpZone.top, bpZone.bottom),
  }));
  const pulseHorizontalLines = pulseAxisValues.map((value) => ({
    value,
    y: resolveValueY(value, PULSE_RANGE, pulseZone.top, pulseZone.bottom),
  }));

  const bpSegments = [];
  const pulsePoints = [];
  const auxiliaryRows = trendSeries.map((point, index) => {
    const x = slotPositions[index]?.x ?? chartPadding.left;
    const systolicY = resolveValueY(
      point.systolic,
      BP_RANGE,
      bpZone.top,
      bpZone.bottom,
    );
    const diastolicY = resolveValueY(
      point.diastolic,
      BP_RANGE,
      bpZone.top,
      bpZone.bottom,
    );
    const pulseY = resolveValueY(
      point.pulse,
      PULSE_RANGE,
      pulseZone.top,
      pulseZone.bottom,
    );

    if (systolicY !== null && diastolicY !== null) {
      bpSegments.push({
        x,
        systolicY,
        diastolicY,
      });
    }

    if (pulseY !== null) {
      pulsePoints.push({
        x,
        y: pulseY,
        value: point.pulse,
      });
    }

    return {
      x,
      spo2: point.spo2,
      etco2: point.etco2,
      respiration: point.respiration,
      temperature: point.temperature,
    };
  });

  return {
    width,
    height,
    bpHorizontalLines,
    pulseHorizontalLines,
    verticalLines,
    slotPositions,
    bpSegments,
    pulsePoints,
    pulsePath: createLinePath(pulsePoints),
    auxiliaryRows,
    bpZone,
    pulseZone,
    chartPadding,
  };
};
