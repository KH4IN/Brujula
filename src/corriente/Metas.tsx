import { useEffect, useState, type CSSProperties } from 'react';
import { supabase, type Goal } from '../data';
import type { VistaNueva } from '../nuevo/Nuevo';
import { hoyLocal, type Fecha } from '../metas/fechas';
import { progreso, ritmo, TEXTO_RITMO, type Meta, type Paso, type Registro } from '../metas/metas';
import { cifra, detalleAhorro } from './datos';

const mesAño = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${f}T12:00:00`));
const PLAZO = (m: Meta) => m.fecha_limite ? `hasta ${mesAño(m.fecha_limite)}` : 'sin plazo';

const Puntos = ({ f, etiqueta }: { f: number; etiqueta: string }) =>
  <div className="puntos" style={{ '--n': 25, '--k': Math.round(f * 25) } as CSSProperties} role="img" aria-label={etiqueta}/>;

/** Metas de ahorro (Brújula y Faro) y de vida (Faro), solo lectura. */
export function MetasVista({ goals, metas, pasos, registros, hoy }: { goals: Goal[]; metas: Meta[] | null; pasos: Paso[]; registros: Registro[]; hoy: Fecha }) {
  const brujula = goals.map((g) => ({ ...g, target_amount: Number(g.target_amount), saved_amount: Number(g.saved_amount) }));
  const activas = (metas ?? []).filter((m) => m.estado === 'activa');
  // Una meta de dinero enlazada a un objetivo de Brújula es ese objetivo: se muestra una sola vez.
  const ahorroFaro = activas.filter((m) => m.progreso === 'dinero' && !brujula.some((g) => g.id === m.objetivo_brujula));
  const vida = activas.filter((m) => m.progreso !== 'dinero');
  const nAhorro = brujula.length + ahorroFaro.length;
  return <>
    <div className="vcab"><div><h1 id="h-metas" tabIndex={-1}>Metas</h1>
      <p className="sub">{!nAhorro && !vida.length ? 'Aún no hay metas.' : metas ? `${nAhorro} de ahorro y ${vida.length} de vida.` : `${nAhorro} de ahorro.`}</p></div></div>
    <div className="rejilla">
      <section className="c6" aria-labelledby="h-ahorro">
        <div className="cab"><h2 id="h-ahorro">De ahorro</h2></div>
        {nAhorro ? <ul className="ahorros">
          {brujula.map((g) => { const f = g.target_amount > 0 ? Math.min(1, g.saved_amount / g.target_amount) : 0;
            return <li className="ahorro" key={g.id}><h3>{g.name}</h3><span className="imp">{cifra(g.saved_amount)} / {cifra(g.target_amount)} €</span>
              <Puntos f={f} etiqueta={`${Math.round(f * 100)} %`}/><small>{detalleAhorro(g, hoy)}</small></li>; })}
          {ahorroFaro.map((m) => { const p = progreso(m, pasos, registros, brujula, hoy), r = ritmo(m, p, hoy);
            return <li className="ahorro" key={m.id}><h3>{m.titulo}</h3><span className="imp">{p.objetivo > 0 ? `${cifra(p.actual)} / ${cifra(p.objetivo)} €` : `${cifra(p.actual)} €`}</span>
              <Puntos f={p.fraccion} etiqueta={`${Math.round(p.fraccion * 100)} %`}/><small>Desde Faro · {PLAZO(m)}{r ? ` · ${TEXTO_RITMO[r].toLowerCase()}` : ''}</small></li>; })}
        </ul> : <p className="nota">Aún no hay metas de ahorro.</p>}
      </section>
      <section className="c6" aria-labelledby="h-vida">
        <div className="cab"><h2 id="h-vida">De vida</h2></div>
        {!metas ? <p className="nota">Las metas de vida vienen de Faro. Entra con tu cuenta para verlas.</p>
          : !vida.length ? <p className="nota">Aún no hay metas de vida en Faro.</p>
          : <ul className="ahorros">{vida.map((m) => {
            const p = progreso(m, pasos, registros, brujula, hoy), r = ritmo(m, p, hoy);
            const lista = pasos.filter((x) => x.meta_id === m.id).sort((a, b) => a.orden - b.orden);
            return <li className="meta" key={m.id}>
              <div className="meta-cab"><h3>{m.titulo}</h3><span className="imp">{p.actual} / {p.objetivo}</span></div>
              {m.progreso === 'numero' && <div className="marcas" style={{ '--n': Math.min(40, Math.max(1, p.objetivo)), '--k': Math.round(p.fraccion * Math.min(40, Math.max(1, p.objetivo))) } as CSSProperties} role="img" aria-label={p.texto}/>}
              {m.progreso === 'habito' && <div className="semana" role="img" aria-label={p.texto}>{Array.from({ length: p.objetivo }, (_, i) => <button key={i} type="button" disabled tabIndex={-1} aria-pressed={i < p.actual}/>)}</div>}
              {m.progreso === 'pasos' && <ul className="pasos">{lista.map((x) => <li key={x.id}><label><input type="checkbox" checked={x.hecho} disabled readOnly/><span>{x.texto}</span></label></li>)}</ul>}
              <small>{p.texto} · {PLAZO(m)}{r ? ` · ${TEXTO_RITMO[r].toLowerCase()}` : ''}</small>
            </li>; })}</ul>}
      </section>
    </div>
  </>;
}

type Carga = { metas: Meta[]; pasos: Paso[]; registros: Registro[] } | 'cargando' | 'error' | null;

export function Metas({ v }: { v: VistaNueva }) {
  const uid = v.user?.id;
  const [carga, setCarga] = useState<Carga>(supabase && uid ? 'cargando' : null);
  useEffect(() => {
    if (!supabase || !uid) return;
    let vivo = true;
    // RLS de Faro: con la sesión del usuario solo se leen sus filas. Solo lectura.
    Promise.all([supabase.from('faro_metas').select('*'), supabase.from('faro_pasos').select('*'), supabase.from('faro_registros').select('*')])
      .then(([m, p, r]) => { if (vivo) setCarga(m.error || p.error || r.error ? 'error' : { metas: m.data as Meta[], pasos: p.data as Paso[], registros: (r.data as Registro[]).map((x) => ({ ...x, valor: Number(x.valor) })) }); });
    return () => { vivo = false; };
  }, [uid]);
  return <section className="vista marco" id="metas" aria-labelledby="h-metas">
    {carga === 'cargando' ? <div className="vcab"><div><h1 id="h-metas" tabIndex={-1}>Metas</h1><p className="sub" role="status">Cargando tus metas…</p></div></div>
      : <>
        <MetasVista goals={v.goals} metas={carga && typeof carga === 'object' ? carga.metas.map((m) => ({ ...m, objetivo: m.objetivo == null ? null : Number(m.objetivo) })) : null}
          pasos={carga && typeof carga === 'object' ? carga.pasos : []} registros={carga && typeof carga === 'object' ? carga.registros : []} hoy={hoyLocal()}/>
        {carga === 'error' && <p className="nota alerta" role="alert">No se pudieron leer tus metas de Faro. Prueba de nuevo en un momento.</p>}
      </>}
  </section>;
}
