# Roadmap de Brújula

Documento vivo para ordenar el trabajo y registrar avances. Última revisión: 26 de septiembre de 2026.

## Cómo se usa

- `[ ]` pendiente; `[x]` terminado y comprobado. Cada casilla se marca en un commit que enlace el cambio o explique la comprobación.
- El trabajo nuevo se hace en una rama y se revisa mediante pull request. `main` publica producción; no se usa para experimentar.
- Antes de fusionar: `npm test`, `npm run build`, revisión de los flujos afectados y plan de vuelta atrás. Cambios de datos: copia comprobada y migración compatible.
- Una fase puede dividirse en PR pequeñas. Las decisiones abiertas se anotan aquí, sin dar por implementada una propuesta.

## Punto de partida

Brújula es una PWA React + TypeScript + Vite con módulos de cuentas, importación, gráficos, objetivos, cartera y persistencia local con sincronización a Supabase, según el código y la documentación de `main` revisados al crear este archivo. El fundador informa de que Google OAuth, la importación CSV y las copias cifradas en un repositorio privado ya funcionan. Esas afirmaciones se toman como contexto y se verificarán con pruebas específicas. La documentación de `main` aún describe el acceso de Google a través de Supabase y no confirma una integración de Firebase en producción; la arquitectura real de acceso debe aclararse antes de migrar.

## Fase 1 · Recuperar pruebas sin afectar a usuarios

- [x] Crear una rama de trabajo estable para pruebas y definir qué cambios llegan a ella y cuándo pasan a `main`: `staging` recibe cambios mediante PR; tras pruebas y revisión, se llevan a `main` solo los commits/archivos de la funcionalidad mediante una PR específica. `.env.production`, `vercel.json` y la protección de `src/data.ts` propios de `staging` nunca se fusionan a `main`.
- [x] Configurar un despliegue de pruebas con URL fija y acceso para el fundador/equipo, manteniendo producción pública en su dirección habitual. El fundador comprobó el acceso con otra cuenta, la importación sin red y la visualización en iPhone; falta verificar expresamente la sincronización cruzada en dos dispositivos.
- [x] Aislar los datos de prueba: proyecto Supabase «Brújula pruebas» creado desde cero con coste comunicado de 0 €/mes; seis migraciones aplicadas, cinco tablas vacías con RLS. No se copiaron datos de producción. Véase `STAGING.md`.
- [x] Configurar y verificar la conexión del entorno de pruebas: URL y clave publicable de Supabase fijadas en `staging` para impedir herencia de producción, CSP ajustada y Google OAuth desactivado. El fundador informó que accedió con una segunda cuenta; se había observado una cuenta confirmada y un movimiento en la base aislada. Persisten las pruebas de aislamiento entre dos usuarios reales y sincronización cruzada.
- [x] Registrar cómo volver al despliegue anterior y cómo comunicar un fallo al equipo. Procedimiento en `STAGING.md`; requiere anotar identificadores reales en cada incidente.
- **Criterio de cierre:** el equipo puede entrar a una URL de pruebas, iniciar sesión, crear datos ficticios y comprobar que producción no cambia.

### Estado de la fase 1 (25-09-2026)

El fundador ha aprobado el proyecto separado gratuito, sin Google OAuth ni copias de datos ficticios. «Brújula pruebas» (`xxwtwlpgnkxfufywtxpt`) está activo, con esquema vacío y aislado. El despliegue de `staging` llegó a READY y su portada respondió 200 con CSP dirigida exclusivamente a la URL del nuevo Supabase. El fundador informó que guardó la URL fija de `staging` como Site URL y Redirect URL en Supabase Auth. El fundador informó que completó la prueba manual. Una consulta de recuentos, sin leer datos personales, mostró 1 usuario confirmado y 1 movimiento asociado a un usuario en el proyecto de pruebas. El navegador automatizado sigue sin sesión compartida; no se ha observado el refresco visual ni una segunda sesión. Detalles en [STAGING.md](STAGING.md).

