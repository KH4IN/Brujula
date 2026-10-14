/* Cálculos de presentación del tema «Carta». Solo leen cifras ya guardadas; nunca cambian datos. */
import type { Transaction } from '../data';

/** Los atajos globales no interrumpen un campo en el que se está escribiendo. */
export const esCampoDeEdicion = (etiqueta: string | undefined, editable: boolean): boolean =>
  editable || etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT';

export const diasDelMes = (mes: string) => new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();

export type Dia = { dia: number; fecha: string; entra: number; sale: number; acumulado: number };

/** Recorrido del mes día a día: lo que entra, lo que sale y el saldo acumulado. Los traspasos no cuentan. */
export function rutaDelMes(movimientos: Transaction[], mes: string): Dia[] {
  const total = diasDelMes(mes);
  const dias: Dia[] = Array.from({ length: total }, (_, i) => ({
    dia: i + 1, fecha: `${mes}-${String(i + 1).padStart(2, '0')}`, entra: 0, sale: 0, acumulado: 0,
  }));
  for (const t of movimientos) {
    if (!t.occurred_on?.startsWith(mes) || t.kind === 'transfer') continue;
    const d = Number(t.occurred_on.slice(8, 10));
    if (!(d >= 1 && d <= total)) continue;
    const importe = Math.abs(Number(t.amount) || 0);
    if (t.kind === 'income') dias[d - 1].entra += importe;
    else dias[d - 1].sale += importe;
  }
  let acumulado = 0;
  for (const d of dias) { acumulado += d.entra - d.sale; d.acumulado = Math.round(acumulado * 100) / 100; }
  return dias;
}

/** Días ya recorridos del mes respecto a hoy: todos si el mes pasó, 0 si aún no ha llegado. */
export function diasRecorridos(mes: string, hoy: string): number {
  const mesHoy = hoy.slice(0, 7);
  if (mes < mesHoy) return diasDelMes(mes);
  if (mes > mesHoy) return 0;
  return Number(hoy.slice(8, 10));
}

/** Gasto previsto a fin de mes si se mantiene el ritmo actual. En meses cerrados es el gasto real. */
export function previsionGasto(gastado: number, mes: string, hoy: string): number {
  const recorridos = diasRecorridos(mes, hoy), total = diasDelMes(mes);
  if (recorridos >= total) return gastado;
  if (recorridos <= 0) return gastado;
  return Math.round((gastado / recorridos) * total * 100) / 100;
}

/** Mes (AAAA-MM) en el que se alcanza un objetivo apartando una cantidad fija cada mes. null si no se llega nunca. */
export function mesDeLlegada(objetivo: number, ahorrado: number, aporteMensual: number, hoy: string): string | null {
  const falta = Math.max(0, (Number(objetivo) || 0) - (Number(ahorrado) || 0));
  if (!falta) return hoy.slice(0, 7);
  if (!(aporteMensual > 0)) return null;
  const meses = Math.ceil(falta / aporteMensual);
  const fecha = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 + meses, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

/** Diferencia en meses entre dos meses AAAA-MM (positivo si «a» es posterior a «b»). */
export const mesesEntre = (a: string, b: string) =>
  (Number(a.slice(0, 4)) - Number(b.slice(0, 4))) * 12 + Number(a.slice(5, 7)) - Number(b.slice(5, 7));

/** Ángulo (0 = norte, en sentido horario) de un punto respecto al centro. */
export function rumboDelPuntero(x: number, y: number, cx: number, cy: number): number {
  const grados = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return (grados + 360) % 360;
}
