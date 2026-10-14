// Copiado de KH4IN/Kairos (2c9efb3) tests/brujula.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clave, conciliar, detectarRecurrentes, type Movimiento } from '../../src/recibos/brujula.ts';
import type { Elemento } from '../../src/recibos/elementos.ts';

let n = 0;
const mov = (description: string, amount: number, occurred_on: string, cambios: Partial<Movimiento> = {}): Movimiento =>
  ({ id: `m${++n}`, amount, kind: 'expense', category: 'Otros', description, occurred_on, ...cambios });

test('clave del comercio', () => {
  assert.equal(clave('PAGO TARJETA SPOTIFY P1A2B3 STOCKHOLM'), 'spotify stockholm');
  assert.equal(clave('Recibo Iberdrola Clientes S.A.U.'), 'iberdrola clientes');
  assert.equal(clave('Compra 1234'), '');
});

const historia = [
  mov('SPOTIFY P1A2B3', 10.99, '2026-06-03', { category: 'Suscripciones' }),
  mov('SPOTIFY P9Z8Y7', 10.99, '2026-07-03', { category: 'Suscripciones' }),
  mov('SPOTIFY P4Q5R6', 10.99, '2026-08-04', { category: 'Suscripciones' }),
  mov('SPOTIFY P7K8L9', 10.99, '2026-09-03', { category: 'Suscripciones' }),
  mov('Recibo Iberdrola', 58.2, '2026-05-20'),
  mov('Recibo Iberdrola', 71.4, '2026-07-21'),
  mov('Recibo Iberdrola', 64.9, '2026-09-19'),
  mov('Mercadona', 76.4, '2026-08-05'),
  mov('Mercadona', 12.1, '2026-08-09'),
  mov('Mercadona', 50.3, '2026-08-20'),
  mov('Nómina', 1850, '2026-08-01', { kind: 'income' }),
  mov('Nómina', 1850, '2026-09-01', { kind: 'income' }),
  mov('Nómina', 1850, '2026-07-01', { kind: 'income' }),
];

test('detecta suscripciones y recibos bimestrales, no la compra del súper ni ingresos', () => {
  const s = detectarRecurrentes(historia, [], '2026-09-27');
  assert.deepEqual(s.map((x) => x.clave), ['spotify', 'iberdrola']);
  assert.deepEqual(s[0].frecuencia, { unidad: 'mes', cada: 1 });
  assert.equal(s[0].proxima, '2026-10-03');
  assert.equal(s[0].estimado, false);
  assert.deepEqual(s[1].frecuencia, { unidad: 'mes', cada: 2 });
  assert.equal(s[1].estimado, true);
});

test('no sugiere lo que ya existe ni lo que dejó de cobrarse', () => {
  const existente = { nombre: 'Spotify', clave_brujula: null } as Elemento;
  assert.deepEqual(detectarRecurrentes(historia, [existente], '2026-09-27').map((x) => x.clave), ['iberdrola']);
  assert.deepEqual(detectarRecurrentes(historia.slice(0, 3), [], '2027-03-01'), []);
});

test('concilia la ocurrencia con el cargo real', () => {
  const spotify: Elemento = {
    id: 'e1', nombre: 'Spotify', tipo: 'suscripcion', importe: 10.99, estimado: false,
    frecuencia: { unidad: 'mes', cada: 1 }, inicio: '2026-06-03', antelacion_dias: null, fin_permanencia: null,
    categoria: 'Suscripciones', notas: '', clave_brujula: 'spotify', activo: true, actualizado: '',
  };
  const resultado = conciliar([spotify], [], historia, '2026-08-10');
  assert.deepEqual(resultado.map((r) => [r.fecha_prevista, r.movimiento.occurred_on]), [['2026-07-03', '2026-07-03'], ['2026-08-03', '2026-08-04']]);
  // Un importe muy distinto no concilia.
  assert.deepEqual(conciliar([{ ...spotify, importe: 15.99 }], [], historia, '2026-08-10'), []);
});
