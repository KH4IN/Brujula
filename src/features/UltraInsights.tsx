import { money, type AccountSetting, type Budget, type Goal, type Investment, type Transaction } from '../data';
import { accountName } from '../data';

type Section = 'analysis' | 'transactions' | 'budgets' | 'accounts' | 'goals' | 'investments';
type Bar = { label: string; value: number; text?: string };

function Bars({ rows, max, action }: { rows: Bar[]; max?: number; action?: (label: string) => void }) {
  const ceiling = Math.max(max ?? 0, ...rows.map(row => row.value), 1);
  return <div className="ultra-data-bars">{rows.map(row => <div key={row.label} className="ultra-data-row"><div><span>{row.label}</span><strong>{row.text ?? money(row.value)}</strong></div><div className="ultra-data-track"><span style={{ width: `${Math.max(0,Math.min(100,row.value / ceiling * 100))}%` }}/></div>{action && <button onClick={() => action(row.label)} aria-label={`Ver ${row.label}`}>Ver detalle</button>}</div>)}</div>;
}

/** Data-first visuals; calculations only read the same records shown in the detail panels. */
export function UltraInsights({ section, monthly, budgets, accounts, balances, goals, investments, income, expenses, onFilter }: {
  section: Section; monthly: Transaction[]; budgets: Budget[]; accounts: AccountSetting[];
  balances: Record<string, number>; goals: Goal[]; investments: Investment[];
  income: number; expenses: number; onFilter: (kind: 'income' | 'expense' | 'transfer') => void;
}) {
  const spent = (category: string) => monthly.filter(t => t.kind === 'expense' && t.category === category).reduce((sum,t) => sum + Number(t.amount),0);
  const investmentValue = investments.reduce((sum,i) => sum + Number(i.units) * Number(i.current_price),0);
  const investmentCost = investments.reduce((sum,i) => sum + Number(i.units) * Number(i.average_cost),0);
  const title = ({analysis:'La historia del mes',transactions:'Actividad en números',budgets:'Tu plan frente a la realidad',accounts:'El mapa de tu dinero',goals:'El progreso de tus metas',investments:'La composición de tu cartera'} as const)[section];
  let summary: string;
  let rows: Bar[];
  if (section === 'analysis') {
    summary = `Balance: ${money(income-expenses)}. La gráfica compara ingresos y gastos del mes.`;
    rows = [{label:'Ingresos',value:income},{label:'Gastos',value:expenses}];
  } else if (section === 'transactions') {
    const count = (kind: Transaction['kind']) => monthly.filter(t => t.kind === kind).length;
    summary = `${monthly.length} movimientos este mes. Toca un grupo para filtrarlo.`;
    rows = [{label:'Ingresos',value:count('income'),text:`${count('income')} operaciones`},{label:'Gastos',value:count('expense'),text:`${count('expense')} operaciones`},{label:'Traspasos',value:count('transfer'),text:`${count('transfer')} operaciones`}];
  } else if (section === 'budgets') {
    const planned = budgets.reduce((sum,b) => sum + Number(b.amount),0);
    const used = budgets.reduce((sum,b) => sum + spent(b.category),0);
    summary = `${money(used)} utilizados de ${money(planned)} planificados. Las barras muestran cada categoría.`;
    rows = budgets.map(b => ({label:b.category,value:spent(b.category),text:`${money(spent(b.category))} / ${money(Number(b.amount))}`}));
  } else if (section === 'accounts') {
    const total = accounts.reduce((sum,a) => sum + (balances[a.account] ?? 0),0);
    summary = `${money(total)} distribuidos entre bancos y efectivo, antes de sumar inversiones.`;
    rows = accounts.map(a => ({label:accountName(a.account,accounts),value:Math.max(0,balances[a.account] ?? 0),text:money(balances[a.account] ?? 0)}));
  } else if (section === 'goals') {
    const saved = goals.reduce((sum,g) => sum + Number(g.saved_amount),0);
    summary = `${goals.length} objetivos; ${money(saved)} marcados como reservados. Este dinero ya forma parte de tus saldos.`;
    rows = goals.map(g => ({label:g.name,value:Math.min(Number(g.saved_amount),Number(g.target_amount)),text:`${money(Number(g.saved_amount))} / ${money(Number(g.target_amount))}`}));
  } else {
    summary = `${money(investmentValue)} de valor estimado; variación de ${money(investmentValue-investmentCost)} respecto al coste.`;
    rows = investments.map(i => ({label:i.name,value:Number(i.units)*Number(i.current_price)}));
  }
  return <section className={`ultra-insights ultra-insights-${section}`} aria-label={`Resumen de ${section}`}>
    <div className="ultra-insights-intro"><span>DATOS EN VIVO / {section.toUpperCase()}</span><h2>{title}</h2><p>{summary}</p></div>
    <div className="ultra-insights-visual">{rows.length ? <Bars rows={rows.slice(0,7)} max={section==='budgets'?Math.max(...budgets.map(b => Number(b.amount)),1):undefined} action={section==='transactions' ? label => onFilter(label==='Ingresos'?'income':label==='Gastos'?'expense':'transfer') : undefined}/> : <div className="ultra-insights-empty">Todavía no hay datos para dibujar esta vista. Añade registros abajo y aparecerán aquí.</div>}</div>
  </section>;
}
