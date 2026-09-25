# Roadmap de Brújula

Documento vivo para ordenar el trabajo y registrar avances. Última revisión: 25 de septiembre de 2026.

## Cómo se usa

- `[ ]` pendiente; `[x]` terminado y comprobado. Cada casilla se marca en un commit que enlace el cambio o explique la comprobación.
- El trabajo nuevo se hace en una rama y se revisa mediante pull request. `main` publica producción; no se usa para experimentar.
- Antes de fusionar: `npm test`, `npm run build`, revisión de los flujos afectados y plan de vuelta atrás. Cambios de datos: copia comprobada y migración compatible.
- Una fase puede dividirse en PR pequeñas. Las decisiones abiertas se anotan aquí, sin dar por implementada una propuesta.

## Punto de partida

Brújula es una PWA React + TypeScript + Vite con módulos de cuentas, importación, gráficos, objetivos, cartera y persistencia local con sincronización a Supabase, según el código y la documentación de `main` revisados al crear este archivo. El fundador informa de que Google OAuth, la importación CSV y las copias cifradas en un repositorio privado ya funcionan. Esas afirmaciones se toman como contexto y se verificarán con pruebas específicas. La documentación de `main` aún describe el acceso de Google a través de Supabase y no confirma una integración de Firebase en producción; la arquitectura real de acceso debe aclararse antes de migrar.

## Fase 1 · Recuperar pruebas sin afectar a usuarios

- [ ] Crear una rama de trabajo estable para pruebas y definir qué cambios llegan a ella y cuándo pasan a `main`.
- [ ] Configurar un despliegue de pruebas con URL fija y acceso para el equipo, manteniendo producción pública en su dirección habitual.
- [ ] Aislar los datos de prueba: proyecto/base separados o una separación equivalente comprobable; nunca probar importaciones, borrados ni migraciones con datos financieros de usuarios.
- [ ] Configurar las variables del entorno de pruebas y los dominios autorizados de OAuth para su URL. Probar inicio, cierre y retorno de sesión en móvil y escritorio.
- [ ] Registrar cómo volver al despliegue anterior y cómo comunicar un fallo al equipo.
- **Criterio de cierre:** el equipo puede entrar a una URL de pruebas, iniciar sesión, crear datos ficticios y comprobar que producción no cambia.

## Fase 2 · Auditoría y correcciones de la base actual

- [ ] Revisar el flujo real de autenticación: proveedor utilizado en `main`, Google, correo/contraseña, recuperación, sesiones y vínculo de datos locales con la cuenta. Corregir la documentación desfasada.
- [ ] Auditar frontend en móvil y escritorio: navegación, accesibilidad, rendimiento, tema claro/oscuro, formularios con teclado de iPhone y estado sin conexión.
- [ ] Auditar persistencia y sincronización: aislamiento por usuario, RLS, conflictos entre dispositivos, borrados, errores de red, límites de volumen y ausencia de secretos en cliente/logs.
- [ ] Verificar importaciones CSV/XLSX con ejemplos sintéticos representativos, signos, cargo/abono, transferencias, duplicados y filas ambiguas. No prometer compatibilidad universal sin muestras reales.
- [ ] Comprobar que las copias cifradas programadas se generan y que al menos una se puede restaurar en un entorno aislado; documentar frecuencia y retención sin exponer claves ni datos.
- [ ] Corregir los defectos hallados en PR pequeñas con pruebas centradas en cada fallo.
- **Criterio de cierre:** informe breve con hallazgos y riesgos pendientes, flujos críticos comprobados, y errores prioritarios corregidos.

## Fase 3 · Diseñar una experiencia más visual

- [ ] Dibujar el mapa de navegación y reducir la longitud de la página principal: resumen breve con accesos claros a gastos, ingresos, cuentas, presupuestos, objetivos e inversiones.
- [ ] Diseñar pantallas y estados móviles primero (vacío, carga, error, sin conexión y datos abundantes). Usar Figma o una herramienta similar si acelera la revisión; conservar el diseño y sus decisiones en el repositorio.
- [ ] Definir componentes visuales reutilizables para tarjetas, gráficos, explicaciones al pulsar y navegación, respetando los modos claro y oscuro (gris/negro, morado y dorado en oscuro).
- [ ] Revisar el diseño con el fundador antes de sustituir la navegación principal.
- [ ] Implementar por pantallas y comprobar que cada gráfico conduce a un desglose entendible y accesible.
- **Criterio de cierre:** panel principal corto, rutas claras y detalles financieros comprensibles sin perder funciones actuales.

