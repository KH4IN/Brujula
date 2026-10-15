import { useState, type FormEvent } from 'react';
import { CATEGORIAS, costeAnual, describirFrecuencia, NOMBRE_TIPO, ocurrencias, TIPOS, type Cobro, type Elemento, type Frecuencia, type Tipo, type Unidad } from '../recibos/elementos';
import { diferenciaDias, esFecha, hoyLocal, sumarDias, type Fecha } from '../recibos/fechas';
import { leerImporte } from '../recibos/importe';
import { Hoja } from './piezas';

// Las mismas opciones y validación que el formulario de Kairós (src/componentes/FormularioElemento.tsx).
const PRESETS: { id: string; texto: string; frecuencia: Frecuencia | null }[] = [
  { id: 'mes1', texto: 'Mensual', frecuencia: { unidad: 'mes', cada: 1 } },
  { id: 'mes2', texto: 'Cada dos meses', frecuencia: { unidad: 'mes', cada: 2 } },
  { id: 'mes3', texto: 'Trimestral', frecuencia: { unidad: 'mes', cada: 3 } },
  { id: 'mes6', texto: 'Semestral', frecuencia: { unidad: 'mes', cada: 6 } },
  { id: 'año1', texto: 'Anual', frecuencia: { unidad: 'año', cada: 1 } },
  { id: 'semana1', texto: 'Semanal', frecuencia: { unidad: 'semana', cada: 1 } },
  { id: 'unica', texto: 'Una sola vez', frecuencia: null },
  { id: 'otra', texto: 'Personalizada…', frecuencia: { unidad: 'mes', cada: 1 } },
];
const presetDe = (f: Frecuencia | null) => PRESETS.find((p) => p.id !== 'otra' && JSON.stringify(p.frecuencia) === JSON.stringify(f))?.id ?? 'otra';
const CATEGORIA_POR_TIPO: Record<Tipo, string> = { suscripcion: 'Suscripciones', recibo: 'Vivienda', seguro: 'Otros', impuesto: 'Otros', vencimiento: 'Otros' };

