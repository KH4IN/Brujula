import { build } from 'esbuild';

// Las pruebas de cálculo de Kairós (tests/kairos), compiladas al vuelo contra la copia de src/recibos.
for (const nombre of ['fechas', 'elementos', 'agenda', 'importe', 'brujula']) {
  const { outputFiles: [salida] } = await build({ entryPoints: [new URL(`./kairos/${nombre}.test.ts`, import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external' });
  await import('data:text/javascript;base64,' + Buffer.from(salida.text).toString('base64'));
}
