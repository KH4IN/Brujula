// Copiado de KH4IN/Kairos (2c9efb3) tests/importe.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerImporte } from '../../src/recibos/importe.ts';

test('admite euros con dos decimales y separador español', () => {
  assert.equal(leerImporte('10,99'), 10.99);
  assert.equal(leerImporte('10.99'), 10.99);
  assert.equal(leerImporte('1.234,56'), 1234.56);
  assert.equal(leerImporte('0,01'), 0.01);
});

test('rechaza signos, ceros sin valor y decimales excesivos', () => {
  for (const valor of ['-8', '0', '0,00', '1,234', '1.2345', '0000000001', '00000000000000000000001', '1e9', '1,', '1.234.56']) {
    assert.equal(leerImporte(valor), null, valor);
  }
});
