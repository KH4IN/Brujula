import { build } from 'esbuild';

// Las pruebas de cálculo de Faro (tests/faro), compiladas al vuelo contra la copia de src/metas.
for (const nombre of ['fechas', 'metas']) {
  const { outputFiles: [salida] } = await build({ entryPoints: [new URL(`./faro/${nombre}.test.ts`, import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external' });
  await import('data:text/javascript;base64,' + Buffer.from(salida.text).toString('base64'));
}
