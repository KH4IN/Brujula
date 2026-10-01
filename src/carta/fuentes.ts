export const FUENTES_CARTA = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap';

/** Carga las tipografías del tema «Carta» una sola vez. Sin conexión se usan las del sistema. */
export function cargarFuentesCarta() {
  if (document.getElementById('fuentes-carta')) return;
  const enlace = document.createElement('link');
  enlace.id = 'fuentes-carta';
  enlace.rel = 'stylesheet';
  enlace.href = FUENTES_CARTA;
  document.head.appendChild(enlace);
}