La vista previa de `staging` se construye correctamente y tiene alias estable `https://brujula-finanzas-git-staging-kh4ins-projects.vercel.app/`. Vercel exige su propio inicio de sesión en ese alias (respuesta 302 hacia `vercel.com/sso-api`). El fundador acepta ese acceso para las pruebas que hará personalmente; el fundador ya pudo completar el registro y guardar un movimiento; falta verificar el acceso desde otro dispositivo. El cliente de `staging` bloquea expresamente la URL de Supabase de producción; sin un proyecto aislado, funciona solo en modo local. La conexión Supabase ya enumera el proyecto productivo y ninguna rama de pruebas. El proyecto separado de coste comunicado 0 €/mes ya está creado en la organización `Brujula`, con las seis migraciones. Una rama con coste por hora se descartó. El acceso con cuenta y la escritura tienen evidencia en la base de pruebas. No introducir credenciales de producción para saltarse este paso.

## Fase 2 · Auditoría y correcciones de la base actual

- [ ] Revisar el flujo real de autenticación: proveedor utilizado en `main`, Google, correo/contraseña, recuperación, sesiones y vínculo de datos locales con la cuenta. Corregir la documentación desfasada.
- [ ] Auditar frontend en móvil y escritorio: navegación, accesibilidad, rendimiento, tema claro/oscuro, formularios con teclado de iPhone y estado sin conexión.
- [ ] Auditar persistencia y sincronización: aislamiento por usuario, RLS, conflictos entre dispositivos, borrados, errores de red, límites de volumen y ausencia de secretos en cliente/logs.
- [ ] Verificar importaciones CSV/XLSX con ejemplos sintéticos representativos, signos, cargo/abono, transferencias, duplicados y filas ambiguas. No prometer compatibilidad universal sin muestras reales.
- [x] Comprobar que las copias cifradas programadas se generan y restaurar la copia más antigua en Supabase local aislado; frecuencia diaria documentada. Retención y restauración remota completa siguen pendientes.
- [ ] Corregir los defectos hallados en PR pequeñas con pruebas centradas en cada fallo.
- **Criterio de cierre:** informe breve con hallazgos y riesgos pendientes, flujos críticos comprobados, y errores prioritarios corregidos.

### Primeros hallazgos de la fase 2 (25-09-2026)

