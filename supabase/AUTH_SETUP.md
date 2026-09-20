# Acceso a Brújula

Brújula utiliza **Supabase Auth** para mantener el mismo ID de usuario y las políticas RLS de la base de datos. En «Iniciar sesión» se puede entrar con correo y contraseña, o pedir un **enlace por correo**. En «Registrarse» se introduce correo, contraseña y confirmación de contraseña; el cliente llama a `signUp`. Si la configuración de Supabase exige confirmar la dirección, `signUp` no devuelve una sesión hasta recibir y abrir el correo de confirmación. No se puede desactivar esa condición desde el formulario web. La preferencia de tema se guarda en los metadatos del usuario de Supabase al iniciar sesión.

## Enlaces y entrega de correo

- En Supabase → Authentication → URL Configuration, establecer como Site URL `https://brujula-finanzas-kh4ins-projects.vercel.app/`. Añadir además `https://brujula-finanzas-gamma.vercel.app/` a Redirect URLs para admitir ambos dominios. Para desarrollo, añadir solo los orígenes locales que vayas a usar.
- En Authentication → Email Templates, mantener **Magic Link** y **Confirm sign up** con `{{ .ConfirmationURL }}`. Para recuperar contraseña, el enlace de **Reset password** debe conservar `{{ .ConfirmationURL }}`. No aplicar la antigua plantilla `supabase/email-otp.html`: cambiaría los enlaces por códigos que esta interfaz ya no solicita.
- La opción Authentication → Providers → Email → **Confirm Email** determina si el registro con contraseña requiere un enlace. Desactivarla da acceso inmediato pero permite registrar una dirección ajena sin demostrar su propiedad y complica recuperar la cuenta; para una aplicación financiera conviene mantenerla y configurar la entrega. Esta opción debe decidirse en el panel de Supabase, no con una variable del cliente.
- Para correos fuera del equipo de Supabase, configurar Authentication → SMTP Settings con un proveedor de envío. El servicio de correo integrado tiene limitaciones y no es adecuado para público general. Una cuenta separada de Gmail puede enviar por SMTP mediante verificación en dos pasos y contraseña de aplicación, sujeta a los límites de Google. Configurar remitente y credenciales **solo** en Supabase, nunca en GitHub o variables `VITE_`. Gmail SMTP y Google OAuth son configuraciones independientes.
- Comprobar con una dirección de prueba externa que llegan los enlaces de registro y recuperación, que redirigen al dominio público, y que se puede abrir desde iPhone. Mantener protección frente a abuso y límites de intentos razonables.

## Google OAuth

Haber habilitado Google en Firebase no habilita automáticamente Google en Supabase. Para que los datos sigan bajo la misma autenticación y RLS, Brújula usa `supabase.auth.signInWithOAuth({provider:'google'})` directamente.

1. En Google Cloud del proyecto `brujula-kh`, crear un cliente OAuth de tipo **Aplicación web**. Configurar los orígenes JavaScript `https://brujula-finanzas-kh4ins-projects.vercel.app` y `https://brujula-finanzas-gamma.vercel.app`, y la URI de redirección autorizada `https://nvbkftnithuduyazhidc.supabase.co/auth/v1/callback`. Completar la pantalla de consentimiento si Google la requiere; en modo de prueba, añadir las cuentas de prueba.
2. En Supabase → Authentication → Providers → Google, habilitar Google y pegar allí el **Client ID** y **Client Secret** de ese cliente. El secreto nunca debe copiarse al frontend. Revisar la URL pública y redirecciones en Supabase.
3. Probar una cuenta Google nueva y otra existente: cerrar sesión, reabrir, verificar sincronización y que el UUID de usuario corresponde al esperado. Si ya existen movimientos con acceso por correo, comprobar la vinculación de identidades antes de tratar ambos inicios de sesión como equivalentes.
4. El propietario ha indicado que configuró Google y los dominios; `VITE_GOOGLE_OAUTH_ENABLED=true` muestra el botón de acceso en producción. Comprobar el flujo real desde ambas URLs con una cuenta de prueba y, antes de usar una cuenta con movimientos, confirmar que los datos están en el UUID correcto. Mostrar el botón no confirma que la configuración externa funciona.

No se ha configurado un SMTP ni el secreto de Google OAuth por medio de este repositorio.

Documentación: [enlaces de correo](https://supabase.com/docs/guides/auth/auth-email-passwordless), [plantillas](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [contraseñas de aplicación de Google](https://support.google.com/accounts/answer/185833).
