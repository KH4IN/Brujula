// Copiado de KH4IN/Kairos (2c9efb3) supabase/functions/_shared/elementos.ts: el mismo cálculo que Kairós. No editar aquí.
import { diferenciaDias, sumarDias, sumarMeses, type Fecha } from './fechas.ts';

export const TIPOS = ['suscripcion', 'recibo', 'seguro', 'impuesto', 'vencimiento'] as const;
export type Tipo = (typeof TIPOS)[number];
export const NOMBRE_TIPO: Record<Tipo, string> = {
  suscripcion: 'Suscripción', recibo: 'Recibo', seguro: 'Seguro', impuesto: 'Impuesto', vencimiento: 'Vencimiento',
};

// Las mismas categorías que Brújula, para que la conexión sea directa.
export const CATEGORIAS = ['Vivienda', 'Alimentación', 'Transporte', 'Compras', 'Ocio', 'Salud', 'Suscripciones', 'Otros'] as const;

export type Unidad = 'dia' | 'semana' | 'mes' | 'año';
export type Frecuencia = { unidad: Unidad; cada: number };

export type Elemento = {
  id: string;
  user_id?: string;
  nombre: string;
  tipo: Tipo;
  importe: number | null; // null: vencimiento sin dinero (ITV, pasaporte)
  estimado: boolean; // importe aproximado (la luz)
  frecuencia: Frecuencia | null; // null: ocurre una sola vez
  inicio: Fecha; // primera fecha de cobro o vencimiento; ancla de las repeticiones
  antelacion_dias: number | null; // null: la antelación por defecto del usuario
  fin_permanencia: Fecha | null;
  categoria: string;
  notas: string;
  clave_brujula: string | null; // descripción normalizada para reconocerlo en Brújula
  activo: boolean;
  actualizado: string;
};

export type Cobro = {
  id: string;
  user_id?: string;
  elemento_id: string;
  fecha_prevista: Fecha;
  fecha_real: Fecha | null;
  importe_real: number | null;
  estado: 'pagado' | 'omitido';
  transaction_id: string | null; // movimiento de Brújula con el que se concilió
  actualizado: string;
};

export type Ajustes = {
  user_id?: string;
  hora_aviso: number; // 0–23, en la zona del usuario
  minuto_aviso: number; // 0–59: la hora exacta la elige cada usuario
  zona_horaria: string;
  antelacion_por_defecto: number;
  canal_push: boolean;
  canal_correo: boolean;
  importes_en_push: boolean;
  actualizado: string;
};

export const ajustesIniciales = (zona = 'Europe/Madrid'): Ajustes => ({
  hora_aviso: 9, minuto_aviso: 0, zona_horaria: zona, antelacion_por_defecto: 3,
  canal_push: false, canal_correo: false, importes_en_push: false, actualizado: new Date(0).toISOString(),
});

const MAX_OCURRENCIAS = 5000;

/** La n-ésima fecha contando desde el ancla, sin acumular recortes de fin de mes. */
export const ocurrencia = (e: Pick<Elemento, 'inicio' | 'frecuencia'>, n: number): Fecha => {
  if (!e.frecuencia || n === 0) return e.inicio;
  const { unidad, cada } = e.frecuencia;
  if (unidad === 'dia') return sumarDias(e.inicio, n * cada);
  if (unidad === 'semana') return sumarDias(e.inicio, n * cada * 7);
  if (unidad === 'mes') return sumarMeses(e.inicio, n * cada);
  return sumarMeses(e.inicio, n * cada * 12);
};

/** Ocurrencias entre `desde` y `hasta`, ambas incluidas. */
export const ocurrencias = (e: Pick<Elemento, 'inicio' | 'frecuencia'>, desde: Fecha, hasta: Fecha): Fecha[] => {
  if (hasta < desde) return [];
  if (!e.frecuencia) return e.inicio >= desde && e.inicio <= hasta ? [e.inicio] : [];
  const resultado: Fecha[] = [];
  // Salto aproximado para no recorrer años de historia en elementos antiguos.
  const periodo = diasPorPeriodo(e.frecuencia);
  let n = Math.max(0, Math.floor(diferenciaDias(e.inicio, desde) / periodo) - 1);
  for (let i = 0; i < MAX_OCURRENCIAS; i++, n++) {
    const f = ocurrencia(e, n);
    if (f > hasta) break;
    if (f >= desde) resultado.push(f);
  }
  return resultado;
};

export const diasPorPeriodo = (f: Frecuencia) =>
  f.cada * (f.unidad === 'dia' ? 1 : f.unidad === 'semana' ? 7 : f.unidad === 'mes' ? 30.436875 : 365.2425);

/** Coste de un año completo. Los vencimientos sin importe cuentan cero. */
export const costeAnual = (e: Pick<Elemento, 'importe' | 'frecuencia'>) => {
  if (e.importe == null) return 0;
  if (!e.frecuencia) return 0; // pago único: no es un coste recurrente
  return Math.round((e.importe * 365.2425) / diasPorPeriodo(e.frecuencia) * 100) / 100;
};

export const describirFrecuencia = (f: Frecuencia | null) => {
  if (!f) return 'Una vez';
  const nombres: Record<Unidad, [string, string]> = {
    dia: ['Cada día', 'días'], semana: ['Cada semana', 'semanas'], mes: ['Cada mes', 'meses'], año: ['Cada año', 'años'],
  };
  if (f.cada === 1) return nombres[f.unidad][0];
  if (f.unidad === 'mes' && f.cada === 2) return 'Cada dos meses';
  if (f.unidad === 'mes' && f.cada === 3) return 'Cada trimestre';
  if (f.unidad === 'mes' && f.cada === 6) return 'Cada semestre';
  return `Cada ${f.cada} ${nombres[f.unidad][1]}`;
};

export const antelacionDe = (e: Pick<Elemento, 'antelacion_dias'>, a: Pick<Ajustes, 'antelacion_por_defecto'>) =>
  e.antelacion_dias ?? a.antelacion_por_defecto;

/** «09:05»: la hora de aviso tal como la eligió el usuario. */
export const horaAviso = (a: Pick<Ajustes, 'hora_aviso' | 'minuto_aviso'>) =>
  `${String(a.hora_aviso).padStart(2, '0')}:${String(a.minuto_aviso ?? 0).padStart(2, '0')}`;
