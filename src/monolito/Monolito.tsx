import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { VistaNueva } from '../nuevo/Nuevo';
import { grados3, rumboDelMes } from '../nuevo/rumbo';
import { HojaCuenta, useModulos, type Modulo } from '../corriente/Corriente';
import { corrienteDelMes, cifra, ritmos } from '../corriente/datos';
import { ICONOS } from '../corriente/iconos';
import { Hoja } from '../corriente/piezas';
import { Metas } from '../corriente/Metas';
import { Recibos } from '../corriente/Recibos';
import { Cuentas } from './Cuentas';
import { MetasVistaM } from './Metas';
import { RecibosVistaM } from './Recibos';
import { Movimientos } from './Movimientos';
import { cienPuntos, digitos } from './puntos';
import { el, encima, Glifo, Presupuesto, quieto } from './piezas';
import './monolito.css';

/* Dígitos 5×7 para la cifra grande. */
const FUENTE: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};

/** La cifra de lo que se queda como una matriz de puntos que se enciende de izquierda a derecha. */
function pintaCifra(panel: HTMLElement, texto: string) {
  const w = panel.clientWidth; if (!w) return;
  const minCols = texto.length * 6 + 1, celda = Math.min(30, w / minCols), cols = Math.max(minCols, Math.floor(w / celda)), filas = 7;
  const on = new Set<string>();
  [...texto].forEach((ch, k) => FUENTE[ch]?.forEach((f, y) => [...f].forEach((c, x) => { if (c === '#') on.add(`${k * 6 + x},${y}`); })));
  const s = el('svg', { width: cols * celda, height: filas * celda, viewBox: `0 0 ${cols * celda} ${filas * celda}`, 'aria-hidden': 'true' });
  for (let x = 0; x < cols; x++) for (let y = 0; y < filas; y++) {
    const c = el('circle', { cx: x * celda + celda / 2, cy: y * celda + celda / 2, r: celda * 0.38 });
    if (on.has(`${x},${y}`)) { c.setAttribute('class', 'on'); (c as SVGElement).style.setProperty('--d', `${Math.round(x * 38 + Math.random() * 260)}ms`); }
    else if (x === texto.length * 6 && y >= 5) c.setAttribute('class', 'cur');
    s.append(c);
  }
  panel.querySelector('svg')?.remove(); panel.append(s); panel.classList.add('listo');
  if (!quieto()) { panel.classList.remove('vivo'); void panel.offsetWidth; panel.classList.add('vivo'); setTimeout(() => panel.classList.remove('vivo'), 2600); }
}

type Grupo = { id: string; n: string; v: number; p: number; d: string; alerta?: string; queda?: boolean };

/** Cien puntos, cada uno el 1 % de lo que entra (o sale, si sale más), repartidos por grupos. */
function pintarReparto(cont: HTMLElement, grupos: Grupo[]) {
  const svg = cont.querySelector('svg')!, W = cont.clientWidth; if (!W) return;
  const filas = W < 520 ? 4 : 2, cols = 100 / filas, paso = Math.min(16, W / cols), r = paso * 0.32;
  svg.setAttribute('width', String(cols * paso)); svg.setAttribute('height', String(filas * paso)); svg.replaceChildren();
  let k = 0;
  for (const g of grupos) {
    if (!g.p) continue;
    const grupo = el('g', { 'data-g': g.id, tabindex: 0, role: 'img', 'aria-label': `${g.n}: ${cifra(g.v)} €, ${g.p} %` });
    grupo.append(el('rect', { x: Math.floor(k / filas) * paso, y: 0, width: Math.ceil(g.p / filas) * paso, height: filas * paso, fill: 'transparent', class: 'ancla' }));
    for (let i = 0; i < g.p; i++, k++) {
      const c = el('circle', { cx: (Math.floor(k / filas) * paso + paso / 2).toFixed(1), cy: ((k % filas) * paso + paso / 2).toFixed(1), r, class: `${g.queda ? 'on' : 'gris'} ap` });
      (c as SVGElement).style.setProperty('--d', `${k * 14}ms`); grupo.append(c);
    }
    svg.append(grupo);
  }
  if (!quieto()) { cont.classList.remove('vivo'); void cont.offsetWidth; cont.classList.add('vivo'); setTimeout(() => cont.classList.remove('vivo'), 2600); }
}

