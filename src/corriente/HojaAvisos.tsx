import { useEffect, useState } from 'react';
import { supabase } from '../data';
import { ajustesIniciales as inicialesRecibos, horaAviso, type Ajustes as AjustesRecibos } from '../recibos/elementos';
import { opcionesDeZona, zonaDelDispositivo } from '../recibos/zonas';
import { ajustesIniciales as inicialesMetas, DIAS, horaRevision, type Ajustes as AjustesMetas } from '../metas/metas';
import { Hoja } from './piezas';

const hora = (v: string) => { const [h, m] = v.split(':').map(Number); return Number.isInteger(h) && Number.isInteger(m) ? [h, m] as const : null; };

/**
 * Avisos de Recibos y de Metas: los mismos ajustes que guardaban Kairós y Faro (kairos_ajustes y faro_ajustes),
 * que leen las funciones de avisos del servidor. Una sola zona y un solo «por correo» para los dos.
 */
export function HojaAvisos({ uid, correo, recibos, metas, onCerrar, onGuardado }: {
  uid: string; correo: string | null; recibos: boolean; metas: boolean; onCerrar: () => void; onGuardado: () => void;
}) {
  const [r, setR] = useState<AjustesRecibos | null>(null), [m, setM] = useState<AjustesMetas | null>(null);
  const [error, setError] = useState(''), [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let vivo = true;
    Promise.all([supabase!.from('kairos_ajustes').select('*').maybeSingle(), supabase!.from('faro_ajustes').select('*').maybeSingle()]).then(([a, b]) => {
      if (!vivo) return;
      if (a.error || b.error) { setError('No se pudieron leer tus avisos. Prueba de nuevo en un momento.'); return; }
      const zona = zonaDelDispositivo();
      setR({ ...inicialesRecibos(zona), ...(a.data as AjustesRecibos | null) });
      setM({ ...inicialesMetas((a.data as AjustesRecibos | null)?.zona_horaria ?? zona), ...(b.data as AjustesMetas | null) });
    });
    return () => { vivo = false; };
  }, []);
  async function guardar() {
    if (!r || !m) return;
    if (!Number.isInteger(r.antelacion_por_defecto) || r.antelacion_por_defecto < 0 || r.antelacion_por_defecto > 365) return setError('La antelación debe estar entre 0 y 365 días.');
    setOcupado(true); setError('');
    const ahora = new Date().toISOString();
    const [a, b] = await Promise.all([
      recibos ? supabase!.from('kairos_ajustes').upsert({ ...r, user_id: uid, actualizado: ahora }) : Promise.resolve({ error: null }),
      metas ? supabase!.from('faro_ajustes').upsert({ ...m, zona_horaria: r.zona_horaria, canal_correo: r.canal_correo, user_id: uid, actualizado: ahora }) : Promise.resolve({ error: null }),
    ]);
    setOcupado(false);
    if (a.error || b.error) return setError('No se pudieron guardar los avisos. Prueba de nuevo en un momento.');
    onGuardado(); onCerrar();
  }
  const zonas = r ? opcionesDeZona(r.zona_horaria) : [];
  return <Hoja titulo="Avisos" abierta onCerrar={onCerrar}
    pie={<><button type="button" className="boton" onClick={onCerrar}>Cancelar</button><button type="button" className="boton lleno" disabled={!r || ocupado} onClick={() => void guardar()}>{ocupado ? 'Guardando…' : 'Guardar'}</button></>}>
    <div className="hoja-cuerpo">
      {error && <p className="ayuda alerta" role="alert">{error}</p>}
      {!r || !m ? !error && <p className="ayuda" role="status">Cargando…</p> : <>
        {recibos && <div className="grupo-hoja"><p className="eti">Recibos</p>
          <div className="dos">
            <label className="campo"><span>Hora de los avisos</span><input type="time" step={60} value={horaAviso(r)} onChange={(e) => { const h = hora(e.target.value); if (h) setR({ ...r, hora_aviso: h[0], minuto_aviso: h[1] }); }}/></label>
            <label className="campo"><span>Días de antelación</span><input type="number" min={0} max={365} value={r.antelacion_por_defecto} onChange={(e) => setR({ ...r, antelacion_por_defecto: Number(e.target.value) })}/></label>
          </div>
          <p className="ayuda">Cada recibo puede tener su propia antelación.</p>
        </div>}
        {metas && <div className="grupo-hoja"><p className="eti">Revisión semanal de metas</p>
          <div className="dos">
            <label className="campo"><span>Día</span><select value={m.dia_revision} onChange={(e) => setM({ ...m, dia_revision: Number(e.target.value) })}>
              {DIAS.map((d, i) => <option key={d} value={i + 1}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}</select></label>
            <label className="campo"><span>Hora</span><input type="time" step={60} value={horaRevision(m)} onChange={(e) => { const h = hora(e.target.value); if (h) setM({ ...m, hora_revision: h[0], minuto_revision: h[1] }); }}/></label>
          </div>
        </div>}
        <label className="campo"><span>Zona horaria</span><select value={r.zona_horaria} onChange={(e) => setR({ ...r, zona_horaria: e.target.value })}>
          {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></label>
        <label className="casilla"><input type="checkbox" checked={r.canal_correo} onChange={(e) => setR({ ...r, canal_correo: e.target.checked })}/><span>Avisarme por correo{correo ? ` a ${correo}` : ''}</span></label>
        <p className="ayuda">{r.canal_push || m.canal_push ? 'Los avisos en el móvil siguen activos desde Kairós y Faro.' : 'Los avisos en el móvil se activan, por ahora, desde Kairós y Faro.'} Llegarán a Brújula con los avisos unificados.</p>
      </>}
    </div>
  </Hoja>;
}
