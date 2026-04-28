import assert from "node:assert/strict";
import test from "node:test";

import {
  HIGH_FREQUENCY_ECG_TABLE_COLUMNS,
  createHighFrequencyTemplateWaveform,
  createRhythmStripWaveform,
  getHighFrequencyLeadOptions,
  normalizeHighFrequencyEcgData,
} from "./highFrequencyEcg.js";

test("normalizeHighFrequencyEcgData keeps the figma-aligned defaults", () => {
  const result = normalizeHighFrequencyEcgData({
    activeLead: "II",
    waveform: [0, 0.6, -0.2, 0.4],
    highFrequencyLeads: [
      { lead: "I", waveform: [0, 1, 0] },
      { lead: "II", waveform: [0, -1, 0] },
    ],
    tableRows: [{ type: "N", I: 0, II: 2, total: 2 }],
  });

  assert.equal(result.controls.gain, "30mm/mV");
  assert.equal(result.controls.speed, "300mm/s");
  assert.equal(result.controls.leadGroup, "肢体导联");
  assert.equal(result.controls.activeLead, "II");
  assert.equal(result.rhythm.lead, "II");
  assert.equal(result.rhythm.durationSeconds, 10);
  assert.deepEqual(
    result.tableColumns.map((column) => column.key),
    HIGH_FREQUENCY_ECG_TABLE_COLUMNS.map((column) => column.key),
  );
  assert.deepEqual(result.tableRows[0], {
    type: "N",
    I: 0,
    II: 2,
    III: "",
    aVR: "",
    aVL: "",
    aVF: "",
    V1: "",
    V2: "",
    V3: "",
    V4: "",
    V5: "",
    V6: "",
    total: 2,
  });
});

test("normalizeHighFrequencyEcgData falls back from legacy leadProfiles", () => {
  const result = normalizeHighFrequencyEcgData({
    activeLead: "V1",
    waveform: [0, 0.5, -0.4],
    leadProfiles: [
      { lead: "V1", energy: 88 },
      { lead: "V2", energy: 76 },
    ],
  });

  assert.equal(result.controls.activeLead, "V1");
  assert.equal(result.highFrequencyLeads.length, 2);
  assert.equal(result.highFrequencyLeads[0].lead, "V1");
  assert.deepEqual(result.highFrequencyLeads[0].waveform, [0, 0.5, -0.4]);
  assert.equal(result.tableRows.length, 3);
});

test("getHighFrequencyLeadOptions links the lead dropdown to the lead group", () => {
  assert.deepEqual(getHighFrequencyLeadOptions("肢体导联"), [
    "I",
    "II",
    "III",
    "aVR",
    "aVL",
    "aVF",
  ]);
  assert.deepEqual(getHighFrequencyLeadOptions("胸导联"), [
    "V1",
    "V2",
    "V3",
    "V4",
    "V5",
    "V6",
  ]);
});

test("high-frequency demo waveforms use template morphology instead of continuous oscillation", () => {
  const template = createHighFrequencyTemplateWaveform({ lead: "II" });
  const rhythm = createRhythmStripWaveform({ lead: "II" });

  assert.equal(template.length, 180);
  assert.equal(rhythm.length, 500);
  assert.ok(Math.max(...template) > 0.8);
  assert.ok(Math.min(...template) < -0.15);

  const highSlopeCount = template
    .slice(1)
    .filter((value, index) => Math.abs(value - template[index]) > 0.12).length;

  assert.ok(highSlopeCount < 34);
});
