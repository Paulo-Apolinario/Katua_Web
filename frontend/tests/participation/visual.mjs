// Run against a local build, using the fixture emitted by the disposable API test.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const tools = process.env.KATUA_VALIDATION_TOOLS;
if (!tools || !process.env.KATUA_ANALYTICS_FIXTURE)
  throw Error("Informe as ferramentas locais e a fixture do teste de API.");
const require = createRequire(path.join(tools, "package.json"));
const { chromium } = require("playwright");
const chromiumModule = require("@sparticuz/chromium");
const packaged = chromiumModule.default || chromiumModule;
const root = path.resolve("dist");
const fixture = JSON.parse(
  fs.readFileSync(process.env.KATUA_ANALYTICS_FIXTURE, "utf8"),
);
const out = path.join(tools, "participation-evidence");
fs.mkdirSync(out, { recursive: true });
const user = {
  id: "a",
  role: "COOPERATIVE",
  displayName: "Cooperativa de teste",
  isActive: true,
  accountStatus: "ACTIVE",
};
let mode = "normal";
const queries = [],
  errors = [],
  mutations = [];
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://local").pathname;
  let file = path.resolve(root, "." + pathname);
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
await new Promise((resolve) => server.listen(5187, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.KATUA_CHROMIUM_BIN || (await packaged.executablePath()),
    args: packaged.args,
    headless: true,
  });
  const context = await browser.newContext({
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
      !["fetch", "xhr"].includes(req.resourceType()) &&
      req.method() !== "OPTIONS"
    )
      return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
    if (!["GET", "OPTIONS"].includes(req.method()))
      mutations.push(req.method() + " " + url.pathname);
    let body = {};
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,OPTIONS",
      "content-type": "application/json",
    };
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname === "/auth/me") body = { user };
    if (url.pathname.includes("/analytics/participation/")) {
      queries.push(url);
      if (url.pathname.endsWith("/context")) body = { data: fixture.context };
      else if (url.pathname.endsWith("/attendance")) {
        if (mode === "attendance-error")
          return route.fulfill({
            status: 500,
            headers,
            body: JSON.stringify({ error: "Falha de teste no atendimento." }),
          });
        body = {
          data:
            mode === "empty"
              ? {
                  ...fixture.attendance,
                  channels: fixture.attendance.channels.map((row) =>
                    Object.fromEntries(
                      Object.entries(row).map(([key, value]) => [
                        key,
                        typeof value === "number"
                          ? 0
                          : key === "statuses"
                            ? []
                            : key === "oldest_pending_at" ||
                                key === "median_hours"
                              ? null
                              : value,
                      ]),
                    ),
                  ),
                }
              : fixture.attendance,
        };
      } else if (url.pathname.includes("/participants/"))
        body = { data: fixture.detail };
      else if (url.pathname.endsWith("/participants"))
        body = {
          data: {
            ...fixture.participants,
            items: fixture.participants.items.filter((item) =>
              item.name.includes(url.searchParams.get("search") || ""),
            ),
          },
        };
      else if (mode === "error")
        return route.fulfill({
          status: 500,
          headers,
          body: JSON.stringify({ error: "Falha de teste na consulta." }),
        });
      else if (mode === "empty")
        body = {
          data: {
            ...fixture.overview,
            summary: Object.fromEntries(
              Object.keys(fixture.overview.summary).map((key) => [key, 0]),
            ),
            series: [],
            neighborhoods: [],
            coverage: [],
            coverageTotals: { received: 0, identified: 0 },
            participants: {
              items: [],
              page: 1,
              pageSize: 20,
              total: 0,
              totalPages: 0,
            },
          },
        };
      else body = { data: fixture.overview };
    }
    if (url.pathname.startsWith("/inbox"))
      body = { data: [], items: [], unreadCount: 0 };
    return route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5187/analytics/participation");
  await page
    .getByRole("heading", { name: "Participação e atendimento", exact: true })
    .waitFor();
  await page
    .getByRole("heading", { name: "Participantes ativos", exact: true })
    .waitFor();
  assert.equal(await page.locator(".pa-kpis article").count(), 5);
  await page
    .getByRole("heading", { name: "Ordens de coleta extra", exact: true })
    .waitFor();
  assert.equal(await page.locator(".pa-attendance-card").count(), 3);
  assert.equal(
    await page
      .locator(".pa-attendance-card")
      .nth(1)
      .locator(".pa-attendance-total")
      .textContent(),
    "5",
  );
  await page.locator(".pa-attendance-card").first().locator("summary").click();
  await page
    .locator(".pa-attendance-card")
    .first()
    .getByText("Tempo mediano: 24 hora(s), em 1 registro(s).", { exact: true })
    .waitFor();
  assert(
    queries
      .filter((url) => url.pathname.endsWith("/attendance"))
      .every((url) =>
        [...url.searchParams.keys()].every((key) =>
          ["start", "end"].includes(key),
        ),
      ),
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Abrir ordens extras", exact: true })
      .getAttribute("href"),
    "/extra-collection-orders",
  );
  assert.equal(
    await page
      .locator(".pa-kpis article")
      .first()
      .locator("strong")
      .textContent(),
    String(fixture.overview.summary.active),
  );
  const nav = page.getByRole("link", { name: "Analytics", exact: true });
  assert.match(
    await nav.evaluate(
      (el) => el.closest("li").previousElementSibling.textContent,
    ),
    /Configurações do Sistema/,
  );
  await page.getByLabel("De", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Até", { exact: true }).fill("2026-10-31");
  await page
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Participantes ativos", exact: true })
    .waitFor();
  assert(
    queries.some(
      (url) =>
        url.searchParams.get("start") === "2026-10-01" &&
        url.searchParams.get("end") === "2026-10-31",
    ),
  );
  await page
    .getByRole("button", { name: "Ver detalhes de old", exact: true })
    .click();
  await page.getByRole("heading", { name: "old", exact: true }).waitFor();
  assert.match(
    await page.locator(".pa-detail").textContent(),
    /Intervalo mediano: 30 dias/,
  );
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.screenshot({
    path: path.join(out, "desktop.png"),
    fullPage: true,
  });
  await page.getByLabel("Buscar nome na lista").fill("new");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".pa-table-wrap tbody tr").length === 1,
  );
  assert.equal(
    await page
      .locator(".pa-kpis article")
      .first()
      .locator("strong")
      .textContent(),
    "3",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, "mobile.png"), fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Página transborda no celular",
  );
  mode = "attendance-error";
  await page
    .getByRole("button", { name: "Atualizar dados", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Falha de teste no atendimento." })
    .waitFor();
  assert.equal(await page.locator(".pa-attendance-card").count(), 0);
  assert.equal(
    await page.locator(".pa-kpis article").count(),
    5,
    "Falha no atendimento não apaga os indicadores de participação",
  );
  mode = "normal";
  await page
    .getByRole("button", { name: "Tentar consultar atendimento", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Ordens de coleta extra", exact: true })
    .waitFor();
  mode = "error";
  await page
    .getByRole("button", { name: "Atualizar dados", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "Falha de teste" }).waitFor();
  assert.equal(
    await page.locator(".pa-kpis article").count(),
    0,
    "Erro não deve manter números anteriores",
  );
  mode = "empty";
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await page
    .getByText("Nenhum participante encontrado.", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator(".pa-kpis article")
      .first()
      .locator("strong")
      .textContent(),
    "0",
  );
  assert.deepEqual(errors, []);
  await page
    .getByRole("heading", { name: "Ordens de coleta extra", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".pa-attendance-total").nth(1).textContent(),
    "0",
  );
  assert.deepEqual(mutations, []);
  console.log(
    "PASS: navigation placement, actual API fixture rendering, applied filters, detail, list-only search, desktop/mobile, empty/error states and GET-only access",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
