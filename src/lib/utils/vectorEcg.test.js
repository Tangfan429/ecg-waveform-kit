import assert from "node:assert/strict";
import test from "node:test";

import {
  VECTOR_ECG_DEFAULT_PLOTS,
  createVectorEcgDemoLoopPoints,
  drawVectorEcg3dPanel,
  drawVectorEcgPlot,
  drawVectorWaveformPanel,
  getVisibleVectorPlots,
  normalizeVectorEcgData,
} from "./vectorEcg.js";

function createRecordingContext() {
  const calls = [];
  const ctx = {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    setLineDash(value) {
      calls.push(["setLineDash", [...value]]);
    },
    beginPath() {
      calls.push(["beginPath"]);
    },
    closePath() {
      calls.push(["closePath"]);
    },
    fillRect(...args) {
      calls.push(["fillRect", ctx.fillStyle, ...args]);
    },
    moveTo(...args) {
      calls.push(["moveTo", ...args]);
    },
    lineTo(...args) {
      calls.push(["lineTo", ...args]);
    },
    ellipse(...args) {
      calls.push(["ellipse", ...args]);
    },
    arc(...args) {
      calls.push(["arc", ...args]);
    },
    stroke() {
      calls.push(["stroke", ctx.strokeStyle, ctx.lineWidth, ctx.lineCap, ctx.lineJoin]);
    },
    fill() {
      calls.push(["fill", ctx.fillStyle]);
    },
    fillText(...args) {
      calls.push(["fillText", ctx.fillStyle, ctx.font, ctx.textAlign, ctx.textBaseline, ...args]);
    },
    clearRect(...args) {
      calls.push(["clearRect", ...args]);
    },
  };

  return ctx;
}

function getPathBeforeStroke(calls, strokeIndex) {
  const pathCalls = [];

  for (let index = strokeIndex - 1; index >= 0; index -= 1) {
    const call = calls[index];
    if (call[0] === "beginPath") break;
    if (call[0] === "moveTo" || call[0] === "lineTo") {
      pathCalls.unshift(call);
    }
  }

  return pathCalls;
}

test("normalizeVectorEcgData builds figma-aligned professional controls", () => {
  const result = normalizeVectorEcgData({
    activePlane: "F",
    activeLoop: "QRS",
    activeScale: "10mm/mV",
    activeRatio: "50/10/20 mm/mv",
    plots: [
      {
        key: "frontal",
        label: "额面向量图",
        plane: "Frontal",
        loops: [{ key: "qrs", color: "#D54941", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
      },
    ],
    parameterRows: [{ label: "QRS最大向量", value: "1.42mV" }],
  });

  assert.equal(result.title, "心电向量");
  assert.equal(result.activePlane, "frontal");
  assert.equal(result.activeLoop, "qrs");
  assert.equal(result.activeScale, "10mm/mV");
  assert.equal(result.activeRatio, "50/10/20 mm/mv");
  assert.equal(result.planeModes[0].label, "波形");
  assert.equal(result.ratioOptions[0].label, "100/20/40 mm/mv");
  assert.equal(result.planeModes.at(-1).label, "ALL");
  assert.equal(result.loopModes.at(-1).label, "ALL");
  assert.equal(result.plots.length, VECTOR_ECG_DEFAULT_PLOTS.length);
  assert.deepEqual(result.plots.map((plot) => plot.key), [
    "frontal",
    "horizontal",
    "sagittal",
  ]);
  assert.equal(result.plots[0].loops[0].key, "qrs");
  assert.equal(result.parameterRows[0].label, "QRS最大向量");
  assert.deepEqual(result.waveformSeries.map((series) => series.key), ["x", "y", "z"]);
  assert.equal("quality" in result, false);
  assert.equal("diagnosisLines" in result, false);
});

test("createVectorEcgDemoLoopPoints returns bounded vector loop points", () => {
  const points = createVectorEcgDemoLoopPoints({ amplitudeX: 0.8, amplitudeY: 0.6 });

  assert.equal(points.length, 42);
  assert.ok(points.every((point) => Math.abs(point.x) <= 1));
  assert.ok(points.every((point) => Math.abs(point.y) <= 1));
  assert.notEqual(points[0].x, points[points.length - 1].x);
});

test("drawVectorEcgPlot paints polar grid, labels, and colored loops", () => {
  const ctx = createRecordingContext();
  const plot = normalizeVectorEcgData().plots[0];

  drawVectorEcgPlot(ctx, {
    width: 360,
    height: 260,
    plot,
  });

  assert.deepEqual(ctx.calls[0], ["clearRect", 0, 0, 360, 260]);
  assert.ok(ctx.calls.some((call) => call[0] === "fillRect" && call[1] === "#FFFCFD"));
  assert.ok(ctx.calls.some((call) => call[0] === "ellipse"));
  assert.ok(ctx.calls.some((call) => call[0] === "setLineDash" && call[1].join(",") === "1,4"));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("Ⅲ")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("Y")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("额面(F)")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("0.04%")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("99.71%")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("20mm/mV")));
  assert.ok(
    ctx.calls.some(
      (call) => call[0] === "stroke" && call[1] === plot.loops[0].color,
    ),
  );
});

