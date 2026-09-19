import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountBalances, marketValue } from './.finance.bundle.mjs';

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
