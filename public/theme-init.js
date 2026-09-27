try {
  const theme = localStorage.getItem('brujula.theme');
  document.documentElement.dataset.theme = theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}
// Tema visual antes del primer pintado, para no enseñar un instante el diseño equivocado.
try {
  const tema = localStorage.getItem('brujula.tema');
  document.documentElement.dataset.tema = tema === 'antiguo' || tema === 'clasico' ? tema : 'nuevo';
} catch {
  document.documentElement.dataset.tema = 'nuevo';
}
if (document.documentElement.dataset.tema === 'nuevo') {
  const enlace = document.createElement('link');
  enlace.id = 'fuentes-nuevas';
  enlace.rel = 'stylesheet';
  enlace.href = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Azeret+Mono:wght@400;500;600&display=swap';
  document.head.appendChild(enlace);
}
