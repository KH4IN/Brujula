import {test} from 'node:test';
import assert from 'node:assert/strict';
import {claimGuest, readStore, recoverLegacyGuest, saveAccount, saveBudget, saveTransaction, writeStore} from './.ledger.bundle.mjs';

function storage(){
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  writeStore('guest',readStore('cuenta-sin-datos'));
}
const transaction={id:'1ebd649f-b698-40bf-8282-9948cf7c5953',amount:35,kind:'expense',category:'Alimentación',description:'Compra',occurred_on:'2026-09-20',account:'cash'};

test('los registros de invitado pasan a la cuenta con cola de sincronización sin copiarse a otra',()=>{
  storage();
  saveTransaction('guest',transaction);
  saveBudget('guest',{month:'2026-09',category:'Alimentación',amount:100});
  saveAccount('guest',{account:'cash',kind:'cash',opening_balance:30,name:'Efectivo'});
  assert.equal(claimGuest('usuario-uno'),3);
  assert.equal(readStore('usuario-uno').pending.length,3);
  assert.equal(readStore('usuario-uno').transactions.length,1);
  assert.equal(readStore('guest').transactions.length,0);
  assert.equal(claimGuest('usuario-uno'),0);
  assert.equal(claimGuest('usuario-dos'),0);
  assert.equal(readStore('usuario-dos').transactions.length,0);
});

test('reintento de importación local no duplica transacciones existentes',()=>{
  storage();
  saveTransaction('guest',transaction);
  const state=readStore('usuario-uno');state.transactions.push(transaction);writeStore('usuario-uno',state);
  assert.equal(claimGuest('usuario-uno'),0);
  assert.equal(readStore('usuario-uno').transactions.length,1);
});

test('recupera movimientos reales anteriores sin incorporar el presupuesto de muestra',()=>{
  storage();
  localStorage.removeItem('brujula.local.v2.guest');
  localStorage.setItem('brujula.demo.v1',JSON.stringify({transactions:[{...transaction,id:'s1'},transaction],budgets:[{month:'2026-09',category:'Alimentación',amount:280},{month:'2026-09',category:'Vivienda',amount:190}]}));
  assert.equal(recoverLegacyGuest(),2);
  assert.deepEqual(readStore('guest').transactions.map(t=>t.id),[transaction.id]);
  assert.deepEqual(readStore('guest').budgets.map(b=>b.category),['Vivienda']);
  assert.equal(recoverLegacyGuest(),0);
});
