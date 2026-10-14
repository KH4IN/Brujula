// Copiado de KH4IN/Faro (0a09f70) supabase/functions/_shared/metas.ts: el mismo cálculo que Faro. No editar aquí.
// Metas, pasos y revisión semanal. Lo usan la app y la Edge Function de avisos.
import { ahoraEn, diaSemana, diferenciaDias, lunesDe, sumarDias, type Fecha } from './fechas.ts';

export const TIPOS_PROGRESO = ['pasos', 'numero', 'dinero', 'habito'] as const;
export type TipoProgreso = (typeof TIPOS_PROGRESO)[number];
export const NOMBRE_PROGRESO: Record<TipoProgreso, string> = {
  pasos: 'Por pasos (hecho o no)',
  numero: 'Un número (km, libros…)',
  dinero: 'Dinero',
  habito: 'Hábito semanal',
};

export const ESTADOS = ['activa', 'pausada', 'lograda', 'abandonada'] as const;
export type EstadoMeta = (typeof ESTADOS)[number];

export type Meta = {
  id: string;
  user_id?: string;
  titulo: string;
  motivo: string; // «¿por qué me importa?»
  progreso: TipoProgreso;
  objetivo: number | null; // número: cantidad; dinero: euros; hábito: veces por semana; pasos: null
  unidad: string; // «km», «libros»; vacío si no aplica
  objetivo_brujula: string | null; // objetivo de ahorro de Brújula enlazado (solo lectura)
  inicio: Fecha;
  fecha_limite: Fecha | null;
  estado: EstadoMeta;
  actualizado: string;
};

export type Paso = {
  id: string;
  user_id?: string;
  meta_id: string;
  texto: string;
  hecho: boolean;
  fecha_hecho: Fecha | null;
  orden: number;
  actualizado: string;
};

/** Una anotación de avance: kilómetros, una aportación de dinero o un día de hábito. */
export type Registro = {
  id: string;
  user_id?: string;
  meta_id: string;
  fecha: Fecha;
  valor: number;
  nota: string;
  actualizado: string;
};

export type Revision = {
  id: string;
  user_id?: string;
  semana: Fecha; // lunes de la semana revisada
  avances: string;
  frenos: string;
  focos: string[]; // pasos elegidos como próximo paso de cada meta
  actualizado: string;
};

export type Ajustes = {
  user_id?: string;
  dia_revision: number; // 1 lunes … 7 domingo
  hora_revision: number; // 0–23 en la zona del usuario
  minuto_revision: number; // 0–59
  zona_horaria: string;
  canal_push: boolean;
  canal_correo: boolean;
  actualizado: string;
};

export const ajustesIniciales = (zona = 'Europe/Madrid'): Ajustes => ({
  dia_revision: 7, hora_revision: 19, minuto_revision: 0, zona_horaria: zona,
  canal_push: false, canal_correo: false, actualizado: new Date(0).toISOString(),
});

/** Objetivo de ahorro tal como lo guarda Brújula (tabla `goals`). Faro solo lo lee. */
export type ObjetivoBrujula = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  due_on: Fecha | null;
};

export const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
export const nombreDia = (n: number) => DIAS[(n - 1 + 7) % 7];

/** «19:05»: la hora de la revisión tal como la eligió el usuario. */
export const horaRevision = (a: Pick<Ajustes, 'hora_revision' | 'minuto_revision'>) =>
  `${String(a.hora_revision).padStart(2, '0')}:${String(a.minuto_revision ?? 0).padStart(2, '0')}`;

