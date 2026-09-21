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
