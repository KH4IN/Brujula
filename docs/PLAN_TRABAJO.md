# Plan de trabajo de Brújula

Creado el 14-10-2026. Objetivo: cumplir `ROADMAP.md` y la ficha de Brújula
(`apps/00-brujula.md` en el repositorio de Ideas: Brújula con Kairós y Faro dentro).
Estado: **aprobado por el fundador el 14-10-2026**, con sus cuatro recomendaciones y la condición de no romper producción. Se marca `[x]` cada paso al terminarlo.

## Cómo se trabaja

- Una rama y una PR por paso. El código va primero a `staging` (Brújula pruebas) y,
  cuando el fundador lo prueba, se lleva a `main` en una PR aparte que solo copia ese
  cambio (como dice `STAGING.md`). Los documentos van directos a `main`. Nunca se une
  una PR: las une el fundador.
- `npm test` y `npm run build` en verde antes de cada PR (en GitHub Actions; ver la duda 4).
- Si hay interfaz: capturas a 1440 y 390 px en la vista previa de `staging`, con datos
  ficticios.
- Nada contra producción, nada en `.github/workflows/`, ningún secreto en el repo.

## Decisiones (aprobadas el 14-10-2026 tal como se recomiendan)

1. **¿Se levanta la regla de «solo fallos» en Brújula?** La auditoría de Brújula está
   cerrada (permisos SQL comprobados en producción, #73 y #74 unidas, Insights aceptado),
   pero `AGENTS.md` sigue diciendo «solo fallos visibles o graves hasta nuevo aviso».
   Con la regla puesta solo se puede hacer el bloque A. *Recomiendo levantarla para
   Brújula y apuntarlo en `AGENTS.md`; las zonas intocables siguen igual.*
2. **Corriente y Monolito frente a los temas actuales.** Hoy hay tema nuevo «Rumbo»
   (por defecto), antiguo (Ultra) y clásico oculto. *Recomiendo construir la Brújula
   nueva primero en Corriente como tema nuevo por defecto (sustituye a «Rumbo»), dejar
   antiguo y clásico como están, y añadir Monolito después con el mismo contenido.*
3. **Escribir en las tablas `kairos_*` y `faro_*`.** La ficha dice que pasan a ser de
   Brújula, pero `AGENTS.md` y tus reglas dicen que Brújula no escribe en tablas de otras
   apps. *Recomiendo seguir la ficha (son de Brújula; RLS por usuario igual) y
   actualizar el contrato de `AGENTS.md` en el mismo paso.*
4. **Herramientas en esta sesión.** No hay acceso a npm, así que no puedo pasar pruebas,
   compilar ni hacer capturas en local. *Propuesta: las pruebas y el build los da GitHub
   Actions en cada PR (abro la PR en borrador, espero el verde y la marco lista), y las
   capturas, la vista previa de Vercel de `staging`, a la que necesito acceso.* Impeccable
   y ui-ux-pro-max no están instalados: los instalo en esta sesión, tras revisarlos,
   cuando llegue el primer paso con interfaz.

## Bloque A · Cerrar la fase 2 del ROADMAP (se puede hacer ya)

- [x] **A1. ROADMAP al día** ([PR #79](https://github.com/KH4IN/Brujula/pull/79)) (solo documento, a `main`). Marcar lo hecho (temas, cierre
  de la auditoría de Brújula, Insights aceptado), dar la fase 6 por sustituida por los
  temas y añadir la fase 8 «Brújula nueva» con los pasos de la ficha. *Comprobación:*
  revisión del diff.
- [ ] **A2. Revisión del acceso** — *la hace el fundador con la lista de [#85](https://github.com/KH4IN/Brujula/pull/85) (aprobado el 14-10); «Brújula pruebas» reactivado.* (fase 2, punto 1). Leer `auth.ts` y `Auth.tsx` sin
  tocarlos y probar en Brújula pruebas el registro, el acceso por contraseña, la
  recuperación y el vínculo de datos de invitado con una cuenta ficticia. Informe en
  `docs/auditoria/ACCESO.md`. *Comprobación:* cada flujo con resultado y captura.
- [x] **A3. Revisión de la interfaz** ([informe #83](https://github.com/KH4IN/Brujula/pull/83); fallos en [#81](https://github.com/KH4IN/Brujula/pull/81) y [#82](https://github.com/KH4IN/Brujula/pull/82), a `staging`; falta su PR a `main`) (fase 2, punto 2). Los tres temas a 1440 y 390 px:
  navegación, teclado, contraste, modos día y noche y sin conexión. Informe en
  `docs/auditoria/INTERFAZ.md`; cada fallo visible, en su propia PR. *Comprobación:*
  capturas antes y después.
- [ ] **A4. Dos usuarios reales** — *igual que A2, con la misma lista.* (fase 2, punto 3). Dos cuentas ficticias en pruebas:
  ninguna ve ni cambia lo de la otra; el mismo usuario en dos navegadores, editando a la
  vez. Informe en `docs/auditoria/SINCRONIZACION.md`. *Comprobación:* resultados de cada caso.
- [x] **A5. Importación** ([PR #80](https://github.com/KH4IN/Brujula/pull/80); traspasos y fechas mes/día corregidos en [#86](https://github.com/KH4IN/Brujula/pull/86)) (fase 2, punto 4). Pruebas en `tests/` con extractos
  sintéticos: signos, cargo/abono, traspasos, duplicados y filas ambiguas. Sin tocar
  `import.ts` salvo fallo grave. *Comprobación:* `npm test` en verde.
- [ ] **A6. Cierre de la fase 2.** Informe breve con hallazgos y riesgos en
  `docs/auditoria/FASE2.md` y ROADMAP marcado.

## Bloque B · Brújula nueva (necesita las decisiones 1, 2 y 3)

Cada paso: PR a `staging`, capturas a 1440 y 390 px y, cuando lo apruebes, PR a `main`.

- [x] **B1. Cinco destinos.** (B1a [#88](https://github.com/KH4IN/Brujula/pull/88), B1b [#89](https://github.com/KH4IN/Brujula/pull/89), B1c [#90](https://github.com/KH4IN/Brujula/pull/90), en `staging`) Se hace en tres PR: **B1a** estructura, navegación, Rumbo y hoja de anotar ([#88](https://github.com/KH4IN/Brujula/pull/88), hecho); **B1b** Movimientos; **B1c** Cuentas y Corriente como tema por defecto. B1b y B1c empiezan cuando #88 esté unida (sin apilar PR). Navegación Rumbo · Movimientos · Recibos · Metas · Cuentas
  en el estilo Corriente, con lo que ya existe (Presupuestos dentro de Rumbo y
  Movimientos; Inversiones dentro de Cuentas). Recibos y Metas aún vacíos.
- [x] **B2. Recibos, lectura.** ([#91](https://github.com/KH4IN/Brujula/pull/91), en `staging`) Lista, calendario de 30 días y coste anual leyendo
  `kairos_*` con la sesión del usuario. Traer las pruebas de cálculo de Kairós.
- [x] **B3. Recibos, edición.** ([#92](https://github.com/KH4IN/Brujula/pull/92), en `staging`) Alta, cambio y baja de recibos.
- [x] **B4. «¿Se cobró?»** ([#93](https://github.com/KH4IN/Brujula/pull/93), en `staging`) Proponer el movimiento que cuadra con un recibo; se guarda
  solo si la persona confirma.
- [x] **B5. Metas, lectura.** ([#94](https://github.com/KH4IN/Brujula/pull/94), en `staging`) `goals` y `faro_metas` juntas, de ahorro y de vida.
- [x] **B6. Metas, edición y revisión semanal.** ([#95](https://github.com/KH4IN/Brujula/pull/95), en `staging`)
- [x] **B7. Botón «+».** ([#96](https://github.com/KH4IN/Brujula/pull/96), en `staging`) Pregunta si es movimiento, recibo o meta y abre su ficha.
- [x] **B8. Activación.** ([#96](https://github.com/KH4IN/Brujula/pull/96), en `staging`) Recibos y Metas no se ven hasta activarlos (Configuración o
  primer uso).
- [x] **B9. Monolito.** ([#97](https://github.com/KH4IN/Brujula/pull/97), [#98](https://github.com/KH4IN/Brujula/pull/98), [#99](https://github.com/KH4IN/Brujula/pull/99), en `staging`) El mismo contenido en el estilo Monolito.

### Integración completa de Kairós y Faro (añadido el 15-10 con aprobación del fundador)

Para que Brújula haga todo lo que hacen Kairós y Faro (decisión del 02-10: Brújula los
absorbe). Dentro de Brújula, en `staging` y sin tocar producción ni el servidor.

- [x] **B10. Metas de vida completas.** ([#102](https://github.com/KH4IN/Brujula/pull/102), en `staging`) Crear, editar, pausar y borrar metas de Faro;
  añadir y borrar pasos; enlazar una meta de dinero a un objetivo de ahorro.
- [x] **B11. Recibos completos.** ([#103](https://github.com/KH4IN/Brujula/pull/103), en `staging`) Marcar pagado u omitido a mano, historial de cobros y
  recibos sugeridos a partir de los movimientos.
- [x] **B12. Ajustes de avisos.** ([#104](https://github.com/KH4IN/Brujula/pull/104), en `staging`) Hora, antelación y canales de recibos; día y hora de la
  revisión de metas (las funciones de avisos del servidor ya leen esos ajustes).
- [x] **B13. Avisos en el móvil desde Brújula** ([#105](https://github.com/KH4IN/Brujula/pull/105), en `staging`). Primera fase de los avisos unificados, sin tocar el servidor; las fases 2 y 3 están en [`docs/avisos/PLAN.md`](avisos/PLAN.md).
- [x] **B14. Fases 2 y 3 de los avisos unificados** (aprobadas el 16-10). Son PR en Kairós y Faro, sin unir: los textos de los avisos, la franja «ahora vive en Brújula» y la redirección (en borrador). El orden para desplegar está en `docs/avisos/PLAN.md`.
- [x] **B15. Importar extracto en Corriente y Monolito** ([#108](https://github.com/KH4IN/Brujula/pull/108), a `staging`). Hoja del tema en lugar del diálogo antiguo; la lógica se comparte (`useImportar`).
- [x] **B16. Guía propia de Corriente y Monolito** ([#109](https://github.com/KH4IN/Brujula/pull/109), a `staging`). Pasos que señalan lo que se ve en cada tema.
- [x] **B17. Configuración en Corriente y Monolito** ([#110](https://github.com/KH4IN/Brujula/pull/110), a `staging`). Falta el inicio de sesión, que espera tu aprobación porque toca el acceso.

Detalles de interfaz aprobados el 14-10 (botón de modo del tema antiguo, contrastes y buscador): [#87](https://github.com/KH4IN/Brujula/pull/87).

## Fuera de este plan (lo apunto, no lo hago)

- **Avisos unificados** (paso 4 de la ficha): toca las funciones del servidor, que se
  despliegan en producción. Necesita un plan aparte y que lo despliegues tú.
- **Aviso y redirección en Kairós y Faro** (paso 5): son otros repositorios.
- **Fase 4** (separar módulos y Next.js): son refactors; solo la medición, si lo pides.
- **Fase 5**: probar la guía con alguien nuevo lo haces tú.
- **Fase 7, cotizaciones para Atlas**: necesita el mecanismo de invitación del servidor
  y un plan aprobado.
- **PR #2** (acceso con Google, borrador del 19-09): la dejo como está.
