import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const tools = process.env.KATUA_VALIDATION_TOOLS,
  root = process.env.KATUA_PANEL_DIST;
if (!tools || !root) throw Error("Informe build local e ferramentas.");
const { chromium } = createRequire(path.join(tools, "package.json"))(
  "playwright",
);
const out = path.join(tools, "receiving-workflow-evidence");
fs.mkdirSync(out, { recursive: true });
const user = {
  id: "coop",
  role: "COOPERATIVE",
  displayName: "Cooperativa QA",
  isActive: true,
  accountStatus: "ACTIVE",
};
const item = {
  id: "item",
  name: "Papelão QA",
  unit: "KG",
  defaultUnit: "KG",
  status: "ACTIVE",
  category: "Papel",
};
const initial = (extra = {}) => ({
  id: "collection",
  status: "COLLECTED",
  generator: { id: "gen", name: "Loja QA", address: "Rua QA, 100" },
  collector: { id: "collector", name: "Catador QA" },
  materials: [],
  notes: "",
  incidents: [],
  participants: [],
  quantityReviewVersion: 0,
  collectionMaterials: [
    {
      id: "material",
      nameSnapshot: item.name,
      unit: "KG",
      quantity: 0,
      reportedQuantity: null,
      wasteTypeId: item.id,
      wasteEntry: {
        id: "entry",
        materialNameSnapshot: item.name,
        unit: "KG",
        collectedQuantity: 0,
        destinedQuantity: 0,
        remainingQuantity: 0,
        destinations: [],
      },
    },
  ],
  ...extra,
});
let c = initial(),
  writes = [],
  errors = [],
  results = [],
  failDetails = false;
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
    }[path.extname(file)] || "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(5186, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.KATUA_CHROMIUM_PATH || "/tmp/katua-pev-browser",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
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
    !["fetch", "xhr"].includes(req.resourceType()) &&
    req.method() !== "OPTIONS"
  )
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  if (req.method() === "OPTIONS")
    return route.fulfill({
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      },
    });
  let body = {},
    status = 200;
  const e = () => c.collectionMaterials[0]?.wasteEntry;
  if (req.method() !== "GET") {
    const input = req.postDataJSON();
    writes.push({ path: url.pathname, input });
    if (url.pathname === "/material-intakes")
      c = initial({
        intakeKind: "DIRECT",
        status: "RECEIVED",
        collectionMaterials: [],
      });
    else if (
      url.pathname.endsWith("/receive") ||
      url.pathname.endsWith("/arrive")
    )
      c = { ...c, status: "RECEIVED", receivedAt: new Date().toISOString() };
    else if (url.pathname.endsWith("/review-quantities")) {
      assert.equal(input.reason, "");
      c = {
        ...c,
        quantityReviewVersion: 1,
        quantityReviews: [],
        collectionMaterials: c.collectionMaterials.map((m) => ({
          ...m,
          quantity: input.items[0].quantity,
          wasteEntry: {
            ...m.wasteEntry,
            collectedQuantity: input.items[0].quantity,
            remainingQuantity: input.items[0].quantity,
          },
        })),
      };
    } else if (url.pathname.endsWith("/weigh")) {
      c = {
        ...c,
        quantityReviewVersion: 1,
        collectionMaterials: [
          {
            id: "material",
            nameSnapshot: item.name,
            quantity: input.materials[0].quantity,
            unit: "KG",
            wasteTypeId: item.id,
            wasteEntry: {
              id: "entry",
              materialNameSnapshot: item.name,
              unit: "KG",
              collectedQuantity: input.materials[0].quantity,
              destinedQuantity: 0,
              remainingQuantity: input.materials[0].quantity,
              destinations: [],
            },
          },
        ],
      };
    } else if (url.pathname === "/collection-waste-destinations") {
      const destination = {
        id: "destination",
        type: input.type,
        status: "ACTIVE",
        quantity: input.quantity,
        stockLot: {
          id: "lot",
          status: "AVAILABLE",
          availableQuantity: input.quantity,
        },
        stockLotId: "lot",
      };
      e().destinedQuantity += input.quantity;
      e().remainingQuantity -= input.quantity;
      e().destinations.push(destination);
      body = { destination };
    } else if (url.pathname.endsWith("/complete"))
      c = { ...c, status: "COMPLETED" };
    if (!body.destination) body = { collection: c };
  } else if (url.pathname === "/auth/me") body = { user };
  else if (url.pathname === "/collections/collection") {
    if (failDetails) {
      status = 503;
      body = { error: "Indisponível para teste" };
      failDetails = false;
    } else body = { collection: c };
  } else if (url.pathname === "/waste-workspace/field-collections")
    body = {
      collections: [c],
      pagination: { page: 1, total: 1, limit: 10 },
      stats: { active: 0, awaitingReceipt: 1, units: [] },
    };
  else if (url.pathname === "/waste-workspace/field-options") body = {};
  else if (url.pathname === "/waste-workspace/catalog")
    body = { items: [item], pagination: { hasMore: false } };
  else if (url.pathname === "/waste-stock/items") body = { items: [item] };
  else if (url.pathname === "/material-intakes")
    body = { items: [], pagination: { page: 1, total: 0, totalPages: 1 } };
  else if (
    url.pathname.includes("notifications") ||
    url.pathname.includes("inbox")
  )
    body = { notifications: [], unreadCount: 0, items: [] };
  return route.fulfill({
    status,
    headers: { "access-control-allow-origin": "*" },
    contentType: "application/json",
    body: JSON.stringify(body),
  });
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const dialog = () =>
  page.getByRole("dialog", { name: "Coleta #LLECTION", exact: true });
