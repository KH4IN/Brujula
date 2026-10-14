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

- [ ] **B1. Cinco destinos.** Se hace en tres PR: **B1a** estructura, navegación, Rumbo y hoja de anotar ([#88](https://github.com/KH4IN/Brujula/pull/88), hecho); **B1b** Movimientos; **B1c** Cuentas y Corriente como tema por defecto. B1b y B1c empiezan cuando #88 esté unida (sin apilar PR). Navegación Rumbo · Movimientos · Recibos · Metas · Cuentas
  en el estilo Corriente, con lo que ya existe (Presupuestos dentro de Rumbo y
  Movimientos; Inversiones dentro de Cuentas). Recibos y Metas aún vacíos.
- [ ] **B2. Recibos, lectura.** Lista, calendario de 30 días y coste anual leyendo
  `kairos_*` con la sesión del usuario. Traer las pruebas de cálculo de Kairós.
- [ ] **B3. Recibos, edición.** Alta, cambio y baja de recibos.
- [ ] **B4. «¿Se cobró?»** Proponer el movimiento que cuadra con un recibo; se guarda
  solo si la persona confirma.
- [ ] **B5. Metas, lectura.** `goals` y `faro_metas` juntas, de ahorro y de vida.
- [ ] **B6. Metas, edición y revisión semanal.**
- [ ] **B7. Botón «+».** Pregunta si es movimiento, recibo o meta y abre su ficha.
- [ ] **B8. Activación.** Recibos y Metas no se ven hasta activarlos (Configuración o
  primer uso).
- [ ] **B9. Monolito.** El mismo contenido en el estilo Monolito.

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
