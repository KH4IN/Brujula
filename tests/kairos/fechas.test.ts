// Copiado de KH4IN/Kairos (2c9efb3) tests/fechas.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ahoraEn, diferenciaDias, esFecha, sumarDias, sumarMeses } from '../../src/recibos/fechas.ts';

test('sumar meses recorta a fin de mes sin perder el día', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(sumarMeses('2026-11-15', 3), '2027-02-15');
  assert.equal(sumarMeses('2026-03-31', -1), '2026-02-28');
});

test('días y validación', () => {
  assert.equal(sumarDias('2026-12-30', 3), '2027-01-02');
  assert.equal(diferenciaDias('2026-03-28', '2026-03-30'), 2); // cambio de hora en España
  assert.ok(esFecha('2026-02-28'));
  assert.ok(!esFecha('2026-02-30'));
  assert.ok(!esFecha('30/02/2026'));
});

test('fecha y hora en la zona del usuario', () => {
  const instante = new Date('2026-09-27T22:30:00Z');
  assert.deepEqual(ahoraEn('Europe/Madrid', instante), { fecha: '2026-09-28', hora: 0, minuto: 30 });
  assert.deepEqual(ahoraEn('America/Mexico_City', instante), { fecha: '2026-09-27', hora: 16, minuto: 30 });
  assert.deepEqual(ahoraEn('Atlantic/Canary', instante), { fecha: '2026-09-27', hora: 23, minuto: 30 });
});

test('años bisiestos', () => {
  assert.ok(esFecha('2028-02-29'));
  assert.ok(esFecha('2000-02-29')); // divisible entre 400: bisiesto
  assert.ok(!esFecha('2100-02-29')); // divisible entre 100 y no entre 400: no bisiesto
  assert.ok(!esFecha('2027-02-29'));
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(sumarDias('2027-02-28', 1), '2027-03-01');
  assert.equal(diferenciaDias('2028-02-01', '2028-03-01'), 29);
  assert.equal(sumarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(sumarMeses('2028-02-29', 12), '2029-02-28');
});
