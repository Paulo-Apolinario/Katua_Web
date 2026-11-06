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
const out = path.join(tools, "stock-dispatch-evidence");
fs.mkdirSync(out, { recursive: true });
const user = {
  id: "coop",
  role: "COOPERATIVE",
  displayName: "Cooperativa QA",
  isActive: true,
  accountStatus: "ACTIVE",
};
const item = {id:"stock-item",name:"Papelão QA",unit:"KG",status:"ACTIVE",category:"Papel",_count:{lots:3},balances:[{status:"AVAILABLE",unit:"KG",_sum:{availableQuantity:500}}]};
let writes=[], results=[], errors=[], saved=null, loseResponse=false, getMissing=false, rejectRetry=false;
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
await new Promise((r) => server.listen(5187, "127.0.0.1", r));
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
await context.route("**/*", async route => {
  const req=route.request(), url=new URL(req.url());
  if(!["fetch","xhr"].includes(req.resourceType()) && req.method()!=="OPTIONS") return url.hostname==="127.0.0.1" ? route.continue() : route.abort();
  if(req.method()==="OPTIONS") return route.fulfill({status:204,headers:{"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"GET,POST,OPTIONS"}});
  let body={}, status=200;
  if(url.pathname==="/auth/me") body={user};
  else if(url.pathname==="/waste-workspace/inventory") body={items:[item],balances:item.balances,lotCount:3,pagination:{total:1,page:1,totalPages:1}};
  else if(url.pathname==="/waste-stock/dispatches/preview") {
    const input=req.postDataJSON(); writes.push({path:url.pathname,input});
    body={...input,planHash:"a".repeat(64),allocations:[{lotId:"oldest",lotCode:"L001",before:"370.000",quantity:"370.000",after:"0.000"},{lotId:"partial",lotCode:"L002",before:"60.000",quantity:"30.000",after:"30.000"}]};
  } else if(url.pathname==="/waste-stock/dispatches") {
    const input=req.postDataJSON(); writes.push({path:url.pathname,input});
    if(rejectRetry) {status=409;body={error:"O estoque mudou. Atualize a prévia."};}
    else {
      saved={id:"document",number:"SAI-QA",kind:"STOCK_DISPATCH",createdAt:new Date().toISOString(),snapshot:{cooperative:{name:"Coop QA"},actor:"Gestor QA",dispatch:{...input,recordedAt:new Date().toISOString(),materialName:item.name,allocations:[{lotId:"oldest",lotCode:"L001",before:"370.000",quantity:"370.000",after:"0.000",movementId:"move1"},{lotId:"partial",lotCode:"L002",before:"60.000",quantity:"30.000",after:"30.000",movementId:"move2"}]}},orders:[]};
      if(loseResponse) {loseResponse=false;return route.abort("failed");}
      body={document:saved};status=201;
    }
  } else if(url.pathname.startsWith("/waste-stock/dispatches/")) {
    if(saved&&!getMissing) body={document:saved}; else {status=404;body={error:"Não localizado"};}
  } else if(url.pathname.includes("inbox")||url.pathname.includes("notifications"))body={items:[],notifications:[],unreadCount:0};
  return route.fulfill({status,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
});
const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
const click=name=>page.getByRole("button",{name,exact:true}).click();
async function test(name,fn){await fn();results.push({name,status:"PASS"});console.log("PASS",name);}
async function open(){await page.goto("http://127.0.0.1:5187/waste-stock");await click("Destinar quantidade");await page.getByRole("dialog").waitFor();}
async function preview(){await page.getByLabel("Quantidade total",{exact:true}).fill("400");await page.getByLabel("Destinatário / local de destino",{exact:true}).fill("Recicladora QA");await click("Conferir lotes e saldos");await page.getByRole("region",{name:"Prévia da saída"}).waitFor();}
try {
  await test("prévia mostra dois lotes e saldo parcial; confirmação é explícita", async()=>{
    await open();await preview();
    assert(await page.getByRole("cell",{name:"30.000",exact:true}).count());
    assert(await page.getByRole("button",{name:"Confirmar saída e gerar documento",exact:true}).isDisabled());
    assert.equal(writes.filter(w=>w.path==="/waste-stock/dispatches").length,0);
  });
  await test("alterar destinatário invalida a prévia anterior",async()=>{
    await page.getByLabel("Destinatário / local de destino",{exact:true}).fill("Outro destinatário");
    assert.equal(await page.getByRole("region",{name:"Prévia da saída"}).count(),0);
    await preview();
  });
  await test("confirmação envia um protocolo e gera documento PDF com os saldos",async()=>{
    await page.getByRole("checkbox").check();await click("Confirmar saída e gerar documento");
    await page.getByText("Saída registrada. Os saldos dos lotes foram atualizados.",{exact:true}).waitFor();
    assert.equal(writes.filter(w=>w.path==="/waste-stock/dispatches").length,1);
    await page.getByRole("heading",{name:"Lote L002",exact:true}).waitFor();
    const download=page.waitForEvent("download");await click("Baixar documento interno em PDF");const file=await download;assert.equal(file.suggestedFilename(),"SAI-QA.pdf");
    const pdf=await fs.promises.readFile(await file.path());assert.equal(pdf.subarray(0,4).toString(),"%PDF");
    await page.screenshot({path:path.join(out,"saida-desktop.png"),fullPage:true});
  });
  await test("resposta perdida bloqueia nova saída e protocolo sobrevive ao recarregamento",async()=>{
    await page.reload();await click("Destinar quantidade");await preview();loseResponse=true;
    await page.getByRole("checkbox").check();await click("Confirmar saída e gerar documento");
    await page.getByText(/Há uma confirmação pendente/).waitFor();
    assert(await page.getByLabel("Quantidade total",{exact:true}).isDisabled());
    const count=writes.filter(w=>w.path==="/waste-stock/dispatches").length;
    await page.reload();await click("Destinar quantidade");await click("Conferir protocolo / concluir tentativa");
    await page.getByText("Saída registrada. Os saldos dos lotes foram atualizados.",{exact:true}).waitFor();
    assert.equal(writes.filter(w=>w.path==="/waste-stock/dispatches").length,count);
  });
  await test("protocolo não localizado repete o mesmo UUID e conflito permite nova conferência",async()=>{
    await page.reload();await click("Destinar quantidade");await preview();loseResponse=true;
    await page.getByRole("checkbox").check();await click("Confirmar saída e gerar documento");await page.getByText(/Há uma confirmação pendente/).waitFor();
    const previous=writes.at(-1).input.operationId;getMissing=true;rejectRetry=true;
    await click("Conferir protocolo / concluir tentativa");await page.getByText("O estoque mudou. Atualize a prévia.",{exact:true}).waitFor();
    assert.equal(writes.at(-1).input.operationId,previous);assert(await page.getByLabel("Quantidade total",{exact:true}).isEnabled());
    getMissing=false;rejectRetry=false;
  });
  await test("formulário e tabela permanecem utilizáveis no celular",async()=>{
    await page.setViewportSize({width:390,height:844});await preview();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(out,"saida-mobile.png"),fullPage:true});
  });
  assert.deepEqual(errors,[]);console.log(`${results.length} testes de saída em navegador aprovados`);
} catch(e){console.error(e);process.exitCode=1;await page.screenshot({path:path.join(out,"failure.png"),fullPage:true});}
finally{fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({results,writes,errors},null,2));await browser.close();await new Promise(r=>server.close(r));}
