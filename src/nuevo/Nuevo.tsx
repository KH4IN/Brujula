import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Activity, ArrowRight, CalendarClock, Flag, ChevronLeft, ChevronRight, CircleHelp, Download, FileSpreadsheet, Landmark, LogIn, LogOut, MoreHorizontal, Plus, RefreshCw, Search, Settings2, Target, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { accountName, formatDate, money, monthLabel, type AccountSetting, type Budget, type Goal, type Investment, type Transaction } from '../data';
import { merchantFor } from '../categorize';
import { AccountsPanel, DailyChart, GoalsPanel, InvestmentsPanel } from '../features';
import { colorRumbo, grados3, rumboDelMes } from './rumbo';
import { Rosa } from './Rosa';
import { entrar } from './animacion';

export type Seccion = 'dashboard' | 'analysis' | 'transactions' | 'budgets' | 'accounts' | 'goals' | 'investments';
type Filtro = 'all' | 'income' | 'expense' | 'transfer';
type Sync = 'local' | 'syncing' | 'synced' | 'pending' | 'offline';

/** Todo lo que el tema nuevo necesita de App: datos ya calculados y acciones. No guarda datos por su cuenta. */
export type VistaNueva = {
  tab: Seccion; go: (tab: Seccion) => void;
  month: string; shiftMonth: (paso: number) => void;
  user: User | null; configured: boolean; syncState: Sync; pending: number; transferred: number;
  onSync: () => void; onAuth: () => void; onSignOut: () => void;
  notice: string; clearNotice: () => void; busy: boolean;
  items: Transaction[]; monthly: Transaction[]; filtered: Transaction[];
  income: number; expenses: number; balance: number;
  groups: { category: string; total: number }[]; totalBudget: number;
  monthBudgets: Budget[]; goals: Goal[]; investments: Investment[]; accounts: AccountSetting[];
  balances: Record<string, number>; bankTotal: number; investmentValue: number; wealth: number;
  spentFor: (category: string) => number;
  search: string; setSearch: (s: string) => void;
  filter: Filtro; setFilter: (f: Filtro) => void;
  merchants: string[]; merchantFilter: string; setMerchantFilter: (m: string) => void;
  openTransaction: (t?: Transaction) => void;
  openBudget: (category?: string, amount?: number) => void; deleteBudget: (category: string) => void;
  openCategory: (category: string) => void;
  exportCSV: () => void; openImport: () => void; openGuide: () => void; openSettings: () => void;
  onTransfer: () => void;
  saveAccount: (a: AccountSetting) => void; mergeBank: (source: string, target: string) => boolean;
  saveGoal: (g: Goal) => void; deleteGoal: (id: string) => void;
  saveInvestment: (i: Investment) => void; deleteInvestment: (id: string) => void;
};

const TITULOS: Record<Seccion, [string, string]> = {
  dashboard: ['01', 'Tu rumbo'],
  analysis: ['02', 'Análisis'],
  transactions: ['03', 'Movimientos'],
  budgets: ['04', 'Presupuestos'],
  accounts: ['05', 'Cuentas y efectivo'],
  goals: ['06', 'Objetivos'],
  investments: ['07', 'Inversiones'],
};
const ICONOS: Record<Seccion, typeof Activity> = {
  dashboard: Activity, analysis: Activity, transactions: ArrowRight, budgets: Target, accounts: Landmark, goals: Wallet, investments: TrendingUp,
};
const EN_MAS: Seccion[] = ['budgets', 'accounts', 'goals', 'investments'];

const mesCorto = (month: string) => new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' })
  .format(new Date(`${month}-01T12:00:00`)).replace('.', '').replace(' de ', ' ').toUpperCase();
// «always» agrupa también los miles (2.480,00), como se lee en un extracto.
const formato = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
const cifra = (n: number) => formato.format(n);
const conSigno = (n: number, signo: '+' | '−' | '') => `${signo}${cifra(Math.abs(n))}`;

function Aguja({ tam = 26 }: { tam?: number }) {
  return <svg className="r-logo" width={tam} height={tam} viewBox="0 0 26 26" aria-hidden="true">
    <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M13 3.5 L16 13 L10 13 Z" className="r-logo-norte"/>
    <path d="M13 22.5 L10 13 L16 13 Z" fill="currentColor"/>
  </svg>;
}

