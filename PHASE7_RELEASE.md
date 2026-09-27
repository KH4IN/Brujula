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

## Tutorial de Ultra y decisión de niveles (27-09-2026)

- El recorrido inicial en Ultra señalaba objetivos DOM exclusivos de la portada clásica. Se añaden objetivos equivalentes en el panel de cuatro zonas y el resumen patrimonial, con instrucciones específicas para Ultra y desplazamiento móvil que evita tapar la sección. La primera experiencia de `staging` selecciona Ultra si no existe preferencia guardada; quien ya eligió un nivel lo conserva.
- El fundador prefiere Ultra como experiencia principal y plantea retirar Bajo y Medio. Decisión provisional: conservar los niveles configurables mientras se verifican fluidez en un teléfono modesto, movimiento reducido y tutorial en iPhone. No trasladar el valor por defecto ni eliminar niveles en producción hasta completar esas pruebas y una PR exclusiva desde `staging`.
- Casos de aceptación pendientes: iniciar guía en Ultra con cuenta nueva, avanzar los diez puntos y volver atrás, reabrir a mitad de recorrido, cambiar de pestaña manualmente, repetir con datos vacíos y abundantes, lector de pantalla/teclado, iPhone con área segura y `prefers-reduced-motion`. Registrar SHA, dispositivo y resultados antes de marcar fases previas cerradas.
- Las fases 2, 3, 4 y 6 mantienen casillas abiertas en `ROADMAP.md`; esta corrección no sustituye pruebas de dos cuentas/dispositivos ni mediciones móviles.
