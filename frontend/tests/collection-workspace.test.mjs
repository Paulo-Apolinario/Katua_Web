import test from "node:test";
import assert from "node:assert/strict";
import {
  materials,
  unitTotals,
  quantity,
  requestGroup,
  inPeriod,
  scheduledDate,
  assignmentProblem,
  searchText,
} from "../src/utils/collectionWorkspace.js";
test("Unidades e ausência de dados: sem kg presumido, sem somar litros com peso", () => {
  assert.equal(quantity(null, "KG"), "Não informada");
  assert.match(quantity(2, null), /unidade não informada/);
  assert.deepEqual(
    unitTotals([
      {
        status: "COLLECTED",
        collectionMaterials: [
          { nameSnapshot: "Óleo", quantity: 2.5, unit: "LITER" },
          { nameSnapshot: "Papel", quantity: 3, unit: "KG" },
        ],
      },
      { status: "CANCELLED", materials: [{ quantity: 99, unit: "KG" }] },
    ]),
    ["2,5 L", "3 kg"],
  );
  assert.equal(
    materials({ materials: [{ name: "Sem medida", quantity: 4 }] })[0].unit,
    "",
  );
});
test("Datas não confundem criação com programação e filtro exclui ausência", () => {
  assert.equal(scheduledDate({ createdAt: "2026-10-01" }), null);
  assert.equal(inPeriod(null, "2026-10-01", ""), false);
  assert.equal(inPeriod(null, "", ""), true);
  assert.equal(searchText("São José"), "sao jose");
});
test("Solicitação com coleta vinculada não retorna à fila para nova delegação", () => {
  assert.equal(
    requestGroup({
      status: "REQUESTED",
      collections: [{ status: "CANCELLED" }],
    }),
    "DELEGATED",
  );
  assert.equal(requestGroup({ status: "CANCELLED" }), "CLOSED");
  assert.equal(requestGroup({ status: "IN_PROGRESS" }), "IN_PROGRESS");
});
test("Atribuição detecta manutenção e equipe incompatível em rota", () => {
  const opts = {
    collectors: [{ id: "c", status: "AVAILABLE" }],
    drivers: [{ id: "d", status: "ON_ROUTE" }],
    vehicles: [{ id: "v", status: "MAINTENANCE" }],
    routes: [{ id: "r", status: "IN_PROGRESS", driverId: "d", vehicleId: "v" }],
  };
  const form = {
    collectorId: "c",
    driverId: "d",
    vehicleId: "v",
    routeId: "r",
  };
  assert.match(assignmentProblem(form, opts), /manutenção/);
  opts.vehicles[0].status = "ACTIVE";
  assert.equal(assignmentProblem(form, opts), "");
  assert.match(assignmentProblem({ ...form, routeId: "" }, opts), /motorista/);
  assert.match(assignmentProblem({ ...form, driverId: "" }, opts), /equipe/);
});