function Kicker({ children }: { children: ReactNode }) { return <span className="r-kicker">{children}</span>; }

function Vacio({ texto, accion, etiqueta }: { texto: string; accion?: () => void; etiqueta?: string }) {
  return <div className="r-vacio"><Aguja tam={30}/><p>{texto}</p>{accion && <button className="r-enlace" onClick={accion}>{etiqueta ?? 'Añadir movimiento'} <ArrowRight size={15}/></button>}</div>;
}

/** Una fila de movimiento: todo el renglón abre la edición (allí también se puede eliminar). */
function Fila({ t, cuentas, onAbrir }: { t: Transaction; cuentas: AccountSetting[]; onAbrir: (t: Transaction) => void }) {
  const tipo = t.kind === 'income' ? 'Ingreso' : t.kind === 'transfer' ? 'Traspaso' : t.category;
  const comercio = merchantFor(t.description);
  const cuenta = accountName(t.account ?? 'bank', cuentas) + (t.to_account ? ` → ${accountName(t.to_account, cuentas)}` : '');
  const marca = t.kind === 'income' ? 'var(--r-verde)' : t.kind === 'transfer' ? 'var(--r-tenue)' : colorRumbo(t.category);
  return <button type="button" className={`r-fila r-fila-${t.kind}`} onClick={() => onAbrir(t)} aria-label={`Editar ${t.description}`}>
    <span className="r-fila-marca" style={{ background: marca }}/>
    <span className="r-fila-texto"><strong>{t.description}</strong><span>{tipo}{comercio && comercio !== t.description ? ` · ${comercio}` : ''} · {cuenta}</span></span>
    <span className="r-fila-importe">{t.kind === 'income' ? '+' : t.kind === 'transfer' ? '↔ ' : '−'}{cifra(Number(t.amount))}</span>
  </button>;
}

