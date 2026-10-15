import { useState, type FormEvent, type ReactNode } from 'react';
import type { Goal } from '../data';
import { decimal } from '../features/form';
import { esFecha, finDeAno, finDeTrimestre, lunesDe, type Fecha } from '../metas/fechas';
import { NOMBRE_PROGRESO, progreso, TIPOS_PROGRESO, validarMeta, type EstadoMeta, type Meta, type Paso, type Registro, type Revision, type TipoProgreso } from '../metas/metas';
import { leerImporte } from '../recibos/importe';
import { Hoja } from './piezas';

type Guardar<T> = (valor: T) => Promise<string | null> | string | null;
function useEnvio(onCerrar: () => void) {
  const [error, setError] = useState(''), [ocupado, setOcupado] = useState(false);
  const enviar = async (accion: () => Promise<string | null> | string | null) => { setOcupado(true); const e = await accion(); setOcupado(false); if (e) setError(e); else onCerrar(); };
  return { error, setError, ocupado, enviar };
}
const Pie = ({ id, ocupado, onCerrar, extra }: { id: string; ocupado: boolean; onCerrar: () => void; extra?: ReactNode }) => <>{extra}
  <button type="button" className="boton" onClick={onCerrar}>Cancelar</button>
  <button type="submit" form={id} className="boton lleno" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar'}</button></>;

/** Objetivo de ahorro de Brújula: misma validación que el panel de objetivos del tema clásico. */
export function HojaObjetivo({ inicial, onGuardar, onBorrar, onCerrar }: { inicial: Goal | null; onGuardar: Guardar<Goal>; onBorrar: (g: Goal) => void; onCerrar: () => void }) {
  const [f, setF] = useState({ name: inicial?.name ?? '', target: inicial ? String(inicial.target_amount) : '', saved: inicial ? String(inicial.saved_amount) : '0', due: inicial?.due_on ?? '' });
  const { error, setError, ocupado, enviar } = useEnvio(onCerrar);
  function guardar(e: FormEvent) {
    e.preventDefault(); const target = decimal(f.target), saved = decimal(f.saved);
    if (!f.name.trim()) return setError('Ponle un nombre.');
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) return setError('Revisa las cantidades: el objetivo tiene que ser mayor que cero.');
    void enviar(() => onGuardar({ id: inicial?.id ?? crypto.randomUUID(), name: f.name.trim().slice(0, 80), target_amount: Math.round(target * 100) / 100, saved_amount: Math.round(saved * 100) / 100, due_on: f.due || null }));
  }
  return <Hoja titulo={inicial ? `Editar ${inicial.name}` : 'Nueva meta de ahorro'} abierta onCerrar={onCerrar}
    pie={<Pie id="c-objetivo" ocupado={ocupado} onCerrar={onCerrar} extra={inicial && <button type="button" className="boton" onClick={() => { if (confirm(`¿Eliminar la meta «${inicial.name}»?`)) { onBorrar(inicial); onCerrar(); } }}>Eliminar</button>}/>}>
    <form id="c-objetivo" className="hoja-cuerpo" onSubmit={guardar}>
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      <label className="campo"><span>Nombre</span><input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Un viaje, un colchón…" autoFocus/></label>
      <div className="dos">
        <label className="campo"><span>Objetivo (€)</span><input type="number" inputMode="decimal" step="0.01" min="0.01" required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })}/></label>
        <label className="campo"><span>Ya ahorrado (€)</span><input type="number" inputMode="decimal" step="0.01" min="0" required value={f.saved} onChange={(e) => setF({ ...f, saved: e.target.value })}/></label>
      </div>
      <label className="campo"><span>Para cuándo (opcional)</span><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })}/></label>
      <p className="ayuda">Es una parte de lo que ya tienes: no se suma otra vez a tu patrimonio.</p>
    </form>
  </Hoja>;
}