- Supabase enumera cinco tablas financieras con RLS activado. Se revisaron las 20 políticas en producción y pruebas: están dirigidas a `authenticated` y limitan cada operación a `auth.uid() = user_id`; en pruebas el rol `anon` no tiene SELECT. Falta una prueba real con dos sesiones de usuarios diferentes. El asesor de seguridad avisa de que la protección contra contraseñas filtradas está desactivada. El asesor de rendimiento señala un índice de fecha aún sin uso; no retirarlo sin mediciones.
- En la base aislada, una consulta bajo el rol `authenticated` con la identidad del propietario devolvió 1 movimiento; con una identidad distinta devolvió 0. No se leyó contenido financiero ni se modificaron filas. Es una prueba positiva y negativa de SELECT con RLS, aunque aún falta una prueba real con dos sesiones y operaciones de escritura.
- En móvil, la regla general `.secondary-button{font-size:0}` ocultaba texto de acciones como revisar la importación y guardar el recuento de efectivo. [PR #28](https://github.com/KH4IN/Brujula/pull/28) corrigió la regla en `staging`; build local y Vercel READY. Se lleva a producción en una PR específica; falta una comprobación visual en iPhone real.
- En pantallas sin hover, las acciones de editar y borrar movimientos podían quedar invisibles en tabletas. [PR #25](https://github.com/KH4IN/Brujula/pull/25) lo corrigió en `staging`; el build local pasó. El mismo cambio se trasladó a producción en una PR separada.
- En [PR #18](https://github.com/KH4IN/Brujula/pull/18) se corrigió el texto desactualizado de registro y se mostró Google también al crear cuenta. Fusionada en `staging` (`cd0e967`); 32 pruebas locales y build correctos, Vercel READY. Falta prueba manual del flujo con backend de pruebas.
- Los módulos diferidos del importador CSV/Excel tampoco estaban en la caché inicial. [PR #30](https://github.com/KH4IN/Brujula/pull/30) añadió un manifiesto de assets al build y precarga en el service worker v4. 33 tests y build local correctos; el manifiesto publicado en la vista previa enumeró el módulo CSV. Falta prueba manual completa sin red en un teléfono.
- La PWA no precargaba el nuevo archivo del tema para el primer uso sin conexión. La URL pública de producción sirve ahora `brujula-shell-v3` con `/theme-init.js` en la lista de precarga. [PR #21](https://github.com/KH4IN/Brujula/pull/21) lo añadió a la caché de `staging` y [PR #22](https://github.com/KH4IN/Brujula/pull/22) lo llevó a `main`; build y simulación del evento install correctos.
- La CSP bloqueaba el script incrustado que aplicaba el tema guardado antes de React. [PR #19](https://github.com/KH4IN/Brujula/pull/19) lo cambió en `staging` por un archivo local permitido; [PR #20](https://github.com/KH4IN/Brujula/pull/20) trasladó exclusivamente ese cambio a `main`. Build y tres casos de inicialización correctos; la URL pública de producción respondió 200 y sirvió el script externo; prueba visual de persistencia pendiente.

- El código de `main` usa `supabase.auth.signInWithOAuth({provider:'google'})`, `signInWithPassword`, `signUp` y enlaces por correo; no incorpora el SDK de Firebase. El fundador informa de que Google funciona en la web, lo cual es compatible con Google como proveedor de Supabase. La copia de registro se actualizó para eliminar la advertencia desfasada sobre el correo; falta una prueba real de Google en producción.
- `src/ledger.ts` descarga las cinco tablas completas en páginas de 500 durante cada sincronización. Conviene medir antes de sustituirlo, como ya indica `ARCHITECTURE.md`.
- Las 32 pruebas y el build del snapshot local disponible pasaron; el snapshot puede estar por detrás de `main`, por lo que no se marca todavía la auditoría de `main` como terminada. El despliegue de `staging` para el commit `38bb5dd` terminó en estado READY.

### Comprobación de copias e importación (26-09-2026)

- El repositorio de copias `KH4IN/Brujula-Copias-de-seguridad-` sigue privado. Contiene cinco archivos `.tar.gz.brujula` cifrados; las ejecuciones programadas del 22 al 25 de septiembre terminaron en éxito. El workflow exige dos secretos, exporta roles/esquema/datos, cifra con AES-GCM y comprueba descifrado y contenido antes del commit. No se descargó ni descifró ninguna copia con datos reales.
- **Restauración local verificada el 26-09-2026:** [ejecución correcta](https://github.com/KH4IN/Brujula-Copias-de-seguridad-/actions/runs/36238277491) de la copia más antigua (22-09) en un runner aislado: 5 tablas públicas, 1 usuario y 20 políticas RLS. Se usaron los roles preexistentes de Supabase local, sin aplicar `roles.sql`; el archivo permanece en la copia. No se probó acceso de usuario en otro proyecto remoto ni se recuperaron objetos Storage u OAuth externo. El entorno «Brújula pruebas» sigue solo con datos ficticios.
- El importador limita archivos a 8 MB y la vista previa a 5.000 filas, procesa CSV/XLSX en el navegador y los 32 tests locales existentes pasaron. Siguen pendientes pruebas manuales con más formatos reales y mediciones con ficheros grandes; no se declara compatibilidad universal.
- La regla de acciones visibles en pantallas táctiles se publicó en `main` mediante [PR #26](https://github.com/KH4IN/Brujula/pull/26); el despliegue quedó `READY`. No se comprobó visualmente en una tableta real.

- El fundador informó el 26-09-2026 que la interfaz en iPhone, el inicio de sesión con una segunda cuenta y la importación de un CSV financiero sin red funcionaron sin problemas. No se recibieron capturas, datos del archivo ni pasos detallados; este resultado no valida todos los formatos, tamaños o un segundo dispositivo sincronizado.

### Siguiente bloque de la fase 2 (26-09-2026)

- El código de `main` usa Supabase Auth para contraseña, enlace de correo y Google como proveedor OAuth; no usa Firebase Auth. El fundador comunicó un acceso satisfactorio con una segunda cuenta, sin precisar el entorno; la base «Brújula pruebas» tenía un solo usuario al comprobarla el 26-09. La documentación de inicio se corrigió. Quedan recuperación real y vinculación de datos de invitado por comprobar.
- En la base aislada se ejecutó una transacción con rol `authenticated` y una identidad simulada ajena: SELECT devolvió cero; UPDATE y DELETE no afectaron filas; INSERT con propietario de otra identidad fue rechazado por RLS. La transacción se revirtió y los recuentos siguieron en 1 usuario y 1 movimiento. Falta una prueba entre dos cuentas reales y de conflictos entre dispositivos.
- [PR #35](https://github.com/KH4IN/Brujula/pull/35) se probó en `staging`; [PR #36](https://github.com/KH4IN/Brujula/pull/36) publicó la corrección en `main` (Vercel READY). La cuenta se sincroniza antes de incorporar datos de invitado; si hay saldos o registros incompatibles, se conservan ambos espacios y aparece un aviso. 36 tests y build correctos. Queda pendiente una interfaz para conciliar esos conflictos sin exportación manual.
- Continuar con conflictos entre dispositivos y una prueba real entre dos cuentas, sin mover datos de producción al proyecto de pruebas.

## Fase 3 · Diseñar una experiencia más visual

- [x] Dibujar y publicar una portada breve: patrimonio, cifras del mes, cuatro accesos y tres movimientos recientes; Análisis reúne gráficos y desgloses. Diseño en `DESIGN_PHASE3.md` y producción aprobada por el fundador.
- [ ] Diseñar pantallas y estados móviles primero (vacío, carga, error, sin conexión y datos abundantes). Usar Figma o una herramienta similar si acelera la revisión; conservar el diseño y sus decisiones en el repositorio.
- [ ] Definir componentes visuales reutilizables para tarjetas, gráficos, explicaciones al pulsar y navegación, respetando los modos claro y oscuro (gris/negro, morado y dorado en oscuro).
- [x] Revisar el diseño con el fundador antes de sustituir la portada principal: informó el 26-09 que iPhone y Análisis se ven bien; [PR #40](https://github.com/KH4IN/Brujula/pull/40) publicada en producción y Vercel READY.
- [x] Separar portada breve y Análisis; el círculo filtra ingresos/gastos, las categorías abren su desglose y las barras llevan al día en Movimientos. Tests/build y revisión visual del fundador; quedan auditorías de accesibilidad completas.
- **Criterio de cierre:** panel principal corto, rutas claras y detalles financieros comprensibles sin perder funciones actuales.

### Primera vista previa de la fase 3 (26-09-2026)

[PR #38](https://github.com/KH4IN/Brujula/pull/38) fusionada a `staging`: 36 pruebas y build correctos, despliegue Vercel READY en la [URL fija de pruebas](https://brujula-finanzas-git-staging-kh4ins-projects.vercel.app/). El panel principal se acorta y «Análisis» conserva el círculo de ingresos/gastos, el reparto por categorías, los presupuestos y el gráfico diario. Cada categoría o día abre su detalle. Estilos de accesos adaptados a móvil y ambos temas; transiciones cosméticas respetan movimiento reducido. Falta revisión visual del fundador en iPhone/escritorio y los estados vacíos antes de trasladar el diseño a `main`; no se modificaron datos ni esquema.

## Fase 4 · Modularidad y decisión sobre Next.js

- [ ] Separar con interfaces claras cálculos financieros, lectura de archivos, sincronización, autenticación y presentación; conservar formatos de datos y claves locales existentes.
- [ ] Medir carga inicial y sincronización con cuentas de prueba pequeñas y grandes. Priorizar consultas paginadas/incrementales y los cuellos de botella medidos.
- [x] Comparar Vite y Next.js según rutas, páginas públicas, servidor, PWA local y coste de migración. Decisión provisional: conservar Vite mientras se miden cuellos de botella y se separan módulos; criterios de revisión en `ARCHITECTURE.md`. Next.js no es requisito para usar Anime.js.
- [ ] Si se aprueba Next.js, migrar por etapas en pruebas. Conservar dominio, datos, PWA y sesiones; verificar OAuth, CSV, efectivo, presupuestos, sincronización y modo sin conexión antes de publicar.
- **Criterio de cierre:** arquitectura modular documentada y decisión de framework basada en pruebas, con migración completada solo si aporta valor demostrado.

### Primera iteración de la fase 4 (26-09-2026)

- [PR #41](https://github.com/KH4IN/Brujula/pull/41) en pruebas y [PR #42](https://github.com/KH4IN/Brujula/pull/42) en producción: cola local para 5.000 filas sintéticas ~306 → ~18 ms en una corrida de Node. 37 pruebas y build; Vercel READY. No es tiempo de importación total ni una medición móvil.
- [PR #43](https://github.com/KH4IN/Brujula/pull/43) en pruebas y [PR #44](https://github.com/KH4IN/Brujula/pull/44) en producción: resumen mensual puro en `finance.ts`, calculado una vez por cambio de movimientos, presupuestos o mes. 38 pruebas y build; Vercel READY. No cambió almacenamiento ni backend.
- El JS principal local ronda 429 kB (~128 kB gzip); faltan arranque en teléfono y tiempos reales de sincronización. La cola sigue enviando cada registro por separado y leyendo todas las tablas del usuario. Comparación de framework y siguientes mediciones documentadas en `ARCHITECTURE.md`.

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
| 2026-09-25 | Retorno de Auth de pruebas guardado por el fundador; caché PWA revisada | Login/sync aún sin prueba real; PR #21 en staging y #22 fusionada en producción | [PR #21](https://github.com/KH4IN/Brujula/pull/21) |
| 2026-09-25 | Aislamiento reforzado de staging y revisión de políticas | Vercel READY; 20 políticas inspeccionadas; anon sin SELECT; sesión real pendiente | [STAGING.md](STAGING.md) |
| 2026-09-25 | Inicialización de tema compatible con CSP en staging y main | Build y tres casos de preferencia correctos; PR limitadas a dos archivos | [PR #19](https://github.com/KH4IN/Brujula/pull/19), [PR #20](https://github.com/KH4IN/Brujula/pull/20) |
| 2026-09-25 | Proyecto gratuito «Brújula pruebas» y esquema aislado | Seis migraciones correctas; cinco tablas vacías y RLS activo; Vercel READY, portada 200; sesión pendiente | [STAGING.md](STAGING.md) |
| 2026-09-25 | Corrección del registro en `staging` y consulta de asesores de Supabase | PR #18 fusionada; 32 pruebas locales y build correctos; autenticación manual pendiente | [PR #18](https://github.com/KH4IN/Brujula/pull/18) |
| 2026-09-25 | Vista previa de `staging` y primeras comprobaciones de acceso/autenticación | Vercel READY; URL protegida por Vercel; modo local sin base de pruebas | [38bb5dd](https://github.com/KH4IN/Brujula/commit/38bb5dd4bc83709f2e9d788869b34486870f2b81) |
| 2026-09-25 | Rama `staging` creada y protección frente a la base productiva en `src/data.ts` | Commit `38bb5dd` en `staging`; despliegue de vista previa en curso | [38bb5dd](https://github.com/KH4IN/Brujula/commit/38bb5dd4bc83709f2e9d788869b34486870f2b81) |
| 2026-09-25 | Roadmap inicial y orden de trabajo acordado | Documento publicado; tareas funcionales pendientes de ejecución/verificación | Commit que crea este archivo |
