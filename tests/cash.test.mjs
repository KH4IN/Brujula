import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASH_DENOMINATIONS,cashTotalCents,validCashCounts } from './.cash.bundle.mjs';

test('el inventario incluye todos los billetes y monedas de euro solicitados',()=>{
  assert.deepEqual(CASH_DENOMINATIONS.map(d=>d.cents),[50000,20000,10000,5000,2000,1000,500,200,100,50,20,10,5,2,1]);
  assert.equal(cashTotalCents({'50000':1,'200':2,'50':1,'1':3}),50453);
});

test('cantidades no enteras, negativas o desmesuradas no alteran el recuento',()=>{
  for(const invalid of [{'500':-1},{'1':0.5},{'2':100001},{'3':1}]){
    assert.equal(validCashCounts(invalid),false);
    assert.throws(()=>cashTotalCents(invalid));
  }
});
