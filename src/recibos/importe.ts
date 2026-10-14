// Copiado de KH4IN/Kairos (2c9efb3) src/dominio/importe.ts: el mismo cálculo que Kairós. No editar aquí.
/** Acepta euros positivos con hasta dos decimales, sin redondear entradas ambiguas. */
export function leerImporte(texto: string): number | null {
  const valor = texto.trim();
  if (!valor || valor.length > 16) return null;
  const simple = /^(?:0|[1-9]\d{0,8})(?:[,.]\d{1,2})?$/;
  const agrupado = /^[1-9]\d{0,2}(?:\.\d{3})+(?:,\d{1,2})?$/;
  if (!simple.test(valor) && !agrupado.test(valor)) return null;
  const numero = Number(agrupado.test(valor) ? valor.replace(/\./g, '').replace(',', '.') : valor.replace(',', '.'));
  return Number.isFinite(numero) && numero > 0 && numero <= 1e9 ? numero : null;
}
