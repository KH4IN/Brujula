# Diseño fase 3 · Portada y navegación

Fecha: 26-09-2026. Primera iteración para revisar en la vista previa de `staging`.

## Mapa

| Entrada | Qué enseña | Al pulsar |
| --- | --- | --- |
| Vista general | Patrimonio, balance/ingresos/gastos del mes, cuatro caminos y tres movimientos recientes | Cada camino abre una sección; el patrimonio abre Cuentas o Inversiones; «Ver todos» abre Movimientos |
| Análisis | Círculo ingresos/gastos, distribución por categorías, límites y gráfico diario | Ingresos/gastos filtran Movimientos; una categoría abre su desglose; una barra abre los movimientos de ese día |
| Movimientos | Historial, búsqueda, filtros, edición, importación y exportación | Vuelta desde Análisis con el filtro ya aplicado |
| Cuentas y efectivo | Cada banco, saldos, efectivo y traspasos | Desde Vista general |
| Presupuestos | Límites mensuales | Desde Vista general o Análisis |
| Objetivos | Metas de ahorro | Desde Vista general |
| Inversiones | Posiciones manuales y cripto | Desde el resumen de patrimonio y la navegación lateral |

## Criterios visuales

- Una lectura inicial breve antes de pedir interpretar gráficos. Los accesos muestran destino, dato útil y una flecha. Navegación por botones con teclado y foco visible.
- Móvil: accesos en una columna con área táctil amplia. Escritorio: dos columnas. Respetar modos claro y oscuro; transiciones solo cosméticas y desactivadas con `prefers-reduced-motion`.
- La información financiera permanece en el dispositivo o en la cuenta según el estado de sincronización. Cambiar de pantalla no altera movimientos ni saldos.
- En la portada los tres movimientos recientes no heredan filtros que se hayan usado en Movimientos; muestran siempre los más recientes del mes elegido.

## Estados y revisión

- Sin datos: patrimonio y estadísticas en cero; el camino Análisis conduce a gráficos vacíos con acción para crear movimiento.
- Sin red: la misma navegación y cálculos locales siguen accesibles; la banda de sincronización indica pendientes.
- Datos abundantes: la portada conserva tres movimientos; el listado completo se consulta en Movimientos.
- Revisado por el fundador en iPhone el 26-09-2026: portada y Análisis se ven bien. Publicar los archivos funcionales tras CI; mantener el documento como mapa de navegación. En iPhone comprobar ancho, foco, desplazamiento tras pulsar, tema oscuro/claro y salto de un día/categoría a Movimientos.
- En la siguiente iteración considerar rutas navegables por URL y el tutorial. Next.js y Anime.js no son requisitos de este cambio.
