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

test("Visão de lotes válidos separa anulações sem apagar a origem ou alterar os dados", () => {
  const original = [
    {
      id: "paper",
      name: "Papelão",
      unit: "KG",
      lots: [
        { id: "sold", unit: "KG", status: "SOLD", quantity: 50 },
        {
          id: "cancel-a",
          unit: "KG",
          status: "CANCELLED",
          quantity: 50,
          originCollectionWasteEntryId: "same-entry",
        },
        {
          id: "cancel-b",
          unit: "KG",
          status: "CANCELLED",
          quantity: 50,
          originCollectionWasteEntryId: "same-entry",
        },
      ],
    },
    {
      id: "only-cancelled",
      name: "Vidro",
      lots: [
        { id: "cancel-c", status: "CANCELLED", unit: "LITER", quantity: 8 },
      ],
    },
    { id: "empty", name: "Novo cadastro", lots: [] },
  ];
  const snapshot = JSON.stringify(original),
    current = filterInventory(original, { lotScope: "current" }),
    history = filterInventory(original, { lotScope: "cancelled" });
  assert.deepEqual(
    current.map((i) => i.id),
    ["paper", "empty"],
  );
  assert.deepEqual(
    current[0].lots.map((l) => l.id),
    ["sold"],
  );
  assert.equal(current[0].cancelledLotsCount, 2);
  assert.deepEqual(
    history.map((i) => i.id),
    ["paper", "only-cancelled"],
  );
  assert.deepEqual(
    history[0].lots.map((l) => l.id),
    ["cancel-a", "cancel-b"],
  );
  assert.equal(history[0].lots[0].originCollectionWasteEntryId, "same-entry");
  assert.equal(JSON.stringify(original), snapshot);
});
test("Histórico filtra o material selecionado e não mistura outros lotes ou status", () => {
  const source = [
    {
      id: "a",
      name: "Papel",
      lots: [
        {
          id: "old",
          lotCode: "CANCEL-OLD",
          status: "CANCELLED",
          unit: "KG",
          processingStage: "ARMAZENADO",
          notes: "Mudança de destinação",
          originCollectionId: "collection",
        },
        { id: "new", status: "AVAILABLE", unit: "KG" },
      ],
    },
    {
      id: "b",
      name: "Metal",
      lots: [{ id: "other", status: "CANCELLED", unit: "UNIT" }],
    },
  ];
  assert.deepEqual(
    filterInventory(source, { lotScope: "cancelled", itemId: "a" })[0].lots.map(
      (l) => l.id,
    ),
    ["old"],
  );
  assert.equal(
    filterInventory(source, { lotScope: "current", search: "CANCEL-OLD" })
      .length,
    0,
  );
  assert.equal(
    filterInventory(source, {
      lotScope: "cancelled",
      unit: "KG",
      origin: "COLLECTION",
      processingStage: "ARMAZENADO",
    })[0].lots[0].id,
    "old",
  );
  assert.equal(
    filterInventory(source, { lotScope: "cancelled", lotStatus: "AVAILABLE" })
      .length,
    0,
  );
  assert.equal(
    filterInventory(source, { lotScope: "cancelled", itemId: "unknown" })
      .length,
    0,
  );
});
