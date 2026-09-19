/** Denominations are stored in cents so a cash count never depends on floating point sums. */
export const CASH_DENOMINATIONS = [
  {cents:50000,label:'Billete de 500 €'}, {cents:20000,label:'Billete de 200 €'},
  {cents:10000,label:'Billete de 100 €'}, {cents:5000,label:'Billete de 50 €'},
  {cents:2000,label:'Billete de 20 €'}, {cents:1000,label:'Billete de 10 €'},
  {cents:500,label:'Billete de 5 €'}, {cents:200,label:'Moneda de 2 €'},
  {cents:100,label:'Moneda de 1 €'}, {cents:50,label:'Moneda de 50 céntimos'},
  {cents:20,label:'Moneda de 20 céntimos'}, {cents:10,label:'Moneda de 10 céntimos'},
  {cents:5,label:'Moneda de 5 céntimos'}, {cents:2,label:'Moneda de 2 céntimos'},
  {cents:1,label:'Moneda de 1 céntimo'},
] as const;

export type CashCounts=Record<string,number>;
export function validCashCounts(value:CashCounts):boolean {
  return Object.entries(value).every(([key,count])=>
    CASH_DENOMINATIONS.some(d=>String(d.cents)===key)&&Number.isSafeInteger(count)&&count>=0&&count<=100000);
}
export function cashTotalCents(counts:CashCounts):number {
  if(!validCashCounts(counts))throw new Error('El recuento de efectivo no es válido.');
  return CASH_DENOMINATIONS.reduce((sum,denom)=>sum+denom.cents*(counts[denom.cents]??0),0);
}
