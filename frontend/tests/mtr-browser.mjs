/** Validação descartável: exige KATUA_VALIDATION_TOOLS, KatuApp ao lado e dependências já instaladas. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const webDir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const appDir=process.env.KATUA_APP_DIR||resolve(webDir,'../../KatuApp');
const serverDir=join(appDir,'server');
const toolsDir=process.env.KATUA_VALIDATION_TOOLS;
if(!toolsDir)throw Error('Defina KATUA_VALIDATION_TOOLS com as dependências isoladas de validação.');
const require=createRequire(join(resolve(toolsDir),'package.json'));
const {PGlite}=await import(pathToFileURL(require.resolve('@electric-sql/pglite')));
const {PGLiteSocketServer}=await import(pathToFileURL(require.resolve('@electric-sql/pglite-socket')));
const {default:chromium}=await import(pathToFileURL(require.resolve('@sparticuz/chromium')));
const {chromium:pw}=require(process.env.KATUA_PLAYWRIGHT_MODULE||'playwright');
const outputDir=await mkdtemp(join(tmpdir(),'katua-mtr-'));
const databaseUrl='postgresql://postgres:localtest@127.0.0.1:54329/postgres?connection_limit=1';
const outcomes=[],children=[];let browser,db,socket;
async function child(args,cwd,env,ready){const p=spawn(process.execPath,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});children.push(p);return new Promise((resolve,reject)=>{const logs=[];const t=setTimeout(()=>reject(Error('Inicialização excedeu limite')),60000);const data=b=>{logs.push(b.toString());if(ready.test(b.toString())){clearTimeout(t);resolve(p);}};p.stdout.on('data',data);p.stderr.on('data',data);p.on('exit',code=>{clearTimeout(t);if(code)reject(Error('Inicialização falhou: '+logs.join('').slice(-1000)));});});}
async function check(name,fn){try{await fn();outcomes.push({name,status:'PASS'});console.log('PASS',name);}catch(e){outcomes.push({name,status:'FAIL',error:e.message.slice(0,1200)});console.log('FAIL',name,e.message.slice(0,300));}}
try{
 const sql=execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{cwd:serverDir,env:{...process.env,DATABASE_URL:databaseUrl},encoding:'utf8'});
 db=await PGlite.create();await db.exec(sql);socket=new PGLiteSocketServer({db,host:'127.0.0.1',port:54329});await socket.start();
 await child(['--import','tsx','tests/operational/local-server.ts'],serverDir,{KATUA_LOCAL_VALIDATION:'1',DATABASE_URL:databaseUrl,KATUA_VALIDATION_DIR:outputDir},/LOCAL_API_READY/);
 const f=JSON.parse(await readFile(join(outputDir,'fixture.json'),'utf8'));
 await db.query('INSERT INTO "Generator" (id,"cooperativeId",type,name,email,address,"updatedAt") VALUES ($1,$2,\'SMALL\',$3,$4,$5,NOW())',['mtr-generator',f.cooperative.id,'Gerador MTR de teste','mtr@example.invalid','Rua A, 10, Manaus, AM']);
 await db.query('UPDATE "Collection" SET "generatorId"=$1, materials=$2::jsonb WHERE id=$3',['mtr-generator',JSON.stringify([{name:'Óleo',quantity:2.5,unit:'L'},{name:'Papel',quantity:3,unit:'KG'}]),f.collections.historical.id]);
 await db.query('UPDATE "Route" SET "driverId"=$1,"vehicleId"=$2,"scheduledDate"=$3 WHERE id=$4',[f.driver2.id,f.vehicle2.id,'2026-10-20T12:00:00Z',f.routes.equipe.id]);
 await child(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179'],webDir,{VITE_API_BASE_URL:'http://127.0.0.1:3339'},/Local:/);
 browser=await pw.launch({executablePath:process.env.KATUA_CHROMIUM_PATH||await chromium.executablePath(),args:chromium.args,headless:true});
 const mutations=[];
 async function contextFor(token,user,viewport={width:1440,height:1100}){const c=await browser.newContext({viewport});await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.port==='3339'&&r.request().method()!=='GET')mutations.push(r.request().method()+' '+u.pathname);return ['127.0.0.1','localhost'].includes(u.hostname)?r.continue():r.abort();});await c.addInitScript(({token,user})=>{localStorage.setItem('auth_token',token);localStorage.setItem('auth_user',JSON.stringify(user));},{token,user});return c;}
 const context=await contextFor(f.token,f.owner);const page=await context.newPage();page.setDefaultTimeout(15000);
 await check('Consulta real de rotas, filtros por data/status/motorista/veículo e recarga',async()=>{
  await page.goto('http://127.0.0.1:5179/mtr-online');await page.getByText('QA equipe',{exact:true}).waitFor();assert.equal(await page.locator('article').count(),5);
  await page.locator('#mtr-start').fill('2026-10-20');await page.locator('#mtr-end').fill('2026-10-20');assert.equal(await page.locator('article').count(),1);
  await page.locator('#mtr-driver').selectOption(f.driver2.id);await page.locator('#mtr-vehicle').selectOption(f.vehicle2.id);await page.locator('#mtr-status').selectOption('IN_PROGRESS');assert.equal(await page.locator('article').count(),1);
  await page.locator('#mtr-start').fill('2026-10-21');await page.getByRole('alert').filter({hasText:'A data inicial'}).waitFor();
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();await page.locator('#mtr-q').fill('inexistente');await page.getByText('Nenhuma rota corresponde aos filtros.',{exact:true}).waitFor();
  await page.reload();await page.getByText('QA equipe',{exact:true}).waitFor();
 });
 await check('Ficha por coleta preserva equipe histórica, material em litros e acesso seguro ao portal',async()=>{
  await page.locator('article').filter({hasText:'QA equipe'}).getByRole('button',{name:'Preparar dados',exact:true}).click();await page.locator('#mtr-collection').selectOption(f.collections.historical.id);
  await page.getByText('Gerador MTR de teste',{exact:true}).last().waitFor();
  await page.locator('#mtr-portal').selectOption('NACIONAL');
  const dd=page.locator('dd');assert.ok((await dd.allTextContents()).includes('QA Motorista Ana'));assert.ok((await dd.allTextContents()).includes(f.vehicle1.plate));
  await page.getByRole('cell',{name:'2,5',exact:true}).waitFor();await page.getByRole('cell',{name:'L',exact:true}).waitFor();
  await context.grantPermissions(['clipboard-read','clipboard-write']);await page.getByRole('button',{name:'Copiar ficha',exact:true}).click();await page.getByText('Ficha copiada. Emita o MTR no portal oficial.',{exact:true}).waitFor();assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('NÃO É UM MTR OFICIAL'));
  const link=page.getByRole('link',{name:'Abrir portal para emitir',exact:true});assert.equal(await link.getAttribute('href'),'https://mtr.sinir.gov.br/');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar ficha de apoio',exact:true}).click();const downloaded=await download;const text=await readFile(await downloaded.path(),'utf8');assert.ok(text.includes('NÃO É UM MTR OFICIAL'));assert.ok(text.includes(f.collections.historical.id));assert.ok(text.includes('QA Motorista Ana'));assert.ok(text.includes('Óleo: 2,5 L'));assert.ok(!text.includes('QA Motorista Bruno'));
  await page.screenshot({path:join(outputDir,'mtr-desktop.png'),fullPage:true});
 });
 await check('Coleta cancelada somente consulta; ausência de peso não vira zero; nenhum formulário de senha',async()=>{
  await page.locator('#mtr-collection').selectOption(f.collections.pending.id);await page.getByText('Não informado / não aferido',{exact:true}).waitFor();
  await page.locator('article').filter({hasText:'QA mixed'}).getByRole('button',{name:'Preparar dados',exact:true}).click();await page.locator('#mtr-collection').selectOption(f.collections.mixedCancelled.id);
  await page.getByRole('alert').filter({hasText:'Operação cancelada'}).waitFor();assert.equal(await page.getByRole('button',{name:'Baixar ficha de apoio',exact:true}).isDisabled(),true);assert.equal(await page.locator('input[type=password]').count(),0);
 });
 await check('Erro de consulta não é apresentado como lista vazia ou dados anteriores',async()=>{
  await page.route('**/routes',r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Falha controlada de consulta'})}));
  await page.getByRole('button',{name:'Atualizar rotas',exact:true}).click();await page.getByRole('alert').filter({hasText:'Falha controlada de consulta'}).waitFor();assert.equal(await page.locator('article').count(),0);assert.equal(await page.locator('#mtr-collection').count(),0);
  await page.unroute('**/routes');await page.getByRole('button',{name:'Atualizar rotas',exact:true}).click();await page.getByText('QA equipe',{exact:true}).waitFor();
 });
 await check('Isolamento entre cooperativas real, perfil DRIVER bloqueado e navegação móvel',async()=>{
  const denied=await fetch('http://127.0.0.1:3339/routes/'+f.routes.equipe.id,{headers:{Authorization:'Bearer '+f.otherToken}});assert.equal(denied.status,404);
  const other=await contextFor(f.otherToken,f.otherUser);const p=await other.newPage();await p.goto('http://127.0.0.1:5179/mtr-online');await p.getByText('Nenhuma rota cadastrada. Cadastre uma rota em Gestão de Rotas.',{exact:true}).waitFor();assert.equal(await p.locator('article').count(),0);
  const driver=await contextFor(f.driverToken,{id:f.driver1.userId,role:'DRIVER'});const d=await driver.newPage();await d.goto('http://127.0.0.1:5179/mtr-online');await d.waitForURL('**/login');
  await page.setViewportSize({width:430,height:932});await page.reload();await page.getByText('QA equipe',{exact:true}).waitFor();await page.locator('#mtr-portal').selectOption('SP');await page.getByRole('link',{name:'Acessar emissão de MTR',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Acessar emissão de MTR',exact:true}).getAttribute('href'),'https://mtr.cetesb.sp.gov.br/');await page.screenshot({path:join(outputDir,'mtr-mobile.png'),fullPage:true});assert.equal(mutations.length,0);
 });
}catch(e){outcomes.push({name:'Ambiente',status:'FAIL',error:e.message});console.error(e.message.slice(0,1000));}
finally{await writeFile(join(outputDir,'results.json'),JSON.stringify({environment:'API Fastify/Prisma e banco PGlite locais; Chromium desktop/móvel; sem emissão externa ou produção',outcomes},null,2));await browser?.close();for(const p of children)p.kill('SIGTERM');await socket?.stop();await db?.close();console.log('REPORT_DIR',outputDir);if(outcomes.some(r=>r.status==='FAIL'))process.exitCode=1;}
