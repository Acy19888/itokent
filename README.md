# İtokent Urla — Resident Portal

Reservation- and management portal for the **İtokent Urla** gated community (≈250 villas, near İzmir). Built as a single Next.js 14 app with three role-aware front-ends, a Postgres database, email-verified self-registration, and a stubbed payment flow ready to swap for Iyzico.

---

## Was das Portal kann

### Drei Rollen, drei Ansichten

| Rolle | Einstieg | Zweck |
|---|---|---|
| **RESIDENT** (Sakin) | `/home` | Mobile-first PWA — Tennis / Restoran / Parti Evi buchen, Gäste anmelden, Events sehen, Bakım-Tickets öffnen, Profil pflegen |
| **ADMIN** | `/admin` | Desktop + Mobil — KPIs, alle Buchungen, Parti-Evi-Freigaben, Events, Duyurular, Bakım, Gäste, Sakinler-CRUD |
| **RESTAURANT_STAFF** | `/restaurant-app` | Tablet-Ansicht für den Service — Tagesliste mit Check-In / No-Show |

Auth-Routing (`src/middleware.ts`) leitet jede Rolle nach Login automatisch auf den richtigen Bereich um.

### Features

- **Self-Service-Registrierung** mit 6-stelligem Email-Code (Resend, 15-Min-TTL, max. 6 Versuche).
- **Tennis** — 2 Plätze, 9–20 Uhr, 1-Stunden-Slots, Unique-Constraint gegen Doppelbuchung; Bestätigungs- und Cancel-Mails.
- **Parti Evi** — max. 1 Event/Tag, Anfrage → Admin-Freigabe (mit optionaler Gebühr) → Zahlung.
- **Restoran** — 10 Tische, 18–22:30, 30-Min-Slots, gemeinsames Kapazitätslimit über alle Tische, Restaurant-Personal checkt vor Ort ein.
- **Events** — zweisprachige Pflege durch den Admin, RSVP mit optionaler Gebühr, automatische Newsletter an alle Bewohner bei neuem Event/Duyuru.
- **Bakım** — Ticket-Workflow OPEN → IN_PROGRESS → RESOLVED → CLOSED mit Kategorien Elektrik / Tesisat / Bahçe / Havuz / Diğer.
- **Gäste** — Bewohner registriert, Security/Admin checkt am Tor ein.
- **Profil** — eigener Edit + Passwortwechsel; Admin kann jeden Resident editieren, Villa neu zuweisen, Passwort zurücksetzen oder löschen.
- **i18n** — Türkisch + Englisch, Cookie-basierter Wechsel (`src/lib/actions/locale.ts`).
- **Zahlung** — Demo-Kartenformular (siehe „Zahlungs-Flow" weiter unten); produktiv durch Iyzico oder Stripe ersetzbar.

### Tech Stack

- **Next.js 14.2 App Router** + React 18 + TypeScript
- **Prisma 5.22** + Postgres (lokal: Neon dev branch, prod: Neon Frankfurt)
- **NextAuth v5 beta** (Credentials, JWT, edge-fähig — `auth.config.ts`/`auth.ts` Split)
- **next-intl 3.26** (TR/EN)
- **Resend** REST API für transaktionale Mails (verification code, booking confirmations, RSVPs, newsletter)
- **Tailwind CSS** + custom Luxury-Palette (Forest, Brass, Ivory, Cream)
- **bcryptjs** für Passwort + 6-Code-Hashing
- **zod** für End-to-end-Input-Validation auf jeder Server Action

---

## Installation auf einem neuen Rechner

Voraussetzungen: **Node.js 20+** und ein Postgres-Connection-String (am einfachsten ein kostenloser Neon-Branch — siehe `DEPLOY.md`).

```bash
# 1. Repo klonen + Abhängigkeiten
git clone https://github.com/Acy19888/itokent.git
cd itokent
npm install            # postinstall ruft automatisch `prisma generate`

# 2. .env anlegen
cp .env.example .env
# danach DATABASE_URL setzen (Neon-String) und AUTH_SECRET generieren:
#   openssl rand -base64 32

# 3. Schema auf die DB pushen + Seed-Daten
npm run db:push
npm run db:seed

# 4. Optional: Resend für echte Emails
# RESEND_API_KEY in .env eintragen — sonst werden Mails nur geloggt.

# 5. Dev-Server
npm run dev            # → http://localhost:3000
```

### Demo-Logins (alle Passwort `demo1234`)

| E-Mail | Rolle | Landet auf |
|---|---|---|
| `admin@villa.com` | ADMIN | `/admin` |
| `restaurant@villa.com` | RESTAURANT_STAFF | `/restaurant-app` |
| `cem@villa.com` | RESIDENT (Villa 001) | `/home` |
| `ayse@villa.com` | RESIDENT (Villa 042) | `/home` |
| `can@villa.com` | RESIDENT (Villa 108) | `/home` |

Vor dem ersten echten Rollout im Admin alle Demo-Konten löschen oder umbenennen.

---

## Environment-Variablen

`.env.example` ist die Quelle der Wahrheit; hier die Kurzfassung:

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `DATABASE_URL` | ja | Postgres-String mit `?sslmode=require` (Neon empfohlen) |
| `AUTH_SECRET` | ja | ≥ 32 Zeichen, `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | ja (prod) | Auf `true` hinter Reverse-Proxy / Vercel |
| `RESEND_API_KEY` | optional | Wenn gesetzt, werden Mails wirklich versendet; sonst Console-Log |
| `EMAIL_FROM` | optional | Bis Domain in Resend verifiziert ist, leer lassen — Fallback ist `İtokent Urla <onboarding@resend.dev>` |
| `NEXT_PUBLIC_COMMUNITY_NAME` | – | Wird in Templates und Headern angezeigt |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | – | `tr` oder `en` (Default beim ersten Besuch) |

---

## Häufige Befehle

```bash
npm run dev              # Hot-reload Dev-Server
npm run build            # prisma generate + db push + next build (für Vercel)
npm run start            # Produktions-Server (nach build)
npm run db:push          # Schema → DB synchronisieren
npm run db:seed          # 250 Villen + Demo-User + Beispiel-Events
npm run db:reset         # ⚠ Wipe + Reseed
npm run db:studio        # Prisma Studio (DB-Browser, Port 5555)
npm run lint             # ESLint
node scripts/migrate-live.js   # Idempotente additive Migration für Live-Neon
```

`scripts/migrate-live.js` ist ein Sicherheitsnetz: er fährt nur `IF NOT EXISTS`-Statements und ist deshalb gefahrlos mehrfach ausführbar, falls `prisma db push` mal nicht durchgeht.

---

## Projekt-Struktur

```
villa-community/
├── prisma/
│   ├── schema.prisma          # Modelle: User, Villa, TennisBooking, RestaurantReservation,
│   │                          # PartyHouseBooking, Event, EventAttendee, Announcement,
│   │                          # Guest, MaintenanceTicket, EmailVerification
│   └── seed.ts
├── messages/
│   ├── tr.json                # Türkische Strings
│   └── en.json                # Englische Strings
├── scripts/
│   └── migrate-live.js        # Additive idempotente DB-Migration
├── public/                    # Manifest, Icons, statische Assets
├── src/
│   ├── middleware.ts          # Edge-Auth-Guard, Rollen-Routing
│   ├── i18n/                  # next-intl Setup
│   ├── lib/
│   │   ├── db.ts              # Prisma Singleton
│   │   ├── auth.ts            # NextAuth + requireUser / requireRole
│   │   ├── auth.config.ts     # Edge-kompatible Auth-Config (für middleware)
│   │   ├── email.ts           # Resend-Wrapper + alle HTML-Templates
│   │   └── actions/
│   │       ├── register.ts    # startRegistration / confirmRegistration / resend
│   │       ├── users.ts       # adminCreate/Update/Delete/ResetPassword + Profil
│   │       ├── tennis.ts
│   │       ├── restaurant.ts
│   │       ├── party-house.ts
│   │       ├── events.ts
│   │       ├── guests.ts
│   │       ├── maintenance.ts
│   │       ├── admin.ts       # approve / reject / mark-paid Workflows
│   │       ├── payments.ts    # Demo-Karte verifizieren + Booking als bezahlt markieren
│   │       └── locale.ts
│   ├── components/
│   │   ├── locale-switcher.tsx
│   │   ├── resident/shell.tsx
│   │   ├── admin/shell.tsx
│   │   └── restaurant-app/shell.tsx
│   └── app/
│       ├── layout.tsx         # SessionProvider + IntlProvider
│       ├── login/             # Dunkles Luxury-Theme
│       ├── register/          # 2-Stage Flow (Form → Code-Eingabe)
│       ├── (resident)/        # Mobile Bewohner-App
│       │   ├── home/          # Dashboard, nächste Buchungen, News
│       │   ├── tennis/        # Slot-Grid mit Verfügbarkeit
│       │   ├── party-house/
│       │   ├── restaurant/
│       │   ├── events/
│       │   ├── guests/
│       │   ├── announcements/
│       │   ├── maintenance/
│       │   └── profile/
│       ├── admin/
│       │   ├── page.tsx       # KPI-Dashboard
│       │   ├── bookings/
│       │   ├── events/
│       │   ├── announcements/
│       │   ├── maintenance/
│       │   ├── guests/
│       │   └── residents/     # CRUD: add / edit (mit Villa) / reset / delete
│       └── restaurant-app/
│           └── page.tsx
└── DEPLOY.md                  # Schritt-für-Schritt Vercel + Neon
```

---

## Wichtige Flows

### Registrierung (Sakin meldet sich selbst an)

1. `/register` Formular: Vor-/Nachname, E-Mail, Telefon, Villa-Nr (1–250), Passwort + Bestätigung.
2. `startRegistration` (Server Action) prüft Email-Eindeutigkeit + Villa-Existenz, schreibt eine Zeile in `EmailVerification` (bcrypt-hashed Code, 15 Min TTL) und sendet die Mail über Resend.
3. Stage `verify`: 6-stelliger Code-Input. Falsche Codes erhöhen `attempts`; nach 6 Versuchen ist die Zeile blockiert und der Nutzer muss „Resend" drücken.
4. `confirmRegistration` legt den User in einer Transaktion an und löscht die Verification-Zeile.
5. Auto-Redirect auf `/login`.

`EmailVerification` wird absichtlich **nicht** als Spalte am User-Modell gehalten — unverifizierte Accounts existieren erst gar nicht als `User`-Zeilen, also können sie sich auch nicht versehentlich einloggen.

### Admin Resident-CRUD

In `/admin/residents`:

- **Add** (`UserPlus`-Button): öffnet ein Portal-Modal, ruft `adminCreateUser` mit Pflicht-Passwort. Kein Email-Code — der Admin ist Trust-Anchor.
- **Edit** (`Pencil`): Name, Mail, Telefon **und Villa-Nr** ändern. Leeres Villa-Feld = abkoppeln.
- **Reset Password** (`KeyRound`): neues Passwort setzen.
- **Delete** (`Trash2`, rote Bestätigung): `adminDeleteUser` löscht alle eigenen Buchungen / Tickets / Gäste in einer Transaktion und reassigniert verfasste Events/Duyurular auf den löschenden Admin, damit Foreign-Keys gültig bleiben. Sich selbst löschen ist explizit blockiert.

### Zahlungs-Flow (Demo)

`src/lib/actions/payments.ts` hat ein bewusst minimales Karten-Validation-Stub (Luhn + Ablaufdatum) und markiert Buchung/RSVP als `paid`. Beim Echtbetrieb gegen Iyzico oder Stripe austauschen — die Stelle ist klein und gut isoliert.

### E-Mail-Templates

Alle Templates leben in `src/lib/email.ts` und teilen sich eine HTML-Shell (`wrapShell` + `shellHeader`). Resend-Schlüssel optional — ohne Key fällt der Wrapper auf einen Console-Log zurück, sodass lokales Entwickeln ohne API-Limits weiterläuft.

---

## Design-System

**Palette** (`tailwind.config.ts`):
- `forest` — tiefes Waldgrün (Primärflächen, Headers)
- `brass` / `gold` — Antik-Gold-Akzente, CTAs
- `ivory` / `cream` — warme helle Töne (Body, Cards)
- `ink` — fast schwarz (Login, Restaurant-App-Theme)

**Schriften:** Cormorant Garamond (display), Playfair Display (serif), Inter (sans).

**Klassen** (in `src/app/globals.css`): `.btn-primary`, `.btn-outline`, `.card-luxury`, `.input-luxury`, `.input-dark`, `.label-luxury`, `.label-dark`, `.bg-gradient-itokent`, `.bg-gradient-brass`, `.shadow-edel`, `.shadow-edel-lg`, `.animate-fade-up`.

Modals werden konsistent über `createPortal(..., document.body)` mit SSR-Mounted-Guard gerendert (siehe `create-resident-button.tsx`, `resident-row.tsx`, `rsvp-button.tsx`).

---

## Deployment

Für die Schritt-für-Schritt-Anleitung zu GitHub + Vercel + Neon siehe **`DEPLOY.md`**. Kurzversion:

1. `git push` auf `main` → Vercel deployt automatisch.
2. `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `RESEND_API_KEY`, `EMAIL_FROM` in Vercel-Env-Vars setzen.
3. Bei Schema-Änderungen entweder lokal `DATABASE_URL=… npx prisma db push` oder `node scripts/migrate-live.js`.

---

## Designentscheidungen (warum das so ist, wie es ist)

- **Single-Repo, drei Front-Ends** — geteilte DB, geteiltes Auth, geteiltes i18n. Bei späterem Skalierungsbedarf lassen sich `restaurant-app` oder `admin` als eigene Apps abspalten.
- **Server Actions statt REST** — Typensicherheit von Prisma bis zur UI, kein API-Layer zu pflegen.
- **Email-Code statt Magic-Link** — Code per Mail funktioniert auch, wenn jemand den Browser-Tab schließt; und bei einer 250-Haushalt-Community sind Magic-Links ohnehin overkill.
- **bcrypt für Verification-Codes** — Brute-Force-Schutz, auch wenn die `attempts`-Zählung der primäre Schutz ist (nach 6 Tries gesperrt).
- **EmailVerification als eigene Tabelle, nicht Flag am User** — unverifizierte Accounts existieren nicht; saubere Trennung von „in Bearbeitung" und „aktiver Bewohner".
- **Demo-Payment-Stub** — vor Go-Live durch Iyzico (Türkei-First) oder Stripe ersetzen. Iyzico unterstützt 3-D Secure, lokale Karten und TRY-Settlement.
- **Resend** — günstigster Sender mit europäischer Region und einer API, die in 30 Zeilen eingebunden ist.

---

## Offene Punkte vor einem echten Rollout

1. **Demo-User entfernen** und reale Admin-Accounts anlegen.
2. **Custom-Domain in Resend verifizieren** (z. B. `noreply@itokent.tr`) — sonst landet Mail im Spam.
3. **`EMAIL_FROM` und `NEXT_PUBLIC_COMMUNITY_NAME`** auf Live-Werte stellen.
4. **Iyzico-Integration** statt Demo-Karte (Sandbox-Account → Live-Keys → 3-D Secure aktivieren).
5. **Push-Benachrichtigungen** (PWA / Web Push) für Bestätigungen und Genehmigungen.
6. **Audit-Log** für Admin-Aktionen (Wer hat wann welche Buchung genehmigt?).
7. **Foto-Uploads** für Bakım-Tickets (Cloudflare R2 oder S3).
8. **Rate-Limiting** auf Hot-Path Server Actions (Tennis/Restoran), z. B. Upstash Redis.
9. **DSGVO** — Datenschutzhinweis, Auftragsverarbeitung mit Vercel + Neon + Resend dokumentieren.

---

## Lizenz / Eigentümerschaft

Privates Projekt für die İtokent-Urla-Gemeinschaft. Kein öffentliches OSS-Projekt — Repo bleibt privat, Forks nur nach Absprache.
