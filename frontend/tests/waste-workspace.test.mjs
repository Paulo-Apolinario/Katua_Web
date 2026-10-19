import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  stockBalances,
  unitSummary,
  optionalFields,
  calendarIso,
} from "../src/utils/wasteWorkspace.js";
async function service(name, names) {
  const calls = [];
  let source = await readFile(
    new URL(`../src/services/${name}.js`, import.meta.url),
    "utf8",
  );
  source = source
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];?/g, "")
    .replace(/export default\s*\{[\s\S]*?\};?/g, "")
    .replace(/export const /g, "const ");
  return {
    calls,
    ...new Function(
      "apiRequest",
      "optionalFields",
      "calendarIso",
      source + `;return {${names.join(",")}}`,
    )(
      async (url, opts) => {
        calls.push({ url, ...opts });
        return { success: true };
      },
      optionalFields,
      calendarIso,
    ),
  };
}
test("Estoque separa unidades e exclui vendidos/descartados do disponível", () => {
  const b = stockBalances([
    {
      lots: [
        { status: "AVAILABLE", unit: "KG", quantity: 10, availableQuantity: 0 },
        { status: "SOLD", unit: "KG", quantity: 8 },
        { status: "RESERVED", unit: "KG", quantity: 2 },
        { status: "DISCARDED", unit: "KG", quantity: 3 },
        {
          status: "AVAILABLE",
          unit: "LITER",
          quantity: 5,
          availableQuantity: 2,
          originCollectionId: "c",
        },
      ],
    },
  ]);
  assert.equal(b.KG.available, 10);
  assert.equal(b.KG.reserved, 2);
  assert.equal(b.KG.sold, 8);
  assert.equal(b.LITER.available, 2);
  assert.equal(unitSummary(b, "available"), "10 kg · 2 L");
});
test("Reativar catálogo é PATCH apenas de status, sem apagar nome/categoria/unidade", async () => {
  const s = await service("wasteTypeService", [
    "activateWasteType",
    "patchWasteType",
  ]);
  await s.activateWasteType("x");
  assert.deepEqual(s.calls[0].body, { status: "ACTIVE" });
  await s.patchWasteType("x", { description: "", internalCode: null });
  assert.deepEqual(s.calls[1].body, { description: null, internalCode: null });
});
test("Edição de lote mantém omissão e transmite limpeza de campos opcionais", async () => {
  const s = await service("wasteStockService", ["patchWasteStockLot"]);
  await s.patchWasteStockLot("l", { notes: "", storageLocation: null });
  assert.deepEqual(s.calls[0].body, { notes: "", storageLocation: "" });
  assert.equal("quantity" in s.calls[0].body, false);
});
test("Período inclui dia final inteiro no fuso local e rejeita datas inexistentes", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/Fortaleza";
  try {
    assert.equal(calendarIso("2026-10-19"), "2026-10-19T03:00:00.000Z");
    assert.equal(calendarIso("2026-10-19", true), "2026-10-20T02:59:59.999Z");
    assert.equal(calendarIso("2026-02-30"), undefined);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("Destinação permite limpar documento/nota; histórico usa ID correto e limite por API", async () => {
  const s = await service("collectionWasteDestinationService", [
    "updateWasteDestination",
    "getWasteDestinations",
  ]);
  await s.updateWasteDestination("d", { notes: "", transportDocument: null });
  assert.deepEqual(s.calls[0].body, { notes: null, transportDocument: null });
  await s.getWasteDestinations({ entryId: "e", page: 2, limit: 25 });
  const u = new URL(s.calls[1].url, "https://example.invalid");
  assert.equal(u.searchParams.get("collectionWasteEntryId"), "e");
  assert.equal(u.searchParams.get("page"), "2");
  assert.equal(u.searchParams.get("limit"), "25");
});
