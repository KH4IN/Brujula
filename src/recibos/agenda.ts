// Copiado de KH4IN/Kairos (2c9efb3) src/dominio/agenda.ts: el mismo cálculo que Kairós. No editar aquí.
import { sumarDias, type Fecha } from './fechas.ts';
import { costeAnual, ocurrencias, type Cobro, type Elemento } from './elementos.ts';

export type Cita = { elemento: Elemento; fecha: Fecha; cobro: Cobro | null };

/** Últimos días de una ventana que empieza hoy: «30 días» son hoy y los 29 siguientes. */
export const finDeVentana = (hoy: Fecha, dias: number) => sumarDias(hoy, dias - 1);

const indice = (cobros: Cobro[]) => new Map(cobros.map((c) => [`${c.elemento_id}:${c.fecha_prevista}`, c]));

/** Ocurrencias de elementos activos entre dos fechas, por orden. */
export function citas(elementos: Elemento[], cobros: Cobro[], desde: Fecha, hasta: Fecha): Cita[] {
  const porClave = indice(cobros);
  return elementos
    .filter((e) => e.activo)
    .flatMap((e) => ocurrencias(e, desde, hasta).map((fecha) => ({ elemento: e, fecha, cobro: porClave.get(`${e.id}:${fecha}`) ?? null })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.elemento.nombre.localeCompare(b.elemento.nombre, 'es'));
}

/** Lo que ya debió cobrarse o vencer en los últimos días y nadie confirmó. */
export const sinConfirmar = (elementos: Elemento[], cobros: Cobro[], hoy: Fecha, dias = 10) =>
  citas(elementos, cobros, sumarDias(hoy, -dias), sumarDias(hoy, -1)).filter((c) => !c.cobro);

export const totalPrevisto = (lista: Cita[]) =>
  Math.round(lista.reduce((s, c) => s + (c.cobro?.estado === 'omitido' ? 0 : c.cobro?.importe_real ?? c.elemento.importe ?? 0), 0) * 100) / 100;

/** Solo fechas aún pendientes: los cobros confirmados siguen en el historial y el calendario. */
export const proximosPendientes = (lista: Cita[]) => lista.filter((c) => !c.cobro);

export function resumenAnual(elementos: Elemento[]) {
  const activos = elementos.filter((e) => e.activo && e.importe != null && e.frecuencia);
  const filas = activos.map((e) => ({ elemento: e, anual: costeAnual(e) })).sort((a, b) => b.anual - a.anual);
  const anual = Math.round(filas.reduce((s, f) => s + f.anual, 0) * 100) / 100;
  const porCategoria = new Map<string, number>();
  for (const f of filas) porCategoria.set(f.elemento.categoria, (porCategoria.get(f.elemento.categoria) ?? 0) + f.anual);
  return {
    filas,
    anual,
    mensual: Math.round((anual / 12) * 100) / 100,
    categorias: [...porCategoria].map(([categoria, total]) => ({ categoria, total: Math.round(total * 100) / 100 })).sort((a, b) => b.total - a.total),
  };
}
