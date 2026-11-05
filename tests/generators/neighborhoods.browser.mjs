import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const root = process.env.KATUA_PANEL_DIST,
  tools = process.env.KATUA_VALIDATION_TOOLS;
if (!root || !tools)
  throw Error("Informe o build local e as ferramentas de validação.");
const require = createRequire(path.join(tools, "package.json"));
const { chromium } = require("playwright");
const out = path.join(tools, "generator-neighborhood-evidence");
fs.mkdirSync(out, { recursive: true });
const user = {
  id: "neighborhood-qa",
  role: "COOPERATIVE",
  displayName: "Cooperativa QA",
  isActive: true,
  accountStatus: "ACTIVE",
};
const generators = [
  {
    id: "g1",
    name: "Responsável Norte QA",
    companyName: "Coop Norte QA",
    neighborhood: "São José",
    documentNumber: "11222333000181",
  },
  {
    id: "g2",
    name: "Responsável Sul QA",
    companyName: "Coop Sul QA",
    neighborhood: " sao jose ",
    documentNumber: "52998224725",
  },
  { id: "g3", name: "Ana QA", neighborhood: "Edson Queiroz", type: "LARGE" },
  { id: "g4", name: "Sem bairro QA", neighborhood: "" },
].map((g) => ({
  type: "SMALL",
  city: "Fortaleza",
  state: "CE",
  email: `${g.id}@qa.invalid`,
  accessStatus: "ACTIVE",
  accessReleased: true,
  createdAt: "2026-11-04T12:00:00Z",
  ...g,
}));
const collections = generators.map((g) => ({
  id: `collection-${g.id}`,
  generatorId: g.id,
  generator: g,
  status: "COLLECTED",
  collectedAt: "2026-11-04T12:00:00Z",
  materials: [],
  ...(g.id === "g1"
    ? { driverId: "d1", participants: [{ collectorId: "c1" }] }
    : {}),
}));
const results = [],
  errors = [],
  writes = [];
const server = http.createServer((req, res) => {
  const name = new URL(req.url, "http://local").pathname;
  let file = path.resolve(root, "." + name);
  if (
    !file.startsWith(path.resolve(root) + path.sep) ||
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
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
    }[path.extname(file)] || "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(5183, "127.0.0.1", resolve));
let browser, context, page;
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, status: "FAIL", error: String(e) });
    await page?.screenshot({
      path: path.join(out, `failure-${results.length}.png`),
      fullPage: true,
    });
    throw e;
  }
}
async function go(url) {
  await page.goto("http://127.0.0.1:5183" + url);
  await page.locator("main.page-content").waitFor();
}
const tableRows = () => page.locator("main table tbody tr");
async function selectOwner(name) {
  await page.getByRole("checkbox", { name, exact: true }).click();
  await page.waitForFunction(
    (name) =>
      Array.from(document.querySelectorAll('input[type="checkbox"]')).some(
        (e) => e.getAttribute("aria-label") === name && e.checked,
      ),
    name,
  );
}

