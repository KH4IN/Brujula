import { useEffect, useMemo, useRef, useState } from 'react';
import { accountName, type Transaction } from '../data';
import type { VistaNueva } from '../nuevo/Nuevo';
import { nombreDia, porDias, pulsoDelMes, ritmos } from './datos';
import { canvasTexto, clamp, escena, lineal, PERLA, smooth } from './escena';
import { euros } from './rio';
import { Icono, Presupuestos } from './piezas';

const dos = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
const importe = (t: Transaction) => `${t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}${dos.format(Number(t.amount))} €`;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** El pulso del mes: lo que sale cada día, como un cauce que se ensancha (maqueta de Corriente). */
function montarPulso(lienzo: HTMLElement, mes: string, p: ReturnType<typeof pulsoDelMes>) {
  const [y, m] = mes.split('-').map(Number);
  const diaSem = (d: number) => new Date(y, m - 1, d).getDay();
  const HOY = p.hoy, N = p.diasMes;
  return escena(lienzo, (W, H, movil, st) => {
    const pad = movil ? 10 : 18, x0 = pad, x1 = W - pad, dx = (x1 - x0) / (N - 1);
    const xd = (d: number) => x0 + (d - 1) * dx, xh = xd(HOY);
    const ym = H * 0.42, wmax = H * (movil ? 0.5 : 0.56);
    // El día más caro (el alquiler, casi siempre) se ve más ancho, pero no aplasta el resto del mes.
    // Suavizado de ±2 días: con gastos en pocos días el ancho saltaba de golpe y el cauce se rompía en palitos.
    const bruto = p.gasto.map(Math.sqrt), PESO = [1, 2, 3, 2, 1];
    const raiz = bruto.map((_, i) => { let s = 0, w = 0; for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < HOY) { s += bruto[j] * PESO[k + 2]; w += PESO[k + 2]; } } return w ? s / w : 0; });
    const orden = [...raiz.slice(0, HOY)].sort((a, b) => b - a), mx = Math.max(orden[1] ?? orden[0] ?? 1, 1);
    const ancho = (d: number) => 3 + Math.min(1.12, raiz[clamp(d, 1, HOY) - 1] / mx) * (wmax - 3);
    const WD = lineal(W, (x) => {
      const t = clamp((x - x0) / dx + 1, 1, HOY), d0 = Math.floor(t), f = smooth(t - d0);
      return ancho(d0) + (ancho(Math.min(d0 + 1, HOY)) - ancho(d0)) * f;
    });
    const Y = lineal(W, (x) => ym + Math.sin(x * 0.011) * 2.5);
    st.marca = null;
    const rotHoy = p.enCurso ? `hoy, ${HOY}` : String(HOY);
    return {
      vel: clamp(W * 0.045, 28, 64), sinAtenuar: true,
      rios: [{ Y, WD, x0: Math.max(0, x0 - 6), x1: xh, dir: 1, col: PERLA, grupo: 'g', fadeIn: 14, fadeOut: 10 }],
      fondo(ctx) {
        if (p.enCurso) { ctx.strokeStyle = 'rgba(236,234,228,.22)'; ctx.lineWidth = 1; ctx.setLineDash([1.5, 5]); ctx.beginPath(); ctx.moveTo(xh + 8, ym); ctx.lineTo(x1, ym); ctx.stroke(); ctx.setLineDash([]); }
        const yb = H - 24;
        for (let d = 1; d <= N; d++) {
          const x = xd(d), finde = [0, 6].includes(diaSem(d));
          ctx.fillStyle = d <= HOY ? (finde ? 'rgba(236,234,228,.32)' : 'rgba(236,234,228,.55)') : 'rgba(236,234,228,.16)';
          ctx.fillRect(x - 0.5, yb, 1, d % 5 === 0 || d === 1 ? 6 : 3);
        }
        const marcas = movil ? [1, 10, 20, N] : [1, 5, 10, 15, 20, 25, N];
        if (!marcas.includes(HOY)) marcas.push(HOY);
        for (const d of marcas) {
          if (d !== HOY && Math.abs(xd(d) - xh) < (movil ? 34 : 40)) continue;
          canvasTexto(ctx, d === HOY ? rotHoy : String(d), xd(d), H - 4, d === HOY ? '#ECEAE4' : '#6F6C67', d === 1 ? 'left' : d === N ? 'right' : 'center');
        }
        if (p.enCurso) { const top = ym - wmax / 2 - 10; ctx.fillStyle = 'rgba(236,234,228,.5)'; ctx.fillRect(xh - 0.5, top, 1, yb - top); }
      },
      encima(ctx) {
        if (!st.marca) return;
        const x = xd(st.marca);
        ctx.fillStyle = 'rgba(236,234,228,.9)'; ctx.fillRect(x - 0.5, 6, 1, H - 36);
        ctx.beginPath(); ctx.arc(x, ym, 3, 0, 6.283); ctx.fill();
      },
      sobre(mx2, my) {
        const d = Math.round((mx2 - x0) / dx) + 1;
        if (d < 1 || d > HOY || my > H - 26) { st.marca = null; return null; }
        st.marca = d;
        const nom = `${DIAS[diaSem(d)]} ${d}`, n = p.cuantos[d - 1];
        return { g: 'g', info: { n: nom.charAt(0).toUpperCase() + nom.slice(1) + (p.enCurso && d === HOY ? ' · hoy' : ''), v: euros(p.gasto[d - 1]), d: `${n} movimiento${n === 1 ? '' : 's'}` } };
      },
      info: () => null,
    };
  });
}

