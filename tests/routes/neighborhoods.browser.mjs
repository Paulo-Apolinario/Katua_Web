import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const root = process.env.KATUA_PANEL_DIST,
  tools = process.env.KATUA_VALIDATION_TOOLS;
if (!root || !tools)
  throw Error("Informe build local e ferramentas de validação.");
const { chromium } = createRequire(path.join(tools, "package.json"))(
  "playwright",
);
const out = path.join(tools, "route-neighborhood-evidence");
fs.mkdirSync(out, { recursive: true });
const base = {
  name: "Cooperativa QA",
  address: "Rua da Base, 10",
  latitude: -3.7,
  longitude: -38.5,
};
const user = {
  id: "qa",
  role: "COOPERATIVE",
  displayName: "QA",
  isActive: true,
  accountStatus: "ACTIVE",
  cooperative: base,
};
const gen = (id, extra = {}) => ({
  id,
  name: `Gerador ${id}`,
  companyName: `Gerador ${id}`,
  street: "Rua QA",
  number: "10",
  neighborhood: "São José",
  city: "Fortaleza",
  state: "CE",
  latitude: -3.71,
  longitude: -38.51,
  ...extra,
});
const generators = [
  gen("1"),
  gen("2", { neighborhood: "SAO JOSE" }),
  gen("3", { city: "Caucaia" }),
  gen("4", { latitude: null }),
  gen("5", { neighborhood: "Centro" }),
];
const sources = {
  base,
  generators,
  bins: [
    {
      id: "pev1",
      name: "PEV QA",
      street: "Rua PEV",
      number: "20",
      city: "Fortaleza",
      latitude: -3.72,
      longitude: -38.52,
    },
  ],
  collectors: [{ id: "c1", name: "Catador QA" }],
  teams: [],
};
const available = {
  id: "collection1",
  generatorId: "1",
  generator: generators[0],
  status: "PENDING",
  materials: [],
};
const writes = [],
  results = [],
  errors = [];
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    "." + new URL(req.url, "http://local").pathname,
  );
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
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
    }[path.extname(file)] || "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(5184, "127.0.0.1", r));
