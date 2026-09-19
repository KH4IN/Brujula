import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Download, FileSpreadsheet, Landmark, LayoutDashboard, LogOut, Menu, Moon, Plus, Search, Settings2, SlidersHorizontal, Sun, Target, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { CATEGORIES, accountName, configured, formatDate, localDate, money, monthLabel, monthOf, supabase, type AccountSetting, type Budget, type Category, type Goal, type Investment, type Transaction } from './data';
import { claimGuest, emptyStore, readStore, removeBudget as removeLocalBudget, removeTransaction as removeLocalTransaction, saveBudget as saveLocalBudget, saveTransaction as saveLocalTransaction, saveGoal, removeGoal, saveInvestment, removeInvestment, saveAccount, importTransactions, synchronize, type LocalStore } from './ledger';
import { AccountsPanel, DailyChart, GoalsPanel, ImportDialog, InvestmentsPanel } from './Features';
import { accountBalances, marketValue } from './finance';
import { authMessage } from './auth';
import { merchantFor } from './categorize';

type Tab = 'dashboard'|'transactions'|'budgets'|'accounts'|'goals'|'investments';
const palette:Record<Category,string> = {Vivienda:'#839c86',Alimentación:'#b9a876',Transporte:'#a98c7b',Compras:'#b18b91',Ocio:'#8e96bb',Salud:'#85aba6',Suscripciones:'#b69dbe',Otros:'#aaa9a0'};
const symbols:Record<Category,string> = {Vivienda:'⌂',Alimentación:'◈',Transporte:'↗',Compras:'◇',Ocio:'✳',Salud:'✚',Suscripciones:'⊞',Otros:'••'};
const fallback=['#839c86','#b9a876','#a98c7b','#b18b91','#8e96bb','#85aba6','#b69dbe','#aaa9a0'];
const colorFor=(category:string)=>palette[category]??fallback[[...category].reduce((a,c)=>a+c.charCodeAt(0),0)%fallback.length];
const symbolFor=(category:string)=>symbols[category]??'◈';
const emptyForm = () => ({amount:'',kind:'expense' as Transaction['kind'],category:'Alimentación' as Category,description:'',occurred_on:localDate(),account:'bank' as Transaction['account'],to_account:'cash' as Transaction['to_account']});
function shiftMonth(month:string, amount:number) {const [y,m]=month.split('-').map(Number);const date=new Date(y,m-1+amount,1);return monthOf(date)}
function csvCell(s:string|number,protect=true){let value=String(s);if(protect&&/^\s*[=+@-]/.test(value))value="'"+value;return `"${value.replaceAll('"','""')}"`}

