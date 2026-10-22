/** Banco descartável, API real e Chromium. Nunca usa banco ou credenciais da VPS. */
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  appDir = resolve(process.env.KATUA_APP_DIR || join(webDir, "../../KatuApp")),
  serverDir = join(appDir, "server");
if (!process.env.KATUA_VALIDATION_TOOLS)
  throw Error(
    "Defina KATUA_VALIDATION_TOOLS com PGlite e Chromium de validação.",
  );
const req = createRequire(
  join(resolve(process.env.KATUA_VALIDATION_TOOLS), "package.json"),
);
const { PGlite } = await import(
  pathToFileURL(req.resolve("@electric-sql/pglite"))
);
const { PGLiteSocketServer } = await import(
  pathToFileURL(req.resolve("@electric-sql/pglite-socket"))
);
const { default: chromium } = await import(
  pathToFileURL(req.resolve("@sparticuz/chromium"))
);
const { chromium: pw } = req(
  process.env.KATUA_PLAYWRIGHT_MODULE || "playwright",
);
const outputDir = await mkdtemp(
    join(
      process.env.KATUA_VALIDATION_OUTPUT_ROOT || tmpdir(),
      "katua-dashboard-",
    ),
  ),
  outcomes = [],
  children = [],
  files = [];
const databaseUrl =
  "postgresql://postgres:localtest@127.0.0.1:54329/postgres?connection_limit=1";
let db, socket, browser;
async function child(args, cwd, env, ready) {
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(p);
  return new Promise((res, rej) => {
    const logs = [];
    const t = setTimeout(
      () =>
        rej(
          Error("Inicialização excedeu o limite: " + logs.join("").slice(-700)),
        ),
      60000,
    );
    const consume = (b) => {
      logs.push(b.toString());
      if (b.toString().includes("Falha nos relatórios"))
        console.log(b.toString());
      if (ready.test(b.toString())) {
        clearTimeout(t);
        res(p);
      }
    };
    p.stdout.on("data", consume);
    p.stderr.on("data", consume);
    p.on("exit", (code) => {
      clearTimeout(t);
      if (code) rej(Error(logs.join("").slice(-1800)));
    });
  });
}
async function check(name, fn) {
  try {
    await fn();
    outcomes.push({ name, status: "PASS" });
    console.log("PASS", name);
  } catch (e) {
    outcomes.push({ name, status: "FAIL", error: e.message });
    console.log("FAIL", name, e.message.slice(0, 900));
    if (browser)
      for (const p of browser.contexts().flatMap((c) => c.pages())) {
        try {
          await p.screenshot({
            path: join(outputDir, "failure-" + outcomes.length + ".png"),
          });
          await writeFile(
            join(outputDir, "failure-" + outcomes.length + ".html"),
            await p.content(),
          );
        } catch {}
      }
  }
}

