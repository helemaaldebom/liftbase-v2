#!/bin/bash
# Rollback van liftbase.testhdb.nl naar de laatste pre-deploy backup.
# Gebruik:  ./rollback-test.sh           (laatste backup)
#           ./rollback-test.sh --list    (toon beschikbare backups)
#           ./rollback-test.sh <bestandsnaam>  (specifieke backup)
set -euo pipefail

SERVER="root@178.105.82.210"
SSH_KEY="$HOME/.ssh/hetzner"
WEBROOT="/var/www/liftbase"
BACKUP_DIR="/root/backups/pre-deploy"

if [ "${1:-}" = "--list" ]; then
  ssh -i "$SSH_KEY" "$SERVER" "ls -lht $BACKUP_DIR/liftbase_*.tar.gz 2>/dev/null" || echo "Geen backups gevonden."
  exit 0
fi

if [ -n "${1:-}" ]; then
  BACKUP_FILE="$BACKUP_DIR/$1"
else
  BACKUP_FILE=$(ssh -i "$SSH_KEY" "$SERVER" "ls -t $BACKUP_DIR/liftbase_*.tar.gz 2>/dev/null | head -1")
  [ -n "$BACKUP_FILE" ] || { echo "✗ Geen backups gevonden in $BACKUP_DIR"; exit 1; }
fi

echo "▶ Terugzetten van: $BACKUP_FILE"
read -p "Doorgaan? [j/N] " ANTWOORD
[ "$ANTWOORD" = "j" ] || { echo "Afgebroken."; exit 0; }

# .env veiligstellen, webroot vervangen door backup-inhoud, .env terugzetten
ssh -i "$SSH_KEY" "$SERVER" "
  set -e
  cp $WEBROOT/.env /tmp/liftbase.env.bak 2>/dev/null || true
  rm -rf ${WEBROOT}.rollback-tmp && mkdir -p ${WEBROOT}.rollback-tmp
  tar -xzf $BACKUP_FILE -C ${WEBROOT}.rollback-tmp
  rm -rf $WEBROOT
  mv ${WEBROOT}.rollback-tmp/$(basename $WEBROOT) $WEBROOT
  rmdir ${WEBROOT}.rollback-tmp
  cp /tmp/liftbase.env.bak $WEBROOT/.env 2>/dev/null || true
"
echo "✓ Rollback uitgevoerd."
curl -s "https://liftbase.testhdb.nl/?nocache=$(date +%s)" | grep -oE 'assets/index-[^"]+\.js' | head -1 | sed 's/^/Site serveert nu: /'
