/** Validação descartável: exige KATUA_VALIDATION_TOOLS, KatuApp ao lado e dependências já instaladas. */
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = process.env.KATUA_APP_DIR || resolve(webDir, "../../KatuApp");
const serverDir = join(appDir, "server");
const toolsDir = process.env.KATUA_VALIDATION_TOOLS;
if (!toolsDir)
  throw Error(
    "Defina KATUA_VALIDATION_TOOLS com as dependências isoladas de validação.",
  );
const require = createRequire(join(resolve(toolsDir), "package.json"));
const { PGlite } = await import(
  pathToFileURL(require.resolve("@electric-sql/pglite"))
);
const { PGLiteSocketServer } = await import(
  pathToFileURL(require.resolve("@electric-sql/pglite-socket"))
);
const { default: chromium } = await import(
  pathToFileURL(require.resolve("@sparticuz/chromium"))
);
const { chromium: pw } = require(
  process.env.KATUA_PLAYWRIGHT_MODULE || "playwright",
);
const outputDir = await mkdtemp(join(tmpdir(), "katua-waste-"));
const databaseUrl =
  "postgresql://postgres:localtest@127.0.0.1:54329/postgres?connection_limit=1";
const outcomes = [],
  children = [];
let browser, db, socket;
async function child(args, cwd, env, ready) {
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(p);
  return new Promise((resolve, reject) => {
    const logs = [];
    const t = setTimeout(
      () => reject(Error("Inicialização excedeu limite")),
      60000,
    );
    const data = (b) => {
      logs.push(b.toString());
      if (ready.test(b.toString())) {
        clearTimeout(t);
        resolve(p);
      }
    };
    p.stdout.on("data", data);
    p.stderr.on("data", data);
    p.on("exit", (code) => {
      clearTimeout(t);
      if (code)
        reject(Error("Inicialização falhou: " + logs.join("").slice(-1000)));
    });
  });
}
async function check(name, fn) {
  try {
    await fn();
    outcomes.push({ name, status: "PASS" });
    console.log("PASS", name);
  } catch (e) {
    outcomes.push({ name, status: "FAIL", error: e.message.slice(0, 1200) });
    console.log("FAIL", name, e.message.slice(0, 300));
  }
}
try {
  const sql = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    {
      cwd: serverDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
    },
  );
  db = await PGlite.create();
  await db.exec(sql);
  socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 54329 });
  await socket.start();
  await child(
    ["--import", "tsx", "tests/operational/local-server.ts"],
    serverDir,
    {
      KATUA_LOCAL_VALIDATION: "1",
      DATABASE_URL: databaseUrl,
      KATUA_VALIDATION_DIR: outputDir,
    },
    /LOCAL_API_READY/,
  );
  const f = JSON.parse(await readFile(join(outputDir, "fixture.json"), "utf8"));
  const api = async (path, method = "GET", body, token = f.token) => {
    const r = await fetch("http://127.0.0.1:3339" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  };
  const paper = (
    await api("/waste-stock/items", "POST", {
      name: "Papel rastreável",
      category: "Papel",
      unit: "KG",
    })
  ).body.item;
  const oil = (
    await api("/waste-stock/items", "POST", {
      name: "Óleo rastreável",
      category: "Óleo",
      unit: "LITER",
    })
  ).body.item;
  assert.ok(paper?.id && oil?.id);
  for (let i = 0; i < 23; i++) {
    const item = i === 0 ? oil : paper,
      quantity = i === 0 ? 5 : 10;
    await db.query(
      'INSERT INTO "CollectionMaterial" (id,"collectionId","wasteTypeId","nameSnapshot",unit,quantity,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
      [
        "wg-material-" + i,
        f.collections.historical.id,
        item.id,
        item.name,
        item.unit,
        quantity,
      ],
    );
    await db.query(
      'INSERT INTO "CollectionWasteEntry" (id,"cooperativeId","collectionId","collectionMaterialId","wasteTypeId","materialNameSnapshot",unit,"collectedQuantity","remainingQuantity","collectedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,NOW())',
      [
        "wg-entry-" + i,
        f.cooperative.id,
        f.collections.historical.id,
        "wg-material-" + i,
        item.id,
        item.name,
        item.unit,
        quantity,
        "2026-10-19T23:59:00-03:00",
      ],
    );
  }
  await child(
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5179"],
    webDir,
    { VITE_API_BASE_URL: "http://127.0.0.1:3339" },
    /Local:/,
  );
  browser = await pw.launch({
    executablePath:
      process.env.KATUA_CHROMIUM_PATH || (await chromium.executablePath()),
    args: chromium.args,
    headless: true,
  });
  const mutations = [];
  async function contextFor(
    token,
    user,
    viewport = { width: 1440, height: 1100 },
  ) {
    const c = await browser.newContext({
      viewport,
      timezoneId: "America/Fortaleza",
    });
    await c.route("**/*", (r) => {
      const u = new URL(r.request().url());
      if (u.port === "3339" && r.request().method() !== "GET")
        mutations.push(r.request().method() + " " + u.pathname);
      return ["127.0.0.1", "localhost"].includes(u.hostname)
        ? r.continue()
        : r.abort();
    });
    await c.addInitScript(
      ({ token, user }) => {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
      },
      { token, user },
    );
    return c;
  }
  const context = await contextFor(f.token, f.owner);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  let metal, manualLot, destination, generatedLot;
  await check(
    "Catálogo: criar, inativar/reativar preserva dados e limpar campos persiste",
    async () => {
      await page.goto("http://127.0.0.1:5179/create-type");
      await page.locator("#waste-name").fill("Metal de validação");
      await page.locator("#waste-category").fill("Metais");
      await page.locator("#waste-unit").selectOption("LITER");
      await page.locator("#waste-description").fill("Descrição removível");
      await page
        .getByRole("button", { name: "Salvar cadastro", exact: true })
        .click();
      await page.waitForURL("**/waste-type-list");
      await page
        .getByRole("status")
        .filter({ hasText: /confirmado pelo servidor/ })
        .waitFor();
      metal = (await api("/waste-stock/items")).body.items.find(
        (i) => i.name === "Metal de validação",
      );
      assert.equal(metal.defaultUnit, "LITER");
      assert.equal(metal.isActive, true);
      let row = page
        .locator("tbody tr")
        .filter({ hasText: "Metal de validação" });
      await row.getByRole("button", { name: "Inativar", exact: true }).click();
      await page
        .getByRole("button", { name: "Confirmar alteração", exact: true })
        .click();
      await row
        .getByRole("button", { name: "Reativar", exact: true })
        .waitFor();
      await row.getByRole("button", { name: "Reativar", exact: true }).click();
      await page
        .getByRole("button", { name: "Confirmar alteração", exact: true })
        .click();
      await row
        .getByRole("button", { name: "Inativar", exact: true })
        .waitFor();
      metal = (await api("/waste-stock/items/" + metal.id)).body.item;
      assert.equal(metal.name, "Metal de validação");
      assert.equal(metal.category, "Metais");
      assert.equal(metal.unit, "LITER");
      assert.equal(metal.isActive, true);
      await row
        .getByRole("link", { name: "Editar cadastro", exact: true })
        .click();
      await page.locator("#waste-description").fill("");
      await page
        .getByRole("button", { name: "Salvar cadastro", exact: true })
        .click();
      await page.waitForURL("**/waste-type-list");
      await page.reload();
      await page
        .locator("tbody tr")
        .filter({ hasText: "Metal de validação" })
        .getByRole("link", { name: "Editar cadastro", exact: true })
        .click();
      await page.locator("#waste-name").waitFor();
      assert.equal(await page.locator("#waste-description").inputValue(), "");
      assert.equal(
        (await api("/waste-stock/items/" + metal.id)).body.item.description,
        null,
      );
    },
  );
  await check(
    "Lote manual: criar, editar, limpar local e origem registrada após recarga",
    async () => {
      await page.goto("http://127.0.0.1:5179/waste-stock/create");
      await page
        .locator('#waste-itemId option[value="' + paper.id + '"]')
        .waitFor({ state: "attached" });
      await page.locator("#waste-itemId").selectOption(paper.id);
      await page.locator("#waste-lotCode").fill("MANUAL-01");
      await page.locator("#waste-quantity").fill("8");
      await page.locator("#waste-origin").fill("Ajuste manual identificado");
      await page.locator("#waste-storageLocation").fill("Galpão A");
      await page
        .getByRole("button", { name: "Salvar lote", exact: true })
        .click();
      await page.waitForURL("**/waste-stock");
      await page
        .getByRole("status")
        .filter({ hasText: /confirmado pelo servidor/ })
        .waitFor();
      manualLot = (
        await api("/waste-stock/items/" + paper.id + "/lots")
      ).body.lots.find((l) => l.lotCode === "MANUAL-01");
      assert.equal(Number(manualLot.availableQuantity), 8);
      await page.goto(
        "http://127.0.0.1:5179/waste-stock/lots/" + manualLot.id + "/edit",
      );
      await page.locator("#waste-storageLocation").fill("");
      await page.locator("#waste-notes").fill("Conferido");
      await page
        .getByRole("button", { name: "Salvar lote", exact: true })
        .click();
      await page.waitForURL("**/waste-stock");
      await page.reload();
      manualLot = (
        await api("/waste-stock/items/" + paper.id + "/lots")
      ).body.lots.find((l) => l.id === manualLot.id);
      assert.equal(manualLot.storageLocation, null);
      assert.equal(manualLot.notes, "Conferido");
    },
  );
  await check(
    "Entradas: paginação real, totais por unidade e período inclui fim do dia",
    async () => {
      await page.goto("http://127.0.0.1:5179/collected-waste");
      await page.locator("tbody tr").first().waitFor();
      assert.equal(await page.locator("tbody tr").count(), 20);
      await page.getByRole("button", { name: "Próxima", exact: true }).click();
      await page.waitForFunction(
        () => document.querySelectorAll("tbody tr").length === 3,
      );
      assert.equal(await page.locator("tbody tr").count(), 3);
      await page.locator("#filter-dateFrom").fill("2026-10-19");
      await page.locator("#filter-dateTo").fill("2026-10-19");
      await page
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click();
      await page
        .getByText(/220 kg.*5 L|5 L.*220 kg/)
        .first()
        .waitFor();
      await page.locator("#filter-unit").selectOption("LITER");
      await page
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click();
      await page.locator("tbody tr").first().waitFor();
      assert.equal(await page.locator("tbody tr").count(), 1);
      await page
        .getByRole("cell")
        .filter({ hasText: "Óleo rastreável" })
        .waitFor();
    },
  );
  await check(
    "Destinar para estoque: saldo, lote rastreável e quantidade preservada",
    async () => {
      await page.goto("http://127.0.0.1:5179/collected-waste/wg-entry-1");
      await page
        .getByRole("button", { name: "Registrar destinação", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("radio", { name: /Adicionar ao estoque/ }).check();
      await page.locator("#destination-quantity").fill("4");
      await page
        .locator('#stock-item option[value="' + paper.id + '"]')
        .waitFor({ state: "attached" });
      assert.equal(
        await page
          .locator('#stock-item option[value="' + oil.id + '"]')
          .count(),
        0,
      );
      await page.locator("#stock-item").selectOption(paper.id);
      await page.locator("#destination-notes").fill("Nota removível");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Registrar destinação", exact: true })
        .click();
      await page
        .getByText("Destinação salva e confirmada pelo servidor.", {
          exact: true,
        })
        .waitFor();
      const e = (await api("/collection-entries/wg-entry-1")).body.entry;
      assert.equal(Number(e.remainingQuantity), 6);
      destination = (
        await api(
          "/collection-waste-destinations?collectionWasteEntryId=wg-entry-1",
        )
      ).body.destinations[0];
      generatedLot = (
        await api("/waste-stock/items/" + paper.id + "/lots")
      ).body.lots.find((l) => l.id === destination.stockLotId);
      assert.equal(generatedLot.originCollectionWasteEntryId, "wg-entry-1");
      await page.goto(
        "http://127.0.0.1:5179/waste-stock/lots/" + generatedLot.id + "/edit",
      );
      await page.locator("#waste-quantity").waitFor();
      assert.equal(await page.locator("#waste-quantity").isEditable(), false);
      const denied = await api(
        "/waste-stock/lots/" + generatedLot.id,
        "PATCH",
        { quantity: 99 },
      );
      assert.ok(denied.status >= 400);
      assert.equal(
        Number(
          (
            await api("/waste-stock/items/" + paper.id + "/lots")
          ).body.lots.find((l) => l.id === generatedLot.id).quantity,
        ),
        4,
      );
    },
  );
  await check(
    "Histórico: edição nullable, cancelamento rejeitado mantém motivo e cancelamento real restaura saldo",
    async () => {
      await page.goto(
        "http://127.0.0.1:5179/waste-destinations?entryId=wg-entry-1",
      );
      await page
        .getByRole("button", { name: "Editar destinação", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.locator("#destination-notes").fill("");
      await page
        .getByRole("button", { name: "Salvar Alterações", exact: true })
        .click();
      await page
        .getByText("Destinação salva e confirmada pelo servidor.", {
          exact: true,
        })
        .waitFor();
      assert.equal(
        (await api("/collection-waste-destinations/" + destination.id)).body
          .destination.notes,
        null,
      );
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await page
        .locator("#cancel-reason")
        .fill("Correção operacional identificada");
      await page.route("**/collection-waste-destinations/*/cancel", (r) =>
        r.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Conflito controlado de cancelamento",
          }),
        }),
      );
      await page
        .getByRole("button", { name: "Confirmar cancelamento", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Conflito controlado" })
        .waitFor();
      assert.equal(
        await page.locator("#cancel-reason").inputValue(),
        "Correção operacional identificada",
      );
      await page.unroute("**/collection-waste-destinations/*/cancel");
      await page
        .getByRole("button", { name: "Confirmar cancelamento", exact: true })
        .click();
      await page
        .getByText(
          "Cancelamento confirmado pelo servidor. O histórico foi preservado.",
          { exact: true },
        )
        .waitFor();
      const e = (await api("/collection-entries/wg-entry-1")).body.entry;
      assert.equal(Number(e.remainingQuantity), 10);
      const lot = (
        await api("/waste-stock/items/" + paper.id + "/lots")
      ).body.lots.find((l) => l.id === generatedLot.id);
      assert.equal(lot.status, "CANCELLED");
      await page.locator("#filter-status").selectOption("CANCELLED");
      await page
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click();
      await page
        .getByText("Correção operacional identificada", { exact: false })
        .waitFor();
      await page.reload();
      await page.locator("#filter-status").selectOption("CANCELLED");
      await page
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click();
      await page.locator("tbody tr").first().waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Editar destinação", exact: true })
          .count(),
        0,
      );
    },
  );
  await check(
    "Saldo insuficiente/unidade errada e concorrência não criam movimentação parcial",
    async () => {
      const wrong = await api("/collection-waste-destinations", "POST", {
        collectionWasteEntryId: "wg-entry-2",
        type: "STOCK",
        quantity: 2,
        unit: "LITER",
        stockItemId: paper.id,
      });
      assert.ok(wrong.status >= 400);
      const over = await api("/collection-waste-destinations", "POST", {
        collectionWasteEntryId: "wg-entry-2",
        type: "STOCK",
        quantity: 99,
        unit: "KG",
        stockItemId: paper.id,
      });
      assert.equal(over.status, 409);
      const send = () =>
        api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: "wg-entry-2",
          type: "RESERVATION",
          quantity: 7,
          unit: "KG",
          destinationName: "Reserva operacional",
        });
      const r = await Promise.all([send(), send()]);
      assert.equal(r.filter((x) => x.status === 201).length, 1);
      assert.equal(r.filter((x) => x.status >= 400).length, 1);
      assert.equal(
        Number(
          (await api("/collection-entries/wg-entry-2")).body.entry
            .remainingQuantity,
        ),
        3,
      );
    },
  );
  await check(
    "Tipos de destinação, histórico paginado e bloqueio de lote vendido",
    async () => {
      await page.goto("http://127.0.0.1:5179/collected-waste/wg-entry-3");
      await page
        .getByRole("button", { name: "Registrar destinação", exact: true })
        .click();
      await page.getByRole("radio", { name: /Reservar material/ }).check();
      await page.locator("#destination-quantity").fill("1");
      await page
        .locator("#destination-name")
        .fill("Reserva para operação identificada");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Registrar destinação", exact: true })
        .click();
      await page
        .getByText("Destinação salva e confirmada pelo servidor.", {
          exact: true,
        })
        .waitFor();
      for (const type of [
        "TRIAGE",
        "REJECT",
        "DISPOSAL",
        "DIRECT_DESTINATION",
      ]) {
        const result = await api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: "wg-entry-3",
          type,
          quantity: 1,
          unit: "KG",
          destinationName: "Unidade de teste",
          notes: "Motivo documentado",
        });
        assert.equal(result.status, 201);
      }
      for (let i = 0; i < 25; i++) {
        const result = await api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: "wg-entry-4",
          type: "RESERVATION",
          quantity: 0.1,
          unit: "KG",
          destinationName: "Histórico " + i,
        });
        assert.equal(result.status, 201);
      }
      await page.goto("http://127.0.0.1:5179/collected-waste/wg-entry-4");
      await page.locator("tbody tr").first().waitFor();
      assert.equal(await page.locator("tbody tr").count(), 20);
      await page.getByRole("button", { name: "Próxima", exact: true }).click();
      await page.waitForFunction(
        () => document.querySelectorAll("tbody tr").length === 5,
      );
      const result = await api("/collection-waste-destinations", "POST", {
        collectionWasteEntryId: "wg-entry-5",
        type: "STOCK",
        quantity: 2,
        unit: "KG",
        stockItemId: paper.id,
      });
      assert.equal(result.status, 201);
      const dest = result.body.destination;
      await api("/waste-stock/lots/" + dest.stockLotId, "PATCH", {
        status: "SOLD",
      });
      const denied = await api(
        "/collection-waste-destinations/" + dest.id + "/cancel",
        "POST",
        { reason: "Não pode desfazer lote vendido" },
      );
      assert.equal(denied.status, 409);
      assert.equal(
        (await api("/collection-waste-destinations/" + dest.id)).body
          .destination.status,
        "ACTIVE",
      );
      assert.equal(
        (await api("/collections/" + f.collections.historical.id)).body
          .collection.status,
        "COLLECTED",
      );
    },
  );
  await check(
    "Estoque não soma vendidos e descartados no disponível; navegação móvel",
    async () => {
      await api("/waste-stock/lots/" + manualLot.id, "PATCH", {
        status: "SOLD",
      });
      await page.goto("http://127.0.0.1:5179/waste-stock");
      await page
        .getByRole("button", { name: /Ver lotes/ })
        .first()
        .waitFor();
      const row = page
        .locator("tbody tr")
        .filter({ hasText: "Papel rastreável" })
        .first();
      await row.getByRole("button", { name: /Ver lotes/ }).click();
      await page.getByText("MANUAL-01", { exact: true }).waitFor();
      await page.screenshot({
        path: join(outputDir, "estoque-desktop.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 430, height: 932 });
      await page.waitForFunction(
        () =>
          document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
      );
      await page.screenshot({ path: join(outputDir, "estoque-mobile.png") });
      await page.goto("http://127.0.0.1:5179/collected-waste/wg-entry-3");
      await page
        .getByRole("button", { name: "Registrar destinação", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      assert.ok(
        await page.getByRole("dialog").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.right <= innerWidth &&
            el.contains(document.elementFromPoint(r.left + 20, r.top + 20))
          );
        }),
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () => !!document.activeElement.closest("[role=dialog]"),
        ),
        true,
      );
      await page.screenshot({ path: join(outputDir, "destinacao-mobile.png") });
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Erro e reconexão não exibem zeros nem dados antigos; isolamento entre cooperativas e perfis",
    async () => {
      await page.goto("http://127.0.0.1:5179/collected-waste");
      await page.locator("tbody tr").first().waitFor();
      await context.setOffline(true);
      await page
        .getByRole("button", { name: "Atualizar entradas", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(await page.locator("tbody tr").count(), 0);
      await context.setOffline(false);
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page.locator("tbody tr").first().waitFor();
      for (const path of [
        "/waste-stock/items/" + paper.id,
        "/collection-entries/wg-entry-1",
        "/collection-waste-destinations/" + destination.id,
      ]) {
        const r = await api(path, "GET", null, f.otherToken);
        assert.ok(r.status >= 400);
      }
      const forbiddenEdit = await api(
        "/waste-stock/items/" + paper.id,
        "PATCH",
        { name: "Não pode alterar" },
        f.otherToken,
      );
      assert.ok(forbiddenEdit.status >= 400);
      const forbiddenCreate = await api(
        "/collection-waste-destinations",
        "POST",
        {
          collectionWasteEntryId: "wg-entry-1",
          type: "RESERVATION",
          quantity: 1,
          unit: "KG",
          destinationName: "Teste de acesso",
        },
        f.otherToken,
      );
      assert.ok(forbiddenCreate.status >= 400);
      const forbiddenDriver = await api(
        "/collection-waste-destinations",
        "POST",
        {
          collectionWasteEntryId: "wg-entry-1",
          type: "RESERVATION",
          quantity: 1,
          unit: "KG",
          destinationName: "Teste de perfil",
        },
        f.driverToken,
      );
      assert.equal(forbiddenDriver.status, 403);
      const other = await contextFor(f.otherToken, f.otherUser);
      const p = await other.newPage();
      await p.goto("http://127.0.0.1:5179/waste-stock");
      await p
        .getByText(
          "Nenhum registro corresponde aos filtros. Cadastre um tipo de resíduo para começar.",
          { exact: true },
        )
        .waitFor();
      const driver = await contextFor(f.driverToken, {
        id: f.driver1.userId,
        role: "DRIVER",
      });
      const d = await driver.newPage();
      await d.goto("http://127.0.0.1:5179/waste-type-list");
      await d.waitForURL("**/login");
    },
  );
} catch (e) {
  outcomes.push({ name: "Ambiente", status: "FAIL", error: e.message });
  console.error(e.message.slice(0, 1000));
} finally {
  await writeFile(
    join(outputDir, "results.json"),
    JSON.stringify(
      {
        environment:
          "API Fastify/Prisma e banco PGlite locais; Chromium desktop/móvel; dados fictícios; sem produção",
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
  console.log("REPORT_DIR", outputDir);
  if (outcomes.some((r) => r.status === "FAIL")) process.exitCode = 1;
}
