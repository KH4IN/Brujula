#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${BACKUP_DB_URL:?Define la URL de conexión a Supabase en tu terminal}"
: "${BACKUP_OUTPUT_DIR:?Define una carpeta privada de salida fuera del repositorio}"

case "$BACKUP_DB_URL" in
  *nvbkftnithuduyazhidc*) ;;
  *) echo 'La URL no pertenece al proyecto de Brújula; cancelado.' >&2; exit 1 ;;
esac
for command in supabase docker gpg tar; do
  command -v "$command" >/dev/null || { echo "Falta instalar: $command" >&2; exit 1; }
done
[[ -d "$BACKUP_OUTPUT_DIR" ]] || { echo 'La carpeta de salida no existe.' >&2; exit 1; }
output_dir="$(cd "$BACKUP_OUTPUT_DIR" && pwd -P)"
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
case "$output_dir/" in
  "$repo_dir/"*) echo 'La carpeta de salida debe estar fuera del repositorio.' >&2; exit 1 ;;
esac

temp_dir="$(mktemp -d)"
trap 'rm -rf -- "$temp_dir"' EXIT

supabase db dump --db-url "$BACKUP_DB_URL" -f "$temp_dir/roles.sql" --role-only
supabase db dump --db-url "$BACKUP_DB_URL" -f "$temp_dir/schema.sql"
supabase db dump --db-url "$BACKUP_DB_URL" -f "$temp_dir/data.sql" --use-copy --data-only -x storage.buckets_vectors -x storage.vector_indexes
for file in roles.sql schema.sql data.sql; do
  [[ -s "$temp_dir/$file" ]] || { echo "Exportación vacía: $file" >&2; exit 1; }
done

tar -czf "$temp_dir/backup.tar.gz" -C "$temp_dir" roles.sql schema.sql data.sql
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$output_dir/brujula-$timestamp.tar.gz.gpg"
[[ ! -e "$output" ]] || { echo 'Ya existe una copia con ese nombre; cancelado.' >&2; exit 1; }
gpg --symmetric --cipher-algo AES256 --output "$output" "$temp_dir/backup.tar.gz"
echo "Copia cifrada creada: $output"
