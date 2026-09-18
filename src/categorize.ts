// Rules run only when the bank has not supplied a category. Use token boundaries
// to avoid treating words such as «diario» as a purchase at Día.
const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const MERCHANTS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: 'Mercadona', pattern: /\bmercadona\b/ },
  { name: 'Lidl', pattern: /\blidl\b/ },
  { name: 'Aldi', pattern: /\baldi\b/ },
  { name: 'Día', pattern: /\b(?:supermercados?\s+dia|dia\s+(?:supermercado|market|\d{3,})|tiendas?\s+dia|(?:compra|tpv|pago tarjeta).{0,40}\bdia\b)/ },
  { name: 'Carrefour', pattern: /\bcarrefour\b/ },
  { name: 'Alcampo', pattern: /\balcampo\b/ },
  { name: 'Eroski', pattern: /\beroski\b/ },
  { name: 'Consum', pattern: /\bconsum\b/ },
  { name: 'Caprabo', pattern: /\bcaprabo\b/ },
  { name: 'El Corte Inglés', pattern: /\b(?:el\s+corte\s+ingles|hipercor|supercor)\b/ },
  { name: 'Auchan', pattern: /\bauchan\b/ },
  { name: 'Tesco', pattern: /\btesco\b/ },
  { name: 'Ahold Delhaize', pattern: /\b(?:ahold|delhaize)\b/ },
];

export function merchantFor(description: string): string | null {
  const value = clean(description);
  return MERCHANTS.find(({ pattern }) => pattern.test(value))?.name ?? null;
}

export function categoryFor(description: string, kind: 'income' | 'expense'): string {
  const value = clean(description);
  if (kind === 'income') return /\b(?:nomina|salario|payroll|salary|gehalt|salaire)\b/.test(value) ? 'Salario' : 'Otros';
  if (merchantFor(description) || /\b(?:supermercado|grocery|alimentacion|boulangerie|lebensmittel)\b/.test(value)) return 'Alimentación';
  if (/\b(?:alquiler|hipoteca|rent|mortgage|loyer|miete|electricidad|endesa|iberdrola|naturgy)\b/.test(value)) return 'Vivienda';
  if (/\b(?:repsol|cepsa|shell|bp|gasolinera|combustible|renfe|uber|cabify|metro|parking|transport)\b/.test(value)) return 'Transporte';
  if (/\b(?:netflix|spotify|disney\+?|hbo|prime video|subscription|suscripcion)\b/.test(value)) return 'Suscripciones';
  if (/\b(?:farmacia|pharmacy|apotheke|medico|hospital|clinica)\b/.test(value)) return 'Salud';
  if (/\b(?:restaurante|restaurant|cine|cinema|teatro|bar|cafe)\b/.test(value)) return 'Ocio';
  if (/\b(?:amazon|ikea|zara|primark|h&m)\b/.test(value)) return 'Compras';
  // A plain Bizum/transfer does not reveal where the money was spent.
  return 'Otros';
}
