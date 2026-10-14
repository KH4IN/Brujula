import { useEffect, useRef, useState, type ReactNode } from 'react';
import { accountName, supabase } from '../data';
import type { VistaNueva } from '../nuevo/Nuevo';
import { citas, finDeVentana, proximosPendientes, resumenAnual, totalPrevisto, type Cita } from '../recibos/agenda';
import { conciliar, type Conciliacion } from '../recibos/brujula';
import { describirFrecuencia, NOMBRE_TIPO, ocurrencias, type Cobro, type Elemento } from '../recibos/elementos';
import { hoyLocal, sumarDias, type Fecha } from '../recibos/fechas';
import { cifra } from './datos';
import { canvasTexto, clamp, escena, lineal, PERLA, rgba, rotulo } from './escena';
import { HojaRecibo } from './HojaRecibo';
import { Icono } from './piezas';
import { euros } from './rio';

const dos = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
const SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (f: Fecha) => new Date(`${f}T12:00:00`);
const corta = (f: Fecha) => { const d = fecha(f); return `${SEM[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`; };
const clave = (c: Cita) => `${c.elemento.id}:${c.fecha}`;

/** Los próximos 30 días como un río que llega a hoy; cada recibo es una piedra (maqueta de Corriente). */
function montarRio30(lienzo: HTMLElement, hoy: Fecha, lista: Cita[]) {
  return escena(lienzo, (W, H, movil, st) => {
    const pad = movil ? 14 : 22, x0 = pad + (movil ? 18 : 30), dx = (W - pad - x0) / 29;
    const ym = H * 0.5, wb = movil ? 10 : 14;
    const piedras = lista.map((c) => {
      const v = c.elemento.importe ?? 0, i = Math.round((fecha(c.fecha).getTime() - fecha(hoy).getTime()) / 86_400_000);
      return { c, id: clave(c), v, x: x0 + i * dx, R: 2.5 + Math.sqrt(v) * (movil ? 0.62 : 0.9), semana: i <= 6, yEt: undefined as number | undefined };
    });
    const empuje = (x: number, u: number) => {
      let s = 0;
      for (const p of piedras) {
        const d = x - p.x; if (d > p.R * 4 || d < -p.R * 4) continue;
        s += (u >= 0 ? 1 : -1) * (p.R + 2.5) * Math.exp(-(d * d) / (2 * p.R * p.R * 0.9)) * (0.55 + Math.abs(u) * 0.9);
      }
      return s;
    };
    // Etiquetas arriba y abajo, en niveles para no pisarse; en móvil, solo las de 60 € o más.
    const lado: { x: number; w: number; nivel: number }[][] = [[], []];
    const visibles = piedras.filter((p) => !movil || p.v >= 60);
    st.capa.querySelectorAll<HTMLElement>('[data-g]').forEach((el) => { el.hidden = !visibles.some((p) => p.id === el.dataset.g); });
    visibles.forEach((p, k) => {
      const b = rotulo(st, p.id, [[String(fecha(p.c.fecha).getDate()), 'b'], [p.c.elemento.nombre], p.c.elemento.importe == null ? [''] : [`${p.v % 1 ? dos.format(p.v) : cifra(p.v)} €`, 'imp']]);
      b.hidden = false;
      b.setAttribute('aria-label', `${p.c.elemento.nombre}, ${corta(p.c.fecha)}${p.c.elemento.importe == null ? '' : `: ${dos.format(p.v)} €`}`);
      const w = b.offsetWidth || 120, s = k % 2;
      let nivel = 0;
      while (lado[s].some((o) => o.nivel === nivel && Math.abs(o.x - p.x) < (o.w + w) / 2 + 10)) nivel++;
      lado[s].push({ x: p.x, w, nivel });
      const yEt = s === 0 ? ym - p.R - 34 - nivel * 32 : ym + p.R + 12 + nivel * 32;
      b.style.transform = `translate(${Math.round(clamp(p.x - w / 2, 0, W - w) + 8)}px, ${Math.round(yEt)}px)`;
      p.yEt = s === 0 ? yEt + 30 : yEt + 2;
    });
    const mesHoy = fecha(hoy).getMonth();
    return {
      vel: clamp(W * 0.04, 26, 58), sinAtenuar: true,
      rios: [{ Y: lineal(W, () => ym), WD: lineal(W, () => wb), x0, x1: W, dir: -1, col: PERLA, grupo: 'r', fadeIn: 40, fadeOut: 26, empuje, dens: 1.6 }],
      fondo(ctx) {
        for (let i = 0; i < 30; i++) {
          const f = fecha(sumarDias(hoy, i)), finde = [0, 6].includes(f.getDay());
          ctx.fillStyle = finde ? 'rgba(236,234,228,.12)' : 'rgba(236,234,228,.26)';
          ctx.fillRect(x0 + i * dx - 0.5, H - 26, 1, f.getDay() === 1 ? 6 : 3);
          if (f.getDay() === 1 && i > 1) canvasTexto(ctx, f.getMonth() !== mesHoy && f.getDate() <= 7 ? `${f.getDate()} ${MESES[f.getMonth()]}` : String(f.getDate()), x0 + i * dx, H - 6, '#6F6C67', 'center');
        }
        canvasTexto(ctx, 'hoy', x0, H - 6, '#ECEAE4', 'center');
        ctx.fillStyle = 'rgba(236,234,228,.55)'; ctx.fillRect(x0 - 0.5, ym - 26, 1, H - 26 - (ym - 26));
        for (const p of piedras) {
          if (p.yEt === undefined) continue;
          ctx.fillStyle = 'rgba(236,234,228,.16)';
          ctx.fillRect(p.x - 0.5, Math.min(p.yEt, ym), 1, Math.abs(p.yEt - ym));
        }
      },
      encima(ctx) {
        for (const p of piedras) {
          const on = st.foco === p.id;
          ctx.beginPath(); ctx.arc(p.x, ym, p.R + (on ? 2 : 0), 0, 6.283);
          ctx.fillStyle = '#09090A'; ctx.fill();
          ctx.lineWidth = on ? 1.6 : 1.1;
          ctx.strokeStyle = rgba(PERLA, on ? 1 : p.semana ? 0.85 : 0.45);
          ctx.stroke();
          if (p.semana || on) { ctx.beginPath(); ctx.arc(p.x, ym, Math.max(1.5, p.R * 0.35), 0, 6.283); ctx.fillStyle = rgba(PERLA, 0.85); ctx.fill(); }
        }
      },
      sobre(mx, my) {
        let mejor: string | null = null, dist = 1e9;
        for (const p of piedras) { const d = Math.hypot(mx - p.x, my - ym); if (d < p.R + 12 && d < dist) { dist = d; mejor = p.id; } }
        return mejor ? { g: mejor } : null;
      },
      info(g) {
        const p = piedras.find((x) => x.id === g); if (!p) return null;
        const e = p.c.elemento;
        return { n: `${e.nombre} · ${corta(p.c.fecha)}`, v: e.importe == null ? 'Sin importe' : euros(p.v), d: `${describirFrecuencia(e.frecuencia)} · ${NOMBRE_TIPO[e.tipo]}${e.estimado ? ' · importe estimado' : ''}` };
      },
    };
  });
}