/** Alta, cambio y baja de un recibo de Kairós desde Corriente. Guardar y borrar los hace quien la abre. */
export function HojaRecibo({ inicial, base, onGuardar, onBorrar, onCerrar }: {
  inicial: Elemento | null; base?: Partial<Elemento>; onGuardar: (e: Elemento) => Promise<string | null>; onBorrar: (e: Elemento) => Promise<string | null>; onCerrar: () => void;
}) {
  const d = inicial ?? base; // base: un recibo sugerido a partir de los movimientos
  const [nombre, setNombre] = useState(d?.nombre ?? '');
  const [tipo, setTipo] = useState<Tipo>(d?.tipo ?? 'suscripcion');
  const [importe, setImporte] = useState(d?.importe != null ? String(d.importe).replace('.', ',') : '');
  const [estimado, setEstimado] = useState(d?.estimado ?? false);
  const [preset, setPreset] = useState(presetDe(d ? d.frecuencia ?? null : { unidad: 'mes', cada: 1 }));
  const [cada, setCada] = useState(String(d?.frecuencia?.cada ?? 1));
  const [unidad, setUnidad] = useState<Unidad>(d?.frecuencia?.unidad ?? 'mes');
  const [inicio, setInicio] = useState(d?.inicio ?? hoyLocal());
  const [permanencia, setPermanencia] = useState(d?.fin_permanencia ?? '');
  const [categoria, setCategoria] = useState(d?.categoria ?? CATEGORIA_POR_TIPO.suscripcion);
  const [elegida, setElegida] = useState(Boolean(d?.categoria));
  const [notas, setNotas] = useState(d?.notas ?? '');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const terminar = async (accion: Promise<string | null>) => { setOcupado(true); const e = await accion; setOcupado(false); if (e) setError(e); else onCerrar(); };

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return setError('Pon un nombre.');
    const texto = importe.trim(), cantidad = texto === '' ? null : leerImporte(texto);
    if (texto !== '' && cantidad == null) return setError('Pon un importe positivo con un máximo de dos decimales (por ejemplo, 10,99).');
    if (tipo !== 'vencimiento' && cantidad == null) return setError('Indica el importe, o elige el tipo «Vencimiento» si no hay dinero.');
    if (!esFecha(inicio)) return setError('La fecha no es válida.');
    if (permanencia && !esFecha(permanencia)) return setError('La fecha de fin de permanencia no es válida.');
    let frecuencia = PRESETS.find((p) => p.id === preset)!.frecuencia;
    if (preset === 'otra') {
      const n = Number(cada);
      if (!Number.isInteger(n) || n < 1 || n > 120) return setError('La repetición debe ser un número entre 1 y 120.');
      frecuencia = { unidad, cada: n };
    }
    void terminar(onGuardar({
      id: inicial?.id ?? crypto.randomUUID(), nombre: limpio.slice(0, 80), tipo, importe: cantidad, estimado: cantidad != null && estimado,
      frecuencia, inicio, antelacion_dias: inicial?.antelacion_dias ?? null, fin_permanencia: permanencia || null, categoria,
      notas: notas.trim().slice(0, 500), clave_brujula: inicial?.clave_brujula ?? base?.clave_brujula ?? null, activo: inicial?.activo ?? true, actualizado: new Date().toISOString(),
    }));
  }

  return <Hoja titulo={inicial ? `Editar ${inicial.nombre}` : 'Nuevo recibo'} abierta onCerrar={onCerrar}
    pie={<>{inicial && <button type="button" className="boton" disabled={ocupado} onClick={() => { if (confirm(`¿Borrar «${inicial.nombre}» y su historial de cobros? También desaparece de Kairós.`)) void terminar(onBorrar(inicial)); }}>Borrar</button>}
      <button type="button" className="boton" onClick={onCerrar}>Cancelar</button>
      <button type="submit" form="c-recibo" className="boton lleno" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar'}</button></>}>
    <form id="c-recibo" className="hoja-cuerpo" onSubmit={enviar}>
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      <label className="campo"><span>Nombre</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Spotify, Luz, ITV…" autoFocus maxLength={80}/></label>
      <div className="dos">
        <label className="campo"><span>Tipo</span><select value={tipo} onChange={(e) => { const t = e.target.value as Tipo; setTipo(t); if (!elegida) setCategoria(CATEGORIA_POR_TIPO[t]); }}>
          {TIPOS.map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}</select></label>
        <label className="campo"><span>Importe (€)</span><input inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} maxLength={16} placeholder={tipo === 'vencimiento' ? 'Opcional' : '10,99'}/></label>
      </div>
      {importe.trim() !== '' && <label className="casilla"><input type="checkbox" checked={estimado} onChange={(e) => setEstimado(e.target.checked)}/><span>Es aproximado (cambia cada vez, como la luz)</span></label>}
      <div className="dos">
        <label className="campo"><span>Se repite</span><select value={preset} onChange={(e) => setPreset(e.target.value)}>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select></label>
        <label className="campo"><span>{preset === 'unica' ? 'Fecha' : 'Fecha de un cobro'}</span><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required/></label>
      </div>
      {preset === 'otra' && <div className="dos">
        <label className="campo"><span>Cada</span><input type="number" min={1} max={120} value={cada} onChange={(e) => setCada(e.target.value)}/></label>
        <label className="campo"><span>Unidad</span><select value={unidad} onChange={(e) => setUnidad(e.target.value as Unidad)}>
          <option value="dia">días</option><option value="semana">semanas</option><option value="mes">meses</option><option value="año">años</option></select></label>
      </div>}
      <div className="dos">
        <label className="campo"><span>Categoría</span><select value={categoria} onChange={(e) => { setCategoria(e.target.value); setElegida(true); }}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="campo"><span>Fin de permanencia</span><input type="date" value={permanencia} onChange={(e) => setPermanencia(e.target.value)}/></label>
      </div>
      <label className="campo"><span>Notas</span><textarea value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} rows={2} placeholder="Se cancela desde la web, no desde la app…"/></label>
      <p className="ayuda">{preset === 'unica' ? '' : 'La fecha puede ser la del próximo cobro o cualquiera anterior; las demás se calculan. '}Se guarda también en Kairós.</p>
    </form>
  </Hoja>;
}

