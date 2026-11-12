// Local production build with synthetic records emitted by the disposable API test.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
const tools = process.env.KATUA_VALIDATION_TOOLS;
if (!tools || !process.env.KATUA_QUICK_FIXTURE)
  throw Error("Informe ferramentas e fixture locais.");
const require = createRequire(path.join(tools, "package.json"));
const { chromium } = require("playwright");
const m = require("@sparticuz/chromium"),
  packaged = m.default || m;
const root = path.resolve("dist");
const evidence = path.join(tools, "quick-registration-evidence");
fs.mkdirSync(evidence, { recursive: true });
const data = JSON.parse(
  fs.readFileSync(process.env.KATUA_QUICK_FIXTURE, "utf8"),
);
const user = {
  id: "a",
  role: "COOPERATIVE",
  displayName: "Cooperativa de teste",
  isActive: true,
  accountStatus: "ACTIVE",
};
const mutations = [],
  errors = [];
let failSave = false;
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    "." + new URL(req.url, "http://local").pathname,
  );
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    file = path.join(root, "index.html");
  res.setHeader(
    "content-type",
    {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
    }[path.extname(file)] || "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(5189, "127.0.0.1", resolve));
let browser;
const summarize = (kind, record) => {
  const doc = kind === "generators" ? "documentNumber" : "cpf";
  const missing = [
    !record[doc] && doc,
    !record.email && "email",
    !record.phone && "phone",
    !record.address && !(record.street && record.city) && "address",
  ].filter(Boolean);
  return {
    ...record,
    registrationStatus: missing.length ? "TO_COMPLETE" : "COMPLETE",
    missingRegistrationFields: missing,
    hasOnlineAccess: Boolean(record.userId),
  };
};
try {
  browser = await chromium.launch({
    executablePath: await packaged.executablePath(),
    args: packaged.args,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript((user) => {
    localStorage.setItem("auth_token", "quick-fixture-login");
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, user);
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (
      !["fetch", "xhr"].includes(request.resourceType()) &&
      method !== "OPTIONS"
    )
      return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
      "content-type": "application/json",
    };
    const send = (body, status = 200) =>
      route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname === "/auth/me") return send({ user });
    if (url.pathname === "/analytics/usage/heartbeat")
      return send({ data: { recorded: true } });
    const match = url.pathname.match(
      /^\/(generators|collectors)(?:\/([^/]+))?$/,
    );
    if (match) {
      const [, kind, id] = match,
        singular = kind === "generators" ? "generator" : "collector";
      if (method === "GET")
        return id
          ? send({ [singular]: data[kind].find((record) => record.id === id) })
          : send({ [kind]: data[kind] });
      const body = request.postDataJSON();
      mutations.push({ kind, method, body });
      if (failSave)
        return send(
          {
            error:
              "Falha temporária de teste. Confira a lista antes de repetir.",
          },
          503,
        );
      if (method === "POST") {
        const record = summarize(kind, {
          ...body,
          id: `quick-${kind}-${mutations.length}`,
          cooperativeId: "coop-a",
          email: body.email || null,
          userId: null,
          status: "AVAILABLE",
          totalKg: 0,
          accessStatus: "PENDING_ACTIVATION",
          accessReleased: false,
        });
        data[kind].unshift(record);
        return send({ success: true, [singular]: record }, 201);
      }
      if (method === "PATCH") {
        const i = data[kind].findIndex((record) => record.id === id);
        data[kind][i] = summarize(kind, { ...data[kind][i], ...body });
        return send({ success: true, [singular]: data[kind][i] });
      }
    }
    if (url.pathname === "/collections") return send({ collections: [] });
    if (url.pathname.startsWith("/inbox"))
      return send({ data: [], items: [], unreadCount: 0 });
    if (url.pathname.startsWith("/privacy/"))
      return send({ data: { status: "PENDING" } });
    return send({ data: [] });
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5189/generator-list");
  await page
    .getByRole("link", { name: "Cadastro rápido", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Cadastro rápido de gerador", exact: true })
    .waitFor();
  assert.equal(await page.locator('input[type="email"]').count(), 0);
  await page
    .getByLabel("Nome da pessoa ou estabelecimento")
    .fill("Mercadinho novo");
  await page.screenshot({
    path: path.join(evidence, "quick-generator-desktop.png"),
  });
  await page
    .getByRole("button", { name: "Salvar cadastro rápido", exact: true })
    .click();
  await page.waitForURL("**/generator-list");
  assert.deepEqual(Object.keys(mutations.at(-1).body).sort(), ["name", "type"]);
  const row = page.getByRole("row").filter({ hasText: "Mercadinho novo" });
  await row.getByText("Cadastro a completar", { exact: true }).waitFor();
  await row
    .getByRole("link", { name: "Completar cadastro", exact: true })
    .click();
  await page.locator('input[name="name"]').waitFor();
  await page.locator('input[name="email"]').fill("mercadinho@qa.invalid");
  await page.locator('input[name="documentNumber"]').fill("52998224725");
  await page.locator('input[name="phone"]').fill("85999992222");
  await page.locator('input[name="address"]').fill("Rua de teste, 10");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page.waitForURL("**/generator-list");
  await row.getByText("Dados básicos completos", { exact: true }).waitFor();
  await page.getByLabel("Mostrar somente cadastros a completar").check();
  assert.equal(await row.count(), 0);
  await page.goto("http://127.0.0.1:5189/collector-list");
  await page
    .getByRole("link", { name: "Cadastro rápido", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector("#katua-sidebar").getBoundingClientRect().right <= 1);
  await page.getByLabel("Nome do catador").fill("Catador do rodízio");
  await page.screenshot({
    path: path.join(evidence, "quick-collector-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  failSave = true;
  await page
    .getByRole("button", { name: "Salvar cadastro rápido", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Falha temporária" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Nome do catador").inputValue(),
    "Catador do rodízio",
  );
  failSave = false;
  await page
    .getByRole("button", { name: "Salvar cadastro rápido", exact: true })
    .click();
  await page.waitForURL("**/collector-list");
  assert.deepEqual(Object.keys(mutations.at(-1).body).sort(), [
    "email",
    "isAutonomous",
    "name",
    "status",
  ]); // service keeps its existing defaults, email is blank, never fabricated.
  assert.equal(mutations.at(-1).body.email, "");
  const catrow = page
    .getByRole("row")
    .filter({ hasText: "Catador do rodízio" });
  await catrow.getByText("Cadastro a completar", { exact: true }).waitFor();
  await catrow
    .getByRole("link", { name: "Completar cadastro", exact: true })
    .click();
  await page.locator('input[name="email"]').waitFor();
  assert.equal(
    await page.locator('input[name="email"]').getAttribute("required"),
    null,
  );
  await page.locator('input[name="email"]').fill("rodizio@qa.invalid");
  await page.locator('input[name="cpf"]').fill("11144477735");
  await page.locator('input[name="phone"]').fill("85999993333");
  await page.locator('[name="address"]').fill("Rua da triagem, 20");
  await page.getByRole("button", { name: /Salvar alterações/ }).click();
  await page.waitForURL("**/collector-list");
  await catrow.getByText("Dados básicos completos", { exact: true }).waitFor();
  await catrow.getByRole("link", { name: "Editar cadastro", exact: true }).click();
  await page.locator('input[name="name"]').fill("Catador atualizado");
  await page.getByRole("button", { name: /Salvar alterações/ }).click();
  await page.waitForURL("**/collector-list");
  assert.equal(Object.hasOwn(mutations.at(-1).body, "cpf"), false, "Editar outros campos não reenvia nem apaga o CPF existente");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: quick registration entry points, name-only forms, completeness and filters, completion on same record, save error preserves values, desktop/mobile layout, no fabricated email or automatic account activation",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
