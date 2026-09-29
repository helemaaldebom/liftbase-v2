#!/usr/bin/env python3
"""
Opruiming weesduplicaten in de WordPress-mediabibliotheek van
heavycargolifters.com (ontstaan door mislukte foto-uploadrondes van de
Liftbase-koppeling, sept 2026).

VEILIGHEIDSCRITERIA — een bestand wordt alleen verwijderd als het aan ALLE
drie voldoet:
  1. Geüpload op of na 2026-09-15 (vanaf toen uploadde alleen de koppeling)
  2. Door GEEN enkel WooCommerce-product in gebruik (actief, concept én
     prullenbak worden gecontroleerd en beschermd)
  3. Bestandsnaam heeft het Supabase-machinefotopatroon
     (bv. 1767950148905-rk64i-8.jpg) — site-afbeeldingen hebben dat nooit

Er wordt NIETS in Liftbase/Supabase aangeraakt; alleen de WP-mediabieb.

Gebruik:
  python3 wp-media-opruiming.py           # droge run: toont alleen de lijst
  python3 wp-media-opruiming.py --doe-het # verwijdert daadwerkelijk
Credentials: leest WP_APP_USER / WP_APP_PASSWORD uit credentials.local.env
"""
import base64, json, re, sys, time, urllib.request, urllib.error, pathlib

BASIS = 'https://heavycargolifters.com/wp-json'
VANAF = '2026-09-15'
PATROON = re.compile(r'^\d{13}-[a-z0-9]+(-\d+)?(-scaled)?(\.jpe?g|\.png|\.webp)?$', re.I)

# credentials inlezen
env = {}
for regel in pathlib.Path(__file__).with_name('credentials.local.env').read_text().splitlines():
    regel = regel.strip()
    if regel and not regel.startswith('#') and '=' in regel:
        k, _, v = regel.partition('=')
        env[k.strip()] = v.strip()
USER = env.get('WP_APP_USER'); PW = env.get('WP_APP_PASSWORD')
if not USER or not PW:
    sys.exit('WP_APP_USER / WP_APP_PASSWORD ontbreken in credentials.local.env')
AUTH = 'Basic ' + base64.b64encode(f'{USER}:{PW}'.encode()).decode()

def api(pad, methode='GET'):
    req = urllib.request.Request(BASIS + pad, method=methode, headers={'Authorization': AUTH})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

# 1) beschermde media: alle productafbeeldingen (elke status + prullenbak)
beschermd = set()
for status in ('any', 'trash'):
    pagina = 1
    while pagina <= 20:
        prods = api(f'/wc/v3/products?per_page=100&page={pagina}&status={status}&_fields=id,images')
        for p in prods:
            for img in (p.get('images') or []):
                beschermd.add(img['id'])
        if len(prods) < 100: break
        pagina += 1
print(f'Beschermde productafbeeldingen: {len(beschermd)}')

# 2) kandidaten verzamelen
kandidaten = []
pagina = 1
while pagina <= 60:
    media = api(f'/wp/v2/media?per_page=100&page={pagina}&_fields=id,date,title')
    for m in media:
        naam = (m.get('title') or {}).get('rendered', '')
        if m['date'] >= VANAF and m['id'] not in beschermd and PATROON.match(naam):
            kandidaten.append((m['id'], naam, m['date'][:10]))
    if len(media) < 100: break
    pagina += 1

print(f'Verwijderkandidaten: {len(kandidaten)}')
for mid, naam, datum in kandidaten[:10]:
    print(f'  {mid}  {datum}  {naam}')
if len(kandidaten) > 10:
    print(f'  ... en {len(kandidaten) - 10} meer')

if '--doe-het' not in sys.argv:
    print('\nDROGE RUN — er is niets verwijderd. Draai met --doe-het om echt op te ruimen.')
    sys.exit(0)

# 3) verwijderen
print('\nVerwijderen gestart...')
ok = fout = 0
for n, (mid, naam, _) in enumerate(kandidaten, 1):
    # trage site: bij timeout/netwerkfout even wachten en nog één keer proberen
    for poging in (1, 2):
        try:
            api(f'/wp/v2/media/{mid}?force=true', 'DELETE')
            ok += 1
            break
        except urllib.error.HTTPError as e:
            fout += 1
            if fout <= 5: print(f'  FOUT bij {mid} ({naam}): {e.code}')
            break
        except Exception as e:
            if poging == 1:
                print(f'  timeout bij {mid}, even wachten en opnieuw...')
                time.sleep(15)
            else:
                fout += 1
                print(f'  OVERGESLAGEN {mid} ({naam}): {type(e).__name__}')
    if n % 50 == 0:
        print(f'  {n}/{len(kandidaten)} gedaan ({ok} ok, {fout} fout)')
        time.sleep(1)  # site even ademruimte geven
print(f'\nKlaar: {ok} verwijderd, {fout} mislukt.')
