import { useEffect, useMemo, useRef, useState } from 'react';
import type { Seccion, VistaNueva } from '../nuevo/Nuevo';
import { corrienteDelMes, cifra, ritmos } from './datos';
import { Icono, Hoja, Presupuestos } from './piezas';
import { montarRumbo } from './rio';
import { Cuentas } from './Cuentas';
import { Movimientos } from './Movimientos';
import { ICONOS } from './iconos';
import './corriente.css';

type Destino = 'rumbo' | 'movimientos' | 'cuentas';
const DESTINO: Record<Seccion, Destino> = {
  dashboard: 'rumbo', analysis: 'rumbo', transactions: 'movimientos', budgets: 'movimientos',
  accounts: 'cuentas', investments: 'cuentas', goals: 'rumbo',
};
const SECCION: Record<Destino, Seccion> = { rumbo: 'dashboard', movimientos: 'transactions', cuentas: 'accounts' };
const NOMBRES: [Destino, string, string][] = [['rumbo', 'Rumbo', 'i-rumbo'], ['movimientos', 'Movimientos', 'i-mov'], ['cuentas', 'Cuentas', 'i-cue']];

const nombreMes = (mes: string) => new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${mes}-01T12:00:00`));
const fechaRelativa = (fecha: string) => {
  const hoy = new Date(), d = new Date(`${fecha}T12:00:00`), ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const mismo = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return mismo(d, hoy) ? 'hoy' : mismo(d, ayer) ? 'ayer' : `el ${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' }).format(d)}`;
};



function Rumbo({ v, ir }: { v: VistaNueva; ir: (d: Destino) => void }) {
  const mes = nombreMes(v.month);
  // App crea estas listas en cada render: se comparan por contenido para no reiniciar el río sin motivo.
  const clave = JSON.stringify([v.groups, v.monthBudgets.map((b) => [b.category, b.amount]), v.income, v.expenses, v.month]);
  const filas = useMemo(() => ritmos(v.monthBudgets, (c) => v.groups.find((g) => g.category === c)?.total ?? 0, v.month), [clave]);
  const datos = useMemo(() => corrienteDelMes(v.groups, v.income, v.expenses, filas, mes), [filas, mes]);
  const lienzo = useRef<HTMLDivElement>(null), quedan = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (lienzo.current && !datos.vacio) return montarRumbo(lienzo.current, datos, quedan.current); }, [datos]);
  const ultimo = [...v.monthly].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
  const gastos = datos.rios.filter((r) => !r.ahorro);
  const etiqueta = `Corriente de ${mes}: entran ${cifra(datos.entran)} €. Salen ${cifra(datos.salen)} €: ${gastos.map((r) => `${r.nombre} ${cifra(r.v)} €`).join(', ')}. ${datos.faltan ? `Faltan ${cifra(datos.faltan)} €.` : `Se quedan ${cifra(datos.quedan)} €.`}`;
  return <section className="vista" id="rumbo" aria-labelledby="h-rumbo">
    <div className={`corriente${datos.vacio ? ' vacia' : ''}`}>
      <h1 className="sr" id="h-rumbo" tabIndex={-1}>Rumbo de {mes}</h1>
      <p className="frase entran"><em>Entran</em><span className="cifra">{cifra(datos.entran)}</span><span className="eur">€</span></p>
      <p className="frase salen"><em>salen</em><span className="cifra">{cifra(datos.salen)}</span><span className="eur">€</span></p>
      {datos.vacio
        ? <p className="nota sin-movimientos">Aún no hay movimientos en {mes}. Anota el primero y empezará a correr el río.</p>
        : <div className="lienzo" ref={lienzo}>
          <canvas role="img" aria-label={etiqueta}/>
          <div className="etiquetas"/>
          <div className="aviso" role="status" aria-live="polite"><p className="n"/><p className="v"/><p className="d"/><p className="d coral" hidden/></div>
        </div>}
      {datos.faltan > 0
        ? <p className="frase quedan falta" ref={quedan} tabIndex={0}><em>faltan</em><span className="cifra">{cifra(datos.faltan)}</span><span className="eur">€</span><small>Sale más de lo que entra.</small></p>
        : <p className="frase quedan" ref={quedan} tabIndex={0}><em>se quedan</em><span className="cifra">{cifra(datos.quedan)}</span><span className="eur">€</span>{datos.entran > 0 && <small>El {Math.round(datos.quedan / datos.entran * 100)} % de lo que entra.</small>}</p>}
    </div>
    <div className="marco">
      <div className="rejilla">
        <nav className="indice" aria-labelledby="h-indice">
          <h2 className="eti" id="h-indice">El resto de {mes}</h2>
          <a className="linea" href="#movimientos" onClick={(e) => { e.preventDefault(); ir('movimientos'); }}><span className="l-nom">Movimientos</span>
            <span className="l-dato">{ultimo ? <>{v.monthly.length} este mes. El último, {ultimo.description}, {fechaRelativa(ultimo.occurred_on)}.</> : 'Ninguno este mes todavía.'}</span><svg className="l-ir" aria-hidden="true"><use href="#i-ir"/></svg></a>
          <a className="linea" href="#cuentas" onClick={(e) => { e.preventDefault(); ir('cuentas'); }}><span className="l-nom">Cuentas</span>
            <span className="l-dato"><span className="cifra">{cifra(v.wealth)} €</span> de patrimonio.</span><svg className="l-ir" aria-hidden="true"><use href="#i-ir"/></svg></a>
        </nav>
        <section className="presu-rumbo" aria-labelledby="h-presu-r">
          <div className="cab"><h2 id="h-presu-r">Presupuestos</h2><a className="ir" href="#movimientos" onClick={(e) => { e.preventDefault(); ir('movimientos'); }}>En movimientos<Icono id="i-ir"/></a></div>
          <div className="presu"><Presupuestos filas={filas} onAnadir={() => v.openBudget()}/></div>
        </section>
      </div>
    </div>
  </section>;
}