/** Recibos leídos de Kairós: lo que viene en 30 días, esta semana y lo que suman al año. Solo lectura. */
export function RecibosVista({ elementos, cobros, hoy, onEditar, cobro }: { elementos: Elemento[]; cobros: Cobro[]; hoy: Fecha; onEditar: (e: Elemento | null) => void; cobro?: ReactNode }) {
  const lienzo = useRef<HTMLDivElement>(null);
  const prox = proximosPendientes(citas(elementos, cobros, hoy, finDeVentana(hoy, 30)));
  const semana = prox.filter((c) => c.fecha <= sumarDias(hoy, 6));
  const resumen = resumenAnual(elementos);
  const suscripciones = resumen.categorias.find((g) => g.categoria === 'Suscripciones')?.total ?? 0;
  const siguiente = (e: Elemento) => ocurrencias(e, hoy, sumarDias(hoy, 800))[0];
  // El resumen anual solo cuenta lo recurrente con importe; el resto también tiene que poder editarse.
  const sueltos = elementos.filter((e) => !resumen.filas.some((f) => f.elemento.id === e.id));
  const huella = JSON.stringify(prox.map((c) => [clave(c), c.elemento.importe]));
  useEffect(() => { if (lienzo.current && prox.length) return montarRio30(lienzo.current, hoy, prox); }, [huella, hoy]);
  return <>
    <div className="vcab">
      <div><h1 id="h-recibos" tabIndex={-1}>Recibos</h1>
        <p className="sub">{prox.length ? <>{prox.length} en los próximos 30 días, <span className="cifra">{dos.format(totalPrevisto(prox))} €</span> en total.</> : 'Nada en los próximos 30 días.'}</p></div>
      <div className="acciones"><button type="button" className="boton" onClick={() => onEditar(null)}><Icono id="i-mas"/>Añadir recibo</button></div>
    </div>
    {prox.length > 0 && <>
      <p className="eti">Los próximos 30 días vienen hacia ti</p>
      <div className="lienzo rio30" ref={lienzo}>
        <canvas role="img" aria-label={`Los próximos 30 días como un río que llega a hoy. Cada recibo es una piedra en el cauce: ${prox.map((c) => `${c.elemento.nombre} el ${corta(c.fecha)}`).join(', ')}.`}/>
        <div className="etiquetas"/>
        <div className="aviso" role="status" aria-live="polite"><p className="n"/><p className="v"/><p className="d"/><p className="d coral" hidden/></div>
      </div>
    </>}
    <div className="rejilla">
      <section className="c7" aria-labelledby="h-semana">
        <div className="cab"><h2 id="h-semana">Esta semana</h2></div>
        {semana.length ? <ol className="lista-rec">{semana.map((c) => {
          const d = fecha(c.fecha);
          return <li key={clave(c)}><button type="button" className="rec-editar" onClick={() => onEditar(c.elemento)} aria-label={`Editar ${c.elemento.nombre}`}>
            <span className="dia"><b>{d.getDate()}</b><small>{SEM[d.getDay()]}</small></span>
            <span className="que"><b>{c.elemento.nombre}</b><small>{NOMBRE_TIPO[c.elemento.tipo]} · {describirFrecuencia(c.elemento.frecuencia)}{c.elemento.estimado ? ' · estimado' : ''}</small></span>
            <span className="imp">{c.elemento.importe == null ? '—' : `${dos.format(c.elemento.importe)} €`}</span></button></li>;
        })}</ol> : <p className="nota">Nada que pagar ni que venza en los próximos siete días.</p>}
        {cobro}
      </section>
      <section className="c-der" aria-labelledby="h-anual">
        <div className="cab"><h2 id="h-anual">Al año</h2></div>
        <p className="anual"><span className="cifra">{cifra(resumen.anual)}</span><span className="eur">€</span></p>
        <p className="nota">Lo que suman todos tus recibos en doce meses.{suscripciones > 0 && <> De eso, <span className="cifra">{cifra(suscripciones)} €</span> son suscripciones.</>}</p>
        <div className="grupos">{resumen.categorias.map((g) =>
          <div className="grupo" key={g.categoria}><h3><span>{g.categoria}</span><span className="imp">{cifra(g.total)} € al año</span></h3>
            <ul>{resumen.filas.filter((f) => f.elemento.categoria === g.categoria).map(({ elemento: e }) => {
              const s = siguiente(e);
              return <li key={e.id}><button type="button" className="rec-editar" onClick={() => onEditar(e)} aria-label={`Editar ${e.nombre}`}><span>{e.nombre}</span><span className="imp">{dos.format(e.importe ?? 0)} €</span>
                <small>{describirFrecuencia(e.frecuencia)}{s ? ` · próximo el ${corta(s)}` : ''}</small></button></li>;
            })}</ul></div>)}
          {sueltos.length > 0 && <div className="grupo"><h3><span>Sin importe o una sola vez</span></h3>
            <ul>{sueltos.map((e) => { const s = siguiente(e);
              return <li key={e.id}><button type="button" className="rec-editar" onClick={() => onEditar(e)} aria-label={`Editar ${e.nombre}`}><span>{e.nombre}</span><span className="imp">{e.importe == null ? '—' : `${dos.format(e.importe)} €`}</span>
                <small>{NOMBRE_TIPO[e.tipo]} · {describirFrecuencia(e.frecuencia)}{s ? ` · el ${corta(s)}` : ' · ya pasó'}</small></button></li>; })}</ul></div>}
        </div>
      </section>
    </div>
  </>;
}

