import assert from "node:assert/strict";
import test from "node:test";

import {
  QT_DISPERSION_GRID_CONFIG,
  QT_DISPERSION_LEADS,
  createQtDispersionLeadWaveform,
  drawQtDispersionGrid,
  getSelectableQtBeats,
  normalizeQtDispersionData,
  validateQtBeatSelection,
} from "./qtDispersion.js";

function createRecordingContext() {
  const calls = [];
  const ctx = {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    beginPath() {
      calls.push(["beginPath"]);
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
    stroke() {
      calls.push(["stroke", ctx.strokeStyle, ctx.lineWidth, ctx.lineCap]);
    },
  };

  return ctx;
}

test("validateQtBeatSelection accepts exactly one eligible beat in single-beat mode", () => {
  const beats = [
    { id: "b1", kind: "normal", blocked: false, tWaveClear: true },
    { id: "b2", kind: "normal", blocked: false, tWaveClear: true },
  ];

  assert.deepEqual(validateQtBeatSelection({ mode: "single", selectedBeatIds: ["b1"], beats }), {
    valid: true,
    reason: "",
  });
  assert.equal(
    validateQtBeatSelection({ mode: "single", selectedBeatIds: ["b1", "b2"], beats }).valid,
    false,
  );
});

test("validateQtBeatSelection enforces three consecutive clean sinus beats", () => {
  const beats = [
    { id: "b1", kind: "normal", blocked: false, tWaveClear: true },
    { id: "b2", kind: "normal", blocked: false, tWaveClear: true },
    { id: "b3", kind: "normal", blocked: false, tWaveClear: true },
    { id: "b4", kind: "pvc", blocked: false, tWaveClear: true },
  ];

  assert.equal(
    validateQtBeatSelection({ mode: "three", selectedBeatIds: ["b1", "b2", "b3"], beats }).valid,
    true,
  );
  assert.equal(
    validateQtBeatSelection({ mode: "three", selectedBeatIds: ["b2", "b3", "b4"], beats }).valid,
    false,
  );
});

test("getSelectableQtBeats excludes ectopic, blocked, and unclear T-wave beats", () => {
  const beats = [
    { id: "b1", kind: "normal", blocked: false, tWaveClear: true },
    { id: "b2", kind: "pac", blocked: false, tWaveClear: true },
    { id: "b3", kind: "normal", blocked: true, tWaveClear: true },
    { id: "b4", kind: "normal", blocked: false, tWaveClear: false },
  ];

  assert.deepEqual(getSelectableQtBeats(beats).map((beat) => beat.id), ["b1"]);
});

test("normalizeQtDispersionData calculates QTd and QTcd from lead measurements", () => {
  const result = normalizeQtDispersionData({
    rows: [
      { lead: "I", qt: 404, qtc: 420 },
      { lead: "V2", qt: 419, qtc: 447 },
      { lead: "V5", qt: 392, qtc: 401 },
    ],
  });

  assert.equal(result.measurementRows.length, QT_DISPERSION_LEADS.length);
  assert.equal(result.summary.qtd, 27);
  assert.equal(result.summary.qtcd, 46);
  assert.deepEqual(result.extremes.maxQtc, { lead: "V2", value: 447 });
  assert.deepEqual(result.extremes.minQtc, { lead: "V5", value: 401 });
});

test("createQtDispersionLeadWaveform creates ECG-like data with visible beats", () => {
  const waveform = createQtDispersionLeadWaveform({ lead: "II" });

  assert.equal(waveform.length, 720);
  assert.ok(Math.max(...waveform) > 0.8);
  assert.ok(Math.min(...waveform) < -0.1);
});

test("drawQtDispersionGrid uses waveform-analysis ECG paper density", () => {
  assert.equal(QT_DISPERSION_GRID_CONFIG.smallGridSize, 5);
  assert.equal(QT_DISPERSION_GRID_CONFIG.largeGridSize, 25);

  const ctx = createRecordingContext();

  drawQtDispersionGrid(ctx, 55, 30);

  assert.deepEqual(ctx.calls[0], [
    "fillRect",
    QT_DISPERSION_GRID_CONFIG.backgroundColor,
    0,
    0,
    55,
    30,
  ]);
  assert.ok(
    ctx.calls.some(
      (call) =>
        call[0] === "fillRect" &&
        call[1] === QT_DISPERSION_GRID_CONFIG.smallGridColor &&
        call[4] === QT_DISPERSION_GRID_CONFIG.dotSize &&
        call[5] === QT_DISPERSION_GRID_CONFIG.dotSize,
    ),
  );
  assert.ok(
    ctx.calls.some(
      (call) =>
        call[0] === "stroke" &&
        call[1] === QT_DISPERSION_GRID_CONFIG.largeGridColor &&
        call[2] === 1 &&
        call[3] === "butt",
    ),
  );
  assert.ok(
    ctx.calls.some(
      (call) => call[0] === "moveTo" && call[1] === 25.5 && call[2] === 0,
    ),
  );
});
