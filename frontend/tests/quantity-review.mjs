/** Banco descartável, API real e Chromium. Nunca usa banco ou credenciais da VPS. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
      "katua-quantity-review-",
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
      if (
        b.toString().includes("Falha nos relatórios") ||
        b.toString().includes("O.C. failed")
      )
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
    .replace(
      /model (CollectionQuantityReview|InboxNotification)\s*\{[\s\S]*?^\}/gm,
      "",
    )
    .replace(
      /^.*(?:inboxNotifications|quantityReviews|quantityReviewVersion|quantitiesReviewedAt|reportedTotalWeightKg|reportedQuantity).*$/gm,
      "",
    );
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
  await db.exec(`INSERT INTO "User" (id,email,"passwordHash","displayName",role,"updatedAt") VALUES ('old-user','old@example.invalid','unused','Antiga','COOPERATIVE',NOW());
 INSERT INTO "Cooperative" (id,"userId",name,"updatedAt") VALUES ('old-coop','old-user','Antiga',NOW());
 INSERT INTO "Collection" (id,"cooperativeId","updatedAt") VALUES ('old-collection','old-coop',NOW());
 INSERT INTO "CollectionMaterial" (id,"collectionId","nameSnapshot",quantity,"updatedAt") VALUES ('old-material','old-collection','Papel',50,NOW());`);
  await db.exec(
    await readFile(
      join(
        serverDir,
        "prisma/migrations/20261023200000_collection_quantity_reviews/migration.sql",
      ),
      "utf8",
    ),
  );
  await check(
    "Migração preserva a quantidade original dos registros existentes",
    async () =>
      assert.equal(
        Number(
          (
            await db.query(
              `SELECT "reportedQuantity" FROM "CollectionMaterial" WHERE id='old-material'`,
            )
          ).rows[0].reportedQuantity,
        ),
        50,
      ),
  );
  socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 54329 });
  await socket.start();
  await child(
    ["--import", "tsx", "tests/app-upgrade/local-server.ts"],
    serverDir,
    {
      KATUA_LOCAL_VALIDATION: "1",
      SINIR_ENABLED: "false",
      DATABASE_URL: databaseUrl,
      KATUA_VALIDATION_DIR: outputDir,
    },
    /LOCAL_API_READY/,
  );
  const f = JSON.parse(await readFile(join(outputDir, "fixture.json"), "utf8"));
  const base = "http://127.0.0.1:3339";
  async function api(url, method = "GET", body, token = f.token) {
    const r = await fetch(base + url, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  }
  const expect = (r, status) => {
    assert.equal(r.status, status, JSON.stringify(r.body));
    return r.body;
  };
  async function make(
    materials = [{ wasteTypeId: f.item.id, quantity: 50, unit: "KG" }],
  ) {
    const schedule = expect(
      await api("/schedules", "POST", {
        generatorId: f.gen.id,
        scheduledDate: "2026-10-23T10:00:00-03:00",
        requestedMaterials: materials,
      }),
      201,
    ).schedule;
    const c = expect(
      await api("/collections", "POST", {
        scheduleId: schedule.id,
        collectorId: f.collector.id,
      }),
      201,
    ).collection;
    expect(
      await api(`/collections/${c.id}/start`, "POST", {}, f.collectorToken),
      200,
    );
    return expect(
      await api(
        `/collections/${c.id}/complete-field`,
        "POST",
        { materials },
        f.collectorToken,
      ),
      200,
    ).collection;
  }
  const generatorAccess = expect(
    await api("/auth/activate-generator-access", "POST", {
      email: f.gen.email,
      password: "SomenteTesteLocal2026",
    }),
    201,
  );
  const c = await make();
  const material = c.collectionMaterials[0];
  const url = `/collections/${c.id}`;
  const payload = (
    quantity,
    version = 0,
    reason = "Diferença identificada na balança",
  ) => ({
    expectedVersion: version,
    reason,
    items: [{ materialId: material.id, quantity }],
  });
  await check("Conferência exige recebimento físico", async () =>
    expect(await api(url + "/review-quantities", "POST", payload(40)), 409),
  );
  await check(
    "Recebimento notifica o catador, sem distribuir a motoristas sem vínculo",
    async () => {
      expect(await api(url + "/receive", "POST", {}), 200);
      assert.equal(
        expect(await api("/notifications", "GET", null, f.collectorToken), 200)
          .notifications[0].collectionId,
        c.id,
      );
      // A coleta sem motorista não distribui para o motorista apenas por pertencer à cooperativa.
      assert.equal(
        expect(await api("/notifications", "GET", null, f.driverToken), 200)
          .unreadCount,
        0,
      );
    },
  );
  await check("Outra cooperativa e catador não podem conferir", async () => {
    expect(
      await api(url + "/review-quantities", "POST", payload(40), f.otherToken),
      404,
    );
    expect(
      await api(
        url + "/review-quantities",
        "POST",
        payload(40),
        f.collectorToken,
      ),
      403,
    );
  });
  await check(
    "Justificativa obrigatória e nenhuma gravação parcial",
    async () => {
      expect(
        await api(url + "/review-quantities", "POST", payload(40, 0, "")),
        400,
      );
      assert.equal(expect(await api(url), 200).collection.totalWeightKg, 50);
    },
  );
  let reviewed;
  await check(
    "50 kg informados → 40 kg conferidos: saldo, totais e histórico",
    async () => {
      reviewed = expect(
        await api(url + "/review-quantities", "POST", payload(40)),
        200,
      ).collection;
      assert.equal(
        Number(reviewed.collectionMaterials[0].reportedQuantity),
        50,
      );
      assert.equal(Number(reviewed.collectionMaterials[0].quantity), 40);
      assert.equal(
        Number(reviewed.collectionMaterials[0].wasteEntry.remainingQuantity),
        40,
      );
      assert.equal(reviewed.totalWeightKg, 40);
      assert.equal(reviewed.reportedTotalWeightKg, 50);
      assert.equal(reviewed.quantityReviews[0].items[0].reportedQuantity, 50);
      assert.equal(reviewed.quantityReviews[0].items[0].confirmedQuantity, 40);
      const totals = (
        await db.query('SELECT "totalKg" FROM "Collector" WHERE id=$1', [
          f.collector.id,
        ])
      ).rows[0];
      assert.equal(totals.totalKg, 40);
      assert.equal(
        (
          await db.query('SELECT "totalKg" FROM "Generator" WHERE id=$1', [
            f.gen.id,
          ])
        ).rows[0].totalKg,
        40,
      );
    },
  );
  await check(
    "Repetição e versão antiga não duplicam correções nem avisos",
    async () => {
      expect(await api(url + "/review-quantities", "POST", payload(40)), 409);
      const result = expect(
        await api("/notifications", "GET", null, f.collectorToken),
        200,
      );
      assert.equal(
        result.notifications.filter((n) => n.kind === "QUANTITY_REVIEW").length,
        1,
      );
      assert.match(
        result.notifications.find((n) => n.kind === "QUANTITY_REVIEW").message,
        /informado 50, conferido 40/,
      );
    },
  );
  await check(
    "Notificação de gerador/PF somente quando vinculado",
    async () => {
      // Associar a solicitação ao usuário PF cadastrado para representar solicitação residencial.
      await db.query(
        'UPDATE "Schedule" SET "requestedByUserId"=$1 WHERE id=$2',
        [f.pf.id, c.scheduleId],
      );
      expect(await api(url + "/start-sorting", "POST", {}), 200);
      assert.equal(
        expect(await api("/notifications", "GET", null, f.pfToken), 200)
          .notifications[0].title,
        "Triagem da coleta iniciada",
      );
    },
  );
  await check(
    "Gerador cadastrado recebe a conferência da sua coleta",
    async () => {
      const notices = expect(
        await api("/notifications", "GET", null, generatorAccess.token),
        200,
      ).notifications;
      assert(
        notices.some(
          (n) => n.kind === "QUANTITY_REVIEW" && n.collectionId === c.id,
        ),
      );
    },
  );
  await check("Leitura é individual, persistente e idempotente", async () => {
    const list = expect(
      await api("/notifications", "GET", null, f.collectorToken),
      200,
    );
    const id = list.notifications[0].id;
    expect(await api(`/notifications/${id}/read`, "PATCH", {}, f.pfToken), 404);
    expect(
      await api(`/notifications/${id}/read`, "PATCH", {}, f.collectorToken),
      200,
    );
    expect(
      await api(`/notifications/${id}/read`, "PATCH", {}, f.collectorToken),
      200,
    );
    assert.equal(
      expect(await api("/notifications", "GET", null, f.collectorToken), 200)
        .unreadCount,
      list.unreadCount - 1,
    );
  });
  let destination;
  await check(
    "Lote usa quantidade conferida e rejeita saldo excedido",
    async () => {
      const entry = reviewed.collectionMaterials[0].wasteEntry.id;
      expect(
        await api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: entry,
          type: "STOCK",
          quantity: 41,
          unit: "KG",
          stockItemId: f.item.id,
        }),
        409,
      );
      destination = expect(
        await api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: entry,
          type: "STOCK",
          quantity: 30,
          unit: "KG",
          stockItemId: f.item.id,
        }),
        201,
      ).destination;
      assert.equal(Number(destination.quantity), 30);
    },
  );
  await check(
    "Não reduz abaixo do destinado; correção parcial mantém lotes existentes",
    async () => {
      expect(
        await api(url + "/review-quantities", "POST", payload(20, 1)),
        409,
      );
      const current = expect(
        await api(url + "/review-quantities", "POST", payload(35, 1)),
        200,
      ).collection;
      assert.equal(
        Number(current.collectionMaterials[0].wasteEntry.remainingQuantity),
        5,
      );
      assert.equal(Number(current.collectionMaterials[0].reportedQuantity), 50);
      assert.equal(current.quantityReviews.length, 2);
    },
  );
  await check(
    "Zero confirmado é permitido sem criar estoque fictício",
    async () => {
      const zero = await make();
      expect(await api(`/collections/${zero.id}/receive`, "POST", {}), 200);
      const current = expect(
        await api(`/collections/${zero.id}/review-quantities`, "POST", {
          expectedVersion: 0,
          reason: "Material não recebido na entrega",
          items: [{ materialId: zero.collectionMaterials[0].id, quantity: 0 }],
        }),
        200,
      ).collection;
      assert.equal(current.totalWeightKg, 0);
      assert.equal(
        Number(current.collectionMaterials[0].wasteEntry.remainingQuantity),
        0,
      );
    },
  );
  await check("Litros e unidades não viram massa na conferência", async () => {
    const x = await make([
      { wasteTypeId: f.liter.id, quantity: 50, unit: "LITER" },
    ]);
    expect(await api(`/collections/${x.id}/receive`, "POST", {}), 200);
    const current = expect(
      await api(`/collections/${x.id}/review-quantities`, "POST", {
        expectedVersion: 0,
        reason: "Conferência do volume recebido",
        items: [{ materialId: x.collectionMaterials[0].id, quantity: 40 }],
      }),
      200,
    ).collection;
    assert.equal(current.totalWeightKg, 0);
    assert.equal(current.collectionMaterials[0].unit, "LITER");
    assert.equal(Number(current.collectionMaterials[0].quantity), 40);
  });
  await check("Encerramento notifica e bloqueia novas edições", async () => {
    const entry = reviewed.collectionMaterials[0].wasteEntry.id;
    expect(
      await api("/collection-waste-destinations", "POST", {
        collectionWasteEntryId: entry,
        type: "STOCK",
        quantity: 5,
        unit: "KG",
        stockItemId: f.item.id,
      }),
      201,
    );
    expect(await api(url + "/complete", "POST", {}), 200);
    expect(await api(url + "/review-quantities", "POST", payload(50, 2)), 409);
    assert(
      expect(
        await api("/notifications", "GET", null, f.collectorToken),
        200,
      ).notifications.some((n) => n.title === "Operação da coleta concluída"),
    );
  });
  await check("Paginação e marcar todas como lidas", async () => {
    const first = expect(
      await api("/notifications?limit=2", "GET", null, f.collectorToken),
      200,
    );
    assert.equal(first.notifications.length, 2);
    assert(first.nextCursor);
    const second = expect(
      await api(
        "/notifications?limit=2&cursor=" + first.nextCursor,
        "GET",
        null,
        f.collectorToken,
      ),
      200,
    );
    assert(
      !second.notifications.some((n) =>
        first.notifications.some((f) => f.id === n.id),
      ),
    );
    expect(
      await api("/notifications/read-all", "POST", {}, f.collectorToken),
      200,
    );
    assert.equal(
      expect(await api("/notifications", "GET", null, f.collectorToken), 200)
        .unreadCount,
      0,
    );
  });

  const ui = await make();
  expect(await api(`/collections/${ui.id}/receive`, "POST", {}), 200);
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
    { VITE_API_BASE_URL: base },
    /Local:/,
  );
  browser = await pw.launch({
    executablePath: process.env.KATUA_CHROMIUM_PATH,
    args: chromium.args.filter((a) => a !== "--single-process"),
    headless: true,
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1366, height: 900 },
  });
  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
    },
    { token: f.token, user: f.owner },
  );
  const page = await context.newPage();
  await check(
    "Painel permite editar 50 para 40 na conferência da entrega",
    async () => {
      await page.goto("http://127.0.0.1:5179/waste-list?coleta=" + ui.id);
      await page
        .getByLabel("Quantidade recebida de Papel", { exact: true })
        .fill("40");
      await page
        .locator("#quantity-review-reason")
        .fill("Pesagem conferida pela balança da cooperativa");
      await page
        .getByRole("button", {
          name: "Salvar conferência de quantidade",
          exact: true,
        })
        .click();
      await page
        .getByText("Conferência 1 · QA Planejamento", { exact: true })
        .waitFor();
      assert.equal(
        expect(await api(`/collections/${ui.id}`), 200).collection
          .totalWeightKg,
        40,
      );
      await page.screenshot({
        path: join(outputDir, "painel-conferencia.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "PDF do painel mostra valor original, conferido e justificativa",
    async () => {
      const promise = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Salvar coleta em PDF", exact: true })
        .click();
      const download = await promise;
      const file = join(outputDir, "conferencia.pdf");
      await download.saveAs(file);
      const text = execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
      assert.match(text, /Conferência/);
      assert.match(text, /50\s*kg/);
      assert.match(text, /40\s*kg/);
      assert.match(text, /Pesagem conferida/);
    },
  );
  if (process.env.KATUA_APP_WEB_EXPORT) {
    const { createServer } = await import("node:http");
    const { stat } = await import("node:fs/promises");
    const { extname } = await import("node:path");
    const webroot = resolve(process.env.KATUA_APP_WEB_EXPORT);
    const staticServer = createServer(async (q, r) => {
      try {
        let file = resolve(
          webroot,
          "." + decodeURIComponent(new URL(q.url, "http://localhost").pathname),
        );
        if (!file.startsWith(webroot + "/")) throw Error();
        try {
          if ((await stat(file)).isDirectory()) file = join(file, "index.html");
        } catch {
          file += ".html";
        }
        const data = await readFile(file);
        r.writeHead(200, {
          "Content-Type":
            {
              ".js": "application/javascript",
              ".css": "text/css",
              ".ttf": "font/ttf",
              ".png": "image/png",
              ".html": "text/html",
            }[extname(file)] || "application/octet-stream",
        });
        r.end(data);
      } catch {
        r.writeHead(404).end();
      }
    }).listen(5181, "127.0.0.1");
    await new Promise((r) => staticServer.on("listening", r));
    try {
      const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      await mobile.addInitScript(
        ({ token, user }) => {
          localStorage.setItem("@katu:token", token);
          localStorage.setItem("@katu:user", JSON.stringify(user));
        },
        {
          token: f.collectorToken,
          user: {
            id: f.collector.userId,
            role: "COLLECTOR",
            displayName: "Catador QA",
          },
        },
      );
      const app = await mobile.newPage();
      await check(
        "App exportado: sino, contador e central com a divergência",
        async () => {
          await app.goto("http://127.0.0.1:5181/(catador)/homecat");
          await app
            .getByRole("button", { name: /Notificações, [1-9].*não lidas/ })
            .waitFor();
          await app.getByRole("button", { name: /Notificações,/ }).click();
          await app
            .getByRole("heading", { name: "Notificações", exact: true })
            .waitFor();
          await app
            .getByText(/Pesagem conferida pela balança da cooperativa/)
            .first()
            .waitFor();
          await app.screenshot({
            path: join(outputDir, "app-notificacoes.png"),
            fullPage: true,
          });
        },
      );
      await check(
        "App abre coleta pelo aviso e persiste a leitura",
        async () => {
          const count = expect(
            await api("/notifications", "GET", null, f.collectorToken),
            200,
          ).unreadCount;
          await app
            .getByRole("button", {
              name: "Não lida: Quantidade recebida ajustada",
              exact: true,
            })
            .first()
            .click();
          await app
            .getByText("Etapa atual: Recebida", { exact: true })
            .waitFor();
          await app.getByRole("button", {name:"Fechar detalhes",exact:true}).click();
          await app.getByText("Detalhes da coleta", {exact:true}).waitFor({state:"hidden"});
          assert.equal(
            expect(
              await api("/notifications", "GET", null, f.collectorToken),
              200,
            ).unreadCount,
            count - 1,
          );
        },
      );
      await check(
        "Avisos salvos continuam consultáveis sem conexão",
        async () => {
          await mobile.setOffline(true);
          await app
            .getByRole("button", { name: "Atualizar avisos", exact: true })
            .click();
          await app
            .getByText(/Sem atualização no momento/)
            .waitFor({ timeout: 30000 });
          await app
            .getByText(/Pesagem conferida pela balança da cooperativa/)
            .first()
            .waitFor();
          await mobile.setOffline(false);
        },
      );
      await mobile.close();
    } finally {
      await new Promise((r) => staticServer.close(r));
    }
  }
} finally {
  await browser?.close();
  for (const child of children) child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  await socket?.stop();
  await db?.close();
  await writeFile(
    join(outputDir, "results.json"),
    JSON.stringify(outcomes, null, 2),
  );
  console.log("EVIDENCE", outputDir);
  if (outcomes.some((o) => o.status !== "PASS")) process.exitCode = 1;
}
