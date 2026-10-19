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
const outputDir = await mkdtemp(join(tmpdir(), "katua-pevs-")),
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
  }
}
try {
  const baseSchema = execFileSync(
    "git",
    ["show", "0b00b8c65b955701bd9c14d6aeedad2e908a1c40:server/prisma/schema.prisma"],
    { cwd: appDir, encoding: "utf8" },
  );
  const schemaPath = join(outputDir, "baseline.prisma");
  await writeFile(schemaPath, baseSchema);
  const sql = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      schemaPath,
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
  await db.query(
    'INSERT INTO "User" (id,email,"passwordHash","displayName",role,"updatedAt") VALUES ($1,$2,$3,\'Cooperativa legada\',\'COOPERATIVE\',NOW())',
    ["migration-owner", "migration@example.invalid", "not-for-login"],
  );
  await db.query(
    'INSERT INTO "Cooperative" (id,"userId",name,"updatedAt") VALUES ($1,$2,$3,NOW())',
    ["migration-coop", "migration-owner", "Cooperativa legada"],
  );
  await db.query(
    'INSERT INTO "Bin" (id,"cooperativeId","binId","binType",location,"capacityKg","lastCollectionDate",status,"updatedAt") VALUES ($1,$2,$3,$4,$5,120,$6,\'FULL\',NOW())',
    [
      "legacy-bin",
      "migration-coop",
      "LEGADO-001",
      "recyclable",
      "Endereço legado preservado",
      "2026-09-01T15:00:00Z",
    ],
  );
  const migration = await readFile(
    join(
      serverDir,
      "prisma/migrations/20261019230000_pev_operations/migration.sql",
    ),
    "utf8",
  );
  await db.exec("BEGIN;" + migration + "COMMIT;");
  await child(
    ["--import", "tsx", "tests/pevs/local-server.ts"],
    serverDir,
    {
      KATUA_LOCAL_VALIDATION: "1",
      DATABASE_URL: databaseUrl,
      KATUA_VALIDATION_DIR: outputDir,
    },
    /LOCAL_API_READY/,
  );
  const f = JSON.parse(await readFile(join(outputDir, "fixture.json"), "utf8"));
  await db.query('UPDATE "Bin" SET "cooperativeId"=$1 WHERE id=$2', [
    f.cooperative.id,
    "legacy-bin",
  ]);
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
  browser = await pw.launch({
    executablePath:
      process.env.KATUA_CHROMIUM_PATH || (await chromium.executablePath()),
    args: chromium.args,
    headless: true,
  });
  async function contextFor(
    token = f.token,
    user = f.owner,
    viewport = { width: 1440, height: 1100 },
  ) {
    const c = await browser.newContext({
      viewport,
      timezoneId: "America/Fortaleza",
    });
    await c.route("**/*", (route) =>
      ["127.0.0.1", "localhost"].includes(
        new URL(route.request().url()).hostname,
      )
        ? route.continue()
        : route.abort(),
    );
    await c.addInitScript(
      ({ token, user }) => {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
      },
      { token, user },
    );
    return c;
  }
  await child(
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5179"],
    webDir,
    { VITE_API_BASE_URL: "http://127.0.0.1:3339" },
    /Local:/,
  );
  const context = await contextFor(),
    page = await context.newPage();
  page.setDefaultTimeout(12000);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  let binId, createdPhoto, collectionId;
  await check(
    "Migração preserva cadastro legado, capacidade, data e sinalização de cheio",
    async () => {
      const r = await api("/bins/legacy-bin");
      assert.equal(r.status, 200);
      assert.equal(r.body.data.location, "Endereço legado preservado");
      assert.equal(r.body.data.capacityValue, 120);
      assert.equal(r.body.data.capacityUnit, "KG");
      assert.equal(r.body.data.latitude, null);
      assert.equal(r.body.data.needsPickup, true);
      assert.equal(r.body.data.status, "active");
      assert.equal(r.body.data.lastCollectionSource, "LEGACY");
    },
  );
  await check(
    "Cadastro com clique no mapa, múltiplos materiais, horários, veículo e foto persiste",
    async () => {
      await page.goto("http://127.0.0.1:5179/create-bin");
      await page.locator("#pev-bin_id").fill("PEV-FOR-001");
      await page.locator("#pev-name").fill("Ponto Cooperativa Centro");
      await page.locator("#pev-street").fill("Rua de validação");
      await page.locator("#pev-number").fill("100");
      await page.locator("#pev-neighborhood").fill("Centro");
      await page.locator(".pev-map").click({ position: { x: 180, y: 170 } });
      assert.ok(Number(await page.locator("#pev-latitude").inputValue()) < 0);
      assert.equal(await page.locator(".leaflet-marker-icon").count(), 1);
      await page.getByLabel("Papel e papelão", { exact: true }).check();
      await page.getByLabel("Plástico", { exact: true }).check();
      await page
        .getByLabel("Atendimento Segunda-feira", { exact: true })
        .selectOption("open");
      await page
        .getByLabel("Fechamento Segunda-feira 1", { exact: true })
        .fill("12:00");
      await page.locator("#pev-capacityValue").fill("2500");
      await page.locator("#pev-capacityUnit").selectOption("LITER");
      await page
        .locator(`#pev-vehicle_id option[value="${f.vehicle1.id}"]`)
        .waitFor({ state: "attached" });
      await page.locator("#pev-vehicle_id").selectOption(f.vehicle1.id);
      const image = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR6kAAAAASUVORK5CYII=",
        "base64",
      );
      await page
        .locator("#pev-photo")
        .setInputFiles({
          name: "ponto.png",
          mimeType: "image/png",
          buffer: image,
        });
      await page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      await page.waitForURL(/\/bin-list\/[^/]+$/);
      binId = new URL(page.url()).pathname.split("/").at(-1);
      await page
        .getByRole("heading", { name: "Ponto Cooperativa Centro", exact: true })
        .waitFor();
      const r = await api("/bins/" + binId);
      assert.equal(r.body.data.capacityUnit, "LITER");
      assert.equal(r.body.data.capacity_kg, null);
      assert.equal(r.body.data.vehicle_id, f.vehicle1.id);
      assert.deepEqual(r.body.data.acceptedMaterials, [
        "Papel e papelão",
        "Plástico",
      ]);
      assert.equal(r.body.data.openingHours[0].intervals[0].end, "12:00");
      assert.ok(r.body.data.photo_url);
      createdPhoto = r.body.data.photo_url;
      files.push(join(serverDir, createdPhoto));
      await page.reload();
      await page.locator(".leaflet-marker-icon").waitFor();
      await page.screenshot({
        path: join(outputDir, "pev-ficha-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Mapa filtrado mostra apenas marcadores salvos e lista conserva pontos sem coordenadas",
    async () => {
      await page.goto("http://127.0.0.1:5179/bin-list?view=map");
      await page.locator(".leaflet-marker-icon").waitFor();
      assert.equal(await page.locator(".leaflet-marker-icon").count(), 1);
      await page
        .getByRole("heading", { name: "Localização dos pontos filtrados" })
        .waitFor();
      await page.locator("#pevs-search").fill("LEGADO");
      await page.waitForFunction(
        () => document.querySelectorAll(".leaflet-marker-icon").length === 0,
      );
      await page.getByText("LEGADO-001", { exact: true }).waitFor();
      await page.locator("#pevs-search").fill("Cooperativa Centro");
      await page.locator(".leaflet-marker-icon").waitFor();
      const downloading = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Exportar filtrados (CSV)", exact: true })
        .click();
      const csv = await readFile(await (await downloading).path(), "utf8");
      assert.ok(csv.includes("PEV-FOR-001"));
      assert.ok(!csv.includes("LEGADO-001"));
      await page.screenshot({
        path: join(outputDir, "pevs-mapa-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Edição preserva dados e permite limpar veículo, contato, foto e coordenadas",
    async () => {
      await page.goto(`http://127.0.0.1:5179/edit-bin/${binId}`);
      await page.locator("#pev-name").waitFor();
      await page.locator("#pev-responsibleContact").fill("Contato removível");
      await page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      await page.waitForURL(/\/bin-list\/[^/]+$/);
      await page.goto(`http://127.0.0.1:5179/edit-bin/${binId}`);
      await page.locator("#pev-responsibleContact").fill("");
      await page.locator("#pev-vehicle_id").selectOption("");
      await page
        .getByRole("button", { name: "Limpar localização", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Remover foto ao salvar", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Salvar PEV", exact: true })
        .click();
      await page.waitForURL(/\/bin-list\/[^/]+$/);
      let r = await api("/bins/" + binId);
      assert.equal(r.body.data.responsibleContact, null);
      assert.equal(r.body.data.vehicle_id, null);
      assert.equal(r.body.data.latitude, null);
      assert.equal(r.body.data.longitude, null);
      assert.equal(r.body.data.photo_url, null);
      assert.equal(r.body.data.capacityUnit, "LITER");
      await api("/bins/" + binId, "PUT", {
        latitude: -3.7319,
        longitude: -38.5267,
      });
    },
  );
  await check(
    "Vistoria, ocorrência e resolução têm autoria, datas e persistência",
    async () => {
      await page.goto(`http://127.0.0.1:5179/bin-list/${binId}`);
      await page
        .getByRole("button", { name: "Registrar vistoria", exact: true })
        .click();
      const modal = page.getByRole("dialog");
      await modal.getByLabel("Precisa de retirada", { exact: true }).check();
      await page
        .locator("#pev-event-notes")
        .fill("Retirada necessária após conferência local");
      await modal
        .getByRole("button", { name: "Salvar registro", exact: true })
        .click();
      await page
        .getByText("Registro salvo no histórico do PEV.", { exact: true })
        .waitFor();
      assert.equal((await api("/bins/" + binId)).body.data.needsPickup, true);
      await page
        .getByRole("button", { name: "Registrar ocorrência", exact: true })
        .click();
      await page
        .locator("#pev-event-notes")
        .fill("Acesso ao ponto precisa de manutenção");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Salvar registro", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Marcar como resolvida", exact: true })
        .click();
      await page
        .getByText("Ocorrência marcada como resolvida.", { exact: true })
        .waitFor();
      const events = (await api(`/bins/${binId}/events`)).body.data.events;
      const incident = events.find((e) => e.kind === "INCIDENT");
      assert.ok(incident.resolvedAt);
      assert.equal(incident.actorUserId, f.owner.id);
    },
  );
  await check(
    "Solicitar retirada cria coleta pendente e rejeita duplicidade",
    async () => {
      await page.goto(`http://127.0.0.1:5179/bin-list/${binId}`);
      await page
        .getByRole("button", { name: "Solicitar retirada", exact: true })
        .click();
      await page
        .locator(`#pickup-collector option[value="${f.collector.id}"]`)
        .waitFor({ state: "attached" });
      await page.locator("#pickup-collector").selectOption(f.collector.id);
      await page
        .getByRole("button", { name: "Confirmar retirada", exact: true })
        .click();
      await page
        .getByText(
          "Retirada criada e vinculada ao PEV. Acompanhe a execução em Coletas.",
          { exact: true },
        )
        .waitFor();
      const r = await api(`/bins/${binId}/withdrawals`);
      collectionId = r.body.data.collections[0].id;
      assert.equal(r.body.data.collections[0].status, "PENDING");
      assert.equal(r.body.data.collections[0].collectionMaterials.length, 0);
      const duplicate = await api(`/bins/${binId}/withdrawals`, "POST", {
        collectorId: f.collector.id,
      });
      assert.equal(duplicate.status, 409);
    },
  );
  await check(
    "Catador executa retirada, gera entradas e destina sem perder origem do PEV",
    async () => {
      assert.equal(
        (
          await api(
            `/collections/${collectionId}/start`,
            "POST",
            {},
            f.collectorToken,
          )
        ).status,
        200,
      );
      const item = (
        await api("/waste-stock/items", "POST", {
          name: "Papel PEV",
          category: "Papel",
          unit: "KG",
        })
      ).body.item;
      const r = await api(
        `/collections/${collectionId}/complete-field`,
        "POST",
        { materials: [{ wasteTypeId: item.id, quantity: 7, unit: "KG" }] },
        f.collectorToken,
      );
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const history = (await api(`/bins/${binId}/withdrawals`)).body.data;
      assert.equal(Number(history.totals[0].quantity), 7);
      const entryId =
        history.collections[0].collectionMaterials[0].wasteEntry.id;
      const d = await api("/collection-waste-destinations", "POST", {
        collectionWasteEntryId: entryId,
        type: "STOCK",
        quantity: 7,
        unit: "KG",
        stockItemId: item.id,
      });
      assert.equal(d.status, 201, JSON.stringify(d.body));
      assert.equal(d.body.stockLot.originCollectionId, collectionId);
      const bin = (await api("/bins/" + binId)).body.data;
      assert.equal(bin.needsPickup, false);
      assert.equal(bin.lastCollectionSource, "RECORDED");
      assert.ok(bin.last_collection_date);
      const list = (await api("/collections")).body.collections;
      assert.equal(list.find((c) => c.id === collectionId).bin.id, binId);
    },
  );
  await check(
    "Isolamento, validações de coordenadas, horários, status e arquivo falso",
    async () => {
      for (const suffix of ["", "/events", "/withdrawals"]) {
        assert.equal(
          (await api(`/bins/${binId}${suffix}`, "GET", undefined, f.otherToken))
            .status,
          404,
        );
      }
      assert.equal(
        (await api(`/bins/${binId}`, "PUT", { name: "Inválido" }, f.otherToken))
          .status,
        404,
      );
      assert.equal(
        (await api("/bins", "GET", undefined, f.driverToken)).status,
        403,
      );
      assert.equal(
        (await api(`/bins/${binId}`, "PUT", { latitude: -3 })).status,
        400,
      );
      assert.equal(
        (await api(`/bins/${binId}`, "PUT", { latitude: 100, longitude: -38 }))
          .status,
        400,
      );
      assert.equal(
        (await api(`/bins/${binId}`, "PUT", { status: "INVALID" })).status,
        400,
      );
      assert.equal(
        (
          await api(`/bins/${binId}`, "PUT", {
            openingHours: [
              { day: 1, intervals: [{ start: "18:00", end: "10:00" }] },
            ],
          })
        ).status,
        400,
      );
      assert.equal(
        (await api(`/bins/${binId}`, "PUT", { vehicle_id: f.otherDriver.id }))
          .status,
        409,
      );
      const form = new FormData();
      form.append(
        "photo",
        new Blob(["not-a-photo"], { type: "image/png" }),
        "fake.png",
      );
      const photo = await fetch(`http://127.0.0.1:3339/bins/${binId}/photo`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + f.token },
        body: form,
      });
      assert.equal(photo.status, 400);
      const duplicate = await api("/bins", "POST", { bin_id: "PEV-FOR-001" });
      assert.equal(duplicate.status, 409);
    },
  );
  await check(
    "Inativação mantém história; página móvel, erros e reconexão",
    async () => {
      await page.goto(`http://127.0.0.1:5179/bin-list/${binId}`);
      await page
        .getByRole("button", { name: "Inativar ponto", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirmar alteração", exact: true })
        .click();
      await page
        .getByText("Funcionamento atualizado. O histórico foi preservado.", {
          exact: true,
        })
        .waitFor();
      assert.equal((await api("/bins/" + binId)).body.data.status, "inactive");
      assert.equal(
        (
          await api(`/bins/${binId}/withdrawals`, "POST", {
            collectorId: f.collector.id,
          })
        ).status,
        409,
      );
      assert.ok(
        (await api(`/bins/${binId}/events`)).body.data.events.length > 4,
      );
      await page.setViewportSize({ width: 430, height: 932 });
      await page.goto("http://127.0.0.1:5179/bin-list?view=map");
      await page.locator(".pev-map").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      );
      await page.screenshot({
        path: join(outputDir, "pevs-mobile.png"),
        fullPage: true,
      });
      await context.setOffline(true);
      await page
        .getByRole("button", { name: "Atualizar PEVs", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(await page.locator(".pev-map").count(), 0);
      await context.setOffline(false);
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page.locator(".pev-map").waitFor();
      assert.deepEqual(pageErrors, []);
    },
  );
} catch (e) {
  outcomes.push({ name: "Ambiente", status: "FAIL", error: e.message });
  console.error(e.stack);
} finally {
  await writeFile(
    join(outputDir, "results.json"),
    JSON.stringify(
      {
        environment:
          "API real Fastify/Prisma + migração incremental sobre baseline + PGlite local + Chromium; dados fictícios; mapa-base externo bloqueado",
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
  for (const file of files) await unlink(file).catch(() => {});
  console.log("REPORT_DIR", outputDir);
  if (outcomes.some((r) => r.status === "FAIL")) process.exitCode = 1;
}