/** Un avance de una meta de Faro (número o dinero), con la validación de la ficha de Faro. */
export function HojaAvance({ meta, hoy, onGuardar, onCerrar }: { meta: Meta; hoy: Fecha; onGuardar: Guardar<{ valor: number; fecha: Fecha; nota: string }>; onCerrar: () => void }) {
  const [cantidad, setCantidad] = useState(''), [fecha, setFecha] = useState(hoy), [nota, setNota] = useState('');
  const { error, setError, ocupado, enviar } = useEnvio(onCerrar);
  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!esFecha(fecha) || fecha > hoy) return setError('Elige una fecha de hoy o anterior.');
    const valor = leerImporte(cantidad);
    if (valor == null) return setError('Escribe una cantidad positiva, con dos decimales como mucho.');
    void enviar(() => onGuardar({ valor, fecha, nota: nota.trim().slice(0, 200) }));
  }
  return <Hoja titulo={meta.progreso === 'dinero' ? `Aportar a ${meta.titulo}` : `Avance en ${meta.titulo}`} abierta onCerrar={onCerrar} pie={<Pie id="c-avance" ocupado={ocupado} onCerrar={onCerrar}/>}>
    <form id="c-avance" className="hoja-cuerpo" onSubmit={guardar}>
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      <label className="importe"><span className="sr">Cantidad</span><input inputMode="decimal" maxLength={16} value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="0" aria-label={meta.progreso === 'dinero' ? 'Euros' : `Cantidad${meta.unidad ? ` en ${meta.unidad}` : ''}`} autoFocus/><span>{meta.progreso === 'dinero' ? '€' : meta.unidad}</span></label>
      <div className="dos">
        <label className="campo"><span>Fecha</span><input type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)}/></label>
        <label className="campo"><span>Nota (opcional)</span><input maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)}/></label>
      </div>
      <p className="ayuda">Se guarda también en Faro.</p>
    </form>
  </Hoja>;
}

export type Eleccion = { meta_id: string; paso_id: string | null; texto: string };
const OTRO = '__otro__';

/** Revisión semanal de Faro: qué fue bien, qué frenó y el próximo paso de cada meta. */
export function HojaRevision({ metas, pasos, revisiones, hoy, onGuardar, onCerrar }: {
  metas: Meta[]; pasos: Paso[]; revisiones: Revision[]; hoy: Fecha;
  onGuardar: Guardar<{ avances: string; frenos: string; elecciones: Eleccion[] }>; onCerrar: () => void;
}) {
  const semana = lunesDe(hoy), previa = revisiones.find((r) => r.semana === semana);
  const conPasos = metas.filter((m) => m.estado === 'activa' && m.progreso !== 'habito');
  const [avances, setAvances] = useState(previa?.avances ?? ''), [frenos, setFrenos] = useState(previa?.frenos ?? '');
  const [eleccion, setEleccion] = useState<Record<string, string>>(() => Object.fromEntries(conPasos.map((m) => {
    const pendientes = pasos.filter((p) => p.meta_id === m.id && !p.hecho).sort((a, b) => a.orden - b.orden);
    return [m.id, previa?.focos.find((id) => pendientes.some((p) => p.id === id)) ?? pendientes[0]?.id ?? OTRO];
  })));
  const [nuevos, setNuevos] = useState<Record<string, string>>({});
  const { error, ocupado, enviar } = useEnvio(onCerrar);
  function guardar(e: FormEvent) {
    e.preventDefault();
    const elecciones = conPasos.flatMap((m): Eleccion[] => {
      const v = eleccion[m.id];
      if (v && v !== OTRO) return [{ meta_id: m.id, paso_id: v, texto: '' }];
      const texto = (nuevos[m.id] ?? '').trim().slice(0, 200);
      return texto ? [{ meta_id: m.id, paso_id: null, texto }] : [];
    });
    void enviar(() => onGuardar({ avances: avances.trim().slice(0, 2000), frenos: frenos.trim().slice(0, 2000), elecciones }));
  }
  return <Hoja titulo="Revisión semanal" abierta onCerrar={onCerrar} pie={<Pie id="c-revision" ocupado={ocupado} onCerrar={onCerrar}/>}>
    <form id="c-revision" className="hoja-cuerpo" onSubmit={guardar}>
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      <label className="campo"><span>¿Qué ha ido bien esta semana?</span><textarea maxLength={2000} rows={2} value={avances} onChange={(e) => setAvances(e.target.value)}/></label>
      <label className="campo"><span>¿Qué te ha frenado?</span><textarea maxLength={2000} rows={2} value={frenos} onChange={(e) => setFrenos(e.target.value)}/></label>
      {conPasos.map((m) => {
        const pendientes = pasos.filter((p) => p.meta_id === m.id && !p.hecho).sort((a, b) => a.orden - b.orden);
        return <div className="campo" key={m.id}><span>Próximo paso · {m.titulo}</span>
          {pendientes.length > 0 && <select aria-label={`Próximo paso de ${m.titulo}`} value={eleccion[m.id]} onChange={(e) => setEleccion({ ...eleccion, [m.id]: e.target.value })}>
            {pendientes.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}<option value={OTRO}>Otro…</option></select>}
          {eleccion[m.id] === OTRO && <input aria-label={`Nuevo paso de ${m.titulo}`} maxLength={200} placeholder="Escribe el siguiente paso" value={nuevos[m.id] ?? ''} onChange={(e) => setNuevos({ ...nuevos, [m.id]: e.target.value })}/>}
        </div>;
      })}
      <p className="ayuda">{previa ? 'Ya hiciste la revisión de esta semana: si guardas, se actualiza.' : 'Cinco minutos. Se guarda también en Faro.'}</p>
    </form>
  </Hoja>;
}

