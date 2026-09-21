import {test} from 'node:test';
import assert from 'node:assert/strict';
import {claimGuest, importTransactions, mergeUnusedBank, readStore, recoverLegacyGuest, saveAccount, saveBudget, saveTransaction, writeStore} from './.ledger.bundle.mjs';

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

test('quitar un banco sin movimientos mueve el saldo inicial y deja ambas operaciones pendientes',()=>{
  storage();
  saveAccount('usuario-uno',{account:'bank',kind:'bank',opening_balance:100,name:'Santander'});
  saveAccount('usuario-uno',{account:'bank:caixa',kind:'bank',opening_balance:1000,name:'Caixa'});
  const result=mergeUnusedBank('usuario-uno','bank:caixa','bank');
  assert.equal(result.account_settings.find(a=>a.account==='bank').opening_balance,1100);
  assert.equal(result.account_settings.some(a=>a.account==='bank:caixa'),false);
  assert.deepEqual(result.pending.filter(p=>p.entity==='account_settings').map(p=>[p.method,p.id]),[['upsert','bank'],['delete','bank:caixa']]);
});

test('un banco con movimientos o inversiones no se puede quitar ni altera sus saldos',()=>{
  storage();
  saveAccount('usuario-uno',{account:'bank:caixa',kind:'bank',opening_balance:1000,name:'Caixa'});
  saveTransaction('usuario-uno',{...transaction,account:'bank:caixa'});
  assert.throws(()=>mergeUnusedBank('usuario-uno','bank:caixa','bank'),/movimientos o inversiones/);
  assert.equal(readStore('usuario-uno').account_settings.find(a=>a.account==='bank:caixa').opening_balance,1000);
  const state=readStore('usuario-dos');state.account_settings.push({account:'bank:caixa',kind:'bank',opening_balance:1000,name:'Caixa'});
  state.investments.push({id:'invest',name:'ETF',ticker:'ETF',units:1,average_cost:100,current_price:100,funding_account:'bank:caixa',purchased_on:null});writeStore('usuario-dos',state);
  assert.throws(()=>mergeUnusedBank('usuario-dos','bank:caixa','bank'),/movimientos o inversiones/);
  assert.throws(()=>mergeUnusedBank('usuario-dos','bank','bank:caixa'),/banco adicional/);
});

test('un navegador conserva cambios pendientes sin mezclar cuentas ni reemplazar los del otro',()=>{
  const browserA=new Map(),browserB=new Map();
  const useBrowser=values=>{globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}};
  useBrowser(browserA);
  saveTransaction('usuario-uno',transaction);
  useBrowser(browserB);
  saveTransaction('usuario-uno',{...transaction,id:'99513a75-718b-4bdf-a452-594a47405d52',amount:12});
  saveTransaction('usuario-dos',{...transaction,id:'04f6709b-3695-4c07-b81b-3962a284760c',amount:9});
  assert.equal(readStore('usuario-uno').pending.length,1);
  assert.equal(readStore('usuario-dos').transactions.length,1);
  useBrowser(browserA);
  assert.deepEqual(readStore('usuario-uno').transactions.map(t=>t.amount),[35]);
  assert.equal(readStore('usuario-uno').pending.length,1);
  assert.equal(readStore('usuario-dos').transactions.length,0);
});

test('una importación extensa reintentada conserva una sola copia local por clave bancaria',()=>{
  storage();
  const rows=Array.from({length:501},(_,i)=>({...transaction,id:crypto.randomUUID(),import_key:`banco-${i}`,amount:i+1}));
  const first=importTransactions('usuario-uno',rows);
  assert.equal(first.transactions.length,501);
  assert.equal(first.pending.length,501);
  const again=importTransactions('usuario-uno',rows);
  assert.equal(again.transactions.length,501);
  assert.equal(again.pending.length,501);
});
