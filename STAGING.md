# Entorno de pruebas de Brújula

Fecha de alta: 25-09-2026.

## Recursos

- Código: rama `staging` de `KH4IN/Brujula`.
- Vista previa fija: https://brujula-finanzas-git-staging-kh4ins-projects.vercel.app/
- Supabase aislado: proyecto `Brújula pruebas`, ref `xxwtwlpgnkxfufywtxpt`, región `eu-west-1`.
- Producción: rama `main` y proyecto Supabase `nvbkftnithuduyazhidc`.

El proyecto de pruebas se creó desde cero. Se aplicaron, por orden, `schema.sql`, `002_tracking.sql`, `003_import_key.sql`, `004_transfers.sql`, `005_security.sql` y `006_accounts_portfolio.sql`. Las cinco tablas financieras estaban vacías al comprobarlas, con RLS y cuatro políticas por tabla limitadas al rol `authenticated`. No se copiaron usuarios, contraseñas ni movimientos productivos. Google OAuth está deshabilitado en la configuración de `staging`; para probar sincronización se empleará correo/contraseña cuando el correo y las URL de retorno estén configurados.

La rama `staging` contiene su propia `.env.production` con URL y clave **publicable** del proyecto de pruebas y su `vercel.json` con CSP dirigida a ese proyecto. Además, `src/data.ts` fija explícitamente la conexión a «Brújula pruebas», incluso si Vercel heredase variables de producción, y `src/features/Auth.tsx` oculta Google en pruebas. Esos cuatro archivos son específicos del entorno y **no deben fusionarse en `main`**. Al publicar funcionalidades, llevar solo los commits o archivos de la función validados en pruebas a una PR contra `main`; revisar el diff para excluir configuración de `staging`.

## Comprobaciones realizadas

- Supabase comunicó coste de **0 €/mes** para un nuevo proyecto en la organización `Brujula`; se eligió esa opción y no una rama con coste por hora.
- Las seis migraciones finalizaron con éxito en el proyecto nuevo.
- Las cinco tablas financieras estaban vacías, con RLS activo; cada una tiene políticas SELECT/INSERT/UPDATE/DELETE para `authenticated` con condición `auth.uid() = user_id`. El rol `anon` no tiene SELECT en esas tablas. El asesor de seguridad del proyecto de pruebas no devolvió avisos en ese momento.
- Vercel generó despliegues `READY` para `0ce24c78`, el cambio de tema y la conexión fijada en `37a35c15`. La portada del alias respondió 200 con CSP del proyecto de pruebas antes del último commit; tras este, el acceso automatizado a la vista previa volvió a redirigir al SSO de Vercel. La prueba visual del último despliegue queda pendiente.
- Aún **no se ha comprobado** el contenido del JavaScript publicado ni una sesión con sincronización: la lectura automatizada de los archivos protegidos redirige al SSO de Vercel. La configuración de redirecciones de Auth requiere abrir el panel de Supabase; el navegador disponible solicitó inicio de sesión.

## Uso y límites

Usa datos ficticios. La protección de Vercel puede pedir tu cuenta antes de mostrar la vista previa, y el fundador acepta ese acceso para sus pruebas. Los datos locales de ese dominio no son los de la web de producción. Las pruebas con cuenta deben esperar a que las URL de retorno y el correo de prueba estén configurados y el flujo esté verificado. En este proyecto no se planifican Google OAuth ni copias de seguridad de los datos ficticios.

Antes de cada publicación en producción: pruebas, build, revisión de los movimientos y sesiones afectados, diff entre ramas y referencia de rollback. Nunca copiar a `main` la `.env.production`, CSP, `src/data.ts` o `src/features/Auth.tsx` de `staging` sin comparar los cambios propios de pruebas.
