import { useEffect, useRef, type ReactNode } from 'react';
import { citas, finDeVentana, proximosPendientes, resumenAnual, totalPrevisto, type Cita } from '../recibos/agenda';
import { describirFrecuencia, NOMBRE_TIPO, ocurrencias, type Cobro, type Elemento } from '../recibos/elementos';
import { sumarDias, type Fecha } from '../recibos/fechas';
import { cifra } from '../corriente/datos';
import { el, encima, Glifo, quieto } from './piezas';

const dos = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
const SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (f: Fecha) => new Date(`${f}T12:00:00`);
const corta = (f: Fecha) => { const d = fecha(f); return `${SEM[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`; };
const clave = (c: Cita) => `${c.elemento.id}:${c.fecha}`;
const dias = (hoy: Fecha, f: Fecha) => Math.round((fecha(f).getTime() - fecha(hoy).getTime()) / 86_400_000);

/** Discos de puntos del tamaño de cada recibo sobre una línea que late hacia hoy; en móvil, en vertical (maqueta de Monolito). */
function pintar30(cont: HTMLElement, hoy: Fecha, lista: Cita[]) {
  const svg = cont.querySelector('svg')!, W = cont.clientWidth; if (!W) return;
  const rot = cont.querySelector<HTMLElement>('.rotulos')!; rot.replaceChildren(); svg.replaceChildren();
  const prox = lista.map((c) => ({ c, id: clave(c), v: c.elemento.importe ?? 0, i: dias(hoy, c.fecha) }));
  const vertical = W < 640;
  const punto = (g: Element, x: number, y: number, r: number, clase: string, d: number) => { const c = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, class: `${clase} ap` }); (c as SVGElement).style.setProperty('--d', `${Math.round(d)}ms`); g.append(c); };
  const disco = (g: Element, cx: number, cy: number, R: number, paso: number, clase: string, d0: number) => {
    for (let y = -R; y <= R; y += paso) for (let x = -R; x <= R; x += paso) { const dd = x * x + y * y; if (dd <= R * R) punto(g, cx + x, cy + y, paso * 0.33, clase, d0 + Math.sqrt(dd) * 6); }
  };
  const rotulo = (p: typeof prox[number], x: number, y: number, centro: boolean) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rot'; b.dataset.g = p.id;
    const d = fecha(p.c.fecha);
    for (const [t, cl] of [[`${SEM[d.getDay()].toUpperCase()} ${d.getDate()}`, 'b'], [p.c.elemento.nombre, ''], [p.c.elemento.importe == null ? '' : `${p.v % 1 ? dos.format(p.v) : cifra(p.v)} €`, 'mono']]) {
      if (!t) continue; const s = document.createElement(cl === 'b' ? 'b' : 'span'); if (cl === 'mono') s.className = 'mono'; s.textContent = t; b.append(s);
    }
    b.setAttribute('aria-label', `${p.c.elemento.nombre}, ${corta(p.c.fecha)}${p.c.elemento.importe == null ? '' : `: ${dos.format(p.v)} €`}`);
    rot.append(b);
    const w = b.offsetWidth;
    b.style.transform = `translate(${Math.round(centro ? Math.min(Math.max(0, x - w / 2), W - w) + 4 : x + 4)}px, ${Math.round(y)}px)`;
    return { w, el: b };
  };
  const clase = (p: typeof prox[number]) => p.i <= 5 ? 'on' : 'medio';
  const etiqueta = (i: number) => { const d = fecha(sumarDias(hoy, i)); return i === 0 ? 'HOY' : d.getMonth() !== fecha(hoy).getMonth() && d.getDate() <= 7 ? `${d.getDate()} ${MESES[d.getMonth()].toUpperCase()}` : String(d.getDate()); };
  const ola = (cx: number, cy: number, r: number, d: number) => { const c = el('circle', { cx, cy, r, class: 'ola' }); (c as SVGElement).style.setProperty('--d', `${d}ms`); return c; };
  if (!vertical) {
    const x0 = 34, x1 = W - 16, dx = (x1 - x0) / 29, ym = 150, H = 300, paso = 5.5;
    svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H));
    for (let k = 0; k <= 29 * 3; k++) svg.append(ola(x0 + k * dx / 3, ym, k % 3 ? 1.1 : 1.8, k * 36));
    for (let i = 0; i < 30; i++) if (i === 0 || fecha(sumarDias(hoy, i)).getDay() === 1) {
      const t = el('text', { x: x0 + i * dx, y: H - 6, 'text-anchor': 'middle', fill: i === 0 ? '#fff' : '#7D7D7D', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 10.5, 'letter-spacing': '.06em' });
      t.textContent = etiqueta(i); svg.append(t);
    }
    svg.append(el('circle', { cx: x0, cy: H - 22, r: 2.2, class: 'rojo parpadea' }));
    const lado: { x: number; w: number; nivel: number }[][] = [[], []];
    const radio = (p: typeof prox[number]) => 4 + Math.sqrt(p.v) * 1.15;
    prox.forEach((p, k) => {
      const cx = x0 + p.i * dx, R = radio(p);
      const g = el('g', { 'data-g': p.id, tabindex: 0, role: 'img', 'aria-label': `${p.c.elemento.nombre}: ${dos.format(p.v)} €` });
      g.append(el('circle', { cx, cy: ym, r: R + 4, class: 'ancla', style: 'fill:transparent' }));
      disco(g, cx, ym, R, paso, clase(p), p.i * 30); svg.append(g);
      const s = k % 2, b = rotulo(p, cx, 0, true), w = b.w;
      // el rótulo se separa del disco más grande que tenga debajo, no solo del suyo
      const Rmax = Math.max(...prox.filter((o) => Math.abs(x0 + o.i * dx - cx) < w / 2 + radio(o) + 4).map(radio));
      let nivel = 0;
      while (lado[s].some((o) => o.nivel === nivel && Math.abs(o.x - cx) < (o.w + w) / 2 + 12)) nivel++;
      const y = s === 0 ? ym - Rmax - 34 - nivel * 28 : ym + Rmax + 12 + nivel * 28;
      b.el.style.transform = `translate(${Math.round(Math.min(Math.max(0, cx - w / 2), W - w) + 4)}px, ${Math.round(y)}px)`;
      lado[s].push({ x: cx, w, nivel });
      const ya = s === 0 ? y + 22 : ym + R + 4, yb = s === 0 ? ym - R - 4 : y;
      for (let yy = ya; yy <= yb; yy += 5) svg.append(el('circle', { cx, cy: yy, r: 0.9, class: 'gris' }));
    });
  } else {
    const dy = 26, xc = 64, y0 = 20, H = y0 + 29 * dy + 30, paso = 4.5;
    svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H));
    for (let k = 0; k <= 29 * 3; k++) svg.append(ola(xc, y0 + k * dy / 3, k % 3 ? 1 : 1.6, k * 36));
    for (let i = 0; i < 30; i++) if (i === 0 || fecha(sumarDias(hoy, i)).getDay() === 1) {
      const t = el('text', { x: 0, y: y0 + i * dy + 4, fill: i === 0 ? '#fff' : '#7D7D7D', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 10.5, 'letter-spacing': '.04em' });
      t.textContent = i === 0 ? 'HOY' : `LUN ${fecha(sumarDias(hoy, i)).getDate()}`; svg.append(t);
    }
    svg.append(el('circle', { cx: 34, cy: y0, r: 2.2, class: 'rojo parpadea' }));
    prox.forEach((p) => {
      const cy = y0 + p.i * dy, R = 3 + Math.sqrt(p.v) * 0.82;
      const g = el('g', { 'data-g': p.id, tabindex: 0, role: 'img', 'aria-label': `${p.c.elemento.nombre}: ${dos.format(p.v)} €` });
      g.append(el('circle', { cx: xc, cy, r: R + 4, class: 'ancla', style: 'fill:transparent' }));
      disco(g, xc, cy, R, paso, clase(p), p.i * 30); svg.append(g);
      rotulo(p, xc + Math.max(R, 10) + 14, cy - 11, false);
    });
  }
  if (!quieto()) { cont.classList.remove('vivo'); void cont.offsetWidth; cont.classList.add('vivo'); setTimeout(() => cont.classList.remove('vivo'), 2600); }
  return encima(cont, (id) => {
    const p = prox.find((x) => x.id === id); if (!p) return null;
    const e = p.c.elemento;
    return { n: `${e.nombre} · ${corta(p.c.fecha)}`, v: e.importe == null ? 'Sin importe' : `${dos.format(p.v)}<small>€</small>`, d: `${describirFrecuencia(e.frecuencia)} · ${NOMBRE_TIPO[e.tipo]}${e.estimado ? ' · importe estimado' : ''}` };
  });
}