const dos = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
const media = (f: Fecha) => new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${f}T12:00:00`)).replace(/\./g, '');

/** La ficha de un recibo, como en Kairós: próximo cobro, «Ya pagado» o «No se cobró», historial con deshacer, pausar y borrar. */
export function HojaFichaRecibo({ e, cobros, hoy, onCerrar, acciones }: {
  e: Elemento; cobros: Cobro[]; hoy: Fecha; onCerrar: () => void;
  acciones: { editar: () => void; marcar: (fecha: Fecha, pagado: boolean) => void; activar: () => void; borrar: () => void; deshacer: (c: Cobro) => void };
}) {
  const suyos = cobros.filter((c) => c.elemento_id === e.id);
  const cerradas = new Set(suyos.map((c) => c.fecha_prevista));
  const siguiente = e.activo ? ocurrencias(e, hoy, sumarDias(hoy, 3660)).find((f) => !cerradas.has(f)) : undefined;
  const faltan = siguiente ? diferenciaDias(hoy, siguiente) : null;
  const historial = [...suyos].sort((a, b) => b.fecha_prevista.localeCompare(a.fecha_prevista));
  const hecho = e.importe == null ? 'Hecho' : 'Ya pagado';
  return <Hoja titulo={e.nombre} abierta onCerrar={onCerrar}
    pie={<><button type="button" className="boton" onClick={() => { if (confirm(`¿Borrar «${e.nombre}» y su historial de cobros? También desaparece de Kairós.`)) acciones.borrar(); }}>Borrar</button>
      <button type="button" className="boton" onClick={acciones.activar}>{e.activo ? 'Pausar' : 'Reactivar'}</button>
      <button type="button" className="boton" onClick={acciones.editar}>Editar</button></>}>
    <div className="hoja-cuerpo">
      <p className="ayuda">{NOMBRE_TIPO[e.tipo]} · {describirFrecuencia(e.frecuencia)} · {e.categoria}
        {e.importe != null && <> · {e.estimado ? '~' : ''}{dos.format(e.importe)} €{e.frecuencia && <> ({dos.format(costeAnual(e) / 12)} € al mes, {dos.format(costeAnual(e))} € al año)</>}</>}</p>
      {!e.activo && <p className="ayuda alerta">En pausa: no aparece en los próximos ni envía avisos.</p>}
      {siguiente && faltan != null && <div className="grupo-hoja">
        <p className="eti">{faltan < 0 ? `Pendiente desde hace ${-faltan} ${faltan === -1 ? 'día' : 'días'}` : faltan === 0 ? 'Es hoy' : faltan === 1 ? 'Falta 1 día' : `Faltan ${faltan} días`}</p>
        <p>{e.importe == null ? 'Vence' : 'Cobro'} el {media(siguiente)}.</p>
        <div className="acciones"><button type="button" className="boton lleno" onClick={() => acciones.marcar(siguiente, true)}>{hecho}</button>
          {e.importe != null && <button type="button" className="boton" onClick={() => acciones.marcar(siguiente, false)}>No se cobró</button>}</div>
      </div>}
      {(e.fin_permanencia || e.notas) && <p className="ayuda">{e.fin_permanencia ? `Permanencia hasta el ${media(e.fin_permanencia)}. ` : ''}{e.notas}</p>}
      <div className="grupo-hoja"><p className="eti">Historial</p>
        {historial.length ? <ul className="pasos">{historial.slice(0, 24).map((c) => <li key={c.id} className="paso-fila">
          <span>{media(c.fecha_prevista)} · {c.estado === 'omitido' ? 'No se cobró' : c.transaction_id ? 'Visto en tus movimientos' : 'Marcado a mano'}{c.importe_real != null ? ` · ${dos.format(Number(c.importe_real))} €` : ''}</span>
          <button type="button" className="ir" onClick={() => acciones.deshacer(c)}>Deshacer</button></li>)}</ul>
          : <p className="ayuda">Todavía no hay cobros registrados.</p>}
      </div>
    </div>
  </Hoja>;
}
