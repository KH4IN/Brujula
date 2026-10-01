import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as TeclaReact, type PointerEvent as PunteroReact, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, CalendarClock, ChevronLeft, ChevronRight, CircleHelp, Command, Download, FileSpreadsheet, Flag, LogIn, LogOut, Plus, RefreshCw, Search, Settings2, X } from 'lucide-react';
import { accountName, localDate, monthLabel, type Goal, type Transaction } from '../data';
import { investedCost } from '../finance';
import { merchantFor } from '../categorize';
import { AccountsPanel, GoalsPanel, InvestmentsPanel } from '../features';
import type { Seccion, VistaNueva } from '../nuevo/Nuevo';
import { arcos, colorRumbo, grados3, rumboDelMes } from '../nuevo/rumbo';
import { diasDelMes, diasRecorridos, mesDeLlegada, mesesEntre, previsionGasto, rumboDelPuntero, rutaDelMes } from './carta';
import './carta.css';

/* ───────── Utilidades de presentación ───────── */

const formato = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
const cifra = (n: number) => formato.format(n);
const eur = (n: number) => `${cifra(n)} €`;
const entero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' as unknown as boolean });
const mesLargo = (mes: string) => new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${mes}-01T12:00:00`));
const mesConAnio = (mes: string) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${mes}-01T12:00:00`)).replace(' de ', ' ');
const diaLargo = (fecha: string) => new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${fecha}T12:00:00`)).replace('.', '');

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Cifra que navega de su valor anterior al nuevo con una salida exponencial. */
function useCifra(valor: number, duracion = 900) {
  const [mostrado, setMostrado] = useState(valor);
  const previo = useRef(valor);
  useEffect(() => {
    const desde = previo.current;
    previo.current = valor;
    if (desde === valor || movimientoReducido()) { setMostrado(valor); return; }
    let marco = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const curva = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setMostrado(desde + (valor - desde) * curva);
      if (t < 1) marco = requestAnimationFrame(paso);
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [valor, duracion]);
  return mostrado;
}

function Cifra({ valor, signo = false }: { valor: number; signo?: boolean }) {
  const n = useCifra(valor);
  const s = signo ? (valor > 0 ? '+' : valor < 0 ? '−' : '') : valor < 0 ? '−' : '';
  return <span className="c-num">{s}{cifra(Math.abs(n))}<span className="c-eur"> €</span></span>;
}

/** Aguja del logotipo: la misma de Brújula, en latón. */
function Aguja({ tam = 26 }: { tam?: number }) {
  return <svg className="c-logo" width={tam} height={tam} viewBox="0 0 26 26" aria-hidden="true">
    <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M13 3.5 L16 13 L10 13 Z" className="c-logo-norte"/>
    <path d="M13 22.5 L10 13 L16 13 Z" fill="currentColor"/>
  </svg>;
}

const SECCIONES: { id: Seccion; ancla: string; nombre: string; corto: string }[] = [
  { id: 'dashboard', ancla: 'c-rumbo', nombre: 'Rumbo', corto: 'Rumbo' },
  { id: 'analysis', ancla: 'c-corrientes', nombre: 'Corrientes del mes', corto: 'Corrientes' },
  { id: 'budgets', ancla: 'c-presupuestos', nombre: 'Presupuestos', corto: 'Presupuestos' },
  { id: 'transactions', ancla: 'c-movimientos', nombre: 'Movimientos', corto: 'Movimientos' },
  { id: 'accounts', ancla: 'c-cuentas', nombre: 'Cuentas y efectivo', corto: 'Cuentas' },
  { id: 'goals', ancla: 'c-objetivos', nombre: 'Objetivos', corto: 'Objetivos' },
  { id: 'investments', ancla: 'c-inversiones', nombre: 'Inversiones', corto: 'Inversiones' },
];
const anclaDe = (s: Seccion) => SECCIONES.find((x) => x.id === s)?.ancla ?? 'c-rumbo';
const irA = (ancla: string) => document.getElementById(ancla)?.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });

/* ───────── Rosa de los vientos: rumbo del mes y gasto por categoría ───────── */

const C = 200, R_ARCO = 146, R_ESCALA = 186;

function RosaCarta({ grupos, grados, foco, setFoco, onElegir }: {
  grupos: { category: string; total: number }[]; grados: number;
  foco: string | null; setFoco: (c: string | null) => void; onElegir: (c: string) => void;
}) {
  const circ = 2 * Math.PI * R_ARCO;
  const tramos = useMemo(() => arcos(grupos, circ, 4), [grupos, circ]);
  const total = grupos.reduce((s, g) => s + Math.max(0, g.total), 0);
  const [aguja, setAguja] = useState(0);
  const [alidada, setAlidada] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  useEffect(() => { const m = requestAnimationFrame(() => setAguja(grados)); return () => cancelAnimationFrame(m); }, [grados]);

  const categoriaEn = (angulo: number) => tramos.find((a) => {
    const ini = (a.inicio / circ) * 360, fin = ((a.inicio + a.largo) / circ) * 360;
    return angulo >= ini && angulo <= fin;
  })?.categoria ?? null;

  function mover(e: PunteroReact<SVGSVGElement>) {
    const caja = svg.current?.getBoundingClientRect();
    if (!caja) return;
    const x = ((e.clientX - caja.left) / caja.width) * 400, y = ((e.clientY - caja.top) / caja.height) * 400;
    const dist = Math.hypot(x - C, y - C);
    if (dist < 60 || dist > 200) { setAlidada(null); return; }
    const ang = rumboDelPuntero(x, y, C, C);
    setAlidada(ang);
    setFoco(dist > R_ARCO - 26 && dist < R_ARCO + 26 ? categoriaEn(ang) : null);
  }

  const marcado = foco ? tramos.find((a) => a.categoria === foco) : null;
  const lectura = marcado
    ? { titulo: marcado.categoria, valor: eur(marcado.total), pie: `${Math.round((marcado.total / total) * 100)} % del gasto` }
    : alidada !== null
      ? { titulo: 'Alidada', valor: grados3(alidada), pie: 'Pasa por un arco para leer su categoría' }
      : { titulo: 'Rumbo del mes', valor: grados3(grados), pie: total ? `${tramos.length} categorías con gasto` : 'Aún sin gastos' };

  return <figure className="c-rosa">
    <svg ref={svg} viewBox="0 0 400 400" role="group" aria-label="Rosa de los vientos: rumbo del mes y gasto por categoría"
      onPointerMove={mover} onPointerLeave={() => { setAlidada(null); setFoco(null); }}>
      <defs>
        <radialGradient id="c-rosa-fondo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--c-superficie)"/><stop offset="100%" stopColor="var(--c-fondo)"/>
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={198} fill="url(#c-rosa-fondo)"/>
      <circle cx={C} cy={C} r={R_ESCALA + 10} className="c-rosa-borde"/>
      <circle cx={C} cy={C} r={R_ESCALA - 14} className="c-rosa-fino"/>
      {Array.from({ length: 72 }, (_, i) => {
        const largo = i % 6 === 0 ? 12 : i % 2 === 0 ? 7 : 4;
        return <line key={i} className={i % 6 === 0 ? 'c-raya c-raya-larga' : 'c-raya'} x1={C} y1={C - R_ESCALA - 8} x2={C} y2={C - R_ESCALA - 8 + largo} transform={`rotate(${i * 5} ${C} ${C})`}/>;
      })}
      {(['N', 'E', 'S', 'O'] as const).map((p, i) => <text key={p} className={`c-punto ${p === 'N' ? 'c-punto-norte' : ''}`} x={C + Math.sin((i * Math.PI) / 2) * 118} y={C - Math.cos((i * Math.PI) / 2) * 118 + 6} textAnchor="middle">{p}</text>)}
      {/* Estrella de ocho puntas, grabada */}
      <g className="c-estrella" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${C} ${C - (i % 2 ? 70 : 104)} L${C + 9} ${C} L${C} ${C + 4} L${C - 9} ${C} Z`} transform={`rotate(${i * 45} ${C} ${C})`} className={i % 2 ? 'c-punta-menor' : 'c-punta'}/>)}
      </g>
      <circle cx={C} cy={C} r={R_ARCO} className="c-arco-guia"/>
      {tramos.map((a) => <circle key={a.categoria} cx={C} cy={C} r={R_ARCO} fill="none" stroke={a.color}
        className={`c-arco ${foco === a.categoria ? 'c-arco-foco' : foco ? 'c-arco-apagado' : ''}`}
        strokeDasharray={`${a.largo} ${circ - a.largo}`} strokeDashoffset={-a.inicio} transform={`rotate(-90 ${C} ${C})`}
        tabIndex={0} role="button" aria-label={`${a.categoria}: ${eur(a.total)}. Ver sus movimientos`}
        onFocus={() => setFoco(a.categoria)} onBlur={() => setFoco(null)}
        onClick={() => onElegir(a.categoria)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onElegir(a.categoria); } }}/>)}
      {alidada !== null && <g className="c-alidada" transform={`rotate(${alidada} ${C} ${C})`} aria-hidden="true">
        <line x1={C} y1={C - 40} x2={C} y2={C - 196}/><circle cx={C} cy={C - 196} r={3.5}/>
      </g>}
      <g className="c-aguja" style={{ transform: `rotate(${aguja}deg)` }} aria-hidden="true">
        <path d={`M${C} ${C - 128} L${C + 11} ${C} L${C - 11} ${C} Z`} className="c-aguja-norte"/>
        <path d={`M${C} ${C + 128} L${C - 11} ${C} L${C + 11} ${C} Z`} className="c-aguja-sur"/>
      </g>
      <circle cx={C} cy={C} r={9} className="c-eje"/><circle cx={C} cy={C} r={3} className="c-eje-centro"/>
    </svg>
    <figcaption className="c-lectura" aria-live="polite">
      <span>{lectura.titulo}</span><strong>{lectura.valor}</strong><small>{lectura.pie}</small>
    </figcaption>
  </figure>;
}

