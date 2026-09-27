# Kairós ↔ Brújula · contrato de integración en staging

Estado comprobado el 27-09-2026. Documento de preparación; la integración entre interfaces aún no está desplegada ni validada extremo a extremo.

## Estado y límites

- Brújula `staging` usa `https://xxwtwlpgnkxfufywtxpt.supabase.co` (`src/data.ts`). Producción usa otro proyecto; no intercambiar claves ni datos.
- En «Brújula pruebas» existen `kairos_*` y las migraciones `kairos_001` y `kairos_001b_permisos_minimos`. RLS está activo. La política `transactions` SELECT restringe a `auth.uid() = user_id`; las tablas propias de Kairós tienen políticas de usuario. Esto confirma esquema y políticas, no una prueba de sesión real.
- El proyecto Vercel `kairos-kh` existe, pero no tenía despliegues al comprobarlo. `KH4IN/Kairos` estaba vacío; el código en desarrollo está en `KH4IN/Ideas-de-aplicaciones-de-entorno-kh/kairos`, rama `claude/affectionate-clarke-jgtcs5`. Ese repositorio se consulta solo para lectura mientras Claude trabaja.
- Kairós lee `transactions` (id, amount, kind, category, description, occurred_on) del usuario autenticado y escribe solo sus tablas `kairos_*`. Su detección de recurrencias y conciliación puede marcar automáticamente un cobro como pagado si coincide por importe y fecha; revisar falsos positivos antes de dar ese estado por confirmado.

## Contrato mínimo para conectar ambas aplicaciones

1. Ambos despliegues de **pruebas** deben usar el mismo URL y clave pública del proyecto `xxwtwlpgnkxfufywtxpt`. Nunca usar una clave `service_role` en el navegador. Kairós debe configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el entorno Preview de Vercel. Verificar el valor efectivo en el artefacto publicado antes de invitar a usuarios.
2. **Bloqueo previo al primer despliegue:** `kairos/.env.production` en el código consultado contiene la URL del proyecto Supabase productivo `nvbkftnithuduyazhidc`. Un build de producción/Preview puede incorporar ese valor si no lo sustituye una variable de Vercel. Claude debe corregirlo o demostrar que el build de staging incorpora inequívocamente la URL de pruebas. No publicar ni probar con cuentas reales hasta verificarlo.
3. Supabase Auth comparte la identidad si ambas aplicaciones usan el mismo proyecto. El almacenamiento de sesión del navegador queda separado por origen; el primer salto a otro dominio requiere autenticarse allí. Registrar ambos dominios exactos y sus rutas de retorno en Auth → URL Configuration → Redirect URLs del proyecto de pruebas. No pasar tokens, contraseñas, identificadores o datos financieros por parámetros de URL.
4. Brújula sigue siendo la fuente de movimientos; Kairós solo lee esa tabla. Kairós mantiene la planificación y los cobros en sus tablas. Si se ofrece un enlace entre aplicaciones, abrir la ruta pública de la otra aplicación sin transportar datos sensibles. Añadirlo a la interfaz cuando exista una URL de staging estable y verificada.
5. Conciliación: vincular `kairos_cobros.transaction_id` con el UUID del movimiento, tratar relecturas de manera idempotente y mostrar coincidencias dudosas como propuestas pendientes de confirmación. No escribir movimientos en Brújula como efecto de la detección.

## Prueba conjunta cuando exista despliegue

| Caso | Resultado esperado |
| --- | --- |
| Build de Kairós y configuración Vercel | El cliente servido apunta exclusivamente a `xxwtwlpgnkxfufywtxpt`; no contiene URL ni clave del proyecto real. |
| Cuenta ficticia A en las dos aplicaciones | Inicio de sesión por separado; un gasto de A en Brújula aparece como candidato en Kairós tras sincronizar. |
| Cuenta ficticia B | Ninguna consulta de B devuelve movimientos o elementos de A. |
| Fechas e importes parecidos | Se muestra una propuesta revisable; no se confirma un cobro erróneo en silencio. |
| Reapertura y sincronización repetida | No crea cobros duplicados ni pierde el vínculo al movimiento. |
| Cierre de sesión y uso sin red | No se muestran datos de otra cuenta; la cola local se recupera sin duplicados al reconectar. |
| iPhone en staging | Acceso, retorno OAuth/OTP, lectura, navegación y estados vacíos funcionan en Safari; revisar consola, carga y errores agregados. |

Antes de dar la integración por terminada, registrar URL, SHA desplegado, proyecto Supabase efectivo y resultado de cada caso. No tocar producción ni fusionar por el mero hecho de que las migraciones existan.
