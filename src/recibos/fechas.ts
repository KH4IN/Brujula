// Copiado de KH4IN/Kairos (2c9efb3) supabase/functions/_shared/fechas.ts: el mismo cálculo que Kairós. No editar aquí.
// Fechas como texto «AAAA-MM-DD» en el calendario local del usuario. Se evita
// Date para el día a día: los cambios de hora y las zonas no mueven un recibo.

export type Fecha = string;

const partes = (fecha: Fecha) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return { a, m, d };
};

export const formar = (a: number, m: number, d: number): Fecha =>
  `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const esFecha = (valor: unknown): valor is Fecha => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const { a, m, d } = partes(valor);
  return m >= 1 && m <= 12 && d >= 1 && d <= diasDelMes(a, m);
};

export const diasDelMes = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

const aDias = (fecha: Fecha) => {
  const { a, m, d } = partes(fecha);
  return Date.UTC(a, m - 1, d) / 86_400_000;
};

const deDias = (dias: number): Fecha => {
  const f = new Date(dias * 86_400_000);
  return formar(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate());
};

export const sumarDias = (fecha: Fecha, dias: number): Fecha => deDias(aDias(fecha) + dias);

export const diferenciaDias = (desde: Fecha, hasta: Fecha) => aDias(hasta) - aDias(desde);

/** Suma meses conservando el día; si el mes es más corto, usa su último día (31 ene → 28 feb). */
export const sumarMeses = (fecha: Fecha, meses: number): Fecha => {
  const { a, m, d } = partes(fecha);
  const total = a * 12 + (m - 1) + meses;
  const na = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return formar(na, nm, Math.min(d, diasDelMes(na, nm)));
};

/** Fecha, hora y minuto actuales en una zona horaria IANA («Europe/Madrid»). */
export const ahoraEn = (zona: string, instante: Date = new Date()) => {
  const valores = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instante).map((p) => [p.type, p.value]),
  );
  return {
    fecha: `${valores.year}-${valores.month}-${valores.day}` as Fecha,
    hora: Number(valores.hour) % 24,
    minuto: Number(valores.minute),
  };
};

export const hoyLocal = (instante: Date = new Date()): Fecha =>
  formar(instante.getFullYear(), instante.getMonth() + 1, instante.getDate());
