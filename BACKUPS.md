# Copias de seguridad de Brújula

Los commits de GitHub solo protegen el código. La base de datos de Supabase
requiere una copia independiente. La tarea `.github/workflows/backup.yml`
exporta roles, estructura y datos, cifra el archivo antes de subirlo como
artefacto de GitHub Actions y lo conserva 30 días. No subas a GitHub extractos
SQL, contraseñas ni archivos descifrados. Los artefactos contienen datos
personales cifrados: limita quién puede descargarlos.

## Activar las copias

1. En Supabase abre el proyecto `nvbkftnithuduyazhidc` y pulsa **Connect**.
   Copia la cadena de conexión de **Session pooler**. Necesitarás la contraseña
   de la base de datos; la clave pública de la web no sirve para exportarla.
2. En GitHub, repositorio **KH4IN/Brujula** → **Settings** → **Secrets and
   variables** → **Actions**, crea los secretos `SUPABASE_BACKUP_DB_URL`
   (cadena completa con contraseña) y `BRUJULA_BACKUP_PASSPHRASE` (una frase
   aleatoria de al menos 24 caracteres guardada fuera de GitHub). No compartas
   ninguno por chat ni lo guardes en el repositorio.
3. En **Actions** → **Copia cifrada de Supabase** → **Run workflow**, ejecuta
   una copia manual. Comprueba que la ejecución termina en verde y que ofrece
   el artefacto `brujula-backup-...`. Después se ejecutará cada día a las
   02:17 UTC. Revisa periódicamente el espacio de artefactos disponible.

Si faltan los secretos, la ejecución fallará explícitamente: **no habrá copia**.
El proyecto y la web siguen funcionando, pero GitHub no sustituye una copia
externa de larga duración. Descarga periódicamente el artefacto cifrado a un
almacenamiento privado adicional antes de que caduque.

## Comprobar y restaurar en un proyecto aislado

Descarga el artefacto de Actions a un equipo bajo tu control y descífralo
localmente. `gpg` pedirá la frase de cifrado; no la pases en argumentos ni en
archivos de texto que acabes subiendo a la nube.

```bash
gpg --output brujula.tar.gz --decrypt brujula-<run-id>-<attempt>.tar.gz.gpg
mkdir -p brujula-restore
tar -xzf brujula.tar.gz -C brujula-restore
```

Crea un **proyecto Supabase separado para restauración** y obtén su cadena de
conexión. Confirma antes de continuar que la URL apunta al proyecto nuevo,
nunca a `nvbkftnithuduyazhidc`. Desde un equipo con `psql`, usa el
procedimiento oficial y la cadena del proyecto nuevo:

```bash
: "${RESTORE_DB_URL:?Configura la URL del proyecto de restauración}"
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

Verifica los recuentos agregados de `auth.users`, `public.transactions`,
`public.budgets`, `public.goals`, `public.investments` y
`public.account_settings` frente a los anotados al hacer la copia. Comprueba
también las políticas RLS y un inicio de sesión de prueba en el proyecto
aislado. La importación completa de usuarios y configuración OAuth puede
necesitar pasos adicionales: **no sustituyas la producción** hasta comprobarla.
Elimina los SQL descifrados del equipo al terminar la prueba.

Fuentes: [copias en Supabase](https://supabase.com/docs/guides/platform/backups)
y [restauración con CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
