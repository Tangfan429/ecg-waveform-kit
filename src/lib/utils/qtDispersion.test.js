import assert from "node:assert/strict";
import test from "node:test";

import {
  QT_DISPERSION_LEADS,
  createQtDispersionLeadWaveform,
  getSelectableQtBeats,
  normalizeQtDispersionData,
  validateQtBeatSelection,
} from "./qtDispersion.js";

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
