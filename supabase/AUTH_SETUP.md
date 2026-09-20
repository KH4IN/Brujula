# Acceso a Brújula

Brújula utiliza **Supabase Auth** para mantener el mismo ID de usuario y las políticas RLS de la base de datos. En «Iniciar sesión» se puede entrar con correo y contraseña, o pedir un **enlace por correo**. En «Registrarse» se pide un enlace para verificar la dirección; una vez dentro se puede establecer contraseña desde el menú lateral. El correo puede abrirse en otro dispositivo: la sesión se crea allí. La preferencia de tema se guarda en los metadatos del usuario de Supabase al iniciar sesión.

## Enlaces y entrega de correo

- En Supabase → Authentication → URL Configuration, establecer como Site URL `https://brujula-finanzas-gamma.vercel.app/` y añadir esa URL a Redirect URLs. Para desarrollo, añadir solo los orígenes locales que vayas a usar.
- En Authentication → Email Templates, mantener **Magic Link** y **Confirm sign up** con `{{ .ConfirmationURL }}`. Para recuperar contraseña, el enlace de **Reset password** debe conservar `{{ .ConfirmationURL }}`. No aplicar la antigua plantilla `supabase/email-otp.html`: cambiaría los enlaces por códigos que esta interfaz ya no solicita.
- Para correos fuera del equipo de Supabase, configurar Authentication → SMTP Settings con un proveedor de envío. El servicio de correo integrado tiene limitaciones y no es adecuado para público general. Una cuenta separada de Gmail puede enviar por SMTP mediante verificación en dos pasos y contraseña de aplicación, sujeta a los límites de Google. Configurar remitente y credenciales **solo** en Supabase, nunca en GitHub o variables `VITE_`. Gmail SMTP y Google OAuth son configuraciones independientes.
- Comprobar con una dirección de prueba externa que llegan los enlaces de registro y recuperación, que redirigen al dominio público, y que se puede abrir desde iPhone. Mantener protección frente a abuso y límites de intentos razonables.

## Google OAuth

Haber habilitado Google en Firebase no habilita automáticamente Google en Supabase. Para que los datos sigan bajo la misma autenticación y RLS, Brújula usa `supabase.auth.signInWithOAuth({provider:'google'})` directamente.

1. En Google Cloud del proyecto `brujula-kh`, crear o localizar un cliente OAuth de tipo **Aplicación web** y configurar como URI de redirección autorizada `https://nvbkftnithuduyazhidc.supabase.co/auth/v1/callback`. Completar la pantalla de consentimiento si Google la requiere; en modo de prueba, añadir las cuentas de prueba.
2. En Supabase → Authentication → Providers → Google, habilitar Google y pegar allí el **Client ID** y **Client Secret** de ese cliente. El secreto nunca debe copiarse al frontend. Revisar la URL pública y redirecciones en Supabase.
3. Probar una cuenta Google nueva y otra existente: cerrar sesión, reabrir, verificar sincronización y que el UUID de usuario corresponde al esperado. Si ya existen movimientos con acceso por correo, comprobar la vinculación de identidades antes de tratar ambos inicios de sesión como equivalentes.
4. Tras comprobar el flujo, establecer `VITE_GOOGLE_OAUTH_ENABLED=true` en el build de producción y publicar. Hasta entonces, el botón de Google permanece oculto para evitar un acceso que no funciona.

No se ha configurado un SMTP ni el secreto de Google OAuth por medio de este repositorio.

Documentación: [enlaces de correo](https://supabase.com/docs/guides/auth/auth-email-passwordless), [plantillas](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [contraseñas de aplicación de Google](https://support.google.com/accounts/answer/185833).
