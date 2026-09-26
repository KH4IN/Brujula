# Entorno de pruebas de Brújula

Fecha de alta: 25-09-2026.

## Recursos

- Código: rama `staging` de `KH4IN/Brujula`.
- Vista previa fija: https://brujula-finanzas-git-staging-kh4ins-projects.vercel.app/
- Supabase aislado: proyecto `Brújula pruebas`, ref `xxwtwlpgnkxfufywtxpt`, región `eu-west-1`.
- Producción: rama `main` y proyecto Supabase `nvbkftnithuduyazhidc`.

El proyecto de pruebas se creó desde cero. Se aplicaron, por orden, `schema.sql`, `002_tracking.sql`, `003_import_key.sql`, `004_transfers.sql`, `005_security.sql` y `006_accounts_portfolio.sql`. Las cinco tablas financieras estaban vacías al comprobarlas, con RLS y cuatro políticas por tabla limitadas al rol `authenticated`. No se copiaron usuarios, contraseñas ni movimientos productivos. Google OAuth está deshabilitado en la configuración de `staging`; para probar sincronización se emplea correo/contraseña. El fundador informó que guardó las URL de retorno y completó una primera prueba.

La rama `staging` contiene su propia `.env.production` con URL y clave **publicable** del proyecto de pruebas y su `vercel.json` con CSP dirigida a ese proyecto. Además, `src/data.ts` fija explícitamente la conexión a «Brújula pruebas», incluso si Vercel heredase variables de producción, y `src/features/Auth.tsx` oculta Google en pruebas. Esos cuatro archivos son específicos del entorno y **no deben fusionarse en `main`**. Al publicar funcionalidades, llevar solo los commits o archivos de la función validados en pruebas a una PR contra `main`; revisar el diff para excluir configuración de `staging`.

## Comprobaciones realizadas

- Supabase comunicó coste de **0 €/mes** para un nuevo proyecto en la organización `Brujula`; se eligió esa opción y no una rama con coste por hora.
- Las seis migraciones finalizaron con éxito en el proyecto nuevo.
- Las cinco tablas financieras estaban vacías, con RLS activo; cada una tiene políticas SELECT/INSERT/UPDATE/DELETE para `authenticated` con condición `auth.uid() = user_id`. El rol `anon` no tiene SELECT en esas tablas. El asesor de seguridad del proyecto de pruebas no devolvió avisos en ese momento.
- Vercel generó despliegues `READY` para `0ce24c78`, el cambio de tema y la conexión fijada en `37a35c15`. La portada del alias respondió 200 con el último despliegue consultado. El archivo JavaScript protegido devolvió una redirección al SSO de Vercel; su contenido y el flujo visual siguen sin prueba completa.
- El fundador informó que completó registro, confirmación y un movimiento ficticio. Consulta de recuentos en el proyecto aislado: **1 usuario, 1 correo confirmado, 1 movimiento y 1 propietario de movimientos**; no se consultaron correo, importe ni descripción. Esto comprueba llegada de datos a la base de pruebas, pero no prueba por sí solo que el navegador los recargue ni que otro dispositivo los vea. El JavaScript protegido sigue redirigiendo al SSO de Vercel y no se inspeccionó su contenido.


- El fundador informó el 26-09-2026 que pudo iniciar sesión con una segunda cuenta y que la interfaz en iPhone y la importación de un CSV financiero sin red funcionaron. Esta es una comprobación manual reportada; no confirma aún lectura del mismo movimiento en dos dispositivos ni aislamiento entre dos cuentas reales. No se recopilaron contenidos financieros del CSV.

## Publicación y vuelta atrás

1. Anota en cada PR el commit de `staging` probado, el commit anterior de `main`, el despliegue `READY` anterior de producción y los pasos de comprobación. Comprueba el diff: no debe incluir los cuatro archivos de configuración exclusivos de pruebas.
2. Publica en `main` solo después de probar la función en `staging`. Comprueba la URL pública, el acceso, una operación de lectura y escritura del flujo afectado y que la sincronización se recupera tras refrescar. Usa exclusivamente datos ficticios para las pruebas compartidas.
3. Si falla el frontend en producción, identifica el último despliegue sano de `main` en Vercel y restaura ese despliegue mediante **Rollback**. Después prepara un `git revert` del commit o PR defectuoso en una rama y fusiónalo a `main` para que el siguiente despliegue automático no vuelva a publicar el fallo. Anota los identificadores reales del incidente; no uses la rama `staging` como artefacto de producción.
4. Si el cambio incluye esquema o datos, no restaures a ciegas una versión de frontend incompatible ni reviertas migraciones destructivas en caliente. Primero comprueba compatibilidad con las dos versiones, conserva una copia cifrada verificable y prepara una migración correctiva o restauración ensayada en aislamiento.
5. Comunica al equipo qué función falla, desde cuándo, el estado de las operaciones pendientes y cuándo se ha comprobado la recuperación. Evita capturas, logs o tickets con importes, descripciones, correos o CSV de usuarios.

La URL de pruebas y la de producción son dominios distintos: sus datos locales no se comparten. Restaurar un despliegue no restaura automáticamente datos de Supabase ni los datos guardados en el navegador. Si hay escrituras locales pendientes, no borres el almacenamiento ni aconsejes reinstalar la PWA antes de recuperarlas.

## Uso y límites

Usa datos ficticios. La protección de Vercel puede pedir tu cuenta antes de mostrar la vista previa, y el fundador acepta ese acceso para sus pruebas. Los datos locales de ese dominio no son los de la web de producción. Las pruebas con cuenta deben esperar a que las URL de retorno y el correo de prueba estén configurados y el flujo esté verificado. En este proyecto no se planifican Google OAuth ni copias de seguridad de los datos ficticios.

Antes de cada publicación en producción: pruebas, build, revisión de los movimientos y sesiones afectados, diff entre ramas y referencia de rollback. Nunca copiar a `main` la `.env.production`, CSP, `src/data.ts` o `src/features/Auth.tsx` de `staging` sin comparar los cambios propios de pruebas.
