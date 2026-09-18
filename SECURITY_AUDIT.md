# Auditoría de registro, duplicados y seguridad — 18/09/2026

## Alcance y verificaciones

Se examinó el código cliente, las migraciones SQL, la configuración de despliegue y el esquema activo del proyecto Supabase `nvbkftnithuduyazhidc`. Se ejecutaron `npm run build` y `npm audit --omit=dev --audit-level=high` (0 vulnerabilidades reportadas). Una prueba con «Presupuesto mensual.xlsx» detectó 29 movimientos válidos, bloqueó su reimportación en la misma cuenta y permitió asignarlos a otra cuenta. Otra prueba confirmó que un almacenamiento local dañado se conserva sin sobrescribir. El asesor de seguridad de Supabase devolvió 0 avisos tras la migración de permisos. Estas pruebas no sustituyen un test completo con usuarios reales y distintos dispositivos.

## Hallazgos corregidos

| Prioridad | Hallazgo | Corrección |
| --- | --- | --- |
| Alta | Los movimientos idénticos de banco y efectivo podían compartir la misma clave de importación; un conflicto de unicidad podía descartar una fila al sincronizar. | La huella incluye la cuenta y el control de duplicados mantiene la comprobación de registros antiguos. |
| Alta | Una caché local con JSON dañado se trataba como vacía y un cambio posterior podía sobrescribir datos recuperables. | Se bloquea la lectura y la escritura en ese espacio y se conserva el valor original; se muestra un error. |
| Media | La paginación de más de 500 registros en Supabase no tenía orden estable y podía omitir o repetir filas entre páginas. | Orden por clave estable para cada tabla antes de aplicar rangos. |
| Media | Errores de registro y límites de correo aparecían en bruto; no había una ruta clara para corregir un correo mal escrito. | Mensajes de error en español, captura de fallos de conexión y opción explícita de escribir otro correo tras solicitar confirmación. |
| Media | El rol anónimo tenía privilegios sobre las tablas aunque RLS impedía leer filas. | Se revocaron sus privilegios en las cinco tablas; `authenticated` mantiene acceso, siempre filtrado por RLS. |
| Media | Faltaban cabeceras defensivas en el alojamiento. | Política CSP, `nosniff`, política de referencia y restricción de cámara, micrófono, ubicación y pagos. |
| Baja | Un importe menor de medio céntimo podía redondearse a cero y fallar al guardar en la base. | Validación del importe redondeado antes de confirmar la importación. |

## Comprobaciones de base de datos

Las cinco tablas financieras tienen RLS activado y cuatro políticas por tabla para `authenticated`: lectura, inserción, actualización y borrado restringidos a `auth.uid() = user_id`. La actualización comprueba tanto el propietario de la fila anterior como el de la nueva. El índice único `(user_id, import_key)` evita duplicar una importación en la nube, incluso entre dispositivos. Tras revocar privilegios anónimos, `has_table_privilege('anon', …, 'select')` es falso para las cinco tablas; para `authenticated` es verdadero. El proyecto no expone una clave `service_role` en el código cliente.

No se realizó una prueba real con dos cuentas autenticadas: la conexión disponible para consultas SQL no permitió asumir los roles de `anon` o `authenticated`. El resultado sobre aislamiento está respaldado por políticas y privilegios inspeccionados, no por una prueba extremo a extremo de acceso cruzado.

## Bloqueos y riesgos pendientes

1. **Envío de correos para producción (alto, pendiente de configuración externa).** El SMTP integrado de Supabase solo entrega a direcciones autorizadas del equipo y actualmente tiene un límite de 2 correos por hora para el proyecto. No se puede aumentar ese límite integrado desde SQL ni desde la web cliente. Configurar un SMTP propio y ajustar el cupo de forma moderada en **Authentication → Rate Limits**. Mantener confirmación por correo y, si el registro será público, configurar CAPTCHA. No se pudo inspeccionar ni cambiar la configuración privada de Auth mediante las herramientas conectadas; no se afirma que el SMTP del proyecto sea el integrado, solo que su límite se aplicará si lo es.
2. **Confirmación de cuenta (alto, por verificar).** Comprobar en **Authentication → URL Configuration** que Site URL y Redirect URLs incluyen `https://brujula-finanzas-gamma.vercel.app`. La configuración no es visible mediante las consultas SQL disponibles. Probar con un correo propio y una cuenta de prueba cuando el envío SMTP esté operativo.
3. **Sincronización concurrente (medio).** Si dos dispositivos editan simultáneamente el mismo registro, prevalece el último cambio sincronizado. La cola local no es un historial contable inmutable ni una resolución de conflictos para edición simultánea.
4. **Datos locales (medio).** La aplicación guarda movimientos en el almacenamiento del navegador para funcionar sin conexión. Quien acceda al perfil local del navegador o ejecute una extensión maliciosa puede acceder a ellos; borrar los datos del navegador puede hacer perder cambios no sincronizados. El CSP reduce algunas vías de inyección, pero no cifra la caché local.
5. **Pruebas de acceso reales.** La confirmación de correo, el restablecimiento de contraseña, el reenvío de confirmaciones y el aislamiento entre dos usuarios reales requieren pruebas extremo a extremo con cuentas de prueba; no se han simulado envíos masivos para no agotar el cupo de correos ni afectar a otros usuarios.

## Decisión sobre límites de intentos

No se desactivaron los límites de intentos ni de correos. Protegen las cuentas contra fuerza bruta y abuso del servicio de envío. Se hizo posible editar el correo en el formulario y reconocer los errores de cuota; una nueva dirección todavía necesita un correo de confirmación y por tanto estará sujeta al cupo global del proveedor. Documentación oficial: [límites de Auth](https://supabase.com/docs/guides/auth/rate-limits) y [SMTP propio](https://supabase.com/docs/guides/auth/auth-smtp).

## Actualización: acceso por código

La interfaz posterior a esta auditoría cambia el acceso por contraseña por OTP de seis cifras enviado al correo. Solo llama a `verifyOtp` después de introducir el código; solicitar el envío no abre una sesión. La creación de nuevas cuentas por OTP se mantiene activada. El nuevo flujo no se ha probado con un correo real: depende del envío SMTP, de las plantillas de **Confirm sign up** y **Magic link / OTP**, y del despliegue del frontend. Ver `supabase/OTP_SETUP.md`. El código por email sustituye a la contraseña en la interfaz; **no es un segundo factor añadido a una contraseña**. Quien controle el buzón puede iniciar sesión y debe protegerlo adecuadamente.

En la primera compilación automática de Vercel desde GitHub faltaban las variables públicas Vite y el acceso a Supabase desapareció de la interfaz. Se añadió `.env.production` al repositorio con **solo** la URL pública del proyecto y la clave `sb_publishable_…`, que por diseño se distribuye a todos los navegadores. Ninguna clave secreta ni de SMTP se guardó en GitHub. La migración de permisos y RLS sigue siendo indispensable: la clave publicable por sí sola no autoriza a leer datos ajenos.
