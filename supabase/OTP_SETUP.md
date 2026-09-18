# Activar acceso por correo y código en Brújula

La interfaz usa `signInWithOtp()` y `verifyOtp({ type: 'email' })`. Es un acceso **sin contraseña**: recibir el código y verificarlo inicia la sesión o crea la cuenta si aún no existe. Las cuentas que ya tenían contraseña conservan sus datos al entrar con el mismo correo. Una sesión activa no exige otro código en cada recarga.

Para activar el flujo real en el proyecto Supabase `nvbkftnithuduyazhidc`:

1. **Publicar primero el nuevo frontend.** El sitio anterior aún espera enlaces de confirmación: cambiar ahora el correo a «solo código» rompería su registro.
2. En Supabase → **Authentication → Emails → Email Templates**, cambiar tanto **Confirm sign up** como **Magic link / OTP**. Usar el asunto `Tu código de acceso a Brújula` y pegar el contenido de `supabase/email-otp.html` en ambas plantillas. Mantener literalmente `{{ .Token }}`: Supabase lo sustituye por un código de seis cifras. Probar tanto un correo nuevo como uno ya registrado.
3. En **Authentication → URL Configuration**, fijar Site URL a `https://brujula-finanzas-gamma.vercel.app` y permitir esa dirección en Redirect URLs; mantener la confirmación de email.
4. Si el acceso debe funcionar con cualquier dirección, configurar **Authentication → SMTP Settings** con un proveedor de envío y un remitente verificado. No hace falta crear un buzón personal para cada usuario. El servicio integrado de Supabase solo envía a direcciones autorizadas del proyecto y tiene un límite actual de 2 correos/hora para todo el proyecto; no sirve para un registro público.
5. En **Authentication → Sign In / Providers → Email**, reducir la caducidad del OTP a un tiempo razonable (por ejemplo 10 minutos). Con SMTP propio, ajustar el cupo de envíos según el proveedor y mantener el límite por usuario. Si se abre el registro al público, configurar protección contra bots antes de aumentar el cupo. No desactivar las restricciones de intentos.

Al comprobar el flujo: solicitar código, verificarlo, probar un código erróneo, cambiar el correo, comprobar la espera del reenvío y entrar desde otro dispositivo. Ningún código real ni credencial SMTP debe incluirse en el repositorio.

Documentación: [OTP por correo](https://supabase.com/docs/guides/auth/auth-email-passwordless), [plantillas](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [límites](https://supabase.com/docs/guides/auth/rate-limits).
