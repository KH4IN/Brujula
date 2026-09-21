# Copias de seguridad de Brújula

Los commits protegen el código, no los movimientos de Supabase. El proyecto
está en el plan gratuito, que no incluye las copias diarias automáticas.
`scripts/backup-local.sh` crea una copia cifrada **en tu propio equipo**;
no la sube a GitHub ni a otros servicios.

## Crear una copia en un ordenador de confianza

Instala [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
Docker y GnuPG. En el panel Supabase del proyecto `nvbkftnithuduyazhidc`,
abre **Connect** y copia la cadena de conexión **Session pooler**. Necesitas
la contraseña de la base de datos; la clave pública de la web no vale.

Prepara una carpeta privada **fuera del repositorio**, por ejemplo una unidad
externa cifrada. En tu terminal exporta `BACKUP_DB_URL` y
`BACKUP_OUTPUT_DIR`; ejecuta `bash scripts/backup-local.sh`. GnuPG pedirá
una frase larga para cifrar la copia. Guarda esa frase aparte: sin ella no
podrás restaurar. Evita pegar la cadena de conexión o la frase en chats,
capturas o archivos del repositorio.

El script exporta roles, estructura y datos, cifra el paquete y elimina sus
archivos temporales. Comprueba que aparece `brujula-<fecha>.tar.gz.gpg` en la
carpeta elegida. Guarda otra copia **cifrada** en un segundo soporte privado.
Repite el proceso regularmente y antes de cambios de esquema. La ejecución
de este script nunca se hace desde la web de Brújula.

## Verificar una restauración

En un equipo privado, descifra y extrae la copia:

```bash
gpg --output brujula.tar.gz --decrypt brujula-YYYYMMDDTHHMMSSZ.tar.gz.gpg
mkdir -p brujula-restore
tar -xzf brujula.tar.gz -C brujula-restore
```

Crea un **proyecto de Supabase separado** y obtén su URL de conexión. En la
terminal, establece `RESTORE_DB_URL` con la URL de ese proyecto. Este guardia
detiene el proceso si la URL pertenece a producción:

```bash
: "${RESTORE_DB_URL:?Falta la URL del proyecto de restauración}"
case "$RESTORE_DB_URL" in
  *nvbkftnithuduyazhidc*) echo 'La URL apunta a producción; cancelado' >&2; exit 1 ;;
esac
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file brujula-restore/roles.sql \
  --file brujula-restore/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file brujula-restore/data.sql \
  --dbname "$RESTORE_DB_URL"
```

Compara recuentos agregados de `auth.users` y las cinco tablas financieras,
y revisa las políticas RLS. La restauración de OAuth, almacenamiento de
archivos o configuración del proyecto puede requerir pasos adicionales.
Nunca cambies la web para apuntar a ese proyecto antes de comprobarla.
Elimina los SQL descifrados del equipo tras la prueba.

Fuentes: [copias en Supabase](https://supabase.com/docs/guides/platform/backups)
y [restauración con CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
