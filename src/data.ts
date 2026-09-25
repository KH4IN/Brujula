import { createClient } from '@supabase/supabase-js';

export const CATEGORIES = ['Vivienda','Alimentación','Transporte','Compras','Ocio','Salud','Suscripciones','Otros'] as const;
export type Category = string;
export type AccountType = string;
export const accountName = (account:AccountType,settings:AccountSetting[]=[]) => settings.find(a=>a.account===account)?.name || (account==='cash'?'Efectivo':account==='bank'?'Banco':'Cuenta bancaria');
export type Transaction = {id:string; user_id?:string; amount:number; kind:'income'|'expense'|'transfer'; category:Category; description:string; occurred_on:string; account?:AccountType; to_account?:AccountType|null; import_key?:string|null; created_at?:string};
export type Budget = {id?:string; user_id?:string; category:Category; amount:number; month:string};
export type AccountSetting = {account:AccountType;opening_balance:number;name?:string;kind?:'bank'|'cash';cash_counts?:Record<string,number>;cash_counted_at?:string|null;user_id?:string};
export type Goal = {id:string;user_id?:string;name:string;target_amount:number;saved_amount:number;due_on:string|null;created_at?:string};
export type Investment = {id:string;user_id?:string;name:string;ticker:string;units:number;average_cost:number;current_price:number;asset_type?:'crypto'|'etf'|'stock'|'other';funding_account:AccountType|'outside';purchased_on:string|null;created_at?:string};
// This branch always uses the isolated test project, even if Vercel has
// environment variables configured for production at the project level.
const url = 'https://xxwtwlpgnkxfufywtxpt.supabase.co';
const key = 'sb_publishable_U9Ch6uvF50j5fciHxQTnKA_EkHMXkGr';
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url!, key) : null;
const demoKey = 'brujula.demo.v1';
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const monthOf = (date = new Date()) => localDate(date).slice(0,7);
const sample = (): {transactions:Transaction[];budgets:Budget[]} => {
  const month = monthOf();
  const day = (d:number) => `${month}-${String(Math.min(d,new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())).padStart(2,'0')}`;
  return {transactions:[
    {id:'s1',amount:1850,kind:'income',category:'Otros',description:'Nómina',occurred_on:day(1)},
    {id:'s2',amount:640,kind:'expense',category:'Vivienda',description:'Alquiler',occurred_on:day(2)},
    {id:'s3',amount:76.40,kind:'expense',category:'Alimentación',description:'Compra semanal',occurred_on:day(5)},
    {id:'s4',amount:42.90,kind:'expense',category:'Suscripciones',description:'Internet y móvil',occurred_on:day(7)},
    {id:'s5',amount:34.20,kind:'expense',category:'Transporte',description:'Abono transporte',occurred_on:day(9)},
    {id:'s6',amount:53.80,kind:'expense',category:'Ocio',description:'Cena fuera',occurred_on:day(11)},
    {id:'s7',amount:61.10,kind:'expense',category:'Alimentación',description:'Supermercado',occurred_on:day(13)}
  ],budgets:[{category:'Alimentación',amount:280,month},{category:'Ocio',amount:150,month},{category:'Transporte',amount:100,month}]};
};
export const readDemo = () => {
  try { const raw=localStorage.getItem(demoKey); if(raw) return JSON.parse(raw) as ReturnType<typeof sample>; } catch { /* Reset damaged demo data. */ }
  const initial=sample(); writeDemo(initial); return initial;
};
export const writeDemo = (data:ReturnType<typeof sample>) => localStorage.setItem(demoKey,JSON.stringify(data));
export const money = (amount:number) => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(amount);
export const monthLabel = (month:string) => new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(`${month}-01T12:00:00`));
export const formatDate = (date:string) => new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00`));
