import { useEffect, useRef, useState } from 'react';
import { accountName, type Transaction } from '../data';
import type { VistaNueva } from '../nuevo/Nuevo';
import { nombreDia, porDias, pulsoDelMes, ritmos } from '../corriente/datos';
import { el, encima, Glifo, Presupuesto, quieto } from './piezas';

const dos = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Una columna de puntos por día (1 punto = 10 €); lo que se sale de la escala, en rojo arriba. */
function pintarPulso(cont: HTMLElement, mes: string, p: ReturnType<typeof pulsoDelMes>) {
  const svg = cont.querySelector('svg')!, W = cont.clientWidth; if (!W) return;
  const [y, m] = mes.split('-').map(Number), N = p.diasMes, HOY = p.hoy;
  const filas = 10, dx = W / N, paso = Math.min(12, dx * 0.9), r = Math.min(paso, dx) * 0.34, H = filas * paso + 30;
  svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H)); svg.replaceChildren();
  for (let d = 1; d <= N; d++) {
    const x = (d - 0.5) * dx, g = el('g', d <= HOY ? { 'data-g': `d${d}` } : {});
    if (d <= HOY) g.append(el('rect', { x: x - dx / 2, y: 0, width: dx, height: filas * paso, fill: 'transparent', class: 'ancla' }));
    const n = d <= HOY ? Math.round(p.gasto[d - 1] / 10) : 0;
    for (let f = 0; f < filas; f++) {
      const cy = (filas - f - 0.5) * paso;
      if (d > HOY) { if (f === 0) g.append(el('circle', { cx: x, cy, r: r * 0.8 })); continue; }
      const on = f < n, sale = n > filas && f === filas - 1;
      const c = el('circle', { cx: x.toFixed(1), cy: cy.toFixed(1), r, class: on ? `${sale ? 'rojo' : p.enCurso && d === HOY ? 'on' : 'medio'} ap` : '' });
      if (on) (c as SVGElement).style.setProperty('--d', `${d * 40 + f * 18}ms`);
      g.append(c);
    }
    const esHoy = p.enCurso && d === HOY, junto = p.enCurso && Math.abs(d - HOY) === 1;
    if (esHoy || (!junto && (d === 1 || d % 5 === 0 || d === N))) {
      const t = el('text', { x, y: H - 6, 'text-anchor': 'middle', fill: p.enCurso && d === HOY ? '#fff' : '#7D7D7D', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 10.5, 'letter-spacing': '.06em' });
      t.textContent = p.enCurso && d === HOY ? 'HOY' : String(d); g.append(t);
    }
    if (p.enCurso && d === HOY) g.append(el('circle', { cx: x, cy: filas * paso + 8, r: 2.2, class: 'rojo parpadea' }));
    svg.append(g);
  }
  if (!quieto()) { cont.classList.remove('vivo'); void cont.offsetWidth; cont.classList.add('vivo'); setTimeout(() => cont.classList.remove('vivo'), 2600); }
  const dia = (d: number) => new Date(y, m - 1, d).getDay();
  return encima(cont, (id) => {
    const d = Number(id.slice(1)), n = p.cuantos[d - 1];
    return { n: `${DIAS[dia(d)]} ${d}${p.enCurso && d === HOY ? ' · hoy' : ''}`, v: `${dos.format(p.gasto[d - 1])}<small>€</small>`, d: `${n} movimiento${n === 1 ? '' : 's'}`, alerta: p.gasto[d - 1] > 100 ? 'Se sale de la escala' : '' };
  });
}

const importe = (t: Transaction) => `${t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}${dos.format(Number(t.amount))} €`;

