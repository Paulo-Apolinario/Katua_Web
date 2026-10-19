import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function loadService(name, exports) {
  const calls = [];
  const source = (await readFile(new URL(`../src/services/${name}.js`, import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace(/export const /g, 'const ');
  const apiRequest = async (url, options) => { calls.push({ url, ...options, body: options.body ? JSON.parse(options.body) : undefined }); return { success: true }; };
  return { calls, ...new Function('apiRequest', `${source}\nreturn { ${exports.join(', ')} };`)(apiRequest) };
}

test('rota: preservar null, omissão e vírgulas no endereço', async () => {
  const service = await loadService('routeService', ['updateRoute', 'createRoute']);
  await service.updateRoute('r1', { name: ' Rota ', description: null, driverId: null, vehicleId: null, scheduledDate: null, status: 'IN_PROGRESS' });
  assert.deepEqual(service.calls[0].body, { name: 'Rota', description: null, driverId: null, vehicleId: null, scheduledDate: null, status: 'IN_PROGRESS' });
  assert.equal('stops' in service.calls[0].body, false);
  await service.updateRoute('r1', { stops: [' Rua A, 123 ', ''] });
  assert.deepEqual(service.calls[1].body, { stops: ['Rua A, 123'] });
  await service.updateRoute('r1', { stops: [] });
  assert.deepEqual(service.calls[2].body, { stops: [] });
  await service.createRoute({ name: 'Nova', driverId: null, scheduledDate: null });
  assert.deepEqual(service.calls[3].body, { name: 'Nova' });
});

test('veículo: edição completa no PATCH geral e preservação de campos omitidos', async () => {
  const service = await loadService('vehicleService', ['updateVehicle']);
  await service.updateVehicle('v1', { plate: ' abc1234 ', model: ' Modelo ', brand: null, year: null, capacityKg: 0, driverId: null, status: 'INACTIVE' });
  assert.equal(service.calls[0].url, '/vehicles/v1');
  assert.equal(service.calls[0].method, 'PATCH');
  assert.deepEqual(service.calls[0].body, { plate: 'ABC1234', model: 'Modelo', brand: null, driverId: null, year: null, capacityKg: 0, status: 'INACTIVE' });
  await service.updateVehicle('v1', { brand: 'Nova' });
  assert.deepEqual(service.calls[1].body, { brand: 'Nova' });
});
