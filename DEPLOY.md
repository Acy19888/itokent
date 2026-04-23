# Deployment — GitHub + Vercel + Neon Postgres

Complete guide to take the İtokent Urla portal live. Free tier end-to-end.

---

## 1 · GitHub — push the code

From your Mac, inside the project folder:

```bash
cd /Users/acy88/Documents/Claude/Projects/Itokent/villa-community

# initialise a repository if you haven't already
git init -b main
git add .
git commit -m "İtokent Urla — initial commit"

# create the remote repo (pick ONE of the two options below)
```

**Option A — with the `gh` CLI** *(recommended — `brew install gh && gh auth login`)*:

```bash
gh repo create itokent-urla --private --source=. --remote=origin --push
```

**Option B — with the browser**:

1. Go to https://github.com/new
2. Name: `itokent-urla`, visibility: **Private**, don't tick "Add README / .gitignore / license"
3. Click *Create repository*, then run locally:

```bash
git remote add origin git@github.com:<your-username>/itokent-urla.git
git push -u origin main
```

---

## 2 · Neon — create a free Postgres database

1. Open https://neon.tech → sign in with your GitHub account
2. *Create project* → name: `itokent-urla`, region: **Frankfurt** (eu-central-1) *(closest to Turkey)*
3. Under **Connection string**, copy the string that ends with `?sslmode=require`. It looks like:

   ```
   postgresql://itokent_owner:xxx@ep-something-123.eu-central-1.aws.neon.tech/itokent?sslmode=require
   ```

4. Save it — you'll paste it into Vercel in the next step.

---

## 3 · Vercel — import and deploy

1. Go to https://vercel.com/new → *Import Git Repository* → select **itokent-urla**
2. **Framework preset** auto-detects as *Next.js* — leave it
3. **Environment Variables** — add three:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | *(your Neon connection string from step 2)* |
   | `AUTH_SECRET` | run `openssl rand -base64 32` locally and paste the result |
   | `AUTH_TRUST_HOST` | `true` |

4. Click **Deploy**. First build takes ~2 minutes — it runs `prisma generate && next build`.

---

## 4 · Initialize the production database

Still on your local Mac, with the Neon URL set locally:

```bash
# point your local env at the Neon DB just for one command
DATABASE_URL="<neon-url>" npx prisma db push
DATABASE_URL="<neon-url>" npm run db:seed
```

This creates all tables and inserts the 250 villas + demo users.

*Alternative:* log into Neon's SQL editor and run the migration manually — but `prisma db push` is faster.

---

## 5 · Test the live site

Open your Vercel URL (e.g. `itokent-urla.vercel.app`) and log in with:

- `admin@villa.com` / `demo1234` → goes to `/admin`
- `cem@villa.com` / `demo1234` → goes to `/home`
- `restaurant@villa.com` / `demo1234` → goes to `/restaurant-app`

**Change these demo passwords immediately** — the seed script uses known credentials only for development.

---

## 6 · Custom domain *(optional)*

In Vercel → Project → *Settings* → *Domains* → add `portal.itokent.tr` (or whichever subdomain). Vercel will give you a `CNAME` record to set at your DNS provider. Propagation usually takes < 10 minutes.

---

## Updates going forward

Every `git push` to `main` triggers an automatic redeploy on Vercel. For database schema changes:

```bash
# edit prisma/schema.prisma, then:
DATABASE_URL="<neon-url>" npx prisma db push
git add prisma/schema.prisma && git commit -m "..." && git push
```

## Troubleshooting

- **"P2002 unique constraint"** on seed — the DB already has rows. Run `DATABASE_URL=... npm run db:reset` to wipe & reseed.
- **Login loops back to /login** — `AUTH_SECRET` is missing or too short. Must be ≥ 32 chars.
- **Build fails with "cannot find module '@prisma/client'"** — the `build` script now runs `prisma generate` first, so this should be fixed. If it still happens, add `postinstall: "prisma generate"` to the Vercel-side config.
- **Connection errors in Vercel logs** — make sure the Neon connection string ends with `?sslmode=require`.
