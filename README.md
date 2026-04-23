# Akdeniz Villaları — Villa Community Reservation System

Ein vollständiges Full-Stack-Reservierungs- und Verwaltungssystem für eine private Gated Community mit ca. 250 Villen in der Türkei. Next.js 14 (App Router) + TypeScript + Prisma + NextAuth + Tailwind. Mobil-optimiert, mehrsprachig (Türkisch + Englisch), luxury Design.

---

## Features im Überblick

### Drei Benutzerrollen

| Rolle | Zugang | Zweck |
|---|---|---|
| **RESIDENT** (Bewohner) | `/home` | Mobile App: Tennis / Restaurant / Parti-Evi buchen, Gäste anmelden, Events sehen, Bakım-Ticket öffnen |
| **ADMIN** (Verwaltung) | `/admin` | Desktop- & Mobil-Konsole: Alle Buchungen, Parti-Evi-Freigaben, Events, Duyurular, Bakım, Gäste, Sakinler |
| **RESTAURANT_STAFF** | `/restaurant-app` | Tablet-/Handy-Ansicht: Tagesansicht der Reservierungen, Check-In / No-Show |

### Fachliche Features

- **Tennis** — 2 Plätze, 9:00–20:00, 1-Stunden-Slots, eine Buchung pro Slot via DB-Unique-Constraint. Vergangene Slots werden automatisch geblockt.
- **Parti Evi** — max. 1 Event pro Tag, Anfrage → Admin-Freigabe (PENDING → APPROVED / REJECTED).
- **Restaurant** — 30-Minuten-Slots 18:00–22:00, Check-In / No-Show durch Restaurant-Personal.
- **Events** — Admin legt zweisprachig an, Bewohner sehen sie auf Home & Events-Seite.
- **Gäste** — Bewohner meldet Gäste an, Admin/Security checkt am Tor ein.
- **Duyurular** (News) — Admin postet zweisprachig mit Priorität (NORMAL/HIGH/URGENT).
- **Bakım** (Maintenance) — Ticket-System mit Kategorien (Elektrik/Tesisat/Bahçe/Havuz/Diğer) und Status-Workflow (OPEN → IN_PROGRESS → RESOLVED).

### Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions + Route Handler (alles im gleichen Repo)
- **Datenbank**: Prisma ORM mit SQLite (Dev) — kann mit einer Zeile Änderung auf PostgreSQL für Produktion umgestellt werden
- **Auth**: NextAuth v5 (Credentials Provider, bcrypt, JWT)
- **i18n**: next-intl (Türkisch + Englisch, Cookie-basiert)
- **Icons**: lucide-react
- **Validation**: zod
- **Fonts**: Playfair Display (serif/luxury), Cormorant Garamond (display), Inter (sans)

---

## Installation & erster Start

Voraussetzungen: **Node.js 20+** und **npm** (oder pnpm/yarn).

```bash
# 1. Abhängigkeiten installieren (generiert auch automatisch den Prisma Client)
npm install

# 2. .env Datei prüfen (ist bereits mit Dev-Defaults angelegt)
cat .env

# 3. Datenbank-Schema pushen & Seed-Daten laden
npm run db:push
npm run db:seed

# 4. Dev-Server starten
npm run dev
```

Öffne dann **http://localhost:3000**.

### Demo-Logins (alle haben Passwort `demo1234`)

| E-Mail | Rolle | Wohin |
|---|---|---|
| `admin@villa.com` | ADMIN | `/admin` |
| `restaurant@villa.com` | RESTAURANT_STAFF | `/restaurant-app` |
| `cem@villa.com` | RESIDENT (Villa 001) | `/home` |
| `ayse@villa.com` | RESIDENT (Villa 042) | `/home` |
| `can@villa.com` | RESIDENT (Villa 108) | `/home` |

---

## Nützliche Befehle

```bash
npm run dev           # Dev-Server (Hot Reload)
npm run build         # Produktions-Build
npm run start         # Produktions-Server starten
npm run db:push       # Schema → DB pushen (nach Schema-Änderung)
npm run db:seed       # Seed-Daten einfügen
npm run db:reset      # DB komplett resetten + neu seeden
npm run db:studio     # Prisma Studio öffnen (DB-Browser auf Port 5555)
```

---

## Projekt-Struktur

