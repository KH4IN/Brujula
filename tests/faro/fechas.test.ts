// Copiado de KH4IN/Faro (0a09f70) tests/fechas.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diaSemana, finDeAno, finDeTrimestre, lunesDe, sumarMeses } from '../../src/metas/fechas.ts';

test('día de la semana ISO', () => {
  assert.equal(diaSemana('2026-09-28'), 1); // lunes
  assert.equal(diaSemana('2026-09-27'), 7); // domingo
  assert.equal(diaSemana('2024-02-29'), 4); // jueves de año bisiesto
});

test('el lunes de la semana', () => {
  assert.equal(lunesDe('2026-09-27'), '2026-09-21'); // el domingo cierra la semana
  assert.equal(lunesDe('2026-09-28'), '2026-09-28');
  assert.equal(lunesDe('2027-01-01'), '2026-12-28'); // cruza de año
});

test('fin de trimestre y de año', () => {
  assert.equal(finDeTrimestre('2026-09-27'), '2026-09-30');
  assert.equal(finDeTrimestre('2026-01-15'), '2026-03-31');
  assert.equal(finDeTrimestre('2026-11-02'), '2026-12-31');
  assert.equal(finDeAno('2026-09-27'), '2026-12-31');
});

test('años bisiestos al sumar meses', () => {
  assert.equal(sumarMeses('2024-02-29', 12), '2025-02-28');
  assert.equal(sumarMeses('2024-02-29', 48), '2028-02-29');
});
