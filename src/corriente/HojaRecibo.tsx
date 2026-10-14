import { useState, type FormEvent } from 'react';
import { CATEGORIAS, NOMBRE_TIPO, TIPOS, type Elemento, type Frecuencia, type Tipo, type Unidad } from '../recibos/elementos';
import { esFecha, hoyLocal } from '../recibos/fechas';
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
export function HojaRecibo({ inicial, onGuardar, onBorrar, onCerrar }: {
  inicial: Elemento | null; onGuardar: (e: Elemento) => Promise<string | null>; onBorrar: (e: Elemento) => Promise<string | null>; onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? 'suscripcion');
  const [importe, setImporte] = useState(inicial?.importe != null ? String(inicial.importe).replace('.', ',') : '');
  const [estimado, setEstimado] = useState(inicial?.estimado ?? false);
  const [preset, setPreset] = useState(presetDe(inicial ? inicial.frecuencia : { unidad: 'mes', cada: 1 }));
  const [cada, setCada] = useState(String(inicial?.frecuencia?.cada ?? 1));
  const [unidad, setUnidad] = useState<Unidad>(inicial?.frecuencia?.unidad ?? 'mes');
  const [inicio, setInicio] = useState(inicial?.inicio ?? hoyLocal());
  const [permanencia, setPermanencia] = useState(inicial?.fin_permanencia ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoria ?? CATEGORIA_POR_TIPO.suscripcion);
  const [elegida, setElegida] = useState(Boolean(inicial));
  const [notas, setNotas] = useState(inicial?.notas ?? '');
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
      notas: notas.trim().slice(0, 500), clave_brujula: inicial?.clave_brujula ?? null, activo: inicial?.activo ?? true, actualizado: new Date().toISOString(),
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