async function go() {
  await page.goto("http://127.0.0.1:5186/waste-list?coleta=collection");
  await page.getByRole("region", { name: "Passos do recebimento" }).waitFor();
}
async function test(name, fn) {
  await fn();
  results.push({ name, status: "PASS" });
  console.log("PASS", name);
}
try {
  await test("recebimento apresenta apenas a etapa pertinente e bloqueia etapas futuras", async () => {
    await go();
    await page
      .getByRole("heading", {
        name: "Confirmar a chegada do material",
        exact: true,
      })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "2 Pesagem e conferência", exact: true })
        .isDisabled(),
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Concluir coleta", exact: true })
        .count(),
      0,
    );
  });
  await test("confirmar chegada avança para pesagem na mesma coleta e mantém endereço", async () => {
    await page
      .getByLabel("Conferi a chegada física e os materiais desta coleta.", {
        exact: true,
      })
      .check();
    await page
      .getByRole("button", { name: "Confirmar recebimento", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Separar, pesar e conferir", exact: true })
      .waitFor();
    assert.equal(writes[0].path, "/collections/collection/receive");
  });
  await test("peso não informado aparece vazio e não exige justificativa de divergência fictícia", async () => {
    await page.getByText("Não informado", { exact: true }).first().waitFor();
    const input = page.getByLabel("Quantidade recebida de Papelão QA", {
      exact: true,
    });
    assert.equal(await input.inputValue(), "");
    await input.fill("10");
    assert.equal(
      await page.locator("#quantity-review-reason").getAttribute("required"),
      null,
    );
    await page
      .getByRole("button", {
        name: "Salvar conferência de quantidade",
        exact: true,
      })
      .click();
    await page
      .getByRole("heading", { name: "Encaminhar os materiais", exact: true })
      .waitFor();
  });
  await test("encaminhamento abre no mesmo atendimento e Escape fecha só o formulário de destino", async () => {
    await page
      .getByRole("button", { name: "Encaminhar Papelão QA", exact: true })
      .click();
    await page
      .getByRole("dialog", {
        name: /Registrar Destinação|Nova destinação|Destinação/i,
      })
      .last()
      .waitFor();
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[role=dialog][aria-modal=true]").length ===
        1,
    );
    await page
      .getByRole("button", { name: "Encaminhar Papelão QA", exact: true })
      .waitFor();
  });
  await test("estoque em lote libera conclusão, sem redirecionar a outra tela", async () => {
    await page
      .getByRole("button", { name: "Encaminhar Papelão QA", exact: true })
      .click();
    await page.getByRole("radio", { name: /Adicionar ao estoque/ }).check();
    await page.locator("#destination-quantity").fill("10");
    await page.locator("#stock-item").selectOption("item");
    failDetails = true;
    await page
      .getByRole("button", { name: "Registrar destinação", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Atualizar atendimento", exact: true })
      .waitFor();
    assert.equal(
      writes.filter((w) => w.path === "/collection-waste-destinations").length,
      1,
    );
    await page
      .getByRole("button", { name: "Atualizar atendimento", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Concluir a coleta", exact: true })
      .waitFor();
    assert(page.url().includes("waste-list?coleta=collection"));
  });
  await test("conclusão mantém aviso e acesso ao material ainda em estoque", async () => {
    await page
      .getByLabel(
        "Confirmo a conclusão da coleta e conferi os encaminhamentos dos materiais.",
        { exact: true },
      )
      .check();
    await page
      .getByRole("button", { name: "Concluir coleta", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Coleta concluída", exact: true })
      .waitFor();
    assert(
      (await page.locator(".receiving-next").innerText()).includes(
        "continuam em acompanhamento",
      ),
    );
    await page
      .getByRole("link", { name: "Acompanhar lote de estoque", exact: true })
      .waitFor();
    assert.equal(writes.filter((w) => w.path.endsWith("/complete")).length, 1);
    await page.screenshot({
      path: path.join(out, "concluida-desktop.png"),
      fullPage: true,
    });
  });
  await test("entrega na porta segue para pesagem inicial com catálogo no mesmo fluxo", async () => {
    c = initial({
      intakeKind: "DIRECT",
      status: "RECEIVED",
      collectionMaterials: [],
    });
    await go();
    await page
      .getByLabel("Material da pesagem 1", { exact: true })
      .selectOption("item");
    await page
      .getByLabel("Quantidade da pesagem 1", { exact: true })
      .fill("12");
    await page
      .getByRole("button", { name: "Confirmar pesagem", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Encaminhar os materiais", exact: true })
      .waitFor();
    assert(writes.some((w) => w.path === "/material-intakes/collection/weigh"));
  });
  await test("coleta avulsa registra chegada pelo serviço próprio e avança sem perder referência", async () => {
    c = initial({
      intakeKind: "PICKUP",
      status: "PENDING",
      collectionMaterials: [],
    });
    await go();
    await page
      .getByLabel("Conferi a chegada física do material.", { exact: true })
      .check();
    await page
      .getByRole("button", {
        name: "Confirmar chegada à cooperativa",
        exact: true,
      })
      .click();
    await page
      .getByRole("heading", { name: "Separar, pesar e conferir", exact: true })
      .waitFor();
    assert(
      writes.some((w) => w.path === "/material-intakes/collection/arrive"),
    );
  });
  await test("entrada direta recém-criada abre o atendimento sem escolher outra tela", async () => {
    await page.goto("http://127.0.0.1:5186/material-intakes");
    await page
      .getByRole("button", {
        name: "Receber material na cooperativa",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Registrar entrada / coleta", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Separar, pesar e conferir", exact: true })
      .waitFor();
    assert(page.url().includes("waste-list?coleta=collection"));
    const created = writes.find((w) => w.path === "/material-intakes");
    assert(created);
    assert.equal(created.input.kind, "DIRECT");
  });
  await test("celular mantém etapas e formulário sem transbordamento", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.screenshot({
      path: path.join(out, "pesagem-mobile.png"),
      fullPage: true,
    });
  });
  assert.deepEqual(errors, []);
  console.log(`${results.length} testes de interface aprovados`);
} catch (e) {
  console.error(e);
  console.error(errors);
  await page.screenshot({
    path: path.join(out, "failure.png"),
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify({ results, errors, writes }, null, 2),
  );
  await browser.close();
  await new Promise((r) => server.close(r));
}
