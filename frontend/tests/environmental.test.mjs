import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyPayload,
  collectionToDraft,
} from "../src/components/environmental/environmentalModel.js";
test("Preparação municipal preserva desconhecido e zero, sem presumir abrangência municipal", () => {
  const draft = emptyPayload("MUNICIPAL_DECLARATION");
  assert.equal(draft.diagnosis.coverage, "OPERATIONAL_ONLY");
  assert.equal(draft.costs.selectiveCost, null);
  draft.costs.selectiveCost = 0;
  assert.equal(JSON.parse(JSON.stringify(draft)).costs.selectiveCost, 0);
  assert.equal(draft.liabilities.exists, "UNKNOWN");
});
test("Importar coleta preserva unidade e quantidade sem inventar códigos oficiais ou cidade", () => {
  const payload = emptyPayload("MTR_REGULAR", {
    name: "Cooperativa",
    municipalityCode: "2312908",
    taxId: "11222333000181",
  });
  const imported = collectionToDraft(
    {
      origin: { name: "Gerador", city: "Cruz", address: "Rua A" },
      materials: [
        { name: "Óleo", quantity: "2.5", unit: "LITER" },
        { name: "Papel", quantity: "3", unit: "KG" },
      ],
    },
    payload,
  );
  assert.deepEqual(
    imported.materials.map((m) => [m.quantity, m.unit]),
    [
      [2.5, "LITER"],
      [3, "KG"],
    ],
  );
  assert.equal(imported.origin.municipalityCode, "");
  assert.equal(imported.origin.taxId, "");
  assert.equal(imported.materials[0].ibamaCode, "");
  assert.equal(payload.origin.name, "Cooperativa");
});
test("Importação rejeita unidade desconhecida e quantidade ausente ou inválida", () => {
  const payload = emptyPayload("MTR_REGULAR");
  for (const material of [
    { unit: "UNKNOWN", quantity: 2 },
    { unit: "KG", quantity: null },
    { unit: "KG", quantity: "NaN" },
    { unit: "KG", quantity: 0 },
  ])
    assert.throws(() => collectionToDraft({ materials: [material] }, payload));
});
