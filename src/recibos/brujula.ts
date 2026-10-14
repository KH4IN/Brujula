// Copiado de KH4IN/Kairos (2c9efb3) src/dominio/brujula.ts: el mismo cálculo que Kairós. No editar aquí.
// Lo que Kairós entiende de Brújula. Solo LEE sus movimientos: nunca le
// envía ni le escribe nada (decisión del fundador, 27-09-2026).
import { diferenciaDias, sumarDias, sumarMeses, type Fecha } from './fechas.ts';
import { ocurrencias, type Cobro, type Elemento, type Frecuencia } from './elementos.ts';

/** Columnas de `public.transactions` de Brújula que Kairós lee. */
export type Movimiento = {
  id: string;
  amount: number;
  kind: 'income' | 'expense' | 'transfer';
  category: string;
  description: string;
  occurred_on: Fecha;
};

export type Sugerencia = {
  clave: string;
  nombre: string;
  importe: number;
  estimado: boolean;
  frecuencia: Frecuencia;
  proxima: Fecha;
  categoria: string;
  veces: number;
  ultimo: Fecha;
};

// Palabras de los extractos que no identifican al comercio.
const RUIDO = new Set([
  'compra', 'compras', 'pago', 'pagos', 'recibo', 'recibos', 'tarjeta', 'tarj', 'adeudo', 'domiciliacion',
  'domiciliado', 'sepa', 'cargo', 'transaccion', 'movil', 'online', 'www', 'com', 'es', 'sl', 'sa', 'slu',
  'de', 'del', 'la', 'el', 'en', 'con', 'por', 'ref', 'num', 'nº', 'tpv', 'visa', 'mastercard', 'debito',
  'credito', 'cuota', 'mensual', 'card', 'payment', 'purchase', 'to', 'at', 'eur',
]);

/** Descripción reducida a lo que identifica al comercio: «PAGO TARJETA SPOTIFY P1A2B3 STOCKHOLM» → «spotify stockholm». */
export function clave(descripcion: string): string {
  const palabras = descripcion
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 1 && !RUIDO.has(p) && !/\d/.test(p));
  return palabras.slice(0, 3).join(' ');
}

