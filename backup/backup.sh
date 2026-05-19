#!/bin/sh
# Dump the AURA database to a timestamped file in /backups, then prune
# files older than $RETENTION_DAYS.
set -e

: "${POSTGRES_HOST:?required}"
: "${POSTGRES_USER:?required}"
: "${POSTGRES_PASSWORD:?required}"
: "${POSTGRES_DB:?required}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="/backups/aura-${stamp}.sql.gz"

echo "aura-backup: starting dump → ${out}"
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  --host="${POSTGRES_HOST}" \
  --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DB}" \
  --no-owner --clean --if-exists --quote-all-identifiers \
  | gzip -9 > "${out}"

# Retention sweep.
find /backups -name 'aura-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "aura-backup: completed ${out}"