/** Recibos de Kairós en el estilo Monolito. Mismas props que la vista de Corriente. */
export function RecibosVistaM({ elementos, cobros, hoy, onEditar, cobro }: { elementos: Elemento[]; cobros: Cobro[]; hoy: Fecha; onEditar: (e: Elemento | null) => void; cobro?: ReactNode }) {
  const lienzo = useRef<HTMLDivElement>(null);
  const prox = proximosPendientes(citas(elementos, cobros, hoy, finDeVentana(hoy, 30)));
  const semana = prox.filter((c) => c.fecha <= sumarDias(hoy, 6));
  const resumen = resumenAnual(elementos);
  const suscripciones = resumen.categorias.find((g) => g.categoria === 'Suscripciones')?.total ?? 0;
  const siguiente = (e: Elemento) => ocurrencias(e, hoy, sumarDias(hoy, 800))[0];
  const sueltos = elementos.filter((e) => !resumen.filas.some((f) => f.elemento.id === e.id));
  const huella = JSON.stringify(prox.map((c) => [clave(c), c.elemento.importe]));
  useEffect(() => {
    if (!lienzo.current || !prox.length) return;
    let quitar = pintar30(lienzo.current, hoy, prox), ancho = innerWidth, t = 0;
    const cambio = () => { if (innerWidth === ancho) return; ancho = innerWidth; clearTimeout(t); t = window.setTimeout(() => { quitar?.(); quitar = lienzo.current ? pintar30(lienzo.current, hoy, prox) : undefined; }, 120); };
    addEventListener('resize', cambio);
    return () => { quitar?.(); removeEventListener('resize', cambio); clearTimeout(t); };
  }, [huella, hoy]);
  const fila = (e: Elemento, cuando: string, f: string | null, key: string) =>
    <button type="button" key={key} className="fila fila-editar" onClick={() => onEditar(e)} aria-label={`Editar ${e.nombre}`}>
      <span className="cuando">{cuando}</span>
      <span className="que"><b>{e.nombre}</b><small>{NOMBRE_TIPO[e.tipo]} · {describirFrecuencia(e.frecuencia)}{e.estimado ? ' · estimado' : ''}{f ? ` · ${f}` : ''}</small></span>
      <span className="cant">{e.importe == null ? '—' : `${dos.format(e.importe)} €`}</span></button>;
  return <>
    <div className="vcab">
      <div><h1 id="h-recibos" tabIndex={-1}>Recibos</h1>
        <p className="sub">{prox.length ? <>{prox.length} en los próximos 30 días · <span className="mono">{dos.format(totalPrevisto(prox))} €</span> en total.</> : 'Nada en los próximos 30 días.'}</p></div>
      <div className="acciones"><button type="button" className="boton" onClick={() => onEditar(null)}><Glifo g="mas"/>Añadir recibo</button></div>
    </div>
    {prox.length > 0 && <section className="mod" aria-labelledby="h-30">
      <div className="tit"><h2 id="h-30">Los próximos 30 días vienen hacia ti</h2><span className="escala">Cada recibo, un disco de puntos de su tamaño</span></div>
      <div className="vis" ref={lienzo} style={{ marginTop: 22 }}>
        <svg role="img" aria-label={`Los próximos 30 días como una línea de puntos que llega a hoy. Cada recibo es un disco de puntos: ${prox.map((c) => `${c.elemento.nombre} el ${corta(c.fecha)}`).join(', ')}.`}/>
        <div className="rotulos"/>
        <div className="tip"><p className="n"/><p className="v"/><p className="d"/><p className="d rojo" hidden/></div>
      </div>
    </section>}
    <div className="rejilla">
      <section className="mod" aria-labelledby="h-semana">
        <div className="tit"><h2 id="h-semana">Esta semana</h2></div>
        <div style={{ marginTop: 12 }}>{semana.length ? semana.map((c) => { const d = fecha(c.fecha); return fila(c.elemento, `${SEM[d.getDay()]} ${d.getDate()}`, null, clave(c)); })
          : <p className="res">Nada que pagar ni que venza en los próximos siete días.</p>}</div>
        {cobro}
      </section>
      <section className="mod der" aria-labelledby="h-anual">
        <div className="tit"><h2 id="h-anual">Al año</h2></div>
        <p className="anual">{cifra(resumen.anual)}<small>€</small></p>
        <p className="res">Lo que suman todos tus recibos en doce meses.{suscripciones > 0 && <> De eso, <span className="mono">{cifra(suscripciones)} €</span> son suscripciones.</>}</p>
        {resumen.categorias.map((g) => <div className="grupo" key={g.categoria}><h3><span>{g.categoria}</span><span className="mono">{cifra(g.total)} € al año</span></h3>
          <ul>{resumen.filas.filter((f) => f.elemento.categoria === g.categoria).map(({ elemento: e }) => { const s = siguiente(e);
            return <li key={e.id}><button type="button" className="grupo-editar" onClick={() => onEditar(e)} aria-label={`Editar ${e.nombre}`}><span>{e.nombre}</span><span className="mono">{dos.format(e.importe ?? 0)} €</span>
              <small>{describirFrecuencia(e.frecuencia).toUpperCase()}{s ? ` · PRÓXIMO EL ${corta(s).toUpperCase()}` : ''}</small></button></li>; })}</ul></div>)}
        {sueltos.length > 0 && <div className="grupo"><h3><span>Sin importe o una sola vez</span></h3>
          <ul>{sueltos.map((e) => { const s = siguiente(e);
            return <li key={e.id}><button type="button" className="grupo-editar" onClick={() => onEditar(e)} aria-label={`Editar ${e.nombre}`}><span>{e.nombre}</span><span className="mono">{e.importe == null ? '—' : `${dos.format(e.importe)} €`}</span>
              <small>{NOMBRE_TIPO[e.tipo].toUpperCase()}{s ? ` · EL ${corta(s).toUpperCase()}` : ' · YA PASÓ'}</small></button></li>; })}</ul></div>}
      </section>
    </div>
  </>;
}
