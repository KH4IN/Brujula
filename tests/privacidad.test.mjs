import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Brújula no carga el script de analítica en la página', () => {
  const pagina = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(pagina, /\/_vercel\/insights\/script\.js/);
});