type Destino = 'rumbo' | 'movimientos' | 'recibos' | 'metas' | 'cuentas';

function Rumbo({ v, ir, modulos, activar }: { v: VistaNueva; ir: (d: Destino) => void; modulos: Partial<Record<Modulo, boolean>>; activar: (k: Modulo) => void }) {
  const mes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${v.month}-01T12:00:00`));
  const filas = ritmos(v.monthBudgets, v.spentFor, v.month);
  const datos = corrienteDelMes(v.groups, v.income, v.expenses, filas, mes);
  const grupos: Grupo[] = cienPuntos(datos.rios.filter((r) => r.v > 0).map((r) => ({ id: r.id, n: r.nombre, v: r.v, d: r.pct, alerta: r.alerta, queda: r.ahorro })));
  const base = Math.max(datos.entran, datos.salen);
  const rumbo = rumboDelMes(v.income, v.expenses);
  const sale = grupos.filter((g) => !g.queda), queda = grupos.find((g) => g.queda);
  const cifraTexto = digitos(datos.faltan || datos.quedan);
  const panel = useRef<HTMLDivElement>(null), reparto = useRef<HTMLDivElement>(null), dial = useRef<HTMLElement>(null);
  const clave = JSON.stringify([cifraTexto, grupos.map((g) => [g.id, g.p, g.v])]);
  useEffect(() => {
    const pintar = () => { if (panel.current) pintaCifra(panel.current, cifraTexto); if (reparto.current) pintarReparto(reparto.current, grupos); };
    pintar();
    const quitar = reparto.current ? encima(reparto.current, (id) => { const g = grupos.find((x) => x.id === id); return g ? { n: g.queda ? `Se quedan en ${mes}` : `${g.n} · sale`, v: `${cifra(g.v)}<small>€</small>`, d: `${g.p} % de lo que ${datos.entran >= datos.salen ? 'entra' : 'sale'} · ${g.d}`, alerta: g.alerta } : null; }) : undefined;
    if (dial.current && !quieto()) { dial.current.classList.remove('vivo'); void dial.current.offsetWidth; dial.current.classList.add('vivo'); }
    let ancho = innerWidth, t = 0;
    const cambio = () => { if (innerWidth === ancho) return; ancho = innerWidth; clearTimeout(t); t = window.setTimeout(pintar, 120); };
    addEventListener('resize', cambio);
    return () => { quitar?.(); removeEventListener('resize', cambio); clearTimeout(t); };
  }, [clave]);
  const ultimo = [...v.monthly].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
  const linea = (d: Destino, g: string, nombre: string, dato: ReactNode) =>
    <a className="linea" href={`#${d}`} onClick={(e) => { e.preventDefault(); ir(d); }}><Glifo g={g}/><span className="nom">{nombre}</span><span className="dato">{dato}</span><Glifo g="flecha" clase="flecha"/></a>;
  const pasoAguja = Math.round(rumbo.grados / 5) % 72;
  return <section className="vista" id="rumbo" aria-labelledby="h-rumbo">
    <div className="rejilla">
      <section className="mod m-cifra">
        <div className="panel" ref={panel} role="img" aria-label={`${datos.faltan ? 'Faltan' : 'Se quedan'} ${cifra(datos.faltan || datos.quedan)} euros en ${mes}`}><span className="respaldo">{cifraTexto}</span></div>
        <div className="pie-cifra"><span>{datos.faltan ? 'Faltan' : 'Se quedan'} en {mes} · €</span><span>{cifra(datos.entran)} − {cifra(datos.salen)}</span></div>
        <h1 className="frase" id="h-rumbo" tabIndex={-1}>En {mes} entran <span className="num">{cifra(datos.entran)}</span><span className="eur"> €</span> y salen <span className="num">{cifra(datos.salen)}</span><span className="eur"> €</span>.</h1>
        {base > 0 ? <>
          <div className="reparto vis" ref={reparto}>
            <svg role="img" aria-label={`Cien puntos, cada uno el 1 % de lo que ${datos.entran >= datos.salen ? 'entra' : 'sale'}: ${grupos.map((g) => `${g.n} ${g.p}`).join(', ')}.`}/>
            <div className="tip"><p className="n"/><p className="v"/><p className="d"/><p className="d rojo" hidden/></div>
          </div>
          <div className="leyenda">
            <span><i style={{ background: 'var(--gris-3)' }}/>Sale el {sale.reduce((s, g) => s + g.p, 0)} %, en {sale.length === 1 ? 'un grupo' : `${sale.length} grupos`}</span>
            {datos.faltan ? <span className="senal"><b>Faltan {cifra(datos.faltan)} €</b>: sale más de lo que entra</span>
              : <span><i style={{ background: 'var(--blanco)' }}/><b>Te queda el {queda?.p ?? 0} %</b> de lo que entra</span>}
          </div>
          <p className="escala" style={{ marginTop: 8 }}>1 punto = 1 % de lo que {datos.entran >= datos.salen ? 'entra' : 'sale'} · pasa por encima para ver cada grupo</p>
        </> : <p className="res" style={{ marginTop: 24 }}>Aún no hay movimientos en {mes}. Anota el primero y se encenderán los puntos.</p>}
      </section>
      <section className="mod der m-dial" aria-label="Rumbo del mes" ref={dial}>
        <svg className="esfera" viewBox="0 0 300 300" aria-hidden="true" style={{ '--grados': `${rumbo.grados}deg` } as CSSProperties}>
          {Array.from({ length: 72 }, (_, i) => { const a = (i * 5 - 90) * Math.PI / 180, mayor = i % 18 === 0;
            return <circle key={i} cx={150 + 138 * Math.cos(a)} cy={150 + 138 * Math.sin(a)} r={mayor ? 3 : 1.9} className={i === 0 ? 'norte' : i === pasoAguja ? 'rumbo-punto' : mayor ? 'anillo mayor' : 'anillo'}/>; })}
          {([['N', 0], ['90', 90], ['180', 180], ['270', 270]] as const).map(([t, g]) => { const a = (g - 90) * Math.PI / 180;
            return <text key={t} x={150 + 118 * Math.cos(a)} y={150 + 118 * Math.sin(a) + 3.5} textAnchor="middle" className={t === 'N' ? 'n' : 'grad'}>{t}</text>; })}
          <g className="aguja">
            {Array.from({ length: 9 }, (_, k) => <circle key={k} cx={150} cy={150 - (k + 1) * 11.5} r={k >= 7 ? 4.2 : 3.4} className={k >= 7 ? 'punta' : ''}/>)}
            {[1, 2, 3].map((k) => <circle key={`c${k}`} cx={150} cy={150 + k * 11.5} r={2.4} className="cola"/>)}
          </g>
          <circle cx={150} cy={150} r={6.5} fill="#000" stroke="#fff" strokeWidth={1.4}/>
        </svg>
        <div className="lectura"><span className="dot">{grados3(rumbo.grados)}</span><p><b>Rumbo {rumbo.zona === 'calma' ? 'en calma' : rumbo.zona}</b>{rumbo.texto.replace(/^Rumbo \w+: /, '').replace(/^./, (c) => c.toUpperCase())}</p></div>
      </section>
      <nav className="mod" aria-labelledby="h-indice">
        <p className="eti" id="h-indice" style={{ marginBottom: 14 }}>El resto de {mes}</p>
        {linea('movimientos', 'mov', 'Movimientos', ultimo ? `${v.monthly.length} este mes · último: ${ultimo.description}.` : 'Ninguno este mes todavía.')}
        {modulos.recibos && linea('recibos', 'rec', 'Recibos', 'Lo que se cobra en los próximos 30 días.')}
        {modulos.metas && linea('metas', 'meta', 'Metas', v.goals.length ? `${v.goals.length} de ahorro en marcha.` : 'Ahorrar para algo y tus metas de Faro.')}
        {linea('cuentas', 'cue', 'Cuentas', <><span className="mono">{cifra(v.wealth)} €</span> de patrimonio.</>)}
        {!(modulos.recibos && modulos.metas) && <div className="activar">
          <p>¿Pagas recibos o ahorras para algo? Brújula también puede llevarlo. Solo aparece si lo activas.</p>
          <div className="acciones">
            {!modulos.recibos && <button type="button" className="boton" onClick={() => activar('recibos')}><Glifo g="rec"/>Activar recibos</button>}
            {!modulos.metas && <button type="button" className="boton" onClick={() => activar('metas')}><Glifo g="meta"/>Activar metas</button>}
          </div>
        </div>}
      </nav>
      <section className="mod der" aria-labelledby="h-presu-r">
        <div className="tit"><h2 id="h-presu-r">Presupuestos</h2><a className="ir" href="#movimientos" onClick={(e) => { e.preventDefault(); ir('movimientos'); }}>En movimientos<Glifo g="flecha"/></a></div>
        {filas.length ? <>
          <p className="res">La raya es el límite; los huecos, dónde acabarás a este ritmo.</p>
          <div style={{ marginTop: 18 }}>{filas.map((r) => <Presupuesto key={r.nombre} r={r}/>)}</div>
          <p className="escala" style={{ marginTop: 10 }}>1 punto = 10 €</p>
        </> : <p className="res">Aún no hay presupuestos este mes. <button type="button" className="ir" onClick={() => v.openBudget()}>Añadir uno<Glifo g="flecha"/></button></p>}
      </section>
    </div>
  </section>;
}

