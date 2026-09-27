export const FUENTES_NUEVAS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Azeret+Mono:wght@400;500;600&display=swap';

/** Carga las tipografías del tema nuevo una sola vez. Sin conexión se usan las del sistema. */
export function cargarFuentesNuevas() {
  if (document.getElementById('fuentes-nuevas')) return;
  const enlace = document.createElement('link');
  enlace.id = 'fuentes-nuevas';
  enlace.rel = 'stylesheet';
  enlace.href = FUENTES_NUEVAS;
  document.head.appendChild(enlace);
}
