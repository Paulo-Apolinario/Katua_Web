// Companion to the API sales runner, using its disposable database.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../frontend/',import.meta.url));
const require=createRequire(process.env.KATUA_VALIDATION_TOOLS+'/package.json'),mod=require('@sparticuz/chromium'),binary=mod.default||mod,{chromium}=require('playwright');
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4183'],{cwd:root,stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4183')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:await binary.executablePath(),args:binary.args.filter(a=>a!=='--single-process'),headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(token=>{localStorage.setItem('auth_token',token);localStorage.setItem('auth_user',JSON.stringify({id:'a',role:'COOPERATIVE',displayName:'Cooperativa a'}));},process.env.SALES_UI_TOKEN);
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(['fetch','xhr'].includes(req.resourceType())){const r=await fetch('http://127.0.0.1:3343'+u.pathname+u.search,{method:req.method(),headers:{'content-type':'application/json',authorization:'Bearer '+process.env.SALES_UI_TOKEN},body:['GET','HEAD'].includes(req.method())?undefined:req.postData()});return route.fulfill({status:r.status,contentType:'application/json',body:await r.text()});}return route.continue();});
 await page.goto('http://127.0.0.1:4183/sales');
 await page.getByRole('button',{name:'Preparar nota',exact:true}).waitFor();
 await page.getByRole('button',{name:'Preparar nota',exact:true}).click();
 await page.getByRole('heading',{name:'Preparar nota da venda',exact:true}).waitFor();
 await page.getByLabel('Preço unitário (KG)',{exact:true}).fill('1,25');
 await page.getByRole('button',{name:'Salvar valores da nota',exact:true}).click();
 const button=page.getByRole('button',{name:'Baixar preparação salva (PDF)',exact:true});await button.waitFor();
 const dl=page.waitForEvent('download');await button.click();const pdf=await dl;await pdf.saveAs('/tmp/katua-sale-danfe.pdf');assert.match(pdf.suggestedFilename(),/SEM-VALIDADE.pdf/);
 // Close the modal, then review the six operational sections with the real API.
 await page.keyboard.press('Escape');
 await page.goto('http://127.0.0.1:4183/waste-stock');await page.getByRole('heading',{name:'Estoque e lotes',exact:true}).waitFor();
 await page.getByRole('button',{name:'Ver lotes',exact:true}).first().click();await page.getByRole('link',{name:'Movimentar lote',exact:true}).first().waitFor();
 await page.getByRole('link',{name:'Registrar saída',exact:true}).count();
 for(const [path,title] of [['collected-waste','Resíduos Coletados'],['waste-destinations','Movimentações'],['mixed-bags','Triagem e bags'],['waste-type-list','Catálogo de materiais'],['sales','Vendas']]){
  await page.goto('http://127.0.0.1:4183/'+path);await page.getByRole('heading',{name:title,exact:true}).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'Gestão de resíduos',exact:true}).getByRole('link').count(),6);
  await page.screenshot({path:'/tmp/katua-'+path+'-desktop.png',fullPage:true,animations:"disabled"});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/katua-'+path+'-mobile.png',fullPage:true,animations:"disabled"});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path+' mobile overflow');await page.setViewportSize({width:1440,height:1000});
 }
 assert.deepEqual(errors,[]);console.log('PASS: navegador com API real — Vendas, salvar preço na preparação, PDF, seis seções de resíduos, lotes expansíveis e telas móveis');
}finally{await browser?.close();vite.kill('SIGTERM');}
