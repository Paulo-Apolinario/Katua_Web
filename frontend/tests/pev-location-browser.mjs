/** Interface real do painel com respostas controladas de API, CEP e geocodificação. Sem VPS. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const web = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  req = createRequire(
    resolve(process.env.KATUA_VALIDATION_TOOLS, "package.json"),
  );
const { chromium } = req("playwright");
const { default: chromiumBuild } = await import(
  req.resolve("@sparticuz/chromium")
);
chromiumBuild.setGraphicsMode = false;
const out = await mkdtemp(
  resolve(
    process.env.KATUA_VALIDATION_OUTPUT_ROOT || "/tmp",
    "katua-pev-location-",
  ),
);
let browser, server;
const outcomes = [];
async function check(name, fn) {
  try {
    await fn();
    outcomes.push({ name, status: "PASS" });
    console.log("PASS", name);
  } catch (e) {
    outcomes.push({ name, status: "FAIL", error: e.message });
    console.error("FAIL", name, e.message);
    for (const c of browser?.contexts() || [])
      for (const p of c.pages())
        await p
          .screenshot({ path: join(out, `failure-${outcomes.length}.png`) })
          .catch(() => {});
  }
}
try {
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5179",
      "--strictPort",
    ],
    {
      cwd: web,
      env: {
        ...process.env,
        VITE_API_BASE_URL: "http://127.0.0.1:3339",
        VITE_GOOGLE_MAPS_API_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((res, rej) => {
    let logs = "";
    const timer = setTimeout(() => rej(Error(logs)), 60000);
    const consume = (b) => {
      logs += b;
      if (logs.includes("Local:")) {
        clearTimeout(timer);
        res();
      }
    };
    server.stdout.on("data", consume);
    server.stderr.on("data", consume);
    server.on("exit", (code) => {
      if (code) rej(Error(logs));
    });
  });
  browser = await chromium.launch({
    executablePath: process.env.KATUA_CHROMIUM_PATH,
    args: chromiumBuild.args.filter((a) => a !== "--single-process"),
    headless: true,
  });
  async function setup({
    google = false,
    postalMissing = false,
    postalFailure = false,
  } = {}) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: "America/Fortaleza",
    });
    const user = {
      id: "owner-qa",
      role: "COOPERATIVE",
      displayName: "QA Localização",
      cooperative: {
        id: "coop-qa",
        name: "Cooperativa QA",
        address: "Fortaleza, CE",
        latitude: -3.73,
        longitude: -38.52,
      },
    };
    const bins = new Map(),
      posts = [],
      errors = [],
      calls = { cep: 0, postal: 0 },
      requests = [];
    let seq = 0,
      cepDelay = 0;
    await context.addInitScript(
      ({ user, google }) => {
        localStorage.setItem("auth_token", "qa-token");
        localStorage.setItem("auth_user", JSON.stringify(user));
        if (google) {
          window.__geocodes = [];
          window.__geoDelay = 0;
          window.google = {
            maps: {
              Geocoder: class {
                geocode(request, done) {
                  window.__geocodes.push(request.address);
                  const latitude = request.address.includes(", 60,")
                    ? -3.81
                    : -3.79;
                  setTimeout(
                    () =>
                      done(
                        [
                          {
                            geometry: {
                              location: {
                                lat: () => latitude,
                                lng: () => -38.48,
                              },
                            },
                          },
                        ],
                        "OK",
                      ),
                    window.__geoDelay,
                  );
                }
              },
            },
          };
        }
      },
      { user, google },
    );
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "127.0.0.1" && url.port === "5179")
        return route.continue();
      const json = (body) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
          },
          body: JSON.stringify(body),
        });
      if (url.hostname === "viacep.com.br") {
        calls.cep++;
        const cep = url.pathname.split("/")[2];
        if (cepDelay) await new Promise((r) => setTimeout(r, cepDelay));
        return json({
          cep,
          logradouro:
            cep === "60000002"
              ? "Rua Segundo CEP"
              : "Rua Tenente-Coronel Ésio Lima Verde",
          bairro: "Edson Queiroz",
          localidade: "Fortaleza",
          uf: "CE",
        });
      }
      if (url.hostname === "brasilapi.com.br") {
        calls.postal++;
        if (postalFailure) return route.abort();
        const cep = url.pathname.split("/").at(-1);
        return json({
          cep,
          street: "Rua Tenente-Coronel Ésio Lima Verde",
          city: "Fortaleza",
          state: "CE",
          location: {
            type: "Point",
            coordinates: postalMissing
              ? {}
              : { latitude: "-3.795", longitude: "-38.484" },
          },
        });
      }
      if (url.hostname !== "127.0.0.1" || url.port !== "3339")
        return route.abort();
      const path = url.pathname,
        method = route.request().method();
      requests.push({ path, method });
      if (path === "/auth/me") return json({ user });
      if (path === "/vehicles") return json({ vehicles: [] });
      if (path === "/routes") return json({ routes: [] });
      if (path === "/drivers") return json({ drivers: [] });
      if (path === "/collections/available-for-route")
        return json({ collections: [] });
      if (path === "/routes/available-collections")
        return json({ collections: [] });
      if (path === "/route-plans") return json({ plans: [] });
      if (path === "/route-planning/sources")
        return json({
          generators: [],
          bins: [...bins.values()].map((b) => ({ ...b, binId: b.bin_id })),
          collectors: [{ id: "col", name: "Catador QA" }],
          base: user.cooperative,
        });
      if (path.match(/^\/bins\/[^/]+\/events$/))
        return json({ data: { events: [], total: 0 } });
      if (path.match(/^\/bins\/[^/]+\/withdrawals$/))
        return json({ data: { collections: [], total: 0 } });
      if (path === "/bins" && method === "POST") {
        const data = route.request().postDataJSON(),
          id = "pev-" + ++seq;
        const row = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        bins.set(id, row);
        posts.push(row);
        return json({ success: true, data: row });
      }
      if (path.startsWith("/bins/") && method === "PUT") {
        const id = path.split("/")[2],
          data = route.request().postDataJSON();
        const row = { ...bins.get(id), ...data, id };
        bins.set(id, row);
        posts.push(row);
        return json({ data: row });
      }
      if (path.startsWith("/bins/"))
        return json({ data: bins.get(path.split("/")[2]) });
      if (path === "/bins")
        return json({ data: { items: [...bins.values()], total: bins.size } });
      return json({});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (e) => errors.push(e.message));
    async function open() {
      await page.goto("http://127.0.0.1:5179/create-bin");
      await page.getByLabel("Código do PEV", { exact: false }).waitFor();
      await page.locator("#pev-bin_id").fill("PEV-QA");
      await page.locator("#pev-name").fill("PEV Edson Queiroz QA");
    }
    async function cep() {
      await page.locator("#pev-number").fill("50");
      await page.locator("#pev-zipCode").fill("60812320");
      await page
        .getByRole("button", { name: "Consultar CEP", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Confirmar localização no mapa",
          exact: true,
        })
        .waitFor();
    }
    return {
      context,
      page,
      bins,
      posts,
      errors,
      calls,
      requests,
      open,
      cep,
      setCepDelay: (n) => {
        cepDelay = n;
      },
    };
  }
  const state = await setup(),
    { page } = state;
  await check(
    "CEP preenche endereço, sugere coordenadas e mostra marcador sem chave Google",
    async () => {
      await state.open();
      await state.cep();
      await page.waitForFunction(
        () => document.querySelector("#pev-latitude").value !== "",
      );
      assert.equal(
        await page.locator("#pev-street").inputValue(),
        "Rua Tenente-Coronel Ésio Lima Verde",
      );
      assert.equal(await page.locator("#pev-latitude").inputValue(), "-3.795");
      assert.equal(
        await page
          .locator(".pev-map .leaflet-marker-icon[title*='Posição sugerida']")
          .count(),
        1,
      );
      await page.getByText(/Sugestão aproximada por CEP/).waitFor();
    },
  );
  await check("Salvar sugestão sem confirmação é bloqueado", async () => {
    await page.getByRole("button", { name: "Salvar PEV", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Confirme a localização" })
      .waitFor();
    assert.equal(state.posts.length, 0);
  });
  await check(
    "Confirmar e salvar envia latitude e longitude numéricas e reabre o cadastro",
    async () => {
      await page
        .getByRole("button", {
          name: "Confirmar localização no mapa",
          exact: true,
        })
        .click();
      await page.screenshot({
        path: join(out, "pev-location-desktop.png"),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      await page.waitForURL("**/bin-list/pev-1");
      assert.equal(state.posts[0].latitude, -3.795);
      assert.equal(state.posts[0].longitude, -38.484);
      await page.goto("http://127.0.0.1:5179/edit-bin/pev-1");
      await page
        .getByRole("button", {
          name: "Localização confirmada no mapa",
          exact: true,
        })
        .waitFor();
      assert.equal(await page.locator("#pev-latitude").inputValue(), "-3.795");
    },
  );
  await check(
    "Alterar rua invalida marcador e confirmação sem apagar os outros dados",
    async () => {
      await page.locator("#pev-street").fill("Rua Corrigida QA");
      assert.equal(await page.locator("#pev-latitude").inputValue(), "");
      assert.equal(await page.locator("#pev-longitude").inputValue(), "");
      assert.equal(
        await page.locator("#pev-name").inputValue(),
        "PEV Edson Queiroz QA",
      );
      await page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      assert.equal(state.posts.length, 1);
      await page
        .getByRole("alert")
        .filter({ hasText: "Localize e confirme" })
        .waitFor();
    },
  );
  await check(
    "Marcação manual funciona mesmo sem mapa-base e exige confirmação",
    async () => {
      const map = page.getByRole("region", {
        name: "Selecionar localização do PEV no mapa",
        exact: true,
      });
      await map.click({ position: { x: 180, y: 130 } });
      assert.notEqual(await page.locator("#pev-latitude").inputValue(), "");
      await page
        .getByRole("button", {
          name: "Confirmar localização no mapa",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      await page.waitForURL("**/bin-list/pev-1");
      assert.equal(state.posts.length, 2);
      assert.notEqual(state.posts[1].latitude, state.posts[0].latitude);
    },
  );
  await check(
    "PEV salvo é oferecido à rota com as coordenadas confirmadas",
    async () => {
      await page.goto("http://127.0.0.1:5179/route-plans");
      await page
        .getByRole("button", { name: "Nova rota fixa", exact: true })
        .click();
      await page
        .getByRole("button", { name: "PEV Edson Queiroz QA", exact: false })
        .click();
      await page
        .getByRole("region", { name: "Cadastro do ponto", exact: true })
        .waitFor();
      assert.equal(
        Number(
          await page
            .getByLabel("Latitude", { exact: true })
            .last()
            .inputValue(),
        ),
        state.posts[1].latitude,
      );
      await page
        .getByRole("button", {
          name: "Confirmar localização no mapa",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Salvar ponto no planejamento",
          exact: true,
        })
        .click();
      await page
        .getByText("1. PEV Edson Queiroz QA", { exact: true })
        .waitFor();
    },
  );
  const precise = await setup({ google: true });
  await check(
    "Número é incluído na geocodificação e sua mudança refaz a busca ao sair do campo",
    async () => {
      await precise.open();
      await precise.cep();
      await precise.page.waitForFunction(
        () => document.querySelector("#pev-latitude").value === "-3.79",
      );
      await precise.page
        .getByRole("button", {
          name: "Confirmar localização no mapa",
          exact: true,
        })
        .click();
      await precise.page.locator("#pev-number").fill("60");
      assert.equal(
        await precise.page.locator("#pev-latitude").inputValue(),
        "",
      );
      await precise.page.locator("#pev-name").click();
      await precise.page.waitForFunction(
        () => document.querySelector("#pev-latitude").value === "-3.81",
      );
      assert(
        (await precise.page.evaluate(() => window.__geocodes)).some((q) =>
          q.includes("60"),
        ),
      );
    },
  );
  await check(
    "Resposta atrasada da geocodificação não sobrescreve marcador manual",
    async () => {
      await precise.page.evaluate(() => (window.__geoDelay = 900));
      await precise.page.locator("#pev-number").fill("70");
      await precise.page.locator("#pev-name").click();
      await precise.page
        .getByRole("region", {
          name: "Selecionar localização do PEV no mapa",
          exact: true,
        })
        .click({ position: { x: 180, y: 130 } });
      const lat = await precise.page.locator("#pev-latitude").inputValue();
      await precise.page
        .getByRole("button", {
          name: "Confirmar localização no mapa",
          exact: true,
        })
        .click();
      await precise.page.waitForTimeout(1100);
      assert.equal(
        await precise.page.locator("#pev-latitude").inputValue(),
        lat,
      );
      assert(
        await precise.page
          .getByRole("button", {
            name: "Localização confirmada no mapa",
            exact: true,
          })
          .isVisible(),
      );
    },
  );
  const missing = await setup({ postalMissing: true });
  await check(
    "CEP sem coordenadas mantém endereço e não salva centro do mapa",
    async () => {
      await missing.open();
      await missing.cep();
      await missing.page
        .getByRole("alert")
        .filter({ hasText: "não possui coordenadas" })
        .waitFor();
      assert.equal(
        await missing.page.locator("#pev-latitude").inputValue(),
        "",
      );
      assert.equal(
        await missing.page.locator(".pev-map .leaflet-marker-icon").count(),
        0,
      );
      assert.equal(
        await missing.page.locator("#pev-city").inputValue(),
        "Fortaleza",
      );
      await missing.page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      assert.equal(missing.posts.length, 0);
    },
  );
  await check(
    "Cadastro pendente requer escolha explícita e envia coordenadas nulas",
    async () => {
      await missing.page
        .getByRole("checkbox", { name: /Salvar com localização pendente/ })
        .check();
      await missing.page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      await missing.page.waitForURL("**/bin-list/pev-1");
      assert.equal(missing.posts[0].latitude, null);
      assert.equal(missing.posts[0].longitude, null);
    },
  );
  await check(
    "Consulta de CEP antiga não substitui um CEP alterado durante a espera",
    async () => {
      await missing.open();
      missing.setCepDelay(500);
      await missing.page.locator("#pev-zipCode").fill("60812320");
      await missing.page
        .getByRole("button", { name: "Consultar CEP", exact: true })
        .click();
      await missing.page.locator("#pev-zipCode").fill("60000002");
      await missing.page
        .getByRole("button", { name: "Consultar CEP", exact: true })
        .click();
      await missing.page.waitForFunction(
        () => document.querySelector("#pev-street").value === "Rua Segundo CEP",
      );
      assert.equal(
        await missing.page.locator("#pev-zipCode").inputValue(),
        "60000002",
      );
    },
  );
  await check(
    "Tela móvel mantém mapa, confirmação e controles dentro da largura",
    async () => {
      await page.goto("http://127.0.0.1:5179/edit-bin/pev-1");
      await page
        .getByRole("button", {
          name: "Localização confirmada no mapa",
          exact: true,
        })
        .waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () =>
          document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
      );
      await page.locator("button.sidebar-btn").click();
      await page
        .getByRole("button", { name: "Fechar menu lateral", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: join(out, "pev-location-mobile.png"),
        fullPage: true,
      });
      await page
        .locator("section")
        .filter({
          has: page.getByRole("heading", {
            name: "2. Endereço e localização no mapa",
            exact: true,
          }),
        })
        .screenshot({ path: join(out, "pev-location-map-mobile.png") });
      for (const s of [state, precise, missing]) assert.deepEqual(s.errors, []);
    },
  );
} catch (e) {
  outcomes.push({ name: "Ambiente", status: "FAIL", error: e.message });
  console.error(e.stack);
} finally {
  await writeFile(
    join(out, "results.json"),
    JSON.stringify(
      {
        environment:
          "Vite real + Chromium; API e serviços geográficos controlados; sem VPS",
        outcomes,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  server?.kill("SIGTERM");
  console.log("REPORT_DIR", out);
  if (outcomes.some((o) => o.status !== "PASS")) process.exitCode = 1;
}
