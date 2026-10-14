// Copiado de KH4IN/Kairos (2c9efb3) tests/elementos.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costeAnual, describirFrecuencia, ocurrencias, type Elemento } from '../../src/recibos/elementos.ts';

const base = (cambios: Partial<Elemento> = {}): Elemento => ({
  id: 'e1', nombre: 'Spotify', tipo: 'suscripcion', importe: 10.99, estimado: false,
  frecuencia: { unidad: 'mes', cada: 1 }, inicio: '2026-01-31', antelacion_dias: null, fin_permanencia: null,
  categoria: 'Suscripciones', notas: '', clave_brujula: null, activo: true, actualizado: '', ...cambios,
});

test('las mensualidades no derivan tras un mes corto', () => {
  assert.deepEqual(ocurrencias(base(), '2026-02-01', '2026-05-31'), ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
});

test('elementos antiguos y frecuencias raras', () => {
  const antiguo = base({ inicio: '2001-05-10' });
  assert.deepEqual(ocurrencias(antiguo, '2026-09-01', '2026-10-31'), ['2026-09-10', '2026-10-10']);
  const semanal = base({ frecuencia: { unidad: 'semana', cada: 2 }, inicio: '2026-09-01' });
  assert.deepEqual(ocurrencias(semanal, '2026-09-01', '2026-09-30'), ['2026-09-01', '2026-09-15', '2026-09-29']);
  const itv = base({ frecuencia: { unidad: 'año', cada: 2 }, inicio: '2024-02-29', importe: null });
  assert.deepEqual(ocurrencias(itv, '2026-01-01', '2028-12-31'), ['2026-02-28', '2028-02-29']);
  const unica = base({ frecuencia: null, inicio: '2027-03-01' });
  assert.deepEqual(ocurrencias(unica, '2026-01-01', '2027-12-31'), ['2027-03-01']);
  assert.deepEqual(ocurrencias(base(), '2026-02-01', '2026-01-01'), []);
});

test('coste anual', () => {
  assert.equal(costeAnual(base()), 131.88);
  assert.equal(costeAnual(base({ frecuencia: { unidad: 'mes', cada: 3 }, importe: 30 })), 120);
  assert.equal(costeAnual(base({ importe: null })), 0);
  assert.equal(costeAnual(base({ frecuencia: null })), 0);
});

test('frecuencias en palabras', () => {
  assert.equal(describirFrecuencia({ unidad: 'mes', cada: 3 }), 'Cada trimestre');
  assert.equal(describirFrecuencia({ unidad: 'semana', cada: 2 }), 'Cada 2 semanas');
  assert.equal(describirFrecuencia(null), 'Una vez');
});

test('bisiestos: lo anual del 29 de febrero vuelve al 29 cuando existe', () => {
  const anual = base({ frecuencia: { unidad: 'año', cada: 1 }, inicio: '2024-02-29' });
  assert.deepEqual(ocurrencias(anual, '2025-01-01', '2028-12-31'), ['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  const mensual = base({ inicio: '2027-12-30' });
  assert.deepEqual(ocurrencias(mensual, '2028-01-01', '2028-03-31'), ['2028-01-30', '2028-02-29', '2028-03-30']);
  const semanal = base({ frecuencia: { unidad: 'semana', cada: 1 }, inicio: '2028-02-22' });
  assert.deepEqual(ocurrencias(semanal, '2028-02-22', '2028-03-07'), ['2028-02-22', '2028-02-29', '2028-03-07']);
  // Un año bisiesto no cambia el coste anual de una mensualidad.
  assert.equal(costeAnual(base({ importe: 20 })), 240);
});
