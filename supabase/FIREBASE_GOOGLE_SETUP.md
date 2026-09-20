# Google con Firebase y la base de datos actual

El botón de Google usa Firebase Authentication para verificar la identidad y entrega el **ID token de Google**, no el de Firebase, a `supabase.auth.signInWithIdToken`. Supabase crea la sesión que ya usan las políticas RLS y los identificadores UUID de Brújula. Así no se altera el esquema ni se traslada automáticamente dinero entre identidades.

## Configuración pendiente antes del lanzamiento

1. En Firebase `brujula-kh` → **Authentication → Sign-in method → Google**, activar Google y elegir el correo de asistencia solicitado por Firebase.
2. En **Authentication → Settings → Authorized domains**, añadir `brujula-finanzas-gamma.vercel.app`. Para desarrollo, añadir `localhost` solo si se prueba localmente. Mantener los dominios de Firebase que requiera su propio flujo.
3. En el proyecto Google Cloud asociado a Firebase, localizar el cliente OAuth web que usa Firebase para Google. En Supabase `nvbkftnithuduyazhidc` → **Authentication → Providers → Google**, activar Google con el Client ID de ese cliente y su Client Secret. Mantener el secreto exclusivamente en los paneles de proveedores; nunca en GitHub, el frontend ni variables `VITE_`. Si el cliente OAuth exige redirección a Supabase, autorizar `https://nvbkftnithuduyazhidc.supabase.co/auth/v1/callback`. Configurar la URL pública en Supabase como `https://brujula-finanzas-gamma.vercel.app/`.
4. Probar en un dispositivo una cuenta Google de prueba sin movimientos, cerrar sesión, volver a entrar y verificar que persiste el mismo ID de usuario de Supabase. Probar una segunda cuenta para verificar el aislamiento de datos. Antes de usar una cuenta con movimientos, comprobar explícitamente si Google se vincula con el usuario de Supabase previo y conserva el mismo UUID; nunca confiar solo en que coincida el correo.
5. Solo después de esa comprobación, publicar el botón para todos los usuarios. El flujo anterior por código sigue disponible durante la transición.

Si la integración de Google en Supabase no está activada, Firebase puede reconocer al usuario pero Brújula no iniciará sesión ni sincronizará sus datos. No abrir accesos anónimos ni desactivar RLS para solventarlo.

Fuentes: [Google con Firebase](https://firebase.google.com/docs/auth/web/google-signin), [Google con Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google) y [token de identidad OIDC en Supabase](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken).
