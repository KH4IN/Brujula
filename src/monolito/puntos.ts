// Cálculos del tema Monolito: todo se cuenta en puntos encendidos o apagados.

/** Reparte cien puntos entre los grupos en proporción a su importe (restos mayores), para que sumen siempre cien. */
export function cienPuntos<T extends { v: number }>(grupos: T[]): (T & { p: number })[] {
  const total = grupos.reduce((s, g) => s + Math.max(0, g.v), 0);
  if (total <= 0) return grupos.map((g) => ({ ...g, p: 0 }));
  const exactos = grupos.map((g) => Math.max(0, g.v) / total * 100);
  const p = exactos.map(Math.floor);
  const orden = exactos.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0, falta = 100 - p.reduce((s, x) => s + x, 0); k < falta; k++) p[orden[k][1]]++;
  return grupos.map((g, i) => ({ ...g, p: p[i] }));
}

/**
 * Medidor de un presupuesto, como en la maqueta (1 punto = 10 €): encendidos lo gastado, huecos hasta donde
 * acabarás a este ritmo y apagados hasta el límite («|»). Si te pasas, los huecos van en rojo tras la raya.
 */
export function medidorPresupuesto(gastado: number, limite: number, previsto: number) {
  const on = Math.round(gastado / 10), lim = Math.round(limite / 10), prev = Math.max(on, Math.round(previsto / 10));
  if (on > lim) return `${lim}:on,|,${on - lim}:rojo,${prev - on}:hueco-rojo`; // ya pasado: lo gastado de más, en rojo
  return prev > lim ? `${on}:on,${lim - on}:hueco-rojo,|,${prev - lim}:hueco-rojo` : `${on}:on,${prev - on}:hueco,${lim - prev}:off,|`;
}

/** Dígitos de una cifra para la matriz de puntos (5×7 por dígito); sin separador de miles. */
export const digitos = (n: number) => String(Math.round(Math.abs(n)));

/** Cuánto vale un punto para que un importe quepa en unos 120 puntos: 100 €, 200 €, 500 €, 1.000 €… */
export function unidadPuntos(total: number, max = 120) {
  for (let base = 100; ; base *= 10) for (const m of [1, 2, 5]) if (total / (base * m) <= max) return base * m;
}

/** Cuánto vale un punto en los depósitos de metas (50 € en la maqueta) para que la meta mayor no pase de 160 puntos. */
export function unidadDeposito(mayor: number) {
  for (let base = 50; ; base *= 10) for (const m of [1, 2, 4]) if (mayor / (base * m) <= 160) return base * m;
}
