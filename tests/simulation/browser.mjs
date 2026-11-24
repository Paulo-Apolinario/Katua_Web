// Optional companion to server/tests/simulation/run.mjs: real isolated API + Chromium.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../frontend/',import.meta.url));
const require=createRequire(process.env.KATUA_VALIDATION_TOOLS+'/package.json');
const mod=require('@sparticuz/chromium'),binary=mod.default||mod;
const {chromium}=require('playwright');
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4179'],{cwd:root,stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4179')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:await binary.executablePath(),args:binary.args.filter(a=>a!=='--single-process'),headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(token=>{localStorage.setItem('auth_token',token);localStorage.setItem('auth_user',JSON.stringify({id:'ui',role:'COOPERATIVE',displayName:'CoopApolinario UI'}));},process.env.SIMULATION_UI_TOKEN);
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.pathname.startsWith('/auth/')||u.pathname.startsWith('/simulation/')||u.pathname.startsWith('/users/')||u.pathname.startsWith('/notifications')||u.pathname.startsWith('/cooperatives/')){
   const r=await fetch('http://127.0.0.1:3341'+u.pathname+u.search,{method:req.method(),headers:{'content-type':'application/json',authorization:'Bearer '+process.env.SIMULATION_UI_TOKEN},body:['GET','HEAD'].includes(req.method())?undefined:req.postData()});
   return route.fulfill({status:r.status,contentType:'application/json',body:await r.text()});
  }
  return route.continue();
 });
 await page.goto('http://127.0.0.1:4179/simulation');
 await page.getByRole('heading',{name:'1. Estoque demonstrativo'}).waitFor();
 await page.getByRole('button',{name:'Ver prévia dos lotes',exact:true}).click();
 await page.getByText('Prévia das quantidades por lote').waitFor();
 await page.getByRole('button',{name:'Salvar venda simulada',exact:true}).click();
 await page.getByRole('heading',{name:/SIM-VENDA-1/}).waitFor();
 await page.getByLabel('Preço unitário de Papelão',{exact:true}).fill('0,80');
 await page.getByRole('button',{name:'Salvar valores da nota simulada',exact:true}).click();
 await page.getByText('Total preparado:',{exact:false}).waitFor();
 await page.getByLabel('Cenário de resposta NFE').selectOption('UNCERTAIN');
 await page.getByRole('button',{name:'Gerar NF-e simulada',exact:true}).click();
 await page.getByRole('button',{name:'Consultar resultado do documento NFE',exact:true}).click();
 await page.getByRole('button',{name:'Baixar NF-e simulada (PDF)',exact:true}).waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar NF-e simulada (PDF)',exact:true}).click();
 const pdf=await download;assert.match(pdf.suggestedFilename(),/SEM-VALIDADE.pdf$/);await pdf.saveAs('/tmp/katua-simulation-nfe.pdf');
 await page.getByRole('button',{name:'Gerar MTR simulado',exact:true}).click();
 await page.getByRole('button',{name:'Confirmar saída no estoque de simulação',exact:true}).click();
 await page.getByRole('button',{name:'Confirmar recebimento simulado',exact:true}).waitFor();
 const row=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'SIM-LOT-003',exact:true})}).first();assert.match(await row.innerText(),/100 kg/);
 await page.getByRole('button',{name:'Confirmar recebimento simulado',exact:true}).click();
 await page.getByRole('button',{name:'Gerar CDF simulado',exact:true}).click();
 await page.getByRole('button',{name:'Baixar CDF simulado (PDF)',exact:true}).waitFor();
 await page.getByLabel('Valor do pagamento simulado').fill('100');
 await page.getByRole('button',{name:'Registrar pagamento simulado',exact:true}).click();
 await page.getByText(/Pendente no teste:.*220,00/).waitFor();
 await page.getByRole('button',{name:'Cancelar NF-e simulada',exact:true}).click();
 await page.getByRole('button',{name:'Gerar NF-e simulada',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/katua-simulation-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Page overflows mobile viewport');
 await page.getByRole('button',{name:'Reiniciar simulação',exact:true}).click();
 const resetDialog=page.getByRole('dialog',{name:'Reiniciar simulação?',exact:true});await resetDialog.waitFor();
 assert.equal(await resetDialog.getByRole('button',{name:'Confirmar reinício',exact:true}).isDisabled(),true);
 await resetDialog.getByRole('button',{name:'Voltar',exact:true}).click();
 await page.getByRole('button',{name:'Baixar CDF simulado (PDF)',exact:true}).waitFor();
 await page.getByRole('button',{name:'Reiniciar simulação',exact:true}).click();
 await resetDialog.getByRole('checkbox').check();await resetDialog.getByRole('button',{name:'Confirmar reinício',exact:true}).click();
 await page.getByText('Nenhuma venda simulada criada.',{exact:true}).waitFor();
 const restored=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'SIM-LOT-003',exact:true})}).first();assert.match(await restored.innerText(),/130 kg/);
 assert.equal(await page.getByLabel('Quantidade 1',{exact:true}).inputValue(),'400');
 await page.reload();await page.getByText('Nenhuma venda simulada criada.',{exact:true}).waitFor();
 console.log('PASS: reinício com confirmação, voltar sem alterações, saldos restaurados, formulários limpos e persistência após recarregar');
 assert.deepEqual(errors,[]);
 console.log('PASS: Chromium com API real — prévia, rascunho, resposta perdida/consulta, download PDF, MTR, saldo parcial, recebimento/CDF, pagamento, cancelamento e tela móvel');
}finally{await browser?.close();vite.kill('SIGTERM');}