export default function App(){
  const [user,setUser]=useState<User|null>(null);
  const [loadedScope,setLoadedScope]=useState('guest');
  const [tab,setTab]=useState<Tab>('dashboard');
  const [month,setMonth]=useState(monthOf());
  const [items,setItems]=useState<Transaction[]>([]);
  const [budgets,setBudgets]=useState<Budget[]>([]);
  const [goals,setGoals]=useState<Goal[]>([]);
  const [investments,setInvestments]=useState<Investment[]>([]);
  const [accounts,setAccounts]=useState<AccountSetting[]>([]);
  const [importOpen,setImportOpen]=useState(false);
  const [categoryDetail,setCategoryDetail]=useState<string|null>(null);
  const [pending,setPending]=useState(0);
  const [syncState,setSyncState]=useState<'local'|'syncing'|'synced'|'pending'|'offline'>('local');
  const [authOpen,setAuthOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [modal,setModal]=useState<'transaction'|'budget'|null>(null);
  const [editing,setEditing]=useState<Transaction|null>(null);
  const [form,setForm]=useState(emptyForm);
  const [budgetForm,setBudgetForm]=useState({category:'Alimentación' as Category,amount:''});
  const [search,setSearch]=useState('');
  const [merchantFilter,setMerchantFilter]=useState('all');
  const [filter,setFilter]=useState<'all'|'income'|'expense'|'transfer'>('all');
  const [mobileOpen,setMobileOpen]=useState(false);
  const [dark,setDark]=useState(()=>document.documentElement.dataset.theme==='dark');
  const scope=user?.id??'guest';
  const scopeRef=useRef(scope);scopeRef.current=scope;
  const syncing=useRef(false);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('brujula.theme',dark?'dark':'light')}catch{/* The theme still works without storage. */}document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#171720':'#173f32')},[dark]);
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.get('nuevo')!=='1')return;
    const kind=url.searchParams.get('tipo');
    const raw=url.searchParams.get('importe')??'';
    const amount=/^\d{1,10}(?:[.,]\d{1,2})?$/.test(raw)?raw.replace(',','.'):'';
    const description=(url.searchParams.get('descripcion')??'').trim().slice(0,120);
    const category=(url.searchParams.get('categoria')??'Otros').trim().slice(0,60)||'Otros';
    window.history.replaceState(window.history.state,'',url.pathname+url.hash);
    setForm({...emptyForm(),kind:kind==='income'?'income':'expense',amount,description,category});
    setModal('transaction');
  },[]);
  const applyLocal=useCallback((store:LocalStore)=>{setItems(store.transactions);setBudgets(store.budgets);setGoals(store.goals);setInvestments(store.investments);setAccounts(store.account_settings);setPending(store.pending.length)},[]);

  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(({data})=>setUser(data.session?.user??null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));
    return ()=>subscription.unsubscribe();
  },[]);

  const syncNow=useCallback(async()=>{
    if(!user||!supabase)return;
    if(!navigator.onLine){setSyncState('offline');return}
    if(syncing.current)return;
    syncing.current=true;setSyncState('syncing');
    let completed=false;
    try{
      const fresh=await synchronize(user.id);
      completed=true;
      if(scopeRef.current===user.id){applyLocal(fresh);setSyncState(fresh.pending.length?'pending':'synced');setNotice('')}
    }catch(error){
      if(scopeRef.current===user.id){setSyncState('pending');setNotice(`La sincronización está pendiente: ${error instanceof Error?error.message:'comprueba tu conexión'}`)}
    }finally{
      syncing.current=false;
      if(completed&&scopeRef.current===user.id){
        try{if(readStore(user.id).pending.length)queueMicrotask(()=>void syncNow())}catch{/* Error shown by the next read. */}
      }
    }
  },[user,applyLocal]);

  useEffect(()=>{
    try{
      if(user)claimGuest(user.id);
      const local=readStore(scope);applyLocal(local);
      setLoadedScope(scope);
      setSyncState(user?(navigator.onLine?'pending':'offline'):'local');
      if(user)void syncNow();
    }catch(error){applyLocal(emptyStore());setLoadedScope(scope);setNotice(error instanceof Error?error.message:'No se pueden leer los datos locales.')}
  },[scope,user,applyLocal,syncNow]);
  useEffect(()=>{
    const online=()=>{if(user)void syncNow()};
    const offline=()=>{if(user)setSyncState('offline')};
    const visible=()=>{if(document.visibilityState==='visible'&&user)void syncNow()};
    window.addEventListener('online',online);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',visible);
    return ()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visible)};
  },[user,syncNow]);

  const monthly=useMemo(()=>items.filter(x=>x.occurred_on.startsWith(month)),[items,month]);
  const income=monthly.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.amount),0);
  const expenses=monthly.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.amount),0);
  const balance=income-expenses;
  const categories=[...new Set([...CATEGORIES,...items.map(t=>t.category),...budgets.map(b=>b.category)])];
  const groups=[...new Set(monthly.filter(x=>x.kind==='expense').map(x=>x.category))].map(category=>({category,total:monthly.filter(x=>x.kind==='expense'&&x.category===category).reduce((s,x)=>s+Number(x.amount),0)})).sort((a,b)=>b.total-a.total);
  const totalBudget=budgets.filter(b=>b.month===month).reduce((s,b)=>s+Number(b.amount),0);
  const merchants=[...new Set(monthly.map(x=>merchantFor(x.description)).filter((v):v is string=>Boolean(v)))].sort((a,b)=>a.localeCompare(b,'es'));
  const filtered=monthly.filter(x=>(filter==='all'||x.kind===filter)&&(merchantFilter==='all'||merchantFor(x.description)===merchantFilter)&&`${x.description} ${x.category} ${x.occurred_on}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a,b)=>b.occurred_on.localeCompare(a.occurred_on));
  const spentFor=(category:Category)=>groups.find(g=>g.category===category)?.total??0;
  const balances=accountBalances(items.filter(t=>t.occurred_on<=localDate()),accounts,investments);
  const bankTotal=accounts.filter(a=>a.account!=='cash').reduce((sum,a)=>sum+(balances[a.account]??0),0);
  const cryptoValue=marketValue(investments.filter(i=>i.asset_type==='crypto'));
  const wealth=Object.values(balances).reduce((sum,value)=>sum+value,0)+marketValue(investments);
  const persist=(action:()=>LocalStore)=>{try{const next=action();applyLocal(next);setModal(null);setNotice('');if(user){setSyncState(navigator.onLine?'pending':'offline');void syncNow()}return true}catch{setNotice('No se pudo guardar en este dispositivo. Comprueba el espacio de almacenamiento.');return false}};
  function openTransaction(value?:Transaction){setEditing(value??null);setForm(value?{amount:String(value.amount),kind:value.kind,category:value.category,description:value.description,occurred_on:value.occurred_on,account:value.account??'bank',to_account:value.to_account??'cash'}:emptyForm());setNotice('');setModal('transaction')}
  function saveTransaction(e:FormEvent){
    e.preventDefault();const amount=Number(form.amount);
    if(!Number.isFinite(amount)||amount<=0||amount>9999999999.99||!form.description.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(form.occurred_on)){setNotice('Revisa el importe, la descripción y la fecha.');return}
    setBusy(true);
    if(form.kind==='transfer'&&form.account===form.to_account){setNotice('Elige dos cuentas distintas para el traspaso.');setBusy(false);return}
    const payload={amount:Math.round(amount*100)/100,kind:form.kind,category:form.kind==='transfer'?'Traspaso':form.category,description:form.description.trim().slice(0,120),occurred_on:form.occurred_on,account:form.account,to_account:form.kind==='transfer'?form.to_account:null,import_key:editing?.import_key??null};
    persist(()=>saveLocalTransaction(scope,{...payload,id:editing?.id??crypto.randomUUID()}));setBusy(false);
  }
  function deleteTransaction(value:Transaction){if(window.confirm(`¿Eliminar «${value.description}»?`))persist(()=>removeLocalTransaction(scope,value.id))}
  function saveBudget(e:FormEvent){
    e.preventDefault();const amount=Number(budgetForm.amount);
    if(!Number.isFinite(amount)||amount<=0||amount>9999999999.99){setNotice('Introduce un presupuesto mayor que cero.');return}
    setBusy(true);persist(()=>saveLocalBudget(scope,{category:budgetForm.category,amount:Math.round(amount*100)/100,month}));setBusy(false);
  }
  function deleteBudget(category:Category){if(window.confirm(`¿Quitar el presupuesto de ${category}?`))persist(()=>removeLocalBudget(scope,{category,month,amount:0}))}
  function importRows(values:Transaction[]){if(persist(()=>importTransactions(scope,values)))setNotice(`${values.length} movimientos incorporados. Revisa los gráficos y las cuentas.`)}
  function saveGoalLocal(goal:Goal){persist(()=>saveGoal(scope,goal))}
  function deleteGoalLocal(id:string){persist(()=>removeGoal(scope,id))}
  function saveInvestmentLocal(value:Investment){persist(()=>saveInvestment(scope,value))}
  function deleteInvestmentLocal(id:string){persist(()=>removeInvestment(scope,id))}
  function saveAccountLocal(value:AccountSetting){persist(()=>saveAccount(scope,value))}
  function exportCSV(){
    const rows=[['Fecha','Tipo','Cuenta','Destino','Categoría','Descripción','Importe (EUR)'],...monthly.map(x=>[x.occurred_on,x.kind==='income'?'Ingreso':x.kind==='transfer'?'Traspaso':'Gasto',accountName(x.account??'bank',accounts),x.to_account?accountName(x.to_account,accounts):'',x.category,x.description,(x.kind==='income'?'':'-')+Number(x.amount).toFixed(2)])];
    const csv='\uFEFF'+rows.map(row=>row.map((value,index)=>csvCell(value,index!==6)).join(';')).join('\r\n');
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download=`brujula-movimientos-${month}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }
  function go(next:Tab){setTab(next);setMobileOpen(false);setNotice('')}

  if(loadedScope!==scope)return <div className="app" role="status">Cargando tu espacio…</div>;
  return <div className="app">
    {mobileOpen&&<div className="mobile-scrim" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-symbol">✳</div><div className="brand-name">brújula<span>.</span><small>FINANZAS PERSONALES</small></div></div>
      <div className="nav-label">ESPACIO PERSONAL</div>
      <nav className="nav">
        <button className={tab==='dashboard'?'active':''} onClick={()=>go('dashboard')}><LayoutDashboard size={19}/> Vista general</button>
        <button className={tab==='transactions'?'active':''} onClick={()=>go('transactions')}><ArrowRight size={19}/> Movimientos</button>
        <button className={tab==='budgets'?'active':''} onClick={()=>go('budgets')}><Target size={19}/> Presupuestos</button>
        <button className={tab==='accounts'?'active':''} onClick={()=>go('accounts')}><Landmark size={19}/> Cuentas y efectivo</button>
        <button className={tab==='goals'?'active':''} onClick={()=>go('goals')}><Wallet size={19}/> Objetivos</button>
        <button className={tab==='investments'?'active':''} onClick={()=>go('investments')}><TrendingUp size={19}/> Inversiones</button>
      </nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-tip"><div className="tip-icon"><CircleHelp size={20}/></div><strong>Una visión más clara.</strong><p>Registra tus movimientos para ver adónde va cada euro.</p></div>
      <div className="sidebar-footer"><div className="avatar">{user?.email?.charAt(0).toUpperCase()??'T'}</div><div className="account"><strong>{user?.email?.split('@')[0]??'Mi espacio'}</strong><span>{user?'Sincronización activada':'Solo en este dispositivo'}</span></div>{user?<button title="Desconectar cuenta" className="icon-button" onClick={()=>supabase?.auth.signOut({scope:'local'})}><LogOut size={17}/></button>:configured&&<button className="connect-button" onClick={()=>setAuthOpen(true)}>Sincronizar</button>}</div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu icon-button" aria-label="Abrir menú" onClick={()=>setMobileOpen(true)}><Menu size={23}/></button><div className="breadcrumb">Mi espacio <ChevronRight size={14}/><strong>{({dashboard:'Vista general',transactions:'Movimientos',budgets:'Presupuestos',accounts:'Cuentas y efectivo',goals:'Objetivos',investments:'Inversiones'} as Record<Tab,string>)[tab]}</strong></div><div className="topbar-right"><button className="icon-button theme-toggle" aria-label={dark?'Activar modo claro':'Activar modo oscuro'} title={dark?'Modo claro':'Modo oscuro'} aria-pressed={dark} onClick={()=>setDark(value=>!value)}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><span className="online-dot"/> Tu dinero, en orden <span className="top-avatar">{user?.email?.charAt(0).toUpperCase()??'T'}</span></div></header>
      <div className="content">
        <div className="demo-banner"><span className="demo-badge">{user?'SYNC':'LOCAL'}</span><span>{user?syncState==='synced'?'Todo sincronizado en tus dispositivos.':syncState==='syncing'?'Sincronizando cambios…':syncState==='offline'?`Sin conexión. ${pending} cambios pendientes.`:`${pending} cambios pendientes de sincronizar.`:'Tus datos se guardan en este dispositivo. Inicia sesión para sincronizarlos con otros.'}</span>{user&&<button className="sync-button" onClick={()=>void syncNow()} disabled={syncState==='syncing'}>Sincronizar ahora</button>}{!user&&configured&&<button className="sync-button" onClick={()=>setAuthOpen(true)}>Activar sincronización</button>}</div>
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> TU PANORAMA FINANCIERO</div><h1>{({dashboard:'Tu dinero, con claridad.',transactions:'Tus movimientos.',budgets:'Presupuestos a tu medida.',accounts:'Tus cuentas, siempre claras.',goals:'Tus objetivos.',investments:'Tu cartera de inversión.'} as Record<Tab,string>)[tab]}</h1><p>{({dashboard:'Todo lo que entra, lo que sale y lo que estás construyendo.',transactions:'Cada movimiento cuenta una parte de la historia.',budgets:'Pon un límite a cada categoría y sigue tu progreso.',accounts:'Cada banco, efectivo y cartera, por separado.',goals:'Pequeños pasos hacia algo grande.',investments:'Tus posiciones y precios, actualizados por ti.'} as Record<Tab,string>)[tab]}</p></div><div className="heading-actions"><div className="month-picker"><button aria-label="Mes anterior" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft size={17}/></button><span><CalendarDays size={16}/>{monthLabel(month)}</span><button aria-label="Mes siguiente" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight size={17}/></button></div><button className="secondary-button import-button" onClick={()=>setImportOpen(true)}><FileSpreadsheet size={17}/> Importar archivo</button><button className="primary-button" onClick={()=>openTransaction()}><Plus size={18}/> Añadir movimiento</button></div></div>
        {notice&&!modal&&<div className="notice" role="alert">{notice}<button onClick={()=>setNotice('')} aria-label="Cerrar aviso"><X size={16}/></button></div>}
        {busy&&<div className="loading-line"/>}
        {tab==='dashboard'&&<>
          <div className="wealth-strip"><div><span>PATRIMONIO ESTIMADO</span><strong>{money(wealth)}</strong><small>Bancos + efectivo + cripto + inversiones</small></div><button onClick={()=>go('accounts')}>Bancos <strong>{money(bankTotal)}</strong></button><button onClick={()=>go('accounts')}>Efectivo <strong>{money(balances.cash)}</strong></button><button onClick={()=>go('investments')}>Cripto <strong>{money(cryptoValue)}</strong><small>Inversiones totales: {money(marketValue(investments))}</small></button></div><div className="stat-grid"><Stat label="Balance del mes" value={balance} icon={<Wallet size={20}/>} tone="dark" foot={balance>=0?'Vas por buen camino':'Tus gastos superan tus ingresos'}/><Stat label="Ingresos" value={income} icon={<ArrowDownLeft size={20}/>} tone="green" foot={`${monthly.filter(x=>x.kind==='income').length} movimientos este mes`}/><Stat label="Gastos" value={expenses} icon={<ArrowUpRight size={20}/>} tone="peach" foot={`${monthly.filter(x=>x.kind==='expense').length} movimientos este mes`}/></div>
          <div className="account-overview" aria-label="Saldos por cuenta">{accounts.map(a=><button key={a.account} className="account-overview-item" onClick={()=>go('accounts')}><span>{accountName(a.account,accounts)}</span><strong>{money(balances[a.account]??0)}</strong></button>)}</div>
          <section className="card flow-card"><div><span className="section-kicker">DE UN VISTAZO</span><h2>Ingresos y gastos del mes</h2><p>Selecciona una parte para ver sus movimientos.</p></div><div className="flow-visual"><div className="flow-ring" role="img" aria-label={`Ingresos ${money(income)}; gastos ${money(expenses)}`} style={{background:`conic-gradient(#84af8b 0 ${income+expenses?income/(income+expenses)*100:0}%, #d7a590 0 100%)`}}><span>{income+expenses?`${Math.round(income/(income+expenses)*100)}%`:'—'}<small>ingresos</small></span></div><div className="flow-legend"><button onClick={()=>{setFilter('income');go('transactions')}}><span className="legend-dot" style={{background:'#84af8b'}}/> Ingresos <strong>{money(income)}</strong></button><button onClick={()=>{setFilter('expense');go('transactions')}}><span className="legend-dot" style={{background:'#d7a590'}}/> Gastos <strong>{money(expenses)}</strong></button><p>Balance del mes: <strong>{money(balance)}</strong></p></div></div></section>
          <div className="dashboard-grid"><section className="card distribution"><div className="card-heading"><div><span className="section-kicker">ANÁLISIS</span><h2>¿En qué se va tu dinero?</h2><p>Distribución de gastos en {monthLabel(month)}</p></div><div className="circle-icon"><Activity size={19}/></div></div>{groups.length?<div className="distribution-body"><div className="donut" style={{background:`conic-gradient(${groups.reduce<{stops:string[],pct:number}>((acc,g)=>{const next=acc.pct+g.total/expenses*100;acc.stops.push(`${colorFor(g.category)} ${acc.pct}% ${next}%`);acc.pct=next;return acc},{stops:[],pct:0}).stops.join(',')})`}}><div className="donut-center"><small>TOTAL GASTOS</small><strong>{money(expenses)}</strong></div></div><div className="legend">{groups.map(g=><button className="legend-item legend-button" key={g.category} onClick={()=>setCategoryDetail(g.category)}><span className="legend-dot" style={{background:colorFor(g.category)}}/><span>{g.category}</span><strong>{Math.round(g.total/expenses*100)}%</strong></button>)}</div></div>:<Empty text="Aquí aparecerá el reparto de tus gastos." action={()=>openTransaction()}/>}</section>
          <section className="card budget-card"><div className="card-heading"><div><span className="section-kicker">TUS LÍMITES</span><h2>Presupuestos</h2><p>{totalBudget?`${money(totalBudget)} planificados este mes`:'Planifica tus gastos mensuales'}</p></div><button className="text-link" onClick={()=>go('budgets')}>Ver todos <ArrowRight size={16}/></button></div><div className="budget-list">{budgets.filter(b=>b.month===month).slice(0,4).map(b=><BudgetLine key={b.category} budget={b} spent={spentFor(b.category)}/>)}{!budgets.some(b=>b.month===month)&&<Empty text="Define un presupuesto para empezar a controlar tus gastos." action={()=>{setBudgetForm({category:'Alimentación',amount:''});setModal('budget')}} label="Crear presupuesto"/>}</div><button className="subtle-action" onClick={()=>{setBudgetForm({category:'Alimentación',amount:''});setModal('budget')}}><Plus size={16}/> Crear presupuesto</button></section></div>
          <DailyChart transactions={monthly} month={month} onSelect={date=>{setSearch('');setFilter('expense');go('transactions');setSearch(date)}}/>
          <section className="card recent"><div className="card-heading"><div><span className="section-kicker">ACTIVIDAD RECIENTE</span><h2>Últimos movimientos</h2></div><button className="text-link" onClick={()=>go('transactions')}>Ver todos <ArrowRight size={16}/></button></div><TransactionList accountLabels={accounts} items={filtered.slice(0,5)} onEdit={openTransaction} onDelete={deleteTransaction} onAdd={()=>openTransaction()}/></section>
        </>}
        {tab==='transactions'&&<section className="card full-card"><div className="card-heading"><div><span className="section-kicker">HISTORIAL</span><h2>Movimientos de {monthLabel(month)}</h2><p>{monthly.length} movimientos registrados</p></div><button className="secondary-button" onClick={exportCSV} disabled={!monthly.length}><Download size={17}/> Exportar CSV</button></div><div className="toolbar"><div className="search"><Search size={18}/><input placeholder="Buscar por nombre o categoría" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filter"><SlidersHorizontal size={17}/><select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} aria-label="Filtrar movimientos"><option value="all">Todos</option><option value="expense">Gastos</option><option value="income">Ingresos</option><option value="transfer">Traspasos</option></select><ChevronDown size={15}/></div>{merchants.length>0&&<div className="filter"><select aria-label="Filtrar por comercio" value={merchantFilter} onChange={e=>setMerchantFilter(e.target.value)}><option value="all">Todos los comercios</option>{merchants.map(name=><option key={name} value={name}>{name}</option>)}</select><ChevronDown size={15}/></div>}</div><TransactionList accountLabels={accounts} items={filtered} onEdit={openTransaction} onDelete={deleteTransaction} onAdd={()=>openTransaction()}/></section>}
        {tab==='budgets'&&<><div className="budget-summary"><div><span className="section-kicker">PLAN MENSUAL</span><h2>Un plan para gastar mejor.</h2><p>Fija una cantidad para cada categoría y ajusta sobre la marcha.</p></div><button className="primary-button" onClick={()=>{setBudgetForm({category:'Alimentación',amount:''});setModal('budget')}}><Plus size={18}/> Nuevo presupuesto</button></div><div className="budget-grid">{budgets.filter(b=>b.month===month).map(b=><div className="card budget-tile" key={b.category}><div className="budget-tile-top"><div className="category-icon" style={{background:`${colorFor(b.category)}25`,color:colorFor(b.category)}}>{symbolFor(b.category)}</div><button className="icon-button" title="Eliminar presupuesto" onClick={()=>deleteBudget(b.category)}><Trash2 size={16}/></button></div><BudgetLine budget={b} spent={spentFor(b.category)}/><button className="budget-edit" onClick={()=>{setBudgetForm({category:b.category,amount:String(b.amount)});setModal('budget')}}><Settings2 size={14}/> Ajustar límite</button></div>)}<button className="add-budget-tile" onClick={()=>{setBudgetForm({category:'Alimentación',amount:''});setModal('budget')}}><Plus size={25}/><strong>Añadir categoría</strong><span>Crea un nuevo límite mensual</span></button></div></>}
        {tab==='accounts'&&<AccountsPanel settings={accounts} balances={balances} onSave={saveAccountLocal} onTransfer={()=>{openTransaction();setForm({...emptyForm(),kind:'transfer',description:'Traspaso entre cuentas'})}}/>}
        {tab==='goals'&&<GoalsPanel goals={goals} onSave={saveGoalLocal} onDelete={deleteGoalLocal}/>}
        {tab==='investments'&&<InvestmentsPanel investments={investments} accounts={accounts} onSave={saveInvestmentLocal} onDelete={deleteInvestmentLocal}/>}
        <footer className="page-footer">Brújula · Una forma sencilla de entender tus finanzas <span>Hecho para ir paso a paso.</span></footer>
      </div>
    </main>
    {categoryDetail&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCategoryDetail(null)}}><div className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div className="modal-heading"><div><span className="section-kicker">DESGLOSE DEL MES</span><h2 id="detail-title">{categoryDetail}</h2></div><button className="icon-button" onClick={()=>setCategoryDetail(null)}><X size={20}/></button></div><strong className="detail-total">{money(spentFor(categoryDetail))}</strong><p className="feature-copy">{expenses?Math.round(spentFor(categoryDetail)/expenses*100):0}% de tus gastos de {monthLabel(month)} · {monthly.filter(t=>t.kind==='expense'&&t.category===categoryDetail).length} movimientos.</p><TransactionList accountLabels={accounts} items={monthly.filter(t=>t.kind==='expense'&&t.category===categoryDetail)} onEdit={t=>{setCategoryDetail(null);openTransaction(t)}} onDelete={deleteTransaction} onAdd={()=>{setCategoryDetail(null);openTransaction()}}/></div></div>}
    {importOpen&&<ImportDialog existing={items} accounts={accounts} onClose={()=>setImportOpen(false)} onConfirm={importRows}/>}
    {authOpen&&<Auth onReady={()=>setAuthOpen(false)} onClose={()=>setAuthOpen(false)}/>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setModal(null);setNotice('')}}}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><div><span className="section-kicker">{modal==='transaction'?'MOVIMIENTOS':'PLANIFICACIÓN'}</span><h2 id="modal-title">{modal==='transaction'?(editing?'Editar movimiento':'Nuevo movimiento'):'Presupuesto mensual'}</h2></div><button className="icon-button" onClick={()=>{setModal(null);setNotice('')}} aria-label="Cerrar"><X size={20}/></button></div>
        {notice&&<div className="notice" role="alert">{notice}</div>}
        {modal==='transaction'?<form onSubmit={saveTransaction}>
          <div className="segmented"><button type="button" className={form.kind==='expense'?'selected':''} onClick={()=>setForm({...form,kind:'expense'})}><ArrowUpRight size={17}/> Gasto</button><button type="button" className={form.kind==='income'?'selected':''} onClick={()=>setForm({...form,kind:'income'})}><ArrowDownLeft size={17}/> Ingreso</button><button type="button" className={form.kind==='transfer'?'selected':''} onClick={()=>setForm({...form,kind:'transfer',description:form.description||'Traspaso entre cuentas'})}><ArrowRight size={17}/> Traspaso</button></div>
          <label>Importe en euros<input type="number" inputMode="decimal" step="0.01" min="0.01" max="9999999999.99" required placeholder="0,00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} autoFocus/></label>
          <label>Descripción<input type="text" maxLength={120} required placeholder="Por ejemplo, compra semanal" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <div className="form-row"><label>{form.kind==='transfer'?'Desde':'Cuenta'}<select value={form.account} onChange={e=>setForm({...form,account:e.target.value as Transaction['account']})}>{accounts.map(a=><option key={a.account} value={a.account}>{accountName(a.account,accounts)}</option>)}</select></label>{form.kind==='transfer'?<label>Hacia<select value={form.to_account??'cash'} onChange={e=>setForm({...form,to_account:e.target.value as Transaction['to_account']})}>{accounts.map(a=><option key={a.account} value={a.account}>{accountName(a.account,accounts)}</option>)}</select></label>:<label>Fecha<input type="date" required value={form.occurred_on} onChange={e=>setForm({...form,occurred_on:e.target.value})}/></label>}</div>
          {form.kind==='transfer'?<label>Fecha<input type="date" required value={form.occurred_on} onChange={e=>setForm({...form,occurred_on:e.target.value})}/></label>:<label>Categoría<input list="transaction-categories" maxLength={60} required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/><datalist id="transaction-categories">{categories.map(c=><option key={c} value={c}/>)}</datalist></label>}
          <button className="primary-button form-submit" disabled={busy}><Check size={18}/>{busy?'Guardando…':'Guardar movimiento'}</button>
        </form>:<form onSubmit={saveBudget}>
          <label>Categoría<input list="budget-categories" maxLength={60} required value={budgetForm.category} onChange={e=>setBudgetForm({...budgetForm,category:e.target.value})}/><datalist id="budget-categories">{categories.map(c=><option key={c} value={c}/>)}</datalist></label>
          <label>Límite mensual en euros<input type="number" inputMode="decimal" step="0.01" min="0.01" max="9999999999.99" required placeholder="Por ejemplo, 250" value={budgetForm.amount} onChange={e=>setBudgetForm({...budgetForm,amount:e.target.value})}/></label>
          <p className="form-hint">Se aplicará a {monthLabel(month)}. Puedes modificarlo en cualquier momento.</p><button className="primary-button form-submit" disabled={busy}><Check size={18}/>{busy?'Guardando…':'Guardar presupuesto'}</button>
        </form>}
      </div>
    </div>}
  </div>
}

