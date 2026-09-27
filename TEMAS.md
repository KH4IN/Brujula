# Temas de Brújula

Fecha: 27-09-2026. Estado: **solo en pruebas** (rama `claude/affectionate-clarke-jgtcs5`, basada en `staging`). Producción no se ha tocado.

## Qué hay

En **Configuración → Tema** se elige cómo se ve Brújula. Los datos, la sincronización y los cálculos son los mismos en todos los temas; solo cambia la interfaz.

| Tema | Qué es | Cómo se elige |
| --- | --- | --- |
| Tema nuevo («Rumbo») | Diseño hecho de cero. Una esfera de brújula marca el rumbo del mes: norte si ahorras, este si gastas lo que entra, sur si gastas de más. El anillo exterior reparte los gastos por categoría. Barra inferior en el móvil y riel lateral en el escritorio. Modo día y noche. | Opción por defecto para todo el mundo. |
| Tema antiguo | El diseño Ultra de antes, sin cambios. | Visible en Configuración. |
| Diseño clásico | El primer diseño de Brújula (antes, nivel «Bajo»). | Oculto: se desbloquea tocando 7 veces «BRÚJULA · 2026.09» al pie de Configuración. |

Los niveles Alto y Medio se han retirado, junto con sus estilos.

## Detalles técnicos

- La elección se guarda en este dispositivo, en `brujula.tema` (`nuevo`, `antiguo` o `clasico`). El desbloqueo del clásico se guarda en `brujula.clasico`. La clave antigua `brujula.motion` se borra al abrir la app. Si no hay preferencia guardada, se abre el tema nuevo.
- `public/theme-init.js` fija `data-tema` antes de pintar, así no aparece un instante el diseño equivocado. Con el tema nuevo también carga sus tipografías, Archivo y Azeret Mono, desde Google Fonts. Sin conexión se usan las del sistema.
- El código del tema nuevo está en `src/nuevo/`. Allí está la regla del rumbo (`rumbo.ts`, con pruebas en `tests/rumbo.test.mjs`), la esfera, las pantallas, la hoja de movimiento y `nuevo.css`. Todo su CSS cuelga de `:root[data-tema="nuevo"]` o usa clases `r-*`, así que no afecta a los otros temas.
- Las animaciones usan anime.js y respetan `prefers-reduced-motion`. Las pantallas de cuentas, objetivos, inversiones, importación, acceso y guía son las mismas en todos los temas; en el tema nuevo cambia su aspecto.
- La guía mantiene sus anclas (`data-guide`) en el tema nuevo y tiene textos propios para la portada.
- El diseño de referencia está en el lienzo de Claude Design «Brújula · tema nuevo».

## Antes de producción

1. El fundador lo prueba en la vista previa de esta rama, que usa Brújula pruebas. Tiene que probar el iPhone, los modos día y noche, los tres temas y el alta, edición y borrado de un movimiento ficticio.
2. PR a `staging` y después a `main`, sin arrastrar los cuatro archivos propios de `staging` (ver `STAGING.md` en `main`).
