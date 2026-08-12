# LUXFABRIC — saqlangan holat (2026-08-13)

**Maqsad:** ertaga / limit tugaganda chatni qayta ochib, shu fayldan davom etish.

**Vizual:** `docs/VIZUAL-TIZIM.md` + rasmlar  
**Real (production) reja:** `docs/PRODUCTION-REJA.md` — test emas, to‘liq ishlashi kerak  
**Deploy + Neon:** `docs/VERCEL-DEPLOY.md`  
**Tiklash PDF (private, parollar o‘zingiz):** `docs/private/LOYIHA-TIKLASH.pdf` — qanday: `docs/LOYIHA-TIKLASH-QANDAY.md`  
**To‘liq Meta/Instagram holat PDF (parolli, sirlar):** `docs/private/LUXFABRIC-HOLAT-META-INSTAGRAM-2026-08-13.pdf` — ochish paroli faqat `docs/private/PDF-PAROL.txt` da. **Bu fayllarni gitga commit qilmang.**

**Oldingi chat:** [Instagram Reels musiqa](d78b58f1-3fb6-49e9-b3d6-7efb219cdec9)

**Loyiha:** `C:\Users\1\luxfabric`  
**Lokal:** `http://localhost:3000`  
**Production URL:** https://luxfabric-qhy9.vercel.app  
**Domen:** https://www.luxfabricshop.uz (apex → www 308)  
**Admin:** `/admin/login` (email: `admin@luxfabricshop.uz`)  
**Admin Instagram:** `/admin/instagram` — **Reels | Stories | Meta/DM**  
**Do‘kon Reels:** `/instagram` · Stories preview: `/instagram/story/[id]` · havola: `/i/[slug]`

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
- `scripts/build.mjs` — Vercelda real `DATABASE_URL` bo‘lsa `prisma migrate deploy` + bo‘sh katalogda avtomatik seed
- Skriptlar: `npm run db:deploy`, `npm run db:push`, `npm run db:seed`
- `.env.example` — Postgres URI namuna

**Foydalanuvchi ZO‘R qiladi (agent login qila olmaydi):**
1. Neon project + connection string
2. Vercel → Env → `DATABASE_URL`
3. Redeploy (seed build ichida — lokal `.env` / `db:seed` shart emas)
4. Telefon DNS hali ochilmasa: kesh tozalash / boshqa Wi‑Fi / 24 soat

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
- Sozlamalar: Page yoki Instagram Login token, IG User ID, App Secret, `app_domain` (HTTPS public — localhost Meta o‘qimaydi)
- OAuth: `/api/admin/instagram/oauth/start` + callback `https://www.luxfabricshop.uz/api/admin/instagram/oauth/callback`
- Instagram Login token: `graph.instagram.com` (Page linksiz ham publish)
- Webhook DM: `/api/instagram` (verify token: `luxfabric_verify` + messaging + changes)
- Schema: `metaMediaId`, `metaPublishedAt` (Reel/Story)
- Meta App ID `1228095102789379` · IG App ID `1081297184404685` · IG `@luxfabric.shop` (ID prod da Admin Meta/DM da)
- **Sirlar (token/parol):** faqat `docs/private/` PDF — bu holat fayliga yozilmaydi

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

## Instagram «Sotib olish» — Meta haqiqati (2026-08-13)

**Muhim:** uchinchi tomon ilova Instagram Feed/Reels UI da qizil «SOTIB OLISH» overlay chiza **olmaydi**. Bu Meta cheklovi.

| Usul | Holat |
|------|--------|
| Captionda CTA + URL (yuqorida) | ✓ Admin publish |
| Birinchi izoh `POST /{media-id}/comments` | ✓ Admin publish (IG Login: `instagram_business_manage_comments`) |
| Sayt `/instagram` qizil tugma | ✓ doim |
| Product / shopping tag | ❌ Instagram Login bilan yo‘q; Facebook Login + tasdiqlangan Instagram Shop + katalog |
| Post CTA tugma (Shop Now native) | ❌ Graph orqali Feed/Reels ga qo‘yilmaydi |
| Story link sticker | ❌ API qo‘llab-quvvatlamaydi — faqat IG app qo‘lda |
| Telefon IG appdan qo‘lda joylash | Bizning avto caption/izoh **ishlamaydi** — Admin «Instagramga joylash» kerak |

Kod: `ig-caption.ts` (CTA yuqoriga), `instagram-graph.ts` (`commentOnInstagramMediaWithRetry`), publish route. Mahsulot stub: `Product.metaCatalogProductId` + Meta/DM da «Katalog ID».

