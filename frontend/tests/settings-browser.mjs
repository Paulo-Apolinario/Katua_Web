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
      "katua-settings-",
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
  let schema = await readFile(join(serverDir, "prisma/schema.prisma"), "utf8");
  for (const model of [
    "CooperativeSettings",
    "SettingEvent",
    "SystemAlert",
    "MailDelivery",
  ])
    schema = schema.replace(
      new RegExp("model " + model + "\\s*\\{[^}]*\\}"),
      "",
    );
  schema = schema
    .replace(
      /^\s*(systemSettings|settingEvents|systemAlerts|mailDeliveries)\s+[^\n]*$/gm,
      "",
    )
    .replace(/^\s*authVersion\s+[^\n]*$/gm, "")
    .replace(/^\s*attempts\s+Int[^\n]*$/gm, "");
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
          "prisma/migrations/20261021160000_cooperative_settings/migration.sql",
        ),
        "utf8",
      )) +
      "COMMIT;",
  );
  await child(
    ["--import", "tsx", "tests/settings/local-server.ts"],
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

  const getContext = async (token = f.token) => {
    const r = await api("/settings/context", "GET", undefined, token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.data;
  };
  let c, smtp, alertId;
  await check(
    "Migração aditiva, escopo por cooperativa e perfis autorizados",
    async () => {
      c = await getContext();
      assert.equal(c.version, 0);
      assert.equal(c.encryptionReady, true);
      assert.equal(c.centralEmailReady, true);
      assert.equal(
        (await api("/settings/context", "GET", undefined, f.driverToken))
          .status,
        403,
      );
      const other = await getContext(f.otherToken);
      assert.notEqual(other.company.name, c.company.name);
      assert(!JSON.stringify(c).includes("passwordHash"));
    },
  );
  await check(
    "Dados institucionais persistem com versão e validação",
    async () => {
      const payload = {
        ...c.company,
        name: "Cooperativa QA Profissional",
        legalName: "Cooperativa QA de Reciclagem",
        registrationNumber: "11222333000181",
        phone: "85999999999",
        email: "contato@example.invalid",
        street: "Rua QA",
        city: "Sobral",
        state: "CE",
        latitude: -3.68,
        longitude: -40.35,
        version: c.version,
      };
      let r = await api("/settings/company", "PUT", payload);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(
        (await api("/settings/company", "PUT", payload)).status,
        409,
      );
      c = await getContext();
      assert.equal(c.company.name, payload.name);
      assert.equal(c.company.legalName, payload.legalName);
      assert.equal(
        (
          await api("/settings/company", "PUT", {
            ...payload,
            version: c.version,
            registrationNumber: "00000000000000",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await api("/settings/company", "PUT", {
            ...payload,
            version: c.version,
            logo: "data:image/png;base64,aGVsbG8=",
          })
        ).status,
        400,
      );
    },
  );
  await check(
    "SMTP criptografado, segredo não retornado e credencial preservada ao editar",
    async () => {
      smtp = {
        version: c.version,
        enabled: true,
        host: "smtp.example.invalid",
        port: 587,
        security: "STARTTLS",
        username: "qa",
        password: "private-test-credential",
        fromName: "Cooperativa QA",
        fromAddress: "envio@example.invalid",
        replyTo: "respostas@example.invalid",
      };
      let r = await api("/settings/smtp", "PUT", smtp);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      c = await getContext();
      assert.equal(c.smtp.hasPassword, true);
      assert(!JSON.stringify(c).includes(smtp.password));
      const raw = (await api("/__validation/storage")).body;
      assert(raw.storedPassword && !raw.storedPassword.includes(smtp.password));
      const { hasPassword, ...saved } = c.smtp;
      void hasPassword;
      r = await api("/settings/smtp", "PUT", {
        ...saved,
        password: "",
        version: c.version,
      });
      assert.equal(r.status, 200);
      c = await getContext();
      assert.equal(c.smtp.hasPassword, true);
      assert.equal(
        (
          await api("/settings/smtp", "PUT", {
            ...smtp,
            version: c.version,
            port: 465,
            security: "STARTTLS",
          })
        ).status,
        400,
      );
    },
  );
  await check(
    "Conexão, envio real simulado e bloqueio de destino SMTP privado",
    async () => {
      assert.equal((await api("/settings/smtp/verify", "POST")).status, 200);
      assert.equal((await api("/settings/smtp/test", "POST")).status, 200);
      let r = await api("/settings/smtp", "PUT", {
        ...smtp,
        password: "",
        host: "localhost",
        version: c.version,
      });
      assert.equal(r.status, 200);
      assert.equal((await api("/settings/smtp/verify", "POST")).status, 400);
      c = await getContext();
      assert.equal(
        (
          await api("/settings/smtp", "PUT", {
            ...smtp,
            password: "",
            version: c.version,
          })
        ).status,
        200,
      );
      c = await getContext();
      const history = (await api("/settings/mail-history")).body.data;
      assert.equal(history[0].status, "SENT");
      assert.deepEqual(history[0].recipients, [f.owner.email]);
    },
  );
  await check("Preferências, fila e resumo diário sem duplicação", async () => {
    const p = {
      ...c.preferences,
      emailEnabled: true,
      frequency: "DAILY",
      digestHour: 0,
      recipients: ["gestao@example.invalid"],
      version: c.version,
    };
    assert.equal(
      (await api("/settings/preferences", "PUT", { ...p, closeAt: "07:00" }))
        .status,
      400,
    );
    assert.equal((await api("/settings/preferences", "PUT", p)).status, 200);
    assert.equal((await api("/__validation/tick", "POST")).status, 200);
    const before = (await api("/settings/mail-history")).body.data;
    assert(
      before.some(
        (m) => m.subject.includes("resumo diário") && m.status === "SENT",
      ),
    );
    await api("/__validation/tick", "POST");
    const after = (await api("/settings/mail-history")).body.data;
    assert.equal(after.length, before.length);
    c = await getContext();
  });
  await check(
    "Alertas reais, leitura, responsável, adiamento, isolamento e resolução pela origem",
    async () => {
      let r = await api("/settings/alerts");
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const rows = r.body.data.rows;
      assert(rows.some((a) => a.category === "DOCUMENT"));
      assert(rows.some((a) => a.category === "COLLECTION"));
      const pev = rows.find((a) => a.category === "PEV");
      assert(pev);
      alertId = pev.id;
      assert.equal(
        (
          await api(
            "/settings/alerts/" + alertId,
            "PATCH",
            { action: "READ" },
            f.otherToken,
          )
        ).status,
        404,
      );
      for (const b of [
        { action: "READ" },
        { action: "ASSIGN", assignee: "Coordenação QA" },
        { action: "SNOOZE", hours: 24 },
      ])
        assert.equal(
          (await api("/settings/alerts/" + alertId, "PATCH", b)).status,
          200,
        );
      r = await api("/settings/alerts");
      const a = r.body.data.rows.find((a) => a.id === alertId);
      assert.equal(a.status, "OPEN");
      assert(a.readAt && a.snoozedUntil);
      assert.equal(a.assignee, "Coordenação QA");
      await api("/__validation/resolve", "POST");
      r = await api("/settings/alerts");
      assert.equal(
        r.body.data.rows.find((a) => a.id === alertId).status,
        "RESOLVED",
      );
    },
  );
  await check(
    "Falha de SMTP registrada, nova tentativa explícita e sem segredo no histórico",
    async () => {
      c = await getContext();
      assert.equal(
        (
          await api("/settings/preferences", "PUT", {
            ...c.preferences,
            version: c.version,
            frequency: "IMMEDIATE",
          })
        ).status,
        200,
      );
      await api("/__validation/mail-mode", "POST", { mode: "FAIL" });
      await api("/__validation/tick", "POST");
      const h = (await api("/settings/mail-history")).body.data;
      const failed = h.find((a) => a.status === "FAILED");
      await api("/__validation/mail-mode", "POST", { mode: "OK" });
      assert(failed);
      assert.equal(
        (await api("/settings/mail-history/" + failed.id + "/retry", "POST"))
          .status,
        200,
      );
      await api("/__validation/tick", "POST");
      assert.equal(
        (await api("/settings/mail-history")).body.data.find(
          (a) => a.id === failed.id,
        ).status,
        "SENT",
      );
      const audit = (await api("/settings/history")).body.data;
      assert(audit.total > 5);
      assert(!JSON.stringify(audit).includes(smtp.password));
      assert(!JSON.stringify(audit).includes("central-test-only"));
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
      displayName: "QA Configurações",
    }),
    page = await context.newPage(),
    pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const screens = [
    ["settings", "Identificação e contato"],
    ["account-security", "Definir ou trocar minha senha"],
    ["smtp-config", "Servidor de envio da cooperativa"],
    ["system-alerts", "Acompanhe o que precisa de ação"],
    ["operational-preferences", "Funcionamento e critérios de aviso"],
    ["settings-history", "Rastreabilidade das configurações"],
  ];
  await check(
    "Seis telas reais no desktop e nova senha sem campo de senha antiga",
    async () => {
      for (const [path, heading] of screens) {
        await page.goto("http://127.0.0.1:5179/" + path);
        await page
          .getByRole("heading", { name: heading, exact: true })
          .waitFor();
        await page.screenshot({
          path: join(outputDir, path + ".png"),
          fullPage: true,
        });
      }
      assert.deepEqual(pageErrors, []);
      await page.goto("http://127.0.0.1:5179/account-security");
      await page
        .getByRole("button", {
          name: "Enviar código ao meu e-mail",
          exact: true,
        })
        .click();
      await page
        .getByLabel("Código recebido por e-mail", { exact: false })
        .waitFor();
      assert.equal(
        await page.getByLabel("Senha atual", { exact: true }).count(),
        0,
      );
    },
  );
  await check(
    "Salvar cadastro pelo painel, recarregar e manter dados persistidos",
    async () => {
      await page.goto("http://127.0.0.1:5179/settings");
      await page.getByLabel("Razão social", { exact: false }).waitFor();
      await page
        .getByLabel("Razão social", { exact: false })
        .fill("Razão social salva pelo painel");
      await page
        .getByRole("button", { name: "Salvar alterações", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Alterações salvas." })
        .waitFor();
      await page.reload();
      await page.getByLabel("Razão social", { exact: false }).waitFor();
      assert.equal(
        await page.getByLabel("Razão social", { exact: false }).inputValue(),
        "Razão social salva pelo painel",
      );
    },
  );
  await check(
    "Seis telas no celular sem transbordamento horizontal",
    async () => {
      const m = await contextFor(
        f.token,
        { id: f.owner.id, role: "COOPERATIVE", displayName: "QA" },
        { width: 390, height: 844 },
      );
      const p = await m.newPage();
      for (const [path, heading] of screens) {
        await p.goto("http://127.0.0.1:5179/" + path);
        await p.getByRole("heading", { name: heading, exact: true }).waitFor();
        assert(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          path,
        );
      }
      await p.screenshot({
        path: join(outputDir, "mobile.png"),
        fullPage: true,
      });
      await m.close();
    },
  );
  await check(
    "Falha de carregamento limpa dados e oferece recuperação",
    async () => {
      await context.route("**/settings/context", (r) =>
        r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha simulada" }),
        }),
      );
      await page.goto("http://127.0.0.1:5179/settings");
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page.getByLabel("Razão social", { exact: false }).count(),
        0,
      );
      await context.unroute("**/settings/context");
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Identificação e contato", exact: true })
        .waitFor();
      assert.deepEqual(pageErrors, []);
    },
  );
  await check(
    "Fila imediata processa pendências além do primeiro lote sem repetir os já enviados",
    async () => {
      await api("/__validation/bulk-documents", "POST");
      const before = (await api("/settings/mail-history")).body.data.filter(
        (x) => x.subject.includes("Documento vencido") && x.status === "SENT",
      ).length;
      await api("/__validation/tick", "POST");
      await api("/__validation/tick", "POST");
      const after = (await api("/settings/mail-history")).body.data.filter(
        (x) => x.subject.includes("Documento vencido") && x.status === "SENT",
      ).length;
      assert.equal(after - before, 25);
    },
  );
  await check(
    "Senha por código: cinco tentativas, uso único, sem senha antiga e sessões revogadas",
    async () => {
      const mailbox = () =>
        readFile(join(outputDir, "mailbox.json"), "utf8").then(JSON.parse);
      let req = await api("/settings/password/request", "POST");
      assert.equal(req.status, 200, JSON.stringify(req.body));
      const challenge = req.body.data.challengeId;
      let messages = await mailbox();
      let code = messages.at(-1).text.match(/\b\d{6}\b/)[0];
      for (let i = 0; i < 5; i++)
        assert.equal(
          (
            await api("/settings/password/confirm", "POST", {
              challengeId: challenge,
              code: "000000",
              newPassword: "Senha QA nova 2026!",
            })
          ).status,
          400,
        );
      assert.equal(
        (
          await api("/settings/password/confirm", "POST", {
            challengeId: challenge,
            code,
            newPassword: "Senha QA nova 2026!",
          })
        ).status,
        400,
      );
      req = await api("/settings/password/request", "POST");
      assert.equal(req.status, 200);
      messages = await mailbox();
      code = messages.at(-1).text.match(/\b\d{6}\b/)[0];
      assert.equal(messages.at(-1).transportUser, "central");
      const confirm = {
        challengeId: req.body.data.challengeId,
        code,
        newPassword: "Senha QA nova 2026!",
      };
      assert.equal(
        (await api("/settings/password/confirm", "POST", confirm, f.otherToken))
          .status,
        400,
      );
      assert.equal(
        (await api("/settings/password/confirm", "POST", confirm)).status,
        200,
      );
      assert.equal((await api("/settings/context")).status, 401);
      const login = await api("/auth/login", "POST", {
        email: f.owner.email,
        password: confirm.newPassword,
      });
      assert.equal(login.status, 200, JSON.stringify(login.body));
      f.token = login.body.token;
      assert.equal((await api("/settings/context")).status, 200);
      assert.equal(
        (await api("/settings/password/confirm", "POST", confirm)).status,
        400,
      );
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
          "API real Fastify/Prisma + migração incremental sobre baseline anterior aos relatórios + PGlite + Chromium; SMTP/DNS simulados, sem e-mails externos ou comunicação com SINIR",
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