const DESTINO: Record<VistaNueva['tab'], Exclude<Destino, 'recibos'>> = {
  dashboard: 'rumbo', analysis: 'rumbo', transactions: 'movimientos', budgets: 'movimientos', accounts: 'cuentas', investments: 'cuentas', goals: 'metas',
};
const SECCION: Record<Exclude<Destino, 'recibos'>, VistaNueva['tab']> = { rumbo: 'dashboard', movimientos: 'transactions', metas: 'goals', cuentas: 'accounts' };
const NOMBRES: [Destino, string, string][] = [['rumbo', 'Rumbo', 'rumbo'], ['movimientos', 'Movimientos', 'mov'], ['recibos', 'Recibos', 'rec'], ['metas', 'Metas', 'meta'], ['cuentas', 'Cuentas', 'cue']];
const FUENTES = 'https://fonts.googleapis.com/css2?family=Doto:ROND,wght@0..100,100..900&family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

/** Tema Monolito: negro, blanco y una sola señal roja; todo son puntos. Mismos datos y acciones que Corriente. */
export function Monolito({ v }: { v: VistaNueva }) {
  useEffect(() => {
    if (document.getElementById('fuentes-monolito')) return;
    const l = Object.assign(document.createElement('link'), { id: 'fuentes-monolito', rel: 'stylesheet', href: FUENTES });
    document.head.appendChild(l);
  }, []);
  const [modulos, activar] = useModulos(v);
  const [enRecibos, setEnRecibos] = useState(false);
  useEffect(() => setEnRecibos(false), [v.tab]);
  const pedido = DESTINO[v.tab];
  const destino: Destino = enRecibos && modulos.recibos ? 'recibos' : pedido === 'metas' && !modulos.metas ? 'rumbo' : pedido;
  const [cuenta, setCuenta] = useState(false), [que, setQue] = useState(false);
  const [nuevo, setNuevo] = useState<Modulo | null>(null);
  const ir = (d: Destino) => { setEnRecibos(d === 'recibos'); if (d !== 'recibos') v.go(SECCION[d]); scrollTo(0, 0); requestAnimationFrame(() => document.getElementById(`h-${d}`)?.focus({ preventScroll: true })); };
  const elegir = (k: 'mov' | Modulo) => { setQue(false); if (k === 'mov') return v.openTransaction(); if (!modulos[k]) activar(k); setNuevo(k); ir(k); };
  useEffect(() => { if (!v.notice) return; const t = setTimeout(v.clearNotice, 2600); return () => clearTimeout(t); }, [v.notice, v.clearNotice]);
  const [y] = v.month.split('-');
  const mes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${v.month}-01T12:00:00`));
  const visibles = NOMBRES.filter(([d]) => (d !== 'recibos' || modulos.recibos) && (d !== 'metas' || modulos.metas));
  const enlace = (d: Destino, nombre: string, g: string) =>
    <a key={d} href={`#${d}`} aria-current={destino === d ? 'page' : undefined} onClick={(e) => { e.preventDefault(); ir(d); }}><Glifo g={g}/>{nombre}</a>;
  const sinc = !v.user ? 'En este dispositivo' : v.syncState === 'synced' ? 'Al día' : v.syncState === 'syncing' ? 'Sincronizando' : `${v.pending} pendientes`;
  const marca = <a className="marca" href="#rumbo" aria-label="Brújula, ir a Rumbo" onClick={(e) => { e.preventDefault(); ir('rumbo'); }}><Glifo g="logo"/><span className="dot">brújula</span></a>;
  return <div className="m-app">
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONOS }}/>
    <div className="app">
      <aside className="riel" aria-label="Navegación principal">
        {marca}
        <nav className="nav">{visibles.map(([d, n, g]) => enlace(d, n, g))}</nav>
        <button className="anotar" type="button" onClick={() => setQue(true)}><Glifo g="mas"/>Anotar</button>
        <div className="firma">BRÚJULA · KH</div>
      </aside>
      <main className="principal">
        <header className="cabeza">
          {marca}
          <div className="mes">
            <button type="button" aria-label="Mes anterior" onClick={() => v.shiftMonth(-1)}><Glifo g="izq"/></button>
            <b>{mes} {y}</b>
            <button type="button" aria-label="Mes siguiente" onClick={() => v.shiftMonth(1)}><Glifo g="der"/></button>
          </div>
          <div className="estado"><span className="sinc">{sinc}</span><button type="button" className="yo" aria-label="Tu espacio: cuenta y configuración" onClick={() => setCuenta(true)}>{v.user?.email?.charAt(0).toUpperCase() ?? 'T'}</button></div>
        </header>
        <div key={`${destino}-${v.month}`}>
          {destino === 'rumbo' ? <Rumbo v={v} ir={ir} modulos={modulos} activar={activar}/>
            : destino === 'movimientos' ? <Movimientos v={v}/> : destino === 'cuentas' ? <Cuentas v={v}/>
            : destino === 'recibos' ? <Recibos key={v.user?.id ?? 'invitado'} v={v} nuevo={nuevo === 'recibos'} onNuevo={() => setNuevo(null)} Vista={RecibosVistaM} clase="vista"/>
            : <Metas key={v.user?.id ?? 'invitado'} v={v} nuevo={nuevo === 'metas'} onNuevo={() => setNuevo(null)} Vista={MetasVistaM} clase="vista"/>}
        </div>
      </main>
    </div>
    <nav className="muelle" aria-label="Destinos">{visibles.map(([d, n, g]) => enlace(d, n, g))}</nav>
    <button className="fab" type="button" aria-label="Anotar" onClick={() => setQue(true)}><Glifo g="mas"/></button>
    <div className={`tostada${v.notice ? ' ver' : ''}`} role="status" aria-live="polite">{v.notice}</div>
    <HojaCuenta v={v} abierta={cuenta} onCerrar={() => setCuenta(false)} modulos={modulos} activar={activar}/>
    <Hoja titulo="¿Qué anotas?" abierta={que} onCerrar={() => setQue(false)}>
      <div className="hoja-cuerpo"><div>
        <button type="button" className="opcion" onClick={() => elegir('mov')}><Glifo g="mov"/><span><b>Un movimiento</b><small>Un gasto, un ingreso o un traspaso</small></span><Glifo g="flecha" clase="flecha"/></button>
        <button type="button" className="opcion" onClick={() => elegir('recibos')}><Glifo g="rec"/><span><b>Un recibo</b><small>Algo que se paga cada cierto tiempo{!modulos.recibos && <em> · activa Recibos</em>}</small></span><Glifo g="flecha" clase="flecha"/></button>
        <button type="button" className="opcion" onClick={() => elegir('metas')}><Glifo g="meta"/><span><b>Una meta</b><small>Ahorrar para algo{!modulos.metas && <em> · activa Metas</em>}</small></span><Glifo g="flecha" clase="flecha"/></button>
      </div></div>
    </Hoja>
  </div>;
}
