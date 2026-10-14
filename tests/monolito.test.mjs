import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const { outputFiles: [salida] } = await build({ entryPoints: [new URL('../src/monolito/puntos.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node' });
const { cienPuntos, medidorPresupuesto, digitos, unidadPuntos, unidadDeposito } = await import('data:text/javascript;base64,' + Buffer.from(salida.text).toString('base64'));

test('cien puntos: siempre suman cien y respetan la proporción', () => {
  const r = cienPuntos([{ v: 780 }, { v: 190 }, { v: 120 }, { v: 140 }, { v: 70 }, { v: 212 }, { v: 968 }]);
  assert.equal(r.reduce((s, g) => s + g.p, 0), 100);
  assert.deepEqual(r.map((g) => g.p), [31, 8, 5, 6, 3, 8, 39]);
  assert.deepEqual(cienPuntos([{ v: 1 }, { v: 1 }, { v: 1 }]).map((g) => g.p).sort(), [33, 33, 34]);
  assert.deepEqual(cienPuntos([{ v: 0 }]).map((g) => g.p), [0]);
});

test('medidor de presupuesto en puntos de 10 €', () => {
  assert.equal(medidorPresupuesto(138, 280, 214), '14:on,7:hueco,7:off,|');
  assert.equal(medidorPresupuesto(138, 280, 304), '14:on,14:hueco-rojo,|,2:hueco-rojo');
  assert.equal(medidorPresupuesto(300, 280, 400), '28:on,|,2:rojo,10:hueco-rojo');
  assert.equal(digitos(1630.4), '1630');
});

test('cuentas: un punto vale lo justo para que el patrimonio quepa', () => {
  assert.equal(unidadPuntos(9248), 100);
  assert.equal(unidadPuntos(15000), 200);
  assert.equal(unidadPuntos(250000), 5000);
  assert.equal(unidadPuntos(0), 100);
});

test('metas: un punto vale 50 € salvo que la meta mayor no quepa', () => {
  assert.equal(unidadDeposito(6000), 50);
  assert.equal(unidadDeposito(15000), 100);
  assert.equal(unidadDeposito(30000), 200);
  assert.equal(unidadDeposito(100000), 1000);
});