const mediana = (valores: number[]) => {
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

// Periodos que se reconocen y el margen de días que admite cada uno.
const PERIODOS: Array<{ dias: number; margen: number; frecuencia: Frecuencia }> = [
  { dias: 7, margen: 1, frecuencia: { unidad: 'semana', cada: 1 } },
  { dias: 30.4, margen: 4, frecuencia: { unidad: 'mes', cada: 1 } },
  { dias: 60.9, margen: 6, frecuencia: { unidad: 'mes', cada: 2 } },
  { dias: 91.3, margen: 8, frecuencia: { unidad: 'mes', cada: 3 } },
  { dias: 182.6, margen: 12, frecuencia: { unidad: 'mes', cada: 6 } },
  { dias: 365.2, margen: 15, frecuencia: { unidad: 'año', cada: 1 } },
];

const siguiente = (desde: Fecha, f: Frecuencia): Fecha =>
  f.unidad === 'semana' ? sumarDias(desde, 7 * f.cada) : f.unidad === 'mes' ? sumarMeses(desde, f.cada) : sumarMeses(desde, 12 * f.cada);

const bonito = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

/** Cargos que se repiten con ritmo regular y que aún no están en Kairós. */
export function detectarRecurrentes(movimientos: Movimiento[], elementos: Elemento[], hoy: Fecha): Sugerencia[] {
  const conocidas = new Set(elementos.flatMap((e) => [e.clave_brujula, clave(e.nombre)]).filter(Boolean));
  const grupos = new Map<string, Movimiento[]>();
  for (const m of movimientos) {
    if (m.kind !== 'expense' || !(m.amount > 0)) continue;
    const k = clave(m.description);
    if (!k || conocidas.has(k)) continue;
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }

  const sugerencias: Sugerencia[] = [];
  for (const [k, grupo] of grupos) {
    if (grupo.length < 3) continue;
    grupo.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    const intervalos = grupo.slice(1).map((m, i) => diferenciaDias(grupo[i].occurred_on, m.occurred_on));
    const tipico = mediana(intervalos);
    const periodo = PERIODOS.find((p) => Math.abs(tipico - p.dias) <= p.margen);
    if (!periodo) continue;
    // Todos los intervalos dentro del margen, salvo uno si hay muchos (un mes sin cargo).
    const fuera = intervalos.filter((d) => Math.abs(d - periodo.dias) > periodo.margen).length;
    if (fuera > (intervalos.length >= 5 ? 1 : 0)) continue;

    const importes = grupo.map((m) => m.amount);
    const importe = Math.round(mediana(importes) * 100) / 100;
    const dispersion = Math.max(...importes.map((a) => Math.abs(a - importe) / importe));
    if (dispersion > 0.3) continue; // demasiado variable para ser el mismo recibo

    const ultimo = grupo[grupo.length - 1];
    if (diferenciaDias(ultimo.occurred_on, hoy) > periodo.dias * 1.5) continue; // ya no se cobra

    let proxima = siguiente(ultimo.occurred_on, periodo.frecuencia);
    while (proxima < hoy) proxima = siguiente(proxima, periodo.frecuencia);

    sugerencias.push({
      clave: k,
      nombre: bonito(k),
      importe,
      estimado: dispersion > 0.02,
      frecuencia: periodo.frecuencia,
      proxima,
      categoria: ultimo.category,
      veces: grupo.length,
      ultimo: ultimo.occurred_on,
    });
  }
  // Primero lo que Brújula ya considera suscripción; después, lo más repetido.
  return sugerencias.sort((a, b) =>
    Number(b.categoria === 'Suscripciones') - Number(a.categoria === 'Suscripciones') || b.veces - a.veces);
}

export type Conciliacion = { elemento_id: string; fecha_prevista: Fecha; movimiento: Movimiento };

/**
 * Busca en Brújula el cargo de cada ocurrencia reciente todavía sin cobro:
 * mismo comercio, ±3 días e importe parecido (±10 %, o ±40 % si es estimado).
 */
export function conciliar(elementos: Elemento[], cobros: Cobro[], movimientos: Movimiento[], hoy: Fecha, dias = 45): Conciliacion[] {
  const cerradas = new Set(cobros.map((c) => `${c.elemento_id}:${c.fecha_prevista}`));
  const usados = new Set(cobros.map((c) => c.transaction_id).filter(Boolean));
  const gastos = movimientos.filter((m) => m.kind === 'expense');
  const resultado: Conciliacion[] = [];
  for (const e of elementos) {
    if (!e.activo || e.importe == null) continue;
    const k = e.clave_brujula ?? clave(e.nombre);
    if (!k) continue;
    const tolerancia = e.estimado ? 0.4 : 0.1;
    for (const fecha of ocurrencias(e, sumarDias(hoy, -dias), hoy)) {
      if (cerradas.has(`${e.id}:${fecha}`)) continue;
      const candidato = gastos
        .filter((m) => !usados.has(m.id))
        .filter((m) => Math.abs(diferenciaDias(fecha, m.occurred_on)) <= 3)
        .filter((m) => Math.abs(m.amount - e.importe!) <= e.importe! * tolerancia)
        .filter((m) => {
          const km = clave(m.description);
          return km === k || km.startsWith(k) || k.startsWith(km) || km.split(' ')[0] === k.split(' ')[0];
        })
        .sort((a, b) => Math.abs(diferenciaDias(fecha, a.occurred_on)) - Math.abs(diferenciaDias(fecha, b.occurred_on)))[0];
      if (candidato) {
        usados.add(candidato.id);
        resultado.push({ elemento_id: e.id, fecha_prevista: fecha, movimiento: candidato });
      }
    }
  }
  return resultado;
}
