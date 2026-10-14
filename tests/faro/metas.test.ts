// Copiado de KH4IN/Faro (0a09f70) tests/metas.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajustesIniciales, objetivosSinMeta, progreso, racha, revisionPendiente, ritmo, validarMeta,
  type Meta, type Paso, type Registro,
} from '../../src/metas/metas.ts';

const meta = (m: Partial<Meta>): Meta => ({
  id: 'm1', titulo: 'Meta', motivo: '', progreso: 'pasos', objetivo: null, unidad: '', objetivo_brujula: null,
  inicio: '2026-07-01', fecha_limite: null, estado: 'activa', actualizado: '', ...m,
});
const paso = (id: string, hecho: boolean, meta_id = 'm1'): Paso => ({ id, meta_id, texto: id, hecho, fecha_hecho: null, orden: 0, actualizado: '' });
const reg = (fecha: string, valor = 1, meta_id = 'm1'): Registro => ({ id: fecha + valor, meta_id, fecha, valor, nota: '', actualizado: '' });

test('progreso por pasos', () => {
  const p = progreso(meta({}), [paso('a', true), paso('b', false), paso('c', true), paso('x', true, 'otra')], [], [], '2026-09-27');
  assert.equal(p.texto, '2 de 3 pasos');
  assert.ok(Math.abs(p.fraccion - 2 / 3) < 1e-9);
});

test('una meta lograda cuenta como completa', () => {
  assert.equal(progreso(meta({ estado: 'lograda' }), [paso('a', false)], [], [], '2026-09-27').fraccion, 1);
});

test('progreso numérico suma los registros', () => {
  const m = meta({ progreso: 'numero', objetivo: 100, unidad: 'km' });
  const p = progreso(m, [], [reg('2026-09-01', 10.5), reg('2026-09-02', 4.5), reg('2026-09-03', 3, 'otra')], [], '2026-09-27');
  assert.equal(p.actual, 15);
  assert.equal(p.texto, '15 de 100 km');
  assert.equal(p.fraccion, 0.15);
});

test('dinero enlazado: Brújula manda sobre lo apuntado en Faro', () => {
  const m = meta({ progreso: 'dinero', objetivo: 5000, objetivo_brujula: 'g1' });
  const g = { id: 'g1', name: 'Japón', target_amount: 3000, saved_amount: 750, due_on: null };
  const p = progreso(m, [], [reg('2026-09-01', 999)], [g], '2026-09-27');
  assert.equal(p.actual, 750);
  assert.equal(p.objetivo, 3000);
  assert.equal(p.fraccion, 0.25);
  assert.ok(p.desdeBrujula);
});

test('dinero sin enlazar suma las aportaciones', () => {
  const p = progreso(meta({ progreso: 'dinero', objetivo: 1000 }), [], [reg('2026-09-01', 200), reg('2026-09-10', 50)], [], '2026-09-27');
  assert.equal(p.actual, 250);
  assert.equal(p.fraccion, 0.25);
});

test('hábito: días distintos de esta semana (de lunes a domingo)', () => {
  const m = meta({ progreso: 'habito', objetivo: 3 });
  // Semana del 21 al 27 de septiembre de 2026; el 20 es de la anterior.
  const r = [reg('2026-09-20'), reg('2026-09-21'), reg('2026-09-21', 2), reg('2026-09-24')];
  const p = progreso(m, [], r, [], '2026-09-27');
  assert.equal(p.actual, 2);
  assert.equal(p.texto, '2 de 3 veces esta semana');
});

test('racha de semanas cumplidas', () => {
  const m = meta({ progreso: 'habito', objetivo: 2, inicio: '2026-08-01' });
  const r = [
    reg('2026-09-07'), reg('2026-09-09'), // semana del 7: cumplida
    reg('2026-09-14'), reg('2026-09-18'), // semana del 14: cumplida
    reg('2026-09-22'), // semana del 21 (en curso): aún no
  ];
  assert.equal(racha(m, r, '2026-09-23'), 2);
  assert.equal(racha(m, [...r, reg('2026-09-23')], '2026-09-23'), 3);
  assert.equal(racha(m, r.slice(2), '2026-09-23'), 1); // la del 7 no se cumplió: se corta
});

test('ritmo frente al plazo', () => {
  const m = meta({ progreso: 'numero', objetivo: 100, inicio: '2026-01-01', fecha_limite: '2026-12-31' });
  const con = (actual: number) => progreso(m, [], [reg('2026-01-02', actual)], [], '2026-07-02');
  assert.equal(ritmo(m, con(50), '2026-07-02'), 'en-ritmo'); // mitad del año, mitad hecho
  assert.equal(ritmo(m, con(20), '2026-07-02'), 'detras');
  assert.equal(ritmo(m, con(80), '2026-07-02'), 'adelantada');
  assert.equal(ritmo(m, con(20), '2027-01-05'), 'vencida');
  assert.equal(ritmo({ ...m, fecha_limite: null }, con(20), '2026-07-02'), null);
  assert.equal(ritmo({ ...m, estado: 'pausada' }, con(20), '2026-07-02'), null);
});

test('la revisión toca el día y el minuto elegidos, en la zona del usuario', () => {
  const a = { ...ajustesIniciales('Europe/Madrid'), dia_revision: 7, hora_revision: 19, minuto_revision: 30 };
  // Domingo 27-09-2026. Madrid va en UTC+2: 19:30 locales son 17:30 UTC.
  assert.equal(revisionPendiente(a, [], new Date('2026-09-27T17:29:00Z')), null);
  assert.deepEqual(revisionPendiente(a, [], new Date('2026-09-27T17:30:00Z')), { semana: '2026-09-21', clave: 'revision:2026-09-21' });
  // Ya hecha esta semana: no se avisa.
  assert.equal(revisionPendiente(a, [{ semana: '2026-09-21' }], new Date('2026-09-27T18:00:00Z')), null);
  // El lunes empieza otra semana y aún no toca.
  assert.equal(revisionPendiente(a, [], new Date('2026-09-28T08:00:00Z')), null);
});

test('si el día elegido ya pasó en la semana, la revisión sigue pendiente', () => {
  const a = { ...ajustesIniciales('Atlantic/Canary'), dia_revision: 5, hora_revision: 9, minuto_revision: 0 };
  // Sábado 26-09-2026 en Canarias: el viernes ya pasó.
  assert.ok(revisionPendiente(a, [], new Date('2026-09-26T10:00:00Z')));
});

test('objetivos de Brújula aún sin meta', () => {
  const g = (id: string) => ({ id, name: id, target_amount: 100, saved_amount: 0, due_on: null });
  const libres = objetivosSinMeta([g('a'), g('b'), g('c')], [meta({ objetivo_brujula: 'a' })], ['c']);
  assert.deepEqual(libres.map((x) => x.id), ['b']);
});

test('validación de metas', () => {
  assert.equal(validarMeta(meta({ titulo: '  ' })), 'Ponle un nombre a la meta.');
  assert.match(validarMeta(meta({ progreso: 'habito', objetivo: 8 }))!, /1 a 7/);
  assert.match(validarMeta(meta({ progreso: 'numero', objetivo: null }))!, /cantidad/);
  assert.equal(validarMeta(meta({ progreso: 'dinero', objetivo: null, objetivo_brujula: 'g1' })), null);
  assert.match(validarMeta(meta({ fecha_limite: '2026-06-01' }))!, /anterior/);
  assert.equal(validarMeta(meta({ titulo: 'Correr una media maratón' })), null);
});