### Kelishilgan tez-xarid oqimi (biz nazorat qilamiz)

1. **IG post:** caption + birinchi izoh → `https://www.luxfabricshop.uz/i/{slug}?from=ig`
2. **Sahifa:** o‘lcham tanlash → katta **Sotib olish** → checkout (savatda shu mahsulot)
3. **Bio / QR:** `https://www.luxfabricshop.uz/instagram` (Admin Meta/DM da nusxa) → qizil Sotib olish → `/i/slug`

Publish muvaffaqiyatida Admin da success panel + nusxalanadigan URL. Shopping/Commerce — keyinga (ixtiyoriy).

---

## Instagram tez xarid + sharhlar + AI (2026-08-13)

### A) Bir-bosishda sotib olish
- `/i/[slug]` mobil landing: rasm, narx, o‘lcham, sticky **«Sotib olish»** → checkout (savat tozalanib shu model qo‘yiladi).
- `?from=ig` — soft banner «Instagramdan kelganingiz uchun…»; `?from=instagram` ham ishlaydi.
- «Boshqa mahsulotlar» CTA + carousel yuqoriroq.
- FAQ blurb `/i/[slug]` da (narx / o‘lcham / yetkazish / qaytarish).

### B) Sharhlar (Wildberries-lite)
- Prisma: `Review` + migrate `20260813030000_product_reviews`
- UI: yulduz, matn, foto (Blob/`/api/reviews/upload`), buyurtma№+telefon → auto APPROVED
- Admin: `/admin/reviews` (PENDING tasdiq/rad)
- Mahsulot + `/i/[slug]` da tasdiqlangan sharhlar

### C) AI izoh / DM
- Webhook `/api/instagram`: `comments` + DM; bir izohga bir marta (`InstagramCommentReply`)
- Izohlar DB: `InstagramComment` (webhook + Graph sync) · migrate `20260813050000_instagram_comments`
- Admin Reels: chap **Reels arxiv** → Reel ochiladi → **Izohlar** tab · «Izohlarni yangilash» · «AI javob»
- Sozlama: `instagram_ai_comments` (Meta/DM: «AI izoh javobi: yoqilgan/o‘chiq») + `instagram_enabled`
- `OPENAI_API_KEY` bo‘lsa ChatGPT, yo‘q bo‘lsa shablon (`src/lib/shop-ai-reply.ts`)
- Meta App → Webhooks: `messages` + **`comments`** (va/yoki live_comments) subscribe qilish kerak
- Graph: `GET /{media-id}/comments`, `POST /{comment-id}/replies`
- API: `/api/admin/instagram/comments` (GET reelId, POST sync/reply)

---

## Hali qilinmagan / keyingi qadamlar

- [x] **Neon DATABASE_URL** → Vercel env + redeploy (seed buildda avtomatik)
- [x] **Admin parol** → `/admin/login` + `ADMIN_PASSWORD`
- [x] **Vercel Blob** → `luxfabric-media` store (video/musiqa/rasm)
- [x] **Instagram Login OAuth** + ulanish testi (IG Business ID saqlangan)
- [x] **Meta/Instagram holat PDF** → `docs/private/` (parolli; gitignore)
- [x] **`/i/[slug]` bir-bosishda sotib olish** + sharhlar MVP
- [ ] Telefon/ISP da domen ochilishini tasdiqlash
- [ ] Haqiqiy `OPENAI_API_KEY` (ixtiyoriy — AI izoh/sharh uchun; Vercel Env)
- [ ] Webhook Meta dashboardda **comments** field + yakuniy tasdiq
- [x] Admin Reels arxiv side rail + per-reel izohlar + AI javob tugmasi
- [x] `instagram_ai_comments` toggle (Meta/DM)
- [x] Admin publish: caption CTA yuqorida + avto birinchi izoh + success UI / nusxa URL
- [x] Kelishilgan tez-xarid: `/i?from=ig` + bio `/instagram` + izoh retry mustahkam
- [ ] Birinchi real Reel **Admin orqali** qayta joylash (izohni tekshirish)
- [ ] (Ixtiyoriy) Instagram Shop / Commerce — product tag
- [ ] Neon parol Reset (xavfsizlik)
- [ ] Buyurtma/SMS/to‘lov oqimi tekshiruvi
- [ ] Monitoring
- [ ] To‘liq WB: Q&A tarmoq, “faqat xarid qilganlar”, video-sharh, reyting filtri

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
Domen Vercel Valid; Neon Ready; seed buildda avtomatik (mahsulotlar 0 bo‘lsa).
Kerak: …
```
