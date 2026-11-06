import test from 'node:test';import assert from 'node:assert/strict';
import {periodFor,formatUnits,formatEstimate} from '../src/utils/impactAnalysis.js';
test('Semana civil atravessa mês e ano corretamente',()=>assert.deepEqual(periodFor('week','2026-01-01'),{start:'2025-12-29',end:'2026-01-04'}));
test('Mês bissexto é calendário, não últimos 30 dias',()=>assert.deepEqual(periodFor('month','2024-02-19'),{start:'2024-02-01',end:'2024-02-29'}));
test('Ano completo tem início e fim explícitos',()=>assert.deepEqual(periodFor('year','2026-11-06'),{start:'2026-01-01',end:'2026-12-31'}));
test('Litros não somam à massa nem são exibidos como kg',()=>assert.equal(formatUnits({LITER:80}),'80 L'));
test('Ausência de fator difere de estimativa zero',()=>{assert.equal(formatEstimate(null,'kg CO₂e'),'Sem estimativa');assert.equal(formatEstimate(0,'kg CO₂e'),'0 kg CO₂e');});
