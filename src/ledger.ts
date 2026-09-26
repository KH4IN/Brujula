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
// Older versions stored user edits alongside sample rows under this key.
// Import only identifiable user edits; never turn sample finances into real finances.
export function recoverLegacyGuest(){
  if(localStorage.getItem(prefix+'guest'))return 0;
  const raw=localStorage.getItem('brujula.demo.v1');if(!raw)return 0;
  let legacy:{transactions?:Transaction[];budgets?:Budget[]};
  try{legacy=JSON.parse(raw)}catch{return 0}
  const transactions=Array.isArray(legacy.transactions)?legacy.transactions.filter(t=>t&&typeof t.id==='string'&&!/^s[1-7]$/.test(t.id)):[];
  const sampleBudgets:Record<string,number>={Alimentación:280,Ocio:150,Transporte:100};
  const budgets=Array.isArray(legacy.budgets)?legacy.budgets.filter(b=>b&&typeof b.month==='string'&&typeof b.category==='string'&&Number(b.amount)!==sampleBudgets[b.category]):[];
  if(!transactions.length&&!budgets.length)return 0;
  const guest=blank();guest.transactions=transactions;guest.budgets=budgets;writeStore('guest',guest);
  return transactions.length+budgets.length;
}
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
// An unused bank can be folded into another without losing its opening balance.
// Both local changes are committed together before synchronization starts.
export function mergeUnusedBank(scope:string,sourceId:string,targetId:string){
  const state=readStore(scope);
  const source=state.account_settings.find(a=>a.account===sourceId);
  const target=state.account_settings.find(a=>a.account===targetId);
  if(!source?.account.startsWith('bank:')||!target||target.kind==='cash'||target.account===sourceId)
    throw new Error('Elige un banco adicional y un banco de destino distinto.');
  if(state.transactions.some(t=>t.account===sourceId||t.to_account===sourceId)||state.investments.some(i=>i.funding_account===sourceId))
    throw new Error('Este banco tiene movimientos o inversiones. Reasígnalos antes de quitarlo.');
  const opening=Math.round((Number(source.opening_balance)+Number(target.opening_balance))*100)/100;
  if(!Number.isFinite(opening)||Math.abs(opening)>9999999999.99)throw new Error('La suma de saldos supera el límite permitido.');
  const updated={...target,opening_balance:opening};
  state.account_settings=[...state.account_settings.filter(a=>a.account!==sourceId&&a.account!==targetId),updated];
  if(scope!=='guest'){
    state.pending=queued(state.pending,{token:crypto.randomUUID(),entity:'account_settings',method:'upsert',id:targetId,record:updated});
    state.pending=queued(state.pending,{token:crypto.randomUUID(),entity:'account_settings',method:'delete',id:sourceId});
  }
  writeStore(scope,state);return state;
}
export function importTransactions(scope:string,values:Transaction[]){
  const state=readStore(scope);
  const seen=new Set(state.transactions.map(item=>item.import_key).filter(Boolean));
  const additions=new Map<string,Pending>();
  for(const item of values){
    if(item.import_key&&seen.has(item.import_key))continue;
    state.transactions.push(item);
    if(item.import_key)seen.add(item.import_key);
    if(scope!=='guest'){
      additions.delete(item.id);
      additions.set(item.id,{token:crypto.randomUUID(),entity:'transactions',method:'upsert',id:item.id,record:item});
    }
  }
  if(additions.size)state.pending=[
    ...state.pending.filter(entry=>entry.entity!=='transactions'||!additions.has(entry.id)),
    ...additions.values()
  ];
  writeStore(scope,state);
  return state;
}

export function claimGuest(userId:string){
  const guest=readStore('guest'),state=readStore(userId);
  if(!guest.transactions.length&&!guest.budgets.length&&!guest.goals.length&&!guest.investments.length&&!guest.account_settings.some(a=>a.opening_balance!==0||a.account!=='bank'&&a.account!=='cash'||a.name&&a.name!== (a.account==='cash'?'Efectivo':'Banco')||a.cash_counts))return 0;
  // A cloud snapshot must be loaded before this function is called. If two
  // versions of the same account or record differ, leave the entire guest
  // space intact for explicit reconciliation rather than losing a balance.
  for(const entity of ['transactions','budgets','goals','investments','account_settings'] as Entity[])for(const original of list(guest,entity)){
    const id=key(entity,original);
    const existing=list(state,entity).find(item=>key(entity,item)===id);
    if(entity==='account_settings'){
      const account=original as AccountSetting;
      const defaultName=account.account==='cash'?'Efectivo':'Banco';
      const meaningful=Number(account.opening_balance)!==0||(account.name&&account.name!==defaultName)||account.cash_counts;
      if(!meaningful)continue;
      if(existing){
        const saved=existing as AccountSetting;
        const used=Number(saved.opening_balance)!==0||(saved.name&&saved.name!==defaultName)||saved.cash_counts||
          state.transactions.some(t=>t.account===id||t.to_account===id)||
          state.investments.some(i=>i.funding_account===id);
        if(used)return -1;
      }
    }else if(existing&&JSON.stringify(original)!==JSON.stringify(existing))return -1;
  }
  let transferred=0;
  for(const entity of ['transactions','budgets','goals','investments','account_settings'] as Entity[])for(const original of list(guest,entity)){
    if(entity==='account_settings'&&(original as AccountSetting).opening_balance===0&&!((original as AccountSetting).cash_counts)&&['bank','cash'].includes((original as AccountSetting).account)&&(!((original as AccountSetting).name)||(original as AccountSetting).name===((original as AccountSetting).account==='cash'?'Efectivo':'Banco')))continue;
    const item=entity==='transactions'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((original as Transaction).id)?{...original,id:crypto.randomUUID()} as Transaction:original;
    const id=key(entity,item);if(list(state,entity).some(existing=>key(entity,existing)===id)&&entity!=='account_settings')continue;
    put(state,entity,[item,...list(state,entity).filter(existing=>key(entity,existing)!==id)]);
    state.pending=queued(state.pending,{token:crypto.randomUUID(),entity,method:'upsert',id,record:item});
    transferred++;
  }
  writeStore(userId,state);writeStore('guest',blank());
  return transferred;
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
// Remote writes are idempotent. Checkpoint confirmed tokens in groups to avoid
// reserializing the entire local ledger after every individual request.
export async function flushPending(userId:string,send:(item:Pending)=>Promise<void>){
  const confirmed=new Set<string>();
  const checkpoint=()=>{
    if(!confirmed.size)return;
    const current=readStore(userId);
    current.pending=current.pending.filter(item=>!confirmed.has(item.token));
    writeStore(userId,current);
    confirmed.clear();
  };
  try{
    for(const item of readStore(userId).pending){
      await send(item);
      confirmed.add(item.token);
      if(confirmed.size===25)checkpoint();
    }
  }finally{checkpoint()}
}
export async function synchronize(userId:string):Promise<LocalStore>{
  if(!supabase||!navigator.onLine)return readStore(userId);
  await flushPending(userId,item=>push(userId,item));
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
