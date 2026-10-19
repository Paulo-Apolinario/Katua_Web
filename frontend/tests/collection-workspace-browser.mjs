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
const outputDir = await mkdtemp(join(tmpdir(), "katua-collections-"));
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
  await db.query(
    'INSERT INTO "Generator" (id,"cooperativeId",type,name,email,address,city,neighborhood,"updatedAt") VALUES ($1,$2,\'SMALL\',$3,$4,$5,$6,$7,NOW())',
    [
      "cw-generator",
      f.cooperative.id,
      "Gerador Fortaleza",
      "cw@example.invalid",
      "Rua A, 10",
      "Fortaleza",
      "Centro",
    ],
  );
  await db.query(
    'INSERT INTO "Collector" (id,"cooperativeId",name,email,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',
    [
      "cw-collector",
      f.cooperative.id,
      "Catador disponível",
      "collector-cw@example.invalid",
    ],
  );
  await db.query(
    'UPDATE "Collection" SET "generatorId"=$1, materials=$2::jsonb WHERE id=$3',
    [
      "cw-generator",
      JSON.stringify([
        { name: "Óleo", quantity: 2.5, unit: "LITER" },
        { name: "Papel", quantity: 3, unit: "KG" },
      ]),
      f.collections.historical.id,
    ],
  );
  for (let i = 0; i < 58; i++)
    await db.query(
      'INSERT INTO "Collection" (id,"cooperativeId","generatorId",status,"updatedAt") VALUES ($1,$2,$3,\'PENDING\',NOW())',
      [
        "cw-extra-" + String(i).padStart(2, "0"),
        f.cooperative.id,
        "cw-generator",
      ],
    );
  for (let i = 0; i < 14; i++)
    await db.query(
      'INSERT INTO "Schedule" (id,"cooperativeId","generatorId","requestedByUserId","preferredDate","scheduledDate","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
      [
        "cw-request-" + i,
        f.cooperative.id,
        "cw-generator",
        f.owner.id,
        "2026-10-22T12:00:00Z",
        i === 0 ? "2026-10-23T12:00:00Z" : null,
      ],
    );
  await db.query(
    'INSERT INTO "ScheduleRequestedMaterial" (id,"scheduleId","nameSnapshot",unit,"estimatedQuantity","updatedAt") VALUES (\'cw-material\',\'cw-request-0\',\'Papel solicitado\',\'KG\',15,NOW())',
  );
  await db.query("UPDATE \"Vehicle\" SET status='MAINTENANCE' WHERE id=$1", [
    f.vehicle2.id,
  ]);
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
    const c = await browser.newContext({ viewport });
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
  await check(
    "Coletas completas (>50), paginação, filtros, unidades e histórico",
    async () => {
      await page.goto("http://127.0.0.1:5179/waste-list");
      await page
        .getByRole("heading", { name: "Lista de Coletas", exact: true })
        .waitFor();
      await page.locator("tbody tr").first().waitFor();
      assert.equal(await page.locator("tbody tr").count(), 10);
      await page
        .getByRole("combobox", { name: "Registros por página" })
        .selectOption("50");
      assert.equal(await page.locator("tbody tr").count(), 50);
      await page.getByRole("button", { name: "Próxima", exact: true }).click();
      assert.ok((await page.locator("tbody tr").count()) > 0);
      await page.locator("#collection-status").selectOption("COLLECTED");
      assert.equal(await page.locator("tbody tr").count(), 3);
      await page.locator("#collection-search").fill("Óleo");
      assert.equal(await page.locator("tbody tr").count(), 1);
      await page.getByText("2,5 L · 3 kg", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Ver detalhes", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("heading", { name: "Gerador Fortaleza" })
        .waitFor();
      await page
        .getByRole("dialog")
        .getByText("QA Motorista Ana", { exact: true })
        .waitFor();
      await page.getByRole("cell", { name: "2,5 L", exact: true }).waitFor();
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () => !!document.activeElement.closest("[role=dialog]"),
        ),
        true,
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page
        .getByRole("button", { name: "Limpar filtros", exact: true })
        .click();
      await page.locator("#collection-start").fill("2026-10-20");
      await page.locator("#collection-end").fill("2026-10-19");
      await page.getByRole("alert").waitFor();
      assert.equal(await page.locator("tbody tr").count(), 0);
      await page
        .getByRole("button", { name: "Limpar filtros", exact: true })
        .click();
      await page.reload();
      await page.locator("tbody tr").first().waitFor();
      await page.screenshot({
        path: join(outputDir, "coletas-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Solicitações: filtros e datas separadas; rejeição preserva formulário e foco",
    async () => {
      await page.goto("http://127.0.0.1:5179/collection-requests");
      await page.locator("tbody tr").first().waitFor();
      assert.equal(await page.locator("tbody tr").count(), 10);
      await page.getByRole("button", { name: "Próxima", exact: true }).click();
      assert.equal(await page.locator("tbody tr").count(), 4);
      await page.locator("#request-search").fill("cw-request-0");
      assert.equal(await page.locator("tbody tr").count(), 1);
      await page.getByText("Programada: 23/10/2026", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Analisar solicitação", exact: true })
        .click();
      await page
        .getByRole("combobox", { name: "Catador responsável *", exact: true })
        .waitFor();
      await page
        .locator("#delegate-collectorId option")
        .filter({ hasText: "Catador disponível" })
        .waitFor({ state: "attached" });
      await page.getByRole("cell", { name: "15 kg", exact: true }).waitFor();
      assert.equal(
        await page
          .locator('#delegate-vehicleId option[value="' + f.vehicle2.id + '"]')
          .count(),
        0,
      );
      await page.locator("#delegate-collectorId").selectOption("cw-collector");
      await page.locator("#delegate-routeId").selectOption(f.routes.equipe.id);
      assert.equal(
        await page.locator("#delegate-driverId").inputValue(),
        f.driver1.id,
      );
      assert.equal(
        await page.locator("#delegate-vehicleId").inputValue(),
        f.vehicle1.id,
      );
      assert.equal(await page.locator("#delegate-driverId").isDisabled(), true);
      await page.locator("#delegate-notes").fill("Orientação preservada");
      await page.route("**/collections", (r) =>
        r.request().method() === "POST"
          ? r.fulfill({
              status: 409,
              contentType: "application/json",
              body: JSON.stringify({
                error: "Conflito controlado de atribuição",
              }),
            })
          : r.continue(),
      );
      await page
        .getByRole("button", { name: "Aceitar e atribuir coleta", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Conflito controlado" })
        .waitFor();
      assert.equal(
        await page.locator("#delegate-notes").inputValue(),
        "Orientação preservada",
      );
      await page.unroute("**/collections");
    },
  );
  let createdId;
  await check(
    "Delegação real persiste após recarga, mantém previsão e não duplica solicitação",
    async () => {
      await page
        .getByRole("button", { name: "Aceitar e atribuir coleta", exact: true })
        .click();
      await page
        .getByRole("link", { name: "Ver coleta criada", exact: true })
        .waitFor();
      const href = await page
        .getByRole("link", { name: "Ver coleta criada", exact: true })
        .getAttribute("href");
      createdId = new URL("http://localhost" + href).searchParams.get("coleta");
      const res = await fetch(
        "http://127.0.0.1:3339/collections/" + createdId,
        { headers: { Authorization: "Bearer " + f.token } },
      );
      assert.equal(res.status, 200);
      const c = (await res.json()).collection;
      assert.equal(c.driverId, f.driver1.id);
      assert.equal(c.vehicleId, f.vehicle1.id);
      assert.equal(c.notes, "Orientação preservada");
      assert.equal(c.status, "PENDING");
      assert.equal(c.collectionMaterials.length, 0);
      await page
        .getByRole("link", { name: "Ver coleta criada", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("heading", { name: "Gerador Fortaleza" })
        .waitFor();
      await page.reload();
      await page
        .getByRole("dialog")
        .getByRole("heading", { name: "Gerador Fortaleza" })
        .waitFor();
      await page.keyboard.press("Escape");
      await page.goto("http://127.0.0.1:5179/collection-requests");
      await page.locator("tbody tr").first().waitFor();
      await page.locator("#request-search").fill("cw-request-0");
      await page
        .getByText("Nenhuma solicitação corresponde aos filtros.", {
          exact: true,
        })
        .waitFor();
      await page.locator("#request-group").selectOption("DELEGATED");
      await page
        .getByRole("button", { name: "Ver detalhes", exact: true })
        .click();
      await page
        .getByText(
          "Esta solicitação já possui coleta vinculada ou está encerrada. Não é possível delegá-la novamente.",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", {
            name: "Aceitar e atribuir coleta",
            exact: true,
          })
          .count(),
        0,
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Falhas de listagem/opções não viram lista vazia ou sucesso; modo móvel",
    async () => {
      await page.route("**/schedules", (r) =>
        r.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha controlada de listagem" }),
        }),
      );
      await page
        .getByRole("button", { name: "Atualizar solicitações", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Falha controlada de listagem" })
        .waitFor();
      assert.equal(await page.locator("tbody tr").count(), 0);
      await page.unroute("**/schedules");
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Limpar filtros", exact: true })
        .click();
      await page.locator("tbody tr").first().waitFor();
      await page.locator("#request-group").selectOption("REQUESTED");
      await page.route("**/vehicles", (r) =>
        r.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Sem veículos" }),
        }),
      );
      await page
        .getByRole("button", { name: "Analisar solicitação", exact: true })
        .first()
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Não foi possível consultar todas as opções" })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", {
            name: "Aceitar e atribuir coleta",
            exact: true,
          })
          .isDisabled(),
        true,
      );
      await page.unroute("**/vehicles");
      await page
        .getByRole("button", {
          name: "Atualizar opções de equipe",
          exact: true,
        })
        .click();
      await page
        .locator('#delegate-collectorId option[value="cw-collector"]')
        .waitFor({ state: "attached" });
      await page.setViewportSize({ width: 430, height: 932 });
      await page.waitForFunction(
        () =>
          document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
      );
      assert.ok(
        await page.getByRole("dialog").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.right <= window.innerWidth &&
            el.contains(document.elementFromPoint(r.left + 20, r.top + 20))
          );
        }),
      );
      await page.screenshot({
        path: join(outputDir, "solicitacao-mobile.png"),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await page.screenshot({
        path: join(outputDir, "solicitacoes-mobile.png"),
        fullPage: false,
      });
    },
  );
  await check(
    "Reconexão e duas tentativas simultâneas sem duplicar coleta",
    async () => {
      await page.goto("http://127.0.0.1:5179/waste-list");
      await page.locator("tbody tr").first().waitFor();
      await context.setOffline(true);
      await page
        .getByRole("button", { name: "Atualizar coletas", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(await page.locator("tbody tr").count(), 0);
      await context.setOffline(false);
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page.locator("tbody tr").first().waitFor();
      const send = () =>
        fetch("http://127.0.0.1:3339/collections", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + f.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scheduleId: "cw-request-1",
            collectorId: "cw-collector",
          }),
        });
      const results = await Promise.all([send(), send()]);
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      assert.equal(results.filter((r) => r.status >= 400).length, 1);
      const count = await db.query(
        'SELECT count(*)::int as total FROM "Collection" WHERE "scheduleId"=$1',
        ["cw-request-1"],
      );
      assert.equal(count.rows[0].total, 1);
    },
  );
  await check(
    "Outra cooperativa não consulta coleta nem solicitação; motorista não acessa painel",
    async () => {
      for (const path of [
        "/collections/" + createdId,
        "/schedules/cw-request-0",
      ]) {
        const res = await fetch("http://127.0.0.1:3339" + path, {
          headers: { Authorization: "Bearer " + f.otherToken },
        });
        assert.equal(res.status, 404);
      }
      const other = await contextFor(f.otherToken, f.otherUser);
      const p = await other.newPage();
      await p.goto("http://127.0.0.1:5179/waste-list");
      await p
        .getByText(
          "Nenhuma coleta operacional cadastrada. Aceite uma solicitação para começar.",
          { exact: true },
        )
        .waitFor();
      await p.goto("http://127.0.0.1:5179/collection-requests");
      await p
        .getByText("Nenhuma solicitação cadastrada.", { exact: true })
        .waitFor();
      const driver = await contextFor(f.driverToken, {
        id: f.driver1.userId,
        role: "DRIVER",
      });
      const d = await driver.newPage();
      await d.goto("http://127.0.0.1:5179/waste-list");
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
