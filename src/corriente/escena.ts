/* Motor de corrientes de la maqueta de Corriente (Movimientos, Recibos, Metas y Cuentas), portado a TypeScript.
   Cada lienzo define sus ríos en `construir`; el motor siembra partículas, las mueve y las dibuja. */
import { avisar } from './rio';

export type C3 = [number, number, number];
export const PERLA: C3 = [236, 234, 228], MENTA: C3 = [150, 200, 177], CORAL: C3 = [226, 144, 124];
export const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
export const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
export const rgba = (c: C3, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
export const lineal = (W: number, f: (x: number) => number) => { const a = new Float32Array(W + 1); for (let x = 0; x <= W; x++) a[x] = f(x); return a; };
export function canvasTexto(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left', tam = 11, peso = 500) {
  ctx.font = `${peso} ${tam}px "Inter Tight", system-ui, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(txt, x, y);
}

export type Info = { n: string; v: string; d?: string; alerta?: string; menta?: boolean };
export type RioEscena = {
  Y: Float32Array; WD: Float32Array; x0: number; x1: number; dir: 1 | -1; col: C3; grupo: string;
  fadeIn?: number; fadeOut?: number; vel?: number; dens?: number; largo?: number; ancho?: number; brillo?: number;
  empuje?: (x: number, u: number) => number;
  n?: number; px?: Float32Array; pu?: Float32Array; pv?: Float32Array; pb?: Float32Array; pf?: Float32Array; luz?: number;
};
export type Estado = { W: number; H: number; S: Escena | null; reloj: number; foco: string | null; capa: HTMLElement; lienzo: HTMLElement; marca?: number | null };
export type Escena = {
  vel: number; rios: RioEscena[]; sinAtenuar?: boolean;
  paso?: (dt: number, st: Estado) => void;
  fondo?: (ctx: CanvasRenderingContext2D, st: Estado) => void;
  encima?: (ctx: CanvasRenderingContext2D, st: Estado, quieto: boolean) => void;
  sobre?: (mx: number, my: number, st: Estado) => { g: string; info?: Info } | null;
  info: (g: string) => Info | null;
};

/** Etiqueta reutilizable dentro de un lienzo: un botón real, con su texto puesto como texto. */
export function rotulo(st: Estado, g: string, partes: [string, string?][], clase = 'rio') {
  let b = st.capa.querySelector<HTMLButtonElement>(`[data-g="${CSS.escape(g)}"]`);
  if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = clase; b.dataset.g = g; st.capa.appendChild(b); }
  const clave = JSON.stringify(partes);
  if (b.dataset.clave !== clave) {
    b.dataset.clave = clave;
    b.replaceChildren(...partes.map(([t, c]) => { const s = document.createElement(c === 'b' ? 'b' : 'span'); if (c && c !== 'b') s.className = c; s.textContent = t; return s; }));
  }
  return b;
}

export function escena(lienzo: HTMLElement, construir: (W: number, H: number, movil: boolean, st: Estado) => Escena): () => void {
  const cv = lienzo.querySelector('canvas')!, ctx = cv.getContext('2d')!;
  const capa = lienzo.querySelector<HTMLElement>('.etiquetas')!;
  const mqMovil = matchMedia('(max-width: 759px)'), mqQuieto = matchMedia('(prefers-reduced-motion: reduce)');
  const st: Estado = { W: 0, H: 0, S: null, reloj: 0, foco: null, capa, lienzo };
  let dpr = 1, enMarcha = false, visible = false, ultimo = 0, pendiente = false, raf = 0;
  const NB = 5;
  function medir() {
    const r = lienzo.getBoundingClientRect();
    st.W = Math.round(r.width); st.H = Math.round(r.height);
    if (!st.W || !st.H) { st.S = null; return; }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(st.W * dpr); cv.height = Math.round(st.H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    st.S = construir(st.W, st.H, mqMovil.matches, st);
    for (const r of st.S.rios) sembrar(r);
  }
  function sembrar(r: RioEscena) {
    const a = Math.max(0, r.x0 | 0), b = Math.min(st.W, r.x1 | 0);
    let wsum = 0; for (let x = a; x <= b; x++) wsum += r.WD[x] || 0;
    const n = clamp(Math.round(wsum * 0.032 * (r.dens || 1)), 24, 3200);
    r.n = n; r.px = new Float32Array(n); r.pu = new Float32Array(n); r.pv = new Float32Array(n); r.pb = new Float32Array(n); r.pf = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      r.px[j] = r.x0 + Math.random() * (r.x1 - r.x0);
      r.pu[j] = Math.random() - 0.5; r.pv[j] = 0.8 + Math.random() * 0.4;
      r.pb[j] = 0.25 + Math.random() * 0.75; r.pf[j] = Math.random() * 6.283;
    }
    r.luz = 1;
  }
  const objetivo = (r: RioEscena) => (st.foco === null || st.S!.sinAtenuar) ? 1 : (r.grupo === st.foco ? 1.25 : 0.28);
  function paso(dt: number) {
    st.reloj += dt;
    const S = st.S!;
    for (const r of S.rios) {
      const v = (r.vel || S.vel) * dt * r.dir, a = r.x0, b = r.x1, L = b - a;
      for (let j = 0; j < r.n!; j++) { let x = r.px![j] + v * r.pv![j]; if (x > b) x -= L; else if (x < a) x += L; r.px![j] = x; }
      r.luz! += (objetivo(r) - r.luz!) * Math.min(1, dt * 9);
    }
    S.paso?.(dt, st);
  }
  function posY(r: RioEscena, x: number, j: number) {
    const i = clamp(x | 0, 0, r.Y.length - 1);
    let y = r.Y[i] + r.pu![j] * r.WD[i] + Math.sin(x * 0.017 + st.reloj * 1.3 + r.pf![j]) * 0.8;
    if (r.empuje) y += r.empuje(x, r.pu![j]);
    return y;
  }
  function dibujar(quieto: boolean) {
    const { W, H, S } = st; if (!S) return;
    ctx.clearRect(0, 0, W, H);
    S.fondo?.(ctx, st);
    ctx.lineCap = 'round';
    const frente = quieto ? 1e9 : (W + 400) * (1 - Math.pow(1 - Math.min(1, st.reloj / 1.9), 3));
    for (const r of S.rios) {
      if (r.luz! < 0.02) continue;
      const paths = Array.from({ length: NB }, () => new Path2D());
      const a = r.x0, b = r.x1, fi = r.fadeIn ?? 12, fo = r.fadeOut ?? 12, dir = r.dir;
      for (let j = 0; j < r.n!; j++) {
        const x = r.px![j]; let al = r.pb![j];
        const dIn = dir > 0 ? x - a : b - x, dOut = dir > 0 ? b - x : x - a;
        if (fi > 0 && dIn < fi) al *= dIn / fi;
        if (fo > 0 && dOut < fo) al *= (dOut / fo) * (dOut / fo);
        if (!quieto) { const vis = (dir > 0 ? frente - x : x - (W - frente)) / 160; if (vis <= 0) continue; if (vis < 1) al *= vis; }
        if (al < 0.03) continue;
        const dl = 4.5 * r.pv![j] * (r.largo || 1), xt = x - dir * dl;
        const q = Math.min(NB - 1, (al * NB) | 0);
        paths[q].moveTo(xt, posY(r, xt, j)); paths[q].lineTo(x, posY(r, x, j));
      }
      ctx.lineWidth = (st.foco !== null && r.grupo === st.foco && !S.sinAtenuar) ? 1.4 : (r.ancho || 1);
      for (let q = 0; q < NB; q++) { ctx.strokeStyle = rgba(r.col, Math.min(1, (q + 0.6) / NB * r.luz! * (r.brillo || 0.95))); ctx.stroke(paths[q]); }
    }
    S.encima?.(ctx, st, quieto);
  }
  function asentar() { if (st.S) for (const r of st.S.rios) r.luz = objetivo(r); }
  function pedirDibujo() {
    if (enMarcha || pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; asentar(); dibujar(true); });
  }
  function fotograma(t: number) {
    if (!enMarcha) return;
    const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016); ultimo = t;
    if (st.S) { paso(dt); dibujar(false); }
    raf = requestAnimationFrame(fotograma);
  }
  function arrancar() {
    if (!st.S || mqQuieto.matches || !visible || document.hidden) { enMarcha = false; return; }
    if (enMarcha) return;
    enMarcha = true; ultimo = performance.now(); raf = requestAnimationFrame(fotograma);
  }
  function preparar() {
    const yaVisto = st.reloj > 2;
    medir(); if (!st.S) { enMarcha = false; return; }
    if (mqQuieto.matches) { enMarcha = false; st.reloj = 0; for (let i = 0; i < 160; i++) paso(1 / 30); asentar(); dibujar(true); }
    else { st.reloj = 0; if (yaVisto) for (let i = 0; i < 120; i++) paso(1 / 30); arrancar(); }
  }
  function fijar(g: string | null, x: number, y: number, info?: Info | null) {
    st.foco = g ?? null;
    lienzo.classList.toggle('foco', st.foco !== null && !st.S?.sinAtenuar);
    capa.querySelectorAll<HTMLElement>('[data-g]').forEach((el) => el.classList.toggle('activo', el.dataset.g === st.foco));
    avisar(lienzo, st.foco === null ? null : (info || st.S!.info(st.foco)), x, y);
    pedirDibujo();
  }
  const enMovimiento = (e: PointerEvent) => {
    if (!st.S || (e.target as HTMLElement).closest('[data-g]')) return;
    const b = lienzo.getBoundingClientRect(), mx = e.clientX - b.left, my = e.clientY - b.top;
    const s = st.S.sobre ? st.S.sobre(mx, my, st) : null;
    if (!s) { if (st.foco !== null) fijar(null, 0, 0); st.marca = null; return; }
    fijar(s.g, mx, my, s.info);
  };
  const salir = () => { st.marca = null; fijar(null, 0, 0); };
  const anclar = (el: HTMLElement) => { const lb = lienzo.getBoundingClientRect(), bb = el.getBoundingClientRect(); fijar(el.dataset.g!, bb.right - lb.left - 4, bb.top - lb.top + 4); };
  const enEtiqueta = (e: Event) => { const el = (e.target as HTMLElement).closest<HTMLElement>('[data-g]'); if (el) anclar(el); };
  const alSalirEtiqueta = () => fijar(null, 0, 0);
  const alVisibilidad = () => { if (document.hidden) enMarcha = false; else arrancar(); };
  let tRes = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(tRes); tRes = requestAnimationFrame(preparar); });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); else enMarcha = false; });
  lienzo.addEventListener('pointermove', enMovimiento); lienzo.addEventListener('pointerleave', salir);
  capa.addEventListener('pointerover', enEtiqueta); capa.addEventListener('focusin', enEtiqueta); capa.addEventListener('click', enEtiqueta); capa.addEventListener('focusout', alSalirEtiqueta);
  document.addEventListener('visibilitychange', alVisibilidad); mqQuieto.addEventListener('change', preparar);
  ro.observe(lienzo); io.observe(lienzo);
  return () => {
    enMarcha = false; cancelAnimationFrame(raf); cancelAnimationFrame(tRes); ro.disconnect(); io.disconnect();
    lienzo.removeEventListener('pointermove', enMovimiento); lienzo.removeEventListener('pointerleave', salir);
    capa.removeEventListener('pointerover', enEtiqueta); capa.removeEventListener('focusin', enEtiqueta); capa.removeEventListener('click', enEtiqueta); capa.removeEventListener('focusout', alSalirEtiqueta);
    document.removeEventListener('visibilitychange', alVisibilidad); mqQuieto.removeEventListener('change', preparar);
    capa.replaceChildren();
  };
}
