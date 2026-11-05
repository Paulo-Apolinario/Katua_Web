import assert from "node:assert/strict";
import { test } from "node:test";
import { receivingWorkflow } from "../../frontend/src/utils/receivingWorkflow.js";
const entry = (remaining = 10, destinations = []) => ({
  id: "entry",
  remainingQuantity: remaining,
  destinedQuantity: 10 - remaining,
  destinations,
});
const base = (extra = {}) => ({
  id: "c",
  status: "RECEIVED",
  quantityReviewVersion: 1,
  participants: [],
  collectionWasteEntries: [entry()],
  collectionMaterials: [{ id: "m" }],
  ...extra,
});
test("coleta normal pendente ou em andamento aguarda campo", () => {
  for (const status of ["PENDING", "IN_PROGRESS"])
    assert.equal(receivingWorkflow(base({ status })).current, "field");
});
test("retirada extra/normal concluída em campo exige recebimento", () => {
  assert.equal(
    receivingWorkflow(base({ status: "COLLECTED" })).current,
    "receipt",
  );
});
test("coleta avulsa em endereço registra chegada antes de pesar", () => {
  assert.equal(
    receivingWorkflow(base({ intakeKind: "PICKUP", status: "PENDING" }))
      .current,
    "receipt",
  );
});
test("entrega na porta sem materiais segue para separação e pesagem inicial", () => {
  assert.equal(
    receivingWorkflow(
      base({
        intakeKind: "DIRECT",
        quantityReviewVersion: 0,
        collectionMaterials: [],
        collectionWasteEntries: [],
      }),
    ).current,
    "weigh",
  );
});
test("quantidade técnica zero sem conferência não libera conclusão", () => {
  assert.equal(
    receivingWorkflow(
      base({ quantityReviewVersion: 0, collectionWasteEntries: [entry(0)] }),
    ).current,
    "weigh",
  );
});
test("equipe exige divisão e nova conferência invalida divisão anterior", () => {
  const c = base({
    participants: [{ collectorId: "a" }],
    allocationVersion: 1,
    allocationQuantityVersion: 0,
  });
  assert.equal(receivingWorkflow(c).current, "team");
  assert(receivingWorkflow(c).steps.some((s) => s.id === "team"));
});
test("ocorrência aberta exige tratamento antes de concluir", () => {
  assert.equal(
    receivingWorkflow(
      base({
        incidents: [{ status: "OPEN" }],
        collectionWasteEntries: [entry(0)],
      }),
    ).current,
    "incidents",
  );
});
test("saldo restante exige encaminhamento; saldo integralmente encaminhado libera revisão final", () => {
  assert.equal(receivingWorkflow(base()).current, "destination");
  assert.equal(
    receivingWorkflow(base({ collectionWasteEntries: [entry(0)] })).current,
    "complete",
  );
});
test("entradas ausentes não são consideradas prontas para concluir", () => {
  assert.equal(
    receivingWorkflow(base({ collectionWasteEntries: [] })).current,
    "review",
  );
});
test("coleta concluída com estoque ou triagem mantém acompanhamento", () => {
  for (const type of ["STOCK", "TRIAGE", "RESERVATION"]) {
    const flow = receivingWorkflow(
      base({
        status: "COMPLETED",
        collectionWasteEntries: [
          entry(0, [
            {
              type,
              status: "ACTIVE",
              quantity: 10,
              stockLot:
                type === "STOCK"
                  ? { status: "AVAILABLE", availableQuantity: 10 }
                  : undefined,
            },
          ]),
        ],
      }),
    );
    assert.equal(flow.current, "done");
    assert.equal(flow.followUp, true);
  }
});
test("lote esgotado e destinação cancelada não representam saldo em acompanhamento", () => {
  const flow = receivingWorkflow(
    base({
      status: "COMPLETED",
      collectionWasteEntries: [
        entry(0, [
          {
            type: "STOCK",
            status: "ACTIVE",
            quantity: 10,
            stockLot: { status: "SOLD", availableQuantity: 0 },
          },
          { type: "TRIAGE", status: "CANCELLED", quantity: 10 },
        ]),
      ],
    }),
  );
  assert.equal(flow.followUp, false);
});
test("cancelamento é somente consulta", () => {
  assert.equal(
    receivingWorkflow(base({ status: "CANCELLED" })).current,
    "cancelled",
  );
});
