import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = await readFile(new URL('../src/components/RouteAssignmentSummary.jsx', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), module, module.exports);
const Summary = module.exports.default;

test('equipe da rota exibe motorista, modelo e placa juntos', () => {
  const html = renderToStaticMarkup(createElement(Summary, { route: { driver: { name: 'Ana' }, vehicle: { brand: 'Marca', model: 'Caminhão', plate: 'ABC1234' } } }));
  for (const value of ['Motorista:', 'Ana', 'Veículo:', 'Marca', 'Caminhão', 'ABC1234']) assert.ok(html.includes(value));
});

test('rota sem equipe informa vínculos ausentes', () => {
  const html = renderToStaticMarkup(createElement(Summary, { route: { driver: null, vehicle: null } }));
  assert.equal((html.match(/Não vinculado/g) || []).length, 2);
});
