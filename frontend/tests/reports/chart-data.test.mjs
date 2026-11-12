import assert from "node:assert/strict";
import { operationHeatSeries } from "../../src/components/charts/chartData.js";
const rows = operationHeatSeries(
  [
    { date: "2026-01-01", units: { KG: "40", LITER: 900 } },
    { date: "2026-01-03", units: { KG: 10 } },
    { date: "Sem data", units: { KG: 5 } },
  ],
  "2026-01-01",
  "2026-01-03",
  "KG",
);
assert.deepEqual(rows, [
  { key: "2026-01-01", name: "01/01/2026", value: 40 },
  { key: "2026-01-02", name: "02/01/2026", value: 0 },
  { key: "2026-01-03", name: "03/01/2026", value: 10 },
  { key: "Sem data", name: "Sem data", value: 5 },
]);
assert.equal(
  operationHeatSeries(
    [{ date: "2026-01-01", units: { LITER: 900 } }],
    "2026-01-01",
    "2026-01-01",
    "KG",
  )[0].value,
  0,
);
assert.equal(
  operationHeatSeries(
    [{ date: "2026-01-01", units: { LITER: 900 } }],
    "2026-01-01",
    "2026-01-01",
    "LITER",
  )[0].value,
  900,
);
console.log(
  "PASS: report heatmap preserves civil dates, fills absent days, keeps undated records separate and never adds incompatible units",
);