export function Nuevo({ v }: { v: VistaNueva }) {
  const [mas, setMas] = useState(false);
  const pagina = useRef<HTMLElement | null>(null);
  const rumbo = useMemo(() => rumboDelMes(v.income, v.expenses), [v.income, v.expenses]);
  const enMas = EN_MAS.includes(v.tab);

  useEffect(() => entrar(pagina.current), [v.tab]);
  useEffect(() => {
    if (!mas) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setMas(false); };
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', tecla); };
  }, [mas]);

  const ir = (tab: Seccion) => { setMas(false); v.go(tab); };
  const inicial = v.user?.email?.charAt(0).toUpperCase() ?? 'T';
  const estado = !v.user
    ? { tono: 'local', texto: 'Tus datos se guardan en este dispositivo.' }
    : v.syncState === 'synced' ? { tono: 'bien', texto: v.transferred ? `${v.transferred} registros locales incorporados. Todo sincronizado.` : 'Todo sincronizado.' }
      : v.syncState === 'syncing' ? { tono: 'curso', texto: 'Sincronizando cambios…' }
        : v.syncState === 'offline' ? { tono: 'aviso', texto: `Sin conexión. ${v.pending} cambios pendientes; aún no aparecen en otros dispositivos.` }
          : { tono: 'aviso', texto: `${v.pending} cambios pendientes de sincronizar.` };

  const [num, titulo] = TITULOS[v.tab];
  const selectorMes = <div className="r-mes" role="group" aria-label="Mes">
    <button aria-label="Mes anterior" onClick={() => v.shiftMonth(-1)}><ChevronLeft size={17}/></button>
    <span aria-live="polite" title={monthLabel(v.month)}>{mesCorto(v.month)}</span>
    <button aria-label="Mes siguiente" onClick={() => v.shiftMonth(1)}><ChevronRight size={17}/></button>
  </div>;

  const cuenta = <div className="r-cuenta">
    <span className="r-avatar" aria-hidden="true">{inicial}</span>
    <span className="r-cuenta-texto"><strong>{v.user?.email ?? 'Mi espacio'}</strong><span className={`r-tono-${estado.tono}`}>{v.user ? (v.syncState === 'synced' ? 'Todo sincronizado' : v.syncState === 'syncing' ? 'Sincronizando…' : `${v.pending} pendientes`) : 'Solo en este dispositivo'}</span></span>
  </div>;

  return <div className="r-app">
    <aside className="r-riel" aria-label="Navegación de Brújula">
      <div className="r-marca"><Aguja/><span>brújula</span></div>
      <nav className="r-riel-nav" aria-label="Secciones">
        {(Object.keys(TITULOS) as Seccion[]).map((s) => <button key={s} className={v.tab === s ? 'activa' : ''} aria-current={v.tab === s ? 'page' : undefined} onClick={() => ir(s)}>
          <span className="r-num">{TITULOS[s][0]}</span>{s === 'dashboard' ? 'Rumbo' : TITULOS[s][1]}
        </button>)}
      </nav>
      <span className="r-riel-rotulo">CONEXIONES</span>
      <a className="r-conexion" href="https://kairos-kh.vercel.app/"><CalendarClock size={17}/><span>Kairós<small>Recibos y vencimientos</small></span><ArrowRight size={15} aria-hidden="true"/></a>
      <a className="r-conexion" href="https://faro-kh.vercel.app/"><Flag size={17}/><span>Faro<small>Metas y proyectos</small></span><ArrowRight size={15} aria-hidden="true"/></a>
      <div className="r-riel-hueco"/>
      <div className="r-riel-pie">
        {cuenta}
        <div className="r-riel-acciones">
          <button className="r-icono" onClick={v.openGuide} aria-label="Ver guía de Brújula" title="Guía"><CircleHelp size={18}/></button>
          <button className="r-icono" onClick={v.openSettings} aria-label="Configuración" title="Configuración"><Settings2 size={18}/></button>
          {v.user
            ? <button className="r-icono" onClick={v.onSignOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18}/></button>
            : v.configured && <button className="r-icono" onClick={v.onAuth} aria-label="Iniciar sesión" title="Iniciar sesión"><LogIn size={18}/></button>}
        </div>
      </div>
    </aside>

    <div className="r-cuerpo">
      <header className="r-cabecera">
        <div className="r-marca r-marca-movil"><Aguja/><span>brújula</span></div>
        <div className="r-titulo-escritorio"><Kicker>{num} — {monthLabel(v.month).toUpperCase()}</Kicker><h1>{v.tab === 'dashboard' ? 'Tu rumbo este mes' : titulo}</h1></div>
        <div className="r-cabecera-acciones">
          {selectorMes}
          <button className="r-boton r-boton-suave r-solo-escritorio" onClick={v.openImport}><FileSpreadsheet size={17}/> Importar</button>
          <button className="r-boton r-boton-rumbo r-solo-escritorio" onClick={() => v.openTransaction()}><Plus size={18}/> Añadir movimiento</button>
          <button className="r-avatar-boton r-solo-movil" onClick={() => setMas(true)} aria-label="Abrir cuenta y más opciones">{inicial}</button>
        </div>
      </header>

      <div className={`r-estado r-tono-${estado.tono}`} role="status">
        <span className="r-punto" aria-hidden="true"/><span>{estado.texto}</span>
        {v.user && <button onClick={v.onSync} disabled={v.syncState === 'syncing'}><RefreshCw size={14}/> Sincronizar</button>}
        {!v.user && v.configured && <button onClick={v.onAuth}>Activar sincronización</button>}
      </div>
      {v.notice && <div className="r-aviso" role="alert"><span>{v.notice}</span><button onClick={v.clearNotice} aria-label="Cerrar aviso"><X size={16}/></button></div>}
      {v.busy && <div className="r-cargando"/>}

      <main ref={pagina} className={`r-pagina r-pagina-${v.tab}`} key={v.tab}>
        {v.tab !== 'dashboard' && <div className="r-titulo-movil r-entra"><Kicker>{num} — {mesCorto(v.month)}</Kicker><h1>{titulo}</h1></div>}

        {v.tab === 'dashboard' && <>
          <section className="r-rumbo r-entra" data-guide="home-summary">
            <div className="r-esfera">
              <Kicker>RUMBO DEL MES</Kicker>
              <Rosa rumbo={rumbo} grupos={v.groups} clave={v.month}/>
              <div className="r-lectura">
                <strong className="r-grados">{rumbo.ahorro === null ? '—' : grados3(rumbo.grados)}</strong>
                <p>{rumbo.texto}</p>
              </div>
              <p className="r-leyenda">N ahorras · E gastas lo que entra · S gastas de más</p>
            </div>
            <div className="r-lecturas">
              <button className="r-dato" onClick={() => { v.setFilter('income'); ir('transactions'); }}><Kicker>ENTRA</Kicker><strong className="r-verde-texto">{conSigno(v.income, '+')}</strong></button>
              <button className="r-dato" onClick={() => { v.setFilter('expense'); ir('transactions'); }}><Kicker>SALE</Kicker><strong>{conSigno(v.expenses, '−')}</strong></button>
              <button className="r-dato r-dato-tinta" onClick={() => ir('analysis')}><Kicker>QUEDA</Kicker><strong>{v.balance < 0 ? conSigno(v.balance, '−') : cifra(v.balance)}</strong></button>
              <Patrimonio v={v} ir={ir}/>
              <nav className="r-caminos" data-guide="home-paths" aria-label="Explorar tus finanzas">
                <button onClick={() => ir('analysis')}><Activity size={20}/><span><Kicker>ENTENDER</Kicker><strong>Análisis</strong><small>{v.groups.length ? `Más gasto: ${v.groups[0].category}` : 'Gráficos del mes'}</small></span></button>
                <button onClick={() => ir('budgets')}><Target size={20}/><span><Kicker>PLANIFICAR</Kicker><strong>Presupuestos</strong><small>{v.totalBudget ? `${money(v.totalBudget)} este mes` : 'Pon tu primer límite'}</small></span></button>
                <button onClick={() => ir('goals')}><Wallet size={20}/><span><Kicker>AVANZAR</Kicker><strong>Objetivos</strong><small>{v.goals.length ? `${v.goals.length} en marcha` : 'Marca una meta'}</small></span></button>
                <button onClick={() => ir('accounts')}><Landmark size={20}/><span><Kicker>UBICAR</Kicker><strong>Cuentas</strong><small>Bancos y efectivo</small></span></button>
              </nav>
            </div>
          </section>
          <section className="r-tarjeta r-ultimos r-entra">
            <div className="r-tarjeta-cabeza"><Kicker>ÚLTIMOS MOVIMIENTOS</Kicker><button className="r-enlace" onClick={() => ir('transactions')}>Ver todos <ArrowRight size={15}/></button></div>
            {v.monthly.length
              ? v.monthly.slice().sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).slice(0, 5).map((t) => <Fila key={t.id} t={t} cuentas={v.accounts} onAbrir={v.openTransaction}/>)
              : <Vacio texto="Todavía no hay movimientos este mes." accion={() => v.openTransaction()}/>}
          </section>
        </>}

        {v.tab === 'analysis' && <Analisis v={v}/>}
        {v.tab === 'transactions' && <Movimientos v={v}/>}
        {v.tab === 'budgets' && <Presupuestos v={v}/>}
        {v.tab === 'accounts' && <div className="r-panel r-entra"><AccountsPanel settings={v.accounts} balances={v.balances} transactions={v.items} investments={v.investments} onSave={v.saveAccount} onMerge={v.mergeBank} onTransfer={v.onTransfer}/></div>}
        {v.tab === 'goals' && <div className="r-panel r-entra"><GoalsPanel goals={v.goals} onSave={v.saveGoal} onDelete={v.deleteGoal}/></div>}
        {v.tab === 'investments' && <div className="r-panel r-entra"><InvestmentsPanel investments={v.investments} accounts={v.accounts} onSave={v.saveInvestment} onDelete={v.deleteInvestment}/></div>}
        <footer className="r-pie">BRÚJULA · TU DINERO, CON RUMBO</footer>
      </main>
    </div>

    <nav className="r-barra" aria-label="Secciones">
      <button className={v.tab === 'dashboard' ? 'activa' : ''} aria-current={v.tab === 'dashboard' ? 'page' : undefined} onClick={() => ir('dashboard')}><Aguja tam={20}/>Rumbo</button>
      <button className={v.tab === 'transactions' ? 'activa' : ''} aria-current={v.tab === 'transactions' ? 'page' : undefined} onClick={() => ir('transactions')}><ArrowRight size={20}/>Movimientos</button>
      <button className="r-barra-mas" aria-label="Añadir movimiento" onClick={() => v.openTransaction()}><Plus size={24}/></button>
      <button className={v.tab === 'analysis' ? 'activa' : ''} aria-current={v.tab === 'analysis' ? 'page' : undefined} onClick={() => ir('analysis')}><Activity size={20}/>Análisis</button>
      <button className={enMas || mas ? 'activa' : ''} aria-expanded={mas} onClick={() => setMas(true)}><MoreHorizontal size={20}/>Más</button>
    </nav>

    {mas && <div className="r-velo" onMouseDown={(e) => { if (e.target === e.currentTarget) setMas(false); }}>
      <div className="r-hoja r-hoja-mas" role="dialog" aria-modal="true" aria-labelledby="r-mas-titulo">
        <div className="r-asa" aria-hidden="true"/>
        <div className="r-hoja-cabeza"><h2 id="r-mas-titulo">Más</h2><button className="r-icono r-icono-borde" onClick={() => setMas(false)} aria-label="Cerrar"><X size={18}/></button></div>
        <div className="r-mas-rejilla">
          {EN_MAS.map((s) => { const Icono = ICONOS[s]; return <button key={s} className={v.tab === s ? 'activa' : ''} onClick={() => ir(s)}><Icono size={20}/><span className="r-num">{TITULOS[s][0]}</span>{TITULOS[s][1]}</button>; })}
        </div>
        <a className="r-conexion" href="https://kairos-kh.vercel.app/"><CalendarClock size={17}/><span>Kairós<small>Recibos y vencimientos</small></span><ArrowRight size={15} aria-hidden="true"/></a>
      <a className="r-conexion" href="https://faro-kh.vercel.app/"><Flag size={17}/><span>Faro<small>Metas y proyectos</small></span><ArrowRight size={15} aria-hidden="true"/></a>
        <div className="r-mas-lista">
          <button onClick={() => { setMas(false); v.openImport(); }}><FileSpreadsheet size={18}/> Importar un extracto</button>
          <button onClick={() => { setMas(false); v.openGuide(); }}><CircleHelp size={18}/> Ver guía de Brújula</button>
          <button onClick={() => { setMas(false); v.openSettings(); }}><Settings2 size={18}/> Configuración y tema</button>
        </div>
        <div className="r-mas-cuenta">
          {cuenta}
          {v.user
            ? <div className="r-mas-cuenta-acciones"><button className="r-boton r-boton-suave" onClick={() => { setMas(false); v.onAuth(); }}>Contraseña</button><button className="r-boton r-boton-suave" onClick={() => { setMas(false); v.onSignOut(); }}><LogOut size={16}/> Salir</button></div>
            : v.configured && <button className="r-boton r-boton-rumbo" onClick={() => { setMas(false); v.onAuth(); }}><LogIn size={16}/> Iniciar sesión</button>}
        </div>
      </div>
    </div>}
  </div>;
}