test("drawVectorEcgPlot uses vectorcardiography polar background without ECG paper grid", () => {
  const ctx = createRecordingContext();

  drawVectorEcgPlot(ctx, {
    width: 722,
    height: 396,
    plot: normalizeVectorEcgData().plots[0],
  });

  const strokes = ctx.calls.filter((call) => call[0] === "stroke");
  const verticalGridLines = strokes.filter(
    (call) => call[1] === "#EDAAB7" && call[2] === 1,
  );
  const finePolarRings = strokes.filter(
    (call) => call[1] === "#F6C6D1" && call[2] === 1,
  );
  const majorPolarRings = strokes.filter(
    (call) => call[1] === "#EDAAB7" && call[2] === 1.1,
  );
  const segmentRays = strokes.filter(
    (call) => call[1] === "#C5C5C5" && call[2] === 1,
  );
  const axisLines = strokes.filter(
    (call) => call[1] === "#181818" && call[2] === 1.2,
  );

  assert.equal(verticalGridLines.length, 0);
  assert.ok(finePolarRings.length > 24);
  assert.ok(majorPolarRings.length >= 5);
  assert.ok(segmentRays.length >= 4);
  assert.equal(axisLines.length, 2);
});

test("getVisibleVectorPlots returns two figma primary panels in ALL mode", () => {
  const plots = normalizeVectorEcgData().plots;

  assert.deepEqual(getVisibleVectorPlots(plots, "all").map((plot) => plot.key), [
    "frontal",
    "horizontal",
  ]);
});

test("drawVectorEcgPlot filters loop series by selected mode", () => {
  const ctx = createRecordingContext();
  const plot = normalizeVectorEcgData().plots[0];

  drawVectorEcgPlot(ctx, {
    width: 360,
    height: 260,
    plot,
    loopMode: "qrs",
  });

  const strokeColors = ctx.calls
    .filter((call) => call[0] === "stroke")
    .map((call) => call[1]);

  assert.ok(strokeColors.includes(plot.loops[1].color));
  assert.equal(strokeColors.includes(plot.loops[0].color), false);
  assert.equal(strokeColors.includes(plot.loops[2].color), false);
});

test("getVisibleVectorPlots returns one plane or all professional planes", () => {
  const plots = normalizeVectorEcgData().plots;

  assert.deepEqual(getVisibleVectorPlots(plots, "waveform").map((plot) => plot.key), []);
  assert.deepEqual(getVisibleVectorPlots(plots, "horizontal").map((plot) => plot.key), ["horizontal"]);
  assert.deepEqual(getVisibleVectorPlots(plots, "sagittal").map((plot) => plot.key), ["sagittal"]);
});

test("drawVectorWaveformPanel paints centered black X Y Z template on dotted ECG paper", () => {
  const ctx = createRecordingContext();
  const { waveformSeries } = normalizeVectorEcgData();

  drawVectorWaveformPanel(ctx, {
    width: 722,
    height: 396,
    waveformSeries,
    scale: "20mm/mV",
  });

  assert.deepEqual(ctx.calls[0], ["clearRect", 0, 0, 722, 396]);
  assert.ok(ctx.calls.some((call) => call[0] === "fillRect" && call[1] === "#FFFCFD"));
  assert.ok(ctx.calls.some((call) => call[0] === "fillRect" && call[1] === "#FAEEF1"));
  assert.ok(ctx.calls.some((call) => call[0] === "stroke" && call[1] === "#F3E0E0"));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("X")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("Y")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("Z")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("50mm/s 20m/mv")));

  const blackStrokeIndexes = ctx.calls
    .map((call, index) => [call, index])
    .filter(([call]) => call[0] === "stroke" && call[1] === "#000000")
    .map(([, index]) => index);
  const markerStrokes = ctx.calls.filter((call) => call[0] === "stroke" && call[1] === "#2BA471");

  assert.equal(blackStrokeIndexes.length, 3);
  assert.ok(markerStrokes.length >= 15);
  assert.equal(ctx.calls.some((call) => call[0] === "stroke" && call[1] === waveformSeries[0].color), false);

  const firstWavePath = getPathBeforeStroke(ctx.calls, blackStrokeIndexes[0]);
  const xPositions = firstWavePath.map((call) => call[1]);
  assert.ok(Math.min(...xPositions) > 722 * 0.28);
  assert.ok(Math.max(...xPositions) < 722 * 0.58);
  assert.ok(Math.max(...xPositions) - Math.min(...xPositions) < 722 * 0.24);
});

test("drawVectorEcg3dPanel paints projected axes and selected spatial loops", () => {
  const ctx = createRecordingContext();
  const data = normalizeVectorEcgData();

  drawVectorEcg3dPanel(ctx, {
    width: 360,
    height: 260,
    plots: data.plots,
    loopMode: "qrs",
  });

  assert.deepEqual(ctx.calls[0], ["clearRect", 0, 0, 360, 260]);
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("3D")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("X")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("Y")));
  assert.ok(ctx.calls.some((call) => call[0] === "fillText" && call.includes("Z")));
  assert.ok(ctx.calls.some((call) => call[0] === "stroke" && call[1] === data.plots[0].loops[1].color));
});