const numero = (n: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(n);
const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export type Progreso = { actual: number; objetivo: number; fraccion: number; texto: string; desdeBrujula: boolean };

const acotar = (x: number) => Math.min(1, Math.max(0, x));
const suma = (registros: Registro[]) => Math.round(registros.reduce((s, r) => s + r.valor, 0) * 100) / 100;

/** Días distintos con registro en la semana que empieza en `lunes`. */
export const diasEnSemana = (registros: Registro[], lunes: Fecha) => {
  const fin = sumarDias(lunes, 6);
  return new Set(registros.filter((r) => r.fecha >= lunes && r.fecha <= fin).map((r) => r.fecha)).size;
};

export function progreso(meta: Meta, pasos: Paso[], registros: Registro[], brujula: ObjetivoBrujula[], hoy: Fecha): Progreso {
  const propios = registros.filter((r) => r.meta_id === meta.id);
  const lograda = meta.estado === 'lograda';
  let p: Progreso;
  if (meta.progreso === 'pasos') {
    const lista = pasos.filter((x) => x.meta_id === meta.id);
    const hechos = lista.filter((x) => x.hecho).length;
    const texto = lista.length ? `${hechos} de ${lista.length} pasos` : 'Sin pasos todavía';
    p = { actual: hechos, objetivo: lista.length, fraccion: lista.length ? hechos / lista.length : 0, texto, desdeBrujula: false };
  } else if (meta.progreso === 'habito') {
    const objetivo = meta.objetivo ?? 1;
    const actual = diasEnSemana(propios, lunesDe(hoy));
    p = { actual, objetivo, fraccion: acotar(actual / objetivo), texto: `${actual} de ${objetivo} ${objetivo === 1 ? 'vez' : 'veces'} esta semana`, desdeBrujula: false };
  } else if (meta.progreso === 'dinero') {
    const enlazado = meta.objetivo_brujula ? brujula.find((g) => g.id === meta.objetivo_brujula) : undefined;
    // Si está enlazado, Brújula manda: su objetivo y lo ahorrado se leen de allí.
    const actual = enlazado ? Number(enlazado.saved_amount) : suma(propios);
    const objetivo = enlazado ? Number(enlazado.target_amount) : (meta.objetivo ?? 0);
    p = {
      actual, objetivo, fraccion: objetivo > 0 ? acotar(actual / objetivo) : 0,
      texto: objetivo > 0 ? `${euros(actual)} de ${euros(objetivo)}` : euros(actual), desdeBrujula: Boolean(enlazado),
    };
  } else {
    const actual = suma(propios);
    const objetivo = meta.objetivo ?? 0;
    const unidad = meta.unidad ? ` ${meta.unidad}` : '';
    p = {
      actual, objetivo, fraccion: objetivo > 0 ? acotar(actual / objetivo) : 0,
      texto: objetivo > 0 ? `${numero(actual)} de ${numero(objetivo)}${unidad}` : `${numero(actual)}${unidad}`, desdeBrujula: false,
    };
  }
  return lograda ? { ...p, fraccion: 1 } : p;
}

export type Ritmo = 'adelantada' | 'en-ritmo' | 'detras' | 'vencida';
export const TEXTO_RITMO: Record<Ritmo, string> = {
  adelantada: 'Por delante', 'en-ritmo': 'A buen ritmo', detras: 'Por detrás', vencida: 'Plazo pasado',
};

/** Compara lo avanzado con el tiempo transcurrido hasta el plazo. Los hábitos no tienen ritmo: se miden por semana. */
export function ritmo(meta: Meta, p: Progreso, hoy: Fecha): Ritmo | null {
  if (meta.estado !== 'activa' || !meta.fecha_limite || meta.progreso === 'habito') return null;
  if (p.fraccion >= 1) return 'adelantada';
  if (hoy > meta.fecha_limite) return 'vencida';
  const total = diferenciaDias(meta.inicio, meta.fecha_limite);
  if (total <= 0 || hoy < meta.inicio) return null;
  const esperado = acotar(diferenciaDias(meta.inicio, hoy) / total);
  if (p.fraccion >= esperado + 0.1) return 'adelantada';
  if (p.fraccion >= esperado - 0.1) return 'en-ritmo';
  return 'detras';
}

/** Semanas seguidas cumpliendo el hábito. La semana en curso cuenta solo si ya se cumplió. */
export function racha(meta: Meta, registros: Registro[], hoy: Fecha): number {
  if (meta.progreso !== 'habito') return 0;
  const propios = registros.filter((r) => r.meta_id === meta.id);
  const objetivo = meta.objetivo ?? 1;
  let lunes = lunesDe(hoy);
  let semanas = 0;
  if (diasEnSemana(propios, lunes) >= objetivo) semanas++;
  for (let i = 0; i < 520; i++) {
    lunes = sumarDias(lunes, -7);
    if (lunes < lunesDe(meta.inicio) || diasEnSemana(propios, lunes) < objetivo) break;
    semanas++;
  }
  return semanas;
}

/** Semana en curso (su lunes) y si ya llegó el momento de la revisión, en la zona del usuario. */
export function momentoRevision(ajustes: Ajustes, instante: Date = new Date()) {
  const { fecha: hoy, hora, minuto } = ahoraEn(ajustes.zona_horaria, instante);
  const dia = diaSemana(hoy);
  const ahora = hora * 60 + minuto;
  const momento = ajustes.hora_revision * 60 + (ajustes.minuto_revision ?? 0);
  return { hoy, semana: lunesDe(hoy), llego: dia > ajustes.dia_revision || (dia === ajustes.dia_revision && ahora >= momento) };
}

/** La revisión de esta semana, si ya toca y aún no está hecha. La clave evita avisar dos veces. */
export function revisionPendiente(ajustes: Ajustes, revisiones: Pick<Revision, 'semana'>[], instante: Date = new Date()) {
  const { semana, llego } = momentoRevision(ajustes, instante);
  if (!llego || revisiones.some((r) => r.semana === semana)) return null;
  return { semana, clave: `revision:${semana}` };
}

export function textoRecordatorio(activas: number) {
  const metas = activas === 1 ? 'tu meta' : `tus ${activas} metas`;
  return {
    titulo: 'Faro: revisión semanal',
    cuerpo: `Tres preguntas y listo: mira cómo van ${metas} y elige el próximo paso.`,
  };
}

/** Objetivos de ahorro de Brújula que aún no están enlazados a ninguna meta ni se descartaron. */
export const objetivosSinMeta = (brujula: ObjetivoBrujula[], metas: Meta[], ignorados: string[]) =>
  brujula.filter((g) => !ignorados.includes(g.id) && !metas.some((m) => m.objetivo_brujula === g.id));

/** Faro funciona mejor con pocas metas a la vez. */
export const MAX_RECOMENDADO = 5;

export function validarMeta(m: Meta): string | null {
  if (!m.titulo.trim()) return 'Ponle un nombre a la meta.';
  if (m.titulo.trim().length > 80) return 'El nombre es demasiado largo (máximo 80 caracteres).';
  if (m.motivo.length > 500) return 'El motivo es demasiado largo (máximo 500 caracteres).';
  if (m.fecha_limite && m.fecha_limite < m.inicio) return 'El plazo no puede ser anterior al inicio.';
  if (m.progreso === 'habito' && !(Number.isInteger(m.objetivo) && m.objetivo! >= 1 && m.objetivo! <= 7))
    return 'Un hábito semanal va de 1 a 7 veces por semana.';
  if (m.progreso === 'numero' && !(m.objetivo != null && m.objetivo > 0)) return 'Indica la cantidad que quieres alcanzar.';
  if (m.progreso === 'dinero' && !m.objetivo_brujula && !(m.objetivo != null && m.objetivo > 0))
    return 'Indica cuánto dinero necesitas o enlaza un objetivo de ahorro de Brújula.';
  return null;
}
