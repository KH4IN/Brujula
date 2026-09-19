# Auditoría de importación de extractos — 18/09/2026

## Estado del informe externo

En la rama `main` de `KH4IN/Brujula` solo estaba el importador anterior. No aparecían `src/categorize.ts`, `src/import.test.ts`, el mapeo manual ni Vitest mencionados en el informe de Cloud. Esta auditoría revisó el código disponible e implementó y probó aquí las funciones faltantes. El informe externo no constituye evidencia de ejecución en este repositorio.

## Problemas detectados y correcciones

| Riesgo | Comportamiento anterior | Corrección actual |
| --- | --- | --- |
| Alto: gasto contabilizado como ingreso | CSV con importes positivos sin tipo se interpretaba como ingreso. | Se bloquea la confirmación hasta elegir el sentido de los importes. |
| Alto: filas perdidas | El control previo de duplicados buscaba cualquier transacción idéntica, incluso si el extracto contenía dos operaciones legítimas iguales. | Se comparan ocurrencias, claves de importación y referencias; las referencias idénticas repetidas dentro del archivo se señalan. |
| Medio: formatos no reconocidos | Solo se reconocían unos pocos encabezados exactos. | Alias multilingües, fecha de operación prioritaria, cargo/abono, mapeo manual y elección de fila de cabecera. |
| Medio: hojas auxiliares | Una hoja de resumen podía bloquear o confundir el análisis de movimientos. | Se analiza por defecto la hoja de movimientos más probable y se mantiene la elección manual de hoja. |
| Medio: errores monetarios | No había comprobación de divisa; podía contabilizar GBP como EUR. | Filas explícitamente distintas de EUR bloqueadas; no se hace conversión ficticia. |
| Medio: visibilidad limitada | Todo comercio desconocido se agrupaba en «Otros» y no había filtro por supermercado. | Categorías locales por reglas, comercio derivado de descripción y filtro por comercio. La categoría suministrada por el banco se respeta. |
| Medio: codificación | Lectura del texto con UTF-8 por defecto. | UTF-8 BOM, UTF-16 con BOM y respaldo Windows-1252, con delimitadores ; , tabulación y barra vertical. |

## Seguridad y contabilidad

El archivo se analiza en el navegador, con límite de 8 MB y 5.000 movimientos. Se muestran las filas inválidas antes de guardar. La descripción se presenta como texto React, sin interpolación HTML; la exportación CSV ya escapaba las fórmulas. Solo los movimientos aceptados van al almacenamiento local y se sincronizan si hay sesión. El índice único por usuario y `import_key` en Supabase permanece como último control de duplicación; el trabajo no cambia ni amplía permisos de base de datos ni añade secretos.

Se ejecutaron `npm test` (15 pruebas, formatos bancarios **sintéticos**), `npm run build` y `npm audit --omit=dev --audit-level=high` (0 vulnerabilidades reportadas). Las pruebas incluyen dos operaciones idénticas, reimportación, referencias, distintos separadores, codificaciones, fechas inválidas, tipos contradictorios, categorías y otras divisas. No se usaron extractos oficiales de todos los bancos ni una prueba con dos cuentas reales; la compatibilidad absoluta con los miles de formatos cambiantes no puede verificarse con esta evidencia.

## Límites pendientes

- Un CSV con fechas ambiguas usa día/mes/año por defecto, como los extractos españoles. Debe verificarse la fecha en la vista previa si el banco exporta mes/día/año.
- No hay cambio de divisa ni conversión de PDF, OFX o QIF. Un CSV con varias divisas requiere importar solo registros EUR o convertirlo previamente con una fuente de cambio elegida por la persona usuaria.
- Las operaciones de tarjeta pendientes y las asentadas pueden aparecer por separado; hay que revisar ambos movimientos antes de incluirlos.
- Se puede señalar como posible duplicado una operación legítima idéntica a otra ya importada desde otro archivo. Revisa la vista previa y añade el movimiento manualmente si es distinto.
- Para verificar un formato específico, se necesita un extracto de ejemplo anonimizado que conserve encabezados y estructura, sin IBAN, nombres ni movimientos reales.
