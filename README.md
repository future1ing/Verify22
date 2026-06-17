# 🌿 Veriphy v2 — Next.js 14 · Supabase · Vercel

SaaS d'alertes réglementaires pesticides (EU · Maroc · Espagne) — 4 langues FR/AR/ES/EN + RTL.

## Nouveautés v2
- 🔒 **Faille corrigée** : un client pouvait s'auto-upgrader (`plan`/`role`) via la console → policies RLS séparées + triggers de protection des colonnes sensibles
- Middleware Supabase (refresh session + protection `/dashboard` `/admin`)
- Headers de sécurité (CSP, HSTS, X-Frame-Options…) + validation Zod sur toutes les API + rate limiting Upstash (optionnel, fallback gracieux)
- Pipeline **100% TypeScript** : upload admin → parse MA/ES/EU → diff → alertes ciblées → emails Resend
- Bases produits en **tables Postgres** (fini les JSON de 84MB) + index trigram
- Design system Tailwind, sidebar responsive (drawer mobile), i18n next-intl, **landing page publique**

## Installation
```bash
# 1. Supabase → SQL Editor → exécuter lib/supabase/schema.sql
#    (idempotent — si v1 déjà en place, ça CORRIGE la faille)

# 2. Variables d'environnement
cp .env.example .env.local   # remplir les 3 clés Supabase minimum

# 3. Dépendances + données
npm install
node scripts/import.mjs --ma ./ma_onssa_database.json --es ./es_mapa_database.json --eu ./eu_mrl_agent_db.json

# 4. Dev
npm run dev   # → http://localhost:3000
```

## Déploiement Vercel
1. `git init && git add . && git commit -m "Veriphy v2"` → pousser sur GitHub
2. vercel.com → Import → Environment Variables (toutes celles de `.env.example` renseignées)
3. Settings → Domains → `veriphy.app`
4. Le cron mensuel (`vercel.json`, 1er du mois 6h UTC) appelle `/api/cron` avec `Bearer CRON_SECRET`

## Compte admin
Après ta première inscription :
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'ton@email.com';
```

## Pipeline (admin → Pipeline)
| Source | Fichier attendu | Diff |
|---|---|---|
| 🇲🇦 MA | export ONSSA `.xls`/`.gz` (HTML) | produits + usages + doses + expirations |
| 🇪🇸 ES | export MAPA `.xlsx` | statuts, dates, titulaires, expirations |
| 🇪🇺 EU | `Publication*.xml` | niveau substances (flags, retraits) |

⚠️ **EU** : vérifier le mapping des balises XML dans `lib/pipeline/parsers/eu.ts` (constante `F`) avec un vrai fichier. Le rechargement complet des 252k LMR se fait via `scripts/import.mjs` en local.

## Reste à faire (sessions suivantes)
Pages UI : profil/cultures, pricing (Stripe prêt côté API), admin clients/bases/stats · activation Stripe (3 produits + webhook) · Sentry/Analytics.
