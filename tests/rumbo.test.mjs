import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rumboDelMes, grados3, temaGuardado, arcos} from './.rumbo.bundle.mjs';

test('la aguja apunta al norte cuando se ahorra y al sur cuando se gasta de más',()=>{
  assert.deepEqual(rumboDelMes(1000,0),{grados:0,ahorro:100,zona:'norte',texto:'Rumbo norte: ahorras el 100 % de lo que entra.'});
  assert.equal(rumboDelMes(1000,1000).grados,90);
  assert.equal(rumboDelMes(1000,1000).zona,'este');
  assert.equal(rumboDelMes(1000,2000).grados,180);
  assert.equal(rumboDelMes(1000,5000).grados,180,'se limita al sur');
  assert.equal(rumboDelMes(2480,1815.4).grados,66);
  assert.equal(rumboDelMes(2480,1815.4).ahorro,27);
});
test('sin ingresos ni gastos la aguja queda en calma y sin porcentaje',()=>{
  const r=rumboDelMes(0,0);assert.equal(r.zona,'calma');assert.equal(r.ahorro,null);
  assert.equal(rumboDelMes(0,40).zona,'sur');
});
test('los grados se muestran con tres cifras',()=>{
  assert.equal(grados3(0),'000°');assert.equal(grados3(66),'066°');assert.equal(grados3(180),'180°');
});
test('sin preferencia se usa el tema nuevo y se ignoran valores antiguos',()=>{
  assert.equal(temaGuardado(null),'nuevo');assert.equal(temaGuardado('ultra'),'nuevo');assert.equal(temaGuardado('medium'),'nuevo');
  assert.equal(temaGuardado('antiguo'),'antiguo');assert.equal(temaGuardado('clasico'),'clasico');
});
test('los arcos cubren la circunferencia en proporción al gasto',()=>{
  const a=arcos([{category:'Vivienda',total:300},{category:'Ocio',total:100}],400,0);
  assert.equal(a.length,2);assert.equal(a[0].largo,300);assert.equal(a[1].inicio,300);
  assert.deepEqual(arcos([],400),[]);
});