function Patrimonio({ v, ir }: { v: VistaNueva; ir: (s: Seccion) => void }) {
  const partes = [
    { nombre: 'Bancos', valor: v.bankTotal, clase: 'r-seg-bancos', destino: 'accounts' as Seccion },
    { nombre: 'Efectivo', valor: v.balances.cash ?? 0, clase: 'r-seg-efectivo', destino: 'accounts' as Seccion },
    { nombre: 'Inversiones', valor: v.investmentValue, clase: 'r-seg-inversion', destino: 'investments' as Seccion },
  ];
  const total = partes.reduce((s, p) => s + Math.max(0, p.valor), 0);
  return <div className="r-patrimonio">
    <div className="r-patrimonio-cabeza"><Kicker>PATRIMONIO ESTIMADO</Kicker><strong>{money(v.wealth)}</strong></div>
    <div className="r-barra-seg" aria-hidden="true">{total > 0 && partes.map((p) => p.valor > 0 && <span key={p.nombre} className={p.clase} style={{ flexGrow: p.valor / total }}/>)}</div>
    <div className="r-patrimonio-partes">{partes.map((p) => <button key={p.nombre} onClick={() => ir(p.destino)}><i className={p.clase}/>{p.nombre}<b>{cifra(p.valor)} €</b></button>)}</div>
  </div>;
}

