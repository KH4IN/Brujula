import { configured, readDemo, supabase, type AccountSetting, type Budget, type Goal, type Investment, type Transaction } from './data';

type Entity='transactions'|'budgets'|'goals'|'investments'|'account_settings';
type RecordValue=Transaction|Budget|Goal|Investment|AccountSetting;
type Pending={token:string;entity:Entity;method:'upsert'|'delete';id:string;record?:RecordValue};
export type LocalStore={transactions:Transaction[];budgets:Budget[];goals:Goal[];investments:Investment[];account_settings:AccountSetting[];pending:Pending[]};
const prefix='brujula.local.v2.';
const defaults=():AccountSetting[]=>[{account:'bank',name:'Banco',kind:'bank',opening_balance:0},{account:'cash',name:'Efectivo',kind:'cash',opening_balance:0}];
const blank=():LocalStore=>({transactions:[],budgets:[],goals:[],investments:[],account_settings:defaults(),pending:[]});
export const emptyStore=blank;
const key=(entity:Entity,record:RecordValue)=>entity==='budgets'?`${(record as Budget).month}:${(record as Budget).category}`:entity==='account_settings'?(record as AccountSetting).account:(record as Transaction).id;
const list=(state:LocalStore,entity:Entity)=>state[entity] as RecordValue[];
const put=(state:LocalStore,entity:Entity,values:RecordValue[])=>{(state as unknown as Record<Entity,RecordValue[]>)[entity]=values};
const queued=(items:Pending[],entry:Pending)=>[...items.filter(item=>!(item.entity===entry.entity&&item.id===entry.id)),entry];
export function readStore(scope:string):LocalStore{
  const raw=localStorage.getItem(prefix+scope);
  if(raw){
    try{
      const value=JSON.parse(raw) as LocalStore;
      if(Array.isArray(value.transactions)&&Array.isArray(value.budgets)&&Array.isArray(value.pending))
        return {...blank(),...value,goals:value.goals??[],investments:value.investments??[],account_settings:value.account_settings??defaults()};
    }catch{/* Keep the original storage value intact for recovery. */}
    throw new Error('Los datos locales no se pueden leer. No se sobrescribirán. Conserva los datos de este navegador y contacta con soporte.');
  }
  return scope==='guest'&&!configured?{...blank(),...readDemo()}:blank();
}
export function writeStore(scope:string,state:LocalStore){localStorage.setItem(prefix+scope,JSON.stringify(state))}
function change(scope:string,entity:Entity,id:string,record?:RecordValue){const state=readStore(scope);put(state,entity,[...(record?[record]:[]),...list(state,entity).filter(item=>key(entity,item)!==id)]);if(scope!=='guest')state.pending=queued(state.pending,{token:crypto.randomUUID(),entity,method:record?'upsert':'delete',id,record});writeStore(scope,state);return state}
export const saveTransaction=(scope:string,value:Transaction)=>change(scope,'transactions',value.id,value);
export const removeTransaction=(scope:string,id:string)=>change(scope,'transactions',id);
export const saveBudget=(scope:string,value:Budget)=>change(scope,'budgets',key('budgets',value),value);
export const removeBudget=(scope:string,value:Budget)=>change(scope,'budgets',key('budgets',value));
export const saveGoal=(scope:string,value:Goal)=>change(scope,'goals',value.id,value);
export const removeGoal=(scope:string,id:string)=>change(scope,'goals',id);
export const saveInvestment=(scope:string,value:Investment)=>change(scope,'investments',value.id,value);
export const removeInvestment=(scope:string,id:string)=>change(scope,'investments',id);
export const saveAccount=(scope:string,value:AccountSetting)=>change(scope,'account_settings',value.account,value);
export function importTransactions(scope:string,values:Transaction[]){const state=readStore(scope),seen=new Set(state.transactions.map(item=>item.import_key).filter(Boolean));for(const item of values){if(item.import_key&&seen.has(item.import_key))continue;state.transactions.push(item);if(item.import_key)seen.add(item.import_key);if(scope!=='guest')state.pending=queued(state.pending,{token:crypto.randomUUID(),entity:'transactions',method:'upsert',id:item.id,record:item})}writeStore(scope,state);return state}