```
villa-community/
├── prisma/
│   ├── schema.prisma         # Datenbank-Schema (alle Modelle)
│   └── seed.ts               # 250 Villen + Demo-User + Beispiel-Events
├── messages/
│   ├── tr.json               # Türkische Übersetzungen
│   └── en.json               # Englische Übersetzungen
├── public/                   # Statische Assets, Manifest, Icons
├── src/
│   ├── i18n/                 # next-intl Konfiguration
│   ├── lib/
│   │   ├── db.ts             # Prisma Client Singleton
│   │   ├── auth.ts           # NextAuth + requireUser / requireRole Helfer
│   │   ├── utils.ts          # Date-Helfer, cn() etc.
│   │   └── actions/          # Server Actions, thematisch gruppiert
│   │       ├── tennis.ts     # bookTennisSlot, cancelTennisBooking
│   │       ├── party-house.ts
│   │       ├── restaurant.ts
│   │       ├── guests.ts
│   │       ├── maintenance.ts
│   │       ├── admin.ts      # Admin-spezifische (approve/reject, create event/announcement)
│   │       └── locale.ts
│   ├── middleware.ts         # Auth-Guard + Rollen-Routing
│   ├── components/
│   │   ├── locale-switcher.tsx
│   │   ├── resident/shell.tsx
│   │   ├── admin/shell.tsx
│   │   └── restaurant-app/shell.tsx
│   └── app/
│       ├── layout.tsx        # Root layout + Session / Intl Provider
│       ├── login/            # Login-Seite (dark, luxury)
│       ├── (resident)/       # Mobile Bewohner-App (gruppiertes Routing)
│       │   ├── home/
│       │   ├── tennis/       # ← Slot-Grid mit Verfügbarkeit
│       │   ├── party-house/
│       │   ├── restaurant/
│       │   ├── events/
│       │   ├── guests/
│       │   ├── announcements/
│       │   ├── maintenance/
│       │   └── profile/
│       ├── admin/            # Admin-Konsole (Desktop-Sidebar + Mobile-Drawer)
│       │   ├── page.tsx      # Dashboard mit KPIs
│       │   ├── bookings/
│       │   ├── events/
│       │   ├── announcements/
│       │   ├── maintenance/
│       │   ├── guests/
│       │   └── residents/
│       └── restaurant-app/   # Restaurant-Ansicht (dunkles Theme)
│           └── page.tsx      # Tagesliste mit Check-In
└── README.md
```

---

## Design-System

**Luxury-Palette:**
- `forest` — Tiefes Waldgrün (Primärfarbe, Hintergründe, Header)
- `gold` — Antiques Gold (Akzente, CTAs, Hero-Elemente)
- `cream` — Warmes Off-White (Text auf dunkelgrünem Hintergrund)

**Typografie:**
- `font-display` → Cormorant Garamond für große Überschriften
- `font-serif` → Playfair Display
- `font-sans` → Inter (Body, UI-Text)

**Komponenten-Klassen** (in `globals.css`): `.btn-gold`, `.btn-outline-gold`, `.card-luxury`, `.card-dark`, `.input-luxury`, `.slot-available`, `.slot-mine`, `.slot-booked`, `.badge-*`.

---

## Umstellung auf Produktion

### 1. PostgreSQL statt SQLite
In `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
Dann `DATABASE_URL` in `.env` auf einen Postgres-Connection-String setzen und `npx prisma migrate deploy` laufen lassen.

### 2. Secrets rotieren
```bash
AUTH_SECRET=$(openssl rand -base64 32)
```
In deine Deployment-ENV (Vercel, Railway, Fly.io, eigener Server).

### 3. Hosting-Vorschläge

- **Vercel** — einfachster Weg, Free Tier reicht für den Anfang. DB: Neon (Postgres) oder Vercel Postgres.
- **Railway** — Next.js + Postgres in einem Projekt, Pay-as-you-go.
- **Eigener VPS (DigitalOcean / Hetzner)** — Docker Compose mit Next.js + Postgres + Nginx, ideal für ein türkisches Deployment mit DSGVO/Datenschutz-Hoheit.

### 4. Offene Punkte für einen echten Rollout

Dies ist ein **produktionsreifer MVP** — folgende Punkte würde ich vor Go-Live noch ergänzen:

1. **Registrierung / Onboarding** — aktuell werden User nur über das Seed-Skript oder Admin manuell angelegt. Idealerweise bekommt jede Villa einen Einladungslink.
2. **Passwort-Reset per E-Mail** — Resend / SendGrid / Postmark anbinden.
3. **Push-Benachrichtigungen** (PWA) — wenn eine Buchung bestätigt / ein Event angekündigt wird.
4. **SMS/WhatsApp-Integration** — besonders relevant in der Türkei für Gäste-Anmeldung am Tor.
5. **Foto-Upload** für Events, Ankündigungen und Bakım-Tickets (S3 / Cloudflare R2).
6. **Audit-Log** — wer hat wann was gebucht/storniert.
7. **Rate-Limiting** auf Server Actions (z.B. Upstash Redis), besonders für Tennis-Buchung.
8. **Offline-Support** (Service Worker) — die Shell läuft schon mit Manifest, aber keine Caching-Strategie.

---

## Credits & Design-Entscheidungen

- **Warum Monorepo (3 Apps in einem Next.js-Projekt)?** Shared DB, shared Auth, shared i18n → weniger Komplexität für eine Community dieser Größe. Bei Skalierung kann man einzelne Bereiche als separate Apps herausziehen.
- **Warum Server Actions statt REST?** Direktere Typsicherheit von DB → UI ohne manuelles API-Layer.
- **Warum SQLite im Dev?** Null Installations-Reibung — einfach `npm run dev` und es läuft. In Produktion reicht eine Provider-Änderung für Postgres.
- **Warum dunkles Theme für Login & Restaurant, helles für Bewohner & Admin?** Der Login setzt den Luxury-Ton, der Restaurant-Screen wird in einer dunklen Umgebung (Abendservice) genutzt, Bewohner-App ist tagsüber mobil im Sonnenlicht → helle Hintergrundoberfläche.

Viel Erfolg mit der Community-App! 🌴