function HojaCuenta({ v, abierta, onCerrar }: { v: VistaNueva; abierta: boolean; onCerrar: () => void }) {
  const estado = !v.user ? 'Tus datos se guardan en este dispositivo.'
    : v.syncState === 'synced' ? 'Todo sincronizado en tus dispositivos.'
    : v.syncState === 'syncing' ? 'Sincronizando…'
    : v.syncState === 'offline' ? `Sin conexión. ${v.pending} cambios pendientes.` : `${v.pending} cambios pendientes de sincronizar.`;
  const hacer = (f: () => void) => () => { onCerrar(); f(); };
  const opcion = (icono: string, titulo: string, detalle: string, f: () => void) =>
    <button type="button" className="opcion" onClick={hacer(f)}><Icono id={icono}/><span><b>{titulo}</b><small>{detalle}</small></span><Icono id="i-der"/></button>;
  return <Hoja titulo="Tu espacio" abierta={abierta} onCerrar={onCerrar}>
    <div className="hoja-cuerpo">
      <p className="ayuda" role="status">{v.user?.email ? `${v.user.email}. ` : ''}{estado}</p>
      <div className="opciones">
        {v.user
          ? <>{opcion('i-mov', 'Sincronizar ahora', 'Sube y trae los cambios de tus dispositivos', v.onSync)}{opcion('i-x', 'Cerrar sesión', 'Tus datos siguen en tu cuenta', v.onSignOut)}</>
          : v.configured && opcion('i-mov', 'Iniciar sesión', 'Para tener tus datos en todos tus dispositivos', v.onAuth)}
        {opcion('i-cue', 'Configuración', 'Tema y aspecto de Brújula', v.openSettings)}
        {opcion('i-rumbo', 'Guía de Brújula', 'Un recorrido por la app', v.openGuide)}
        {opcion('i-sube', 'Exportar movimientos', 'Un archivo CSV con los de este mes', v.exportCSV)}
      </div>
    </div>
  </Hoja>;
}

/** Tema Corriente: el dinero como un río. Mismos datos y acciones que el tema nuevo (VistaNueva). */
export function Corriente({ v }: { v: VistaNueva }) {
  const destino = DESTINO[v.tab];
  const [cuenta, setCuenta] = useState(false);
  const ir = (d: Destino) => { v.go(SECCION[d]); requestAnimationFrame(() => document.getElementById(`h-${d}`)?.focus({ preventScroll: true })); };
  useEffect(() => { if (!v.notice) return; const t = setTimeout(v.clearNotice, 2600); return () => clearTimeout(t); }, [v.notice, v.clearNotice]);
  const [y, m] = v.month.split('-');
  const mesLargo = nombreMes(v.month);
  const inicial = v.user?.email?.charAt(0).toUpperCase() ?? 'T';
  const enlace = (d: Destino, nombre: string, icono?: string) =>
    <a key={d} href={`#${d}`} aria-current={destino === d ? 'page' : undefined} onClick={(e) => { e.preventDefault(); ir(d); }}>{icono && <Icono id={icono}/>}{nombre}</a>;
  return <div className="c-app">
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONOS }}/>
    <header className="barra">
      <a className="marca" href="#rumbo" aria-label="Brújula, ir a Rumbo" onClick={(e) => { e.preventDefault(); ir('rumbo'); }}>brújula</a>
      <div className="mes">
        <button type="button" aria-label="Mes anterior" onClick={() => v.shiftMonth(-1)}><Icono id="i-izq"/></button>
        <span><b>{mesLargo.charAt(0).toUpperCase() + mesLargo.slice(1)}</b> {y}</span>
        <button type="button" aria-label="Mes siguiente" onClick={() => v.shiftMonth(1)}><Icono id="i-der"/></button>
      </div>
      <button type="button" className="yo" aria-label="Tu espacio: cuenta y configuración" onClick={() => setCuenta(true)}>{inicial}</button>
    </header>
    <main key={`${destino}-${m}`}>
      {destino === 'rumbo' && <Rumbo v={v} ir={ir}/>}
      {destino === 'movimientos' && <Movimientos v={v}/>}
      {destino === 'cuentas' && <Cuentas v={v}/>}
    </main>
    <nav className="dock" aria-label="Destinos">
      {NOMBRES.map(([d, n]) => enlace(d, n))}
      <span className="sep" aria-hidden="true"/>
      <button type="button" className="anotar" onClick={() => v.openTransaction()}><Icono id="i-mas"/>Anotar</button>
    </nav>
    <nav className="tabbar" aria-label="Destinos">{NOMBRES.map(([d, n, i]) => enlace(d, n, i))}</nav>
    <button type="button" className="fab" aria-label="Anotar" onClick={() => v.openTransaction()}><Icono id="i-mas"/></button>
    <div className={`tostada${v.notice ? ' ver' : ''}`} role="status" aria-live="polite">{v.notice}</div>
    <HojaCuenta v={v} abierta={cuenta} onCerrar={() => setCuenta(false)}/>
  </div>;
}