/* ───────── Corrientes: el mes día a día ───────── */

function Corrientes({ movimientos, mes, hoy, onDia }: { movimientos: Transaction[]; mes: string; hoy: string; onDia: (fecha: string) => void }) {
  const caja = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(900);
  const [sel, setSel] = useState<number | null>(null);
  const dias = useMemo(() => rutaDelMes(movimientos, mes), [movimientos, mes]);
  const recorridos = diasRecorridos(mes, hoy);
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const estrecho = ancho < 640;
  const alto = estrecho ? 250 : 320, sondas = estrecho ? 56 : 72, pi = 10, pd = 10, ps = 18;
  const baseLinea = alto - sondas - 34;
  const vistos = dias.slice(0, Math.max(recorridos, 0) || 0);
  const valores = (vistos.length ? vistos : dias).map((d) => d.acumulado);
  const max = Math.max(0, ...valores), min = Math.min(0, ...valores);
  const rango = max - min || 1;
  const paso = (ancho - pi - pd) / Math.max(1, dias.length - 1);
  const x = (i: number) => pi + i * paso;
  const y = (v: number) => ps + ((max - v) / rango) * (baseLinea - ps);
  const maxSale = Math.max(1, ...dias.map((d) => d.sale));
  const anchoBarra = Math.max(2, Math.min(14, paso * 0.56));
  const ruta = vistos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.acumulado).toFixed(1)}`).join(' ');
  const area = vistos.length ? `${ruta} L${x(vistos.length - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z` : '';
  const elegido = sel !== null ? dias[sel] : null;
  const etiquetas = [1, 5, 10, 15, 20, 25, dias.length].filter((d, i, a) => a.indexOf(d) === i && d <= dias.length);

  function mover(e: PunteroReact<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - r.left - pi) / paso);
    setSel(Math.max(0, Math.min(dias.length - 1, i)));
  }
  function tecla(e: TeclaReact<SVGSVGElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setSel((s) => Math.max(0, Math.min(dias.length - 1, (s ?? (recorridos ? recorridos - 1 : 0)) + (e.key === 'ArrowRight' ? 1 : -1))));
    } else if ((e.key === 'Enter' || e.key === ' ') && elegido) { e.preventDefault(); onDia(elegido.fecha); }
  }

  const sinDatos = !dias.some((d) => d.entra || d.sale);
  return <div className="c-corrientes" ref={caja}>
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} className="c-corrientes-svg" tabIndex={0}
      role="img" aria-label={`Saldo acumulado de ${mesLargo(mes)} día a día. Usa las flechas para recorrerlo e Intro para ver los movimientos del día.`}
      onPointerMove={mover} onPointerLeave={() => setSel(null)} onKeyDown={tecla} onBlur={() => setSel(null)}
      onClick={() => elegido && onDia(elegido.fecha)}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} className="c-reticula" x1={0} x2={ancho} y1={ps + f * (baseLinea - ps)} y2={ps + f * (baseLinea - ps)}/>)}
      <line className="c-cero" x1={0} x2={ancho} y1={y(0)} y2={y(0)}/>
      {area && <path key={`a-${mes}`} d={area} className="c-ruta-area"/>}
      {ruta && <path key={`r-${mes}`} d={ruta} className="c-ruta" pathLength={1}/>}
      {recorridos > 0 && recorridos < dias.length && <g className="c-hoy">
        <line x1={x(recorridos - 1)} x2={x(recorridos - 1)} y1={ps - 6} y2={alto - 22}/>
        <text x={x(recorridos - 1) + 6} y={ps + 4}>HOY</text>
      </g>}
      {vistos.length > 0 && <circle className="c-barco" cx={x(vistos.length - 1)} cy={y(vistos[vistos.length - 1].acumulado)} r={5}/>}
      <line className="c-cero" x1={0} x2={ancho} y1={alto - sondas - 18} y2={alto - sondas - 18}/>
      {dias.map((d, i) => <g key={d.dia} className={i >= recorridos && recorridos < dias.length ? 'c-futuro' : ''}>
        {d.sale > 0 && <rect className="c-sonda" x={x(i) - anchoBarra / 2} y={alto - sondas - 18} width={anchoBarra} height={Math.max(2, (d.sale / maxSale) * (sondas - 4))} rx={1}/>}
        {d.entra > 0 && <path className="c-entrada" d={`M${x(i)} ${alto - sondas - 30} l4 6 h-8 Z`}/>}
      </g>)}
      {etiquetas.map((d) => <text key={d} className="c-eje-texto" x={x(d - 1)} y={alto - 4} textAnchor={d === 1 ? 'start' : d === dias.length ? 'end' : 'middle'}>{d}</text>)}
      {elegido && <g className="c-cursor"><line x1={x(elegido.dia - 1)} x2={x(elegido.dia - 1)} y1={ps - 6} y2={alto - 22}/>
        {elegido.dia <= Math.max(recorridos, 0) && <circle cx={x(elegido.dia - 1)} cy={y(elegido.acumulado)} r={4.5}/>}</g>}
    </svg>
    {elegido && <div className="c-boya" style={{ left: Math.max(8, Math.min(ancho - 218, x(elegido.dia - 1) - 105)) }} role="status">
      <strong>{diaLargo(elegido.fecha)}</strong>
      <span><i className="c-pto c-pto-verde"/>Entra <b>{eur(elegido.entra)}</b></span>
      <span><i className="c-pto c-pto-coral"/>Sale <b>{eur(elegido.sale)}</b></span>
      {elegido.dia <= Math.max(recorridos, 0) && <span><i className="c-pto c-pto-laton"/>Acumulado <b>{eur(elegido.acumulado)}</b></span>}
      <small>Pulsa para ver los movimientos del día</small>
    </div>}
    {sinDatos && <p className="c-vacio-flotante">Sin movimientos en {mesLargo(mes)}. La corriente aparecerá con el primero.</p>}
  </div>;
}

/* ───────── Objetivos: simulador de aporte ───────── */

function Objetivo({ g, hoy }: { g: Goal; hoy: string }) {
  const objetivo = Number(g.target_amount) || 0, ahorrado = Number(g.saved_amount) || 0;
  const falta = Math.max(0, objetivo - ahorrado);
  const mesHoy = hoy.slice(0, 7), mesLimite = g.due_on?.slice(0, 7) ?? null;
  const sugerido = falta ? Math.ceil(falta / Math.max(1, mesLimite ? mesesEntre(mesLimite, mesHoy) : 12) / 10) * 10 : 0;
  const tope = Math.max(100, Math.ceil(falta / 2 / 10) * 10);
  const [aporte, setAporte] = useState(Math.min(tope, Math.max(10, sugerido)));
  const llegada = mesDeLlegada(objetivo, ahorrado, aporte, hoy);
  const progreso = objetivo ? Math.min(1, ahorrado / objetivo) : 0;
  const retraso = llegada && mesLimite ? mesesEntre(llegada, mesLimite) : null;
  return <li className="c-objetivo">
    <div className="c-objetivo-cabeza">
      <h3>{g.name}</h3>
      <span className="c-num-peq">{eur(ahorrado)} <em>de {eur(objetivo)}</em></span>
    </div>
    <div className="c-faro" style={{ ['--p' as string]: progreso }} aria-hidden="true">
      <span className="c-faro-haz"/><span className="c-faro-luz"/>
    </div>
    {falta > 0 ? <label className="c-simulador">
      <span>Si apartas <b className="c-num-peq">{entero.format(aporte)} €</b> al mes</span>
      <input type="range" min={10} max={tope} step={10} value={aporte} onChange={(e) => setAporte(Number(e.target.value))} aria-label={`Aporte mensual para ${g.name}`}/>
      <span className="c-llegada">
        {llegada ? <>llegas en <b>{mesConAnio(llegada)}</b></> : 'no llegas nunca'}
        {retraso !== null && <em className={retraso > 0 ? 'c-tarde' : 'c-a-tiempo'}>{retraso > 0 ? ` · ${retraso} ${retraso === 1 ? 'mes' : 'meses'} después de tu fecha` : ' · a tiempo'}</em>}
      </span>
    </label> : <p className="c-llegada"><b>Objetivo cumplido.</b> Buen puerto.</p>}
  </li>;
}

/* ───────── Paleta de órdenes (⌘K) ───────── */

type Orden = { id: string; texto: string; detalle?: string; icono: ReactNode; hacer: () => void };

function Paleta({ ordenes, movimientos, onMovimiento, onCerrar }: { ordenes: Orden[]; movimientos: Transaction[]; onMovimiento: (t: Transaction) => void; onCerrar: () => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const lista = useMemo(() => {
    const n = q.trim().toLocaleLowerCase('es');
    const o = ordenes.filter((x) => !n || `${x.texto} ${x.detalle ?? ''}`.toLocaleLowerCase('es').includes(n));
    const m: Orden[] = n.length < 2 ? [] : movimientos
      .filter((t) => `${t.description} ${t.category}`.toLocaleLowerCase('es').includes(n))
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).slice(0, 6)
      .map((t) => ({ id: `m-${t.id}`, texto: t.description, detalle: `${diaLargo(t.occurred_on)} · ${t.kind === 'income' ? '+' : t.kind === 'transfer' ? '↔ ' : '−'}${eur(Number(t.amount))}`, icono: <span className="c-pto" style={{ background: colorRumbo(t.category) }}/>, hacer: () => onMovimiento(t) }));
    return [...o, ...m];
  }, [q, ordenes, movimientos, onMovimiento]);
  useEffect(() => setI(0), [q]);
  function tecla(e: TeclaReact) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(lista.length - 1, x + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
    else if (e.key === 'Enter' && lista[i]) { e.preventDefault(); onCerrar(); lista[i].hacer(); }
    else if (e.key === 'Escape') onCerrar();
  }
  return <div className="c-velo c-velo-paleta" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
    <div className="c-paleta" role="dialog" aria-modal="true" aria-label="Paleta de órdenes" onKeyDown={tecla}>
      <div className="c-paleta-busca"><Search size={18}/><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ir a, crear o buscar un movimiento…" aria-label="Buscar una orden" aria-controls="c-paleta-lista" aria-activedescendant={lista[i] ? `c-o-${lista[i].id}` : undefined}/><kbd>Esc</kbd></div>
      <ul id="c-paleta-lista" role="listbox">
        {lista.map((o, k) => <li key={o.id} id={`c-o-${o.id}`} role="option" aria-selected={k === i} className={k === i ? 'activa' : ''}
          onMouseEnter={() => setI(k)} onMouseDown={(e) => { e.preventDefault(); onCerrar(); o.hacer(); }}>
          <span className="c-paleta-icono">{o.icono}</span><span>{o.texto}</span>{o.detalle && <small>{o.detalle}</small>}
        </li>)}
        {!lista.length && <li className="c-paleta-nada">Nada con «{q}». Prueba con una sección, una acción o un comercio.</li>}
      </ul>
    </div>
  </div>;
}

/* ───────── Camarote: hoja lateral para gestionar cuentas, objetivos e inversiones ───────── */

function Camarote({ titulo, children, onCerrar }: { titulo: string; children: ReactNode; onCerrar: () => void }) {
  const hoja = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    hoja.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    const t = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', t);
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', t); };
  }, [onCerrar]);
  return <div className="c-velo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
    <div className="c-camarote" role="dialog" aria-modal="true" aria-labelledby="c-camarote-titulo" ref={hoja}>
      <div className="c-camarote-cabeza"><h2 id="c-camarote-titulo">{titulo}</h2><button className="c-icono" onClick={onCerrar} aria-label="Cerrar"><X size={18}/></button></div>
      <div className="r-panel">{children}</div>
    </div>
  </div>;
}

/* ───────── La carta ───────── */

type Gestion = null | 'cuentas' | 'objetivos' | 'inversiones';

export function Carta({ v }: { v: VistaNueva }) {
  const hoy = localDate();
  const rumbo = useMemo(() => rumboDelMes(v.income, v.expenses), [v.income, v.expenses]);
  const [foco, setFoco] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [activa, setActiva] = useState<Seccion>('dashboard');
  const [progreso, setProgreso] = useState(0);
  const [paleta, setPaleta] = useState(false);
  const [gestion, setGestion] = useState<Gestion>(null);
  const [cuantos, setCuantos] = useState(40);
  const [plegada, setPlegada] = useState(false);
  const primera = useRef(true);

  // La guía y otras partes de Brújula siguen navegando por secciones: aquí se traduce a desplazarse por la carta.
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const m = requestAnimationFrame(() => irA(anclaDe(v.tab)));
    return () => cancelAnimationFrame(m);
  }, [v.tab]);
  useEffect(() => setCuantos(40), [v.month, v.search, v.filter, categoria]);

  // Sección visible y avance del barco por la derrota.
  useEffect(() => {
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) {
        const s = SECCIONES.find((x) => x.ancla === e.target.id);
        if (s) setActiva(s.id);
      }
    }, { rootMargin: '-40% 0px -55% 0px' });
    SECCIONES.forEach((s) => { const el = document.getElementById(s.ancla); if (el) obs.observe(el); });
    let marco = 0;
    const alDesplazar = () => {
      cancelAnimationFrame(marco);
      marco = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgreso(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        setPlegada(window.scrollY > 24);
        document.documentElement.style.setProperty('--c-desplazado', String(window.scrollY));
      });
    };
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener('scroll', alDesplazar); cancelAnimationFrame(marco); };
  }, []);

  const ir = useCallback((s: Seccion) => { if (v.tab === s) irA(anclaDe(s)); else v.go(s); }, [v]);

  // Atajos: ⌘K o / abre la paleta, N crea un movimiento y las flechas cambian de mes.
  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const escribiendo = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaleta((p) => !p); return; }
      if (escribiendo || e.metaKey || e.ctrlKey || e.altKey || paleta || gestion || document.querySelector('[aria-modal="true"]')) return;
      if (e.key === '/') { e.preventDefault(); setPaleta(true); }
      else if (e.key.toLowerCase() === 'n') { e.preventDefault(); v.openTransaction(); }
      else if (e.key === 'ArrowLeft' && !(el instanceof SVGElement)) v.shiftMonth(-1);
      else if (e.key === 'ArrowRight' && !(el instanceof SVGElement)) v.shiftMonth(1);
    };
    window.addEventListener('keydown', t);
    return () => window.removeEventListener('keydown', t);
  }, [v, paleta, gestion]);

  const elegirCategoria = (c: string) => { setCategoria(c); v.setFilter('expense'); ir('transactions'); };
  const verDia = (fecha: string) => { setCategoria(null); v.setFilter('all'); v.setSearch(fecha); ir('transactions'); };

  const lista = categoria ? v.filtered.filter((t) => t.category === categoria) : v.filtered;
  const porDia = useMemo(() => {
    const grupos: { fecha: string; filas: Transaction[]; neto: number }[] = [];
    for (const t of lista.slice(0, cuantos)) {
      let g = grupos[grupos.length - 1];
      if (!g || g.fecha !== t.occurred_on) { g = { fecha: t.occurred_on, filas: [], neto: 0 }; grupos.push(g); }
      g.filas.push(t);
      g.neto += t.kind === 'income' ? Number(t.amount) : t.kind === 'expense' ? -Number(t.amount) : 0;
    }
    return grupos;
  }, [lista, cuantos]);

  const sinPresupuesto = v.groups.filter((g) => g.total > 0 && !v.monthBudgets.some((b) => b.category === g.category));
  const usado = v.totalBudget ? v.monthBudgets.reduce((s, b) => s + v.spentFor(b.category), 0) / v.totalBudget : 0;
  const coste = investedCost(v.investments), ganancia = v.investmentValue - coste;
  const maxCuenta = Math.max(1, ...v.accounts.map((a) => Math.abs(v.balances[a.account] ?? 0)));
  const valorInversiones = v.investments.map((i) => ({ i, valor: Number(i.units) * Number(i.current_price) })).sort((a, b) => b.valor - a.valor);

  const estado = !v.user ? { tono: 'local', texto: 'Solo en este dispositivo' }
    : v.syncState === 'synced' ? { tono: 'bien', texto: 'Sincronizado' }
      : v.syncState === 'syncing' ? { tono: 'curso', texto: 'Sincronizando…' }
        : v.syncState === 'offline' ? { tono: 'aviso', texto: `Sin conexión · ${v.pending} pendientes` }
          : { tono: 'aviso', texto: `${v.pending} pendientes` };

  const ordenes: Orden[] = useMemo(() => [
    { id: 'nuevo', texto: 'Nuevo movimiento', detalle: 'N', icono: <Plus size={16}/>, hacer: () => v.openTransaction() },
    { id: 'traspaso', texto: 'Traspaso entre cuentas', icono: <ArrowLeftRight size={16}/>, hacer: v.onTransfer },
    { id: 'presupuesto', texto: 'Nuevo presupuesto', icono: <Plus size={16}/>, hacer: () => v.openBudget() },
    { id: 'importar', texto: 'Importar extracto', detalle: 'CSV o Excel', icono: <FileSpreadsheet size={16}/>, hacer: v.openImport },
    { id: 'exportar', texto: 'Exportar movimientos', detalle: 'CSV', icono: <Download size={16}/>, hacer: v.exportCSV },
    ...SECCIONES.map((s) => ({ id: `ir-${s.id}`, texto: `Ir a ${s.nombre}`, icono: <ArrowRight size={16}/>, hacer: () => ir(s.id) })),
    { id: 'cuentas', texto: 'Gestionar cuentas y efectivo', icono: <Settings2 size={16}/>, hacer: () => setGestion('cuentas') },
    { id: 'objetivos', texto: 'Gestionar objetivos', icono: <Settings2 size={16}/>, hacer: () => setGestion('objetivos') },
    { id: 'inversiones', texto: 'Gestionar inversiones', icono: <Settings2 size={16}/>, hacer: () => setGestion('inversiones') },
    { id: 'anterior', texto: 'Mes anterior', detalle: '←', icono: <ChevronLeft size={16}/>, hacer: () => v.shiftMonth(-1) },
    { id: 'siguiente', texto: 'Mes siguiente', detalle: '→', icono: <ChevronRight size={16}/>, hacer: () => v.shiftMonth(1) },
    { id: 'guia', texto: 'Abrir la guía', icono: <CircleHelp size={16}/>, hacer: v.openGuide },
    { id: 'config', texto: 'Configuración y tema', icono: <Settings2 size={16}/>, hacer: v.openSettings },
    ...(v.user ? [{ id: 'sync', texto: 'Sincronizar ahora', icono: <RefreshCw size={16}/>, hacer: v.onSync }, { id: 'salir', texto: 'Cerrar sesión', icono: <LogOut size={16}/>, hacer: v.onSignOut }]
      : v.configured ? [{ id: 'entrar', texto: 'Iniciar sesión', icono: <LogIn size={16}/>, hacer: v.onAuth }] : []),
  ], [v, ir]);
  const abrirMovimiento = useCallback((t: Transaction) => v.openTransaction(t), [v]);
  const cerrarGestion = useCallback(() => setGestion(null), []);

  const mesTitulo = mesLargo(v.month);
  const anio = v.month.slice(0, 4);
  const esteMes = v.month === hoy.slice(0, 7);

  return <div className="c-carta">
    <div className="c-reticula-fondo" aria-hidden="true"/>

    <header className={`c-cabeza ${plegada ? 'c-cabeza-plegada' : ''}`}>
      <button className="c-marca" onClick={() => ir('dashboard')} aria-label="Brújula, volver al rumbo"><Aguja/><span>brújula</span></button>
      <div className="c-mes" role="group" aria-label="Mes">
        <button className="c-icono" aria-label="Mes anterior" onClick={() => v.shiftMonth(-1)}><ChevronLeft size={18}/></button>
        <span aria-live="polite" title={monthLabel(v.month)}><b>{mesTitulo}</b> {anio}</span>
        <button className="c-icono" aria-label="Mes siguiente" onClick={() => v.shiftMonth(1)}><ChevronRight size={18}/></button>
      </div>
      <div className="c-cabeza-acciones">
        <button className={`c-estado c-tono-${estado.tono}`} onClick={v.user ? v.onSync : v.onAuth} title={v.user ? 'Sincronizar ahora' : v.configured ? 'Iniciar sesión para sincronizar' : 'Datos guardados en este dispositivo'}>
          <i aria-hidden="true"/>{estado.texto}
        </button>
        <button className="c-boton-fantasma c-solo-ancho" onClick={() => setPaleta(true)} aria-label="Abrir la paleta de órdenes"><Command size={15}/> K</button>
        <button className="c-icono c-solo-estrecho" onClick={() => setPaleta(true)} aria-label="Buscar o ir a"><Search size={18}/></button>
        <button className="c-boton-primario c-solo-ancho" onClick={() => v.openTransaction()}><Plus size={17}/> Movimiento</button>
        <details className="c-menu">
          <summary aria-label="Menú de cuenta"><span className="c-avatar">{v.user?.email?.charAt(0).toUpperCase() ?? 'T'}</span></summary>
          <div className="c-menu-hoja" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) e.currentTarget.closest('details')?.removeAttribute('open'); }}>
            <strong>{v.user?.email ?? 'Mi espacio'}</strong>
            <button onClick={v.openGuide}><CircleHelp size={16}/> Guía</button>
            <button onClick={v.openSettings}><Settings2 size={16}/> Configuración y tema</button>
            <button onClick={v.openImport}><FileSpreadsheet size={16}/> Importar extracto</button>
            <button onClick={v.exportCSV}><Download size={16}/> Exportar CSV</button>
            {v.user ? <button onClick={v.onSignOut}><LogOut size={16}/> Cerrar sesión</button> : v.configured && <button onClick={v.onAuth}><LogIn size={16}/> Iniciar sesión</button>}
          </div>
        </details>
      </div>
    </header>

    <nav className="c-derrota" aria-label="Secciones de la carta">
      <div className="c-derrota-linea" aria-hidden="true"><span className="c-derrota-barco" style={{ top: `${progreso * 100}%` }}/></div>
      {SECCIONES.map((s) => <button key={s.id} className={activa === s.id ? 'activa' : ''} aria-current={activa === s.id ? 'location' : undefined} onClick={() => ir(s.id)}>
        <i aria-hidden="true"/><span>{s.corto}</span>
      </button>)}
    </nav>

    {v.notice && <div className="c-aviso" role="status"><span>{v.notice}</span><button className="c-icono" onClick={v.clearNotice} aria-label="Cerrar aviso"><X size={16}/></button></div>}

    <main className="c-mar">
      {/* Rumbo */}
      <section id="c-rumbo" className="c-seccion c-rumbo" aria-labelledby="c-rumbo-t">
        <div className="c-rumbo-texto">
          <h1 id="c-rumbo-t" className="c-frase">
            En {mesTitulo} {esteMes ? 'entran' : 'entraron'} <span className="c-verde"><Cifra valor={v.income}/></span> y {esteMes ? 'salen' : 'salieron'} <span className="c-coral"><Cifra valor={v.expenses}/></span>.
          </h1>
          <p className={`c-rumbo-veredicto c-zona-${rumbo.zona}`}><span className="c-grados">{grados3(rumbo.grados)}</span>{rumbo.texto}</p>
          <dl className="c-libro">
            <div><dt>Saldo del mes</dt><dd className={v.balance < 0 ? 'c-coral' : ''}><Cifra valor={v.balance} signo/></dd></div>
            <div><dt>Patrimonio</dt><dd><Cifra valor={v.wealth}/></dd></div>
            <div><dt>En cuentas</dt><dd><Cifra valor={v.bankTotal}/></dd></div>
            <div><dt>Presupuesto</dt><dd>{v.totalBudget ? <span className="c-num">{entero.format(Math.round(usado * 100))}<span className="c-eur"> %</span></span> : <button className="c-enlace" onClick={() => v.openBudget()}>Fijar uno</button>}</dd></div>
          </dl>
          <div className="c-rumbo-acciones">
            <button className="c-boton-primario" onClick={() => v.openTransaction()}><Plus size={17}/> Anotar movimiento</button>
            <button className="c-boton-fantasma" onClick={v.onTransfer}><ArrowLeftRight size={16}/> Traspaso</button>
            <button className="c-boton-fantasma" onClick={v.openImport}><FileSpreadsheet size={16}/> Importar</button>
          </div>
        </div>
        <RosaCarta grupos={v.groups} grados={rumbo.grados} foco={foco} setFoco={setFoco} onElegir={elegirCategoria}/>
        {v.groups.some((g) => g.total > 0) && <ul className="c-leyenda" aria-label="Gasto por categoría">
          {v.groups.filter((g) => g.total > 0).map((g) => <li key={g.category}>
            <button className={foco === g.category ? 'activa' : ''} onMouseEnter={() => setFoco(g.category)} onMouseLeave={() => setFoco(null)} onFocus={() => setFoco(g.category)} onBlur={() => setFoco(null)} onClick={() => elegirCategoria(g.category)}>
              <i style={{ background: colorRumbo(g.category) }}/>{g.category}<b className="c-num-peq">{eur(g.total)}</b>
            </button>
          </li>)}
        </ul>}
      </section>

      {/* Corrientes */}
      <section id="c-corrientes" className="c-seccion" aria-labelledby="c-corrientes-t">
        <div className="c-titulo"><h2 id="c-corrientes-t">Corrientes del mes</h2><p>La línea de latón es tu saldo acumulado; las sondas, lo que sale cada día. Recórrela y pulsa un día para ver sus movimientos.</p></div>
        <Corrientes movimientos={v.monthly} mes={v.month} hoy={hoy} onDia={verDia}/>
      </section>

      {/* Presupuestos */}
      <section id="c-presupuestos" className="c-seccion" aria-labelledby="c-presupuestos-t">
        <div className="c-titulo">
          <h2 id="c-presupuestos-t">Presupuestos</h2>
          <p>{v.totalBudget ? <>Has usado <b className="c-num-peq">{eur(v.monthBudgets.reduce((s, b) => s + v.spentFor(b.category), 0))}</b> de <b className="c-num-peq">{eur(v.totalBudget)}</b>. La marca hueca es dónde acabarás si sigues a este ritmo.</> : 'Fija un límite por categoría y la carta te dirá dónde acabarás el mes si sigues a este ritmo.'}</p>
          <button className="c-boton-fantasma" onClick={() => v.openBudget()}><Plus size={16}/> Presupuesto</button>
        </div>
        {v.monthBudgets.length ? <ul className="c-presupuestos">
          {v.monthBudgets.map((b) => {
            const gastado = v.spentFor(b.category), limite = Number(b.amount) || 1;
            const prevision = previsionGasto(gastado, v.month, hoy);
            const escala = Math.max(limite, prevision, gastado) * 1.08;
            const pasa = gastado > limite, pasara = !pasa && prevision > limite;
            return <li key={b.category} className={`${foco === b.category ? 'activa' : ''} ${pasa ? 'c-pasado' : pasara ? 'c-pasara' : ''}`}
              onMouseEnter={() => setFoco(b.category)} onMouseLeave={() => setFoco(null)}>
              <button className="c-presupuesto" onClick={() => v.openBudget(b.category, b.amount)} aria-label={`${b.category}: ${eur(gastado)} de ${eur(limite)}. Ajustar límite`}>
                <span className="c-presupuesto-nombre"><i style={{ background: colorRumbo(b.category) }}/>{b.category}</span>
                <span className="c-presupuesto-cifras c-num-peq">{eur(gastado)} <em>/ {eur(limite)}</em></span>
                <span className="c-barra" aria-hidden="true">
                  <span className="c-barra-relleno" style={{ width: `${(Math.min(gastado, limite) / escala) * 100}%`, background: colorRumbo(b.category) }}/>
                  {gastado > limite && <span className="c-barra-exceso" style={{ left: `${(limite / escala) * 100}%`, width: `${((gastado - limite) / escala) * 100}%` }}/>}
                  <span className="c-barra-limite" style={{ left: `${(limite / escala) * 100}%` }}/>
                  {prevision > gastado && <span className="c-barra-prevision" style={{ left: `${(prevision / escala) * 100}%` }}/>}
                </span>
                <span className="c-presupuesto-pie">{pasa ? `Te has pasado ${eur(gastado - limite)}` : pasara ? `A este ritmo acabarás en ${eur(prevision)}: ${eur(prevision - limite)} por encima` : `Quedan ${eur(limite - gastado)}`}</span>
              </button>
            </li>;
          })}
        </ul> : <p className="c-vacio">Aún no hay presupuestos en {mesTitulo}.</p>}
        {sinPresupuesto.length > 0 && <div className="c-sin-presupuesto">
          <span>Gasto sin límite:</span>
          {sinPresupuesto.map((g) => <button key={g.category} className="c-chip" onClick={() => v.openBudget(g.category, Math.ceil(g.total / 10) * 10)}>
            <i style={{ background: colorRumbo(g.category) }}/>{g.category} <b className="c-num-peq">{eur(g.total)}</b><Plus size={14}/>
          </button>)}
        </div>}
      </section>

      {/* Movimientos */}
      <section id="c-movimientos" className="c-seccion" aria-labelledby="c-movimientos-t">
        <div className="c-titulo">
          <h2 id="c-movimientos-t">Movimientos</h2>
          <p>{lista.length ? `${lista.length} ${lista.length === 1 ? 'movimiento' : 'movimientos'} en ${mesTitulo}${categoria ? ` de ${categoria}` : ''}.` : 'Nada que coincida.'} Pulsa uno para editarlo.</p>
        </div>
        <div className="c-filtros">
          <label className="c-busca"><Search size={16}/><input value={v.search} onChange={(e) => v.setSearch(e.target.value)} placeholder="Buscar concepto, categoría o fecha" aria-label="Buscar movimientos"/>{v.search && <button className="c-icono" onClick={() => v.setSearch('')} aria-label="Borrar búsqueda"><X size={15}/></button>}</label>
          <div className="c-segmentos" role="group" aria-label="Tipo">
            {([['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['transfer', 'Traspasos']] as const).map(([f, t]) => <button key={f} aria-pressed={v.filter === f} onClick={() => v.setFilter(f)}>{t}</button>)}
          </div>
          {v.merchants.length > 1 && <select className="c-select" value={v.merchantFilter} onChange={(e) => v.setMerchantFilter(e.target.value)} aria-label="Comercio">
            <option value="all">Todos los comercios</option>{v.merchants.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>}
          {categoria && <button className="c-chip c-chip-activo" onClick={() => setCategoria(null)}><i style={{ background: colorRumbo(categoria) }}/>{categoria}<X size={14}/></button>}
        </div>
        {porDia.length ? <ol className="c-diario">
          {porDia.map((g) => <li key={g.fecha}>
            <div className="c-dia"><span>{diaLargo(g.fecha)}</span><span className={`c-num-peq ${g.neto < 0 ? 'c-coral' : g.neto > 0 ? 'c-verde' : ''}`}>{g.neto > 0 ? '+' : g.neto < 0 ? '−' : ''}{eur(Math.abs(g.neto))}</span></div>
            <ul>{g.filas.map((t) => {
              const comercio = merchantFor(t.description);
              const cuenta = accountName(t.account ?? 'bank', v.accounts) + (t.to_account ? ` → ${accountName(t.to_account, v.accounts)}` : '');
              const Icono = t.kind === 'income' ? ArrowDownLeft : t.kind === 'transfer' ? ArrowLeftRight : ArrowUpRight;
              return <li key={t.id}><button className={`c-fila c-fila-${t.kind} ${foco && t.category !== foco ? 'c-fila-apagada' : ''}`} onClick={() => v.openTransaction(t)}
                onMouseEnter={() => t.kind === 'expense' && setFoco(t.category)} onMouseLeave={() => setFoco(null)}>
                <span className="c-fila-icono" style={{ color: t.kind === 'expense' ? colorRumbo(t.category) : undefined }}><Icono size={16}/></span>
                <span className="c-fila-texto"><strong>{t.description}</strong><small>{t.kind === 'income' ? 'Ingreso' : t.kind === 'transfer' ? 'Traspaso' : t.category}{comercio && comercio !== t.description ? ` · ${comercio}` : ''} · {cuenta}</small></span>
                <span className="c-fila-importe c-num-peq">{t.kind === 'income' ? '+' : t.kind === 'transfer' ? '' : '−'}{eur(Number(t.amount))}</span>
              </button></li>;
            })}</ul>
          </li>)}
        </ol> : <div className="c-vacio"><p>{v.items.length ? 'Ningún movimiento coincide con la búsqueda.' : 'Tu carta está en blanco. Anota tu primer movimiento o importa un extracto.'}</p>
          <div className="c-rumbo-acciones"><button className="c-boton-primario" onClick={() => v.openTransaction()}><Plus size={17}/> Anotar movimiento</button>{!v.items.length && <button className="c-boton-fantasma" onClick={v.openImport}><FileSpreadsheet size={16}/> Importar</button>}</div></div>}
        {lista.length > cuantos && <button className="c-mas" onClick={() => setCuantos((n) => n + 60)}>Mostrar {Math.min(60, lista.length - cuantos)} más de {lista.length - cuantos}</button>}
      </section>

      {/* Cuentas */}
      <section id="c-cuentas" className="c-seccion" aria-labelledby="c-cuentas-t">
        <div className="c-titulo">
          <h2 id="c-cuentas-t">Cuentas y efectivo</h2>
          <p>En total, <b className="c-num-peq">{eur(v.bankTotal)}</b> entre bancos y efectivo.</p>
          <div className="c-titulo-acciones"><button className="c-boton-fantasma" onClick={v.onTransfer}><ArrowLeftRight size={16}/> Traspaso</button><button className="c-boton-fantasma" onClick={() => setGestion('cuentas')}><Settings2 size={16}/> Gestionar</button></div>
        </div>
        <ul className="c-cuentas">
          {v.accounts.map((a) => {
            const saldo = v.balances[a.account] ?? 0;
            return <li key={a.account}><button onClick={() => setGestion('cuentas')}>
              <span className="c-cuenta-nombre"><strong>{accountName(a.account, v.accounts)}</strong><small>{a.kind === 'cash' || a.account === 'cash' ? 'Efectivo' : 'Banco'}</small></span>
              <span className="c-cuenta-barra" aria-hidden="true"><span style={{ width: `${(Math.abs(saldo) / maxCuenta) * 100}%` }} className={saldo < 0 ? 'c-negativo' : ''}/></span>
              <span className={`c-num-peq ${saldo < 0 ? 'c-coral' : ''}`}>{saldo < 0 ? '−' : ''}{eur(Math.abs(saldo))}</span>
            </button></li>;
          })}
        </ul>
      </section>

      {/* Objetivos */}
      <section id="c-objetivos" className="c-seccion" aria-labelledby="c-objetivos-t">
        <div className="c-titulo">
          <h2 id="c-objetivos-t">Objetivos</h2>
          <p>Mueve el aporte de cada objetivo y verás en qué mes llegas a puerto.</p>
          <button className="c-boton-fantasma" onClick={() => setGestion('objetivos')}><Settings2 size={16}/> Gestionar</button>
        </div>
        {v.goals.length ? <ul className="c-objetivos">{v.goals.map((g) => <Objetivo key={g.id} g={g} hoy={hoy}/>)}</ul>
          : <div className="c-vacio"><p>Sin objetivos todavía. Un viaje, un colchón, una entrada: dale un destino al ahorro.</p><button className="c-boton-primario" onClick={() => setGestion('objetivos')}><Plus size={17}/> Crear objetivo</button></div>}
      </section>

      {/* Inversiones */}
      <section id="c-inversiones" className="c-seccion" aria-labelledby="c-inversiones-t">
        <div className="c-titulo">
          <h2 id="c-inversiones-t">Inversiones</h2>
          <p>{v.investments.length ? <>Valen <b className="c-num-peq">{eur(v.investmentValue)}</b>; pusiste <b className="c-num-peq">{eur(coste)}</b>. <span className={ganancia < 0 ? 'c-coral' : 'c-verde'}>{ganancia < 0 ? '−' : '+'}{eur(Math.abs(ganancia))}{coste ? ` (${ganancia < 0 ? '−' : '+'}${entero.format(Math.abs(Math.round((ganancia / coste) * 1000) / 10))} %)` : ''}</span></> : 'Anota tus posiciones a mano y Brújula las suma a tu patrimonio.'}</p>
          <button className="c-boton-fantasma" onClick={() => setGestion('inversiones')}><Settings2 size={16}/> Gestionar</button>
        </div>
        {v.investments.length > 0 && <>
          <div className="c-reparto" aria-hidden="true">
            {valorInversiones.map(({ i, valor }, k) => <span key={i.id} style={{ flexGrow: Math.max(valor, 0.0001), background: `var(--c-serie-${k % 5})` }} title={`${i.name}: ${eur(valor)}`}/>)}
          </div>
          <ul className="c-inversiones">
            {valorInversiones.map(({ i, valor }, k) => {
              const g = valor - Number(i.units) * Number(i.average_cost);
              return <li key={i.id}><button onClick={() => setGestion('inversiones')}>
                <i style={{ background: `var(--c-serie-${k % 5})` }}/>
                <span className="c-cuenta-nombre"><strong>{i.name}</strong><small>{i.ticker || 'Sin ticker'} · {Number(i.units).toLocaleString('es-ES')} uds.</small></span>
                <span className="c-num-peq">{eur(valor)}</span>
                <span className={`c-num-peq ${g < 0 ? 'c-coral' : 'c-verde'}`}>{g < 0 ? '−' : '+'}{eur(Math.abs(g))}</span>
              </button></li>;
            })}
          </ul>
        </>}
        {!v.investments.length && <div className="c-vacio"><button className="c-boton-primario" onClick={() => setGestion('inversiones')}><Plus size={17}/> Añadir inversión</button></div>}
      </section>

      <footer className="c-pie">
        <p className="c-pie-frase">El mar no se domina; se lee. Esta carta solo te enseña dónde estás.</p>
        <div className="c-conexiones">
          <a href="https://kairos-kh.vercel.app/"><CalendarClock size={17}/><span>Kairós<small>Recibos y vencimientos</small></span><ArrowRight size={15} aria-hidden="true"/></a>
          <a href="https://faro-kh.vercel.app/"><Flag size={17}/><span>Faro<small>Metas y proyectos</small></span><ArrowRight size={15} aria-hidden="true"/></a>
        </div>
        <p className="c-atajos"><kbd>N</kbd> nuevo movimiento · <kbd>←</kbd><kbd>→</kbd> cambiar de mes · <kbd>/</kbd> o <kbd>⌘K</kbd> paleta · {diasDelMes(v.month)} días en {mesTitulo}</p>
      </footer>
    </main>

    <nav className="c-muelle" aria-label="Secciones">
      <div className="c-muelle-chips">
        {SECCIONES.map((s) => <button key={s.id} className={activa === s.id ? 'activa' : ''} aria-current={activa === s.id ? 'location' : undefined} onClick={() => ir(s.id)}>{s.corto}</button>)}
      </div>
      <button className="c-fab" onClick={() => v.openTransaction()} aria-label="Nuevo movimiento"><Plus size={24}/></button>
    </nav>

    {paleta && <Paleta ordenes={ordenes} movimientos={v.items} onMovimiento={abrirMovimiento} onCerrar={() => setPaleta(false)}/>}
    {gestion === 'cuentas' && <Camarote titulo="Cuentas y efectivo" onCerrar={cerrarGestion}><AccountsPanel settings={v.accounts} balances={v.balances} transactions={v.items} investments={v.investments} onSave={v.saveAccount} onMerge={v.mergeBank} onTransfer={() => { setGestion(null); v.onTransfer(); }}/></Camarote>}
    {gestion === 'objetivos' && <Camarote titulo="Objetivos" onCerrar={cerrarGestion}><GoalsPanel goals={v.goals} onSave={v.saveGoal} onDelete={v.deleteGoal}/></Camarote>}
    {gestion === 'inversiones' && <Camarote titulo="Inversiones" onCerrar={cerrarGestion}><InvestmentsPanel investments={v.investments} accounts={v.accounts} onSave={v.saveInvestment} onDelete={v.deleteInvestment}/></Camarote>}
  </div>;
}
