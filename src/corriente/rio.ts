/* Motor de la corriente del mes (Rumbo), portado de la maqueta aprobada de Corriente.
   Dibuja en canvas; las etiquetas son botones reales para teclado y lectores de pantalla. */
import { cifra, type Corriente, type Rio } from './datos';

type C3 = [number, number, number];
const PERLA: C3 = [236, 234, 228], MENTA: C3 = [150, 200, 177];
const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
const rgba = (c: C3, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
type Info = { n: string; v: string; d?: string; alerta?: string; menta?: boolean };

/** Aviso flotante compartido por los lienzos. Nombre y detalle van como texto; solo el importe (cifras propias) como HTML. */
export function avisar(lienzo: HTMLElement, info: Info | null, x: number, y: number) {
  const av = lienzo.querySelector<HTMLElement>('.aviso'); if (!av) return;
  if (!info) { av.classList.remove('ver'); return; }
  av.querySelector('.n')!.textContent = info.n;
  av.querySelector('.v')!.innerHTML = info.v;
  av.querySelector('.d')!.textContent = info.d || '';
  const al = av.querySelector<HTMLElement>('.coral')!; al.hidden = !info.alerta; al.textContent = info.alerta || '';
  av.classList.toggle('menta', !!info.menta);
  const W = lienzo.clientWidth, H = lienzo.clientHeight, aw = av.offsetWidth || 220, ah = av.offsetHeight || 110;
  let ax = x + 18, ay = y - ah - 14;
  if (ax + aw > W - 8) ax = x - aw - 18;
  if (ay < 8) ay = y + 18;
  av.style.setProperty('--x', `${Math.round(clamp(ax, 8, Math.max(8, W - aw - 8)))}px`);
  av.style.setProperty('--y', `${Math.round(clamp(ay, 8, Math.max(8, H - ah - 8)))}px`);
  av.classList.add('ver');
}
export const euros = (v: number) => `${cifra(v)}<span class="eur"> €</span>`;

type RioVivo = Rio & { el?: HTMLButtonElement; w: number; y0: number; yt: number; Y: Float32Array; WD: Float32Array; xFin: number; a: number; b: number };

export function montarRumbo(lienzo: HTMLElement, datos: Corriente, quedanEl: HTMLElement | null): () => void {
  const cv = lienzo.querySelector('canvas')!, ctx = cv.getContext('2d', { alpha: false })!;
  const capa = lienzo.querySelector<HTMLElement>('.etiquetas')!, aviso = lienzo.querySelector<HTMLElement>('.aviso')!;
  const mqMovil = matchMedia('(max-width: 759px)'), mqQuieto = matchMedia('(prefers-reduced-motion: reduce)');
  const FONDO = '#09090A', TOTAL = Math.max(1, datos.entran, datos.salen + datos.quedan);
  const RIOS: RioVivo[] = datos.rios.map((r) => ({ ...r, w: 0, y0: 0, yt: 0, Y: new Float32Array(0), WD: new Float32Array(0), xFin: 0, a: 0, b: 0 }));
  capa.replaceChildren();
  for (const r of RIOS) {
    if (r.ahorro) continue;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rio'; b.dataset.rio = r.id;
    b.setAttribute('aria-label', `${r.nombre}: ${cifra(r.v)} €`);
    const s = document.createElement('span'); s.textContent = r.nombre;
    const i = document.createElement('span'); i.className = 'imp'; i.textContent = `${cifra(r.v)} €`;
    b.append(s, i);
    if (r.alerta) { const m = document.createElement('i'); m.className = 'marca-alerta'; m.setAttribute('aria-hidden', 'true'); b.append(m); }
    capa.appendChild(b); r.el = b;
  }
  let W = 0, H = 0, dpr = 1, reloj = 0, ultimo = 0, enMarcha = false, visible = true, foco: number | 'tronco' | null = null, raf = 0;
  type Lay = { movil: boolean; tw: number; yc: number; xs: number; xe: number; fade: number; margen: number; P: { x: number; y: number; rx: number; ry: number; ea: number; ex: number; ey: number }; rios: RioVivo[]; vel: number; dash: number; largo: number; estable?: number };
  let L: Lay | null = null;
  const luz = new Float32Array(RIOS.length).fill(1);
  let px = new Float32Array(0), pu = px, pv = px, pb = px, pf = px, N = 0;
  const PMAX = 11000;
  const pool = { th: new Float32Array(PMAX), r: new Float32Array(PMAX), rt: new Float32Array(PMAX), w: new Float32Array(PMAX), age: new Float32Array(PMAX), life: new Float32Array(PMAX), b: new Float32Array(PMAX), n: 0 };
  function repartir(grupo: RioVivo[], arriba: number, abajo: number, sep: number) {
    if (!grupo.length) return;
    const c: number[] = []; let y = arriba + grupo[0].w / 2; c.push(y);
    for (let i = 1; i < grupo.length; i++) { y += Math.max((grupo[i - 1].w + grupo[i].w) / 2 + 8, sep); c.push(y); }
    const sobra = (abajo - arriba) - (y + grupo[grupo.length - 1].w / 2 - arriba);
    const paso = grupo.length > 1 ? Math.max(0, sobra) / (grupo.length - 1) : 0;
    grupo.forEach((g, i) => { g.yt = c[i] + paso * i; });
  }
  function medir() {
    const rect = lienzo.getBoundingClientRect();
    W = Math.round(rect.width); H = Math.round(rect.height);
    if (!W || !H) { L = null; return; }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const movil = mqMovil.matches;
    const gastos = RIOS.filter((r) => !r.ahorro), aho = RIOS.find((r) => r.ahorro)!;
    // En escritorio el remanso va en medio, con la mitad de los ríos encima y el resto debajo.
    const mitad = Math.ceil(gastos.length / 2);
    const orden = movil ? [...gastos, aho] : [...gastos.slice(0, mitad), aho, ...gastos.slice(mitad)];
    const tw = movil ? Math.min(W * 0.36, H * 0.26) : Math.min(H * 0.30, W * 0.17);
    const k = tw / TOTAL;
    const yc = movil ? H * 0.26 : H * 0.55, xs = movil ? W * 0.10 : W * 0.22, xe = movil ? W * 0.43 : W * 0.53;
    const fade = movil ? 30 : clamp(W * 0.05, 44, 90), margen = 40;
    const P = movil
      ? { x: W * 0.64, y: H * 0.85, rx: W * 0.28, ry: H * 0.1, ea: -Math.PI / 2, ex: 0, ey: 0 }
      : { x: W * 0.80, y: H * 0.62, rx: clamp(W * 0.11, 110, 200), ry: H * 0.15, ea: -Math.PI / 2, ex: 0, ey: 0 };
    P.ex = P.x + Math.cos(P.ea) * P.rx; P.ey = P.y + Math.sin(P.ea) * P.ry;
    let acc = yc - tw / 2;
    orden.forEach((r) => { r.w = r.v * k; r.y0 = acc + r.w / 2; acc += r.w; });
    const i = orden.indexOf(aho);
    if (movil) repartir(gastos, H * 0.03, H * 0.55, 28);
    else { repartir(orden.slice(0, i), H * 0.06, H * 0.36, 30); repartir(orden.slice(i + 1), H * 0.77, H * 0.95, 30); }
    const largo = Math.ceil(W + margen * 2) + 4;
    for (const r of orden) {
      r.Y = new Float32Array(largo); r.WD = new Float32Array(largo);
      const x1 = r.ahorro ? P.ex : xe, y1 = r.ahorro ? P.ey : r.yt;
      r.xFin = r.ahorro ? P.ex : xe + fade;
      for (let j = 0; j < largo; j++) {
        const x = j - margen, s = smooth((x - xs) / (x1 - xs));
        r.Y[j] = r.y0 + (y1 - r.y0) * s;
        r.WD[j] = r.ahorro ? r.w * (1 - 0.45 * s) : r.w;
      }
      if (r.el) r.el.style.transform = `translate(${Math.round(xe + fade * 0.62)}px, ${Math.round(r.yt - 13)}px)`;
    }
    L = { movil, tw, yc, xs, xe, fade, margen, P, rios: orden, vel: clamp(W * 0.085, 52, 150), dash: 4.5, largo };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sembrar();
  }
  function sembrar() {
    const l = L!;
    const area = l.rios.map((r) => r.w * (r.xFin + l.margen)), suma = area.reduce((a, b) => a + b, 0) || 1;
    N = Math.round(clamp(W * H * (l.movil ? 0.0095 : 0.0085), 1800, PMAX));
    px = new Float32Array(N); pu = new Float32Array(N); pv = new Float32Array(N); pb = new Float32Array(N); pf = new Float32Array(N);
    let j = 0;
    l.rios.forEach((r, i) => {
      const n = i === l.rios.length - 1 ? N - j : Math.round(N * area[i] / suma);
      r.a = j; r.b = j + n;
      for (; j < r.b; j++) {
        px[j] = -l.margen + Math.random() * (r.xFin + l.margen);
        pu[j] = Math.random() - 0.5; pv[j] = 0.8 + Math.random() * 0.4;
        pb[j] = 0.25 + Math.random() * 0.75; pf[j] = Math.random() * 6.283;
      }
      if (r.ahorro) l.estable = (n / (r.xFin + l.margen)) * l.vel * 8;
    });
    pool.n = 0;
  }
  // La partícula sigue donde estaba: mismo punto, misma velocidad y mismo brillo; solo empieza a girar.
  function alRemanso(j: number, r: RioVivo) {
    if (pool.n >= PMAX || r.w <= 0) return;
    const l = L!, i = pool.n++, P = l.P, iw = l.largo - 1;
    pool.th[i] = P.ea; pool.r[i] = 1 - (pu[j] * r.WD[iw]) / P.ry;
    pool.rt[i] = 0.06 + 0.9 * Math.sqrt(Math.random()); pool.w[i] = (l.vel * pv[j]) / P.rx;
    pool.age[i] = 0; pool.life[i] = 8 + Math.random() * 4; pool.b[i] = pb[j];
  }
  function paso(dt: number) {
    const l = L!; reloj += dt;
    const v = l.vel * dt;
    for (const r of l.rios) {
      const tope = r.xFin, vuelta = r.xFin + l.margen;
      for (let j = r.a; j < r.b; j++) { let x = px[j] + v * pv[j]; if (x > tope) { if (r.ahorro) alRemanso(j, r); x -= vuelta; } px[j] = x; }
    }
    const p = pool;
    for (let i = 0; i < p.n; i++) {
      p.age[i] += dt;
      if (p.age[i] > p.life[i]) {
        const z = --p.n;
        p.th[i] = p.th[z]; p.r[i] = p.r[z]; p.rt[i] = p.rt[z]; p.w[i] = p.w[z]; p.age[i] = p.age[z]; p.life[i] = p.life[z]; p.b[i] = p.b[z];
        i--; continue;
      }
      p.r[i] += (p.rt[i] - p.r[i]) * Math.min(1, dt * 0.35);
      p.w[i] += (0.55 - p.w[i]) * Math.min(1, dt * 0.25);
      p.th[i] += p.w[i] * (1 + 0.8 * (1 - p.r[i])) * dt;
    }
    const f = Math.min(1, dt * 9);
    RIOS.forEach((_, i) => { const obj = foco === null || foco === 'tronco' ? 1 : (foco === i ? 1.25 : 0.3); luz[i] += (obj - luz[i]) * f; });
  }
  const NB = 6;
  const cubos = Array.from({ length: NB * 3 }, () => ({ d: new Float32Array(PMAX * 4), n: 0 }));
  const mezcla = (t: number): C3 => [0, 1, 2].map((i) => Math.round(PERLA[i] + (MENTA[i] - PERLA[i]) * t)) as C3;
  function trazar(color: C3, base: number, ancho: number, conColor: boolean) {
    ctx.lineWidth = ancho;
    for (let c = 0; c < (conColor ? 3 : 1); c++) {
      const col = conColor ? mezcla(c / 2) : color;
      for (let q = 0; q < NB; q++) {
        const cubo = cubos[c * NB + q]; if (!cubo.n) continue;
        ctx.strokeStyle = rgba(col, Math.min(1, (q + 0.6) / NB * base));
        ctx.beginPath(); const d = cubo.d;
        for (let i = 0; i < cubo.n; i += 4) { ctx.moveTo(d[i], d[i + 1]); ctx.lineTo(d[i + 2], d[i + 3]); }
        ctx.stroke(); cubo.n = 0;
      }
    }
  }
  function dibujar(quieto: boolean) {
    const l = L!;
    ctx.fillStyle = FONDO; ctx.fillRect(0, 0, W, H);
    const frente = quieto ? 1e9 : -l.margen + (W + l.margen * 2 + 260) * (1 - Math.pow(1 - Math.min(1, reloj / 2.1), 3));
    const m = l.margen, P = l.P, iAho = RIOS.findIndex((r) => r.ahorro);
    const lleno = clamp(pool.n / (l.estable || 1), 0, 1), verP = clamp((frente - P.x + P.rx) / 260, 0, 1);
    if (lleno > 0 && verP > 0) {
      ctx.save(); ctx.translate(P.x, P.y); ctx.scale(1, P.ry / P.rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, P.rx * 1.35), a = 0.26 * lleno * verP * Math.min(1, luz[iAho]);
      g.addColorStop(0, `rgba(150,200,177,${a})`); g.addColorStop(0.45, `rgba(150,200,177,${a * 0.35})`); g.addColorStop(1, 'rgba(150,200,177,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, P.rx * 1.35, 0, 6.2832); ctx.fill(); ctx.restore();
    }
    ctx.lineCap = 'round';
    for (const r of l.rios) {
      const i = RIOS.indexOf(r), base = luz[i];
      if (base < 0.02 || r.w <= 0) continue;
      const Y = r.Y, WD = r.WD, xe = l.xe, fz = l.fade, xs = l.xs, span = (P.ex - xs);
      for (let j = r.a; j < r.b; j++) {
        const x = px[j]; if (x < -6) continue;
        let a = pb[j];
        if (!quieto) { const vis = (frente - x) / 180; if (vis <= 0) continue; if (vis < 1) a *= vis; }
        const ix = (x + m) | 0;
        let y = Y[ix] + pu[j] * WD[ix] + Math.sin(x * 0.017 + reloj * 1.3 + pf[j]) * 0.8;
        let dl = l.dash * pv[j];
        if (!r.ahorro && x > xe) {
          const dz = (x - xe) / fz; a *= (1 - dz) * (1 - dz);
          y += (pu[j] >= 0 ? 1 : -1) * dz * dz * fz * 0.22 + Math.sin(pf[j] + reloj * 2.1) * dz * 3;
          dl *= 1 - dz * 0.6;
        }
        if (x < 6) a *= Math.max(0, (x + 6) / 12);
        const it = Math.max(0, (x - dl + m) | 0);
        const yt = y - (Y[ix] - Y[it]) - pu[j] * (WD[ix] - WD[it]);
        const q = Math.min(NB - 1, (a * NB) | 0);
        const c = r.ahorro ? Math.min(2, Math.max(0, ((x - xs) / span * 3) | 0)) : 0;
        const cubo = cubos[c * NB + q], d = cubo.d, n = cubo.n;
        d[n] = x - dl; d[n + 1] = yt; d[n + 2] = x; d[n + 3] = y; cubo.n = n + 4;
      }
      trazar(PERLA, base * 0.95, foco === i ? 1.4 : (l.movil ? 1.05 : 0.95), !!r.ahorro);
    }
    if (pool.n && verP > 0) {
      const p = pool;
      for (let i = 0; i < p.n; i++) {
        let a = p.b[i] * Math.min(1, (p.life[i] - p.age[i]) / 2.5) * verP; if (a <= 0.01) continue;
        const th = p.th[i], r = p.r[i], x = P.x + Math.cos(th) * r * P.rx, y = P.y + Math.sin(th) * r * P.ry;
        const t2 = th - (l.dash * 1.1) / (Math.max(r, 0.15) * P.rx), x2 = P.x + Math.cos(t2) * r * P.rx, y2 = P.y + Math.sin(t2) * r * P.ry;
        a *= 0.8 + 0.2 * (1 - r);
        const cubo = cubos[Math.min(NB - 1, (a * NB) | 0)], d = cubo.d, n = cubo.n;
        d[n] = x2; d[n + 1] = y2; d[n + 2] = x; d[n + 3] = y; cubo.n = n + 4;
      }
      trazar(MENTA, luz[iAho] * 0.95, foco === iAho ? 1.4 : (l.movil ? 1.05 : 0.95), false);
    }
  }
  function sobre(mx: number, my: number): number | 'tronco' | null {
    const l = L!, P = l.P;
    const ex = (mx - P.x) / (P.rx * 1.1), ey = (my - P.y) / (P.ry * 1.25);
    if (ex * ex + ey * ey < 1) return RIOS.findIndex((r) => r.ahorro);
    if (mx < l.xs && Math.abs(my - l.yc) < l.tw / 2 + 10) return 'tronco';
    let mejor: number | null = null, dist = 1e9;
    const ix = clamp((mx + l.margen) | 0, 0, l.largo - 1);
    for (const r of l.rios) {
      if (mx > r.xFin || mx < l.xs || r.w <= 0) continue;
      const d = Math.abs(my - r.Y[ix]) - r.WD[ix] / 2;
      if (d < 10 && d < dist) { dist = d; mejor = RIOS.indexOf(r); }
    }
    return mejor;
  }
  function mostrar(f: number | 'tronco' | null, x = 0, y = 0) {
    foco = f;
    lienzo.classList.toggle('foco', f !== null && f !== 'tronco');
    RIOS.forEach((r, i) => r.el?.classList.toggle('activo', i === f));
    if (f === null) { aviso.classList.remove('ver'); pedirDibujo(); return; }
    const info: Info = f === 'tronco'
      ? { n: datos.tronco.nombre, v: euros(datos.entran), d: datos.tronco.pct }
      : { n: RIOS[f].nombre, v: euros(RIOS[f].v), d: RIOS[f].pct, alerta: RIOS[f].alerta, menta: !!RIOS[f].ahorro };
    avisar(lienzo, info, x, y);
    if (f !== 'tronco' && x > W * 0.3) {
      const aw = aviso.offsetWidth || 220, ah = aviso.offsetHeight || 110;
      aviso.style.setProperty('--x', `${Math.round(clamp(x - aw - 18, 8, W - aw - 8))}px`);
      aviso.style.setProperty('--y', `${Math.round(clamp(y + 16, 8, H - ah - 8))}px`);
    }
    pedirDibujo();
  }
  const enMovimiento = (e: PointerEvent) => {
    if (!L || (e.target as HTMLElement).closest('.rio')) return;
    const b = lienzo.getBoundingClientRect(), mx = e.clientX - b.left, my = e.clientY - b.top, f = sobre(mx, my);
    if (f === null) { if (foco !== null) mostrar(null); return; }
    mostrar(f, mx, my);
  };
  const salir = () => mostrar(null);
  const anclar = (b: HTMLElement) => {
    const i = RIOS.findIndex((r) => r.id === b.dataset.rio), lb = lienzo.getBoundingClientRect(), bb = b.getBoundingClientRect();
    mostrar(i, bb.right - lb.left - 4, bb.top - lb.top + 4);
  };
  const enEtiqueta = (e: Event) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.rio'); if (b) anclar(b); };
  const iAhorro = RIOS.findIndex((r) => r.ahorro);
  const anclarRemanso = () => { if (!L) return; if (L.movil) mostrar(iAhorro, L.P.x - 110, L.P.y - L.P.ry); else mostrar(iAhorro, L.P.x - L.P.rx - 40, L.P.y + L.P.ry * 0.4); };
  let pendiente = false;
  function pedirDibujo() {
    if (enMarcha || pendiente || !L) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; if (!L) return; asentarLuz(); dibujar(true); });
  }
  function asentarLuz() { RIOS.forEach((_, i) => { luz[i] = foco === null || foco === 'tronco' ? 1 : (foco === i ? 1.25 : 0.3); }); }
  function fotograma(t: number) {
    if (!enMarcha) return;
    const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016); ultimo = t;
    if (L) { paso(dt); dibujar(false); }
    raf = requestAnimationFrame(fotograma);
  }
  function arrancar() {
    if (!L || mqQuieto.matches || !visible || document.hidden) { enMarcha = false; return; }
    if (enMarcha) return;
    enMarcha = true; ultimo = performance.now(); raf = requestAnimationFrame(fotograma);
  }
  function preparar() {
    const yaVisto = reloj > 2.2;
    medir(); if (!L) { enMarcha = false; return; }
    if (mqQuieto.matches) { enMarcha = false; reloj = 0; for (let i = 0; i < 200; i++) paso(1 / 30); asentarLuz(); dibujar(true); }
    else { if (yaVisto) for (let i = 0; i < 150; i++) paso(1 / 30); arrancar(); }
  }
  const alVisibilidad = () => { if (document.hidden) enMarcha = false; else arrancar(); };
  let tRes = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(tRes); tRes = requestAnimationFrame(preparar); });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); else enMarcha = false; });
  lienzo.addEventListener('pointermove', enMovimiento); lienzo.addEventListener('pointerleave', salir);
  capa.addEventListener('pointerover', enEtiqueta); capa.addEventListener('focusin', enEtiqueta); capa.addEventListener('click', enEtiqueta); capa.addEventListener('focusout', salir);
  quedanEl?.addEventListener('pointerenter', anclarRemanso); quedanEl?.addEventListener('pointerleave', salir);
  quedanEl?.addEventListener('focus', anclarRemanso); quedanEl?.addEventListener('blur', salir);
  document.addEventListener('visibilitychange', alVisibilidad); mqQuieto.addEventListener('change', preparar);
  ro.observe(lienzo); io.observe(lienzo);
  return () => {
    enMarcha = false; cancelAnimationFrame(raf); cancelAnimationFrame(tRes); ro.disconnect(); io.disconnect();
    lienzo.removeEventListener('pointermove', enMovimiento); lienzo.removeEventListener('pointerleave', salir);
    capa.removeEventListener('pointerover', enEtiqueta); capa.removeEventListener('focusin', enEtiqueta); capa.removeEventListener('click', enEtiqueta); capa.removeEventListener('focusout', salir);
    quedanEl?.removeEventListener('pointerenter', anclarRemanso); quedanEl?.removeEventListener('pointerleave', salir);
    quedanEl?.removeEventListener('focus', anclarRemanso); quedanEl?.removeEventListener('blur', salir);
    document.removeEventListener('visibilitychange', alVisibilidad); mqQuieto.removeEventListener('change', preparar);
    capa.replaceChildren();
  };
}
