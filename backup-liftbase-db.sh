#!/bin/bash
# Nachtelijke backup van de Supabase-database (Liftbase) naar Backblaze B2.
# Draait op de Hetzner-server (178.105.82.210) als root via cron.
# Vereist: /root/.liftbase-db-url met de connectiestring (session pooler, chmod 600)
#          postgresql-client (pg_dump) + rclone met "backblaze:"-remote (staat er al)
set -euo pipefail

DB_URL_FILE="/root/.liftbase-db-url"
BACKUP_DIR="/root/backups/db"
BB_BUCKET="backups-burodebom-projects"
BB_FOLDER="liftbase-db"
MAX_LOCAL=3
MAX_REMOTE=14
TS=$(date +"%Y-%m-%d_%H-%M-%S")
FILE="$BACKUP_DIR/liftbase-db_$TS.dump"

echo "=== Liftbase database-backup — $TS ==="

[ -f "$DB_URL_FILE" ] || { echo "✗ FOUT: $DB_URL_FILE ontbreekt (zet daar de connectiestring in, chmod 600)"; exit 1; }
DB_URL=$(cat "$DB_URL_FILE")
mkdir -p "$BACKUP_DIR"

# ─── 1. Dump (custom format = gecomprimeerd, selectief te herstellen) ────────
echo "▶ pg_dump draaien..."
pg_dump "$DB_URL" -Fc --no-owner --no-privileges -f "$FILE"
SIZE=$(du -sh "$FILE" | cut -f1)
echo "  ✓ $FILE ($SIZE)"

# Sanity-check: een lege/mislukte dump is kleiner dan 100 kB
MIN_BYTES=100000
ACTUAL=$(stat -c%s "$FILE")
if [ "$ACTUAL" -lt "$MIN_BYTES" ]; then
  echo "  ✗ FOUT: dump verdacht klein ($ACTUAL bytes) — niet geüpload."
  exit 1
fi

# ─── 2. Upload naar Backblaze ────────────────────────────────────────────────
echo "▶ Uploaden naar Backblaze ($BB_BUCKET/$BB_FOLDER)..."
rclone copy "$FILE" "backblaze:$BB_BUCKET/$BB_FOLDER/"
echo "  ✓ Upload klaar"

# ─── 3. Retentie ─────────────────────────────────────────────────────────────
ls -t "$BACKUP_DIR"/liftbase-db_*.dump 2>/dev/null | tail -n +$((MAX_LOCAL + 1)) | xargs -r rm
rclone lsf "backblaze:$BB_BUCKET/$BB_FOLDER/" --include "liftbase-db_*.dump" | sort -r | tail -n +$((MAX_REMOTE + 1)) | while read -r F; do
  rclone delete "backblaze:$BB_BUCKET/$BB_FOLDER/$F"
  echo "  ✓ Oude Backblaze-backup verwijderd: $F"
done

echo ""
echo "── Backblaze-backups ──"
rclone lsf "backblaze:$BB_BUCKET/$BB_FOLDER/" --include "liftbase-db_*.dump" | sort -r
echo "Klaar."
