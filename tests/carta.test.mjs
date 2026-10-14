import test from 'node:test';
import assert from 'node:assert/strict';
import {rutaDelMes, diasRecorridos, previsionGasto, mesDeLlegada, mesesEntre, rumboDelPuntero, diasDelMes, esCampoDeEdicion} from './.carta.bundle.mjs';

test('los atajos globales no se activan al escribir en formularios', () => {
  for (const etiqueta of ['INPUT', 'TEXTAREA', 'SELECT']) assert.equal(esCampoDeEdicion(etiqueta, false), true);
  assert.equal(esCampoDeEdicion('SPAN', true), true);
  assert.equal(esCampoDeEdicion('BUTTON', false), false);
});

test('la ruta del mes acumula ingresos y gastos día a día sin contar traspasos', () => {
  const ruta = rutaDelMes([
    {id:'1', amount:1000, kind:'income', category:'Otros', description:'Nómina', occurred_on:'2026-02-01'},
    {id:'2', amount:200, kind:'expense', category:'Ocio', description:'Cine', occurred_on:'2026-02-03'},
    {id:'3', amount:500, kind:'transfer', category:'Otros', description:'Traspaso', occurred_on:'2026-02-03'},
    {id:'4', amount:50, kind:'expense', category:'Ocio', description:'Otro mes', occurred_on:'2026-03-01'},
  ], '2026-02');
  assert.equal(ruta.length, 28);
  assert.equal(ruta[0].acumulado, 1000);
  assert.equal(ruta[2].sale, 200);
  assert.equal(ruta[27].acumulado, 800);
});

test('días recorridos y previsión de gasto según el mes', () => {
  assert.equal(diasDelMes('2028-02'), 29);
  assert.equal(diasRecorridos('2026-09', '2026-10-01'), 30);
  assert.equal(diasRecorridos('2026-11', '2026-10-01'), 0);
  assert.equal(diasRecorridos('2026-10', '2026-10-10'), 10);
  assert.equal(previsionGasto(100, '2026-10', '2026-10-10'), 310);
  assert.equal(previsionGasto(100, '2026-09', '2026-10-10'), 100);
});

test('mes de llegada de un objetivo', () => {
  assert.equal(mesDeLlegada(1000, 400, 100, '2026-10-01'), '2027-04');
  assert.equal(mesDeLlegada(1000, 1000, 0, '2026-10-01'), '2026-10');
  assert.equal(mesDeLlegada(1000, 0, 0, '2026-10-01'), null);
  assert.equal(mesesEntre('2027-04', '2026-10'), 6);
});

test('rumbo del puntero: norte 0, este 90, sur 180, oeste 270', () => {
  assert.equal(Math.round(rumboDelPuntero(200, 100, 200, 200)), 0);
  assert.equal(Math.round(rumboDelPuntero(300, 200, 200, 200)), 90);
  assert.equal(Math.round(rumboDelPuntero(200, 300, 200, 200)), 180);
  assert.equal(Math.round(rumboDelPuntero(100, 200, 200, 200)), 270);
});
