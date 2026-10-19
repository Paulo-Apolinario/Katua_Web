import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMtrPreparation, collectionMaterials, routeTeam, MTR_PORTALS, dateKey } from '../src/utils/mtrPreparation.js';
const route={id:'r1',name:'Rota real',status:'IN_PROGRESS',driver:{id:'new',name:'Motorista atual'},vehicle:{id:'new-car',plate:'ATU1234'},cooperative:{name:'Cooperativa real'}};
test('MTR: equipe histórica não é substituída pela equipe atual da rota',()=>{
 const p=buildMtrPreparation(route,{id:'c1',status:'COLLECTED',driver:{id:'old',name:'Motorista anterior'},vehicle:{id:'old-car',plate:'HIS1234'}},MTR_PORTALS[0]);assert.ok(p.text.includes('Motorista anterior'));assert.ok(p.text.includes('HIS1234'));assert.ok(!p.text.includes('Motorista atual'));
 assert.equal(routeTeam(route,{status:'RECEIVED',driver:null,vehicle:null}).driver,null);
 assert.equal(routeTeam(route,{status:'PENDING',driver:null,vehicle:null}).driver.name,'Motorista atual');
 assert.equal(routeTeam(route,{status:'PENDING',driverId:'missing-relation',driver:null}).driver,null);
});
test('MTR: dados ausentes e zero padrão não viram peso ou emissão fictícios',()=>{
 const p=buildMtrPreparation(route,{id:'c1',status:'PENDING',totalWeightKg:0,materials:null},MTR_PORTALS[0]);
 assert.ok(p.text.includes('Não informado / não aferido'));assert.ok(p.text.includes('NÃO É UM MTR OFICIAL'));assert.ok(p.text.includes('Não consultada pelo KATUÁ'));assert.equal(p.materials.length,0);assert.ok(p.missing.includes('Identificação do gerador'));
 assert.equal(dateKey(null),'');assert.equal(dateKey('inválida'),'');
});
test('MTR: quantidade e unidade são preservadas sem conversão entre resíduos',()=>{
 const items=collectionMaterials({materials:[{name:'Óleo',quantity:2.5,unit:'L'},{name:'Papel',quantityKg:3},{name:'Sem quantidade',quantity:null}]});
 assert.deepEqual(items.map(i=>[i.quantity,i.unit]),[['2,5','L'],['3','KG'],['Não informada','Não informada']]);
 const p=buildMtrPreparation(route,{id:'c2',status:'COLLECTED',generator:{companyName:'Gerador real',street:'Rua A',number:'10',city:'Manaus',state:'AM'},totalWeightKg:12.34,materials:[{name:'Papel',quantity:12.34,unit:'KG'}]},MTR_PORTALS[0]);
 assert.ok(p.text.includes('Gerador real'));assert.ok(p.text.includes('Rua A, 10, Manaus, AM'));assert.ok(p.text.includes('12,34'));assert.ok(!p.missing.includes('Endereço do gerador'));
});
test('MTR: destinos de emissão são fixos, HTTPS e sem dados da operação na URL',()=>{
 assert.equal(new Set(MTR_PORTALS.map(p=>p.id)).size,MTR_PORTALS.length);
 for(const p of MTR_PORTALS){const u=new URL(p.url);assert.equal(u.protocol,'https:');assert.equal(u.search,'');assert.equal(u.hash,'');assert.ok(u.hostname.endsWith('.gov.br'));}
});
