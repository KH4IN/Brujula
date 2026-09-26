import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountBalances, cashOpeningForBalance, marketValue, monthSummary } from './.finance.bundle.mjs';

test('dos bancos, efectivo y traspasos no duplican el patrimonio', () => {
  const settings=[{account:'bank',opening_balance:100},{account:'bank:df02134b-53c9-42ec-9437-c078965d0172',opening_balance:2350},{account:'cash',opening_balance:30}];
  const transactions=[
    {account:'bank',to_account:settings[1].account,kind:'transfer',amount:20},
    {account:'cash',kind:'expense',amount:5},
    {account:settings[1].account,kind:'income',amount:10}
  ];
  const balances=accountBalances(transactions,settings,[]);
  assert.deepEqual(balances,{bank:80,cash:25,[settings[1].account]:2380});
  assert.equal(Object.values(balances).reduce((sum,value)=>sum+value,0),2485);
});

test('Bitcoin y ETF manuales descuentan solo el origen elegido', () => {
  const holdings=[{units:2,average_cost:100,current_price:120,funding_account:'bank',asset_type:'crypto'},
    {units:1,average_cost:50,current_price:60,funding_account:'outside',asset_type:'etf'}];
  const balances=accountBalances([],[{account:'bank',opening_balance:500},{account:'cash',opening_balance:50}],holdings);
  assert.equal(balances.bank,300);
  assert.equal(balances.cash,50);
  assert.equal(marketValue(holdings),300);
  assert.equal(Object.values(balances).reduce((sum,value)=>sum+value,0)+marketValue(holdings),650);
});

test('el importe directo de efectivo conserva los movimientos y los céntimos',()=>{
  const transactions=[{account:'cash',kind:'expense',amount:12.35}];
  const before=accountBalances(transactions,[{account:'bank',opening_balance:0},{account:'cash',opening_balance:100}],[]);
  const opening=cashOpeningForBalance(100,before.cash,50.2);
  const after=accountBalances(transactions,[{account:'bank',opening_balance:0},{account:'cash',opening_balance:opening}],[]);
  assert.equal(opening,62.55);
  assert.ok(Math.abs(after.cash-50.2)<1e-9);
  assert.equal(cashOpeningForBalance(100,87.65,-1),null);
  assert.equal(cashOpeningForBalance(100,87.65,3.999),null);
});


test('el resumen mensual separa ingresos y gastos, excluye traspasos y agrupa categorías',()=>{
  const rows=[
    {occurred_on:'2026-09-01',kind:'income',amount:1000,category:'Otros'},
    {occurred_on:'2026-09-02',kind:'expense',amount:30,category:'Alimentación'},
    {occurred_on:'2026-09-03',kind:'expense',amount:20,category:'Alimentación'},
    {occurred_on:'2026-09-04',kind:'transfer',amount:200,category:'Traspaso'},
    {occurred_on:'2026-08-01',kind:'expense',amount:999,category:'Otros'}
  ];
  const summary=monthSummary(rows,[{month:'2026-09',category:'Alimentación',amount:100},{month:'2026-08',category:'Otros',amount:500}],'2026-09');
  assert.equal(summary.monthly.length,4);
  assert.equal(summary.income,1000);
  assert.equal(summary.expenses,50);
  assert.equal(summary.balance,950);
  assert.deepEqual(summary.groups,[{category:'Alimentación',total:50}]);
  assert.equal(summary.totalBudget,100);
});
