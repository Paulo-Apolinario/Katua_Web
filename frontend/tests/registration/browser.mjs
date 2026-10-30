import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const tools=process.env.KATUA_VALIDATION_TOOLS,panel=process.env.KATUA_PANEL_FRONTEND;
const fixture=JSON.parse(fs.readFileSync(path.join(tools,'field-operations-fixture.json'),'utf8'));
const require=createRequire(path.join(tools,'package.json')),{chromium}=require('playwright');
const out=path.join(tools,'registration-ui-evidence');fs.mkdirSync(out,{recursive:true});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179','--strictPort'],{cwd:panel,env:{...process.env,VITE_API_BASE_URL:'http://127.0.0.1:3339'},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Vite timeout')),30000);vite.stdout.on('data',b=>{if(b.toString().includes('Local:')){clearTimeout(timer);resolve();}});vite.on('exit',code=>reject(Error('Vite '+code)));});
const checks=[],pass=name=>{checks.push(name);console.log('PASS '+name);};
const api=async(url,method='GET',body)=>{const r=await fetch('http://127.0.0.1:3339'+url,{method,headers:{authorization:'Bearer '+fixture.token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});assert(r.ok,await r.clone().text());return r.json();};
let browser;
try {
 browser=await chromium.launch({executablePath:process.env.KATUA_CHROMIUM_PATH||'/tmp/katua-pev-browser',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Fortaleza',acceptDownloads:true});
 await context.addInitScript(f=>{
   localStorage.setItem('auth_token',f.token);localStorage.setItem('auth_user',JSON.stringify(f.owner));
   window.geoRequests=[];window.markerState={visible:false};
   window.google={maps:{Map:class{constructor(el){this.listeners={};el.setAttribute('aria-label','Mapa de teste');el.addEventListener('click',()=>this.listeners.click?.({latLng:{lat:()=>-3.73,lng:()=>-38.52}}));}addListener(name,fn){this.listeners[name]=fn;}panTo(){}setZoom(){}},Marker:class{addListener(){}setVisible(v){window.markerState.visible=v;}setPosition(p){window.markerState.position=p;}},Geocoder:class{geocode(request,callback){window.geoRequests.push({request,callback});}}}};
 },fixture);
 await context.route('**/*',r=>['localhost','127.0.0.1','viacep.com.br'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 context.setDefaultTimeout(15000);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Actual API registration exports, including complete lists beyond a filtered row.
 const collector=(await api('/collectors','POST',{name:'Catador ficha QA',email:'cadastro-cat@test.invalid',status:'ON_ROUTE',isAutonomous:true,associationDate:'2026-10-30',registrationNumber:'INS-023',membershipCategory:'FOUNDER',socioeconomicNotes:'Observação extensa para conferir a quebra de página. '.repeat(50)+'FINAL-OBSERVACAO-QA'})).collector;
 const driver=(await api('/drivers','POST',{name:'Motorista ficha QA',email:'cadastro-mot@test.invalid',cnh:'01234567890',cnhCategory:'AB',notes:'Observação do motorista.',status:'AVAILABLE'})).driver;
 const generator=(await api('/generators','POST',{type:'SMALL',name:'Gerador ficha QA',email:'cadastro-ger@test.invalid',documentNumber:'52998224725',street:'Rua de teste',number:'10',city:'Fortaleza',state:'CE',latitude:-3.73,longitude:-38.52})).generator;
 for(let i=0;i<11;i++) await api('/drivers','POST',{name:'Motorista adicional QA '+i,email:`extra-driver-${i}@test.invalid`});
 const destinations={collectors:['collector-list',collector],drivers:['staff-list',driver],generators:['generator-list',generator]};
 for(const [kind,[route,record]] of Object.entries(destinations)){
  await page.goto('http://127.0.0.1:5179/'+route);
  if(kind==='drivers') await page.getByPlaceholder('Buscar por nome, email, CPF ou CNH...').fill('Motorista ficha QA');
  const button=page.getByRole('button',{name:'Baixar cadastros em PDF',exact:true});await button.waitFor();await button.click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Selecionar cadastro',{exact:true}).selectOption(record.id);
  const one=page.waitForEvent('download');await dialog.getByRole('button',{name:'Baixar PDF',exact:true}).click();const file=await one;await file.saveAs(path.join(out,kind+'-one.pdf'));assert(!await file.failure());
  await button.click();await dialog.getByLabel('O que deseja baixar?',{exact:true}).selectOption('all');
  const all=page.waitForEvent('download');await dialog.getByRole('button',{name:'Baixar PDF',exact:true}).click();const allFile=await all;await allFile.saveAs(path.join(out,kind+'-all.pdf'));assert(!await allFile.failure());
  const list=(await api('/'+kind))[kind];fs.writeFileSync(path.join(out,kind+'-expected.json'),JSON.stringify(list.map(r=>({id:r.id,name:r.name}))));
  pass(`PDF individual e completo de ${kind} usa a API real e baixa arquivos válidos`);
 }
 // Verify no download on failures/session changes.
 await page.getByRole('button',{name:'Baixar cadastros em PDF',exact:true}).click();await page.getByLabel('O que deseja baixar?',{exact:true}).selectOption('all');
 await page.route('**/generators',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Falha controlada de exportação'})}));
 await page.getByRole('button',{name:'Baixar PDF',exact:true}).click();await page.getByRole('alert').filter({hasText:'Falha controlada'}).waitFor();await page.unroute('**/generators');
 await page.evaluate(()=>localStorage.setItem('auth_token','session-changed'));
 await page.getByRole('button',{name:'Baixar PDF',exact:true}).click();await page.getByRole('alert').filter({hasText:'A sessão mudou'}).waitFor();
 await page.evaluate(f=>localStorage.setItem('auth_token',f.token),fixture);await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 pass('Falha de consulta e troca de sessão bloqueiam exportação sem gerar PDF parcial');
 // Delayed CEP must preserve number and unrelated form edits.
 let releaseCep;await page.route('https://viacep.com.br/**',async r=>{await new Promise(resolve=>releaseCep=resolve);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({logradouro:'Rua CEP QA',bairro:'Centro',localidade:'Fortaleza',uf:'CE'})});});
 await page.goto('http://127.0.0.1:5179/create-generator');await page.locator('input[name=zipCode]').fill('60000000');await page.getByRole('button',{name:'Buscar CEP',exact:true}).click();
 await page.locator('input[name=number]').fill('123');await page.locator('input[name=name]').fill('Nome preservado');
 while(!releaseCep) await new Promise(resolve=>setTimeout(resolve,10));releaseCep();
 await page.waitForFunction(()=>window.geoRequests.length===1);assert.match(await page.evaluate(()=>window.geoRequests[0].request.address),/Rua CEP QA, 123/);assert.equal(await page.locator('input[name=name]').inputValue(),'Nome preservado');
 pass('CEP preserva número e nome alterados durante a consulta; busca automática inclui número');
 const answer=async(index,latitude)=>page.evaluate(({index,latitude})=>window.geoRequests[index].callback([{geometry:{location:{lat:()=>latitude,lng:()=>-38.52}}}],'OK'),{index,latitude});
 await answer(0,-3.71);await page.getByRole('button',{name:'Confirmar localização',exact:true}).click();
 await page.locator('input[name=number]').fill('456');await page.waitForFunction(()=>window.geoRequests.length===2);assert.equal(await page.getByRole('button',{name:'Confirmar localização',exact:true}).count(),0);assert.equal(await page.evaluate(()=>window.markerState.visible),false);
 await page.locator('input[name=number]').fill('789');await page.waitForFunction(()=>window.geoRequests.length===3);await answer(2,-3.79);await answer(1,-3.74);
 await page.getByRole('button',{name:'Confirmar localização',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.markerState.position.lat),-3.79);
 pass('Alteração de endereço invalida confirmação e marcador; resposta antiga não substitui a nova');
 await page.locator('input[name=number]').fill('999');await page.waitForFunction(()=>window.geoRequests.length===4);
 await page.getByLabel('Mapa de teste').click();await page.getByRole('button',{name:'Confirmar localização',exact:true}).click();await answer(3,-3.99);assert.equal(await page.evaluate(()=>window.markerState.position.lat),-3.73);
 await page.locator('input[name=name]').fill('Mudança somente de nome');await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.geoRequests.length),4);
 pass('Escolha manual prevalece sobre consulta atrasada e alteração de nome não dispara geocodificação');
 // Edit baseline survives non-address changes; changed address requires new confirmation.
 await page.goto('http://127.0.0.1:5179/edit-generator/'+generator.id);await page.waitForFunction(()=>document.querySelector('input[name=latitude]')?.value==='-3.73');assert.equal(await page.getByLabel('Latitude',{exact:true}).inputValue(),'-3.73');await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.geoRequests.length),0);
 await page.locator('input[name=name]').fill('Gerador ficha QA editado');assert.equal(await page.getByLabel('Latitude',{exact:true}).inputValue(),'-3.73');
 await page.locator('input[name=number]').fill('77');await page.waitForFunction(()=>window.geoRequests.length===1);assert.equal(await page.getByLabel('Latitude',{exact:true}).inputValue(),'');
 await answer(0,-3.77);await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await page.getByText('Confirme a nova localização do endereço no mapa ou informe as coordenadas válidas.',{exact:true}).waitFor();
 assert.equal((await api('/generators/'+generator.id)).generator.number,'10');
 await page.getByRole('button',{name:'Confirmar localização',exact:true}).click();await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await page.waitForURL('**/generator-list');
 const saved=(await api('/generators/'+generator.id)).generator;assert.equal(saved.number,'77');assert.equal(saved.latitude,-3.77);
 pass('Edição preserva ponto existente; endereço modificado só é salvo após confirmar o novo ponto');
 // Empty database slice and responsive dialog.
 await page.route('**/generators',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"generators":[]}'}));
 await page.getByRole('button',{name:'Baixar cadastros em PDF',exact:true}).click();await page.getByText('Nenhum cadastro disponível para exportar.',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'Baixar PDF',exact:true}).isDisabled());await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.unroute('**/generators');
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await page.getByRole('button',{name:'Baixar cadastros em PDF',exact:true}).click();await page.getByLabel('Selecionar cadastro',{exact:true}).selectOption(generator.id);await page.screenshot({path:out+'/export-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 pass('Lista vazia impede exportação e diálogo permanece utilizável em 390px');
 assert.deepEqual(errors,[]);pass('Sem erros JavaScript nos fluxos verificados');
 fs.writeFileSync(out+'/results.json',JSON.stringify({passed:checks.length,checks,errors,transport:'Real local API + disposable PGlite; controlled Google Maps and CEP responses'},null,2));
} finally {await browser?.close();vite.kill('SIGTERM');}