function Analisis({ v }: { v: VistaNueva }) {
  const max = Math.max(v.income, v.expenses, 1);
  return <>
    <section className="r-tarjeta r-entra" data-guide="analysis-chart">
      <div className="r-tarjeta-cabeza"><Kicker>ENTRA Y SALE</Kicker><span className="r-balance">Balance <b>{money(v.balance)}</b></span></div>
      <button className="r-flujo" onClick={() => { v.setFilter('income'); v.go('transactions'); }}>
        <span>Ingresos</span><b>{money(v.income)}</b><i><em className="r-flujo-entra" style={{ width: `${v.income / max * 100}%` }}/></i>
      </button>
      <button className="r-flujo" onClick={() => { v.setFilter('expense'); v.go('transactions'); }}>
        <span>Gastos</span><b>{money(v.expenses)}</b><i><em className="r-flujo-sale" style={{ width: `${v.expenses / max * 100}%` }}/></i>
      </button>
      <p className="r-nota">Toca una barra para ver sus movimientos.</p>
    </section>
    <section className="r-tarjeta r-entra">
      <div className="r-tarjeta-cabeza"><Kicker>¿EN QUÉ SE VA?</Kicker><span className="r-balance">{money(v.expenses)}</span></div>
      {v.groups.length ? <>
        <div className="r-barra-seg r-barra-seg-alta" aria-hidden="true">{v.groups.map((g) => <span key={g.category} style={{ flexGrow: g.total, background: colorRumbo(g.category) }}/>)}</div>
        <div className="r-categorias">{v.groups.map((g) => <button key={g.category} onClick={() => v.openCategory(g.category)}>
          <i style={{ background: colorRumbo(g.category) }}/><span>{g.category}</span><em>{v.expenses ? Math.round(g.total / v.expenses * 100) : 0} %</em><b>{money(g.total)}</b>
        </button>)}</div>
      </> : <Vacio texto="Aquí aparecerá el reparto de tus gastos." accion={() => v.openTransaction()}/>}
    </section>
    <div className="r-entra"><DailyChart transactions={v.monthly} month={v.month} onSelect={(fecha) => { v.setFilter('expense'); v.go('transactions'); v.setSearch(fecha); }}/></div>
    <section className="r-tarjeta r-entra">
      <div className="r-tarjeta-cabeza"><Kicker>TUS LÍMITES</Kicker><button className="r-enlace" onClick={() => v.go('budgets')}>Ver todos <ArrowRight size={15}/></button></div>
      {v.monthBudgets.length ? v.monthBudgets.slice(0, 4).map((b) => <Limite key={b.category} b={b} gastado={v.spentFor(b.category)}/>)
        : <Vacio texto="Todavía no hay presupuestos este mes." accion={() => v.openBudget()} etiqueta="Crear presupuesto"/>}
    </section>
  </>;
}

