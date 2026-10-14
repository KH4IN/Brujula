# Revisión de la interfaz (fase 2, punto 2)

14-10-2026. Paso A3 de `docs/PLAN_TRABAJO.md`. Revisado: `main` en `0ba3b15`, lo que hay
en producción.

## Cómo se hizo

- Compilación local de `main` con esbuild y sin Supabase configurado, de modo que la app
  abre en modo local con los **datos de demostración** (ficticios). En esta sesión npm no
  está disponible y la vista previa de Vercel no es accesible, así que no es la misma
  compilación que la de Vite, aunque sí el mismo código y el mismo CSS.
- Los tres temas (nuevo «Rumbo», antiguo/Ultra y clásico), en modo día y noche, a
  1440 × 900 y 390 × 844 px, en las siete secciones: 84 capturas.
- Comprobaciones automáticas en cada una: desplazamiento horizontal, elementos que se
  salen por la derecha, textos cortados, errores de consola y contraste WCAG AA (4,5:1;
  3:1 en texto grande).
- Teclado: foco visible en los 25 primeros saltos con Tab en cada tema, a los dos tamaños.

## Resultado

Sin desbordes horizontales, sin textos cortados (salvo el que se cita abajo), sin errores
de consola y con el foco visible en todos los temas.

### Fallos corregidos (PR a `staging`, después a `main`)

| Fallo | Tema | PR |
|---|---|---|
| En modo día, el centro de los anillos, las leyendas, los nombres y cifras de presupuestos, «Ajustar límite» y varios rótulos casi no se leían (contraste 1,1:1): Ultra pinta fondos oscuros, pero esos textos usaban los colores de día. | Antiguo | [#81](https://github.com/KH4IN/Brujula/pull/81) |
| La tarjeta de resumen mostraba el nombre interno en inglés («DATOS EN VIVO / ANALYSIS», «/ BUDGETS»…) y el lector de pantalla leía «Resumen de analysis». | Antiguo | [#82](https://github.com/KH4IN/Brujula/pull/82) |

### Detalles menores (no corregidos; se deciden aparte)

- **Nuevo**: el pie «BRÚJULA · TU DINERO, CON RUMBO» tiene un contraste de 2,8:1 en modo
  día (es decorativo, a 10 px).
- **Nuevo**: el estado vacío de Inversiones («Tu cartera empezará aquí.») queda en
  3,8:1 de día y 4,4:1 de noche, algo por debajo de 4,5:1.
- **Clásico**: muchos textos secundarios pequeños (8–12 px) quedan entre 2,3:1 y 4,2:1 en
  modo día. Es el estilo del tema, que está oculto.
- **Antiguo, 390 px**: el texto de ayuda del buscador de Movimientos se corta
  («Buscar por r…»).
- **Antiguo, tras #81**: el botón de día y noche no cambia nada en ese tema. ¿Se oculta?

## Lo que no cubre

- Las fuentes de Google no se cargan en esta sesión; las capturas usan las del sistema.
- No hay prueba en teléfono real ni con lector de pantalla, solo las comprobaciones de arriba.
- El modo sin conexión de la PWA (service worker) no se probó aquí: se bloqueó a propósito
  para que cada captura fuera independiente. El fundador lo comprobó en iPhone el 26-09-2026.
