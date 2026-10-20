import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyPayload,
  normalizePayload,
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

test("Rascunho antigo mantém materiais e valores sem fabricar códigos; processo e CDF iniciam vínculos vazios", () => {
  const old = {
    ...emptyPayload("MTR_LR_PROCESS"),
    materials: [
      { name: "Papel", quantity: 2, unit: "KG", ibamaCode: "150101" },
    ],
  };
  delete old.processGroups;
  const normalized = normalizePayload("MTR_LR_PROCESS", old);
  assert.equal(normalized.materials[0].quantity, 2);
  assert.equal(normalized.materials[0].officialMeasureCode, "");
  assert.equal(normalized.materials[0].pev.identification, "");
  assert.deepEqual(normalized.processGroups, []);
  assert.deepEqual(emptyPayload("CDF").generators, []);
});

test("Importar PEV preserva endereço cadastrado sem inventar IBGE, CNPJ ou coordenadas de integração", () => {
  const r = collectionToDraft(
    {
      origin: {
        binId: "PEV-1",
        zipCode: "62000-000",
        street: "Rua A",
        number: "1",
        neighborhood: "Centro",
        state: "CE",
        latitude: -3.5,
        longitude: -40.1,
      },
      materials: [{ name: "Papel", unit: "KG", quantity: 2 }],
    },
    emptyPayload("MTR_LR_ORIGIN"),
  );
  assert.equal(r.materials[0].pev.identification, "PEV-1");
  assert.equal(r.materials[0].pev.postalCode, "62000000");
  assert.equal(r.materials[0].pev.municipalityCode, "");
  assert.equal(r.materials[0].pev.latitude, undefined);
  assert.equal(r.origin.taxId, "");
});