export function claimGuest(userId:string){
  const guest=readStore('guest'),state=readStore(userId);
  if(!guest.transactions.length&&!guest.budgets.length&&!guest.goals.length&&!guest.investments.length&&!guest.account_settings.some(a=>a.opening_balance!==0||a.account!=='bank'&&a.account!=='cash'||a.name&&a.name!== (a.account==='cash'?'Efectivo':'Banco')))return;
  for(const entity of ['transactions','budgets','goals','investments','account_settings'] as Entity[])for(const original of list(guest,entity)){
    if(entity==='account_settings'&&(original as AccountSetting).opening_balance===0&&['bank','cash'].includes((original as AccountSetting).account)&&(!((original as AccountSetting).name)||(original as AccountSetting).name===((original as AccountSetting).account==='cash'?'Efectivo':'Banco')))continue;
    const item=entity==='transactions'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((original as Transaction).id)?{...original,id:crypto.randomUUID()} as Transaction:original;
    const id=key(entity,item);if(list(state,entity).some(existing=>key(entity,existing)===id)&&entity!=='account_settings')continue;
    put(state,entity,[item,...list(state,entity).filter(existing=>key(entity,existing)!==id)]);
    state.pending=queued(state.pending,{token:crypto.randomUUID(),entity,method:'upsert',id,record:item});
  }
  writeStore(userId,state);writeStore('guest',blank());
}

async function fetchAll<T>(entity:Entity,userId:string){
  const all:T[]=[];
  for(let offset=0;;offset+=500){
    let query=supabase!.from(entity).select('*').eq('user_id',userId);
    if(entity==='budgets')query=query.order('month').order('category');
    else query=query.order(entity==='account_settings'?'account':'id');
    const {data,error}=await query.range(offset,offset+499);
    if(error)throw error;
    all.push(...data as T[]);
    if(data.length<500)return all;
  }
}
async function push(userId:string,item:Pending){
  let result;
  if(item.method==='upsert'){
    const record={...item.record,user_id:userId,...(item.entity==='budgets'?{month:`${(item.record as Budget).month}-01`}:{})};
    result=await supabase!.from(item.entity).upsert(record,{onConflict:item.entity==='budgets'?'user_id,month,category':item.entity==='account_settings'?'user_id,account':'id'});
    if(result.error?.code==='23505'&&item.entity==='transactions'&&(item.record as Transaction).import_key)return;
  }else{
    let query=supabase!.from(item.entity).delete().eq('user_id',userId);
    if(item.entity==='budgets')query=query.eq('month',`${item.id.slice(0,7)}-01`).eq('category',item.id.slice(8));
    else query=query.eq(item.entity==='account_settings'?'account':'id',item.id);
    result=await query;
  }
  if(result.error)throw result.error;
}
export async function synchronize(userId:string):Promise<LocalStore>{
  if(!supabase||!navigator.onLine)return readStore(userId);
  for(const item of readStore(userId).pending){await push(userId,item);const current=readStore(userId);current.pending=current.pending.filter(p=>p.token!==item.token);writeStore(userId,current)}
  const [transactions,budgets,goals,investments,settings]=await Promise.all([
    fetchAll<Transaction>('transactions',userId),fetchAll<Budget>('budgets',userId),fetchAll<Goal>('goals',userId),fetchAll<Investment>('investments',userId),fetchAll<AccountSetting>('account_settings',userId)
  ]);
  const state:LocalStore={
    transactions:transactions.map(t=>({...t,amount:Number(t.amount)})),
    budgets:budgets.map(b=>({...b,month:b.month.slice(0,7),amount:Number(b.amount)})),
    goals:goals.map(g=>({...g,target_amount:Number(g.target_amount),saved_amount:Number(g.saved_amount)})),
    investments:investments.map(i=>({...i,units:Number(i.units),average_cost:Number(i.average_cost),current_price:Number(i.current_price)})),
    account_settings:[...defaults().map(defaultValue=>{const found=settings.find(s=>s.account===defaultValue.account);return found?{...defaultValue,...found,opening_balance:Number(found.opening_balance)}:defaultValue}),...settings.filter(s=>s.account!=='bank'&&s.account!=='cash').map(s=>({...s,opening_balance:Number(s.opening_balance)}))],pending:[]
  };
  const pending=readStore(userId).pending;
  for(const item of pending)put(state,item.entity,[...(item.method==='upsert'&&item.record?[item.record]:[]),...list(state,item.entity).filter(entry=>key(item.entity,entry)!==item.id)]);
  state.pending=pending;writeStore(userId,state);return state;
}
