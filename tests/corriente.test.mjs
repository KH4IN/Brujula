import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Compila el módulo del tema Corriente al vuelo (esbuild ya está instalado con Vite).
const { outputFiles: [salida] } = await build({ entryPoints: [new URL('../src/corriente/datos.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node' });
const { corrienteDelMes, ritmos, diasTranscurridos, cifra } = await import('data:text/javascript;base64,' + Buffer.from(salida.text).toString('base64'));

test('los ríos suman lo que sale y el remanso lo que se queda', () => {
  const c = corrienteDelMes([{ category: 'Vivienda', total: 780 }, { category: 'Ocio', total: 70 }], 2480, 850, [], 'octubre');
  assert.deepEqual(c.rios.map((r) => [r.nombre, r.v]), [['Vivienda', 780], ['Ocio', 70], ['Se quedan', 1630]]);
  assert.equal(c.rios[0].pct, '92 % de lo que sale');
  assert.match(c.rios.at(-1).pct, /^El 66 % de lo que entra/);
  assert.equal(c.faltan, 0);
  assert.equal(c.tronco.pct, 'Salen 850 € en 2 ríos y se quedan 1.630 €.');
});

test('más de seis categorías se agrupan en «Otros» sin perder importe', () => {
  const grupos = ['A', 'B', 'C', 'D', 'E', 'Otros', 'F', 'G'].map((category, i) => ({ category, total: 80 - i * 10 }));
  const c = corrienteDelMes(grupos, 1000, 360, [], 'octubre');
  const gastos = c.rios.filter((r) => !r.ahorro);
  assert.equal(gastos.length, 6);
  assert.equal(gastos.at(-1).nombre, 'Otros');
  assert.equal(gastos.reduce((s, r) => s + r.v, 0), 360);
});

test('si sale más de lo que entra, nada se queda y se dice cuánto falta', () => {
  const c = corrienteDelMes([{ category: 'Vivienda', total: 900 }], 600, 900, [], 'octubre');
  assert.equal(c.quedan, 0);
  assert.equal(c.faltan, 300);
  assert.equal(corrienteDelMes([], 0, 0, [], 'octubre').vacio, true);
});

test('el ritmo de un presupuesto mira los días que han pasado del mes', () => {
  const hoy = new Date(2026, 9, 20);
  assert.deepEqual(diasTranscurridos('2026-10', hoy), { dia: 20, diasMes: 31 });
  assert.equal(diasTranscurridos('2026-09', hoy).dia, 30);
  assert.equal(diasTranscurridos('2026-11', hoy).dia, 0);
  const [ocio] = ritmos([{ category: 'Ocio', amount: 90, month: '2026-10' }], () => 70, '2026-10', hoy);
  assert.equal(Math.round(ocio.previsto * 10) / 10, 108.5);
  assert.equal(ocio.pasa, true);
  const c = corrienteDelMes([{ category: 'Ocio', total: 70 }], 100, 70, [ocio], 'octubre');
  assert.equal(c.rios[0].alerta, 'A este ritmo, +19 €');
  assert.equal(c.rios[0].pct, '100 % de lo que sale · presupuesto de 90 €');
  assert.equal(cifra(2480), '2.480');
});
