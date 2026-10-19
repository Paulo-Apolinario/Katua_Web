import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPosition,
  filterPevs,
  formPayload,
  capacity,
  address,
} from "../src/components/pevs/pevUtils.js";
import { generatorName, location } from "../src/utils/collectionWorkspace.js";
const base = {
  bin_id: "P-01",
  name: "Ponto Centro",
  latitude: "",
  longitude: "",
  zipCode: "",
  capacityValue: "",
  capacityUnit: "KG",
  acceptedMaterials: [],
  openingHours: [],
  status: "active",
  pointKind: "PEV",
  needsPickup: false,
};
test("Marcadores exigem duas coordenadas reais; zero é válido e ausência não vira centro", () => {
  assert.equal(hasPosition({ latitude: null, longitude: null }), false);
  assert.equal(hasPosition({ latitude: "", longitude: "" }), false);
  assert.equal(hasPosition({ latitude: 0, longitude: 0 }), true);
  assert.equal(hasPosition({ latitude: -3, longitude: 181 }), false);
  assert.throws(() => formPayload({ ...base, latitude: "-3" }), /juntas/);
  assert.equal(formPayload(base).latitude, null);
});
test("Capacidade mantém unidade física e campos vazios são enviados para limpeza", () => {
  const p = formPayload({
    ...base,
    capacityValue: "2500",
    capacityUnit: "LITER",
    responsibleContact: "",
    vehicle_id: "",
  });
  assert.equal(p.capacityValue, 2500);
  assert.equal(p.capacityUnit, "LITER");
  assert.equal(p.responsibleContact, null);
  assert.equal(p.vehicle_id, null);
  assert.equal(capacity(p), "2.500 L");
  assert.throws(
    () => formPayload({ ...base, capacityValue: "Infinity" }),
    /positiva/,
  );
});
test("Filtros combinados respeitam acentos, município, retirada e ausência de localização", () => {
  const rows = [
    {
      id: "a",
      name: "São João",
      status: "active",
      city: "Fortaleza",
      acceptedMaterials: ["Vidro"],
      needsPickup: true,
      latitude: -3,
      longitude: -38,
    },
    {
      id: "b",
      name: "São João",
      status: "inactive",
      city: "Maracanaú",
      acceptedMaterials: ["Plástico"],
      needsPickup: false,
      latitude: null,
      longitude: null,
    },
  ];
  assert.equal(
    filterPevs(rows, {
      search: "sao joao",
      city: "Fortaleza",
      material: "Vidro",
      pickup: true,
    })[0].id,
    "a",
  );
  assert.equal(filterPevs(rows, { unmapped: true })[0].id, "b");
  assert.equal(
    filterPevs(rows, { material: "Vidro", unmapped: true }).length,
    0,
  );
});
test("Coleta originada em PEV preserva identificação e endereço sem fabricar gerador", () => {
  const c = {
    bin: {
      name: "PEV Centro",
      street: "Rua A",
      number: "10",
      city: "Fortaleza",
      state: "CE",
    },
  };
  assert.equal(generatorName(c), "PEV · PEV Centro");
  assert.equal(location(c), "Rua A, 10, Fortaleza, CE");
  assert.equal(address({ location: "Endereço legado" }), "Endereço legado");
});
