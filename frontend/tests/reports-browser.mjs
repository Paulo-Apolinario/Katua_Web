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
      "katua-reports-",
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
    ["--import", "tsx", "tests/reports/local-server.ts"],
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

  const base = { start: "2026-10-01", end: "2026-10-21" };
  const report = async (kind = "overview", extra = {}, token = f.token) =>
    api(
      "/reports/" + kind + "?" + new URLSearchParams({ ...base, ...extra }),
      "GET",
      undefined,
      token,
    );
  await check(
    "Migração incremental e totais por unidade, sem duplicar coleta/estoque",
    async () => {
      const r = await report();
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const d = r.body.data;
      assert.equal(d.summary.records, 28);
      assert.equal(d.summary.executed, 26);
      assert.equal(d.summary.massKg, 246);
      assert.deepEqual(d.summary.units, { KG: 146, TON: 0.1, LITER: 7 });
      assert.equal(d.summary.missingQuantity, 1);
      assert.equal(d.flow.stock.KG, 100);
      assert.equal(d.flow.destined.KG, 100);
      assert.equal(d.flow.pendingCurrent.KG, 0);
      assert.equal(d.environmental.co2Kg, null);
      assert.equal(d.previous.massKg, 500);
      assert.equal(d.meta.undatedInScope, 1);
      assert.equal(d.points[0].city, "Sobral");
    },
  );
  await check(
    "Paginação e exportação abrangem o mesmo recorte completo",
    async () => {
      const a = (await report("collections")).body.data,
        b = (await report("collections", { export: "true" })).body.data;
      assert.equal(a.rows.length, 20);
      assert.equal(b.rows.length, 28);
      assert.equal(a.summary.massKg, b.summary.massKg);
      const p2 = (await report("collections", { page: "2" })).body.data;
      assert.equal(p2.rows.length, 8);
      assert.equal(new Set([...a.rows, ...p2.rows].map((r) => r.id)).size, 28);
    },
  );
  await check(
    "Filtros de unidade/material/status preservam legado e excluem quantidade cancelada",
    async () => {
      const kg = (await report("overview", { unit: "KG" })).body.data;
      assert.equal(kg.summary.units.KG, 146);
      assert.equal(kg.summary.units.TON, undefined);
      const m = (await report("overview", { materialId: f.kg.id })).body.data;
      assert.equal(m.summary.massKg, 221);
      const c = (await report("collections", { status: "CANCELLED" })).body
        .data;
      assert.equal(c.summary.records, 1);
      assert.equal(c.summary.massKg, 0);
      assert.equal(c.summary.executed, 0);
      const missing = (
        await report("collections", { execution: "MISSING_QUANTITY" })
      ).body.data;
      assert.equal(missing.summary.records, 1);
    },
  );
  await check(
    "Recebimento e destinação respeitam a data própria; estoque é atual",
    async () => {
      const r = (
        await report("waste", {
          stage: "RECEIVED",
          start: "2026-10-03",
          end: "2026-10-03",
        })
      ).body.data;
      assert.equal(r.summary.massKg, 100);
      const d = (
        await report("waste", {
          stage: "DESTINED",
          start: "2026-10-09",
          end: "2026-10-09",
        })
      ).body.data;
      assert.equal(d.rows.length, 1);
      assert.equal(d.summary.massKg, 100);
      const none = (
        await report("waste", {
          stage: "DESTINED",
          start: "2026-10-01",
          end: "2026-10-01",
        })
      ).body.data;
      assert.equal(none.rows.length, 0);
      const stock = (
        await report("waste", {
          stage: "STOCK",
          start: "2020-01-01",
          end: "2020-01-01",
        })
      ).body.data;
      assert.equal(stock.summary.massKg, 100);
      assert.equal(stock.meta.scope, "Estoque atual");
    },
  );
  await check(
    "Equipe e veículos usam atribuições reais e custos registrados",
    async () => {
      const s = (
        await report("staff", { role: "COLLECTOR", search: "Catadora" })
      ).body.data;
      assert.equal(s.rows.length, 1);
      assert.equal(s.rows[0].count, 26);
      assert.equal(s.summary.massKg, 246);
      const v = (await report("vehicles", { search: "QAA1234" })).body.data;
      assert.equal(v.rows.length, 1);
      assert.equal(v.summary.massKg, 246);
      assert.equal(v.summary.maintenanceCost, 123.5);
      assert.equal(v.rows[0].capacityKg, 1000);
      const both = (await report("staff")).body.data;
      assert.equal(both.rows.length, 2);
      assert.equal(both.summary.massKg, 246);
    },
  );
  await check(
    "Isolamento de cooperativas, autorização e ausência de dados pessoais",
    async () => {
      assert.equal((await report("overview", {}, f.driverToken)).status, 403);
      assert.equal(
        (
          await api(
            "/reports/collections/" + f.first.id,
            "GET",
            undefined,
            f.otherToken,
          )
        ).status,
        404,
      );
      const own = (await report("collections", { export: "true" })).body.data;
      assert(!own.rows.some((r) => r.id === f.foreignCollection.id));
      assert(!JSON.stringify(own.rows).includes("@example.invalid"));
      const other = (await report("collections", {}, f.otherToken)).body.data;
      assert.equal(other.summary.massKg, 9000);
      const detail = await api("/reports/collections/" + f.first.id);
      assert.equal(detail.status, 200);
      assert.equal(detail.body.data.collection.massKg, 100);
    },
  );
  await check(
    "Validação de datas, extensão e campos desconhecidos",
    async () => {
      assert.equal(
        (await report("overview", { start: "2026-02-30" })).status,
        400,
      );
      assert.equal(
        (await report("overview", { start: "2024-01-01" })).status,
        400,
      );
      assert.equal((await report("overview", { unexpected: "1" })).status, 400);
    },
  );
  await check(
    "Metas e metodologia persistem com proteção de versão e material da cooperativa",
    async () => {
      const settings = {
        version: 0,
        goals: { monthlyCollections: 100, monthlyMassKg: 500 },
        methodology: {
          label: "Fator QA",
          source: "Fonte de validação",
          url: "",
          version: "1",
          factors: [{ materialId: f.kg.id, co2PerKg: 2 }],
        },
      };
      const saved = await api("/reports/config", "PUT", settings);
      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      assert.equal((await api("/reports/config", "PUT", settings)).status, 409);
      const response = await report();
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const d = response.body.data;
      assert.equal(d.environmental.coveredMassKg, 221);
      assert.equal(d.environmental.co2Kg, 442);
      assert.equal(
        (await api("/reports/context")).body.data.settings.goals
          .monthlyCollections,
        100,
      );
      assert.equal(
        (
          await api("/reports/config", "PUT", {
            ...settings,
            version: 1,
            methodology: { ...settings.methodology, source: "" },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await api("/reports/config", "PUT", {
            ...settings,
            version: 1,
            methodology: {
              ...settings.methodology,
              factors: [{ materialId: "foreign-id", co2PerKg: 1 }],
            },
          })
        ).status,
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
      displayName: "QA Relatórios",
    }),
    page = await context.newPage(),
    pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const qs = new URLSearchParams(base).toString();
  const paths = [
    "analytics-dashboard",
    "waste-collection-reports",
    "waste-type-reports",
    "staff-reports",
    "vehicle-reports",
  ];
  await check(
    "Cinco telas reais carregam no desktop, com tabela e sem erro JavaScript",
    async () => {
      for (const path of paths) {
        await page.goto("http://127.0.0.1:5179/" + path + "?" + qs);
        await page
          .getByRole("heading", {
            name: "Registros para conferência",
            exact: true,
          })
          .waitFor();
        assert.equal(await page.getByRole("alert").count(), 0);
        if (path !== "waste-type-reports") {
          await page.locator(".recharts-surface").first().waitFor();
          assert(
            (await page.locator(".recharts-surface").first().boundingBox())
              .width > 100,
          );
        }
        await page.screenshot({
          path: join(outputDir, path + ".png"),
          fullPage: true,
        });
      }
      assert.deepEqual(pageErrors, []);
    },
  );
  await check(
    "Filtros aplicados e salvos, detalhes com Escape e exportações completas reais",
    async () => {
      await page.goto("http://127.0.0.1:5179/waste-collection-reports?" + qs);
      await page
        .getByRole("heading", {
          name: "Registros para conferência",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "Salvar filtros", exact: true })
        .click();
      assert(
        await page
          .getByText(
            "Filtros salvos neste navegador para seu usuário e cooperativa.",
            { exact: true },
          )
          .isVisible(),
      );
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page
          .getByRole("button", { name: "Exportar Excel", exact: true })
          .click(),
      ]);
      const xlsxPath = join(outputDir, "coletas.xlsx");
      await download.saveAs(xlsxPath);
      const XLSX = createRequire(join(webDir, "package.json"))("xlsx");
      const wb = XLSX.readFile(xlsxPath);
      assert.equal(XLSX.utils.sheet_to_json(wb.Sheets.Registros).length, 28);
      assert(wb.Sheets.Resumo);
      assert(wb.Sheets.Metodologia);
      const [pdf] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Exportar PDF", exact: true }).click(),
      ]);
      const pdfPath = join(outputDir, "coletas.pdf");
      await pdf.saveAs(pdfPath);
      const pdfText = execFileSync("pdftotext", [pdfPath, "-"], {
        encoding: "utf8",
      });
      assert(pdfText.includes("Cooperativa QA Sobral"));
      assert(pdfText.includes("28 registros"));
      assert(pdfText.includes("Gerador QA Sobral"));
      await page
        .getByRole("button", { name: "Conferir coleta", exact: true })
        .first()
        .click();
      await page
        .getByRole("dialog", { name: "Conferência da coleta" })
        .waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page
        .getByLabel("Unidade do material", { exact: true })
        .selectOption("LITER");
      await page
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click();
      await page.waitForURL(/unit=LITER/);
      await page
        .getByRole("heading", {
          name: "Registros para conferência",
          exact: true,
        })
        .waitFor();
      await page.getByRole("cell", { name: "7 L", exact: true }).waitFor();
    },
  );
  await check("Layout móvel sem transbordamento da página", async () => {
    const mobile = await contextFor(
      f.token,
      { id: f.owner.id, role: "COOPERATIVE", displayName: "QA" },
      { width: 390, height: 844 },
    );
    const p = await mobile.newPage();
    for (const path of paths) {
      await p.goto("http://127.0.0.1:5179/" + path + "?" + qs);
      await p
        .getByRole("heading", {
          name: "Registros para conferência",
          exact: true,
        })
        .waitFor();
      const width = await p.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      assert(
        width.scroll <= width.viewport + 1,
        JSON.stringify({ path, ...width }),
      );
    }
    await p.screenshot({ path: join(outputDir, "mobile.png"), fullPage: true });
    await mobile.close();
  });
  await check(
    "Falha de API limpa resultados e permite recuperação sem dados antigos",
    async () => {
      await context.route("**/reports/collections?*", (r) =>
        r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha simulada para validação" }),
        }),
      );
      await page.goto("http://127.0.0.1:5179/waste-collection-reports?" + qs);
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page
          .getByRole("heading", {
            name: "Registros para conferência",
            exact: true,
          })
          .count(),
        0,
      );
      await context.unroute("**/reports/collections?*");
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "Registros para conferência",
          exact: true,
        })
        .waitFor();
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
