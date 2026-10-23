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
      "katua-documents-upgrade-",
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
    .replace(/model OwnerDocument\s*\{[^}]*\}/g, "")
    .replace(/^.*ownerDocuments\s+OwnerDocument\[\].*$/gm, "");
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
  await db.exec(
    await readFile(
      join(
        serverDir,
        "prisma/migrations/20261023180000_owner_documents/migration.sql",
      ),
      "utf8",
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
      DOCUMENT_STORAGE_DIR: join(outputDir, "private-documents"),
    },
    /LOCAL_API_READY/,
  );
  const f = JSON.parse(await readFile(join(outputDir, "fixture.json"), "utf8"));
  await db.query('UPDATE "Collection" SET "collectorId"=$1 WHERE "id"=$2', [
    f.collector.id,
    f.b.id,
  ]);
  const base = "http://127.0.0.1:3339";
  async function api(url, method = "GET", body, token = f.token) {
    const r = await fetch(base + url, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
    return { status: r.status, body: await r.json() };
  }
  const expect = (r, status) => {
    assert.equal(r.status, status, JSON.stringify(r.body));
    return r.body;
  };
  function upload(kind, ownerId, opts = {}) {
    const b = new FormData();
    Object.entries({
      kind,
      ownerId,
      title: "Documento QA",
      documentType: "Contrato",
      ...opts.fields,
    }).forEach(([k, v]) => b.append(k, v));
    if (!opts.empty)
      b.append(
        "file",
        new Blob([opts.content || "%PDF-1.4\n%%EOF"], {
          type: "application/pdf",
        }),
        "contrato.pdf",
      );
    return b;
  }
  const docs = {};
  let legacyVehicleId, maintenanceId;
  for (const [kind, entity] of Object.entries({
    generator: f.gen,
    collector: f.collector,
    driver: f.driver,
    vehicle: f.vehicle,
  }))
    await check("Upload, vínculo e download " + kind, async () => {
      docs[kind] = expect(
        await api("/owner-documents", "POST", upload(kind, entity.id)),
        201,
      ).document.id;
      const list = expect(
          await api(`/owner-documents?kind=${kind}&ownerId=${entity.id}`),
          200,
        ).documents,
        d = list.find((d) => d.id === docs[kind]);
      assert.ok(d);
      assert.equal(d.storageKey, undefined);
      const r = await fetch(base + d.download, {
        headers: { Authorization: "Bearer " + f.token },
      });
      assert.equal(r.status, 200);
      assert.equal(await r.text(), "%PDF-1.4\n%%EOF");
      assert.match(r.headers.get("cache-control"), /private/);
      assert.match(r.headers.get("content-disposition"), /attachment/);
    });
  await check("Isolamento entre cooperativas e papéis", async () => {
    expect(
      await api(
        `/owner-documents?kind=generator&ownerId=${f.gen.id}`,
        "GET",
        null,
        f.otherToken,
      ),
      404,
    );
    expect(
      await api(
        "/owner-documents",
        "POST",
        upload("generator", f.gen.id),
        f.otherToken,
      ),
      404,
    );
    expect(
      await api(
        `/owner-documents/owner/${docs.generator}/file`,
        "GET",
        null,
        f.otherToken,
      ),
      404,
    );
    for (const token of [f.pfToken, f.collectorToken, f.driverToken])
      expect(
        await api(
          "/owner-documents",
          "POST",
          upload("generator", f.gen.id),
          token,
        ),
        403,
      );
  });
  await check(
    "Formato inválido, arquivo ausente e datas incoerentes",
    async () => {
      expect(
        await api(
          "/owner-documents",
          "POST",
          upload("generator", f.gen.id, { content: "<html>falso</html>" }),
        ),
        400,
      );
      expect(
        await api(
          "/owner-documents",
          "POST",
          upload("generator", f.gen.id, { empty: true }),
        ),
        400,
      );
      expect(
        await api(
          "/owner-documents",
          "POST",
          upload("generator", f.gen.id, {
            fields: { issueDate: "2026-10-25", expiryDate: "2026-10-01" },
          }),
        ),
        400,
      );
      expect(
        await api(
          "/owner-documents",
          "POST",
          upload("generator", f.gen.id, {
            fields: { issueDate: "2026-02-30" },
          }),
        ),
        400,
      );
    },
  );
  await check("Limite de 10 MB e arquivo não público", async () => {
    const tooBig = new Uint8Array(10 * 1024 * 1024 + 1);
    tooBig.set(new TextEncoder().encode("%PDF-"));
    expect(
      await api(
        "/owner-documents",
        "POST",
        upload("vehicle", f.vehicle.id, { content: tooBig }),
      ),
      413,
    );
    const stored = await db.query(
      'SELECT "storageKey" FROM "OwnerDocument" LIMIT 1',
    );
    const r = await fetch(base + "/uploads/" + stored.rows[0].storageKey);
    assert.equal(r.status, 404);
  });
  await check("Banco exige exatamente um proprietário", async () => {
    await assert.rejects(() =>
      db.exec(
        'UPDATE "OwnerDocument" SET "generatorId"=NULL,"collectorId"=NULL,"driverId"=NULL,"vehicleId"=NULL',
      ),
    );
    assert.equal(
      (await db.query('SELECT COUNT(*)::int AS n FROM "OwnerDocument"')).rows[0]
        .n,
      4,
    );
  });
  await check(
    "Documentos e anexos anteriores permanecem visíveis",
    async () => {
      const b = new FormData();
      Object.entries({
        vehicle_id: f.vehicle.id,
        document_type: "insurance",
        document_number: "QA-123",
      }).forEach(([k, v]) => b.append(k, v));
      b.append(
        "file",
        new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }),
        "seguro.pdf",
      );
      legacyVehicleId = expect(await api("/vehicle-documents", "POST", b), 201)
        .data.id;
      const list = expect(
        await api(`/owner-documents?kind=vehicle&ownerId=${f.vehicle.id}`),
        200,
      ).documents;
      const d = list.find((d) => d.source === "vehicle");
      assert.ok(d);
      const r = await fetch(base + d.download, {
        headers: { Authorization: "Bearer " + f.token },
      });
      assert.equal(r.status, 200);
      assert.equal(await r.text(), "%PDF-1.4\n%%EOF");
    },
  );
  await check(
    "Formulários antigos: arquivos privados, edição e limpeza em falha",
    async () => {
      const d = expect(
        await api(`/vehicle-documents/${legacyVehicleId}`),
        200,
      ).data;
      assert.match(d.file, /^\/private-documents\/vehicle-documents\//);
      expect(await api(d.file), 404);
      const b = new FormData();
      Object.entries({
        vehicle_id: f.vehicle.id,
        maintenance_type: "Revisão QA",
        maintenance_date: "2026-10-23",
        status: "completed",
        cost: "125.50",
      }).forEach(([k, v]) => b.append(k, v));
      b.append(
        "file",
        new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }),
        "fatura.pdf",
      );
      maintenanceId = expect(await api("/maintenance-logs", "POST", b), 201)
        .data.id;
      expect(
        await api(`/maintenance-logs/${maintenanceId}`, "PUT", {
          maintenance_type: "Revisão atualizada QA",
        }),
        200,
      );
      const docs = expect(
        await api(`/owner-documents?kind=vehicle&ownerId=${f.vehicle.id}`),
        200,
      ).documents;
      const invoice = docs.find((d) => d.source === "maintenance");
      assert.ok(invoice);
      assert.equal(
        (
          await fetch(base + invoice.download, {
            headers: { Authorization: "Bearer " + f.token },
          })
        ).status,
        200,
      );
      const { readdir } = await import("node:fs/promises"),
        folder = join(outputDir, "private-documents", "vehicle-documents"),
        before = await readdir(folder),
        invalid = new FormData();
      invalid.append("document_type", "insurance");
      invalid.append("document_number", "invalid");
      invalid.append(
        "file",
        new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }),
        "unlinked.pdf",
      );
      expect(await api("/vehicle-documents", "POST", invalid), 400);
      assert.deepEqual(await readdir(folder), before);
    },
  );
  await check("Anexo antigo do catador segue disponível", async () => {
    const b = new FormData();
    b.append("documentType", "RG");
    b.append("documentName", "RG legado QA");
    b.append(
      "document",
      new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }),
      "rg.pdf",
    );
    expect(
      await api(`/collectors/${f.collector.id}/documents`, "POST", b),
      201,
    );
    const ds = expect(
        await api(`/owner-documents?kind=collector&ownerId=${f.collector.id}`),
        200,
      ).documents,
      d = ds.find((d) => d.source === "collector");
    assert.ok(d);
    assert.equal(
      (
        await fetch(base + d.download, {
          headers: { Authorization: "Bearer " + f.token },
        })
      ).status,
      200,
    );
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
    { VITE_API_BASE_URL: base },
    /Local:/,
  );
  browser = await pw.launch({
    executablePath:
      process.env.KATUA_CHROMIUM_PATH || (await chromium.executablePath()),
    args: chromium.args.filter((a) => a !== "--single-process"),
    headless: true,
  });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
    },
    { token: f.token, user: f.owner },
  );
  const page = await context.newPage();
  await check("Painel anexa documento ao gerador selecionado", async () => {
    await page.goto(
      "http://127.0.0.1:5179/generator-documents?generatorId=" + f.gen.id,
    );
    await page
      .getByRole("button", { name: "Anexar documento", exact: true })
      .click();
    await page
      .getByLabel("Nome do documento", { exact: true })
      .fill("Licença operacional QA");
    await page
      .getByLabel("Tipo de documento", { exact: true })
      .selectOption("Licença ambiental");
    await page.getByLabel(/Arquivo · PDF/).setInputFiles({
      name: "licenca.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
    await page
      .getByRole("button", { name: "Salvar documento", exact: true })
      .click();
    await page.getByText("Licença operacional QA", { exact: true }).waitFor();
    const dl = page.waitForEvent("download");
    await page
      .getByRole("row")
      .filter({ hasText: "Licença operacional QA" })
      .getByRole("button", { name: "Baixar anexo" })
      .click();
    assert.match((await dl).suggestedFilename(), /licenca.pdf/);
    await page.screenshot({
      path: join(outputDir, "documentos-gerador.png"),
      fullPage: true,
    });
  });
  await check(
    "Documentos de motoristas e catadores são acessíveis",
    async () => {
      for (const [k, e] of [
        ["driver", f.driver],
        ["collector", f.collector],
      ]) {
        await page.goto(`http://127.0.0.1:5179/${k}-documents?${k}Id=${e.id}`);
        await page.getByText("Documento QA", { exact: true }).waitFor();
      }
    },
  );
  await check("Formulários listam veículos atuais", async () => {
    for (const r of ["create-document", "create-maintenance"]) {
      await page.goto("http://127.0.0.1:5179/" + r);
      await page
        .locator('#vehicle_id option[value="' + f.vehicle.id + '"]')
        .waitFor({ state: "attached" });
    }
  });
  await check(
    "Edição carrega o veículo vinculado e baixa o anexo",
    async () => {
      for (const [r, id] of [
        ["edit-document", legacyVehicleId],
        ["edit-maintenance", maintenanceId],
      ]) {
        await page.goto(`http://127.0.0.1:5179/${r}/${id}`);
        await page.waitForFunction(
          (id) => document.querySelector("#vehicle_id")?.value === id,
          f.vehicle.id,
        );
        const dl = page.waitForEvent("download");
        await page.getByRole("button", { name: "Baixar arquivo" }).click();
        assert.ok((await dl).suggestedFilename());
      }
    },
  );
  await check(
    "Histórico começa vazio, filtra gerador e baixa coleta e ação",
    async () => {
      await page.goto("http://127.0.0.1:5179/generator-history");
      await page
        .getByText("Selecione um cadastro para consultar o histórico.", {
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Baixar coleta em PDF", exact: true })
          .count(),
        0,
      );
      await page.getByLabel(f.gen.name, { exact: true }).click();
      await page.waitForFunction(() =>
        new URL(location.href).searchParams.has("generatorId"),
      );
      await page
        .getByRole("button", { name: "Ver ações", exact: true })
        .first()
        .waitFor();
      let dl = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Baixar coleta em PDF", exact: true })
        .first()
        .click();
      await (await dl).saveAs(join(outputDir, "coleta.pdf"));
      await page
        .getByRole("button", { name: "Ver ações", exact: true })
        .first()
        .click();
      await page
        .getByRole("button", { name: "Baixar ação em PDF", exact: true })
        .first()
        .waitFor();
      dl = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Baixar ação em PDF", exact: true })
        .first()
        .click();
      await (await dl).saveAs(join(outputDir, "acao.pdf"));
      await page.screenshot({
        path: join(outputDir, "historico-gerador.png"),
        fullPage: true,
      });
    },
  );
  await check("Detalhe da coleta permite salvar PDF", async () => {
    await page.goto("http://127.0.0.1:5179/waste-list?coleta=" + f.b.id);
    await page
      .getByRole("button", { name: "Salvar coleta em PDF", exact: true })
      .waitFor();
    const dl = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Salvar coleta em PDF", exact: true })
      .click();
    await (await dl).saveAs(join(outputDir, "coleta-detalhe.pdf"));
  });
  await check(
    "Históricos por equipe/veículo e seleção de múltiplos geradores",
    async () => {
      for (const [k, e] of [
        ["collector", f.collector],
        ["driver", f.driver],
        ["vehicle", f.vehicle],
      ]) {
        await page.goto(`http://127.0.0.1:5179/${k}-history?${k}Id=${e.id}`);
        await page
          .getByRole("button", { name: "Ver ações", exact: true })
          .first()
          .waitFor();
      }
      await page.goto("http://127.0.0.1:5179/generator-history");
      await page.getByLabel(f.gen.name, { exact: true }).click();
      await page.waitForFunction(
        () =>
          new URL(location.href).searchParams.getAll("generatorId").length ===
          1,
      );
      await page.getByLabel("Gerador sem GPS QA", { exact: true }).click();
      await page.waitForFunction(
        () =>
          new URL(location.href).searchParams.getAll("generatorId").length ===
          2,
      );
      await page
        .getByLabel("Status", { exact: true })
        .selectOption("COMPLETED");
      await page
        .getByText(
          "Nenhuma coleta no período para os cadastros selecionados.",
          { exact: true },
        )
        .waitFor();
    },
  );
  await check("PDFs completos com unidades reais e paginação", async () => {
    for (const name of ["coleta", "acao", "coleta-detalhe"])
      assert.match(
        execFileSync("pdfinfo", [join(outputDir, name + ".pdf")], {
          encoding: "utf8",
        }),
        /Pages:\s+1/,
      );
    const text = execFileSync(
      "pdftotext",
      [join(outputDir, "coleta-detalhe.pdf"), "-"],
      { encoding: "utf8" },
    );
    assert.match(text, /5\s*L/);
    assert.match(text, /Não substitui MTR/);
  });
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
