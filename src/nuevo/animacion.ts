// Movimiento decorativo del tema nuevo. El contenido ya está en pantalla antes de animarse,
// así que si anime.js no carga (sin conexión) o el sistema pide reducir movimiento, todo sigue igual.
const quieto = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Parar = { cancel: () => void };
const motor = () => Promise.all([import('animejs/animation'), import('animejs/utils')]);

/** Hace entrar en escalera los bloques marcados con .r-entra dentro de la raíz. */
export function entrar(raiz: HTMLElement | null, paso = 55): () => void {
  if (!raiz || quieto()) return () => {};
  const piezas = Array.from(raiz.querySelectorAll<HTMLElement>('.r-entra')).slice(0, 14);
  if (!piezas.length) return () => {};
  let hecho = false, anim: Parar | undefined;
  motor().then(([{ animate }, { stagger }]) => {
    if (hecho) return;
    anim = animate(piezas, { opacity: [0, 1], translateY: [14, 0], duration: 620, delay: stagger(paso), ease: 'outCubic' });
  }).catch(() => { /* Sin animación, la vista ya es usable. */ });
  return () => { hecho = true; anim?.cancel(); piezas.forEach((p) => { p.style.opacity = ''; p.style.transform = ''; }); };
}

/** La aguja busca el norte y se asienta en su rumbo con un pequeño rebote. */
export function asentarAguja(aguja: SVGGElement | null, desde: number, hasta: number): () => void {
  if (!aguja) return () => {};
  const final = `rotate(${hasta}deg)`;
  if (quieto()) { aguja.style.transform = final; return () => {}; }
  let hecho = false, anim: Parar | undefined;
  motor().then(([{ animate }]) => {
    if (hecho) return;
    anim = animate(aguja, { rotate: [desde, hasta], duration: 1500, ease: 'outElastic(1, .55)' });
  }).catch(() => { aguja.style.transform = final; });
  return () => { hecho = true; anim?.cancel(); };
}

/** Dibuja los arcos de la esfera, uno detrás de otro. */
export function trazarArcos(raiz: SVGElement | null): () => void {
  if (!raiz || quieto()) return () => {};
  const arcos = Array.from(raiz.querySelectorAll<SVGCircleElement>('.r-arco'));
  if (!arcos.length) return () => {};
  let hecho = false, anim: Parar | undefined;
  motor().then(([{ animate }, { stagger }]) => {
    if (hecho) return;
    anim = animate(arcos, { opacity: [0, 1], duration: 520, delay: stagger(90, { start: 150 }), ease: 'outQuad' });
  }).catch(() => {});
  return () => { hecho = true; anim?.cancel(); arcos.forEach((a) => { a.style.opacity = ''; }); };
}
