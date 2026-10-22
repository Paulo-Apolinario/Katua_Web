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
      "katua-flow-audit-",
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
    ["--import", "tsx", "tests/audit-flow/local-server.ts"],
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

  const evidence = [];
  const record = (id, data) => evidence.push({ id, ...data });
  const expect = (r, code) => { assert.equal(r.status, code, JSON.stringify(r.body)); return r.body; };
  async function schedule() {
    const body = expect(await api("/schedules", "POST", { generatorId: f.gen.id, scheduledDate: "2026-10-22T15:00:00-03:00", requestedMaterials: [{ wasteTypeId: f.item.id, quantity: 50, unit: "KG" }] }), 201);
    return body.schedule;
  }
  async function makeEntry(quantity = 50, routeId) {
    const s = await schedule();
    const c = expect(await api("/collections", "POST", { scheduleId: s.id, collectorId: f.collector.id, ...(routeId ? { routeId } : {}) }), 201).collection;
    expect(await api("/collections/" + c.id + "/start", "POST", {}, f.collectorToken), 200);
    const done = expect(await api("/collections/" + c.id + "/complete-field", "POST", { materials: [{ wasteTypeId: f.item.id, quantity, unit: "KG" }] }, f.collectorToken), 200).collection;
    return { collection: done, entry: done.collectionMaterials[0].wasteEntry, schedule: s };
  }
  async function stock(entry, quantity, item = f.item.id) {
    return expect(await api("/collection-waste-destinations", "POST", { collectionWasteEntryId: entry.id, type: "STOCK", quantity, unit: "KG", stockItemId: item }), 201).destination;
  }
  async function finish(collection) {
    expect(await api("/collections/" + collection.id + "/receive", "POST", {}), 200);
    expect(await api("/collections/" + collection.id + "/start-sorting", "POST", {}), 200);
    return expect(await api("/collections/" + collection.id + "/complete", "POST", {}), 200).collection;
  }
  async function lotsFor(entry) {
    return (await api("/waste-stock/items/" + f.item.id + "/lots")).body.lots.filter((l) => l.originCollectionWasteEntryId === entry.id);
  }
  await check("Controle: solicitação, rota, delegação, campo, recebimento, destinação parcial e conclusão", async () => {
    const route = expect(await api("/routes", "POST", { name: "Auditoria fluxo completo", driverId: f.driver.id, vehicleId: f.vehicle.id, scheduledDate: "22/10/2026" }), 201).route;
    const x = await makeEntry(50, route.id);
    assert.equal(x.collection.driverId, f.driver.id); assert.equal(x.collection.vehicleId, f.vehicle.id);
    assert.equal(x.collection.status, "COLLECTED"); assert.equal(Number(x.entry.remainingQuantity), 50);
    assert.equal((await lotsFor(x.entry)).length, 0);
    expect(await api("/collections/" + x.collection.id + "/receive", "POST", {}), 200);
    expect(await api("/collections/" + x.collection.id + "/start-sorting", "POST", {}), 200);
    const a = await stock(x.entry, 20), b = await stock(x.entry, 30);
    assert.notEqual(a.stockLotId, b.stockLotId);
    const lots = await lotsFor(x.entry); assert.equal(lots.length, 2); assert.equal(lots.reduce((n, l) => n + Number(l.availableQuantity), 0), 50);
    assert.equal((await api("/collection-waste-destinations", "POST", { collectionWasteEntryId: x.entry.id, type: "STOCK", quantity: 1, unit: "KG", stockItemId: f.item.id })).status, 409);
    expect(await api("/collections/" + x.collection.id + "/complete", "POST", {}), 200);
    expect(await api("/routes/" + route.id + "/status", "PATCH", { status: "COMPLETED" }), 200);
    const repeated = await api("/collections/" + x.collection.id + "/complete-field", "POST", { materials: [{ wasteTypeId: f.item.id, quantity: 50, unit: "KG" }] }, f.collectorToken);
    assert.equal(repeated.status, 409);
    record("CONTROL_FULL", { collection: x.collection.id, lotCount: lots.length, availableKg: 50, repeatedCompletionStatus: repeated.status });
  });
  await check("Imagem: trocar ESTOQUE → destino direto → ESTOQUE conserva lote cancelado e cria outro", async () => {
    const x = await makeEntry(); const a = await stock(x.entry, 50);
    expect(await api("/collection-waste-destinations/" + a.id, "PATCH", { type: "DIRECT_DESTINATION", destinationName: "Destinatário QA" }), 200);
    expect(await api("/collection-waste-destinations/" + a.id, "PATCH", { type: "STOCK", stockItemId: f.item.id }), 200);
    const lots = await lotsFor(x.entry);
    assert.equal(lots.length, 2); assert.equal(lots.filter((l) => l.status === "CANCELLED").length, 1);
    assert.equal(lots.filter((l) => l.status === "AVAILABLE").reduce((n, l) => n + Number(l.availableQuantity), 0), 50);
    record("IMAGE_REPRO", { lotCount: 2, cancelledKg: 50, availableKg: 50, lots: lots.map((l) => ({ id: l.id, status: l.status, quantity: Number(l.quantity), availableQuantity: Number(l.availableQuantity) })) });
  });
  await check("Achado: lote disponível antes do recebimento físico", async () => {
    const x = await makeEntry(); const d = await stock(x.entry, 50);
    const collection = (await api("/collections/" + x.collection.id)).body.collection;
    assert.equal(collection.status, "COLLECTED"); assert.equal(collection.receivedAt, null);
    assert.equal(d.stockLot.status, "AVAILABLE");
    record("F_PRE_RECEIPT", { status: collection.status, receivedAt: collection.receivedAt, lotStatus: d.stockLot.status, lotAvailableQuantity: Number(d.stockLot.availableQuantity), processingStage: d.stockLot.processingStage });
  });
  await check("Achado: edição permite vincular lote KG a catálogo LITER", async () => {
    const x = await makeEntry(); const d = await stock(x.entry, 50);
    const updated = expect(await api("/collection-waste-destinations/" + d.id, "PATCH", { stockItemId: f.liter.id }), 200).destination;
    const item = (await api("/waste-stock/items/" + f.liter.id)).body.item;
    assert.equal(updated.unit, "KG"); assert.equal(updated.stockLot.unit, "KG"); assert.equal(item.unit, "LITER");
    record("F_UNIT_EDIT", { destinationUnit: updated.unit, lotUnit: updated.stockLot.unit, catalogUnit: item.unit, status: 200 });
  });
  await check("Achado: cancelar destinação de coleta concluída reabre saldo sem reabrir coleta", async () => {
    const x = await makeEntry(); const d = await stock(x.entry, 50); await finish(x.collection);
    expect(await api("/collection-waste-destinations/" + d.id + "/cancel", "POST", { reason: "Auditoria: verificar consistência do encerramento" }), 200);
    const c = (await api("/collections/" + x.collection.id)).body.collection;
    const entry = (await api("/collection-entries/" + x.entry.id)).body.entry;
    assert.equal(c.status, "COMPLETED"); assert.equal(Number(entry.remainingQuantity), 50);
    record("F_CLOSED_BALANCE", { collectionStatus: c.status, remainingQuantity: Number(entry.remainingQuantity), entryStatus: entry.status });
  });
  await check("Achado: delegação direta aceita veículo em manutenção", async () => {
    const s = await schedule();
    const c = expect(await api("/collections", "POST", { scheduleId: s.id, collectorId: f.collector.id, vehicleId: f.maintenance.id }), 201).collection;
    assert.equal(c.vehicle.status, "MAINTENANCE");
    record("F_MAINTENANCE", { creationStatus: 201, vehicleStatus: c.vehicle.status, collectionStatus: c.status });
  });
  await check("Regra a decidir: reserva de todo o saldo permite concluir a coleta", async () => {
    const x = await makeEntry();
    expect(await api("/collection-waste-destinations", "POST", { collectionWasteEntryId: x.entry.id, type: "RESERVATION", quantity: 50, unit: "KG", destinationName: "Reserva QA" }), 201);
    const c = await finish(x.collection); assert.equal(c.status, "COMPLETED");
    record("RULE_RESERVATION", { collectionStatus: c.status, availableLots: (await lotsFor(x.entry)).length, reservedQuantity: 50 });
  });
  await check("Controle: cancelamento do estoque restaura saldo e lote vendido bloqueia cancelamento", async () => {
    const x = await makeEntry(); const d = await stock(x.entry, 50);
    expect(await api("/waste-stock/lots/" + d.stockLotId, "PATCH", { status: "SOLD" }), 200);
    assert.equal((await api("/collection-waste-destinations/" + d.id + "/cancel", "POST", { reason: "Não deve permitir" })).status, 409);
    assert.equal((await api("/waste-stock/lots/" + d.stockLotId, "PATCH", { quantity: 100 })).status, 400);
    assert((await api("/collection-entries/" + x.entry.id, "GET", undefined, f.otherToken)).status >= 400);
    record("CONTROL_GUARDS", { soldCancelStatus: 409, linkedQuantityEditStatus: 400, otherCooperativeDenied: true });
  });
  await check("Controle: cancelar e registrar nova destinação deixa somente um lote disponível", async () => {
    const x = await makeEntry(); const a = await stock(x.entry, 50);
    expect(await api("/collection-waste-destinations/" + a.id + "/cancel", "POST", { reason: "Refazer destinação corretamente" }), 200);
    const b = await stock(x.entry, 50); const lots = await lotsFor(x.entry);
    assert.notEqual(a.id, b.id); assert.equal(lots.length, 2);
    const available = lots.filter((l) => l.status === "AVAILABLE").reduce((n, l) => n + Number(l.availableQuantity), 0);
    assert.equal(available, 50);
    record("IMAGE_CANCEL_RECREATE", { destinationsDifferent: true, lots: lots.map((l) => ({ status: l.status, quantity: Number(l.quantity), availableQuantity: Number(l.availableQuantity) })), available });
  });
  await check("Controle: destinação externa não cria lote; estoque parcial respeita o saldo", async () => {
    const x = await makeEntry(100); await stock(x.entry, 40);
    expect(await api("/collection-waste-destinations", "POST", { collectionWasteEntryId: x.entry.id, type: "DIRECT_DESTINATION", quantity: 60, unit: "KG", destinationName: "Unidade externa QA" }), 201);
    const entry = (await api("/collection-entries/" + x.entry.id)).body.entry;
    assert.equal(Number(entry.remainingQuantity), 0); assert.equal((await lotsFor(x.entry)).length, 1);
    record("CONTROL_SPLIT", { collectedKg: 100, stockKg: 40, externalKg: 60, lotCount: 1 });
  });
  await check("Achado: DELETE de lote cancelado muda histórico para descartado", async () => {
    const x = await makeEntry(); const d = await stock(x.entry, 50);
    expect(await api("/collection-waste-destinations/" + d.id + "/cancel", "POST", { reason: "Cancelamento de teste" }), 200);
    const changed = expect(await api("/waste-stock/lots/" + d.stockLotId, "DELETE"), 200).lot;
    assert.equal(changed.status, "DISCARDED");
    record("F_CANCELLED_DISCARD", { before: "CANCELLED", after: changed.status, quantity: Number(changed.quantity), availableQuantity: Number(changed.availableQuantity) });
  });
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
  await check("Painel: detalhe da coleta mostra histórico, sem ações de receber/triagem/concluir", async () => {
    await page.goto("http://127.0.0.1:5179/waste-list?coleta=" + f.a.id);
    await page.getByRole("dialog").waitFor();
    await page.getByRole("heading", { name: "Materiais registrados em campo", exact: true }).waitFor();
    const buttons = await page.getByRole("dialog").getByRole("button").allTextContents();
    assert(!buttons.some((text) => /receber|triagem|concluir/i.test(text)));
    await page.screenshot({ path: join(outputDir, "panel-collection-detail.png"), fullPage: true });
    record("F_PANEL_RECEIPT", { buttons, dedicatedActions: 0, note: "Confirmado também por busca das chamadas no código de produção do painel." });
  });
  await writeFile(join(outputDir, "evidence.json"), JSON.stringify(evidence, null, 2));
} catch (e) {
  outcomes.push({ name: "Ambiente", status: "FAIL", error: e.message });
  console.error(e.stack);
} finally {
  await writeFile(
    join(outputDir, "results.json"),
    JSON.stringify(
      {
        environment:
          "Auditoria por API real Fastify/Prisma + PGlite local descartável; sem acesso à VPS",
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
