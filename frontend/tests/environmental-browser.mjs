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
const outputDir = await mkdtemp(join(tmpdir(), "katua-environmental-")),
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

const { emptyPayload } =
  await import("../src/components/environmental/environmentalModel.js");
try {
  const schema = execFileSync(
    "git",
    [
      "show",
      "472481b97b917230b2277e3f8cfbb2bba95d6fb2:server/prisma/schema.prisma",
    ],
    { cwd: appDir, encoding: "utf8" },
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
  socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 54329 });
  await socket.start();
  await db.exec(
    "BEGIN;" +
      (await readFile(
        join(
          serverDir,
          "prisma/migrations/20261020160000_environmental_workspace/migration.sql",
        ),
        "utf8",
      )) +
      "COMMIT;",
  );
  await child(
    ["--import", "tsx", "tests/environmental/local-server.ts"],
    serverDir,
    {
      KATUA_LOCAL_VALIDATION: "1",
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
  const unitData = {
    municipalityCode: "2312908",
    name: "Unidade piloto Sobral",
    taxId: "11222333000181",
    officialUnitCode: "12345",
    address: "Rua de teste, 100, Sobral/CE",
    responsibleName: "Responsável QA",
    responsiblePosition: "Coordenação",
    appointmentReference: "Designação de teste",
    operationalRoles: [
      "GENERATOR",
      "TRANSPORTER",
      "DESTINATION",
      "LR_OPERATOR",
    ],
    environment: "HOMOLOGATION",
    shareWithMunicipality: false,
  };
  let unit,
    doc,
    municipalToken,
    viewerToken,
    municipalUnit,
    municipalDoc,
    attachment;
  await check(
    "Migração incremental e município/unidade persistem sem alterar dados operacionais",
    async () => {
      const context = await api("/environmental/context");
      assert.equal(context.status, 200);
      assert.deepEqual(
        context.body.data.municipalities.slice(0, 3).map((m) => m.name),
        ["Jijoca de Jericoacoara", "Cruz", "Sobral"],
      );
      assert.equal(context.body.data.integration.canIssueMtr, false);
      const r = await api("/environmental/units", "POST", unitData);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      unit = r.body.data;
      assert.equal(
        (await api("/environmental/units")).body.data[0].id,
        unit.id,
      );
    },
  );
  await check(
    "Rascunho privado e validação de payload/escopo, sem status oficial manipulável",
    async () => {
      const payload = emptyPayload("MTR_REGULAR", unit);
      const r = await api("/environmental/documents", "POST", {
        unitId: unit.id,
        family: "MTR_REGULAR",
        title: "Movimentação QA",
        referenceYear: null,
        sourceCollectionId: null,
        payload,
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      doc = (await api("/environmental/documents/" + r.body.data.id)).body.data;
      assert.equal(doc.status, "DRAFT");
      assert.equal(doc.officialConfirmed, false);
      assert.ok(doc.issues.length > 0);
      assert.equal(
        (
          await api(
            "/environmental/documents/" + doc.id,
            "GET",
            null,
            f.otherToken,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await api(
            "/environmental/documents?unitId=" + unit.id,
            "GET",
            null,
            f.otherToken,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await api("/environmental/documents/" + doc.id, "PUT", {
            version: doc.version,
            title: "Injeção de estado",
            referenceYear: null,
            payload,
            status: "ISSUED",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await api(
            "/environmental/documents/" + doc.id + "/transition",
            "POST",
            { version: doc.version, action: "REQUEST_REVIEW" },
          )
        ).status,
        422,
      );
      assert.equal(
        (await api("/environmental/context", "GET", null, f.driverToken))
          .status,
        403,
      );
    },
  );
  await check(
    "Concorrência de edição rejeita sobrescrita, preserva revisão e histórico",
    async () => {
      const payload = emptyPayload("MTR_REGULAR", unit);
      payload.origin = {
        name: "Gerador QA",
        taxId: "11222333000181",
        officialUnitCode: "123",
        municipalityCode: "2312908",
        address: "Rua A",
      };
      payload.carrier = { ...payload.origin };
      payload.recipient = { ...payload.origin };
      payload.vehiclePlate = "ABC1D23";
      payload.driverName = "Motorista QA";
      payload.departureDate = "2026-10-20";
      payload.materials = [
        {
          name: "Papel",
          ibamaCode: "150101",
          quantity: 3,
          unit: "KG",
          physicalStateCode: "1",
          classificationCode: "2",
          packagingCode: "3",
          treatmentCode: "4",
        },
      ];
      const body = {
        version: doc.version,
        title: doc.title,
        referenceYear: null,
        payload,
      };
      const r = await Promise.all([
        api("/environmental/documents/" + doc.id, "PUT", body),
        api("/environmental/documents/" + doc.id, "PUT", body),
      ]);
      assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
      doc = (await api("/environmental/documents/" + doc.id)).body.data;
      assert.equal(doc.issues.length, 0);
      let t = await api(
        "/environmental/documents/" + doc.id + "/transition",
        "POST",
        { version: doc.version, action: "REQUEST_REVIEW" },
      );
      assert.equal(t.status, 200);
      t = await api(
        "/environmental/documents/" + doc.id + "/transition",
        "POST",
        { version: t.body.data.version, action: "APPROVE" },
      );
      assert.equal(t.status, 200);
      doc = (await api("/environmental/documents/" + doc.id)).body.data;
      assert.equal(doc.status, "APPROVED");
      const blocked = await api(
        "/environmental/documents/" + doc.id + "/submit",
        "POST",
        { version: doc.version },
      );
      assert.equal(blocked.status, 503);
      assert.equal(blocked.body.code, "INTEGRATION_UNAVAILABLE");
      assert.equal(
        (await api("/environmental/documents/" + doc.id)).body.data
          .officialConfirmed,
        false,
      );
      const history = (
        await api("/environmental/documents/" + doc.id + "/history")
      ).body.data;
      assert.equal(history.total, 4);
    },
  );
  await check(
    "Mudança da unidade invalida revisão para envio; evidências privadas têm escopo e hash",
    async () => {
      const r = await api("/environmental/units/" + unit.id, "PUT", {
        ...unitData,
        name: "Unidade piloto Sobral atualizada",
        version: unit.version,
      });
      assert.equal(r.status, 200);
      unit = r.body.data;
      assert.equal(
        (
          await api("/environmental/documents/" + doc.id + "/submit", "POST", {
            version: doc.version,
          })
        ).status,
        409,
      );
      const reopen = await api(
        "/environmental/documents/" + doc.id + "/transition",
        "POST",
        { version: doc.version, action: "REOPEN" },
      );
      assert.equal(reopen.status, 200);
      doc = (await api("/environmental/documents/" + doc.id)).body.data;
      const form = new FormData();
      form.append(
        "file",
        new Blob(["%PDF-1.4\nDado fictício de validação\n%%EOF"], {
          type: "application/pdf",
        }),
        "evidencia.pdf",
      );
      const response = await fetch(
        `http://127.0.0.1:3339/environmental/documents/${doc.id}/attachments?version=${doc.version}`,
        {
          method: "POST",
          headers: { Authorization: "Bearer " + f.token },
          body: form,
        },
      );
      assert.equal(response.status, 201, await response.clone().text());
      attachment = (await response.json()).data;
      doc = (await api("/environmental/documents/" + doc.id)).body.data;
      assert.equal(doc.attachments.length, 1);
      assert.equal(doc.attachments[0].sha256.length, 64);
      const stored = await db.query(
        'SELECT "storageKey" FROM "EnvironmentalAttachment" WHERE id=$1',
        [attachment.id],
      );
      files.push(
        join(
          serverDir,
          "private-environmental-files",
          stored.rows[0].storageKey,
        ),
      );
      const url = `http://127.0.0.1:3339/environmental/documents/${doc.id}/attachments/${attachment.id}`;
      assert.equal((await fetch(url)).status, 401);
      assert.equal(
        (
          await fetch(url, {
            headers: { Authorization: "Bearer " + f.otherToken },
          })
        ).status,
        404,
      );
      const file = await fetch(url, {
        headers: { Authorization: "Bearer " + f.token },
      });
      assert.equal(file.status, 200);
      assert.ok((await file.text()).startsWith("%PDF-"));
      assert.equal(
        (
          await fetch(
            "http://127.0.0.1:3339/uploads/" + stored.rows[0].storageKey,
          )
        ).status,
        404,
      );
      const fake = new FormData();
      fake.append(
        "file",
        new Blob(["not pdf"], { type: "application/pdf" }),
        "fake.pdf",
      );
      assert.equal(
        (
          await fetch(
            `http://127.0.0.1:3339/environmental/documents/${doc.id}/attachments?version=${doc.version}`,
            {
              method: "POST",
              headers: { Authorization: "Bearer " + f.token },
              body: fake,
            },
          )
        ).status,
        400,
      );
    },
  );
  await check(
    "Designação municipal exclusiva de administrador, compartilhamento explícito e revogável",
    async () => {
      const grant = {
        userId: f.municipalUser.id,
        municipalityCode: "2312908",
        permission: "EDITOR",
        appointmentReference: "Portaria fictícia QA",
        active: true,
      };
      assert.equal(
        (await api("/environmental/municipal-access", "POST", grant)).status,
        403,
      );
      assert.equal(
        (
          await api(
            "/environmental/municipal-access",
            "POST",
            grant,
            f.adminToken,
          )
        ).status,
        200,
      );
      municipalToken = (
        await api("/auth/login", "POST", {
          email: f.municipalUser.email,
          password: f.password,
        })
      ).body.token;
      assert.ok(municipalToken);
      assert.equal(
        (await api("/collections", "GET", null, municipalToken)).status,
        403,
      );
      assert.equal(
        (await api("/environmental/units", "GET", null, municipalToken)).body
          .data.length,
        0,
      );
      assert.equal(
        (
          await api(
            "/environmental/documents/" + doc.id,
            "GET",
            null,
            municipalToken,
          )
        ).status,
        404,
      );
      const shared = await api("/environmental/units/" + unit.id, "PUT", {
        ...unitData,
        shareWithMunicipality: true,
        version: unit.version,
      });
      unit = shared.body.data;
      assert.equal(
        (
          await api(
            "/environmental/documents/" + doc.id,
            "GET",
            null,
            municipalToken,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await api(
            "/environmental/documents/" + doc.id,
            "PUT",
            {
              version: doc.version,
              title: doc.title,
              referenceYear: null,
              payload: doc.payload,
            },
            municipalToken,
          )
        ).status,
        403,
      );
      const foreign = await api(
        "/environmental/units",
        "POST",
        { ...unitData, municipalityCode: "2304251" },
        municipalToken,
      );
      assert.equal(foreign.status, 403);
      assert.equal(
        (
          await api("/environmental/units/" + unit.id, "PUT", {
            ...unitData,
            shareWithMunicipality: false,
            version: unit.version,
          })
        ).status,
        200,
      );
      unit = (await api("/environmental/units")).body.data[0];
      assert.equal(
        (
          await api(
            "/environmental/documents/" + doc.id,
            "GET",
            null,
            municipalToken,
          )
        ).status,
        404,
      );
    },
  );
  await check(
    "Declaração municipal tem seis etapas, ano, desconhecido/zero e separação editor/revisor",
    async () => {
      const r = await api(
        "/environmental/units",
        "POST",
        { ...unitData, name: "Prefeitura QA", shareWithMunicipality: false },
        municipalToken,
      );
      assert.equal(r.status, 201, JSON.stringify(r.body));
      municipalUnit = r.body.data;
      const payload = emptyPayload("MUNICIPAL_DECLARATION", municipalUnit);
      payload.diagnosis.coverage = "MUNICIPAL_CONSOLIDATED";
      payload.diagnosis.wasteRows = [
        {
          category: "Coleta seletiva",
          quantity: 0,
          unit: "TON",
          destination: "Triagem",
          source: "Fonte municipal QA",
        },
      ];
      payload.costs.source = "Custos ainda não disponíveis, revisão pendente";
      payload.areas.masterPlan = "YES";
      payload.areas.zoning = "NO";
      payload.liabilities.exists = "NO";
      const created = await api(
        "/environmental/documents",
        "POST",
        {
          unitId: municipalUnit.id,
          family: "MUNICIPAL_DECLARATION",
          title: "Preparação municipal 2025",
          referenceYear: 2025,
          sourceCollectionId: null,
          payload,
        },
        municipalToken,
      );
      assert.equal(created.status, 201, JSON.stringify(created.body));
      municipalDoc = created.body.data;
      const detail = (
        await api(
          "/environmental/documents/" + municipalDoc.id,
          "GET",
          null,
          municipalToken,
        )
      ).body.data;
      assert.equal(detail.payload.costs.cleaningCost, null);
      assert.equal(detail.payload.diagnosis.wasteRows[0].quantity, 0);
      let review = await api(
        "/environmental/documents/" + municipalDoc.id + "/transition",
        "POST",
        { version: detail.version, action: "REQUEST_REVIEW" },
        municipalToken,
      );
      assert.equal(review.status, 200, JSON.stringify(review.body));
      assert.equal(
        (
          await api(
            "/environmental/documents/" + municipalDoc.id + "/transition",
            "POST",
            { version: review.body.data.version, action: "APPROVE" },
            municipalToken,
          )
        ).status,
        403,
      );
      await api(
        "/environmental/municipal-access",
        "POST",
        {
          userId: f.viewerUser.id,
          municipalityCode: "2312908",
          permission: "REVIEWER",
          appointmentReference: "Revisão QA",
          active: true,
        },
        f.adminToken,
      );
      viewerToken = (
        await api("/auth/login", "POST", {
          email: f.viewerUser.email,
          password: f.password,
        })
      ).body.token;
      const approved = await api(
        "/environmental/documents/" + municipalDoc.id + "/transition",
        "POST",
        { version: review.body.data.version, action: "APPROVE" },
        viewerToken,
      );
      assert.equal(approved.status, 200);
      assert.equal(
        (
          await api(
            "/environmental/documents/" + municipalDoc.id,
            "GET",
            null,
            f.token,
          )
        ).status,
        404,
      );
      const bad = emptyPayload("MUNICIPAL_DECLARATION");
      bad.diagnosis.coverage = "MUNICIPAL_CONSOLIDATED";
      assert.equal(
        (
          await api("/environmental/documents", "POST", {
            unitId: unit.id,
            family: "MUNICIPAL_DECLARATION",
            title: "Abrangência indevida",
            referenceYear: 2025,
            sourceCollectionId: null,
            payload: bad,
          })
        ).status,
        400,
      );
    },
  );
  await check(
    "Paginação inclui mais de 20 documentos sem mistura de tipos ou organizações",
    async () => {
      for (let i = 0; i < 21; i++)
        assert.equal(
          (
            await api("/environmental/documents", "POST", {
              unitId: unit.id,
              family: "CDF",
              title: "CDF de preparação " + i,
              referenceYear: null,
              sourceCollectionId: null,
              payload: emptyPayload("CDF"),
            })
          ).status,
          201,
        );
      const first = (
        await api(
          `/environmental/documents?unitId=${unit.id}&family=CDF&page=1`,
        )
      ).body.data;
      const second = (
        await api(
          `/environmental/documents?unitId=${unit.id}&family=CDF&page=2`,
        )
      ).body.data;
      assert.equal(first.total, 21);
      assert.equal(first.items.length, 20);
      assert.equal(second.items.length, 1);
      assert.equal(
        new Set([...first.items, ...second.items].map((d) => d.id)).size,
        21,
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
  const context = await contextFor(f.token, f.owner),
    page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.setDefaultNavigationTimeout(45000);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await check(
    "Interface real prepara e persiste rascunho sem redirecionamento ou emissão fictícia",
    async () => {
      await page.goto(
        "http://127.0.0.1:5179/mtr-online?municipality=2312908&unit=" +
          unit.id +
          "&tab=documents",
        { waitUntil: "domcontentloaded" },
      );
      await page
        .getByRole("button", { name: "Novo rascunho", exact: true })
        .click();
      await page
        .getByLabel("Título do documento", { exact: true })
        .fill("Rascunho salvo pelo painel");
      await page
        .getByRole("button", { name: "Salvar rascunho", exact: true })
        .click();
      await page
        .getByText(
          "Rascunho salvo no KATUÁ. Nenhum documento oficial foi emitido.",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Emitir documento via API" })
          .isDisabled(),
        true,
      );
      const docs = (
        await api(
          `/environmental/documents?unitId=${unit.id}&family=MTR_REGULAR`,
        )
      ).body.data;
      assert.ok(
        docs.items.some((d) => d.title === "Rascunho salvo pelo painel"),
      );
      await page
        .getByRole("button", { name: "Voltar à lista", exact: true })
        .click();
      await page
        .getByText("Rascunho salvo pelo painel", { exact: true })
        .waitFor();
      await page.screenshot({
        path: join(outputDir, "central-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Gestor municipal vê apenas central autorizada; seis etapas legíveis no celular",
    async () => {
      const c = await contextFor(
        municipalToken,
        { ...f.municipalUser, role: "MUNICIPAL_MANAGER" },
        { width: 430, height: 1000 },
      );
      const p = await c.newPage();
      p.setDefaultNavigationTimeout(45000);
      await p.goto("http://127.0.0.1:5179/vehicle-list");
      await p.waitForURL(/mtr-online/);
      await p
        .getByRole("button", { name: "SINIR Municípios", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Abrir documento", exact: true })
        .click();
      await p
        .getByRole("button", {
          name: "Soluções compartilhadas e custos",
          exact: true,
        })
        .click();
      await p
        .getByLabel("Custo de limpeza urbana (R$)", { exact: true })
        .waitFor();
      assert.equal(
        await p
          .getByLabel("Custo de limpeza urbana (R$)", { exact: true })
          .inputValue(),
        "",
      );
      assert.equal(
        await p
          .getByLabel("Custo de limpeza urbana (R$)", { exact: true })
          .isDisabled(),
        true,
      );
      await p.getByRole("button", { name: "Diagnóstico", exact: true }).click();
      assert.equal(
        await p
          .getByLabel("Categoria 1 — Quantidade no ano", { exact: true })
          .inputValue(),
        "0",
      );
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await p.screenshot({
        path: join(outputDir, "municipal-mobile.png"),
        fullPage: true,
      });
      await c.close();
    },
  );
  await check(
    "Offline não apresenta lista antiga; recuperação e ausência de erro JavaScript",
    async () => {
      await page.goto(
        "http://127.0.0.1:5179/mtr-online?municipality=2312908&unit=" +
          unit.id +
          "&tab=documents",
        { waitUntil: "domcontentloaded" },
      );
      await page
        .getByText("Rascunho salvo pelo painel", { exact: true })
        .waitFor();
      await context.setOffline(true);
      await page
        .getByLabel("Filtrar situação interna", { exact: true })
        .selectOption("IN_REVIEW");
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page
          .getByText("Rascunho salvo pelo painel", { exact: true })
          .count(),
        0,
      );
      await context.setOffline(false);
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page
        .getByText("Nenhum documento encontrado para este filtro.", {
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
          "API real Fastify/Prisma + migração incremental sobre baseline PEVs + PGlite + Chromium; sem comunicação com SINIR",
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
