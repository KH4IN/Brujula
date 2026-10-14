import { useState, type FormEvent, type ReactNode } from 'react';
import type { Goal } from '../data';
import { decimal } from '../features/form';
import { esFecha, lunesDe, type Fecha } from '../metas/fechas';
import type { Meta, Paso, Revision } from '../metas/metas';
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