const corta = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${f}T12:00:00`)).replace('.', '');
const texto = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

/** Alta y cambio de una meta de Faro, con las mismas opciones y validación que el formulario de Faro. */
export function HojaMeta({ inicial, goals, hoy, onGuardar, onCerrar }: {
  inicial: Meta | null; goals: Goal[]; hoy: Fecha; onGuardar: Guardar<{ meta: Meta; pasos: string[] }>; onCerrar: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? ''), [motivo, setMotivo] = useState(inicial?.motivo ?? '');
  const [tipo, setTipo] = useState<TipoProgreso>(inicial?.progreso ?? 'pasos');
  const [objetivo, setObjetivo] = useState(texto(inicial?.objetivo)), [unidad, setUnidad] = useState(inicial?.unidad ?? '');
  const [veces, setVeces] = useState(String(inicial?.progreso === 'habito' ? inicial.objetivo ?? 3 : 3));
  const [enlace, setEnlace] = useState(inicial?.objetivo_brujula ?? '');
  const [inicio, setInicio] = useState(inicial?.inicio ?? hoy), [limite, setLimite] = useState(inicial?.fecha_limite ?? '');
  const [pasos, setPasos] = useState('');
  const { error, setError, ocupado, enviar } = useEnvio(onCerrar);
  const enlazado = goals.find((g) => g.id === enlace);
  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!esFecha(inicio)) return setError('La fecha de inicio no es válida.');
    if (limite && !esFecha(limite)) return setError('El plazo no es válido.');
    let cantidad: number | null = null;
    if (tipo === 'habito') cantidad = Number(veces);
    else if (tipo === 'numero' || (tipo === 'dinero' && !enlace)) {
      cantidad = leerImporte(objetivo);
      if (cantidad == null) return setError('Escribe una cantidad positiva, con dos decimales como mucho (por ejemplo, 100 o 1.500,50).');
    }
    const meta: Meta = { id: inicial?.id ?? crypto.randomUUID(), titulo: titulo.trim(), motivo: motivo.trim(), progreso: tipo, objetivo: cantidad,
      unidad: tipo === 'numero' ? unidad.trim().slice(0, 20) : '', objetivo_brujula: tipo === 'dinero' && enlace ? enlace : null,
      inicio, fecha_limite: limite || null, estado: inicial?.estado ?? 'activa', actualizado: new Date().toISOString() };
    const fallo = validarMeta(meta);
    if (fallo) return setError(fallo);
    void enviar(() => onGuardar({ meta, pasos: pasos.split('\n').map((p) => p.trim()).filter(Boolean).map((p) => p.slice(0, 200)) }));
  }
  return <Hoja titulo={inicial ? 'Editar meta' : 'Nueva meta'} abierta onCerrar={onCerrar} pie={<Pie id="c-meta" ocupado={ocupado} onCerrar={onCerrar}/>}>
    <form id="c-meta" className="hoja-cuerpo" onSubmit={guardar} noValidate>
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      <label className="campo"><span>¿Hacia dónde quieres ir?</span><input value={titulo} maxLength={80} required autoFocus={!inicial} placeholder="Correr una media maratón" onChange={(e) => setTitulo(e.target.value)}/></label>
      <label className="campo"><span>¿Por qué te importa?</span><textarea value={motivo} maxLength={500} rows={2} placeholder="Lo leerás cuando cueste seguir." onChange={(e) => setMotivo(e.target.value)}/></label>
      <div className="campo"><span>¿Cómo sabrás que avanzas?</span>
        <div className="chips" role="group" aria-label="Tipo de progreso">{TIPOS_PROGRESO.map((t) =>
          <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}>{NOMBRE_PROGRESO[t]}</button>)}</div></div>
      {tipo === 'numero' && <div className="dos">
        <label className="campo"><span>Quiero llegar a</span><input inputMode="decimal" value={objetivo} placeholder="100" onChange={(e) => setObjetivo(e.target.value)}/></label>
        <label className="campo"><span>Unidad</span><input value={unidad} maxLength={20} placeholder="km, libros, clases…" onChange={(e) => setUnidad(e.target.value)}/></label>
      </div>}
      {tipo === 'dinero' && <>
        {goals.length > 0 && <label className="campo"><span>Meta de ahorro de Brújula</span>
          <select value={enlace} onChange={(e) => setEnlace(e.target.value)}>
            <option value="">No enlazar: apunto las aportaciones aquí</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.name} ({Number(g.target_amount).toLocaleString('es-ES')} €)</option>)}
          </select></label>}
        {enlazado && <p className="ayuda">El progreso es el de esa meta de ahorro: {Number(enlazado.saved_amount).toLocaleString('es-ES')} de {Number(enlazado.target_amount).toLocaleString('es-ES')} €.</p>}
        {!enlace && <label className="campo"><span>¿Cuánto necesitas? (€)</span><input inputMode="decimal" value={objetivo} placeholder="1.500" onChange={(e) => setObjetivo(e.target.value)}/></label>}
      </>}
      {tipo === 'habito' && <label className="campo"><span>Veces por semana</span><select value={veces} onChange={(e) => setVeces(e.target.value)}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n === 7 ? 'Todos los días' : `${n} ${n === 1 ? 'vez' : 'veces'}`}</option>)}</select></label>}
      <div className="dos">
        <label className="campo"><span>Empieza</span><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}/></label>
        <label className="campo"><span>Plazo</span><input type="date" value={limite} min={inicio} onChange={(e) => setLimite(e.target.value)}/></label>
      </div>
      <div className="chips" role="group" aria-label="Plazo rápido">
        <button type="button" aria-pressed={limite === finDeTrimestre(hoy)} onClick={() => setLimite(finDeTrimestre(hoy))}>Este trimestre</button>
        <button type="button" aria-pressed={limite === finDeAno(hoy)} onClick={() => setLimite(finDeAno(hoy))}>Este año</button>
        <button type="button" aria-pressed={!limite} onClick={() => setLimite('')}>Sin plazo</button>
      </div>
      {!inicial && <label className="campo"><span>Primeros pasos (uno por línea, opcional)</span><textarea value={pasos} rows={3} placeholder={'Buscar un plan de entrenamiento\nApuntarme a una carrera'} onChange={(e) => setPasos(e.target.value)}/></label>}
    </form>
  </Hoja>;
}

const ESTADO_TEXTO: Record<EstadoMeta, string> = { activa: 'Activa', pausada: 'En pausa', lograda: 'Lograda', abandonada: 'Abandonada' };

/** Todo lo de una meta de Faro: pasos, anotaciones, estado, editar y borrar (la ficha de Faro, dentro de Brújula). */
export function HojaFichaMeta({ meta, pasos, registros, goals, hoy, acciones, onCerrar }: {
  meta: Meta; pasos: Paso[]; registros: Registro[]; goals: Goal[]; hoy: Fecha; onCerrar: () => void;
  acciones: { editar: () => void; estado: (e: EstadoMeta) => void; borrar: () => void; paso: (p: Paso) => void; nuevoPaso: (texto: string) => void;
    borrarPaso: (p: Paso) => void; borrarRegistro: (r: Registro) => void; anotar: () => void };
}) {
  const propios = pasos.filter((p) => p.meta_id === meta.id).sort((a, b) => a.orden - b.orden);
  const suyos = registros.filter((r) => r.meta_id === meta.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const brujula = goals.map((g) => ({ ...g, target_amount: Number(g.target_amount), saved_amount: Number(g.saved_amount) }));
  const p = progreso(meta, pasos, registros, brujula, hoy);
  const [nuevo, setNuevo] = useState('');
  const anota = meta.progreso === 'numero' || meta.progreso === 'habito' || (meta.progreso === 'dinero' && !p.desdeBrujula);
  const valor = (r: Registro) => meta.progreso === 'dinero' ? `${r.valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : meta.progreso === 'habito' ? 'Hecho' : `${String(r.valor).replace('.', ',')} ${meta.unidad}`.trim();
  return <Hoja titulo={meta.titulo} abierta onCerrar={onCerrar}
    pie={<><button type="button" className="boton" onClick={() => { if (confirm(`¿Borrar «${meta.titulo}» con sus pasos y anotaciones? También desaparece de Faro.`)) acciones.borrar(); }}>Borrar</button>
      <button type="button" className="boton" onClick={acciones.editar}>Editar</button>
      <button type="button" className="boton lleno" onClick={onCerrar}>Hecho</button></>}>
    <div className="hoja-cuerpo">
      <p className="ayuda">{ESTADO_TEXTO[meta.estado]} · {p.texto}{meta.fecha_limite ? ` · plazo ${corta(meta.fecha_limite)}` : ''}</p>
      {meta.motivo && <p>«{meta.motivo}»</p>}
      <div className="chips" role="group" aria-label="Estado de la meta">
        {meta.estado !== 'activa' && <button type="button" onClick={() => acciones.estado('activa')}>Reanudar</button>}
        {meta.estado === 'activa' && <button type="button" onClick={() => acciones.estado('pausada')}>Pausar</button>}
        {meta.estado !== 'lograda' && <button type="button" onClick={() => acciones.estado('lograda')}>Marcar como lograda</button>}
        {meta.estado !== 'abandonada' && <button type="button" onClick={() => acciones.estado('abandonada')}>Abandonar</button>}
      </div>
      <div className="grupo-hoja"><p className="eti">El camino</p>
        {propios.length > 0 && <ul className="pasos">{propios.map((x) => <li key={x.id} className="paso-fila">
          <label><input type="checkbox" checked={x.hecho} onChange={() => acciones.paso(x)}/><span>{x.texto}</span></label>
          <button type="button" className="ir" onClick={() => acciones.borrarPaso(x)} aria-label={`Borrar el paso «${x.texto}»`}>Quitar</button></li>)}</ul>}
        <form className="dos" onSubmit={(e) => { e.preventDefault(); const t = nuevo.trim().slice(0, 200); if (t) { acciones.nuevoPaso(t); setNuevo(''); } }}>
          <label className="campo"><span className="sr">Nuevo paso</span><input maxLength={200} placeholder="Añadir un paso" value={nuevo} onChange={(e) => setNuevo(e.target.value)}/></label>
          <button type="submit" className="boton">Añadir paso</button>
        </form>
      </div>
      {anota && <div className="grupo-hoja"><p className="eti">{meta.progreso === 'habito' ? 'Días hechos' : meta.progreso === 'dinero' ? 'Aportaciones' : 'Avances'}</p>
        {meta.progreso !== 'habito' && <button type="button" className="boton" onClick={acciones.anotar}>{meta.progreso === 'dinero' ? 'Aportar' : 'Anotar avance'}</button>}
        {suyos.length ? <ul className="pasos">{suyos.slice(0, 30).map((r) => <li key={r.id} className="paso-fila">
          <span>{valor(r)} · {corta(r.fecha)}{r.nota ? ` · ${r.nota}` : ''}</span>
          <button type="button" className="ir" onClick={() => acciones.borrarRegistro(r)} aria-label={`Borrar la anotación del ${corta(r.fecha)}`}>Quitar</button></li>)}</ul>
          : <p className="ayuda">Aún no hay anotaciones.</p>}
      </div>}
    </div>
  </Hoja>;
}
