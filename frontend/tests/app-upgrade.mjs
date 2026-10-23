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
      "katua-app-upgrade-",
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
    .replace(/^\s*collectionOrder\s+String\[\].*$/m, "")
    .replace(/^\s*(?:start|field)Operation(?:Id|Hash)\s+String\?.*$/gm, "")
    .replace(/model CollectionWasteDestinationEvent\s*\{[^}]*\}/, "")
    .replace(/^\s*auditEvents\s+CollectionWasteDestinationEvent\[\].*$/m, "")
    .replace(/model CollectionIncident\s*\{[^}]*\}/, "")
    .replace(/^\s*incidents\s+CollectionIncident\[\].*$/m, "")
    .replace(/^\s*pickup(?:Address|Latitude|Longitude)\s+.*$/gm, "");
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
        "prisma/migrations/20261022210000_collection_operation_replay/migration.sql",
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      join(
        serverDir,
        "prisma/migrations/20261022230000_collection_incidents/migration.sql",
      ),
      "utf8",
    ),
  );
  await child(
    ["--import", "tsx", "tests/app-upgrade/local-server.ts"],
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
  const expect = (r, code) => {
    assert.equal(r.status, code, JSON.stringify(r.body));
    return r.body;
  };
  async function schedule() {
    const body = expect(
      await api("/schedules", "POST", {
        generatorId: f.gen.id,
        scheduledDate: "2026-10-22T15:00:00-03:00",
        requestedMaterials: [
          { wasteTypeId: f.item.id, quantity: 50, unit: "KG" },
        ],
      }),
      201,
    );
    return body.schedule;
  }
  async function makeEntry(quantity = 50, routeId) {
    const s = await schedule();
    const c = expect(
      await api("/collections", "POST", {
        scheduleId: s.id,
        collectorId: f.collector.id,
        ...(routeId ? { routeId } : {}),
      }),
      201,
    ).collection;
    expect(
      await api(
        "/collections/" + c.id + "/start",
        "POST",
        {},
        f.collectorToken,
      ),
      200,
    );
    const done = expect(
      await api(
        "/collections/" + c.id + "/complete-field",
        "POST",
        { materials: [{ wasteTypeId: f.item.id, quantity, unit: "KG" }] },
        f.collectorToken,
      ),
      200,
    ).collection;
    return {
      collection: done,
      entry: done.collectionMaterials[0].wasteEntry,
      schedule: s,
    };
  }
  async function stock(entry, quantity, item = f.item.id) {
    const collection = (await api("/collections/" + entry.collectionId)).body
      .collection;
    if (collection.status === "COLLECTED")
      expect(
        await api("/collections/" + collection.id + "/receive", "POST", {}),
        200,
      );
    return expect(
      await api("/collection-waste-destinations", "POST", {
        collectionWasteEntryId: entry.id,
        type: "STOCK",
        quantity,
        unit: "KG",
        stockItemId: item,
      }),
      201,
    ).destination;
  }
  async function finish(collection) {
    const current = (await api("/collections/" + collection.id)).body
      .collection;
    if (current.status === "COLLECTED")
      expect(
        await api("/collections/" + collection.id + "/receive", "POST", {}),
        200,
      );
    if (current.status !== "SORTING")
      expect(
        await api(
          "/collections/" + collection.id + "/start-sorting",
          "POST",
          {},
        ),
        200,
      );
    return expect(
      await api("/collections/" + collection.id + "/complete", "POST", {}),
      200,
    ).collection;
  }
  async function lotsFor(entry) {
    return (
      await api("/waste-stock/items/" + f.item.id + "/lots")
    ).body.lots.filter((l) => l.originCollectionWasteEntryId === entry.id);
  }
  await check(
    "Controle: solicitação, rota, delegação, campo, recebimento, destinação parcial e conclusão",
    async () => {
      const route = expect(
        await api("/routes", "POST", {
          name: "Validação das correções fluxo completo",
          driverId: f.driver.id,
          vehicleId: f.vehicle.id,
          scheduledDate: "22/10/2026",
        }),
        201,
      ).route;
      const x = await makeEntry(50, route.id);
      assert.equal(x.collection.driverId, f.driver.id);
      assert.equal(x.collection.vehicleId, f.vehicle.id);
      assert.equal(x.collection.status, "COLLECTED");
      assert.equal(Number(x.entry.remainingQuantity), 50);
      assert.equal((await lotsFor(x.entry)).length, 0);
      expect(
        await api("/collections/" + x.collection.id + "/receive", "POST", {}),
        200,
      );
      expect(
        await api(
          "/collections/" + x.collection.id + "/start-sorting",
          "POST",
          {},
        ),
        200,
      );
      const a = await stock(x.entry, 20),
        b = await stock(x.entry, 30);
      assert.notEqual(a.stockLotId, b.stockLotId);
      const lots = await lotsFor(x.entry);
      assert.equal(lots.length, 2);
      assert.equal(
        lots.reduce((n, l) => n + Number(l.availableQuantity), 0),
        50,
      );
      assert.equal(
        (
          await api("/collection-waste-destinations", "POST", {
            collectionWasteEntryId: x.entry.id,
            type: "STOCK",
            quantity: 1,
            unit: "KG",
            stockItemId: f.item.id,
          })
        ).status,
        409,
      );
      expect(
        await api("/collections/" + x.collection.id + "/complete", "POST", {}),
        200,
      );
      expect(
        await api("/routes/" + route.id + "/status", "PATCH", {
          status: "COMPLETED",
        }),
        200,
      );
      const repeated = await api(
        "/collections/" + x.collection.id + "/complete-field",
        "POST",
        { materials: [{ wasteTypeId: f.item.id, quantity: 50, unit: "KG" }] },
        f.collectorToken,
      );
      assert.equal(repeated.status, 409);
      record("CONTROL_FULL", {
        collection: x.collection.id,
        lotCount: lots.length,
        availableKg: 50,
        repeatedCompletionStatus: repeated.status,
      });
    },
  );
  await check(
    "Imagem: trocar ESTOQUE → destino direto → ESTOQUE conserva lote cancelado e cria outro",
    async () => {
      const x = await makeEntry();
      const a = await stock(x.entry, 50);
      expect(
        await api("/collection-waste-destinations/" + a.id, "PATCH", {
          type: "DIRECT_DESTINATION",
          destinationName: "Destinatário QA",
        }),
        200,
      );
      expect(
        await api("/collection-waste-destinations/" + a.id, "PATCH", {
          type: "STOCK",
          stockItemId: f.item.id,
        }),
        200,
      );
      const history = (await api("/collection-waste-destinations/" + a.id)).body
        .destination.auditEvents;
      assert.equal(history.length, 3);
      assert(
        history.some(
          (event) =>
            event.operation === "UPDATED" &&
            event.snapshot.before.stockLotId &&
            !event.snapshot.after.stockLotId,
        ),
      );
      const lots = await lotsFor(x.entry);
      assert.equal(lots.length, 2);
      assert.equal(lots.filter((l) => l.status === "CANCELLED").length, 1);
      assert.equal(
        lots
          .filter((l) => l.status === "AVAILABLE")
          .reduce((n, l) => n + Number(l.availableQuantity), 0),
        50,
      );
      record("IMAGE_REPRO", {
        lotCount: 2,
        cancelledKg: 50,
        availableKg: 50,
        lots: lots.map((l) => ({
          id: l.id,
          status: l.status,
          quantity: Number(l.quantity),
          availableQuantity: Number(l.availableQuantity),
        })),
      });
    },
  );
  await check(
    "Bloqueia estoque antes do recebimento e aceita destinação direta sem criar lote",
    async () => {
      const x = await makeEntry();
      const blocked = await api("/collection-waste-destinations", "POST", {
        collectionWasteEntryId: x.entry.id,
        type: "STOCK",
        quantity: 50,
        unit: "KG",
        stockItemId: f.item.id,
      });
      assert.equal(blocked.status, 409);
      assert.equal(blocked.body.code, "COLLECTION_NOT_RECEIVED");
      assert.equal((await lotsFor(x.entry)).length, 0);
      expect(
        await api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: x.entry.id,
          type: "DIRECT_DESTINATION",
          quantity: 50,
          unit: "KG",
          destinationName: "Receptor externo",
        }),
        201,
      );
      assert.equal((await lotsFor(x.entry)).length, 0);
      record("A02", {
        prematureStockStatus: 409,
        directDestinationStatus: 201,
      });
    },
  );
  await check(
    "Rejeita troca do catálogo KG por LITER e alteração da unidade de catálogo com histórico",
    async () => {
      const x = await makeEntry();
      const d = await stock(x.entry, 50);
      assert.equal(
        (
          await api("/collection-waste-destinations/" + d.id, "PATCH", {
            stockItemId: f.liter.id,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await api("/waste-stock/items/" + f.item.id, "PATCH", {
            unit: "LITER",
          })
        ).status,
        400,
      );
      const unchanged = (await api("/collection-waste-destinations/" + d.id))
        .body.destination;
      assert.equal(unchanged.stockItemId, f.item.id);
      record("A04", {
        catalogReclassificationStatus: 400,
        catalogUnitEditStatus: 400,
      });
    },
  );
  await check(
    "Coleta encerrada preserva destinações e saldo zero",
    async () => {
      const x = await makeEntry();
      const d = await stock(x.entry, 50);
      await finish(x.collection);
      const cancel = await api(
        "/collection-waste-destinations/" + d.id + "/cancel",
        "POST",
        { reason: "Não deve reabrir coleta" },
      );
      assert.equal(cancel.status, 409);
      assert.equal(
        (
          await api("/collection-waste-destinations/" + d.id, "PATCH", {
            notes: "Alteração indevida",
          })
        ).status,
        409,
      );
      const entry = (await api("/collection-entries/" + x.entry.id)).body.entry;
      assert.equal(Number(entry.remainingQuantity), 0);
      record("A03", {
        cancelStatus: 409,
        editStatus: 409,
        remainingQuantity: 0,
      });
    },
  );
  await check("Delegação direta rejeita veículo em manutenção", async () => {
    const s = await schedule();
    const r = await api("/collections", "POST", {
      scheduleId: s.id,
      collectorId: f.collector.id,
      vehicleId: f.maintenance.id,
    });
    assert.equal(r.status, 404);
    record("A05", { maintenanceDelegationStatus: r.status });
  });
  await check(
    "Finalizar uma coleta mantém catador em rota enquanto outra está em andamento",
    async () => {
      const sc1 = await schedule(),
        sc2 = await schedule();
      const first = expect(
        await api("/collections", "POST", {
          scheduleId: sc1.id,
          collectorId: f.collector.id,
        }),
        201,
      ).collection;
      const second = expect(
        await api("/collections", "POST", {
          scheduleId: sc2.id,
          collectorId: f.collector.id,
        }),
        201,
      ).collection;
      for (const c of [first, second])
        expect(
          await api(
            "/collections/" + c.id + "/start",
            "POST",
            {},
            f.collectorToken,
          ),
          200,
        );
      const body = {
        materials: [{ wasteTypeId: f.item.id, quantity: 5, unit: "KG" }],
      };
      const done = expect(
        await api(
          "/collections/" + first.id + "/complete-field",
          "POST",
          body,
          f.collectorToken,
        ),
        200,
      ).collection;
      const readCollector = (await api("/collections/" + first.id)).body
        .collection.collector;
      assert.equal(readCollector.status, "ON_ROUTE");
      expect(
        await api(
          "/collections/" + second.id + "/complete-field",
          "POST",
          body,
          f.collectorToken,
        ),
        200,
      );
      assert.equal(
        (await api("/collections/" + second.id)).body.collection.collector
          .status,
        "AVAILABLE",
      );
      assert.equal(done.collectionMaterials.length, 1);
      record("COLLECTOR_AVAILABILITY", {
        afterFirstCompletion: "ON_ROUTE",
        afterBoth: "AVAILABLE",
      });
    },
  );
  await check(
    "Cadastro legado preserva unidade LITER, disponibilidade e rejeita lote incompatível",
    async () => {
      const good = expect(
        await api("/waste-stock", "POST", {
          item: { name: "Óleo legado QA", category: "Óleo", unit: "LITER" },
          lot: {
            lotCode: "LEGADO-LITER-QA",
            quantity: 5,
            unit: "LITER",
            origin: "Doação QA",
          },
        }),
        201,
      );
      assert.equal(good.item.unit, "LITER");
      assert.equal(good.item.defaultUnit, "LITER");
      assert.equal(Number(good.lot.availableQuantity), 5);
      assert.equal(
        (
          await api("/waste-stock", "POST", {
            item: {
              name: "Inválido legado QA",
              category: "Óleo",
              unit: "LITER",
            },
            lot: { lotCode: "INVALID-LEGACY-QA", quantity: 5, unit: "KG" },
          })
        ).status,
        400,
      );
      record("LEGACY_UNITS", {
        unit: "LITER",
        availableQuantity: 5,
        incompatibleLotRejected: true,
      });
    },
  );
  await check(
    "Equipe herdada da rota é revalidada na delegação e no início",
    async () => {
      const route = expect(
        await api("/routes", "POST", {
          name: "Rota recursos QA",
          driverId: f.driver.id,
          vehicleId: f.vehicle.id,
          scheduledDate: "22/10/2026",
        }),
        201,
      ).route;
      const sc = await schedule();
      const c = expect(
        await api("/collections", "POST", {
          scheduleId: sc.id,
          collectorId: f.collector.id,
          routeId: route.id,
        }),
        201,
      ).collection;
      expect(
        await api("/vehicles/" + f.vehicle.id + "/status", "PATCH", {
          status: "MAINTENANCE",
        }),
        200,
      );
      assert.equal(
        (
          await api(
            "/collections/" + c.id + "/start",
            "POST",
            {},
            f.collectorToken,
          )
        ).status,
        409,
      );
      const sc2 = await schedule();
      assert.equal(
        (
          await api("/collections", "POST", {
            scheduleId: sc2.id,
            collectorId: f.collector.id,
            routeId: route.id,
          })
        ).status,
        409,
      );
      expect(
        await api("/vehicles/" + f.vehicle.id + "/status", "PATCH", {
          status: "ACTIVE",
        }),
        200,
      );
      expect(
        await api(
          "/collections/" + c.id + "/start",
          "POST",
          {},
          f.collectorToken,
        ),
        200,
      );
      expect(
        await api(
          "/collections/" + c.id + "/complete-field",
          "POST",
          { materials: [{ wasteTypeId: f.item.id, quantity: 5, unit: "KG" }] },
          f.collectorToken,
        ),
        200,
      );
      record("TEAM_REVALIDATION", {
        startWithMaintenanceBlocked: true,
        inheritedMaintenanceBlocked: true,
      });
    },
  );
  await check(
    "Reserva temporária impede encerramento até destinação definitiva",
    async () => {
      const x = await makeEntry();
      const d = expect(
        await api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: x.entry.id,
          type: "RESERVATION",
          quantity: 50,
          unit: "KG",
          destinationName: "Reserva de conferência",
        }),
        201,
      ).destination;
      expect(
        await api("/collections/" + x.collection.id + "/receive", "POST", {}),
        200,
      );
      expect(
        await api(
          "/collections/" + x.collection.id + "/start-sorting",
          "POST",
          {},
        ),
        200,
      );
      const blocked = await api(
        "/collections/" + x.collection.id + "/complete",
        "POST",
        {},
      );
      assert.equal(blocked.status, 409);
      assert.equal(blocked.body.code, "COLLECTION_HAS_RESERVATIONS");
      expect(
        await api("/collection-waste-destinations/" + d.id, "PATCH", {
          type: "STOCK",
          stockItemId: f.item.id,
        }),
        200,
      );
      expect(
        await api("/collections/" + x.collection.id + "/complete", "POST", {}),
        200,
      );
      record("RESERVATION", { temporaryReservationBlocksClosure: true });
    },
  );
  await check(
    "Reenvio identificado de início e conclusão não duplica materiais e rejeita payload divergente",
    async () => {
      const sc = await schedule();
      const c = expect(
        await api("/collections", "POST", {
          scheduleId: sc.id,
          collectorId: f.collector.id,
        }),
        201,
      ).collection;
      const start = {
        operationId: "start-validation-123",
        startedAt: "2026-10-22T18:00:00Z",
      };
      expect(
        await api(
          "/collections/" + c.id + "/start",
          "POST",
          start,
          f.collectorToken,
        ),
        200,
      );
      expect(
        await api(
          "/collections/" + c.id + "/start",
          "POST",
          start,
          f.collectorToken,
        ),
        200,
      );
      const payload = {
        operationId: "field-validation-123",
        materials: [{ wasteTypeId: f.item.id, quantity: 50, unit: "KG" }],
      };
      const first = expect(
        await api(
          "/collections/" + c.id + "/complete-field",
          "POST",
          payload,
          f.collectorToken,
        ),
        200,
      ).collection;
      const replay = expect(
        await api(
          "/collections/" + c.id + "/complete-field",
          "POST",
          payload,
          f.collectorToken,
        ),
        200,
      ).collection;
      assert.equal(first.collectionMaterials.length, 1);
      assert.equal(
        replay.collectionMaterials[0].id,
        first.collectionMaterials[0].id,
      );
      assert.equal(
        (
          await api(
            "/collections/" + c.id + "/complete-field",
            "POST",
            { ...payload, notes: "Payload diferente" },
            f.collectorToken,
          )
        ).status,
        409,
      );
      expect(await api("/collections/" + c.id + "/receive", "POST", {}), 200);
      assert.equal(
        expect(
          await api(
            "/collections/" + c.id + "/complete-field",
            "POST",
            payload,
            f.collectorToken,
          ),
          200,
        ).collection.status,
        "RECEIVED",
      );
      record("REPLAY", {
        oneMaterial: true,
        differentPayloadStatus: 409,
        replayAfterReceiving: true,
      });
    },
  );
  await check(
    "Controle: cancelamento do estoque restaura saldo e lote vendido bloqueia cancelamento",
    async () => {
      const x = await makeEntry();
      const d = await stock(x.entry, 50);
      expect(
        await api("/waste-stock/lots/" + d.stockLotId, "PATCH", {
          status: "SOLD",
        }),
        200,
      );
      assert.equal(
        (
          await api(
            "/collection-waste-destinations/" + d.id + "/cancel",
            "POST",
            { reason: "Não deve permitir" },
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await api("/waste-stock/lots/" + d.stockLotId, "PATCH", {
            quantity: 100,
          })
        ).status,
        400,
      );
      assert(
        (
          await api(
            "/collection-entries/" + x.entry.id,
            "GET",
            undefined,
            f.otherToken,
          )
        ).status >= 400,
      );
      record("CONTROL_GUARDS", {
        soldCancelStatus: 409,
        linkedQuantityEditStatus: 400,
        otherCooperativeDenied: true,
      });
    },
  );
  await check(
    "Controle: cancelar e registrar nova destinação deixa somente um lote disponível",
    async () => {
      const x = await makeEntry();
      const a = await stock(x.entry, 50);
      expect(
        await api(
          "/collection-waste-destinations/" + a.id + "/cancel",
          "POST",
          { reason: "Refazer destinação corretamente" },
        ),
        200,
      );
      const b = await stock(x.entry, 50);
      const lots = await lotsFor(x.entry);
      assert.notEqual(a.id, b.id);
      assert.equal(lots.length, 2);
      const available = lots
        .filter((l) => l.status === "AVAILABLE")
        .reduce((n, l) => n + Number(l.availableQuantity), 0);
      assert.equal(available, 50);
      record("IMAGE_CANCEL_RECREATE", {
        destinationsDifferent: true,
        lots: lots.map((l) => ({
          status: l.status,
          quantity: Number(l.quantity),
          availableQuantity: Number(l.availableQuantity),
        })),
        available,
      });
    },
  );
  await check(
    "Controle: destinação externa não cria lote; estoque parcial respeita o saldo",
    async () => {
      const x = await makeEntry(100);
      await stock(x.entry, 40);
      expect(
        await api("/collection-waste-destinations", "POST", {
          collectionWasteEntryId: x.entry.id,
          type: "DIRECT_DESTINATION",
          quantity: 60,
          unit: "KG",
          destinationName: "Unidade externa QA",
        }),
        201,
      );
      const entry = (await api("/collection-entries/" + x.entry.id)).body.entry;
      assert.equal(Number(entry.remainingQuantity), 0);
      assert.equal((await lotsFor(x.entry)).length, 1);
      record("CONTROL_SPLIT", {
        collectedKg: 100,
        stockKg: 40,
        externalKg: 60,
        lotCount: 1,
      });
    },
  );
  await check(
    "Lote cancelado permanece cancelado e não pode ser descartado",
    async () => {
      const x = await makeEntry();
      const d = await stock(x.entry, 50);
      expect(
        await api(
          "/collection-waste-destinations/" + d.id + "/cancel",
          "POST",
          { reason: "Cancelamento de teste" },
        ),
        200,
      );
      assert.equal(
        (await api("/waste-stock/lots/" + d.stockLotId, "DELETE")).status,
        400,
      );
      const lot = (await lotsFor(x.entry)).find((l) => l.id === d.stockLotId);
      assert.equal(lot.status, "CANCELLED");
      assert.equal(Number(lot.availableQuantity), 0);
      record("A07", {
        deleteStatus: 400,
        preservedStatus: "CANCELLED",
        availableQuantity: 0,
      });
    },
  );
  let incidentCase;
  await check(
    "Ocorrência: reenvio identificado, permissões e bloqueio de encerramento",
    async () => {
      const x = await makeEntry();
      incidentCase = x;
      const body = {
        description: "Acesso ao local precisou de autorização da portaria.",
        operationId: "incident-qa-replay-123",
      };
      const first = expect(
        await api(
          "/collections/" + x.collection.id + "/report-incident",
          "POST",
          body,
          f.collectorToken,
        ),
        200,
      ).collection;
      const replay = expect(
        await api(
          "/collections/" + x.collection.id + "/report-incident",
          "POST",
          body,
          f.collectorToken,
        ),
        200,
      ).collection;
      assert.equal(first.status, "COLLECTED");
      assert.equal(replay.incidents.length, 1);
      assert.equal(
        (
          await api(
            "/collections/" + x.collection.id + "/report-incident",
            "POST",
            { ...body, description: "Outra descrição para a mesma operação" },
            f.collectorToken,
          )
        ).status,
        409,
      );
      const incident = replay.incidents[0];
      assert.equal(
        (
          await api(
            "/collections/" +
              x.collection.id +
              "/incidents/" +
              incident.id +
              "/resolve",
            "POST",
            { resolution: "Não deve permitir ao catador" },
            f.collectorToken,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await api(
            "/collections/" +
              x.collection.id +
              "/incidents/" +
              incident.id +
              "/resolve",
            "POST",
            { resolution: "Outra cooperativa" },
            f.otherToken,
          )
        ).status,
        404,
      );
      await stock(x.entry, 50);
      expect(
        await api(
          "/collections/" + x.collection.id + "/start-sorting",
          "POST",
          {},
        ),
        200,
      );
      assert.equal(
        (await api("/collections/" + x.collection.id + "/complete", "POST", {}))
          .body.code,
        "COLLECTION_HAS_OPEN_INCIDENTS",
      );
      record("INCIDENT_FLOW", {
        statusPreserved: true,
        replayDeduplicated: true,
        collectorResolveDenied: true,
        foreignCooperativeDenied: true,
        closureBlocked: true,
      });
    },
  );
  await check(
    "Solicitação PF preserva catálogo, unidade, endereço e coordenadas",
    async () => {
      const body = {
        cooperativeId: f.coop.id,
        preferredDate: "2026-10-24T15:00:00-03:00",
        requestedMaterials: [
          { wasteTypeId: f.liter.id, unit: "LITER", estimatedQuantity: 5 },
        ],
        pickupAddress: "Rua da Pessoa Física QA, 10",
        pickupLatitude: -3.7319,
        pickupLongitude: -38.5267,
      };
      const response = expect(
        await api("/schedules", "POST", body, f.pfToken),
        201,
      ).schedule;
      assert.equal(response.pickupAddress, body.pickupAddress);
      assert.equal(response.pickupLatitude, body.pickupLatitude);
      assert.equal(response.requestedMaterials[0].unit, "LITER");
      assert.equal(
        (
          await api(
            "/schedules",
            "POST",
            { ...body, pickupLongitude: undefined },
            f.pfToken,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await api(
            "/schedules",
            "POST",
            { ...body, pickupLatitude: 100 },
            f.pfToken,
          )
        ).status,
        400,
      );
      record("PF_PICKUP", {
        unit: "LITER",
        addressSnapshot: true,
        coordinates: true,
        pairValidation: true,
      });
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
    "Painel executa recebimento, triagem, valida pendências e encerra após destinação",
    async () => {
      const waiting = await makeEntry();
      await page.goto(
        "http://127.0.0.1:5179/waste-list?coleta=" + waiting.collection.id,
      );
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("heading", {
          name: "Materiais registrados em campo",
          exact: true,
        })
        .waitFor();
      await dialog
        .getByLabel("Conferi a chegada física e os materiais desta coleta.")
        .check();
      await dialog
        .getByRole("button", { name: "Confirmar recebimento", exact: true })
        .click();
      await dialog
        .getByRole("heading", { name: "Iniciar triagem", exact: true })
        .waitFor();
      await dialog
        .getByLabel("Confirmo o início da triagem dos materiais recebidos.")
        .check();
      await dialog
        .getByRole("button", { name: "Iniciar triagem", exact: true })
        .click();
      await dialog
        .getByRole("heading", { name: "Concluir operação", exact: true })
        .waitFor();
      await dialog
        .getByLabel(
          "Conferi as destinações e confirmo o encerramento da coleta.",
        )
        .check();
      await dialog
        .getByRole("button", { name: "Concluir operação", exact: true })
        .click();
      await dialog
        .getByRole("alert")
        .filter({ hasText: "saldo pendente" })
        .waitFor();
      await stock(waiting.entry, 50);
      await dialog
        .getByRole("button", { name: "Concluir operação", exact: true })
        .click();
      await dialog.getByText("Concluída", { exact: true }).first().waitFor();
      assert.equal(
        (await api("/collections/" + waiting.collection.id)).body.collection
          .status,
        "COMPLETED",
      );
      assert.equal(
        await dialog
          .getByRole("button", { name: "Concluir operação", exact: true })
          .count(),
        0,
      );
      await page.screenshot({
        path: join(outputDir, "panel-collection-completed.png"),
        fullPage: true,
      });
      record("A01", {
        receiving: true,
        sorting: true,
        pendingBalanceRejected: true,
        closure: true,
      });
    },
  );
  await check(
    "Painel trata ocorrência e libera conclusão após conferência",
    async () => {
      await page.goto(
        "http://127.0.0.1:5179/waste-list?coleta=" + incidentCase.collection.id,
      );
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("heading", { name: "Ocorrências da operação", exact: true })
        .waitFor();
      await dialog
        .getByLabel("Tratamento realizado pela cooperativa")
        .fill("Portaria avisada e acesso autorizado. Material conferido.");
      await dialog
        .getByRole("button", {
          name: "Concluir tratamento da ocorrência",
          exact: true,
        })
        .click();
      await dialog.getByText("Tratada", { exact: true }).waitFor();
      await dialog
        .getByLabel(
          "Conferi as destinações e confirmo o encerramento da coleta.",
        )
        .check();
      await dialog
        .getByRole("button", { name: "Concluir operação", exact: true })
        .click();
      await dialog.getByText("Concluída", { exact: true }).first().waitFor();
      record("INCIDENT_PANEL", { resolution: true, closure: true });
    },
  );
  if (process.env.KATUA_APP_WEB_EXPORT) {
    await child(
      ["tests/app-upgrade/static.mjs"],
      serverDir,
      {
        KATUA_LOCAL_VALIDATION: "1",
        KATUA_APP_WEB_EXPORT: process.env.KATUA_APP_WEB_EXPORT,
      },
      /LOCAL_APP_WEB_READY/,
    );
    async function appContext(token, user) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        timezoneId: "America/Fortaleza",
        geolocation: { latitude: -3.7319, longitude: -38.5267, accuracy: 10 },
        permissions: ["geolocation"],
      });
      await context.addInitScript(
        ({ token, user }) => {
          localStorage.setItem("@katu:token", token);
          localStorage.setItem("@katu:user", JSON.stringify(user));
        },
        { token, user },
      );
      await context.route("**/*", (r) =>
        ["127.0.0.1", "localhost"].includes(new URL(r.request().url()).hostname)
          ? r.continue()
          : r.abort(),
      );
      return context;
    }
    await check(
      "Visual: acesso e perfis responsivos sem solicitar GPS antecipado",
      async () => {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 1000 },
          }),
          p = await context.newPage();
        await p.route("**/*", (r) =>
          new URL(r.request().url()).hostname === "127.0.0.1"
            ? r.continue()
            : r.abort(),
        );
        await p.goto("http://127.0.0.1:5181/(public)/access-type");
        await p
          .getByRole("heading", { name: "Como você participa?" })
          .waitFor();
        await p.screenshot({
          path: join(outputDir, "visual-access-desktop.png"),
          fullPage: true,
        });
        await p.getByRole("button", { name: "Gerador", exact: true }).click();
        await p
          .getByRole("heading", { name: "Qual é o seu perfil?" })
          .waitFor();
        assert.equal(
          await p.getByText(/GPS ativo|Carregando localização/).count(),
          0,
        );
        await p.screenshot({
          path: join(outputDir, "visual-profiles-desktop.png"),
          fullPage: true,
        });
        await p.setViewportSize({ width: 390, height: 844 });
        await p.screenshot({
          path: join(outputDir, "visual-profiles-mobile.png"),
          fullPage: true,
        });
        assert(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await context.close();
      },
    );
    await check(
      "Visual: seis perfis de login preservam senha, recuperação e acesso por e-mail",
      async () => {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 1000 },
          }),
          p = await context.newPage();
        await p.route("**/*", (r) =>
          new URL(r.request().url()).hostname === "127.0.0.1"
            ? r.continue()
            : r.abort(),
        );
        for (const profile of [
          "pf",
          "comercial",
          "grande",
          "cooperativa",
          "catador",
          "motorista",
        ]) {
          await p.goto("http://127.0.0.1:5181/(auth)/login?profile=" + profile);
          await p
            .getByLabel("E-mail", { exact: true })
            .fill("teste@example.test");
          await p.getByLabel("Senha", { exact: true }).fill("qa-only");
          assert.equal(
            await p.getByLabel("Senha", { exact: true }).getAttribute("type"),
            "password",
          );
          await p
            .getByRole("button", { name: "Mostrar senha", exact: true })
            .click();
          assert.equal(
            await p
              .getByLabel("Senha", { exact: true })
              .evaluate((el) => el.type),
            "text",
          );
          await p
            .getByRole("radio", { name: "Acesso por e-mail", exact: true })
            .click();
          assert.equal(await p.getByLabel("Senha", { exact: true }).count(), 0);
          await p
            .getByRole("button", { name: "Enviar link de acesso", exact: true })
            .waitFor();
          await p
            .getByRole("radio", { name: "Com senha", exact: true })
            .click();
          await p
            .getByRole("button", { name: "Esqueceu a senha?", exact: true })
            .waitFor();
        }
        await p.screenshot({
          path: join(outputDir, "visual-login-desktop.png"),
          fullPage: true,
        });
        await p.setViewportSize({ width: 390, height: 844 });
        await p.screenshot({
          path: join(outputDir, "visual-login-mobile.png"),
          fullPage: true,
        });
        assert(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await context.close();
      },
    );
    await check(
      "App PF solicita coleta pelo catálogo e confirma ponto no mapa",
      async () => {
        const context = await appContext(f.pfToken, {
            id: f.pf.id,
            role: "PF",
            displayName: f.pf.displayName,
            email: f.pf.email,
          }),
          p = await context.newPage();
        await p.goto("http://127.0.0.1:5181/(pf-tabs)/schedule");
        await p.getByRole("radio", { name: /Cooperativa QA/ }).click();
        await p.getByRole("checkbox", { name: /Papel/ }).click();
        await p
          .getByLabel("Estimativa de Papel (opcional)", { exact: true })
          .fill("5");
        await p
          .getByLabel("Endereço completo e referência", { exact: true })
          .fill("Rua Teste de Interface PF, 123, Sobral CE");
        await p
          .locator(".leaflet-container")
          .click({ position: { x: 140, y: 120 } });
        await p
          .getByLabel("Data (DD/MM/AAAA)", { exact: true })
          .fill("24/10/2026");
        await p
          .getByLabel("Horário de Fortaleza (HH:MM)", { exact: true })
          .fill("14:30");
        await p
          .getByRole("button", { name: "Enviar solicitação", exact: true })
          .click();
        await p.getByText("Total de Solicitações", { exact: true }).waitFor();
        const rows = (await api("/schedules", "GET", undefined, f.pfToken)).body
          .schedules;
        const saved = rows.find(
          (row) =>
            row.pickupAddress === "Rua Teste de Interface PF, 123, Sobral CE",
        );
        assert(saved);
        assert.equal(Number(saved.requestedMaterials[0].estimatedQuantity), 5);
        assert.equal(typeof saved.pickupLatitude, "number");
        await p.screenshot({
          path: join(outputDir, "app-pf-request.png"),
          fullPage: true,
        });
        await context.close();
        record("APP_PF_UI", {
          createdThroughUI: true,
          coordinates: true,
          catalog: true,
        });
      },
    );
    await check(
      "App cooperativa recebe e inicia triagem com confirmação explícita",
      async () => {
        const x = await makeEntry();
        const context = await appContext(f.token, {
            id: f.owner.id,
            role: "COOPERATIVE",
            displayName: f.owner.displayName,
            email: f.owner.email,
          }),
          p = await context.newPage();
        await p.goto("http://127.0.0.1:5181/(cooperativa)/operations");
        await p
          .getByLabel("Buscar origem, protocolo ou ocorrência", { exact: true })
          .fill(x.collection.id);
        await p
          .getByRole("button", { name: "Confirmar recebimento", exact: true })
          .click();
        await p.getByRole("checkbox").click();
        await p
          .getByRole("button", { name: "Registrar confirmação", exact: true })
          .click();
        await p
          .getByRole("button", { name: "Iniciar triagem", exact: true })
          .waitFor();
        assert.equal(
          (await api("/collections/" + x.collection.id)).body.collection.status,
          "RECEIVED",
        );
        await p
          .getByRole("button", { name: "Iniciar triagem", exact: true })
          .click();
        await p.getByRole("checkbox").click();
        await p
          .getByRole("button", { name: "Registrar confirmação", exact: true })
          .click();
        await p
          .getByRole("button", { name: "Concluir operação", exact: true })
          .waitFor();
        assert.equal(
          (await api("/collections/" + x.collection.id)).body.collection.status,
          "SORTING",
        );
        await p.screenshot({
          path: join(outputDir, "app-cooperative-operations.png"),
          fullPage: true,
        });
        await context.close();
      },
    );
    await check(
      "App cria e edita roteiro com coletas reais e ordem preservada",
      async () => {
        const a = expect(
          await api("/collections", "POST", {
            scheduleId: (await schedule()).id,
            collectorId: f.collector.id,
          }),
          201,
        ).collection;
        const b = expect(
          await api("/collections", "POST", {
            scheduleId: (await schedule()).id,
            collectorId: f.collector.id,
          }),
          201,
        ).collection;
        const context = await appContext(f.token, {
            id: f.owner.id,
            role: "COOPERATIVE",
            displayName: f.owner.displayName,
            email: f.owner.email,
          }),
          p = await context.newPage();
        await p.goto("http://127.0.0.1:5181/(cooperativa)/rotas/novo");
        await p
          .getByLabel("Nome da rota", { exact: true })
          .fill("Roteiro App QA");
        const search = p.getByLabel(
          "Buscar coletas disponíveis por origem, endereço ou protocolo",
          { exact: true },
        );
        await search.fill(a.id);
        await p.getByRole("button", { name: /Adicionar coleta/ }).click();
        await search.fill(b.id);
        await p.getByRole("button", { name: /Adicionar coleta/ }).click();
        await p
          .getByRole("button", { name: "Subir", exact: true })
          .last()
          .click();
        await p
          .getByRole("button", { name: "Salvar planejamento", exact: true })
          .click();
        await p.waitForURL((url) => !url.pathname.endsWith("/novo"));
        const routes = expect(await api("/routes"), 200).routes,
          route = routes.find((r) => r.name === "Roteiro App QA");
        assert(route);
        assert.deepEqual(route.collectionOrder, [b.id, a.id]);
        await p.goto(
          "http://127.0.0.1:5181/(cooperativa)/rotas/editar?id=" + route.id,
        );
        await p
          .getByLabel("Nome da rota", { exact: true })
          .fill("Roteiro App QA Editado");
        await p
          .getByRole("button", { name: "Salvar planejamento", exact: true })
          .click();
        await p.waitForURL((url) => !url.pathname.endsWith("/editar"));
        const saved = expect(await api("/routes/" + route.id), 200).route;
        assert.equal(saved.name, "Roteiro App QA Editado");
        assert.deepEqual(saved.collectionOrder, [b.id, a.id]);
        await p.screenshot({
          path: join(outputDir, "app-route-planner.png"),
          fullPage: true,
        });
        await context.close();
      },
    );
    await check(
      "App catador atualiza nome pelo perfil e mantém e-mail somente leitura",
      async () => {
        const context = await appContext(f.collectorToken, {
            id: f.collector.userId,
            role: "COLLECTOR",
            displayName: f.collector.name,
            email: f.collector.email,
          }),
          p = await context.newPage();
        await p.goto("http://127.0.0.1:5181/(catador)/profile");
        await p
          .getByLabel("Nome", { exact: true })
          .fill("Catador QA Atualizado");
        assert.equal(
          await p.getByLabel("E-mail de acesso", { exact: true }).isEditable(),
          false,
        );
        await p
          .getByRole("button", { name: "Salvar nome", exact: true })
          .click();
        await p.getByText("Nome atualizado.", { exact: true }).waitFor();
        assert.equal(
          (await api("/auth/me", "GET", undefined, f.collectorToken)).body.user
            .displayName,
          "Catador QA Atualizado",
        );
        await p.screenshot({
          path: join(outputDir, "app-collector-account.png"),
          fullPage: true,
        });
        await context.close();
      },
    );
    await check(
      "Mapa web do motorista mostra PEV e marcadores interativos",
      async () => {
        const context = await appContext(f.driverToken, {
            id: f.driver.userId,
            role: "DRIVER",
            displayName: f.driver.name,
            email: f.driver.email,
          }),
          p = await context.newPage();
        await p.goto("http://127.0.0.1:5181/(motorista)/mapa");
        await p.locator(".leaflet-container").waitFor();
        assert(
          (await p.locator(".leaflet-container").boundingBox()).height >= 280,
        );
        await p.getByRole("button", { name: /Localizar PEV Praça QA/ }).click();
        await p
          .getByRole("link", { name: /Abrir navegação para PEV Praça QA/ })
          .waitFor();
        assert.equal(
          await p.getByText("Latitude:", { exact: true }).count(),
          0,
        );
        await p
          .getByRole("button", { name: /Localizar Cooperativa QA/ })
          .click();
        await p
          .getByRole("link", { name: /Abrir navegação para Cooperativa QA/ })
          .waitFor();
        await p.getByRole("button", { name: "Ver todos", exact: true }).click();
        await p.getByRole("button", { name: /Localizar PEV Praça QA/ }).click();
        assert((await p.locator(".leaflet-marker-icon").count()) >= 2);
        await p.screenshot({
          path: join(outputDir, "app-driver-map.png"),
          fullPage: true,
        });
        await context.close();
      },
    );
    await check(
      "Layout do motorista redireciona PF e saída limpa credencial",
      async () => {
        const context = await appContext(f.pfToken, {
            id: f.pf.id,
            role: "PF",
            displayName: f.pf.displayName,
            email: f.pf.email,
          }),
          p = await context.newPage();
        await p.goto("http://127.0.0.1:5181/(motorista)/mapa");
        await p.getByText("Painel da Pessoa Física", { exact: true }).waitFor();
        p.on("dialog", (dialog) => dialog.accept());
        await p
          .getByRole("button", { name: "Sair da conta", exact: true })
          .first()
          .click();
        await p.waitForFunction(
          () => localStorage.getItem("@katu:token") === null,
        );
        assert.equal(
          await p.evaluate(() => localStorage.getItem("@katu:user")),
          null,
        );
        await context.close();
      },
    );
  }
  assert.deepEqual(errors, []);
  await writeFile(
    join(outputDir, "evidence.json"),
    JSON.stringify(evidence, null, 2),
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
          "Validação das correções por API real Fastify/Prisma + PGlite local descartável; sem acesso à VPS",
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
