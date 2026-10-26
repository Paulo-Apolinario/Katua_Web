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
      "katua-recurring-routes-",
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
    .replace(/model RoutePlan \{[\s\S]*?\n\}/, "")
    .replace(/^\s*routePlans RoutePlan\[\]$/m, "")
    .replace(/model Route \{[\s\S]*?\n\}/, (block) =>
      block
        .replace(
          /^\s*(planId|plan|executionDate|collectorIds|startPoint|endPoint|departureTime|estimatedMinutes|revision) .*$/gm,
          "",
        )
        .replace(/^\s*@@unique\(\[planId, executionDate\]\).*$/m, ""),
    )
    .replace(/^\s*routePoint(Key)? .*$/gm, "")
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
  await db.exec(
    await readFile(
      join(
        serverDir,
        "prisma/migrations/20261022120000_route_collection_order/migration.sql",
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      join(
        serverDir,
        "prisma/migrations/20261026120000_recurring_routes/migration.sql",
      ),
      "utf8",
    ),
  );
  await child(
    ["--import", "tsx", "tests/recurring-routes/local-server.ts"],
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
  });
  const page = await context.newPage();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const day = Number(new Date(tomorrow + "T12:00:00Z").getUTCDay());
  const point = (key, lng = -38.53) => ({
    key,
    kind: "ADDRESS",
    name: "Ponto avulso " + key,
    address: "Rua QA, 50, Centro, Fortaleza, CE",
    latitude: -3.73,
    longitude: lng,
    notes: "Portaria lateral",
    materials: "Papelão",
    weekdays: [],
  });
  const base = {
    name: "Sede QA",
    address: "Rua Sede QA, 10, Fortaleza, CE",
    latitude: -3.73,
    longitude: -38.52,
  };
  const plan = {
    name: "Rota fixa QA",
    active: true,
    startsOn: tomorrow,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    intervalWeeks: 1,
    departureTime: "08:00",
    estimatedMinutes: 60,
    collectorIds: [f.collector.id],
    driverId: f.driver.id,
    vehicleId: f.vehicle.id,
    points: [point("a")],
    startPoint: base,
    endPoint: base,
    exceptions: [],
  };
  let fixed, execution, custom;
  await check(
    "Migração incremental mantém rotas existentes e adiciona planejamento",
    async () => {
      assert.equal((await api("/routes/" + f.legacy.id)).status, 200);
      assert.deepEqual(
        (await api("/routes/" + f.legacy.id)).body.route.collectorIds,
        [],
      );
    },
  );
  await check(
    "Fontes são isoladas por cooperativa e acessíveis só à gestão",
    async () => {
      const s = await api("/route-planning/sources");
      assert(s.body.generators.some((g) => g.id === f.gen.id));
      assert(s.body.bins.some((b) => b.id === f.bin.id));
      assert.equal(
        (
          await api(
            "/route-planning/sources",
            "GET",
            undefined,
            f.collectorToken,
          )
        ).status,
        403,
      );
    },
  );
  await check(
    "Roteiro fixo gera próximos dias com coleta, endereço e responsável",
    async () => {
      const r = await api("/route-plans", "POST", plan);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      fixed = r.body.plan;
      const rows = (await api("/routes")).body.routes.filter(
        (r) => r.planId === fixed.id,
      );
      assert.equal(rows.length, 6);
      execution = rows.find((r) => r.executionDate === tomorrow);
      const d = (await api("/routes/" + execution.id)).body.route;
      assert.equal(d.collections.length, 1);
      assert.equal(d.collections[0].routePoint.name, "Ponto avulso a");
      assert.equal(
        d.collections[0].schedule.pickupAddress,
        plan.points[0].address,
      );
      assert.equal(d.collections[0].collectorId, f.collector.id);
      assert.equal(d.collections[0].collectionMaterials.length, 0);
    },
  );
  await check("Geração repetida não duplica execuções ou coletas", async () => {
    await api("/route-plans/" + fixed.id + "/generate", "POST", {});
    const rows = (await api("/routes")).body.routes.filter(
      (r) => r.planId === fixed.id,
    );
    assert.equal(rows.length, 6);
  });
  await check(
    "Catador consulta roteiro atribuído; outra cooperativa e catador não acessam",
    async () => {
      assert(
        (
          await api("/routes", "GET", undefined, f.collectorToken)
        ).body.routes.some((r) => r.id === execution.id),
      );
      assert.equal(
        (
          await api(
            "/routes/" + execution.id,
            "GET",
            undefined,
            f.collectorToken,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await api(
            "/routes/" + execution.id,
            "GET",
            undefined,
            f.outsiderToken,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await api(
            "/route-plans/" + fixed.id,
            "PATCH",
            { ...plan, expectedVersion: 0 },
            f.otherToken,
          )
        ).status,
        400,
      );
    },
  );
  await check(
    "Pontos e equipe estrangeiros são rejeitados sem criar roteiro",
    async () => {
      const r = await api("/route-plans", "POST", {
        ...plan,
        name: "Inválida",
        points: [
          { ...point("foreign"), kind: "GENERATOR", sourceId: "foreign-id" },
        ],
      });
      assert.equal(r.status, 400);
      const t = await api("/route-plans", "POST", {
        ...plan,
        collectorIds: ["foreign-id"],
      });
      assert.equal(t.status, 400);
    },
  );
  await check(
    "Conflito de horário fica explícito e não gera execução conflitante",
    async () => {
      const r = await api("/route-plans", "POST", {
        ...plan,
        name: "Conflito QA",
      });
      assert.equal(r.status, 200);
      assert.match(r.body.plan.lastGenerationError, /Conflito/);
      assert.equal(
        (await api("/routes")).body.routes.filter(
          (x) => x.planId === r.body.plan.id,
        ).length,
        0,
      );
      await api("/route-plans/" + r.body.plan.id, "PATCH", {
        ...plan,
        name: "Conflito QA",
        active: false,
        expectedVersion: r.body.plan.version,
      });
    },
  );
  await check(
    "Editar roteiro sem aplicar preserva execuções já geradas",
    async () => {
      const r = await api("/route-plans/" + fixed.id, "PATCH", {
        ...plan,
        name: "Nome revisado QA",
        points: [point("b")],
        expectedVersion: fixed.version,
      });
      assert.equal(r.status, 200);
      fixed = r.body.plan;
      const d = (await api("/routes/" + execution.id)).body.route;
      assert.equal(d.name, plan.name);
      assert.equal(d.collections[0].routePoint.key, "a");
    },
  );
  await check(
    "Aplicar às futuras substitui pontos pendentes e preserva cancelados no histórico",
    async () => {
      const r = await api("/route-plans/" + fixed.id, "PATCH", {
        ...plan,
        points: [
          point("b"),
          { ...point("pev"), kind: "PEV", sourceId: f.bin.id },
        ],
        expectedVersion: fixed.version,
        applyToScheduled: true,
      });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      fixed = r.body.plan;
      const d = (await api("/routes/" + execution.id)).body.route;
      assert.equal(
        d.collections.filter((c) => c.status === "PENDING").length,
        2,
      );
      assert.equal(
        d.collections.filter((c) => c.status === "CANCELLED").length,
        1,
      );
      assert(d.collections.some((c) => c.bin?.id === f.bin.id));
    },
  );
  await check(
    "Revisões sucessivas preservam ponto avulso da execução e separam histórico do progresso",
    async () => {
      const added = await api("/routes/" + execution.id, "PATCH", {
        plannedPoints: [point("extraExec")],
      });
      assert.equal(added.status, 200, JSON.stringify(added.body));
      const extra = added.body.route.collections.find(
        (c) => c.routePoint?.key === "extraExec",
      );
      assert.equal(extra.routePoint.fromPlan, false);
      const r = await api("/route-plans/" + fixed.id, "PATCH", {
        ...plan,
        points: [
          point("b"),
          { ...point("pev"), kind: "PEV", sourceId: f.bin.id },
        ],
        expectedVersion: fixed.version,
        applyToScheduled: true,
      });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      fixed = r.body.plan;
      const d = (await api("/routes/" + execution.id)).body.route;
      assert(
        d.collections.some((c) => c.id === extra.id && c.status === "PENDING"),
      );
      assert.equal(d.stats.totalCollections, 3);
      assert.equal(d.stats.archivedCollections, 3);
    },
  );
  await check(
    "Versão antiga não sobrescreve alterações e pausa impede novas gerações",
    async () => {
      assert.equal(
        (
          await api("/route-plans/" + fixed.id, "PATCH", {
            ...plan,
            expectedVersion: 0,
          })
        ).status,
        400,
      );
      const r = await api("/route-plans/" + fixed.id, "PATCH", {
        ...plan,
        active: false,
        expectedVersion: fixed.version,
      });
      assert.equal(r.status, 200);
      fixed = r.body.plan;
      assert.equal(fixed.active, false);
      assert(
        (await api("/routes")).body.routes.some((r) => r.id === execution.id),
      );
    },
  );
  await check(
    "Frequência quinzenal e exceção por data controlam as execuções geradas",
    async () => {
      const special = {
        ...plan,
        name: "Quinzenal QA",
        departureTime: "21:00",
        intervalWeeks: 2,
        weekdays: [day],
        exceptions: [tomorrow],
      };
      const r = await api("/route-plans", "POST", special);
      assert.equal(r.status, 200);
      assert.equal(
        (await api("/routes")).body.routes.filter(
          (x) => x.planId === r.body.plan.id,
        ).length,
        0,
      );
      const next = await api("/route-plans/" + r.body.plan.id, "PATCH", {
        ...special,
        exceptions: [],
        expectedVersion: r.body.plan.version,
      });
      assert.equal(next.status, 200);
      assert.equal(
        (await api("/routes")).body.routes.filter(
          (x) => x.planId === r.body.plan.id,
        ).length,
        1,
      );
    },
  );
  await check(
    "Rota avulsa reúne endereço novo e coleta existente em ordem intercalada",
    async () => {
      const r = await api("/routes", "POST", {
        name: "Avulsa QA",
        scheduledDate: tomorrow.split("-").reverse().join("/"),
        departureTime: "15:00",
        estimatedMinutes: 60,
        driverId: f.driver.id,
        vehicleId: f.vehicle.id,
        collectorIds: [f.collector.id],
        stops: [],
        collectionIds: [f.a.id],
        plannedPoints: [point("avulso")],
        visitOrder: ["avulso", f.a.id],
        startPoint: base,
        endPoint: base,
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      custom = r.body.route;
      assert.equal(custom.collections[0].routePoint.key, "avulso");
      assert.equal(custom.collections[1].id, f.a.id);
      assert.equal(
        custom.scheduledDate,
        new Date(tomorrow + "T15:00:00-03:00").toISOString(),
      );
    },
  );
  await check(
    "Editar endereço atualiza snapshot e agenda sem mudar cadastro de origem",
    async () => {
      const c = custom.collections[0];
      const p = {
        ...c.routePoint,
        address: "Rua corrigida, 90, Fortaleza, CE",
      };
      const r = await api("/routes/" + custom.id, "PATCH", {
        pointUpdates: [{ collectionId: c.id, point: p }],
        expectedRevision: custom.revision,
      });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      custom = r.body.route;
      assert.equal(custom.collections[0].schedule.pickupAddress, p.address);
      assert.equal(custom.collections[0].routePoint.address, p.address);
    },
  );
  await check(
    "Saída é confirmada pelo catador e alterações da equipe ficam protegidas",
    async () => {
      assert.equal(
        (
          await api(
            "/routes/" + custom.id + "/field-status",
            "POST",
            { status: "IN_PROGRESS" },
            f.outsiderToken,
          )
        ).status,
        400,
      );
      const r = await api(
        "/routes/" + custom.id + "/field-status",
        "POST",
        { status: "IN_PROGRESS" },
        f.collectorToken,
      );
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(
        (await api("/routes/" + custom.id, "PATCH", { collectorIds: [] }))
          .status,
        400,
      );
    },
  );
  await check(
    "Visita sem material encerra sem peso, lote ou entrada de estoque",
    async () => {
      const id = custom.collections[0].id;
      assert.equal(
        (
          await api(
            `/routes/${custom.id}/visits/${id}/occurrence`,
            "POST",
            { reason: "Sem material disponível" },
            f.collectorToken,
          )
        ).status,
        200,
      );
      const c = (await api("/collections/" + id)).body.collection;
      assert.equal(c.status, "CANCELLED");
      assert.equal(c.totalWeightKg, 0);
      assert.equal(
        Number(
          (
            await db.query(
              'SELECT COUNT(*) AS count FROM "CollectionWasteEntry" WHERE "collectionId"=$1',
              [id],
            )
          ).rows[0].count,
        ),
        0,
      );
      assert.equal(
        Number(
          (
            await db.query(
              'SELECT COUNT(*) AS count FROM "WasteStockLot" WHERE "originCollectionId"=$1',
              [id],
            )
          ).rows[0].count,
        ),
        0,
      );
      assert.equal(
        (
          await api(
            `/routes/${custom.id}/visits/${id}/occurrence`,
            "POST",
            { reason: "Tentativa repetida" },
            f.collectorToken,
          )
        ).status,
        400,
      );
    },
  );
  await check(
    "Notificações persistentes chegam aos envolvidos na execução",
    async () => {
      const r = await api("/notifications", "GET", undefined, f.collectorToken);
      assert(r.body.notifications.some((n) => n.kind === "ROUTE_UPDATED"));
    },
  );
  await check(
    "Sugestão usa matriz rodoviária e preserva partida e destino",
    async () => {
      const r = await api("/route-planning/optimize", "POST", {
        start: base,
        end: base,
        points: [
          point("longe", -38.57),
          point("perto", -38.53),
          point("meio", -38.55),
        ],
      });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.geometry.type, "LineString");
      assert.equal(r.body.points.length, 3);
      assert.equal(r.body.durationSeconds, 600);
      assert.equal(r.body.provider, "127.0.0.1");
      assert.deepEqual(r.body.geometry.coordinates[0], [
        base.longitude,
        base.latitude,
      ]);
    },
  );
  await check(
    "Serviço rodoviário indisponível retorna erro explícito sem linha reta simulada",
    async () => {
      await writeFile(join(outputDir, "roads-down"), "1");
      const r = await api("/route-planning/optimize", "POST", {
        start: base,
        end: base,
        points: [point("a")],
      });
      assert.equal(r.status, 400);
      assert(!r.body.geometry);
      await unlink(join(outputDir, "roads-down"));
    },
  );
  await check(
    "Painel apresenta rotas fixas, equipe e mapa em desktop",
    async () => {
      await page.goto("http://127.0.0.1:5179/route-plans");
      await page
        .getByRole("button", { name: "Nova rota fixa", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Nova rota fixa", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "1. Identificação e frequência",
          exact: true,
        })
        .waitFor();
      await page
        .getByLabel("Nome da rota fixa", { exact: true })
        .fill("Roteiro visual QA");
      await page
        .getByRole("button", {
          name: "Adicionar ponto por endereço",
          exact: true,
        })
        .click();
      await page
        .getByRole("region", { name: "Cadastro do ponto", exact: true })
        .waitFor();
      await page.screenshot({
        path: join(outputDir, "route-plan-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "CEP, confirmação no mapa e edição de ponto avulso preservam formulário",
    async () => {
      await context.route("https://viacep.com.br/**", (r) =>
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            logradouro: "Rua QA",
            bairro: "Centro",
            localidade: "Fortaleza",
            uf: "CE",
          }),
        }),
      );
      await page
        .getByLabel("Nome do ponto ou responsável", { exact: true })
        .fill("Residência QA");
      await page.getByLabel("CEP", { exact: true }).fill("60000000");
      await page
        .getByRole("button", { name: "Buscar CEP", exact: true })
        .click();
      await page.getByLabel("Rua", { exact: true }).waitFor();
      await page.waitForFunction(() =>
        document.querySelector('input[value="Rua QA"]'),
      );
      await page.getByLabel("Número e complemento", { exact: true }).fill("50");
      await page.getByLabel("Latitude", { exact: true }).last().fill("-3.73");
      await page.getByLabel("Longitude", { exact: true }).last().fill("-38.53");
      await page
        .getByRole("button", {
          name: "Salvar ponto no planejamento",
          exact: true,
        })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Confirme a localização" })
        .waitFor();
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
      assert(
        await page.getByText("1. Residência QA", { exact: true }).isVisible(),
      );
      assert.equal(
        await page
          .getByLabel("Nome da rota fixa", { exact: true })
          .inputValue(),
        "Roteiro visual QA",
      );
    },
  );
  await check(
    "Selecionar PEV cadastrado mantém endereço e permite confirmar sua posição",
    async () => {
      await page
        .getByRole("button", { name: "PEV Praça QA", exact: false })
        .click();
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
      await page.getByText("2. PEV Praça QA", { exact: true }).waitFor();
    },
  );
  await check(
    "Painel móvel sem transbordamento, com acesso à programação e histórico",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: join(outputDir, "route-plan-mobile.png"),
        fullPage: true,
      });
      await page.goto("http://127.0.0.1:5179/route-list");
      await page
        .getByRole("main")
        .getByRole("link", { name: "Rotas fixas", exact: true })
        .waitFor();
      await page.getByRole("link", { name: "Histórico", exact: true }).click();
      await page
        .getByRole("heading", { name: "Histórico de rotas", exact: true })
        .waitFor();
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
          "API real Fastify/Prisma + migração incremental de rotas recorrentes sobre baseline anterior; provedor rodoviário simulado + PGlite + Chromium; sem serviços externos",
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
