# LUXFABRIC — saqlangan holat (2026-08-11)

**Maqsad:** ertaga / limit tugaganda chatni qayta ochib, shu fayldan davom etish.

**Vizual:** `docs/VIZUAL-TIZIM.md` + rasmlar  
**Real (production) reja:** `docs/PRODUCTION-REJA.md` — test emas, to‘liq ishlashi kerak  
**Deploy + Neon:** `docs/VERCEL-DEPLOY.md`

**Oldingi chat:** [Instagram Reels musiqa](d78b58f1-3fb6-49e9-b3d6-7efb219cdec9)

**Loyiha:** `C:\Users\1\luxfabric`  
**Lokal:** `http://localhost:3000`  
**Production URL:** https://luxfabric-qhy9.vercel.app  
**Domen:** https://www.luxfabricshop.uz (apex → www 308)  
**Admin Instagram:** `/admin/instagram`  
**Do‘kon Reels:** `/instagram`

---

## Loyiha nima?

LUXFABRIC Sales OS — Next.js (App Router) + Tailwind + Prisma (**PostgreSQL** / Neon) admin + do‘kon.

- Kirim / Chiqim / Buyurtma skan (QR)
- Mahsulotlar, ombor, yetkazish
- Instagram: Reels (sayt ichida) + Stories (hikoya) + Meta/DM sozlamalari

> Bu Next.js versiyasi odatdagidan farq qilishi mumkin — kod yozishdan oldin `node_modules/next/dist/docs/` va `AGENTS.md` ga qarang.

---

## Domen + Vercel (2026-08-11)

| Band | Holat |
|------|--------|
| Domen | `luxfabricshop.uz` |
| NS (sayt.uz) | Cloudflare Active: `ivan.ns.cloudflare.com`, `norah.ns.cloudflare.com` |
| Cloudflare DNS | DNS only: CNAME `@` va `www` → `f73a9a889ef49299.vercel-dns-017.com` |
| Vercel | `luxfabric-qhy9` — domenlar **Valid Configuration** |
| apex | 308 → `https://www.luxfabricshop.uz/` |
| Public DNS (1.1.1.1 / 8.8.8.8) | **resolves** (Vercel IP) |
| Ba’zi telefon / lokal ISP | NXDOMAIN / kesh — 24 soatgacha yoki DNS flush |
| Katalog bo‘sh | Sabab: eski SQLite serverlessda yo‘q → **Neon Postgres kerak** |

---

## Postgres tayyorgarlik (kod — qilingan)

- `prisma/schema.prisma` → `provider = "postgresql"`
- Yangi migrate: `prisma/migrations/20260811173000_init_postgres/`
- Eski SQLite: `prisma/migrations_sqlite_archive/`
- `scripts/build.mjs` — Vercelda real `DATABASE_URL` bo‘lsa `prisma migrate deploy`
- Skriptlar: `npm run db:deploy`, `npm run db:push`, `npm run db:seed`
- `.env.example` — Postgres URI namuna

**Foydalanuvchi ZO‘R qiladi (agent login qila olmaydi):**
1. Neon project + connection string
2. Vercel → Env → `DATABASE_URL`
3. Redeploy
4. `npm run db:seed` (Neon URL bilan)
5. Telefon DNS hali ochilmasa: kesh tozalash / boshqa Wi‑Fi / 24 soat

---

## Bugun tugagan ishlar (Instagram / Reels)

### 0) Reels vs Stories tanlash
- Admin `/admin/instagram` — yuqorida **Reels | Stories | Meta/DM** tanlov.
- Stories: rasm/video + mahsulot havolasi, «Story havolasi nusxa», preview `/instagram/story/[id]`.
- Model: `InstagramStory`; API: `/api/admin/instagram/stories`; UI: `StoriesManager` + `InstagramWorkspace`.

### 0b) Meta Graph — haqiqiy Instagramga joylash
- Lib: `src/lib/instagram-graph.ts` (Reels/Stories publish, IG user resolve, DM)
- API: `POST /api/admin/instagram/publish` `{ type: "reel"|"story", id }` · `GET ?action=test`
- UI: Reels/Stories ro‘yxatida **«Instagramga joylash»**
- Sozlamalar: Page token, IG User ID, `app_domain` (HTTPS public — localhost Meta o‘qimaydi)
- Webhook DM: `/api/instagram` (verify + messaging + changes)
- Schema: `metaMediaId`, `metaPublishedAt` (Reel/Story)

### 1) Musiqa kutubxonasi
- MP3 tanlanganda **darhal** DB kutubxonaga yoziladi.
- Fayl yuklangan, lekin «Hali musiqa yo‘q» — eski oqim tuzatilgan.

### 2) AI matn (ChatGPT)
- API: `src/app/api/admin/ai/caption/route.ts`
- Kalit bo‘lmasa — **shablon** matn.
- To‘liq ChatGPT: `.env` ga `OPENAI_API_KEY` + `npm run dev` qayta.

### 3) Avtomatik musiqa tanlash
- Mahsulot / «AI matn» da kutubxonadan trek.

### 4) Video + musiqa birlashtirish (mux)
- Reel saqlanganda ffmpeg → `*-mux.mp4`, `audioEmbedded`
- Lib: `src/lib/mux-reel-audio.ts`

### 5) Do‘kon Reels UX
- `/instagram`, deep link `/instagram?reel=ID`, `/i/[slug]`

---

## Muhim fayllar

| Vazifa | Fayl |
|--------|------|
| Admin Reels UI | `src/components/admin/ReelsManager.tsx` |
| Mux | `src/lib/mux-reel-audio.ts` |
| Prisma | `prisma/schema.prisma` (**postgresql**) |
| Migrate | `prisma/migrations/20260811173000_init_postgres/` |
| Build | `scripts/build.mjs` |
| Env namunasi | `.env.example` |
| Neon qo‘llanma | `docs/VERCEL-DEPLOY.md` |

---

## Hali qilinmagan / keyingi qadamlar

- [ ] **Neon DATABASE_URL** → Vercel env + redeploy + seed (majburiy)
- [ ] Telefon/ISP da domen ochilishini tasdiqlash
- [ ] Haqiqiy `OPENAI_API_KEY` (ixtiyoriy)
- [ ] Meta token + webhook prod
- [ ] Media Blob/S3 (video barqarorligi)
- [ ] Birinchi real Reel joylash

---

## Texnik eslatmalar

- Javoblar foydalanuvchiga **o‘zbek** tilida. UI locale o‘zgartirilmasin.
- Commit / push — faqat foydalanuvchi so‘raganda.
- Sirlar (`.env`, Neon URI) commit qilinmasin.
- Lokal endi `file:./dev.db` emas — Neon/Postgres URL kerak.

---

## Ertaga agentga qisqa buyruq (nusxa)

```
docs/HOLAT-SAQLANGAN.md ni o‘qi va shu yerdan davom et.
Domen Vercel Valid; keyingi: Neon DATABASE_URL + seed.
Kerak: …
```
