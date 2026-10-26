import assert from "node:assert/strict";
import test from "node:test";
import {
  locatePevAddress,
  pevAddressKey,
} from "../src/components/pevs/pevGeocoding.js";
const form = {
  zipCode: "60812-320",
  street: "Rua de teste",
  number: "50",
  city: "Fortaleza",
  state: "CE",
};
const postal = (zip) => ({
  cep: zip,
  city: "Fortaleza",
  state: "CE",
  location: { coordinates: { latitude: "-3.79", longitude: "-38.48" } },
});
const response = (data) => ({ ok: true, json: async () => data });
test("CEP com coordenadas válidas retorna sugestão aproximada e utiliza cache", async () => {
  let requests = 0;
  const before = global.fetch;
  global.fetch = async () => {
    requests++;
    return response(postal("60812320"));
  };
  try {
    const p = await locatePevAddress(form);
    assert.equal(p.latitude, -3.79);
    assert.equal(p.source, "postal");
    assert.match(p.message, /aproximada/);
    await locatePevAddress({ ...form, number: "60" });
    assert.equal(requests, 1);
  } finally {
    global.fetch = before;
  }
});
test("CEP sem coordenadas não vira zero ou centro do mapa e pode ser consultado novamente", async () => {
  const before = global.fetch;
  let requests = 0;
  global.fetch = async () =>
    response(
      ++requests === 1
        ? { ...postal("60000001"), location: { coordinates: {} } }
        : postal("60000001"),
    );
  try {
    await assert.rejects(
      locatePevAddress({ ...form, zipCode: "60000001" }),
      /não possui coordenadas/,
    );
    const p = await locatePevAddress({ ...form, zipCode: "60000001" });
    assert.equal(p.longitude, -38.48);
    assert.equal(requests, 2);
  } finally {
    global.fetch = before;
  }
});
test("Coordenadas fora do Brasil, CEP trocado e município incompatível são recusados", async () => {
  const before = global.fetch;
  try {
    global.fetch = async () =>
      response({
        ...postal("60000002"),
        location: { coordinates: { latitude: 0, longitude: 0 } },
      });
    await assert.rejects(
      locatePevAddress({ ...form, zipCode: "60000002" }),
      /coordenadas válidas/,
    );
    global.fetch = async () => response(postal("00000000"));
    await assert.rejects(
      locatePevAddress({ ...form, zipCode: "60000003" }),
      /não corresponde ao CEP/,
    );
    global.fetch = async () =>
      response({ ...postal("60000004"), city: "Sobral" });
    await assert.rejects(
      locatePevAddress({ ...form, zipCode: "60000004" }),
      /município/,
    );
  } finally {
    global.fetch = before;
  }
});
test("Busca por endereço completo inclui número e usa o geocodificador disponível", async () => {
  const before = global.window;
  let query;
  global.window = {
    google: {
      maps: {
        Geocoder: class {
          geocode(input, done) {
            query = input.address;
            done(
              [
                {
                  geometry: { location: { lat: () => -3.8, lng: () => -38.5 } },
                },
              ],
              "OK",
            );
          }
        },
      },
    },
  };
  try {
    const p = await locatePevAddress(form);
    assert.equal(p.source, "address");
    assert.match(query, /50/);
    assert.match(query, /Rua de teste/);
  } finally {
    global.window = before;
  }
});
test("Consulta cancelada não prossegue e indisponibilidade não fabrica coordenadas", async () => {
  const before = global.fetch;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    locatePevAddress(form, { signal: controller.signal }),
    /cancelada/,
  );
  global.fetch = async () => ({ ok: false });
  try {
    await assert.rejects(
      locatePevAddress({ ...form, zipCode: "60000005" }),
      /indisponível/,
    );
  } finally {
    global.fetch = before;
  }
});
test("Identidade do endereço muda ao alterar CEP, número, rua e descrição", () => {
  for (const field of [
    "zipCode",
    "street",
    "number",
    "city",
    "state",
    "location",
  ])
    assert.notEqual(
      pevAddressKey(form),
      pevAddressKey({ ...form, [field]: "Outro valor" }),
    );
  assert.equal(
    pevAddressKey(form),
    pevAddressKey({ ...form, name: "Novo nome", notes: "Nova orientação" }),
  );
});
