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
      "katua-route-planning-",
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
    .replace(/^\s*reportConfiguration\s+ReportConfiguration\?\s*$/m, "")
    .replace(/^\s*collectionOrder\s+String\[\].*$/m, "");
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
  await db.exec(await readFile(join(serverDir, "prisma/migrations/20261022120000_route_collection_order/migration.sql"), "utf8"));
  await child(
    ["--import", "tsx", "tests/route-planning/local-server.ts"],
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
  let createdId;
  await check("API: validação de data, recursos, perfil e rollback de coletas indisponíveis", async () => {
    const count = (await api("/routes")).body.routes.length;
    for (const body of [
      { name: "Data impossível", scheduledDate: "31/02/2026" },
      { name: "Inativo", driverId: f.inactive.id },
      { name: "Manutenção", vehicleId: f.maintenance.id },
      { name: "Incompatível", driverId: f.otherDriver.id, vehicleId: f.vehicle.id },
      { name: "Encerrada", status: "COMPLETED" },
      { name: "Início indevido", status: "IN_PROGRESS" },
      { name: "Duplicada", collectionIds: [f.a.id, f.a.id] },
      { name: "Outra cooperativa", collectionIds: [f.a.id, f.foreignCollection.id] },
      { name: "Inexistente", collectionIds: [f.a.id, "missing"] },
    ]) assert.equal((await api("/routes", "POST", body)).status, 400, JSON.stringify(body));
    assert.equal((await api("/routes", "POST", { name: "Driver" }, f.driverToken)).status, 403);
    assert.equal((await api("/routes")).body.routes.length, count);
    assert((await api("/routes/available-collections")).body.collections.some((c) => c.id === f.a.id));
  });
  await check("API: concorrência não duplica vínculo nem deixa rota parcial", async () => {
    const results = await Promise.all(["A", "B"].map((name) => api("/routes", "POST", { name: "Concorrente " + name, collectionIds: [f.race.id] })));
    assert.equal(results.filter((r) => r.status === 201).length, 1, JSON.stringify(results));
    assert([400, 409].includes(results.find((r) => r.status !== 201).status));
    assert.equal((await api("/routes")).body.routes.filter((r) => r.name.startsWith("Concorrente")).length, 1);
  });
  await check("Cadastro real: seleção de gerador/PEV, unidades, conflito de agenda e salvamento", async () => {
    await page.goto("http://127.0.0.1:5179/create-route");
    await page.getByRole("heading", { name: "Coletas disponíveis", exact: true }).waitFor();
    await page.getByLabel("Nome da rota", { exact: false }).fill("Rota planejada QA");
    await page.getByLabel("Data programada", { exact: true }).fill("2026-10-23");
    await page.getByLabel("Veículo", { exact: true }).selectOption(f.vehicle.id);
    assert.equal(await page.getByLabel("Motorista", { exact: true }).inputValue(), f.driver.id);
    await page.getByText("Possível conflito na mesma data:", { exact: false }).waitFor();
    assert(await page.getByLabel("Veículo", { exact: true }).locator(`option[value="${f.maintenance.id}"]`).evaluate((option) => option.disabled));
    await page.getByLabel("Buscar coleta", { exact: true }).fill("Mercado Centro QA");
    await page.locator(".route-available-list article").filter({ hasText: "Mercado Centro QA" }).getByRole("button", { name: "Adicionar coleta" }).click();
    await page.getByLabel("Buscar coleta", { exact: true }).fill("");
    await page.getByLabel("Origem", { exact: true }).selectOption("PEV");
    await page.locator(".route-available-list article").filter({ hasText: "PEV Praça QA" }).getByRole("button", { name: "Adicionar coleta" }).click();
    await page.getByLabel("Origem", { exact: true }).selectOption("");
    await page.getByLabel("Município", { exact: true }).selectOption("Cruz");
    await page.locator(".route-available-list article").filter({ hasText: "Gerador sem GPS QA" }).getByRole("button", { name: "Adicionar coleta" }).click();
    assert.equal(await page.locator(".route-stop-list li").count(), 3);
    await page.getByRole("button", { name: "Descer coleta 1", exact: true }).click();
    assert((await page.locator(".route-stop-list li").first().innerText()).includes("PEV Praça QA"));
    assert((await page.locator(".route-planning-aside").innerText()).includes("10 kg · 5 L"));
    assert((await page.locator(".route-planning-aside").innerText()).includes("1 coleta(s) sem quantidade informada · 1 sem coordenadas"));
    await page.getByRole("button", { name: "Adicionar parada em texto", exact: true }).click();
    await page.getByLabel("Parada adicional 1", { exact: true }).fill("Portaria de apoio QA");
    await page.screenshot({ path: join(outputDir, "route-create-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Agendar rota", exact: true }).click();
    await page.waitForURL("**/route-list");
    const routes = (await api("/routes")).body.routes;
    const route = routes.find((r) => r.name === "Rota planejada QA"); createdId = route.id;
    const saved = (await api("/routes/" + createdId)).body.route;
    assert.deepEqual(saved.collectionOrder, [f.b.id, f.a.id, f.c.id]);
    assert.deepEqual(saved.collections.map((c) => c.id), saved.collectionOrder);
    assert.deepEqual(saved.stops, ["Portaria de apoio QA"]);
    assert(saved.collections.every((c) => c.driverId === f.driver.id && c.vehicleId === f.vehicle.id));
    assert.deepEqual(errors, []);
  });
  await check("Edição real: ordem persistente, remoção atômica e histórico preservado", async () => {
    assert(createdId);
    await page.goto("http://127.0.0.1:5179/edit-route/" + createdId);
    await page.getByRole("heading", { name: "Sequência de coletas", exact: false }).waitFor();
    assert((await page.locator(".route-stop-list li").first().innerText()).includes("PEV Praça QA"));
    await page.getByRole("button", { name: "Descer coleta 1", exact: true }).click();
    assert(await page.getByRole("button", { name: "Iniciar rota salva", exact: true }).isDisabled());
    await page.getByRole("button", { name: "Remover coleta 3", exact: true }).click();
    await page.getByRole("button", { name: "Salvar planejamento", exact: true }).click();
    await page.waitForURL("**/route-list");
    const route = (await api("/routes/" + createdId)).body.route;
    assert.deepEqual(route.collectionOrder, [f.a.id, f.b.id]);
    const available = (await api("/routes/available-collections")).body.collections;
    assert.equal(available.find((c) => c.id === f.c.id).driverId, null);
    assert.equal(available.find((c) => c.id === f.c.id).vehicleId, null);
    const failed = await api("/routes/" + f.legacy.id, "PATCH", { name: "Não deve persistir", collectionIds: [] });
    assert.equal(failed.status, 400);
    const legacy = (await api("/routes/" + f.legacy.id)).body.route;
    assert.equal(legacy.name, "Rota antiga QA");
    assert.deepEqual(legacy.stops, ["Portaria antiga, 123"]);
    assert.equal(legacy.collections[0].id, f.finished.id);
    assert.equal((await api("/routes/" + createdId, "PATCH", { collectionIds: [] }, f.otherToken)).status, 400);
    assert.equal((await api("/routes/" + f.closed.id, "PATCH", { name: "Reabrir" })).status, 400);
    assert.deepEqual(errors, []);
  });
  await check("Operação: ações separadas, início validado e compatibilidade dos vínculos antigos", async () => {
    assert(createdId);
    assert.equal((await api("/routes/" + createdId + "/status", "PATCH", { status: "COMPLETED" })).status, 400);
    assert.equal((await api("/routes/" + createdId + "/status", "PATCH", { status: "IN_PROGRESS" })).status, 200);
    const bare = (await api("/routes", "POST", { name: "Planejar depois", stops: ["Texto antigo"] })).body.route;
    assert.equal((await api("/routes/" + bare.id + "/status", "PATCH", { status: "IN_PROGRESS" })).status, 400);
    assert.equal((await api("/routes/" + bare.id + "/collections/" + f.c.id, "POST")).status, 200);
    assert.deepEqual((await api("/routes/" + bare.id)).body.route.collectionOrder, [f.c.id]);
    assert.equal((await api("/routes/" + bare.id + "/collections/" + f.c.id, "DELETE")).status, 200);
    assert.deepEqual((await api("/routes/" + bare.id)).body.route.collectionOrder, []);
    await page.goto("http://127.0.0.1:5179/edit-route/" + f.closed.id);
    await page.getByText("Planejamento e histórico disponíveis para consulta.", { exact: false }).waitFor();
    assert(await page.getByLabel("Nome da rota", { exact: false }).isDisabled());
    assert.equal(await page.getByRole("button", { name: "Salvar planejamento", exact: true }).count(), 0);
    assert.deepEqual(errors, []);
  });
  await check("Falhas: recuperar opções, preservar formulário e impedir envio duplicado", async () => {
    await context.route("**/vehicles", (r) => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Falha de frota QA" }) }));
    await page.goto("http://127.0.0.1:5179/create-route");
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("button", { name: "Agendar rota", exact: true }).count(), 0);
    await context.unroute("**/vehicles");
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await page.getByRole("button", { name: "Agendar rota", exact: true }).waitFor();
    await page.getByLabel("Nome da rota", { exact: false }).fill("Formulário preservado QA");
    let calls = 0;
    await context.route("**/routes", async (r) => {
      if (r.request().method() !== "POST") return r.continue();
      calls++; await new Promise((res) => setTimeout(res, 300));
      return r.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "Coleta indisponível QA" }) });
    });
    await page.getByRole("button", { name: "Agendar rota", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Coleta indisponível QA" }).waitFor();
    assert.equal(calls, 1);
    assert.equal(await page.getByLabel("Nome da rota", { exact: false }).inputValue(), "Formulário preservado QA");
    await context.unroute("**/routes");
  });
  await check("Planejamento móvel: mapa, sequência e controles sem transbordamento", async () => {
    assert(createdId);
    const mobile = await contextFor(f.token, { id: f.owner.id, role: "COOPERATIVE", displayName: "QA" }, { width: 390, height: 844 });
    const mp = await mobile.newPage();
    await mp.goto("http://127.0.0.1:5179/edit-route/" + createdId);
    await mp.getByRole("button", { name: "Salvar planejamento", exact: true }).waitFor();
    assert(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await mp.getByRole("region", { name: "Mapa das paradas da rota", exact: true }).waitFor();
    await mp.screenshot({ path: join(outputDir, "route-edit-mobile.png"), fullPage: true });
    await mobile.close();
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
          "API real Fastify/Prisma + migração incremental de ordem de coletas sobre baseline anterior + PGlite + Chromium; sem serviços externos",
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