export function Movimientos({ v }: { v: VistaNueva }) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const pulso = pulsoDelMes(v.monthly, v.month);
  const clave = JSON.stringify([pulso.gasto, pulso.hoy]);
  useEffect(() => {
    if (!lienzo.current || !pulso.hoy) return;
    let quitar = pintarPulso(lienzo.current, v.month, pulso), ancho = innerWidth, t = 0;
    const cambio = () => { if (innerWidth === ancho) return; ancho = innerWidth; clearTimeout(t); t = window.setTimeout(() => { quitar?.(); quitar = lienzo.current ? pintarPulso(lienzo.current, v.month, pulso) : undefined; }, 120); };
    addEventListener('resize', cambio);
    return () => { quitar?.(); removeEventListener('resize', cambio); clearTimeout(t); };
  }, [clave, v.month]);
  const filas = ritmos(v.monthBudgets, v.spentFor, v.month);
  const categorias = v.groups.slice(0, 3).map((g) => g.category);
  const lista = categoria ? v.filtered.filter((t) => t.category === categoria) : v.filtered;
  const mes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${v.month}-01T12:00:00`));
  const elegir = (f: string) => { if (f === 'all' || f === 'expense' || f === 'income') { v.setFilter(f); setCategoria(null); } else { v.setFilter('all'); setCategoria(f); } };
  const activo = (f: string) => categoria ? categoria === f : v.filter === f;
  return <section className="vista" id="movimientos" aria-labelledby="h-movimientos">
    <div className="vcab">
      <div><h1 id="h-movimientos" tabIndex={-1}>Movimientos</h1>
        <p className="sub">{v.monthly.length} en {mes} · entran <span className="mono">{dos.format(v.income)} €</span> · salen <span className="mono">{dos.format(v.expenses)} €</span>.</p></div>
      <div className="acciones"><button type="button" className="boton" onClick={v.openImport}><Glifo g="sube"/>Importar extracto</button></div>
    </div>
    {pulso.hoy > 0 && <section className="mod" aria-labelledby="h-pulso">
      <div className="tit"><h2 id="h-pulso">Lo que sale cada día</h2><span className="escala">1 punto = 10 €</span></div>
      <div className="vis" ref={lienzo} style={{ marginTop: 22 }}>
        <svg role="img" aria-label={`Gasto diario de ${mes}${pulso.enCurso ? ` hasta hoy, día ${pulso.hoy}` : ''}: ${dos.format(v.expenses)} € en total.`}/>
        <div className="tip"><p className="n"/><p className="v"/><p className="d"/><p className="d rojo" hidden/></div>
      </div>
    </section>}
    <div className="rejilla">
      <section className="mod" aria-label="Lista de movimientos">
        <div className="herramientas">
          <label className="buscar"><span className="sr">Buscar movimientos</span><Glifo g="lupa"/>
            <input type="search" placeholder="Buscar: Mercadona, cine…" autoComplete="off" value={v.search} onChange={(e) => v.setSearch(e.target.value)}/></label>
          <div className="chips" role="group" aria-label="Filtrar">
            {[['all', 'Todo'], ['expense', 'Gastos'], ['income', 'Ingresos'], ...categorias.map((c) => [c, c])].map(([f, nombre]) =>
              <button key={f} type="button" aria-pressed={activo(f)} onClick={() => elegir(f)}>{nombre}</button>)}
          </div>
        </div>
        {!lista.length && <p className="vacio">{v.search ? `Nada con «${v.search}» este mes.` : 'Ningún movimiento este mes todavía.'}</p>}
        {porDias(lista).map((d) => <div className="dia-grupo" key={d.fecha}>
          <h3><span>{nombreDia(d.fecha)}</span>{d.sale > 0 && <span>−{dos.format(d.sale)} €</span>}</h3>
          <ul className="movs">{d.lista.map((t) => <li key={t.id}><button type="button" className="mov mov-editar" onClick={() => v.openTransaction(t)} aria-label={`Editar ${t.description}, ${importe(t)}`}>
            <b>{t.description}</b><span className={`cant${t.kind === 'income' ? ' entra' : ''}`}>{importe(t)}</span>
            <small>{t.kind === 'transfer' ? `Traspaso · ${accountName(t.account ?? 'bank', v.accounts)} → ${accountName(t.to_account ?? 'cash', v.accounts)}` : `${t.category} · ${accountName(t.account ?? 'bank', v.accounts)}`}</small>
          </button></li>)}</ul>
        </div>)}
      </section>
      <section className="mod der" aria-labelledby="h-presu-m">
        <div className="tit"><h2 id="h-presu-m">Presupuestos</h2><button type="button" className="ir" onClick={() => v.openBudget()}>Añadir<Glifo g="mas"/></button></div>
        {filas.length ? <>
          <p className="res">La raya es el límite; los huecos, dónde acabarás a este ritmo.</p>
          <div style={{ marginTop: 18 }}>{filas.map((r) => <Presupuesto key={r.nombre} r={r} onEditar={() => v.openBudget(r.nombre, r.limite)} onQuitar={() => v.deleteBudget(r.nombre)}/>)}</div>
          <p className="escala" style={{ marginTop: 10 }}>1 punto = 10 €</p>
        </> : <p className="res">Aún no hay presupuestos este mes.</p>}
      </section>
    </div>
  </section>;
}