let browser, page;
async function test(name, fn) {
  await fn();
  results.push({ name, status: "PASS" });
  console.log("PASS", name);
}
async function go(url) {
  await page.goto("http://127.0.0.1:5184" + url);
  await page.locator("main.page-content").waitFor();
}
async function chooseBairro(city = "Fortaleza") {
  const select = page.getByLabel("Bairro dos geradores", { exact: true });
  await select.waitFor();
  const value = await select
    .locator("option")
    .evaluateAll(
      (opts, city) =>
        opts.find(
          (o) =>
            o.textContent.includes("São José") && o.textContent.includes(city),
        )?.value,
      city,
    );
  assert(value);
  await select.selectOption(value);
}
const editor = () => page.locator(".route-points-editor").last();
try {
  browser = await chromium.launch({
    executablePath: "/tmp/katua-pev-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
  });
  await context.addInitScript((user) => {
    localStorage.setItem("auth_token", "local-fixture");
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, user);
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (
      ["fetch", "xhr"].includes(req.resourceType()) ||
      req.method() === "OPTIONS"
    ) {
      if (req.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
            "access-control-allow-headers": "authorization,content-type",
          },
        });
      let body = {};
      if (req.method() !== "GET") {
        writes.push({
          path: url.pathname,
          method: req.method(),
          body: req.postDataJSON(),
        });
        body =
          url.pathname === "/route-plans"
            ? { plan: { id: "plan1" } }
            : { route: { id: "route1" } };
      } else if (url.pathname === "/auth/me") body = { user };
      else if (url.pathname === "/route-planning/sources") body = sources;
      else if (url.pathname === "/routes/available-collections")
        body = { collections: [available] };
      else if (url.pathname === "/routes") body = { routes: [] };
      else if (url.pathname === "/route-plans") body = { plans: [] };
      else if (url.pathname === "/drivers") body = { drivers: [] };
      else if (url.pathname === "/vehicles") body = { vehicles: [] };
      else if (url.pathname.includes("notifications"))
        body = { notifications: [], unreadCount: 0 };
      return route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await test("rota comum: bairro separa municípios e sinaliza cadastro sem GPS", async () => {
    await go("/create-route");
    await chooseBairro();
    await page
      .getByText(
        "2 para adicionar · 0 já na rota · 1 com cadastro incompleto",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Bairro dos geradores", { exact: true })
        .locator("option")
        .count(),
      4,
    );
  });
  await test("inclusão em lote, deduplicação e catadores acima da equipe", async () => {
    await page
      .getByRole("button", {
        name: "Adicionar geradores do bairro (2)",
        exact: true,
      })
      .click();
    await editor().locator(".route-stop-list li").nth(1).waitFor();
    assert.equal(await editor().locator(".route-stop-list li").count(), 2);
    assert(
      await page
        .getByRole("button", {
          name: "Adicionar geradores do bairro (0)",
          exact: true,
        })
        .isDisabled(),
    );
    const collector = await page
        .getByRole("checkbox", { name: "Catador QA", exact: true })
        .boundingBox(),
      team = await page.getByLabel("Equipe de trabalho conjunto").boundingBox();
    assert(collector.y < team.y);
    assert.equal(
      await page
        .getByText("Duração prevista (minutos)", { exact: true })
        .count(),
      0,
    );
    assert.equal(await page.locator(".route-endpoints").count(), 0);
    assert(
      await page
        .getByRole("button", { name: "Já incluído nos pontos", exact: true })
        .isDisabled(),
    );
    await page.screenshot({
      path: path.join(out, "normal-desktop.png"),
      fullPage: true,
    });
  });
  await test("rota comum: payload contém os geradores do bairro", async () => {
    await page
      .getByRole("checkbox", { name: "Catador QA", exact: true })
      .click();
    await page
      .getByLabel("Nome da rota", { exact: false })
      .fill("Rota bairro QA");
    await page.locator("input[type=date]").first().fill("2026-11-10");
    await page
      .getByRole("button", { name: /Salvar|Agendar/ })
      .last()
      .click();
    await page.waitForFunction(() => location.pathname === "/route-list");
    const saved = writes.find((x) => x.path === "/routes");
    assert(saved);
    assert.deepEqual(
      saved.body.plannedPoints.map((p) => p.sourceId),
      ["1", "2"],
    );
    assert.deepEqual(saved.body.collectorIds, ["c1"]);
  });
  await test("coleta selecionada impede novo ponto do mesmo gerador", async () => {
    await go("/create-route");
    await page
      .getByRole("button", { name: "Adicionar coleta", exact: true })
      .click();
    await chooseBairro();
    await page
      .getByText(
        "1 para adicionar · 1 já na rota · 1 com cadastro incompleto",
        { exact: true },
      )
      .waitFor();
  });
  await test("limpar filtros mantém bairro de inclusão independente", async () => {
    await page.getByPlaceholder("Nome, endereço ou código").fill("inexistente");
    await page
      .getByText("Nenhuma coleta disponível para estes filtros.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Limpar filtros", exact: true })
      .click();
    assert.equal(
      await page.getByPlaceholder("Nome, endereço ou código").inputValue(),
      "",
    );
  });
  await test("PEV individual continua permitindo confirmação e inclusão", async () => {
    await page.getByRole("button", { name: /PEV QA/ }).click();
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
    await editor().locator(".route-stop-list li").waitFor();
    assert(
      (await editor().locator(".route-stop-list").innerText()).includes(
        "PEV QA",
      ),
    );
  });
  await test("endereço avulso continua permitindo cadastro manual com localização", async () => {
    await page
      .getByRole("button", {
        name: "Adicionar ponto por endereço",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Nome do ponto ou responsável", { exact: true })
      .fill("Ponto avulso QA");
    await page.getByLabel("Rua", { exact: true }).fill("Rua da Testagem");
    await page.getByLabel("Número e complemento", { exact: true }).fill("100");
    await page
      .getByLabel("Município", { exact: true })
      .last()
      .fill("Fortaleza");
    await page.getByLabel("Latitude", { exact: true }).fill("-3.73");
    await page.getByLabel("Longitude", { exact: true }).fill("-38.53");
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
    await editor().locator(".route-stop-list li").nth(1).waitFor();
    assert(
      (await editor().locator(".route-stop-list").innerText()).includes(
        "Rua da Testagem, 100",
      ),
    );
  });
  await test("rota fixa: lote e salvamento do plano recorrente", async () => {
    await go("/route-plans");
    await page
      .getByRole("button", { name: "Nova rota fixa", exact: true })
      .click();
    await chooseBairro();
    await page
      .getByRole("button", {
        name: "Adicionar geradores do bairro (2)",
        exact: true,
      })
      .click();
    await editor().locator(".route-stop-list li").nth(1).waitFor();
    await page
      .getByRole("checkbox", { name: "Catador QA", exact: true })
      .click();
    await page.locator("input[required]").first().fill("Rota fixa bairro QA");
    assert.equal(await page.locator(".route-endpoints").count(), 0);
    await page
      .getByRole("button", { name: /Salvar/ })
      .last()
      .click();
    await page
      .getByText("Roteiro salvo. As próximas execuções foram programadas.", {
        exact: true,
      })
      .waitFor();
    const saved = writes.find((x) => x.path === "/route-plans");
    assert(saved);
    assert.deepEqual(
      saved.body.points.map((p) => p.sourceId),
      ["1", "2"],
    );
    assert(saved.body.startPoint);
    assert.equal(saved.body.estimatedMinutes, 240);
  });
  await test("rota por área também aceita inclusão por bairro", async () => {
    await page
      .getByRole("button", { name: "Nova rota fixa", exact: true })
      .click();
    await page
      .getByLabel("Forma de atendimento", { exact: true })
      .selectOption("AREA");
    await chooseBairro("Caucaia");
    await page
      .getByRole("button", {
        name: "Adicionar geradores do bairro (1)",
        exact: true,
      })
      .click();
    await editor().locator(".route-stop-list li").waitFor();
    assert(
      (await editor().locator(".route-stop-list").innerText()).includes(
        "Gerador 3",
      ),
    );
  });
  await test("celular: sem transbordamento do planejador", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByLabel("Bairro dos geradores", { exact: true })
      .scrollIntoViewIfNeeded();
    assert(
      await page
        .locator("main")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.screenshot({
      path: path.join(out, "area-mobile.png"),
      fullPage: true,
    });
  });
  assert.deepEqual(errors, []);
  console.log(`${results.length} testes de interface aprovados`);
} catch (e) {
  await page?.screenshot({
    path: path.join(out, "failure.png"),
    fullPage: true,
  });
  console.error(e);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify({ results, errors, writes }, null, 2),
  );
  await browser?.close();
  await new Promise((r) => server.close(r));
}