type Carga = { estado: 'cargando' } | { estado: 'error' } | { estado: 'listo'; elementos: Elemento[]; cobros: Cobro[] };

export function Recibos({ v, nuevo, onNuevo }: { v: VistaNueva; nuevo?: boolean; onNuevo?: () => void }) {
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [hoja, setHoja] = useState<Elemento | null | false>(false);
  const [vuelta, setVuelta] = useState(0);
  const uid = v.user?.id;
  useEffect(() => {
    if (!supabase || !uid) return;
    let vivo = true;
    // RLS de Kairós: con la sesión del usuario solo se leen y escriben sus filas.
    Promise.all([supabase.from('kairos_elementos').select('*').eq('activo', true), supabase.from('kairos_cobros').select('*')])
      .then(([e, c]) => { if (vivo) setCarga(e.error || c.error ? { estado: 'error' } : { estado: 'listo', elementos: e.data as Elemento[], cobros: c.data as Cobro[] }); });
    return () => { vivo = false; };
  }, [uid, vuelta]);
  const recargar = () => setVuelta((n) => n + 1);
  // Desde «¿Qué anotas?»: en cuanto se pueda, se abre la hoja de un recibo nuevo.
  useEffect(() => { if (nuevo && carga.estado === 'listo') { setHoja(null); onNuevo?.(); } }, [nuevo, carga.estado]);
  // «¿Se cobró?»: se propone un cargo de Brújula que cuadra con un recibo; solo se guarda si la persona dice que sí.
  const llave = `brujula.recibos.rechazados.${uid}`;
  const [rechazados, setRechazados] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(llave) ?? '[]'); } catch { return []; } });
  const [respuesta, setRespuesta] = useState<{ eti: string; texto: string } | null>(null);
  const propuesta: Conciliacion | undefined = carga.estado === 'listo'
    ? conciliar(carga.elementos, carga.cobros, v.items.filter((t) => !rechazados.includes(t.id)).map((t) => ({ ...t, amount: Number(t.amount) })), hoyLocal())[0] : undefined;
  const responder = async (c: Conciliacion, si: boolean) => {
    const e = carga.estado === 'listo' ? carga.elementos.find((x) => x.id === c.elemento_id) : undefined;
    if (si) {
      const { error } = await supabase!.from('kairos_cobros').insert({ id: crypto.randomUUID(), user_id: uid, elemento_id: c.elemento_id, fecha_prevista: c.fecha_prevista,
        fecha_real: c.movimiento.occurred_on, importe_real: c.movimiento.amount, estado: 'pagado', transaction_id: c.movimiento.id, actualizado: new Date().toISOString() });
      setRespuesta(error ? { eti: 'No se guardó', texto: 'No se pudo marcar como pagado. Prueba de nuevo en un momento.' }
        : { eti: 'Cuadrado', texto: `${e?.nombre ?? 'El recibo'} del ${corta(c.fecha_prevista)} queda pagado con ese cargo. También lo verás así en Kairós.` });
      if (!error) recargar();
    } else {
      const lista = [...rechazados, c.movimiento.id];
      setRechazados(lista); try { localStorage.setItem(llave, JSON.stringify(lista)); } catch { /* solo afecta a este navegador */ }
      setRespuesta({ eti: 'Entendido', texto: `Ese cargo queda como un movimiento suelto. ${e?.nombre ?? 'El recibo'} sigue pendiente.` });
    }
  };
  const movPropuesto = propuesta && v.items.find((t) => t.id === propuesta.movimiento.id);
  const nombrePropuesto = propuesta && carga.estado === 'listo' ? carga.elementos.find((x) => x.id === propuesta.elemento_id)?.nombre ?? '' : '';
  const tarjeta = respuesta ? <div className="cobro"><p className="eti">{respuesta.eti}</p><p>{respuesta.texto}</p></div>
    : propuesta && <div className="cobro">
      <p className="eti">¿Se cobró?</p>
      <p>El {corta(propuesta.movimiento.occurred_on)} salieron <span className="cifra">{dos.format(propuesta.movimiento.amount)} €</span>{movPropuesto?.account ? ` de ${accountName(movPropuesto.account, v.accounts)}` : ''} con el concepto «{propuesta.movimiento.description}». ¿Es el recibo de {nombrePropuesto}?</p>
      <div className="acciones">
        <button type="button" className="boton lleno" onClick={() => void responder(propuesta, true)}><Icono id="i-cuadra"/>Sí, es {nombrePropuesto}</button>
        <button type="button" className="boton" onClick={() => void responder(propuesta, false)}>No es ese</button>
      </div>
    </div>;
  // Kairós sincroniza desde la nube al abrirse: lo que se guarde aquí lo verá allí.
  const guardar = async (e: Elemento) => {
    const { error } = await supabase!.from('kairos_elementos').upsert({ ...e, user_id: uid });
    if (error) return 'No se pudo guardar. Revisa los datos y prueba de nuevo.';
    recargar(); return null;
  };
  const borrar = async (e: Elemento) => {
    const { error } = await supabase!.from('kairos_elementos').delete().eq('id', e.id);
    if (error) return 'No se pudo borrar. Prueba de nuevo en un momento.';
    recargar(); return null;
  };
  const sinSesion = !supabase || !uid;
  const mensaje = sinSesion ? 'Recibos lee lo que tienes en Kairós. Entra con tu cuenta para verlos.'
    : carga.estado === 'cargando' ? 'Cargando tus recibos…'
    : carga.estado === 'error' ? 'No se pudieron leer tus recibos de Kairós. Prueba de nuevo en un momento.'
    : !carga.elementos.length ? 'Aún no tienes recibos. Añade el primero y aparecerá también en Kairós.' : '';
  return <section className="vista marco" id="recibos" aria-labelledby="h-recibos">
    {mensaje || carga.estado !== 'listo'
      ? <div className="vcab"><div><h1 id="h-recibos" tabIndex={-1}>Recibos</h1><p className="sub" role="status">{mensaje}</p></div>
        {!sinSesion && carga.estado === 'listo' && <div className="acciones"><button type="button" className="boton" onClick={() => setHoja(null)}><Icono id="i-mas"/>Añadir recibo</button></div>}</div>
      : <RecibosVista elementos={carga.elementos} cobros={carga.cobros} hoy={hoyLocal()} onEditar={setHoja} cobro={tarjeta}/>}
    {hoja !== false && <HojaRecibo inicial={hoja} onGuardar={guardar} onBorrar={borrar} onCerrar={() => setHoja(false)}/>}
  </section>;
}