function Limite({ b, gastado }: { b: Budget; gastado: number }) {
  const limite = Number(b.amount), fraccion = Math.min(gastado / limite, 1), pasado = gastado > limite;
  return <div className={`r-limite ${pasado ? 'pasado' : ''}`}>
    <div className="r-limite-cabeza"><strong>{b.category}</strong><span>{cifra(gastado)} / {cifra(limite)}</span></div>
    <div className="r-pista"><span style={{ width: `${fraccion * 100}%`, background: pasado ? undefined : colorRumbo(b.category) }}/></div>
    <small>{pasado ? `${money(gastado - limite)} por encima del límite` : `Quedan ${money(limite - gastado)} · ${Math.round(fraccion * 100)} % usado`}</small>
  </div>;
}

function Movimientos({ v }: { v: VistaNueva }) {
  const dias = useMemo(() => {
    const grupos = new Map<string, Transaction[]>();
    for (const t of v.filtered) grupos.set(t.occurred_on, [...(grupos.get(t.occurred_on) ?? []), t]);
    return [...grupos.entries()];
  }, [v.filtered]);
  const filtros: [Filtro, string][] = [['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['transfer', 'Traspasos']];
  return <>
    <section className="r-herramientas r-entra">
      <label className="r-buscar"><Search size={18}/><input placeholder="Buscar comercio, categoría o fecha" aria-label="Buscar movimientos" value={v.search} onChange={(e) => v.setSearch(e.target.value)}/>{v.search && <button aria-label="Borrar búsqueda" onClick={() => v.setSearch('')}><X size={16}/></button>}</label>
      <div className="r-chips" role="group" aria-label="Filtrar por tipo">
        {filtros.map(([valor, nombre]) => <button key={valor} aria-pressed={v.filter === valor} onClick={() => v.setFilter(valor)}>{nombre}</button>)}
      </div>
      <div className="r-herramientas-fila">
        {v.merchants.length > 0 && <label className="r-selector"><span className="r-oculto">Comercio</span><select value={v.merchantFilter} onChange={(e) => v.setMerchantFilter(e.target.value)}><option value="all">Todos los comercios</option>{v.merchants.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>}
        <button data-guide="import-action" className="r-boton r-boton-suave" onClick={v.openImport}><FileSpreadsheet size={16}/> Importar</button>
        <button className="r-boton r-boton-suave" onClick={v.exportCSV} disabled={!v.monthly.length}><Download size={16}/> CSV</button>
      </div>
    </section>
    <div className="r-resumen r-entra"><span className="r-verde-texto">{conSigno(v.income, '+')}</span><span>{conSigno(v.expenses, '−')}</span><b>= {money(v.balance)}</b></div>
    <section className="r-lista r-entra" data-guide="transaction-list" aria-label={`Movimientos de ${monthLabel(v.month)}`}>
      {dias.length ? dias.map(([dia, filas]) => {
        const neto = filas.reduce((s, t) => s + (t.kind === 'income' ? Number(t.amount) : t.kind === 'expense' ? -Number(t.amount) : 0), 0);
        return <div key={dia} className="r-dia">
          <div className="r-dia-cabeza"><span>{formatDate(dia).toUpperCase()}</span><span>{neto > 0 ? conSigno(neto, '+') : neto < 0 ? conSigno(neto, '−') : '0,00'}</span></div>
          {filas.map((t) => <Fila key={t.id} t={t} cuentas={v.accounts} onAbrir={v.openTransaction}/>)}
        </div>;
      }) : <Vacio texto={v.monthly.length ? 'Ningún movimiento coincide con la búsqueda.' : 'Todavía no hay movimientos aquí. Empieza con el primero.'} accion={v.monthly.length ? () => { v.setSearch(''); v.setFilter('all'); v.setMerchantFilter('all'); } : () => v.openTransaction()} etiqueta={v.monthly.length ? 'Quitar filtros' : undefined}/>}
    </section>
  </>;
}

function Presupuestos({ v }: { v: VistaNueva }) {
  const planificado = v.monthBudgets.reduce((s, b) => s + Number(b.amount), 0);
  const usado = v.monthBudgets.reduce((s, b) => s + v.spentFor(b.category), 0);
  return <>
    <section className="r-intro r-entra" data-guide="budget-intro">
      <div><Kicker>PLAN MENSUAL</Kicker><h2>Un plan para gastar mejor.</h2><p>{planificado ? `${money(usado)} usados de ${money(planificado)} planificados en ${monthLabel(v.month)}.` : 'Fija una cantidad para cada categoría y ajusta sobre la marcha.'}</p></div>
      <button className="r-boton r-boton-rumbo" onClick={() => v.openBudget()}><Plus size={18}/> Nuevo presupuesto</button>
    </section>
    <div className="r-rejilla r-entra">
      {v.monthBudgets.map((b) => <article key={b.category} className="r-tarjeta r-presupuesto">
        <Limite b={b} gastado={v.spentFor(b.category)}/>
        <div className="r-presupuesto-acciones">
          <button className="r-enlace" onClick={() => v.openBudget(b.category, Number(b.amount))}><Settings2 size={14}/> Ajustar límite</button>
          <button className="r-icono" aria-label={`Eliminar presupuesto de ${b.category}`} onClick={() => v.deleteBudget(b.category)}><Trash2 size={16}/></button>
        </div>
      </article>)}
      <button className="r-anadir" onClick={() => v.openBudget()}><Plus size={22}/><strong>Añadir categoría</strong><span>Crea un nuevo límite mensual</span></button>
    </div>
  </>;
}

