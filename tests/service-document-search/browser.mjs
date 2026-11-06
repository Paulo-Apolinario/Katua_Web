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
const out = path.join(tools, "document-search-evidence");
fs.mkdirSync(out, { recursive: true });
const user = {
  id: "coop",
  role: "COOPERATIVE",
  displayName: "Cooperativa QA",
  isActive: true,
  accountStatus: "ACTIVE",
};
const linked = [{serviceOrder:{id:"order",number:"OS-2026-000001"}},{serviceOrder:{id:"other-order",number:"OS-2026-000002"}}];
const docContext = {operation:"STOCK_EXIT",operationKind:"SALE",materials:[{name:"Papelão",quantity:"400.000",unit:"KG"}],materialCount:1,destinationName:"Recicladora São José",operationDate:"2026-11-06T12:00:00Z",lotCount:2,lots:[{id:"lot-1",code:"LOTE-101"},{id:"lot-2",code:"LOTE-102"}],origins:[]};
const stock={id:"stock",number:"SAI-2026-TEST",kind:"STOCK_DISPATCH",createdAt:"2026-11-06T13:00:00Z",orders:linked,context:docContext};
const perLot={...stock,id:"transport",number:"TR-2026-TEST",kind:"TRANSPORT_RECORD",orders:[linked[0]],context:{...docContext,materials:[{name:"Papelão",quantity:370,unit:"KG"}],lotCount:1,lots:[docContext.lots[0]]}};
const manual={...stock,id:"manual",number:"SAI-MANUAL",orders:[],context:{...docContext,destinationName:"Cliente Manual",materials:[{name:"Óleo",quantity:80,unit:"LITER"}],lots:[{id:"manual-lot",code:"LOTE-OLEO"}],lotCount:1}};
const plan={id:"plan",number:"OS-PROGRAMACAO",kind:"SERVICE_ORDER",createdAt:"2026-11-06T09:00:00Z",orders:linked,context:{operation:"COLLECTION",materials:[{name:"Papelão",quantity:null,unit:"KG"}],materialCount:1,origins:["Loja Papelão"],lots:[],lotCount:0}};
const docs=[stock,perLot,manual,plan];
const order={id:"order",number:"OS-2026-000001",sourceType:"COLLECTION",title:"Loja Papelão",createdAt:"2026-11-06T09:00:00Z",status:"COMPLETED",points:1,_count:{documents:7},stockExitCount:3,documentTypes:[{kind:"STOCK_DISPATCH",count:1},{kind:"TRANSPORT_RECORD",count:2}],documents:[{document:{id:"plan",number:plan.number}}]};
let results=[], errors=[], reads=[], failList=false;
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
await new Promise((r) => server.listen(5189, "127.0.0.1", r));
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
await context.route("**/*",async route=>{
 const req=route.request(),url=new URL(req.url());
 if(!["fetch","xhr"].includes(req.resourceType())&&req.method()!=="OPTIONS")return url.hostname==="127.0.0.1"?route.continue():route.abort();
 if(req.method()==="OPTIONS")return route.fulfill({status:204,headers:{"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"GET,OPTIONS"}});
 assert.equal(req.method(),"GET");reads.push(url.pathname+url.search);
 let body={},status=200;
 if(url.pathname==="/auth/me")body={user};
 else if(url.pathname==="/service-orders")body={orders:[order],pagination:{total:1,page:1,totalPages:1}};
 else if(url.pathname==="/service-orders/order")body={order,documents:docs.filter(d=>d.orders.length),current:{collections:[{id:"collection",origin:"Loja Papelão",materials:[{name:"Papelão",quantity:400,unit:"KG"}],status:"COMPLETED"}]}};
 else if(url.pathname==="/internal-documents") {
   if(failList){status=503;body={error:"Não foi possível atualizar os documentos QA"};failList=false;}
   else {
     const normalized=v=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
     const q=normalized(url.searchParams.get("q")||"");
     const selected=docs.filter(d=>(!url.searchParams.get("operation")||d.context.operation===url.searchParams.get("operation"))&&(!url.searchParams.get("kind")||d.kind===url.searchParams.get("kind"))&&(!url.searchParams.get("serviceOrderId")||d.orders.some(o=>o.serviceOrder.id===url.searchParams.get("serviceOrderId")))&&(!q||normalized(JSON.stringify(d)).includes(q)));
     body={documents:selected,pagination:{total:selected.length,totalPages:1,page:1}};
   }
 } else if(url.pathname.startsWith("/internal-documents/")){
   const d=docs.find(d=>d.id===url.pathname.split("/").at(-1));
   body={document:{...d,snapshot:d.kind==="STOCK_DISPATCH"?{cooperative:{name:"Coop QA"},actor:"Gestor QA",dispatch:{materialName:"Papelão",quantity:"400.000",unit:"KG",destinationName:"Recicladora São José",kind:"SALE",movementDate:"2026-11-06T12:00:00Z",allocations:[{lotId:"lot-1",lotCode:"LOTE-101",before:"370.000",quantity:"370.000",after:"0.000"},{lotId:"lot-2",lotCode:"LOTE-102",before:"60.000",quantity:"30.000",after:"30.000"}]}}:{cooperative:{name:"Coop QA"},collections:[]}}};
 } else if(url.pathname.includes("inbox")||url.pathname.includes("notifications"))body={items:[],notifications:[],unreadCount:0};
 return route.fulfill({status,json:body});
});
const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
const click=name=>page.getByRole("button",{name,exact:true}).click();
async function test(name,fn){await fn();results.push({name,status:"PASS"});console.log("PASS",name);}
const card=id=>page.locator("article.service-document-card").filter({hasText:id});
try {
 await test("O.S. identifica origem e existência de saída consolidada sem abrir detalhes",async()=>{
   await page.goto("http://127.0.0.1:5189/service-orders");await page.getByText("Loja Papelão",{exact:true}).waitFor();await page.getByText("Tem saída de estoque",{exact:true}).waitFor();await page.getByText("Consolidado de lotes: 1",{exact:true}).waitFor();
   assert(await page.getByRole("button",{name:"Ver saídas (3)",exact:true}).isVisible());
 });
 await test("acesso direto pela O.S. filtra apenas suas saídas e exibe identidade do documento",async()=>{
   await click("Ver saídas (3)");await card(stock.number).waitFor();assert(reads.some(r=>r.includes("operation=STOCK_EXIT")&&r.includes("serviceOrderId=order")));
   const d=card(stock.number);await d.getByText("Recicladora São José",{exact:true}).waitFor();await d.getByText("LOTE-102",{exact:true}).waitFor();assert((await d.innerText()).includes("400 kg"));assert((await d.innerText()).includes("Consolidado"));await d.getByText("Compartilhado entre 2 O.S.",{exact:true}).waitFor();assert((await d.innerText()).includes("Total da saída: Papelão · 400 kg"));assert.equal(await card(perLot.number).getByText("Compartilhado entre 2 O.S.",{exact:true}).count(),0);assert((await card(perLot.number).innerText()).includes("Saída deste lote: Papelão · 370 kg"));assert.equal(await card(manual.number).count(),0);
 });
 await test("atalho Destinação de lotes inclui saída sem O.S. e mantém tipos distintos",async()=>{
   await click("Destinação de lotes");await card(manual.number).waitFor();await card(manual.number).getByText("Sem O.S. vinculada",{exact:true}).waitFor();assert.equal(await card(plan.number).count(),0);assert.equal(await page.locator("article.service-document-card").count(),3);
 });
 await test("busca por lote envia termo à API e localiza consolidado",async()=>{
   await page.getByLabel("Buscar material, destinatário, lote, documento ou O.S.",{exact:true}).fill("LOTE-102");const response=page.waitForResponse(r=>r.url().includes("/internal-documents?")&&r.url().includes("q=LOTE-102"));await click("Aplicar filtros");await response;await card(manual.number).waitFor({state:"hidden"});await card(stock.number).waitFor();assert(reads.some(r=>r.includes("q=LOTE-102")));assert.equal(await page.locator("article.service-document-card").count(),1);
 });
 await test("visualização e PDF mantêm lotes e saldos parciais do comprovante",async()=>{
   await card(stock.number).getByRole("button",{name:"Visualizar",exact:true}).click();const dialog=page.getByRole("dialog");await dialog.waitFor();await dialog.getByRole("heading",{name:"Lote LOTE-102",exact:true}).waitFor();assert((await dialog.innerText()).includes("30.000 KG"));
   const download=page.waitForEvent("download");await dialog.getByRole("button",{name:"Baixar PDF",exact:true}).click();const file=await download;assert.equal(file.suggestedFilename(),stock.number+".pdf");assert.equal((await fs.promises.readFile(await file.path())).subarray(0,4).toString(),"%PDF");await dialog.getByRole("button",{name:"Fechar detalhes",exact:true}).click();
 });
 await test("limpar busca preserva categoria de destinação e permite filtro por tipo",async()=>{
   await click("Limpar filtros");await card(manual.number).waitFor();assert.equal(await page.getByLabel("Categoria da operação",{exact:true}).inputValue(),"STOCK_EXIT");
   await page.getByLabel("Tipo de documento",{exact:true}).selectOption("STOCK_DISPATCH");await card(manual.number).waitFor();await card(perLot.number).waitFor({state:"hidden"});assert.equal(await card(perLot.number).count(),0);assert.equal(await page.locator("article.service-document-card").count(),2);
 });
 await test("todos os documentos inclui programação e mantém download de O.S.",async()=>{
   await click("Todos os documentos");await card(plan.number).waitFor();await click("Ordens de Serviço");await page.getByText("Loja Papelão",{exact:true}).waitFor();const download=page.waitForEvent("download");await click("Baixar O.S.");assert.equal((await download).suggestedFilename(),plan.number+".pdf");
 });
 await test("consulta no celular mantém metadados legíveis sem transbordamento da página",async()=>{
   await click("Destinação de lotes");await card(stock.number).waitFor();await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,"destinacao-lotes-mobile.png"),fullPage:true});
   await page.setViewportSize({width:1366,height:900});await page.screenshot({path:path.join(out,"destinacao-lotes-desktop.png"),fullPage:true});
 });
 assert.deepEqual(errors,[]);console.log(`${results.length} testes da central de documentos aprovados`);
}catch(e){console.error(e);console.error(errors);process.exitCode=1;await page.screenshot({path:path.join(out,"failure.png"),fullPage:true});}
finally{fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({results,reads,errors},null,2));await browser.close();await new Promise(r=>server.close(r));}
