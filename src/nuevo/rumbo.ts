/** Aspecto elegido en Configuración. «clasico» es el diseño original, oculto hasta descubrirlo. */
export type Tema = 'nuevo' | 'antiguo' | 'clasico';

export const TEMAS: readonly Tema[] = ['nuevo', 'antiguo', 'clasico'];
export const esTema = (valor: unknown): valor is Tema => typeof valor === 'string' && (TEMAS as readonly string[]).includes(valor);

/** Sin preferencia guardada, todo el mundo empieza en el tema nuevo. */
export function temaGuardado(valor: string | null): Tema {
  return esTema(valor) ? valor : 'nuevo';
}

export type Rumbo = {
  /** 0 = norte (ahorras todo), 90 = este (gastas lo que entra), 180 = sur (gastas el doble o solo hay gastos). */
  grados: number;
  /** Parte de lo que entra que queda, en tanto por ciento redondeado. null si no hay movimientos. */
  ahorro: number | null;
  zona: 'calma' | 'norte' | 'este' | 'sur';
  texto: string;
};

/** Traduce el balance del mes a una orientación de brújula. Solo lee cifras; no cambia datos. */
export function rumboDelMes(ingresos: number, gastos: number): Rumbo {
  const entra = Math.max(0, Number(ingresos) || 0), sale = Math.max(0, Number(gastos) || 0);
  if (!entra && !sale) return { grados: 0, ahorro: null, zona: 'calma', texto: 'Sin movimientos este mes. La aguja espera al primero.' };
  if (!entra) return { grados: 180, ahorro: -100, zona: 'sur', texto: 'Rumbo sur: este mes solo hay gastos registrados.' };
  const r = Math.max(-1, Math.min(1, (entra - sale) / entra));
  const grados = Math.round((1 - r) * 90);
  const ahorro = Math.round(r * 100);
  if (r >= 0.2) return { grados, ahorro, zona: 'norte', texto: `Rumbo norte: ahorras el ${ahorro} % de lo que entra.` };
  if (r >= 0) return { grados, ahorro, zona: 'este', texto: ahorro ? `Rumbo este: te queda el ${ahorro} % de lo que entra.` : 'Rumbo este: gastas justo lo que entra.' };
  return { grados, ahorro, zona: 'sur', texto: `Rumbo sur: gastas un ${-ahorro} % más de lo que entra.` };
}

/** Rumbo en formato de instrumento: siempre tres cifras (066°). */
export const grados3 = (grados: number) => `${String(Math.round(grados)).padStart(3, '0')}°`;

const PALETA: Record<string, string> = {
  Vivienda: '#3E6B58', Alimentación: '#C9A227', Transporte: '#5B7F9E', Compras: '#B0645A',
  Ocio: '#7C6BB0', Salud: '#3E9A8F', Suscripciones: '#A0527F', Otros: '#8A958F',
};
const RESERVA = ['#3E6B58', '#C9A227', '#5B7F9E', '#B0645A', '#7C6BB0', '#3E9A8F', '#A0527F', '#8A958F'];
export const colorRumbo = (categoria: string) => PALETA[categoria] ?? RESERVA[[...categoria].reduce((a, c) => a + c.charCodeAt(0), 0) % RESERVA.length];

export type Arco = { categoria: string; total: number; color: string; inicio: number; largo: number };

/** Reparte una circunferencia entre categorías de gasto, con un pequeño hueco entre arcos. */
export function arcos(grupos: { category: string; total: number }[], circunferencia: number, hueco = 3): Arco[] {
  const total = grupos.reduce((s, g) => s + Math.max(0, g.total), 0);
  if (!total) return [];
  let inicio = 0;
  return grupos.filter((g) => g.total > 0).map((g) => {
    const tramo = (g.total / total) * circunferencia;
    const arco = { categoria: g.category, total: g.total, color: colorRumbo(g.category), inicio, largo: Math.max(0.5, tramo - (grupos.length > 1 ? hueco : 0)) };
    inicio += tramo;
    return arco;
  });
}
