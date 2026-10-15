import { useEffect, useRef } from 'react';
import type { Goal } from '../data';
import { lunesDe, type Fecha } from '../metas/fechas';
import { progreso, ritmo, TEXTO_RITMO, type Meta, type Paso, type Registro } from '../metas/metas';
import type { Acciones } from '../corriente/Metas';
import { cifra, detalleAhorro } from '../corriente/datos';
import { el, encima, Glifo, medidor, quieto } from './piezas';
import { unidadDeposito } from './puntos';

const mesAño = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${f}T12:00:00`));
const diaMes = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(`${f}T12:00:00`));
const PLAZO = (m: Meta) => m.fecha_limite ? `hasta ${mesAño(m.fecha_limite)}` : 'sin plazo';

type Deposito = { id: string; n: string; hecho: number; meta: number; detalle: string; accion: string; abrir: () => void };

/** Un depósito de puntos que se llena desde abajo (diez columnas). */
function pintarDeposito(svg: SVGSVGElement, id: string, metaP: number, hechoP: number) {
  const cols = 10, paso = 14, filas = Math.max(1, Math.ceil(metaP / cols)), r = paso * 0.33;
  svg.setAttribute('width', String(cols * paso)); svg.setAttribute('height', String(filas * paso)); svg.replaceChildren();
  const g = el('g', { 'data-g': id });
  g.append(el('rect', { x: 0, y: 0, width: cols * paso, height: filas * paso, fill: 'transparent', class: 'ancla' }));
  for (let i = 0; i < metaP; i++) {
    const c = el('circle', { cx: (i % cols) * paso + paso / 2, cy: (filas - Math.floor(i / cols) - 0.5) * paso, r });
    if (i < hechoP) { c.setAttribute('class', 'on ap'); (c as SVGElement).style.setProperty('--d', `${i * 12}ms`); }
    g.append(c);
  }
  svg.append(g);
}

function Medidor({ seg, paso }: { seg: string; paso: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { if (ref.current) medidor(ref.current, seg, paso); }, [seg, paso]);
  return <svg ref={ref} aria-hidden="true"/>;
}

/** Metas en el estilo Monolito. Mismas props que la vista de Corriente. */
export function MetasVistaM({ goals, metas, pasos, registros, hoy, acciones }: { goals: Goal[]; metas: Meta[] | null; pasos: Paso[]; registros: Registro[]; hoy: Fecha; acciones: Acciones }) {
  const brujula = goals.map((g) => ({ ...g, target_amount: Number(g.target_amount), saved_amount: Number(g.saved_amount) }));
  const activas = (metas ?? []).filter((m) => m.estado === 'activa');
  const ahorroFaro = activas.filter((m) => m.progreso === 'dinero' && !brujula.some((g) => g.id === m.objetivo_brujula));
  const vida = activas.filter((m) => m.progreso !== 'dinero');
  const otras = (metas ?? []).filter((m) => m.estado !== 'activa');
  const faro = acciones.faro;
  const depositos: Deposito[] = [
    ...brujula.map((g) => ({ id: g.id, n: g.name, hecho: g.saved_amount, meta: g.target_amount, detalle: detalleAhorro(g, hoy), accion: 'editarla', abrir: () => acciones.objetivo(goals.find((x) => x.id === g.id)!) })),
    ...ahorroFaro.map((m) => { const p = progreso(m, pasos, registros, brujula, hoy);
      return { id: m.id, n: m.titulo, hecho: p.actual, meta: p.objetivo, detalle: `Desde Faro · ${PLAZO(m)}`, accion: 'aportar', abrir: () => faro?.anotar(m) }; }),
  ].filter((d) => d.meta > 0);
  const unidad = unidadDeposito(Math.max(0, ...depositos.map((d) => d.meta)));
  const vis = useRef<HTMLDivElement>(null);
  const huella = JSON.stringify([depositos.map((d) => [d.id, d.hecho, d.meta]), unidad]);
  useEffect(() => {
    const cont = vis.current; if (!cont || !depositos.length) return;
    depositos.forEach((d) => { const s = cont.querySelector<SVGSVGElement>(`svg[data-deposito="${CSS.escape(d.id)}"]`); if (s) pintarDeposito(s, d.id, Math.ceil(d.meta / unidad), Math.min(Math.ceil(d.meta / unidad), Math.floor(d.hecho / unidad))); });
    if (!quieto()) { cont.classList.remove('vivo'); void cont.offsetWidth; cont.classList.add('vivo'); setTimeout(() => cont.classList.remove('vivo'), 2600); }
    return encima(cont, (id) => { const d = depositos.find((x) => x.id === id); return d ? { n: d.n, v: `${cifra(d.hecho)}<small>€</small>`, d: `de ${cifra(d.meta)} € · ${d.detalle}` } : null; });
  }, [huella]);
  const nAhorro = brujula.length + ahorroFaro.length;
  return <>
    <div className="vcab"><div><h1 id="h-metas" tabIndex={-1}>Metas</h1>
      <p className="sub">{!nAhorro && !vida.length ? 'Aún no hay metas.' : metas ? `${nAhorro} de ahorro y ${vida.length} de vida.` : `${nAhorro} de ahorro.`}</p></div>
      <div className="acciones">
        <button type="button" className="boton" onClick={() => acciones.objetivo(null)}>Nueva meta de ahorro</button>
        {faro && activas.length > 0 && <button type="button" className="boton lleno" onClick={faro.revisar}>{faro.revisada ? 'Ver la revisión' : 'Empezar la revisión'}</button>}
      </div>
    </div>
    {depositos.length > 0 && <section className="mod" aria-labelledby="h-llenan">
      <div className="tit"><h2 id="h-llenan">Lo que ahorras llena los depósitos</h2><span className="escala">1 punto = {cifra(unidad)} €</span></div>
      <div className="vis" ref={vis} style={{ marginTop: 22 }}>
        <div className="depositos">{depositos.map((d) => {
          const f = Math.min(1, d.hecho / d.meta);
          return <button type="button" key={d.id} className="deposito deposito-editar" onClick={d.abrir} aria-label={`${d.n}: ${cifra(d.hecho)} de ${cifra(d.meta)} €. Toca para ${d.accion}`}>
            <p className="pct">{Math.round(f * 100)}%</p><svg data-deposito={d.id} aria-hidden="true"/>
            <div><p className="nom">{d.n}</p><small>{cifra(d.hecho)} / {cifra(d.meta)} € · {d.detalle}</small></div></button>;
        })}</div>
        <div className="tip"><p className="n"/><p className="v"/><p className="d"/><p className="d rojo" hidden/></div>
      </div>
    </section>}
    <div className="rejilla">
      <section className="mod" aria-labelledby="h-vida">
        <div className="tit"><h2 id="h-vida">De vida</h2>{acciones.faro && <button type="button" className="ir" onClick={acciones.faro.nueva}>Añadir<Glifo g="mas"/></button>}</div>
        <div style={{ marginTop: 12 }}>
          {!metas ? <p className="res">Las metas de vida vienen de Faro. Entra con tu cuenta para verlas.</p>
            : !vida.length ? <p className="res">Aún no hay metas de vida.{faro && <> <button type="button" className="ir" onClick={faro.nueva}>Añadir una</button></>}</p>
            : vida.map((m) => {
              const p = progreso(m, pasos, registros, brujula, hoy), r = ritmo(m, p, hoy);
              const lista = pasos.filter((x) => x.meta_id === m.id).sort((a, b) => a.orden - b.orden);
              const hechoHoy = registros.some((x) => x.meta_id === m.id && x.fecha === hoy);
              const escala = p.objetivo > 60 ? Math.ceil(p.objetivo / 60) : 1;
              return <div className="meta" key={m.id}>
                <span><b>{faro ? <button type="button" className="meta-abrir" onClick={() => faro.abrir(m)}>{m.titulo}</button> : m.titulo}</b><small>{p.texto} · {PLAZO(m)}{r ? ` · ${TEXTO_RITMO[r].toLowerCase()}` : ''}</small></span><span className="cant">{p.actual} / {p.objetivo}</span>
                {m.progreso === 'numero' && <><div className="cuerpo"><Medidor seg={`${Math.min(Math.round(p.objetivo / escala), Math.floor(p.actual / escala))}:on,${Math.max(0, Math.round(p.objetivo / escala) - Math.floor(p.actual / escala))}:off`} paso={22}/></div>
                  <span className="unidad">1 punto = {escala} {escala === 1 ? (m.unidad || 'unidad').replace(/s$/, '') : m.unidad || 'unidades'}{faro && <> · <button type="button" className="ir" onClick={() => faro.anotar(m)}>Anotar avance</button></>}</span></>}
                {m.progreso === 'habito' && <div className="cuerpo habito" role="group" aria-label={`${m.titulo}: ${p.texto}`}>{Array.from({ length: p.objetivo }, (_, i) =>
                  <button key={i} type="button" disabled={!faro} aria-pressed={i < p.actual} onClick={() => faro?.marcarHoy(m)} aria-label={hechoHoy ? 'Hoy ya está hecho. Toca para desmarcarlo' : 'Marcar hoy como hecho'}/>)}</div>}
                {m.progreso === 'pasos' && <div className="cuerpo"><ul className="pasos">{lista.map((x) => <li key={x.id}><label><input type="checkbox" checked={x.hecho} disabled={!faro} onChange={() => faro?.paso(x)}/><span>{x.texto}</span></label></li>)}</ul></div>}
              </div>;
            })}
          {faro && otras.length > 0 && <p className="res" style={{ marginTop: 18 }}>En pausa o terminadas: {otras.map((m, i) => <span key={m.id}>{i ? ' · ' : ''}<button type="button" className="ir" onClick={() => faro.abrir(m)}>{m.titulo}</button></span>)}</p>}
        </div>
      </section>
      <section className="mod der revision" aria-labelledby="h-rev">
        {faro && activas.length > 0 ? <>
          <p className="eti">Semana del {diaMes(lunesDe(hoy))} · revisión semanal</p>
          <h2 id="h-rev">{faro.revisada ? 'Revisión de esta semana hecha' : 'Cinco minutos para mirar hacia dónde vas'}</h2>
          <ol><li>Cómo ha ido cada meta esta semana.</li><li>Qué ha funcionado y qué no.</li><li>El siguiente paso de cada una.</li></ol>
          <button type="button" className="boton" onClick={faro.revisar}>{faro.revisada ? 'Verla o cambiarla' : 'Empezar ahora'}</button>
        </> : <h2 id="h-rev" className="sr">De ahorro</h2>}
        <div style={{ marginTop: faro && activas.length > 0 ? 32 : 0 }}>
          <p className="eti">De ahorro</p>
          {brujula.length ? <ul className="partes" style={{ marginTop: 10 }}>{brujula.map((g) =>
            <li key={g.id}><button type="button" className="parte-editar" onClick={() => acciones.objetivo(goals.find((x) => x.id === g.id)!)} aria-label={`Editar ${g.name}`}>
              <span className="dt">{g.name}<small>{detalleAhorro(g, hoy)}</small></span><span className="dd">{cifra(g.saved_amount)} €<small>de {cifra(g.target_amount)}</small></span></button></li>)}</ul>
            : <p className="res" style={{ marginTop: 10 }}>Aún no hay metas de ahorro. <button type="button" className="ir" onClick={() => acciones.objetivo(null)}>Añadir una</button></p>}
        </div>
      </section>
    </div>
  </>;
}
