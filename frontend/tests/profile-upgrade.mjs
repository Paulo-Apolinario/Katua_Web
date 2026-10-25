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
      "katua-profile-upgrade-",
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
  ).replace(/^.*avatarFile\s+String\?.*$/gm, "");
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
        "prisma/migrations/20261023210000_profile_avatar/migration.sql",
      ),
      "utf8",
    ),
  );
  await check(
    "Migração adiciona foto opcional sem alterar os demais dados",
    async () =>
      assert(
        (
          await db.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name='avatarFile'`,
          )
        ).rows.length === 1,
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
      PROFILE_STORAGE_DIR: join(outputDir, "avatars"),
    },
    /LOCAL_API_READY/,
  );
  const f = JSON.parse(await readFile(join(outputDir, "fixture.json"), "utf8"));
  const base = "http://127.0.0.1:3339";
  async function api(url, method = "GET", body, token = f.token) {
    const r = await fetch(base + url, {
      method,
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
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
  const expect = (result, status) => {
    assert.equal(result.status, status, JSON.stringify(result.body));
    return result.body;
  };
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6m1MAAAAASUVORK5CYII=",
    "base64",
  );
  function upload(name = "Paulo Apolinario", bytes = png, type = "image/png") {
    const form = new FormData();
    form.append("profileImage", new Blob([bytes], { type }), "foto.png");
    form.append("displayName", name);
    return form;
  }
  await check("Nome por JSON permanece compatível com o app", async () => {
    const user = expect(
      await api("/auth/profile", "PATCH", {
        displayName: "Nome pelo aplicativo",
      }),
      200,
    ).user;
    assert.equal(user.displayName, "Nome pelo aplicativo");
    assert.equal(user.cooperative.name, f.coop.name);
  });
  let updated;
  await check(
    "Nome preenchido e imagem multipart são aceitos juntos",
    async () => {
      updated = expect(await api("/auth/profile", "PATCH", upload()), 200).user;
      assert.equal(updated.displayName, "Paulo Apolinario");
      assert(updated.avatarUrl.startsWith("/auth/profile/avatar"));
      assert.equal(updated.email, f.owner.email);
      assert.equal(updated.cooperative.name, f.coop.name);
    },
  );
  await check(
    "Imagem privada exige autenticação e não expõe foto de outro usuário",
    async () => {
      const r = await fetch(base + updated.avatarUrl, {
        headers: { Authorization: "Bearer " + f.token },
      });
      assert.equal(r.status, 200);
      assert.equal(r.headers.get("content-type"), "image/png");
      assert.deepEqual(Buffer.from(await r.arrayBuffer()), png);
      assert.equal((await fetch(base + updated.avatarUrl)).status, 401);
      assert.equal(
        (
          await fetch(base + updated.avatarUrl, {
            headers: { Authorization: "Bearer " + f.otherToken },
          })
        ).status,
        404,
      );
    },
  );
  await check("Salvar só o nome mantém a foto e o e-mail", async () => {
    const form = new FormData();
    form.append("displayName", "Paulo Roberto Apolinario da Silva");
    updated = expect(await api("/auth/profile", "PATCH", form), 200).user;
    assert(updated.avatarUrl);
    assert.equal(updated.email, f.owner.email);
  });
  await check(
    "Arquivo incompatível é rejeitado sem gravar o nome ou apagar foto",
    async () => {
      expect(
        await api(
          "/auth/profile",
          "PATCH",
          upload("Nome indevido", Buffer.from("%PDF-1.4 teste"), "image/png"),
        ),
        400,
      );
      const now = expect(await api("/auth/me"), 200).user;
      assert.equal(now.displayName, "Paulo Roberto Apolinario da Silva");
      assert.equal(now.avatarUrl, updated.avatarUrl);
    },
  );
  await check("Arquivo maior que 3 MB é rejeitado", async () => {
    expect(
      await api(
        "/auth/profile",
        "PATCH",
        upload("Nome indevido", Buffer.alloc(3 * 1024 * 1024 + 1)),
      ),
      413,
    );
  });
  await check(
    "Substituição da imagem limpa a versão antiga após salvar",
    async () => {
      const previous = updated.avatarUrl;
      updated = expect(
        await api("/auth/profile", "PATCH", upload("Paulo Apolinario")),
        200,
      ).user;
      assert.notEqual(updated.avatarUrl, previous);
      const { readdir } = await import("node:fs/promises");
      assert.equal((await readdir(join(outputDir, "avatars"))).length, 1);
    },
  );
  await check(
    "Nome vazio é recusado e e-mail não é editável pelo perfil",
    async () => {
      expect(await api("/auth/profile", "PATCH", { displayName: " " }), 400);
      const user = expect(
        await api("/auth/profile", "PATCH", {
          displayName: "Paulo Apolinario",
          email: "outro@example.invalid",
        }),
        200,
      ).user;
      assert.equal(user.email, f.owner.email);
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
    { VITE_API_BASE_URL: base },
    /Local:/,
  );
  browser = await pw.launch({
    executablePath: process.env.KATUA_CHROMIUM_PATH,
    args: chromium.args.filter((a) => a !== "--single-process"),
    headless: true,
  });
  const context = await browser.newContext({
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
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await check(
    "Painel carrega nome e foto persistidos e salva nome sem falso erro",
    async () => {
      await page.goto("http://127.0.0.1:5179/profile-setup");
      await page.locator("#displayName").waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector("#displayName").value === "Paulo Apolinario",
      );
      await page
        .getByAltText("Imagem de perfil", { exact: true })
        .evaluate((img) => img.complete && img.naturalWidth > 0);
      await page
        .locator("#displayName")
        .fill("Paulo Roberto Apolinario da Silva");
      await page
        .getByRole("button", { name: "Salvar perfil", exact: true })
        .click();
      await page
        .getByText("Perfil atualizado com sucesso!", { exact: true })
        .waitFor();
      assert.equal(
        expect(await api("/auth/me"), 200).user.displayName,
        "Paulo Roberto Apolinario da Silva",
      );
      const stored = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("auth_user")),
      );
      assert.equal(stored.displayName, "Paulo Roberto Apolinario da Silva");
      await page
        .locator("header")
        .getByText("Paulo Roberto Apolinario da Silva", { exact: true })
        .waitFor();
    },
  );
  await check(
    "Painel envia nova imagem e atualiza cabeçalho imediatamente",
    async () => {
      await page
        .locator("#imageUpload")
        .setInputFiles({
          name: "nova-foto.png",
          mimeType: "image/png",
          buffer: png,
        });
      await page
        .getByRole("button", { name: "Salvar perfil", exact: true })
        .click();
      await page
        .getByText("Perfil atualizado com sucesso!", { exact: true })
        .waitFor();
      await page.waitForFunction(() => {
        const img = document.querySelector("header img");
        return (
          img?.src.startsWith("blob:") && img.complete && img.naturalWidth > 0
        );
      });
      await page.reload();
      await page.waitForFunction(
        () =>
          document.querySelector("#displayName")?.value ===
          "Paulo Roberto Apolinario da Silva",
      );
      await page.waitForFunction(() => {
        const img = document.querySelector("header img");
        return (
          img?.src.startsWith("blob:") && img.complete && img.naturalWidth > 0
        );
      });
      await page.screenshot({
        path: join(outputDir, "perfil-salvo.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Painel recusa arquivo inválido e permite cancelar a seleção",
    async () => {
      await page
        .locator("#imageUpload")
        .setInputFiles({
          name: "arquivo.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4"),
        });
      await page
        .getByText("Envie uma imagem nos formatos JPG, PNG ou WEBP.", {
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "Cancelar nova imagem", exact: true })
        .click();
      assert.equal(
        await page
          .getByText("Envie uma imagem nos formatos JPG, PNG ou WEBP.", {
            exact: true,
          })
          .count(),
        0,
      );
      assert.deepEqual(errors, []);
    },
  );
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
