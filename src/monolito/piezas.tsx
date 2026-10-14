import { useEffect, useRef } from 'react';
import { cifra, type Ritmo } from '../corriente/datos';
import { medidorPresupuesto } from './puntos';

export const NS = 'http://www.w3.org/2000/svg';
export const el = (n: string, a: Record<string, string | number> = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, String(a[k])); return e; };
export const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Glifos de puntos 7×7 de la maqueta. */
const GLIFOS: Record<string, string[]> = {
  logo: ['..###..', '.#...#.', '#....##', '#..#..#', '#.....#', '.#...#.', '..###..'],
  rumbo: ['..###..', '.#...#.', '#...#.#', '#..#..#', '#.....#', '.#...#.', '..###..'],
  mov: ['....#..', '#######', '....#..', '.......', '..#....', '#######', '..#....'],
  rec: ['#######', '#.....#', '#.#.#.#', '#.....#', '#.#.#.#', '#.....#', '#######'],
  meta: ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'],
  cue: ['...#...', '..#.#..', '#######', '.......', '#.#.#.#', '#.#.#.#', '#######'],
  mas: ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
  flecha: ['...#...', '....#..', '.....#.', '#######', '.....#.', '....#..', '...#...'],
  izq: ['....#..', '...#...', '..#....', '.#.....', '..#....', '...#...', '....#..'],
  der: ['..#....', '...#...', '....#..', '.....#.', '....#..', '...#...', '..#....'],
  lupa: ['.###...', '#...#..', '#...#..', '#...#..', '.###...', '....##.', '.....##'],
  sube: ['...#...', '..###..', '.#.#.#.', '...#...', '...#...', '.......', '#######'],
  campana: ['...#...', '..###..', '.#...#.', '.#...#.', '.#...#.', '#######', '...#...'],
};
export const Glifo = ({ g, clase = '' }: { g: string; clase?: string }) =>
  <i className={`g ${clase}`.trim()} aria-hidden="true"><svg viewBox="0 0 21 21">{GLIFOS[g].flatMap((fila, y) => [...fila].map((c, x) =>
    c === '#' ? <circle key={`${x}-${y}`} cx={x * 3 + 1.5} cy={y * 3 + 1.5} r={1.15}/> : null))}</svg></i>;

/** Ficha flotante al pasar por encima de un grupo de puntos (o enfocarlo con el teclado), como en la maqueta. */
export function encima(cont: HTMLElement, info: (id: string) => { n: string; v: string; d: string; alerta?: string } | null) {
  const tip = cont.querySelector<HTMLElement>('.tip')!;
  const mostrar = (g: Element) => {
    const id = (g as HTMLElement).dataset.g!, d = info(id); if (!d) return;
    cont.classList.add('foco');
    cont.querySelectorAll<HTMLElement>('[data-g]').forEach((x) => x.classList.toggle('activo', x.dataset.g === id));
    tip.querySelector('.n')!.textContent = d.n; tip.querySelector('.v')!.innerHTML = d.v; tip.querySelector('.d:not(.rojo)')!.textContent = d.d;
    const r = tip.querySelector<HTMLElement>('.rojo')!; r.hidden = !d.alerta; r.textContent = d.alerta ?? '';
    const ancla = g.querySelector('.ancla') ?? g, cb = cont.getBoundingClientRect(), gb = ancla.getBoundingClientRect();
    const tw = tip.offsetWidth || 200, th = tip.offsetHeight || 100;
    let y = gb.top - cb.top - th - 12; if (y < -cb.top + 70) y = gb.bottom - cb.top + 12;
    tip.style.setProperty('--x', `${Math.round(Math.min(Math.max(0, gb.left - cb.left + gb.width / 2 - tw / 2), Math.max(0, cb.width - tw)))}px`);
    tip.style.setProperty('--y', `${Math.round(y)}px`);
    tip.classList.add('ver');
  };
  const ocultar = () => { cont.classList.remove('foco'); cont.querySelectorAll('.activo').forEach((x) => x.classList.remove('activo')); tip.classList.remove('ver'); };
  const sobre = (e: Event) => { const g = (e.target as Element).closest('[data-g]'); if (g && cont.contains(g)) mostrar(g); };
  cont.addEventListener('pointerover', sobre); cont.addEventListener('click', sobre); cont.addEventListener('focusin', sobre);
  cont.addEventListener('pointerleave', ocultar); cont.addEventListener('focusout', ocultar);
  return () => { cont.removeEventListener('pointerover', sobre); cont.removeEventListener('click', sobre); cont.removeEventListener('focusin', sobre); cont.removeEventListener('pointerleave', ocultar); cont.removeEventListener('focusout', ocultar); };
}

/** Medidor de puntos en línea (presupuestos). */
export function medidor(svg: SVGSVGElement, seg: string, paso = 11) {
  const items: string[] = [], cortes: number[] = [];
  seg.split(',').forEach((p) => { if (p === '|') { cortes.push(items.length); return; } const [n, c] = p.split(':'); for (let i = 0; i < +n; i++) items.push(c); });
  const hueco = paso * 0.6, W = items.length * paso + cortes.length * hueco, H = paso, r = paso * 0.32;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H)); svg.replaceChildren();
  items.forEach((c, i) => { const desp = cortes.filter((k) => k <= i).length * hueco; svg.append(el('circle', { cx: i * paso + paso / 2 + desp, cy: paso / 2, r: c.startsWith('hueco') ? r - 0.6 : r, class: c })); });
  cortes.forEach((c, k) => { const x = c * paso + k * hueco + hueco / 2; svg.append(el('line', { x1: x, x2: x, y1: -2, y2: H + 2 })); });
}

export function Presupuesto({ r, onEditar, onQuitar }: { r: Ritmo; onEditar?: () => void; onQuitar?: () => void }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { if (ref.current) medidor(ref.current, medidorPresupuesto(r.gastado, r.limite, r.previsto)); }, [r.gastado, r.limite, r.previsto]);
  return <div className="presu"><div className="fila-p"><b>{r.nombre}</b><span className="cant">{cifra(r.gastado)} / {cifra(r.limite)} €</span></div>
    <svg ref={ref} role="img" aria-label={`${r.limite > 0 ? Math.round(r.gastado / r.limite * 100) : 0} % del presupuesto`}/>
    <span className={`nota${r.pasa ? ' senal' : ''}`}>{r.pasa ? `A este ritmo, +${cifra(r.previsto - r.limite)} €` : `A este ritmo acabarás en ${cifra(r.previsto)} €`}</span>
    {onEditar && onQuitar && <span className="presu-acciones"><button type="button" className="ir" onClick={onEditar}>Cambiar límite</button><button type="button" className="ir" onClick={onQuitar}>Quitar</button></span>}</div>;
}

