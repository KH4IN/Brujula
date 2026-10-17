import type { GuideStep } from '../features/Guide';

// Guía de Corriente y Monolito: señala lo que se ve en cada tema (data-guide="t-…").
const comunes = {
  indice: { id: 't-indice', section: 'dashboard', target: 't-indice', title: 'El resto del mes', copy: 'Desde aquí vas a Movimientos y a Cuentas. Si activas Recibos y Metas, también aparecen aquí.' },
  anotar: { id: 't-anotar', section: 'dashboard', target: 't-anotar', title: 'Anota en un momento', copy: 'Con «+» apuntas un gasto, un ingreso o un traspaso. También un recibo o una meta.' },
  importar: { id: 't-importar', section: 'transactions', target: 't-importar', title: 'Importa tu extracto', copy: 'Elige el CSV o Excel de tu banco, revisa la lista y guarda solo lo que quieras. Lo que ya estaba no se repite.' },
  espacio: { id: 't-espacio', section: 'dashboard', target: 't-espacio', title: 'Tu espacio', copy: 'Aquí activas Recibos y Metas, eliges los avisos y el tema, y vuelves a esta guía cuando quieras.' },
} satisfies Record<string, GuideStep>;

export const PASOS_CORRIENTE: GuideStep[] = [
  { id: 't-rumbo', section: 'dashboard', target: 't-rumbo', title: 'Tu mes, como un río', copy: 'Lo que entra se reparte en gastos y lo que se queda gira abajo. Pasa el dedo o el ratón por el río para ver cada importe.' },
  comunes.indice, comunes.anotar,
  { id: 't-movimientos', section: 'transactions', target: 't-movimientos', title: 'Lo que sale cada día', copy: 'El cauce se ensancha con el gasto de cada día; lo punteado es lo que queda de mes. Debajo tienes la lista, el buscador y los presupuestos.' },
  comunes.importar,
  { id: 't-cuentas', section: 'accounts', target: 't-cuentas', title: 'Tus cuentas', copy: 'Cada cuenta e inversión es un afluente que desemboca en tu patrimonio. Debajo las tienes una a una.' },
  comunes.espacio,
];

export const PASOS_MONOLITO: GuideStep[] = [
  { id: 't-rumbo', section: 'dashboard', target: 't-rumbo', title: 'Cien puntos para tu mes', copy: 'Cada punto es el 1 % de lo que entra: los grises salen y los blancos se quedan. Pasa por encima para ver cada grupo.' },
  { id: 't-aguja', section: 'dashboard', target: 't-aguja', title: 'La aguja', copy: 'Marca el rumbo del mes: hacia el norte cuando ahorras, hacia el sur cuando sale más de lo que entra.' },
  comunes.indice, comunes.anotar,
  { id: 't-movimientos', section: 'transactions', target: 't-movimientos', title: 'Una columna por día', copy: 'Cada columna es lo que sale ese día, en puntos. Cada punto vale lo que dice la escala; lo que se sale de ella se marca en rojo.' },
  comunes.importar,
  { id: 't-cuentas', section: 'accounts', target: 't-cuentas', title: 'Tu patrimonio, en puntos', copy: 'Todo lo que tienes, en puntos agrupados por cuenta. Debajo, cada cuenta e inversión por separado.' },
  comunes.espacio,
];
