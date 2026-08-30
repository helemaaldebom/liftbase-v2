# Handleiding: Gebruikers en Dealers Verwijderen

## Via Supabase SQL Editor

Ga naar je Supabase Dashboard → SQL Editor en gebruik een van de onderstaande scripts.

---

## 1. Gebruiker verwijderen op basis van Email

**Bestand:** `delete-user-by-email.sql`

Dit is de **makkelijkste methode**:

```sql
DO $$
DECLARE
  v_email text := 'jan@example.com';  -- Vervang met het email adres
BEGIN
  -- Script verwijdert automatisch:
  -- - Dealer record (indien van toepassing)
  -- - User profile
  -- - Auth account
END $$;
```

### Gebruik:
1. Open `delete-user-by-email.sql`
2. Vervang `'user@example.com'` met het echte email adres
3. Run het script in Supabase SQL Editor
4. Check de output voor bevestiging

---

## 2. Gebruiker verwijderen op basis van User ID

**Bestand:** `delete-user-manual.sql`

Als je de user ID al weet:

```sql
DO $$
DECLARE
  v_user_id uuid := 'USER_ID_HERE';  -- Vervang met user ID
BEGIN
  -- Script verwijdert alles gerelateerd aan deze user
END $$;
```

### Stap 1: Vind de User ID
```sql
SELECT id, email, full_name, role
FROM user_profiles
ORDER BY created_at DESC;
```

### Stap 2: Verwijder de user
Kopieer de user ID en plak in het script.

---

## 3. Dealer verwijderen (met of zonder login)

**Bestand:** `delete-dealer-manual.sql`

### Dealer ZONDER login account (makkelijk):
```sql
DELETE FROM dealers WHERE id = 'DEALER_ID_HERE';
```

### Dealer MET login account (volledig):
```sql
DO $$
DECLARE
  v_dealer_id uuid := 'DEALER_ID_HERE';
BEGIN
  -- Verwijdert dealer + auth account
END $$;
```

### Stap 1: Vind dealers
```sql
SELECT
  id as dealer_id,
  name,
  email,
  CASE
    WHEN auth_user_id IS NULL THEN 'Geen login'
    ELSE 'Met login'
  END as login_status
FROM dealers
ORDER BY created_at DESC;
```

---

## 4. Bulk verwijdering van dealers

**Bestand:** `delete-dealers-bulk.sql`

### Alle dealers zonder login:
```sql
DELETE FROM dealers WHERE auth_user_id IS NULL;
```

### Test dealers verwijderen:
```sql
DELETE FROM dealers WHERE name ILIKE '%test%';
```

### Specifieke dealers:
```sql
DELETE FROM dealers
WHERE id IN (
  'id-1',
  'id-2',
  'id-3'
);
```

---

## Belangrijke Notes

### Wat wordt er verwijderd?
- ✓ User profile (`user_profiles` table)
- ✓ Dealer record (`dealers` table, indien van toepassing)
- ✓ Auth account (`auth.users` table)
- ✗ Gerelateerde data zoals bids blijft bestaan (door foreign key constraints)

### Veiligheid
- Scripts kunnen alleen door managers worden uitgevoerd
- Alle verwijderingen zijn permanent
- Maak eerst een backup als je twijfelt

### Troubleshooting

**Error: "update or delete on table violates foreign key constraint"**
- Er zijn nog gerelateerde records (bids, dossiers, etc.)
- Verwijder eerst die records of pas de foreign keys aan naar `ON DELETE CASCADE`

**Dealer verwijderd maar zie nog steeds in lijst**
- Refresh de pagina (F5)
- Check of de dealer een auth account had die niet is verwijderd

**"Permission denied"**
- Je moet ingelogd zijn als manager
- Run het script in de SQL Editor van Supabase Dashboard (niet via app)

---

## Snelle Referentie

| Situatie | Bestand | Command |
|----------|---------|---------|
| Verwijder user via email | `delete-user-by-email.sql` | Meest gebruikt ✓ |
| Verwijder user via ID | `delete-user-manual.sql` | Voor specifieke gevallen |
| Verwijder dealer zonder login | `delete-dealer-manual.sql` | Simpele DELETE |
| Verwijder dealer met login | `delete-dealer-manual.sql` | DO block versie |
| Verwijder meerdere dealers | `delete-dealers-bulk.sql` | Bulk operatie |

---

## Via de Applicatie

Als de edge function `delete-user` goed is gedeployed, kun je gebruikers ook verwijderen via:

**Instellingen → Gebruikersbeheer → Prullenbak icoon**

Dit werkt alleen als:
- Je bent ingelogd als manager
- De edge function is correct gedeployed in Supabase
- Er zijn geen foreign key constraint errors
