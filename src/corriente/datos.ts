/* Cifras de presentación del tema Corriente. Solo reparten importes que App ya calcula; no cambian datos. */
import type { Budget } from '../data';

export type Rio = { id: string; nombre: string; v: number; pct: string; alerta?: string; ahorro?: boolean };
export type Corriente = {
  entran: number; salen: number; quedan: number; faltan: number;
  /** Ríos de gasto, de mayor a menor (como mucho seis) y el remanso «Se quedan». */
  rios: Rio[];
  tronco: { nombre: string; pct: string };
  vacio: boolean;
};
export type Ritmo = { nombre: string; gastado: number; limite: number; previsto: number; pasa: boolean };

const MAX_RIOS = 6;
const entero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' as unknown as boolean });
/** 2.480 · sin decimales, como en el diseño. */
export const cifra = (n: number) => entero.format(Math.round(n)).replace('-', '−');

/** Días transcurridos del mes elegido: el de hoy si es el mes en curso, el mes entero si ya pasó y 0 si aún no empezó. */
export function diasTranscurridos(mes: string, hoy = new Date()): { dia: number; diasMes: number } {
  const [y, m] = mes.split('-').map(Number), diasMes = new Date(y, m, 0).getDate();
  const actual = hoy.getFullYear() * 12 + hoy.getMonth(), elegido = y * 12 + m - 1;
  return { dia: elegido < actual ? diasMes : elegido > actual ? 0 : hoy.getDate(), diasMes };
}

/** Lo que llevas gastado en cada presupuesto y dónde acabarás a este ritmo. */
export function ritmos(presupuestos: Budget[], gastado: (categoria: string) => number, mes: string, hoy = new Date()): Ritmo[] {
  const { dia, diasMes } = diasTranscurridos(mes, hoy);
  return presupuestos.map((p) => {
    const g = gastado(p.category), limite = Number(p.amount);
    const previsto = dia > 0 ? g * diasMes / dia : g;
    return { nombre: p.category, gastado: g, limite, previsto, pasa: previsto > limite };
  });
}

/** Los ríos del mes: los gastos por categoría (los más grandes y «Otros») y lo que se queda. */
export function corrienteDelMes(grupos: { category: string; total: number }[], entran: number, salen: number,
  presupuestos: Ritmo[], nombreMes: string): Corriente {
  const quedan = Math.max(0, entran - salen), faltan = Math.max(0, salen - entran);
  const ordenados = [...grupos].filter((g) => g.total > 0).sort((a, b) => b.total - a.total);
  const propios = ordenados.slice(0, ordenados.length > MAX_RIOS ? MAX_RIOS - 1 : MAX_RIOS);
  const resto = ordenados.slice(propios.length).reduce((s, g) => s + g.total, 0);
  const gastos = propios.map((g) => ({ nombre: g.category, v: g.total }));
  if (resto > 0) {
    const otros = gastos.find((g) => g.nombre === 'Otros');
    if (otros) otros.v += resto; else gastos.push({ nombre: 'Otros', v: resto });
  }
  const rios: Rio[] = gastos.map((g, i) => {
    const p = presupuestos.find((r) => r.nombre === g.nombre);
    const pct = `${Math.round(g.v / salen * 100)} % de lo que sale${p ? ` · presupuesto de ${cifra(p.limite)} €` : ''}`;
    return { id: `r${i}`, nombre: g.nombre, v: g.v, pct, alerta: p?.pasa ? `A este ritmo, +${cifra(p.previsto - p.limite)} €` : undefined };
  });
  rios.push({ id: 'aho', nombre: 'Se quedan', v: quedan, ahorro: true,
    pct: entran > 0 ? `El ${Math.round(quedan / entran * 100)} % de lo que entra. Es tu remanso de ${nombreMes}.` : 'Este mes no ha entrado dinero.' });
  const n = gastos.length;
  return {
    entran, salen, quedan, faltan, rios, vacio: entran <= 0 && salen <= 0,
    tronco: { nombre: `Entran en ${nombreMes}`, pct: `Salen ${cifra(salen)} € en ${n === 1 ? 'un río' : `${n} ríos`} y se quedan ${cifra(quedan)} €.` },
  };
}

type Mov = { id: string; kind: 'income' | 'expense' | 'transfer'; amount: number; occurred_on: string };

/** Lo que sale cada día del mes elegido y cuántos movimientos hubo, hasta hoy si es el mes en curso. */
export function pulsoDelMes(movs: Mov[], mes: string, hoy = new Date()) {
  const { dia, diasMes } = diasTranscurridos(mes, hoy);
  const gasto = new Array<number>(diasMes).fill(0), cuantos = new Array<number>(diasMes).fill(0);
  for (const m of movs) {
    if (!m.occurred_on.startsWith(mes)) continue;
    const d = Number(m.occurred_on.slice(8, 10)) - 1;
    if (d < 0 || d >= diasMes) continue;
    cuantos[d]++;
    if (m.kind === 'expense') gasto[d] += Number(m.amount);
  }
  const enCurso = mes === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  return { hoy: dia, diasMes, enCurso, gasto, cuantos };
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
/** «Hoy», «Ayer» o «Lunes 18». */
export function nombreDia(fecha: string, hoy = new Date()) {
  const d = new Date(`${fecha}T12:00:00`), h = new Date(hoy); h.setHours(12, 0, 0, 0);
  const dif = Math.round((h.getTime() - d.getTime()) / 86400000);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Ayer';
  const n = DIAS[d.getDay()];
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${d.getDate()}`;
}

/** Movimientos agrupados por día, del más reciente al más antiguo, con lo que salió ese día. */
export function porDias<T extends Mov>(movs: T[]) {
  const dias = new Map<string, T[]>();
  for (const m of [...movs].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))) {
    const l = dias.get(m.occurred_on); if (l) l.push(m); else dias.set(m.occurred_on, [m]);
  }
  return [...dias].map(([fecha, lista]) => ({ fecha, lista, sale: lista.reduce((s, m) => s + (m.kind === 'expense' ? Number(m.amount) : 0), 0) }));
}

const mesAño = (f: string) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${f}T12:00:00`));

/** Lo que falta de un objetivo de ahorro de Brújula y lo que tocaría apartar cada mes para llegar a tiempo. */
export function detalleAhorro(g: { target_amount: number; saved_amount: number; due_on: string | null }, hoy: string) {
  const falta = Math.max(0, Number(g.target_amount) - Number(g.saved_amount));
  if (!falta) return 'Conseguida';
  if (!g.due_on) return `Faltan ${cifra(falta)} € · sin fecha`;
  const [a, m] = hoy.split('-').map(Number), [da, dm] = g.due_on.split('-').map(Number);
  const meses = (da - a) * 12 + (dm - m);
  return meses > 0 ? `${cifra(falta / meses)} € al mes · ${mesAño(g.due_on)}` : `Faltan ${cifra(falta)} € · el plazo ${g.due_on < hoy ? 'era' : 'es'} ${mesAño(g.due_on)}`;
}