try {
  browser = await chromium.launch({
    executablePath: process.env.KATUA_CHROMIUM_BIN || "/tmp/katua-pev-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
  });
  await context.addInitScript((user) => {
    localStorage.setItem("auth_token", "local-fixture-only");
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, user);
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (
      ["fetch", "xhr"].includes(req.resourceType()) ||
      req.method() === "OPTIONS"
    ) {
      if (!["GET", "OPTIONS"].includes(req.method()))
        writes.push(req.method() + " " + url.pathname);
      const body =
        url.pathname === "/auth/me"
          ? { user }
          : url.pathname === "/generators"
            ? { generators }
            : url.pathname === "/collections"
              ? { collections }
              : url.pathname === "/drivers"
                ? { drivers: [{ id: "d1", name: "Motorista QA" }] }
                : url.pathname === "/collectors"
                  ? { collectors: [{ id: "c1", name: "Catador QA" }] }
                  : url.pathname === "/notifications"
                    ? { notifications: [], unreadCount: 0 }
                    : {};
      return route.fulfill({
        status: req.method() === "OPTIONS" ? 204 : 200,
        headers: {
          "access-control-allow-origin": "http://127.0.0.1:5183",
          "access-control-allow-headers": "authorization,content-type",
          "access-control-allow-methods": "GET,OPTIONS",
          "content-type": "application/json",
        },
        body: req.method() === "OPTIONS" ? undefined : JSON.stringify(body),
      });
    }
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await test("Lista filtra bairro sem diferenciar acentos/maiúsculas e reúne sugestões cadastradas", async () => {
    await go("/generator-list");
    await page.getByText("Coop Norte QA", { exact: true }).waitFor();
    assert.equal(await tableRows().count(), 4);
    assert.equal(
      await page.locator("#generator-neighborhood-options option").count(),
      2,
    );
    await page
      .getByLabel("Bairro do gerador", { exact: true })
      .fill("SAO JOSE");
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 2,
    );
    assert(
      (await page.locator("main table").innerText()).includes("Coop Sul QA"),
    );
    assert(!(await page.locator("main table").innerText()).includes("Ana QA"));
  });
  await test("Bairro combina com classificação e limpar filtros restaura todos, inclusive sem bairro", async () => {
    await page
      .getByLabel("Classificação", { exact: true })
      .selectOption("REGISTERED_RESIDENTIAL");
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 1,
    );
    assert((await tableRows().innerText()).includes("Coop Sul QA"));
    await page
      .getByRole("button", { name: "Limpar filtros", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 4,
    );
    await page
      .getByRole("textbox", { name: "Buscar gerador...", exact: true })
      .fill("edson");
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 1,
    );
    assert((await tableRows().innerText()).includes("Ana QA"));
  });
  await test("Histórico apresenta cartões com localização e permite selecionar geradores individualmente", async () => {
    await go("/generator-history");
    await page
      .getByRole("checkbox", { name: "Selecionar Coop Norte QA", exact: true })
      .waitFor();
    assert.equal(await page.locator(".owner-history-option").count(), 4);
    assert(
      (
        await page.locator(".owner-history-option").first().innerText()
      ).includes("São José"),
    );
    await selectOwner("Selecionar Coop Norte QA");
    await selectOwner("Selecionar Ana QA");
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 2,
    );
    assert.equal(
      new URL(page.url()).searchParams.getAll("generatorId").length,
      2,
    );
  });
  await test("Bairro restringe o histórico e preserva selecionados fora dele com aviso explícito", async () => {
    await page.getByLabel("Bairro do gerador", { exact: true }).fill("sao");
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 1,
    );
    assert((await tableRows().innerText()).includes("collection-g1"));
    assert.equal(
      new URL(page.url()).searchParams.getAll("generatorId").length,
      2,
    );
    await page
      .getByText("selecionado(s) fora do bairro filtrado.", { exact: false })
      .waitFor();
    assert(
      (
        await page.locator(".owner-history-chip.is-outside").innerText()
      ).includes("Ana QA"),
    );
    await page.reload();
    await page
      .getByRole("checkbox", { name: "Selecionar Coop Norte QA", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Bairro do gerador", { exact: true }).inputValue(),
      "sao",
    );
    assert.equal(await tableRows().count(), 1);
  });
  await test("Selecionar resultados adiciona somente resultados visíveis sem perder a seleção anterior", async () => {
    await page
      .getByRole("button", { name: "Selecionar resultados", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 2,
    );
    assert.deepEqual(
      new Set(new URL(page.url()).searchParams.getAll("generatorId")),
      new Set(["g1", "g2", "g3"]),
    );
    await page.getByLabel("Pesquisar geradores", { exact: true }).fill("Norte");
    assert.equal(await page.locator(".owner-history-option").count(), 1);
    assert.equal(
      await tableRows().count(),
      2,
      "Pesquisa do seletor não deve remover cadastros já selecionados do mesmo bairro",
    );
  });
  await test("Bairro inexistente mostra estado vazio e limpar pesquisa/bairro restaura o histórico selecionado", async () => {
    await page
      .getByLabel("Bairro do gerador", { exact: true })
      .fill("inexistente");
    await page
      .getByText("Nenhum cadastro selecionado pertence ao bairro filtrado.", {
        exact: false,
      })
      .waitFor();
    assert.equal(await page.locator(".owner-history-option").count(), 0);
    await page
      .getByRole("button", { name: "Limpar pesquisa e bairro", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 3,
    );
    assert.equal(await page.locator(".owner-history-option").count(), 4);
    await page
      .getByRole("button", { name: "Remover Ana QA da seleção", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll("main tbody tr").length === 2,
    );
    await page.screenshot({
      path: path.join(out, "desktop.png"),
      fullPage: false,
    });
  });
  await test("Limpar seleção preserva o bairro e não exibe histórico sem cadastro selecionado", async () => {
    await page.getByLabel("Bairro do gerador", { exact: true }).fill("sao");
    await page
      .getByRole("button", { name: "Limpar seleção", exact: true })
      .click();
    assert.equal(new URL(page.url()).searchParams.get("bairro"), "sao");
    assert.equal(
      new URL(page.url()).searchParams.getAll("generatorId").length,
      0,
    );
    await page
      .getByText("Selecione um cadastro para consultar o histórico.", {
        exact: true,
      })
      .waitFor();
  });
  await test("Históricos compartilhados de motorista e catador preservam vínculos e participantes", async () => {
    await go("/driver-history?driverId=d1");
    await page
      .getByRole("checkbox", { name: "Selecionar Motorista QA", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Bairro do gerador", { exact: true }).count(),
      0,
    );
    assert.equal(await tableRows().count(), 1);
    await go("/collector-history?collectorId=c1");
    await page
      .getByRole("checkbox", { name: "Selecionar Catador QA", exact: true })
      .waitFor();
    assert.equal(await tableRows().count(), 1);
    assert((await tableRows().innerText()).includes("collection-g1"));
  });
  await test("Seletor e filtro se adaptam ao celular sem transbordar a página", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go("/generator-history?bairro=SAO");
    await page
      .getByRole("checkbox", { name: "Selecionar Coop Norte QA", exact: true })
      .waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    await page
      .getByRole("button", { name: "Selecionar resultados", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('input[aria-label="Selecionar Coop Norte QA"]')
          ?.checked,
    );
    assert.equal(
      new URL(page.url()).searchParams.getAll("generatorId").length,
      2,
    );
    await page.screenshot({
      path: path.join(out, "mobile.png"),
      fullPage: false,
    });
  });
  await test("Filtros e seleção não modificam cadastros nem geram erros JavaScript", () => {
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  });
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        date: "2026-11-04",
        environment:
          "Chromium + build Vite real + respostas de API simuladas locais; sem acesso à produção",
        passed: results.filter((r) => r.status === "PASS").length,
        failed: results.filter((r) => r.status === "FAIL").length,
        results,
        errors,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