export function Movimientos({ v }: { v: VistaNueva }) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const clave = JSON.stringify(v.monthly.map((t) => [t.kind, t.amount, t.occurred_on]));
  const pulso = useMemo(() => pulsoDelMes(v.monthly, v.month), [clave, v.month]);
  useEffect(() => { if (lienzo.current && pulso.hoy > 0) return montarPulso(lienzo.current, v.month, pulso); }, [pulso, v.month]);
  const filas = useMemo(() => ritmos(v.monthBudgets, (c) => v.groups.find((g) => g.category === c)?.total ?? 0, v.month),
    [JSON.stringify([v.monthBudgets.map((b) => [b.category, b.amount]), v.groups])]);
  const chips: [string, string][] = [['all', 'Todo'], ['expense', 'Gastos'], ['income', 'Ingresos']];
  const categorias = v.groups.slice(0, 3).map((g) => g.category);
  const lista = categoria ? v.filtered.filter((t) => t.category === categoria) : v.filtered;
  const dias = porDias(lista);
  const n = v.monthly.length, mes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${v.month}-01T12:00:00`));
  const elegir = (f: string) => { if (f === 'all' || f === 'expense' || f === 'income') { v.setFilter(f); setCategoria(null); } else { v.setFilter('all'); setCategoria(f); } };
  const activo = (f: string) => categoria ? categoria === f : v.filter === f;
  return <section className="vista marco" id="movimientos" aria-labelledby="h-movimientos">
    <div className="vcab">
      <div><h1 id="h-movimientos" tabIndex={-1}>Movimientos</h1>
        <p className="sub">{n} en {mes}. Entran <span className="cifra">{dos.format(v.income)} €</span> y salen <span className="cifra">{dos.format(v.expenses)} €</span>.</p></div>
      <div className="acciones"><button type="button" className="boton" data-guide="t-importar" onClick={v.openImport}><Icono id="i-sube"/>Importar extracto</button></div>
    </div>
    {pulso.hoy > 0 && <>
      <p className="eti">Lo que sale cada día</p>
      <div className="lienzo pulso" ref={lienzo} data-guide="t-movimientos">
        <canvas role="img" aria-label={`Gasto diario de ${mes}${pulso.enCurso ? ` hasta hoy, día ${pulso.hoy}` : ''}: ${dos.format(v.expenses)} € en total.`}/>
        <div className="etiquetas"/>
        <div className="aviso" role="status" aria-live="polite"><p className="n"/><p className="v"/><p className="d"/><p className="d coral" hidden/></div>
      </div>
    </>}
    <div className="rejilla" style={{ paddingTop: 8 }}>
      <div className="c8">
        <div className="herramientas">
          <label className="buscar"><span className="sr">Buscar movimientos</span><Icono id="i-lupa"/>
            <input type="search" placeholder="Buscar: Mercadona, cine…" autoComplete="off" value={v.search} onChange={(e) => v.setSearch(e.target.value)}/></label>
          <div className="chips" role="group" aria-label="Filtrar">
            {[...chips, ...categorias.map((c): [string, string] => [c, c])].map(([f, nombre]) =>
              <button key={f} type="button" aria-pressed={activo(f)} onClick={() => elegir(f)}>{nombre}</button>)}
          </div>
        </div>
        <div>
          {!dias.length && <p className="vacio">{v.search ? `Nada con «${v.search}» este mes.` : 'Ningún movimiento este mes todavía.'}</p>}
          {dias.map((d) => <div className="dia-grupo" key={d.fecha}>
            <h3><span>{nombreDia(d.fecha)}</span>{d.sale > 0 && <span className="cifra">−{dos.format(d.sale)} €</span>}</h3>
            <ul className="movs">{d.lista.map((t) =>
              <li key={t.id}><button type="button" className="mov mov-editar" onClick={() => v.openTransaction(t)} aria-label={`Editar ${t.description}, ${importe(t)}`}>
                <b>{t.description}</b><span className={`imp${t.kind === 'income' ? ' entra' : ''}`}>{importe(t)}</span>
                <small>{t.kind === 'transfer' ? `Traspaso · ${accountName(t.account ?? 'bank', v.accounts)} → ${accountName(t.to_account ?? 'cash', v.accounts)}` : `${t.category} · ${accountName(t.account ?? 'bank', v.accounts)}`}</small>
              </button></li>)}</ul>
          </div>)}
        </div>
      </div>
      <aside className="c-der" aria-labelledby="h-presu-m" style={{ paddingTop: 36 }}>
        <div className="cab"><h2 id="h-presu-m">Presupuestos</h2><button type="button" className="ir" onClick={() => v.openBudget()}>Añadir<Icono id="i-mas"/></button></div>
        <div className="presu"><Presupuestos filas={filas} onAnadir={() => v.openBudget()}
          onEditar={(f) => v.openBudget(f.nombre, f.limite)} onQuitar={(f) => v.deleteBudget(f.nombre)}/></div>
        {filas.length > 0 && <p className="nota" style={{ marginTop: 18 }}>La raya es el límite. El tramo discontinuo, dónde acabarás a este ritmo.</p>}
      </aside>
    </div>
  </section>;
}