## Fase 4 · Modularidad y decisión sobre Next.js

- [ ] Separar con interfaces claras cálculos financieros, lectura de archivos, sincronización, autenticación y presentación; conservar formatos de datos y claves locales existentes.
- [ ] Medir carga inicial y sincronización con cuentas de prueba pequeñas y grandes. Priorizar consultas paginadas/incrementales y los cuellos de botella medidos.
- [ ] Comparar una evolución de Vite con una migración a Next.js según necesidades concretas: rutas, páginas públicas, funciones de servidor, despliegue y coste de mantenimiento. **Next.js no es requisito para usar Anime.js ni para animar React.**
- [ ] Si se aprueba Next.js, migrar por etapas en pruebas. Conservar dominio, datos, PWA y sesiones; verificar OAuth, CSV, efectivo, presupuestos, sincronización y modo sin conexión antes de publicar.
- **Criterio de cierre:** arquitectura modular documentada y decisión de framework basada en pruebas, con migración completada solo si aporta valor demostrado.

## Fase 5 · Tutorial y ayuda dentro de la app

- [ ] Diseñar un recorrido interactivo opcional para primera visita: cuenta/efectivo, primer movimiento, importación con revisión, gráficos, presupuestos y objetivos.
- [ ] Permitir omitirlo, repetirlo desde Ayuda y completarlo sin datos financieros reales.
- [ ] Añadir explicaciones cortas junto a gráficos y casos delicados (saldo inicial, traspasos, inversiones y duplicados).
- [ ] Probarlo con alguien del equipo que no conozca la interfaz.
- **Criterio de cierre:** una persona nueva puede registrar y entender sus primeros movimientos sin instrucciones externas.

## Fase 6 · Movimiento visual adaptable

- [ ] Definir tres niveles: bajo (transiciones mínimas), medio (animaciones discretas) y alto (animaciones completas); respetar `prefers-reduced-motion`.
- [ ] Probar Anime.js solo en transiciones cosméticas que no alteren cálculos, navegación ni la información financiera.
- [ ] Ofrecer un ajuste manual y un valor inicial prudente; medir fluidez y consumo en teléfonos de distinta capacidad. No inferir potencia solo por el modelo o el navegador.
- [ ] Comprobar que teclado, lectores de pantalla y contenido funcionan igual sin animaciones.
- **Criterio de cierre:** los tres niveles son útiles, el modo reducido es accesible y la app sigue funcionando al desactivar JavaScript de animación.

## Fase 7 · Publicación gradual y crecimiento

- [ ] Pasar cada bloque por pruebas, revisión y despliegue controlado; anotar commit, resultado y forma de revertirlo.
- [ ] Observar errores y tiempos agregados sin registrar importes, descripciones, archivos CSV ni otros datos personales en analítica.
- [ ] Probar varios usuarios y dispositivos con datos ficticios; revisar índices/RLS y paginación cuando el volumen lo exija.
- [ ] Valorar cotizaciones de cripto/ETF y nuevas integraciones como proyecto experimental separado, con fuente, coste, fiabilidad y privacidad definidos antes de incorporarlas.
- **Criterio de cierre:** funcionalidades nuevas desplegadas sin pérdida de datos y con una ruta clara para resolver fallos.

## Decisiones abiertas

1. Proveedor definitivo de autenticación: el fundador indica que Google funciona con Firebase/Google Cloud; `main` documenta y contiene Supabase Auth. Confirmar el flujo publicado antes de tocar cuentas o sesiones.
2. Infraestructura y acceso del entorno de pruebas: elegir aislamiento de base y configurar OAuth para su dominio.
3. Migración a Next.js: decidir después de la auditoría y la maqueta; el rediseño y las animaciones pueden avanzar sin ella.
4. Nivel visual por defecto y alcance de los efectos: decidir tras pruebas móviles y accesibilidad.

## Registro de avances

| Fecha | Cambio | Comprobación | Referencia |
| --- | --- | --- | --- |
| 2026-09-25 | Roadmap inicial y orden de trabajo acordado | Documento publicado; tareas funcionales pendientes de ejecución/verificación | Commit que crea este archivo |
