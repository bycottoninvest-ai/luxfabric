# Vercel + Neon Postgres (production)

## Nima uchun Postgres?

Vercel serverless — **SQLite fayl saqlanmaydi**. Shuning uchun katalog bo‘sh.

## Domen holati (2026-08-11)

| Tekshiruv | Natija |
|-----------|--------|
| NS | Cloudflare: `ivan.ns.cloudflare.com`, `norah.ns.cloudflare.com` |
| www | CNAME → `f73a9a889ef49299.vercel-dns-017.com` |
| apex | Vercel IP; **308** → `https://www.luxfabricshop.uz/` |
| Public DNS (1.1.1.1 / 8.8.8.8) | **ochiladi** |
| Ba’zi telefon/ISP | hali NXDOMAIN bo‘lishi mumkin (kesh / propagatsiya) |

Vercel loyiha: `luxfabric-qhy9` — domenlar Valid Configuration.

---

## Foydalanuvchi ZO‘R qiladigan 4 qadam (Neon)

### 1) Neon akkaunt
1. https://console.neon.tech → Sign up (GitHub/Google)
2. **Create project** → nom: `luxfabric` → region yaqinroq (Frankfurt/Singapore)

### 2) Connection string
1. Dashboard → **Connection details** → **URI**
2. Nusxa: `postgresql://...@ep-....neon.tech/neondb?sslmode=require`
3. **Pooled** (Transaction) URL Vercel uchun yaxshi (PgBouncer)

### 3) Vercel Environment Variable
1. https://vercel.com → loyiha `luxfabric-qhy9` → **Settings** → **Environment Variables**
2. Qo‘shing:
   - `DATABASE_URL` = Neon URI (Production + Preview)
   - `NEXT_PUBLIC_APP_URL` = `https://www.luxfabricshop.uz`
   - `NEXT_PUBLIC_PROD_DOMAIN` = `https://luxfabricshop.uz`
3. **Save**

### 4) Redeploy + migrate + seed
Build skript (`scripts/build.mjs`) Vercelda haqiqiy `DATABASE_URL` bo‘lsa avtomatik:

1. `prisma migrate deploy`
2. `prisma db seed` — **faqat mahsulotlar 0 bo‘lsa** (idempotent; qayta seed: `FORCE_SEED=1`)

**Lokal seed shart emas.** `DATABASE_URL` Vercelda bo‘lsa → Redeploy → Visit.

1. **Deployments** → oxirgi → **Redeploy** (yoki git push)
2. Build logda migrate + seed muvaffaqiyatini tekshiring

Qo‘lda (ixtiyoriy, lokal Neon URL bilan):
```bash
npm run db:deploy
npm run db:seed
```
---

## Lokal ishlash (Postgres)

Schema endi **postgresql**. Eski `file:./dev.db` ishlamaydi.

1. `.env` ga Neon (yoki lokal Postgres) `DATABASE_URL` qo‘ying
2. `npm run db:deploy` yoki `npm run db:push`
3. `npm run db:seed`
4. `npm run dev`

---

## Fayllar / media

Video/musiqa hali lokal `public/uploads` da — Vercelda barqaror emas. Keyingi bosqich: Vercel Blob / S3. Hozir katalog + buyurtma DB orqali ishlaydi.

## Yo‘l B (ixtiyoriy)
VPS + SQLite — `docs/PRODUCTION-REJA.md` dagi eski variant; hozir asosiy yo‘l **Vercel + Neon**.