function Stat({label,value,icon,tone,foot}:{label:string,value:number,icon:React.ReactNode,tone:string,foot:string}){return <div className={`stat stat-${tone}`}><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{money(value)}</strong><div className="stat-foot"><span className="mini-dot"/>{foot}</div></div>}
function BudgetLine({budget,spent}:{budget:Budget,spent:number}){const fraction=Math.min(spent/Number(budget.amount),1);const over=spent>Number(budget.amount);return <div className="budget-line"><div className="budget-name"><span>{budget.category}</span><strong>{money(spent)} <em>/ {money(Number(budget.amount))}</em></strong></div><div className="progress"><span style={{width:`${fraction*100}%`,background:over?'#bd7769':colorFor(budget.category)}}/></div><div className={`budget-caption ${over?'over':''}`}>{over?`${money(spent-Number(budget.amount))} por encima del límite`:`${Math.round(fraction*100)}% utilizado`}</div></div>}
function Empty({text,action,label='Añadir movimiento'}:{text:string,action:()=>void,label?:string}){return <div className="empty"><div className="empty-symbol">✳</div><p>{text}</p><button onClick={action}>{label} <ArrowRight size={14}/></button></div>}
function TransactionList({items,onEdit,onDelete,onAdd,accountLabels=[]}:{items:Transaction[],onEdit:(t:Transaction)=>void,onDelete:(t:Transaction)=>void,onAdd:()=>void,accountLabels?:AccountSetting[]}){if(!items.length)return <Empty text="Todavía no hay movimientos aquí. Empieza con el primero." action={onAdd}/>;return <div className="transaction-list">{items.map(t=><div className="transaction" key={t.id}><div className="category-icon" style={{background:t.kind==='income'?'#e0eee5':`${colorFor(t.category)}25`,color:t.kind==='income'?'#4b9172':colorFor(t.category)}}>{t.kind==='income'?<ArrowDownLeft size={19}/>:t.kind==='transfer'?<ArrowRight size={19}/>:symbolFor(t.category)}</div><div className="transaction-info"><strong>{t.description}</strong><span>{t.kind==='transfer'?'Traspaso':t.category}{merchantFor(t.description)?' · '+merchantFor(t.description):''} <b>·</b> {accountName(t.account??'bank',accountLabels)}{t.to_account?` → ${accountName(t.to_account,accountLabels)}`:''} <b>·</b> {formatDate(t.occurred_on)}</span></div><strong className={`transaction-amount ${t.kind==='income'?'positive':''}`}>{t.kind==='income'?'+':t.kind==='transfer'?'↔':'−'}{money(Number(t.amount))}</strong><div className="transaction-actions"><button className="icon-button" title="Editar" aria-label={`Editar ${t.description}`} onClick={()=>onEdit(t)}><Settings2 size={16}/></button><button className="icon-button" title="Eliminar" aria-label={`Eliminar ${t.description}`} onClick={()=>onDelete(t)}><Trash2 size={16}/></button></div></div>)}</div>}
function Auth({onReady,onClose}:{onReady:()=>void,onClose:()=>void}){
  const [email,setEmail]=useState('');
  const [sentEmail,setSentEmail]=useState('');
  const [code,setCode]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [retryAt,setRetryAt]=useState(0);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{
    if(!retryAt)return;
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[retryAt]);
  const seconds=Math.max(0,Math.ceil((retryAt-now)/1000));
  async function sendCode(address:string){
    if(loading)return;
    const clean=address.trim().toLowerCase();
    setLoading(true);setError('');
    try{
      const {error:sendError}=await supabase!.auth.signInWithOtp({
        email:clean,
        options:{shouldCreateUser:true,emailRedirectTo:window.location.origin}
      });
      if(sendError){setError(authMessage(sendError));return}
      setSentEmail(clean);setCode('');
      setNow(Date.now());setRetryAt(Date.now()+60000);
    }catch{
      setError('No se pudo enviar el código. Comprueba la conexión y vuelve a intentarlo.');
    }finally{setLoading(false)}
  }
  async function verifyCode(e:FormEvent){
    e.preventDefault();
    if(loading||!/^\d{6}$/.test(code))return;
    setLoading(true);setError('');
    try{
      const {data,error:verifyError}=await supabase!.auth.verifyOtp({email:sentEmail,token:code,type:'email'});
      if(verifyError){setError(authMessage(verifyError));return}
      if(!data.session){setError('No se pudo iniciar sesión con ese código. Solicita otro y prueba de nuevo.');return}
      setCode('');onReady();
    }catch{
      setError('No se pudo verificar el código. Comprueba la conexión e inténtalo otra vez.');
    }finally{setLoading(false)}
  }
  return <div className="auth-overlay"><div className="auth-page">
    <button className="auth-close icon-button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button>
    <div className="auth-decor"><div className="brand"><div className="brand-symbol">✳</div><div className="brand-name">brújula<span>.</span><small>FINANZAS PERSONALES</small></div></div><div className="auth-message"><span>UN POCO MÁS DE CLARIDAD, CADA DÍA</span><h1>Tu dinero tiene una historia.<br/><em>Entiéndela mejor.</em></h1><p>Organiza tus gastos, pon límites que puedas cumplir y descubre lo que de verdad importa.</p></div><div className="auth-bottom">✳ &nbsp; Un lugar tranquilo para tus finanzas.</div></div>
    <div className="auth-panel"><div className="auth-box"><div className="auth-mobile-brand">✳ brújula.</div><span className="section-kicker">BIENVENIDO A BRÚJULA</span><h2>{sentEmail?'Revisa tu correo.':'Entra en tu espacio.'}</h2>
      {sentEmail?<><p>Hemos solicitado un código de seis cifras para <strong>{sentEmail}</strong>. Revisa también el correo no deseado.</p>
        <form onSubmit={verifyCode}><label>Código de verificación<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus placeholder="000000" value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,'').slice(0,6));setError('')}}/></label>
          {error&&<div className="notice" role="alert">{error}</div>}
          <button className="primary-button form-submit" disabled={loading||code.length!==6}>{loading?'Comprobando…':'Verificar y entrar'} <ArrowRight size={18}/></button>
        </form>
        <div className="auth-toggle"><button type="button" disabled={loading||seconds>0} onClick={()=>void sendCode(sentEmail)}>{seconds>0?`Pedir otro código en ${seconds} s`:'Reenviar código'}</button></div>
        <div className="auth-toggle"><button type="button" onClick={()=>{setSentEmail('');setCode('');setError('')}}>Cambiar dirección de correo</button></div>
      </>:<><p>Escribe tu correo y te enviaremos un código. Si todavía no tienes cuenta, se creará al verificarlo.</p>
        <form onSubmit={e=>{e.preventDefault();void sendCode(email)}}>
          <label>Correo electrónico<input type="email" required autoComplete="email" placeholder="tu@correo.com" value={email} onChange={e=>{setEmail(e.target.value);setError('')}}/></label>
          {error&&<div className="notice" role="alert">{error}</div>}
          <button className="primary-button form-submit" disabled={loading}>{loading?'Enviando…':'Enviar código'} <ArrowRight size={18}/></button>
        </form>
      </>}
    </div></div>
  </div></div>;
}
