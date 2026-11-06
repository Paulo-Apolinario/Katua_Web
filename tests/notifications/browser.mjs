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
const out = path.join(tools, "read-notices-evidence");
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
let notices = [
  {id:"n1",title:"Coleta aguardando recebimento QA",message:"Confira o recebimento.",createdAt:"2026-11-06T03:00:00Z",collectionId:"collection",readAt:null},
  {id:"n2",title:"Coleta iniciada QA",message:"Acompanhe a operação.",createdAt:"2026-11-06T02:00:00Z",collectionId:"collection",readAt:null},
  {id:"n3",title:"Aviso já lido QA",message:"Histórico preservado.",createdAt:"2026-11-06T01:00:00Z",collectionId:"collection",readAt:"2026-11-06T01:10:00Z"}
], failRead = false;
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
await new Promise((r) => server.listen(5188, "127.0.0.1", r));
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
  if(url.pathname.startsWith("/notifications")) {
    if(req.method()==="PATCH" || req.method()==="POST") {
      writes.push({path:url.pathname});
      if(failRead) return route.fulfill({status:503,json:{error:"Não foi possível registrar a leitura QA"}});
      const id=url.pathname.split("/")[2];
      notices=notices.map(n=>id==="read-all"||n.id===id?{...n,readAt:n.readAt||new Date().toISOString()}:n);
      body={success:true};
    } else body={notifications:notices,unreadCount:notices.filter(n=>!n.readAt).length,nextCursor:null};
    return route.fulfill({status:200,json:body});
  }

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
  await page.goto("http://127.0.0.1:5188/waste-list?coleta=collection");
  await page.getByRole("region", { name: "Passos do recebimento" }).waitFor();
}
async function test(name, fn) {
  await fn();
  results.push({ name, status: "PASS" });
  console.log("PASS", name);
}
const row = title => page.getByRole("listitem").filter({has:page.getByText(title,{exact:true})});
try {
  await test("avisos já lidos não exibem Novo nem Marcar como lido",async()=>{
    await page.goto("http://127.0.0.1:5188/notifications");await page.getByText("2 aviso(s) não lido(s).",{exact:true}).waitFor();
    assert.equal(await row("Aviso já lido QA").getByRole("button",{name:"Marcar como lido",exact:true}).count(),0);
    assert.equal(await row("Aviso já lido QA").getByText("Novo",{exact:true}).count(),0);
  });
  await test("marcação manual atualiza botão, contador e sino",async()=>{
    await row("Coleta iniciada QA").getByRole("button",{name:"Marcar como lido",exact:true}).click();
    await page.getByText("1 aviso(s) não lido(s).",{exact:true}).waitFor();
    assert.equal(await row("Coleta iniciada QA").getByRole("button",{name:"Marcar como lido",exact:true}).count(),0);
    await page.getByRole("link",{name:"Central de avisos: 1 não lidos",exact:true}).waitFor();
  });
  await test("Abrir atendimento registra leitura e mantém lido ao voltar",async()=>{
    await row("Coleta aguardando recebimento QA").getByRole("link",{name:"Abrir atendimento",exact:true}).click();
    await page.waitForURL("**/waste-list?coleta=collection");assert(notices.find(n=>n.id==="n1").readAt);
    assert(writes.some(w=>w.path==="/notifications/n1/read"));
    await page.goto("http://127.0.0.1:5188/notifications");await page.getByText("0 aviso(s) não lido(s).",{exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Marcar como lido",exact:true}).count(),0);
    assert.equal(await page.getByRole("button",{name:"Marcar todos como lidos",exact:true}).count(),0);
    assert.equal(await page.locator("ul.list-group > li").count(),3);
  });
  await test("falha na gravação não apresenta leitura falsa nem apaga aviso",async()=>{
    notices.push({id:"n4",title:"Aviso pendente QA",message:"Ainda requer leitura",readAt:null,createdAt:new Date().toISOString(),collectionId:"collection"});failRead=true;
    await page.reload();await page.getByText("1 aviso(s) não lido(s).",{exact:true}).waitFor();
    await row("Aviso pendente QA").getByRole("button",{name:"Marcar como lido",exact:true}).click();
    await page.getByRole("alert").filter({hasText:"Não foi possível registrar a leitura QA"}).waitFor();
    assert.equal(notices.find(n=>n.id==="n4").readAt,null);
    assert.equal(await row("Aviso pendente QA").getByRole("button",{name:"Marcar como lido",exact:true}).count(),1);
    failRead=false;
  });
  await test("marcar todos preserva histórico e remove botões de leitura",async()=>{
    await page.getByRole("button",{name:"Marcar todos como lidos",exact:true}).click();
    await page.getByText("0 aviso(s) não lido(s).",{exact:true}).waitFor();assert.equal(await page.locator("ul.list-group > li").count(),4);
    assert.equal(await page.getByRole("button",{name:"Marcar como lido",exact:true}).count(),0);
    await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(out,"avisos-lidos-mobile.png"),fullPage:true});
  });
  assert.deepEqual(errors,[]);console.log(`${results.length} testes de leitura de avisos aprovados`);
} catch(e){console.error(e);console.error(errors);process.exitCode=1;await page.screenshot({path:path.join(out,"failure.png"),fullPage:true});}
finally {fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({results,writes,errors},null,2));await browser.close();await new Promise(r=>server.close(r));}
