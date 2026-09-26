# Arquitectura y crecimiento de Brújula

Brújula usa React, TypeScript y Vite en Vercel. Las finanzas y la cola de cambios
se conservan en el navegador (`src/ledger.ts`); al iniciar sesión, la cola se
sincroniza con Supabase. La importación se analiza en el dispositivo y solo los
movimientos confirmados llegan a la cuenta.

## Módulos actuales

- `src/features/AccountsPanel.tsx`: bancos, efectivo y recuento opcional.
- `src/features/ImportDialog.tsx` y `src/import.ts`: vista previa y lectura de archivos.
- `src/features/GoalsPanel.tsx`, `InvestmentsPanel.tsx` y `DailyChart.tsx`:
  objetivos, cartera manual y gráficos.
- `src/features/Auth.tsx`: interfaz de acceso; `src/auth.ts`: mensajes de error.
- `src/features/TransactionList.tsx`, `overview.tsx`, `presentation.ts`:
  componentes y colores compartidos.
- `src/App.tsx`: navegación, estado de sesión y coordinación de cambios.
- `src/ledger.ts`, `finance.ts`, `cash.ts`: persistencia y cálculos, sin depender
  de la presentación.

## Antes de admitir mucho tráfico

1. Medir tiempos de carga, tamaño por cuenta, fallos de sincronización y tiempos
   de respuesta de Supabase con datos agregados que no expongan movimientos.
2. Sustituir progresivamente la lectura completa de las cinco tablas durante
   cada sincronización por consultas incrementales o paginadas según la pantalla.
   Hoy `synchronize` consulta todos los registros del usuario en bloques de 500:
   el coste crece con el historial de cada persona.
3. Verificar índices y políticas RLS con consultas representativas; establecer
   copias de seguridad y comprobar una restauración antes de cambiar tablas.
4. Probar conflictos entre dos dispositivos y grandes importaciones con cuentas
   de prueba sin datos reales.

## Cuándo valorar Next.js

Next.js sigue usando TypeScript. Migrar será útil si hacen falta páginas públicas
renderizadas en servidor, rutas o funciones de servidor para integraciones que
deban ocultar claves. No aumenta por sí solo la capacidad de Supabase ni arregla
las lecturas completas de `synchronize`.

Si se decide migrar: conservar el dominio público y el proyecto Supabase;
preparar una rama y un despliegue de prueba, comprobar inicio de sesión, el
retorno de OAuth, datos locales, modo sin conexión y CSV, y después cambiar la
versión publicada. No cambiar las claves de `localStorage` ni ejecutar una
migración destructiva de las tablas como parte del cambio de framework.

## Primera medición y modularización (26-09-2026)

Se hizo una medición local con datos **sintéticos**, Node y el mismo bundle de `ledger.ts`: preparar 100, 1.000 y 5.000 movimientos para la cola local tardó aproximadamente 1, 25 y 306 ms antes del cambio; después de [PR #42](https://github.com/KH4IN/Brujula/pull/42), 1, 4 y 18 ms. Es una corrida por tamaño en una máquina de desarrollo, no una medición en iPhone ni de subida a Supabase. La cola de 5.000 elementos se conserva. Las 38 pruebas y el build pasaron tras extraer el [resumen mensual](https://github.com/KH4IN/Brujula/pull/44) a `finance.ts`, separado de `App.tsx`.

El build local de esa versión produjo un archivo JS principal de ~429 kB sin comprimir (~128 kB gzip) y CSS de ~42 kB (~9 kB gzip); el módulo diferido de PapaParse fue ~19 kB (~7 kB gzip). Estas cifras de artefactos no miden tiempo de arranque en un teléfono ni coste de sincronización. Faltan mediciones con cuentas ficticias pequeñas y grandes en dispositivo real y con red lenta.

Desde [PR #47](https://github.com/KH4IN/Brujula/pull/47), la cola confirma movimientos en grupos de 25: con 1.000 filas sintéticas y emisor sin red, el trabajo local bajó de 3.987 ms y 1.000 escrituras a 278 ms y 40 escrituras. [PR #50](https://github.com/KH4IN/Brujula/pull/50) envía hasta 25 movimientos consecutivos por upsert; en la prueba simulada, 500 movimientos pasaron de 500 peticiones previstas a 20. Si el lote devuelve 23505, se reintenta por separado para aislar duplicados. Los borrados y otras entidades conservan su orden. Una transacción SQL de dos movimientos ficticios bajo RLS en la base de pruebas se revirtió y no dejó filas. Estas cifras no son latencia real del cliente HTTP.

`synchronize` sigue leyendo las cinco tablas completas por páginas de 500 tras cada envío. No hay un cursor de cambios ni una forma de propagar borrados desde otros dispositivos sin volver a leer; una lectura incremental exige diseñar esa semántica antes de alterar tablas. Próximo experimento: medir duración y tamaño de esas lecturas con usuarios ficticios y red representativa, y probar conflictos entre dos dispositivos. No registrar importes ni descripciones en telemetría.

## Decisión provisional de framework

**Mantener React + TypeScript + Vite mientras se separan módulos y se miden los cuellos de botella.** La navegación y las animaciones cosméticas pueden implementarse con el stack actual. Next.js ofrece rutas y funciones de servidor, y soporta PWA, pero el acceso a `localStorage` y otras APIs del navegador requiere componentes de cliente. Migrar ahora implica volver a verificar PWA, trabajo sin conexión, retorno de OAuth y almacenamiento existente sin una necesidad de servidor demostrada. Esta conclusión se basa en la arquitectura actual y en la [guía de Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) y la [guía PWA](https://nextjs.org/docs/app/guides/progressive-web-apps) de Next.js.

Reabrir la decisión si aparecen páginas públicas que necesiten renderizado en servidor, integraciones con secretos que requieran funciones propias, o una medición que muestre una mejora concreta obtenible con rutas de Next.js. Antes de cualquier migración, prototipo en `staging` con el mismo proyecto de pruebas y pruebas de cuenta, CSV, PWA, sesiones y movimientos sin red. No cambiar datos ni credenciales de producción como parte del prototipo.
