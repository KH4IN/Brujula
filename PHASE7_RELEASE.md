# Fase 7 · Registro de publicación gradual

## Versión de pruebas del 27-09-2026

- **Rama:** `staging`. Versión anterior verificada: `3b806e064c2aa85e31e533f1e3f25e46a6077cb2` (despliegue `dpl_HqXeqRuGLiy7qZmygwvTdvx4FZvg`, READY).
- **Cambio:** navegación Ultra sin cifra de patrimonio repetida; CI también en cada push a `staging`.
- **Entorno:** URL fija de pruebas con protección de acceso de Vercel y Supabase de pruebas aislado. Ultra solo se ofrece en la URL `-git-staging-`; en producción no se ofrece aunque el código llegue allí.
- **Verificación previa:** `npm test`, `npm run build`; comprobar CI y que el despliegue nuevo alcance READY y tenga el SHA esperado antes de pedir revisión visual.
- **Revisión del fundador:** Vista general y Ultra provisionalmente aceptados antes de este ajuste. Queda revisar esta corrección en iPhone y recorrer las secciones con datos ficticios.
- **Vuelta atrás:** crear un commit que revierta este cambio en `staging`, ejecutar CI y verificar el nuevo despliegue READY. Si el incidente es solo de hosting, volver temporalmente al despliegue anterior desde Vercel y después alinear GitHub. Ninguna de estas acciones revierte datos guardados; no hay cambio de esquema en esta entrega.

## Puertas pendientes antes de publicar cambios visuales en `main`

1. Comprobar navegación y formularios en iPhone, teclado y lector de pantalla; verificar movimiento reducido y uso con el módulo Anime.js no disponible.
2. Medir arranque y fluidez en al menos un teléfono rápido y uno modesto con datos ficticios; registrar tiempos agregados sin datos financieros.
3. Repetir una prueba de dos cuentas y dos dispositivos con datos ficticios, incluida una interrupción de red y reintento.
4. Comparar el commit exacto con `main`, trasladar solo archivos funcionales aprobados y mantener fuera la configuración propia de `staging`.
5. Registrar PR, SHA, CI, despliegue READY, revisión manual y reversión para cada publicación. Ultra beta no se promociona automáticamente.

La fase 7 está iniciada. Estas puertas siguen pendientes y las fases 2, 3, 4 y 6 conservan sus tareas abiertas.
