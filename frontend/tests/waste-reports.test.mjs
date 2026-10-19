import assert from "node:assert/strict";
import test from "node:test";
import { filterInventory, csvContent } from "../src/utils/wasteReports.js";
const items = [
  {
    id: "paper",
    name: "Papel",
    category: "Reciclável",
    unit: "KG",
    status: "ACTIVE",
    lots: [
      {
        id: "one",
        lotCode: "FARDO-001",
        unit: "KG",
        status: "AVAILABLE",
        processingStage: "PRENSADO",
        originCollectionWasteEntryId: "entry-1",
      },
      {
        id: "two",
        lotCode: "FARDO-002",
        unit: "LITER",
        status: "RESERVED",
        processingStage: "ARMAZENADO",
        storageLocation: "Galpão Leste",
      },
    ],
  },
  { id: "empty", name: "Vidro", unit: "KG", status: "ACTIVE", lots: [] },
];
test("Busca por lote exclui irmãos e não modifica o estoque original", () => {
  const result = filterInventory(items, { search: "FARDO-001" });
  assert.deepEqual(
    result[0].lots.map((l) => l.id),
    ["one"],
  );
  assert.equal(items[0].lots.length, 2);
  assert.deepEqual(
    filterInventory(items, { search: "papel" })[0].lots.map((l) => l.id),
    ["one", "two"],
  );
});
test("Processamento, unidade, origem e situação são aplicados ao mesmo lote", () => {
  assert.equal(
    filterInventory(items, { unit: "KG", lotStatus: "RESERVED" }).length,
    0,
  );
  assert.equal(
    filterInventory(items, {
      processingStage: "PRENSADO",
      origin: "COLLECTION",
    })[0].lots[0].id,
    "one",
  );
  assert.equal(
    filterInventory(items, { search: "galpao", origin: "MANUAL" })[0].lots[0]
      .id,
    "two",
  );
  assert.equal(
    filterInventory(items, { processingStage: "PRENSADO", origin: "MANUAL" })
      .length,
    0,
  );
});
test("Catálogo filtra apenas dados cadastrais; materiais vazios só aparecem sem filtros de lote", () => {
  assert.equal(
    filterInventory(items, { catalog: true, search: "FARDO-001" }).length,
    0,
  );
  assert.equal(filterInventory(items).length, 2);
  assert.equal(filterInventory(items, { unit: "KG" }).length, 1);
  assert.equal(filterInventory(items, { catalog: true, unit: "KG" }).length, 2);
});
test("CSV preserva acentos, aspas, quebras de linha e neutraliza fórmulas", () => {
  const csv = csvContent(
    ["Material", "Observação"],
    [
      ["Óleo; vegetal", 'Galpão "A"\nFortaleza'],
      [" =HYPERLINK(1)", "@SUM(1)"],
      [null, 0],
    ],
  );
  assert.ok(csv.startsWith('\uFEFF"Material";"Observação"\r\n'));
  assert.ok(csv.includes('"Óleo; vegetal";"Galpão ""A""\nFortaleza"'));
  assert.ok(csv.includes('"\' =HYPERLINK(1)";"\'@SUM(1)"'));
  assert.ok(csv.endsWith('"";"0"'));
});
