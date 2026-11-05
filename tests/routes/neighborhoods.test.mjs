import assert from "node:assert/strict";
import { test } from "node:test";
import {
  neighborhoodGroups,
  neighborhoodPreview,
  appendNeighborhoodPoints,
  validGeneratorPoint,
} from "../../frontend/src/components/routes/neighborhoodPoints.js";
const g = (id, extra = {}) => ({
  id,
  name: `Gerador ${id}`,
  neighborhood: "São José",
  city: "Fortaleza",
  state: "CE",
  address: "Rua Principal, 10",
  latitude: -3.7,
  longitude: -38.5,
  ...extra,
});
test("agrupa acentos e caixa, separa município/UF e ignora bairro vazio", () => {
  const groups = neighborhoodGroups([
    g("1"),
    g("2", { neighborhood: " SAO JOSE " }),
    g("3", { city: "Caucaia" }),
    g("4", { state: "PB" }),
    g("5", { neighborhood: "" }),
  ]);
  assert.equal(groups.length, 3);
  assert.equal(
    groups.find((x) => x.generators.some((g) => g.id === "1")).generators
      .length,
    2,
  );
});
test("bairro exato não inclui outro bairro de nome semelhante", () => {
  assert.equal(
    neighborhoodGroups([g("1"), g("2", { neighborhood: "São José II" })])
      .length,
    2,
  );
});
test("pontos novos preservam vínculo, coordenadas, ordem e calendário herdado", () => {
  let seq = 0;
  const points = appendNeighborhoodPoints(
    [],
    [g("1"), g("2")],
    [],
    100,
    () => `p${++seq}`,
  );
  assert.deepEqual(
    points.map((p) => p.sourceId),
    ["1", "2"],
  );
  assert.deepEqual(
    points.map((p) => p.key),
    ["p1", "p2"],
  );
  assert.deepEqual(points[0].weekdays, []);
  assert.equal(points[0].latitude, -3.7);
  assert.equal(points[0].collectorId, "");
});
test("não repete geradores planejados, coletas vinculadas nem fontes repetidas", () => {
  const existing = [{ kind: "GENERATOR", sourceId: "1", key: "keep" }];
  const list = [g("1"), g("2"), g("3"), g("3")];
  const result = appendNeighborhoodPoints(existing, list, [
    { kind: "GENERATOR", sourceId: "2" },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0], existing[0]);
  assert.equal(result[1].sourceId, "3");
  assert.equal(
    appendNeighborhoodPoints(result, list, [
      { kind: "GENERATOR", sourceId: "2" },
    ]).length,
    2,
  );
});
test("identificadores iguais em PEVs não bloqueiam gerador", () => {
  assert.equal(
    neighborhoodPreview([g("1")], [{ kind: "PEV", sourceId: "1" }]).ready
      .length,
    1,
  );
});
test("dados ausentes, nulos, vazios e coordenadas fora do intervalo ficam para revisão", () => {
  for (const invalid of [
    { latitude: null },
    { longitude: undefined },
    { latitude: "" },
    { latitude: NaN },
    { longitude: 181 },
    { latitude: -91 },
    { name: "A" },
    { companyName: "A".repeat(151) },
  ])
    assert.equal(validGeneratorPoint(g("1", invalid)), false);
  assert.equal(
    neighborhoodPreview([g("ok"), g("bad", { latitude: null })], []).invalid
      .length,
    1,
  );
});
test("coordenadas zero são válidas e números em texto são convertidos", () => {
  assert.equal(
    validGeneratorPoint(g("1", { latitude: 0, longitude: 0 })),
    true,
  );
  assert.equal(
    appendNeighborhoodPoints([], [g("1", { latitude: "-3.7" })])[0].latitude,
    -3.7,
  );
});
test("limite estoura sem alterar parcialmente o planejamento", () => {
  const points = [{ key: "old", kind: "ADDRESS" }];
  assert.throws(
    () => appendNeighborhoodPoints(points, [g("1"), g("2")], [], 2),
    /limite/,
  );
  assert.equal(points.length, 1);
  assert.equal(appendNeighborhoodPoints(points, [g("1")], [], 2).length, 2);
});
test("bairro vazio e nenhuma novidade preservam pontos existentes", () => {
  assert.deepEqual(appendNeighborhoodPoints([], []), []);
  const points = [{ key: "old", kind: "GENERATOR", sourceId: "1" }];
  assert.deepEqual(appendNeighborhoodPoints(points, [g("1")]), points);
});
