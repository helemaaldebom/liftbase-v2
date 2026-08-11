#!/bin/bash
# Deploy naar testomgeving: liftbase.testhdb.nl
# Bouwt lokaal, maakt eerst een backup op de server, deployt daarna, en verifieert.
# Gebruik:  ./deploy-test.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="root@178.105.82.210"
SSH_KEY="$HOME/.ssh/hetzner"
WEBROOT="/var/www/liftbase"
BACKUP_DIR="/root/backups/pre-deploy"
MAX_BACKUPS=5
TS=$(date +"%Y-%m-%d_%H-%M-%S")

cd "$DIR"

echo "=== Deploy naar liftbase.testhdb.nl ==="
echo ""

# ─── 1. Git-stand tonen (weet wat je deployt) ────────────────────────────────
echo "▶ Je deployt commit: $(git log --oneline -1)"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "  ⚠ Let op: er zijn niet-gecommitte wijzigingen. Die gaan wél mee in de build."
fi
echo ""

# ─── 2. Bouwen ───────────────────────────────────────────────────────────────
echo "▶ Bouwen..."
if [ ! -d node_modules ] || [ ! -x node_modules/.bin/vite ]; then
  echo "  node_modules ontbreekt — npm install draaien (eenmalig)..."
  npm install
fi
set -a; source "$DIR/.env.test"; set +a
npm run build
[ -f dist/index.html ] || { echo "  ✗ FOUT: dist/index.html ontbreekt, build mislukt."; exit 1; }
LOCAL_BUNDLE=$(grep -oE 'assets/index-[^"]+\.js' dist/index.html | head -1)
echo "  ✓ Build klaar (bundle: $LOCAL_BUNDLE)"
echo ""

# ─── 3. Backup op de server (vóór deploy) ────────────────────────────────────
echo "▶ Backup maken op de server..."
ssh -i "$SSH_KEY" "$SERVER" "mkdir -p $BACKUP_DIR && tar -czf $BACKUP_DIR/liftbase_$TS.tar.gz -C $(dirname $WEBROOT) $(basename $WEBROOT) && ls -t $BACKUP_DIR/liftbase_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm"
echo "  ✓ Backup: $BACKUP_DIR/liftbase_$TS.tar.gz (max $MAX_BACKUPS bewaard)"
echo ""

# ─── 4. Deploy (rsync, .env op server blijft staan) ──────────────────────────
echo "▶ Deployen..."
rsync -a --exclude='.env' dist/ "$SERVER:$WEBROOT/" -e "ssh -i $SSH_KEY"
echo "  ✓ Bestanden gekopieerd"
echo ""

# ─── 5. Verifiëren ───────────────────────────────────────────────────────────
echo "▶ Verifiëren..."
sleep 2
LIVE_BUNDLE=$(curl -s "https://liftbase.testhdb.nl/?nocache=$TS" | grep -oE 'assets/index-[^"]+\.js' | head -1 || true)
if [ "$LIVE_BUNDLE" = "$LOCAL_BUNDLE" ]; then
  echo "  ✓ liftbase.testhdb.nl serveert de nieuwe build ($LIVE_BUNDLE)"
  echo ""
  echo "Klaar. Rollback nodig? Draai ./rollback-test.sh"
else
  echo "  ✗ LET OP: site serveert '$LIVE_BUNDLE', verwacht '$LOCAL_BUNDLE'."
  echo "  Check de server of draai ./rollback-test.sh"
  exit 1
fi
