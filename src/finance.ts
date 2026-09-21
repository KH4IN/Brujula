import type { AccountSetting, AccountType, Goal, Investment, Transaction } from './data';

export function accountBalances(transactions:Transaction[],settings:AccountSetting[],investments:Investment[]){
  const balances:Record<AccountType,number>={bank:0,cash:0};
  for(const setting of settings)balances[setting.account]=Number(setting.opening_balance);
  for(const t of transactions){const account=t.account??'bank',amount=Number(t.amount);balances[account]??=0;if(t.kind==='income')balances[account]+=amount;else if(t.kind==='expense')balances[account]-=amount;else{balances[account]-=amount;if(t.to_account){balances[t.to_account]??=0;balances[t.to_account]+=amount}}}
  for(const holding of investments)if(holding.funding_account!=='outside'){balances[holding.funding_account]??=0;balances[holding.funding_account]-=Number(holding.units)*Number(holding.average_cost)}
  return balances;
}
export const investedCost=(holdings:Investment[])=>holdings.reduce((sum,i)=>sum+Number(i.units)*Number(i.average_cost),0);
export const marketValue=(holdings:Investment[])=>holdings.reduce((sum,i)=>sum+Number(i.units)*Number(i.current_price),0);
export const goalProgress=(goals:Goal[])=>goals.reduce((sum,g)=>sum+Number(g.saved_amount),0);

// Entering the cash amount changes its opening balance by the difference;
// existing cash movements stay in place and are not counted twice.
export function cashOpeningForBalance(opening:number,current:number,target:number):number|null{
  if(![opening,current,target].every(Number.isFinite)||target<0||target>9999999999.99||Math.abs(target*100-Math.round(target*100))>1e-5)return null;
  const cents=Math.round(opening*100)+Math.round(target*100)-Math.round(current*100);
  return Math.abs(cents)<=999999999999?cents/100:null;
}
