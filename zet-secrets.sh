#!/bin/bash
# Leest credentials.local.env en zet de ingevulde waarden als Supabase-secrets.
# Alleen niet-lege waarden worden doorgezet. Draaien vanuit de projectmap.
set -euo pipefail
cd "$(dirname "$0")"

[ -f credentials.local.env ] || { echo "✗ credentials.local.env niet gevonden"; exit 1; }
set -a; source credentials.local.env; set +a

ARGS=()
for KEY in FI_MACHINELIST_CODE FI_USERNAME FI_PASSWORD CRON_SECRET WC_URL WC_CONSUMER_KEY WC_CONSUMER_SECRET TRUCK1_PROVIDER_KEY TRUCK1_DEALER_ID TRUCK1_LOC_ID TRUCK1_CONTACT_PERSON_ID MASCUS_FEED_URL MASCUS_USERNAME MASCUS_PASSWORD; do
  VAL="${!KEY:-}"
  [ -n "$VAL" ] && ARGS+=("$KEY=$VAL")
done

if [ ${#ARGS[@]} -eq 0 ]; then
  echo "Niets ingevuld — geen secrets gezet."
  exit 0
fi

echo "Door te zetten naar Supabase: $(printf '%s\n' "${ARGS[@]}" | cut -d= -f1 | tr '\n' ' ')"
npx supabase secrets set "${ARGS[@]}"
echo "✓ Klaar. Controleer met: npx supabase secrets list"
