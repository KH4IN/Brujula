import { useEffect, useState, type CSSProperties } from 'react';
import { supabase, type Goal } from '../data';
import type { VistaNueva } from '../nuevo/Nuevo';
import { hoyLocal, lunesDe, type Fecha } from '../metas/fechas';
import { progreso, ritmo, TEXTO_RITMO, type Meta, type Paso, type Registro, type Revision } from '../metas/metas';
import { cifra, detalleAhorro } from './datos';
import { HojaAvance, HojaObjetivo, HojaRevision, type Eleccion } from './HojasMetas';

const mesAño = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${f}T12:00:00`));
const diaMes = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(`${f}T12:00:00`));
const PLAZO = (m: Meta) => m.fecha_limite ? `hasta ${mesAño(m.fecha_limite)}` : 'sin plazo';

const Puntos = ({ f, etiqueta }: { f: number; etiqueta: string }) =>
  <div className="puntos" style={{ '--n': 25, '--k': Math.round(f * 25) } as CSSProperties} role="img" aria-label={etiqueta}/>;

/** Lo que se puede hacer desde la vista; sin sesión de Faro solo se editan los objetivos de Brújula. */
export type Acciones = {
  objetivo: (g: Goal | null) => void;
  faro?: { anotar: (m: Meta) => void; marcarHoy: (m: Meta) => void; paso: (p: Paso) => void; revisar: () => void; revisada: boolean };
};

/** Metas de ahorro (Brújula y Faro) y de vida (Faro). */
export function MetasVista({ goals, metas, pasos, registros, hoy, acciones }: { goals: Goal[]; metas: Meta[] | null; pasos: Paso[]; registros: Registro[]; hoy: Fecha; acciones: Acciones }) {
  const brujula = goals.map((g) => ({ ...g, target_amount: Number(g.target_amount), saved_amount: Number(g.saved_amount) }));
  const activas = (metas ?? []).filter((m) => m.estado === 'activa');
  // Una meta de dinero enlazada a un objetivo de Brújula es ese objetivo: se muestra una sola vez.
  const ahorroFaro = activas.filter((m) => m.progreso === 'dinero' && !brujula.some((g) => g.id === m.objetivo_brujula));
  const vida = activas.filter((m) => m.progreso !== 'dinero');
  const nAhorro = brujula.length + ahorroFaro.length;
  const faro = acciones.faro;
  return <>
    <div className="vcab"><div><h1 id="h-metas" tabIndex={-1}>Metas</h1>
      <p className="sub">{!nAhorro && !vida.length ? 'Aún no hay metas.' : metas ? `${nAhorro} de ahorro y ${vida.length} de vida.` : `${nAhorro} de ahorro.`}</p></div>
      {faro && activas.length > 0 && <div className="acciones"><button type="button" className="boton lleno" onClick={faro.revisar}>{faro.revisada ? 'Ver la revisión' : 'Empezar la revisión'}</button></div>}
    </div>
    <div className="rejilla">
      <section className="c6" aria-labelledby="h-ahorro">
        <div className="cab"><h2 id="h-ahorro">De ahorro</h2><button type="button" className="ir" onClick={() => acciones.objetivo(null)}>Añadir</button></div>
        {nAhorro ? <ul className="ahorros">
          {brujula.map((g) => { const f = g.target_amount > 0 ? Math.min(1, g.saved_amount / g.target_amount) : 0;
            return <li key={g.id}><button type="button" className="ahorro ahorro-editar" onClick={() => acciones.objetivo(goals.find((x) => x.id === g.id)!)} aria-label={`Editar ${g.name}`}>
              <h3>{g.name}</h3><span className="imp">{cifra(g.saved_amount)} / {cifra(g.target_amount)} €</span>
              <Puntos f={f} etiqueta={`${Math.round(f * 100)} %`}/><small>{detalleAhorro(g, hoy)}</small></button></li>; })}
          {ahorroFaro.map((m) => { const p = progreso(m, pasos, registros, brujula, hoy), r = ritmo(m, p, hoy);
            return <li className="ahorro" key={m.id}><h3>{m.titulo}</h3><span className="imp">{p.objetivo > 0 ? `${cifra(p.actual)} / ${cifra(p.objetivo)} €` : `${cifra(p.actual)} €`}</span>
              <Puntos f={p.fraccion} etiqueta={`${Math.round(p.fraccion * 100)} %`}/>
              <small>Desde Faro · {PLAZO(m)}{r ? ` · ${TEXTO_RITMO[r].toLowerCase()}` : ''}{faro && <> · <button type="button" className="ir" onClick={() => faro.anotar(m)}>Aportar</button></>}</small></li>; })}
        </ul> : <p className="nota">Aún no hay metas de ahorro. <button type="button" className="ir" onClick={() => acciones.objetivo(null)}>Añadir una</button></p>}
      </section>
      <section className="c6" aria-labelledby="h-vida">
        <div className="cab"><h2 id="h-vida">De vida</h2></div>
        {!metas ? <p className="nota">Las metas de vida vienen de Faro. Entra con tu cuenta para verlas.</p>
          : !vida.length ? <p className="nota">Aún no hay metas de vida. Se crean en Faro.</p>
          : <ul className="ahorros">{vida.map((m) => {
            const p = progreso(m, pasos, registros, brujula, hoy), r = ritmo(m, p, hoy);
            const lista = pasos.filter((x) => x.meta_id === m.id).sort((a, b) => a.orden - b.orden);
            const hechoHoy = registros.some((x) => x.meta_id === m.id && x.fecha === hoy);
            return <li className="meta" key={m.id}>
              <div className="meta-cab"><h3>{m.titulo}</h3><span className="imp">{p.actual} / {p.objetivo}</span></div>
              {m.progreso === 'numero' && <div className="marcas" style={{ '--n': Math.min(40, Math.max(1, p.objetivo)), '--k': Math.round(p.fraccion * Math.min(40, Math.max(1, p.objetivo))) } as CSSProperties} role="img" aria-label={p.texto}/>}
              {m.progreso === 'habito' && <div className="semana" role="group" aria-label={`${m.titulo}: ${p.texto}`}>{Array.from({ length: p.objetivo }, (_, i) =>
                <button key={i} type="button" disabled={!faro} aria-pressed={i < p.actual} onClick={() => faro?.marcarHoy(m)}
                  aria-label={hechoHoy ? 'Hoy ya está hecho. Toca para desmarcarlo' : 'Marcar hoy como hecho'}/>)}</div>}
              {m.progreso === 'pasos' && <ul className="pasos">{lista.map((x) => <li key={x.id}><label><input type="checkbox" checked={x.hecho} disabled={!faro} onChange={() => faro?.paso(x)}/><span>{x.texto}</span></label></li>)}</ul>}
              <small>{m.progreso === 'habito' && faro ? 'Toca para marcar hoy · ' : ''}{p.texto} · {PLAZO(m)}{r ? ` · ${TEXTO_RITMO[r].toLowerCase()}` : ''}
                {faro && m.progreso === 'numero' && <> · <button type="button" className="ir" onClick={() => faro.anotar(m)}>Anotar avance</button></>}</small>
            </li>; })}</ul>}
      </section>
      {faro && activas.length > 0 && <section className="c12 revision" aria-labelledby="h-rev">
        <p className="eti">Semana del {diaMes(lunesDe(hoy))} · revisión semanal</p>
        <h2 id="h-rev">{faro.revisada ? 'Revisión de esta semana hecha' : 'Cinco minutos para mirar hacia dónde vas'}</h2>
        <ol><li>Cómo ha ido cada meta esta semana.</li><li>Qué ha funcionado y qué no.</li><li>El siguiente paso de cada una.</li></ol>
        <button type="button" className="boton" onClick={faro.revisar}>{faro.revisada ? 'Verla o cambiarla' : 'Empezar ahora'}</button>
      </section>}
    </div>
  </>;
}

type Datos = { metas: Meta[]; pasos: Paso[]; registros: Registro[]; revisiones: Revision[] };
type Carga = Datos | 'cargando' | 'error' | null;
const ahora = () => new Date().toISOString();

export function Metas({ v }: { v: VistaNueva }) {
  const uid = v.user?.id;
  const [carga, setCarga] = useState<Carga>(supabase && uid ? 'cargando' : null);
  const [vuelta, setVuelta] = useState(0);
  const [hoja, setHoja] = useState<{ tipo: 'objetivo'; g: Goal | null } | { tipo: 'avance'; m: Meta } | { tipo: 'revision' } | null>(null);
  const [aviso, setAviso] = useState('');
  const hoy = hoyLocal();
  useEffect(() => {
    if (!supabase || !uid) return;
    let vivo = true;
    // RLS de Faro: con la sesión del usuario solo se leen y escriben sus filas.
    Promise.all(['faro_metas', 'faro_pasos', 'faro_registros', 'faro_revisiones'].map((t) => supabase!.from(t).select('*')))
      .then(([m, p, r, s]) => { if (vivo) setCarga(m.error || p.error || r.error || s.error ? 'error' : {
        metas: (m.data as Meta[]).map((x) => ({ ...x, objetivo: x.objetivo == null ? null : Number(x.objetivo) })), pasos: p.data as Paso[],
        registros: (r.data as Registro[]).map((x) => ({ ...x, valor: Number(x.valor) })), revisiones: s.data as Revision[] }); });
    return () => { vivo = false; };
  }, [uid, vuelta]);
  const datos = carga && typeof carga === 'object' ? carga : null;
  // Cada escritura en Faro recarga desde la nube; si falla, se dice y no se toca nada más.
  const escribir = async (accion: PromiseLike<{ error: unknown }>, fallo = 'No se pudo guardar en Faro. Prueba de nuevo en un momento.') => {
    const { error } = await accion; if (error) { setAviso(fallo); return fallo; } setAviso(''); setVuelta((n) => n + 1); return null;
  };
  const sb = supabase!;
  const faro = datos ? {
    revisada: datos.revisiones.some((r) => r.semana === lunesDe(hoy)),
    anotar: (m: Meta) => setHoja({ tipo: 'avance', m }),
    revisar: () => setHoja({ tipo: 'revision' }),
    paso: (p: Paso) => void escribir(sb.from('faro_pasos').update({ hecho: !p.hecho, fecha_hecho: p.hecho ? null : hoy, actualizado: ahora() }).eq('id', p.id)),
    marcarHoy: (m: Meta) => {
      const deHoy = datos.registros.find((x) => x.meta_id === m.id && x.fecha === hoy);
      void escribir(deHoy ? sb.from('faro_registros').delete().eq('id', deHoy.id)
        : sb.from('faro_registros').insert({ id: crypto.randomUUID(), user_id: uid, meta_id: m.id, fecha: hoy, valor: 1, nota: '', actualizado: ahora() }));
    },
  } : undefined;
  const guardarRevision = async ({ avances, frenos, elecciones }: { avances: string; frenos: string; elecciones: Eleccion[] }) => {
    if (!datos) return 'Faro no está disponible.';
    const focos: string[] = [], nuevos: Paso[] = [];
    for (const e of elecciones) {
      if (e.paso_id) { focos.push(e.paso_id); continue; }
      const orden = Math.max(0, ...datos.pasos.filter((p) => p.meta_id === e.meta_id).map((p) => p.orden + 1));
      const paso = { id: crypto.randomUUID(), user_id: uid, meta_id: e.meta_id, texto: e.texto, hecho: false, fecha_hecho: null, orden, actualizado: ahora() };
      nuevos.push(paso); focos.push(paso.id);
    }
    if (nuevos.length) { const f = await escribir(sb.from('faro_pasos').insert(nuevos)); if (f) return f; }
    const previa = datos.revisiones.find((r) => r.semana === lunesDe(hoy));
    return escribir(sb.from('faro_revisiones').upsert({ id: previa?.id ?? crypto.randomUUID(), user_id: uid, semana: lunesDe(hoy), avances, frenos, focos, actualizado: ahora() }, { onConflict: 'user_id,semana' }));
  };
  return <section className="vista marco" id="metas" aria-labelledby="h-metas">
    {carga === 'cargando' ? <div className="vcab"><div><h1 id="h-metas" tabIndex={-1}>Metas</h1><p className="sub" role="status">Cargando tus metas…</p></div></div>
      : <>
        <MetasVista goals={v.goals} metas={datos?.metas ?? null} pasos={datos?.pasos ?? []} registros={datos?.registros ?? []} hoy={hoy}
          acciones={{ objetivo: (g) => setHoja({ tipo: 'objetivo', g }), faro }}/>
        {(carga === 'error' || aviso) && <p className="nota alerta" role="alert">{aviso || 'No se pudieron leer tus metas de Faro. Prueba de nuevo en un momento.'}</p>}
      </>}
    {hoja?.tipo === 'objetivo' && <HojaObjetivo inicial={hoja.g} onGuardar={(g) => { v.saveGoal(g); return null; }} onBorrar={(g) => v.deleteGoal(g.id)} onCerrar={() => setHoja(null)}/>}
    {hoja?.tipo === 'avance' && <HojaAvance meta={hoja.m} hoy={hoy} onCerrar={() => setHoja(null)}
      onGuardar={({ valor, fecha, nota }) => escribir(sb.from('faro_registros').insert({ id: crypto.randomUUID(), user_id: uid, meta_id: hoja.m.id, fecha, valor, nota, actualizado: ahora() }))}/>}
    {hoja?.tipo === 'revision' && datos && <HojaRevision metas={datos.metas} pasos={datos.pasos} revisiones={datos.revisiones} hoy={hoy} onGuardar={guardarRevision} onCerrar={() => setHoja(null)}/>}
  </section>;
}
