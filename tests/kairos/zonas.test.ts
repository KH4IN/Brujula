// Copiado de KH4IN/Kairos (2c9efb3) tests/zonas.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesDeZona, ZONAS_HABITUALES, zonaValida } from '../../src/recibos/zonas.ts';

test('lista corta de zonas, todas válidas', () => {
  assert.ok(ZONAS_HABITUALES.length <= 15);
  for (const z of ZONAS_HABITUALES) assert.ok(zonaValida(z.id), z.id);
  assert.ok(!zonaValida('Marte/Olympus'));
});

test('incluye la del dispositivo y la guardada si no son habituales, sin duplicar', () => {
  const ids = opcionesDeZona('Asia/Tokyo', 'Australia/Sydney').map((z) => z.id);
  assert.equal(ids[0], 'Asia/Tokyo');
  assert.ok(ids.includes('Australia/Sydney'));
  assert.equal(opcionesDeZona('Europe/Madrid', 'Europe/Madrid').length, ZONAS_HABITUALES.length);
  assert.ok(!opcionesDeZona('Inventada/Nada', 'Europe/Madrid').some((z) => z.id === 'Inventada/Nada'));
});