try {
  const schema = (
    await readFile(join(serverDir, "prisma/schema.prisma"), "utf8")
  )
    .replace(/model ReportConfiguration\s*\{[^}]*\}/, "")
    .replace(/^\s*reportConfiguration\s+ReportConfiguration\?\s*$/m, "");
  const baseline = join(outputDir, "baseline.prisma");
  await writeFile(baseline, schema);
  const sql = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      baseline,
      "--script",
    ],
    {
      cwd: serverDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
    },
  );
  db = new PGlite();
  await db.exec(sql);
  socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 54329 });
  await socket.start();
  await db.exec(
    "BEGIN;" +
      (await readFile(
        join(
          serverDir,
          "prisma/migrations/20261021120000_report_configuration/migration.sql",
        ),
        "utf8",
      )) +
      "COMMIT;",
  );
  await child(
    ["--import", "tsx", "tests/dashboard/local-server.ts"],
    serverDir,
    {
      KATUA_LOCAL_VALIDATION: "1",
      SINIR_ENABLED: "false",
      SINIR_INTEGRATION_TOKEN: "",
      DATABASE_URL: databaseUrl,
      KATUA_VALIDATION_DIR: outputDir,
    },
    /LOCAL_API_READY/,
  );
  const f = JSON.parse(await readFile(join(outputDir, "fixture.json"), "utf8"));
  async function api(path, method = "GET", body, token = f.token) {
    const r = await fetch("http://127.0.0.1:3339" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  }

  const base = { start: "2026-10-01", end: "2026-10-21" },
    qs = new URLSearchParams(base).toString();
  await check(
    "Painel: contagens reais, unidades distintas e estoque sem duplicar produção",
    async () => {
      const r = await api("/dashboard/overview?" + qs);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const d = r.body.data;
      assert.equal(d.operational.inProgress, 1);
      assert.equal(d.operational.pendingDestination, 1);
      assert.deepEqual(d.operational.pendingUnits, { LITER: 7 });
      assert.equal(d.period.summary.massKg, 246);
      assert.equal(d.stock.KG, 100);
      assert.equal(d.operational.criticalAlerts, 1);
      assert.equal(d.todayRows.length, 1);
      assert(d.todayRows[0].date);
      assert.equal(d.map.points.filter((p) => p.kind === "PEV").length, 2);
      assert.equal(d.map.points.filter((p) => p.latitude == null).length, 2);
    },
  );
  await check(
    "Painel: isolamento por cooperativa, autorização e datas inválidas",
    async () => {
      assert.equal(
        (
          await api(
            "/dashboard/overview?" + qs,
            "GET",
            undefined,
            f.driverToken,
          )
        ).status,
        403,
      );
      const other = (
        await api("/dashboard/overview?" + qs, "GET", undefined, f.otherToken)
      ).body.data;
      assert.equal(other.period.summary.massKg, 9000);
      assert.equal(other.map.points.length, 0);
      assert.equal(
        (await api("/dashboard/overview?start=2026-02-30&end=2026-10-21"))
          .status,
        400,
      );
    },
  );

  await child(
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5179",
      "--strictPort",
    ],
    webDir,
    { VITE_API_BASE_URL: "http://127.0.0.1:3339" },
    /Local:/,
  );
  browser = await pw.launch({
    executablePath:
      process.env.KATUA_CHROMIUM_PATH || (await chromium.executablePath()),
    args: chromium.args.filter((a) => a !== "--single-process"),
    headless: true,
  });
  async function contextFor(
    token,
    user,
    viewport = { width: 1440, height: 1100 },
  ) {
    const c = await browser.newContext({
      viewport,
      timezoneId: "America/Fortaleza",
    });
    await c.addInitScript(
      ({ token, user }) => {
        if (location.hostname === "127.0.0.1") {
          localStorage.setItem("auth_token", token);
          localStorage.setItem("auth_user", JSON.stringify(user));
        }
      },
      { token, user },
    );
    await c.route("**/*", (r) =>
      ["127.0.0.1", "localhost"].includes(new URL(r.request().url()).hostname)
        ? r.continue()
        : r.abort(),
    );
    return c;
  }

  const context = await contextFor(f.token, {
      id: f.owner.id,
      email: f.owner.email,
      role: "COOPERATIVE",
      displayName: "QA Painel",
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await check(
    "Painel desktop real: gráficos, mapa sem chave Google e filtros de pontos",
    async () => {
      await page.goto("http://127.0.0.1:5179/");
      await page
        .getByRole("heading", { name: "Mapa operacional", exact: true })
        .waitFor();
      await page.locator(".recharts-surface").waitFor();
      assert(
        (await page.locator(".recharts-surface").boundingBox()).width > 100,
      );
      assert(await page.getByText("7 L em saldo", { exact: true }).isVisible());
      await page
        .getByLabel("Tipo de ponto", { exact: true })
        .selectOption("PEV");
      await page
        .getByRole("cell", { name: /PEV Cruz QA/ })
        .waitFor();
      assert.equal(
        await page
          .getByRole("cell", { name: "Gerador QA Sobral", exact: true })
          .count(),
        0,
      );
      await page
        .getByLabel("Município do ponto", { exact: true })
        .selectOption("Cruz");
      assert.equal(
        await page
          .getByRole("cell", { name: "PEV sem coordenadas QA", exact: true })
          .count(),
        0,
      );
      await page
        .getByRole("button", { name: "Localizar no mapa", exact: true })
        .click();
      await page.locator(".leaflet-popup-content").waitFor();
      assert(
        (await page.locator(".leaflet-popup-content").innerText()).includes(
          "PEV Cruz QA",
        ),
      );
      await page.screenshot({
        path: join(outputDir, "dashboard-desktop.png"),
        fullPage: true,
      });
      assert.deepEqual(errors, []);
    },
  );
  await check(
    "Posição no mapa obtida do navegador e falha de permissão explícita",
    async () => {
      await context.grantPermissions(["geolocation"]);
      await context.setGeolocation({
        latitude: -3.68,
        longitude: -40.35,
        accuracy: 20,
      });
      await page
        .getByRole("button", { name: "Minha posição", exact: true })
        .click();
      await page.waitForFunction(
        () => document.querySelectorAll(".katua-map-pin").length >= 3,
      );
      await context.clearPermissions();
      await page.evaluate(() => {
        Object.defineProperty(navigator, "geolocation", {
          configurable: true,
          value: { getCurrentPosition: (_ok, error) => error({ code: 1 }) },
        });
      });
      await page
        .getByRole("button", { name: "Minha posição", exact: true })
        .click();
      await page
        .getByText(
          "Permissão negada. Libere a localização deste site no navegador.",
          { exact: true },
        )
        .waitFor();
    },
  );
  await check(
    "Painel móvel sem transbordamento e mapa com lista de pontos",
    async () => {
      const m = await contextFor(
        f.token,
        { id: f.owner.id, role: "COOPERATIVE", displayName: "QA" },
        { width: 390, height: 844 },
      );
      const p = await m.newPage();
      await p.goto("http://127.0.0.1:5179/");
      await p
        .getByRole("heading", { name: "Mapa operacional", exact: true })
        .waitFor();
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await p.screenshot({
        path: join(outputDir, "dashboard-mobile.png"),
        fullPage: true,
      });
      await m.close();
    },
  );
  await check(
    "Falha de API não vira zero nem mensagem de ausência de pendências",
    async () => {
      await context.route("**/dashboard/overview?*", (r) =>
        r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha simulada" }),
        }),
      );
      await page
        .getByRole("button", { name: "Atualizar dados", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page
          .getByRole("heading", { name: "Central de atenção", exact: true })
          .count(),
        0,
      );
      assert.equal(await page.locator(".dashboard-kpi-value").count(), 0);
      await context.unroute("**/dashboard/overview?*");
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Mapa operacional", exact: true })
        .waitFor();
      assert.deepEqual(errors, []);
    },
  );
  await check("Gerador: completar localização pelo painel e persistir pino após recarga", async () => {
    await page.goto("http://127.0.0.1:5179/");
    await page.getByRole("row").filter({ hasText: "Gerador sem coordenadas QA" }).getByRole("link", { name: "Completar localização" }).click();
    await page.getByRole("heading", { name: "Localização do gerador", exact: true }).waitFor();
    await page.getByText("Este gerador está sem coordenadas.", { exact: false }).waitFor();
    await page.getByRole("region", { name: "Selecionar localização do gerador" }).click({ position: { x: 160, y: 140 } });
    await page.waitForFunction(() => document.querySelector("#generator-latitude")?.value !== "");
    await page.getByLabel("Latitude", { exact: true }).fill("-3.735123");
    await page.getByLabel("Longitude", { exact: true }).fill("-38.526321");
    await page.screenshot({ path: join(outputDir, "generator-location-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
    await page.waitForURL("http://127.0.0.1:5179/");
    await page.getByRole("row").filter({ hasText: "Gerador sem coordenadas QA" }).getByRole("button", { name: "Localizar no mapa", exact: true }).click();
    await page.locator(".leaflet-popup-content").waitFor();
    assert.equal(await page.locator(".katua-map-pin--generator").count(), 2);
    assert.equal(await page.locator(".katua-map-pin--pev").count(), 1);
    assert.equal(await page.locator(".katua-map-pin--base").count(), 1);
    const stored = (await api("/generators")).body.generators.find((g) => g.name === "Gerador sem coordenadas QA");
    assert.equal(stored.latitude, -3.735123);
    assert.equal(stored.longitude, -38.526321);
    await page.reload();
    await page.getByRole("row").filter({ hasText: "Gerador sem coordenadas QA" }).getByRole("button", { name: "Localizar no mapa", exact: true }).waitFor();
    await page.screenshot({ path: join(outputDir, "dashboard-new-pins.png"), fullPage: true });
    assert.deepEqual(errors, []);
  });
  await check("Edição: CEP e número na busca, ajuste da sugestão e persistência móvel", async () => {
    await page.goto("http://127.0.0.1:5179/edit-generator/" + f.gen.id + "?localizacao=1");
    await page.getByLabel("Latitude", { exact: true }).waitFor();
    await page.locator('input[name="number"]').fill("123");
    await page.getByLabel("CEP", { exact: true }).fill("60000000");
    await context.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ logradouro: "Rua QA", bairro: "Centro", localidade: "Sobral", uf: "CE" }) }));
    await page.getByRole("button", { name: "Buscar CEP", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('input[name="street"]').value === "Rua QA");
    await page.evaluate(() => {
      window.google = { maps: { Geocoder: class { geocode(query, done) { window.qaAddress = query.address; done([{ geometry: { location: { lat: () => -3.72, lng: () => -40.33 } } }], "OK"); } } } };
    });
    await page.getByRole("button", { name: "Buscar endereço no mapa", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#generator-latitude").value === "-3.72");
    assert.match(await page.evaluate(() => window.qaAddress), /Rua QA, 123.*Sobral.*60000000/);
    await page.getByLabel("Latitude", { exact: true }).fill("-3.721");
    await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
    await page.waitForURL("**/generator-list");
    const stored = (await api("/generators/" + f.gen.id)).body.generator;
    assert.equal(stored.latitude, -3.721);
    assert.equal(stored.longitude, -40.33);
    assert.equal(stored.email, f.gen.email);
    const mobile = await contextFor(f.token, { id: f.owner.id, role: "COOPERATIVE", displayName: "QA" }, { width: 390, height: 844 });
    const mp = await mobile.newPage();
    await mp.goto("http://127.0.0.1:5179/edit-generator/" + f.gen.id + "?localizacao=1");
    await mp.waitForFunction(() => document.querySelector("#generator-latitude")?.value === "-3.721");
    assert(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await mp.screenshot({ path: join(outputDir, "generator-location-mobile.png"), fullPage: true });
    await mobile.close();
    assert.deepEqual(errors, []);
  });
  await check("API: escopo da cooperativa, coordenadas válidas e preservação sem GPS", async () => {
    const path = "/generators/" + f.gen.id;
    assert.equal((await api(path, "PATCH", { latitude: -3, longitude: -38 }, f.otherToken)).status, 404);
    assert.equal((await api(path, "PATCH", { latitude: -3, longitude: -38 }, f.driverToken)).status, 403);
    for (const body of [{ latitude: -3 }, { longitude: -38 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: null, longitude: null }, { cooperativeId: "other" }, { email: "other@example.invalid" }, {}]) {
      assert.equal((await api(path, "PATCH", body)).status, 400, JSON.stringify(body));
    }
    const zero = await api(path, "PATCH", { latitude: 0, longitude: 0 });
    assert.equal(zero.status, 200, JSON.stringify(zero.body));
    assert.equal(zero.body.generator.latitude, 0);
    assert.equal(zero.body.generator.longitude, 0);
    const withoutGps = await api(path, "PATCH", { phone: "85999990000" });
    assert.equal(withoutGps.status, 200);
    assert.equal(withoutGps.body.generator.latitude, 0);
    assert.equal(withoutGps.body.generator.longitude, 0);
    assert.equal(withoutGps.body.generator.email, f.gen.email);
  });
  await check("Sede: pino e ação de localização no painel, relatórios e mapa de PEVs", async () => {
    for (const route of ["/", "/analytics-dashboard", "/bin-list?view=map"]) {
      await page.goto("http://127.0.0.1:5179" + route);
      await page.getByRole("button", { name: "Localizar sede", exact: true }).click();
      await page.locator(".leaflet-popup-content").waitFor();
      assert((await page.locator(".leaflet-popup-content").innerText()).includes(f.coop.name));
      assert.equal(await page.locator(".katua-map-pin--base").count(), 1);
      assert.equal(await page.locator(".katua-hq-tooltip").count(), 1);
      await page.screenshot({ path: join(outputDir, route === "/" ? "headquarters-dashboard.png" : route.includes("analytics") ? "headquarters-reports.png" : "headquarters-pevs.png"), fullPage: true });
    }
    assert.deepEqual(errors, []);
  });
  await check("Sede ausente: aviso, acesso às configurações e persistência do ponto", async () => {
    let c = (await api("/settings/context")).body.data;
    const removed = await api("/settings/company", "PUT", { ...c.company, version: c.version, latitude: null, longitude: null });
    assert.equal(removed.status, 200, JSON.stringify(removed.body));
    for (const route of ["/", "/analytics-dashboard", "/bin-list?view=map"]) {
      await page.goto("http://127.0.0.1:5179" + route);
      await page.getByText("Sede sem coordenadas cadastradas.", { exact: true }).waitFor();
      assert.equal(await page.locator(".katua-map-pin--base").count(), 0);
    }
    await page.getByRole("link", { name: "Definir localização da sede", exact: true }).click();
    await page.waitForURL("**/settings#sede");
    await page.getByText("A sede está sem coordenadas.", { exact: false }).waitFor();
    await page.getByLabel("Latitude", { exact: true }).fill("-3.735123");
    await page.getByLabel("Longitude", { exact: true }).fill("-38.526321");
    await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
    await page.getByText("Alterações salvas.", { exact: true }).waitFor();
    c = (await api("/settings/context")).body.data;
    assert.equal(c.company.latitude, -3.735123);
    assert.equal(c.company.longitude, -38.526321);
    await page.goto("http://127.0.0.1:5179/");
    await page.getByRole("button", { name: "Localizar sede", exact: true }).click();
    // Sede coincidente com gerador fica acima e pode ser aberta pela ação.
    await page.locator(".leaflet-popup-content").waitFor();
    assert((await page.locator(".leaflet-popup-content").innerText()).includes(f.coop.name));
    assert(await page.locator(".katua-map-pin--base").evaluate((element) => Number(element.style.zIndex) >= 1000));
    const mobile = await contextFor(f.token, { id: f.owner.id, role: "COOPERATIVE", displayName: "QA" }, { width: 390, height: 844 });
    const mp = await mobile.newPage();
    await mp.goto("http://127.0.0.1:5179/");
    await mp.getByRole("button", { name: "Localizar sede", exact: true }).click();
    await mp.locator(".leaflet-popup-content").waitFor();
    assert(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await mp.screenshot({ path: join(outputDir, "headquarters-mobile.png"), fullPage: true });
    await mobile.close();
    assert.deepEqual(errors, []);
  });
  await check("Sede: falha de consulta explícita sem interromper PEVs e isolamento de cooperativa", async () => {
    await context.route("**/auth/me", (r) => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Falha simulada" }) }));
    await page.evaluate(() => {
      history.pushState({}, "", "/bin-list?view=map");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.getByText("Não foi possível consultar a localização da sede.", { exact: false }).waitFor();
    assert.equal(await page.getByText("Sede sem coordenadas cadastradas.", { exact: true }).count(), 0);
    assert((await page.locator(".pev-map-icon").count()) >= 1);
    await context.unroute("**/auth/me");
    const other = await contextFor(f.otherToken, { id: f.owner.id + "-other", role: "COOPERATIVE", displayName: "Outra QA" });
    const op = await other.newPage();
    await op.goto("http://127.0.0.1:5179/");
    await op.getByText("Sede sem coordenadas cadastradas.", { exact: true }).waitFor();
    assert.equal(await op.locator(".katua-map-pin--base").count(), 0);
    assert(!(await op.locator("body").innerText()).includes("Sede: " + f.coop.name));
    await other.close();
  });
} catch (e) {
  outcomes.push({ name: "Ambiente", status: "FAIL", error: e.message });
  console.error(e.stack);
} finally {
  await writeFile(
    join(outputDir, "results.json"),
    JSON.stringify(
      {
        environment:
          "API real Fastify/Prisma + migração incremental sobre baseline anterior aos relatórios + PGlite + Chromium; sem comunicação com SINIR",
        outcomes,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  for (const p of children) p.kill("SIGTERM");
  await socket?.stop();
  await db?.close();
  for (const f of files) await unlink(f).catch(() => {});
  console.log("REPORT_DIR", outputDir);
  if (outcomes.some((o) => o.status === "FAIL")) process.exitCode = 1;
}
