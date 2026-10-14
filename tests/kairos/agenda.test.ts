// Copiado de KH4IN/Kairos (2c9efb3) tests/agenda.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citas, finDeVentana, proximosPendientes, resumenAnual, sinConfirmar, totalPrevisto } from '../../src/recibos/agenda.ts';
import type { Cobro, Elemento } from '../../src/recibos/elementos.ts';

const el = (id: string, cambios: Partial<Elemento>): Elemento => ({
  id, nombre: id, tipo: 'recibo', importe: 10, estimado: false, frecuencia: { unidad: 'mes', cada: 1 }, inicio: '2026-01-05',
  antelacion_dias: null, fin_permanencia: null, categoria: 'Otros', notas: '', clave_brujula: null, activo: true, actualizado: '', ...cambios,
});
const luz = el('Luz', { importe: 60, estimado: true, frecuencia: { unidad: 'mes', cada: 2 }, inicio: '2026-01-20', categoria: 'Vivienda' });
const netflix = el('Netflix', { importe: 12.99, inicio: '2026-01-10', categoria: 'Suscripciones' });
const itv = el('ITV', { importe: null, frecuencia: { unidad: 'año', cada: 1 }, inicio: '2026-10-15' });
const baja = el('Baja', { activo: false });

test('citas del mes y total previsto con importes reales', () => {
  const lista = citas([luz, netflix, itv, baja], [], '2026-09-01', '2026-10-31');
  assert.deepEqual(lista.map((c) => `${c.fecha} ${c.elemento.id}`), ['2026-09-10 Netflix', '2026-09-20 Luz', '2026-10-10 Netflix', '2026-10-15 ITV']);
  const cobro: Cobro = { id: 'c', elemento_id: 'Luz', fecha_prevista: '2026-09-20', fecha_real: '2026-09-21', importe_real: 74, estado: 'pagado', transaction_id: null, actualizado: '' };
  assert.equal(totalPrevisto(citas([luz, netflix], [cobro], '2026-09-01', '2026-09-30')), 86.99);
});

test('sin confirmar: solo lo pasado reciente sin cobro', () => {
  assert.deepEqual(sinConfirmar([netflix, luz], [], '2026-09-25').map((c) => c.elemento.id), ['Luz']);
});

test('próximos 30 días excluye lo pagado hoy y conserva el siguiente mes', () => {
  const ocho = el('Ocho', { importe: 8, inicio: '2026-09-27' });
  const pagado: Cobro = { id: 'c8', elemento_id: ocho.id, fecha_prevista: '2026-09-27', fecha_real: '2026-09-27', importe_real: 8, estado: 'pagado', transaction_id: null, actualizado: '' };
  const pendientes = proximosPendientes(citas([ocho], [pagado], '2026-09-27', '2026-10-27'));
  assert.deepEqual(pendientes.map((c) => c.fecha), ['2026-10-27']);
  assert.equal(totalPrevisto(pendientes), 8);
});

test('resumen anual', () => {
  const r = resumenAnual([luz, netflix, itv, baja]);
  assert.deepEqual(r.filas.map((f) => [f.elemento.id, f.anual]), [['Luz', 360], ['Netflix', 155.88]]);
  assert.equal(r.anual, 515.88);
  assert.equal(r.mensual, 42.99);
  assert.deepEqual(r.categorias.map((c) => c.categoria), ['Vivienda', 'Suscripciones']);
});

test('próximos 30 días: un recibo mensual de hoy no aparece dos veces', () => {
  const recibo = el('Gimnasio', { importe: 20, inicio: '2026-09-27' });
  const hoy = '2026-09-27';
  const lista = citas([recibo], [], hoy, finDeVentana(hoy, 30));
  assert.deepEqual(lista.map((c) => c.fecha), ['2026-09-27']); // el 27-10 queda fuera: son 30 días, no 31
  assert.equal(totalPrevisto(lista), 20);
  // Y si el de hoy ya se pagó, no queda nada pendiente.
  const pagado: Cobro = { id: 'p', elemento_id: 'Gimnasio', fecha_prevista: hoy, fecha_real: hoy, importe_real: 20, estado: 'pagado', transaction_id: null, actualizado: '' };
  assert.equal(totalPrevisto(proximosPendientes(citas([recibo], [pagado], hoy, finDeVentana(hoy, 30)))), 0);
  assert.equal(finDeVentana('2028-02-15', 30), '2028-03-15'); // febrero bisiesto: 15-02 + 29 días
});
