# LUXFABRIC — saqlangan holat (2026-08-13)

**Maqsad:** ertaga / limit tugaganda chatni qayta ochib, shu fayldan davom etish; yoki boshqa AIga berib tiklash.

**Vizual:** `docs/VIZUAL-TIZIM.md` + rasmlar  
**Real (production) reja:** `docs/PRODUCTION-REJA.md` — test emas, to‘liq ishlashi kerak  
**Yetkazish strategiyasi:** `docs/YETKAZISH-STRATEGIYA.md` — Toshkent hub + SLA + BTS/Fargo/Yandex  
**Ishga tushirish (kuryer + Click/Payme):** `docs/ISHGA-TUSHIRISH-REJA.md`  
**To‘lov ulash:** `docs/TOLASH-ULASH.md`  
**Deploy + Neon:** `docs/VERCEL-DEPLOY.md`  
**Tiklash PDF qanday:** `docs/LOYIHA-TIKLASH-QANDAY.md`  
**Private recovery PDF (parolli, gitignore):** `docs/private/LUXFABRIC-HOLAT-RECOVERY-2026-08-13.pdf`  
— ochish paroli faqat `docs/private/PDF-PAROL.txt` da. Qisqa yo‘riqnoma: `docs/private/README.txt`.  
**Eski Meta PDF** (agar qolgan bo‘lsa): `docs/private/LUXFABRIC-HOLAT-META-INSTAGRAM-*.pdf` — yangi RECOVERY PDF ni afzal ko‘ring.  
**Bu private fayllarni gitga commit qilmang.**

**Oldingi chat:** [Instagram Reels musiqa](d78b58f1-3fb6-49e9-b3d6-7efb219cdec9)

**Loyiha:** `C:\Users\1\luxfabric`  
**GitHub:** `https://github.com/bycottoninvest-ai/luxfabric` (branch `main`)  
**Lokal:** `http://localhost:3000`  
**Production URL:** https://luxfabric-qhy9.vercel.app  
**Domen:** https://www.luxfabricshop.uz (apex → www 308)  
**Admin:** `/admin/login` (email: `admin@luxfabricshop.uz`)  
**Admin Instagram:** `/admin/instagram` — **Reels | Stories | Meta/DM**  
**Do‘kon Reels:** `/instagram` · Stories preview: `/instagram/story/[id]` · havola: `/i/[slug]`  
**Reviews admin:** `/admin/reviews` · **Sozlamalar (Click):** `/admin/settings`

---

## Boshqa AIga / tiklash (nusxa)

```
docs/HOLAT-SAQLANGAN.md ni o‘qi (majburiy). Kerak bo‘lsa docs/private/LUXFABRIC-HOLAT-RECOVERY-2026-08-13.pdf
(parol: docs/private/PDF-PAROL.txt — secret qiymatlarni chatga yozma).
Foydalanuvchi: Salayev. Javoblar o‘zbekcha. UI locale o‘zgartirma. AGENTS.md — Next.js farq qilishi mumkin.
Repo: C:\Users\1\luxfabric · Vercel: luxfabric-qhy9 · domen: luxfabricshop.uz · Neon project: luxfabric.
Davom: …
```

**Salayevga:** private PDF + `PDF-PAROL.txt` ni USB/shaxsiy diskka saqlang; boshqa AIga shu PDF + ushbu `HOLAT-SAQLANGAN.md` bering.

---

## Loyiha nima?

LUXFABRIC Sales OS — Next.js (App Router) + Tailwind + Prisma (**PostgreSQL** / Neon) admin + do‘kon.

- Kirim / Chiqim / Buyurtma skan (QR)
- Mahsulotlar, ombor, yetkazish
- Instagram: Reels (sayt ichida) + Stories + Meta/DM + AI izoh
- Tez xarid landing `/i/[slug]` + sharhlar MVP + Click.uz to‘lov skeleton

> Bu Next.js versiyasi odatdagidan farq qilishi mumkin — kod yozishdan oldin `node_modules/next/dist/docs/` va `AGENTS.md` ga qarang.

---

## Domen + Vercel

| Band | Holat |
|------|--------|
| Domen | `luxfabricshop.uz` |
| NS (sayt.uz) | Cloudflare Active: `ivan.ns.cloudflare.com`, `norah.ns.cloudflare.com` |
| Cloudflare DNS | DNS only: CNAME `@` va `www` → `f73a9a889ef49299.vercel-dns-017.com` |
| Vercel | `luxfabric-qhy9` — domenlar **Valid Configuration** (boshqa project `luxfabric` chalkashmasin) |
| apex | 308 → `https://www.luxfabricshop.uz/` |
| Public DNS (1.1.1.1 / 8.8.8.8) | **resolves** (Vercel IP) |
| Ba’zi telefon / lokal ISP | NXDOMAIN / kesh — 24 soatgacha yoki DNS flush |
| Katalog bo‘sh | Sabab: eski SQLite serverlessda yo‘q → **Neon Postgres** + `DATABASE_URL` |

---

## Postgres / Neon (kod — qilingan)

- `prisma/schema.prisma` → `provider = "postgresql"`
- Init migrate: `prisma/migrations/20260811173000_init_postgres/`
- Keyingi: `…_click_payment_fields`, `…_payme_fields` (`20260813100000`), reviews/meta/comments/fulfillment/device/telegram
- Eski SQLite: `prisma/migrations_sqlite_archive/`
- `scripts/build.mjs` — Vercelda real `DATABASE_URL` bo‘lsa `prisma migrate deploy` + bo‘sh katalogda avtomatik seed
- Skriptlar: `npm run db:deploy`, `npm run db:push`, `npm run db:seed` · `FORCE_SEED=1`
- `.env.example` — Postgres / Click / Instagram / OpenAI namuna

**Tiklash (foydalanuvchi dashboardda):**
1. Neon project `luxfabric` + **pooled** connection string
2. Vercel → Env → `DATABASE_URL` (Sensitive)
3. Redeploy (seed build ichida)
4. Telefon DNS hali ochilmasa: kesh / boshqa Wi‑Fi / 24 soat

---

## Meta / Instagram (public identifikatorlar)

| Band | Qiymat |
|------|--------|
| Meta App ID | `1228095102789379` |
| Instagram App ID | `1081297184404685` |
| Business | Bycotton shop `1603383627790101` |
| IG | `@luxfabric.shop` |
| OAuth callback | `https://www.luxfabricshop.uz/api/admin/instagram/oauth/callback` |
| Webhook URL | `https://www.luxfabricshop.uz/api/instagram` |
| Verify token nomi | `luxfabric_verify` (DB/env; haqiqiy secret — private PDF / Admin) |

**Sirlar (token, App Secret, admin parol, Neon URI):** faqat Vercel Env / `.env` / Admin Meta-DM / `docs/private/` — **bu holat fayliga yozilmaydi.**

---

## Bugun / so‘nggi tugagan ishlar

### 0) Reels vs Stories vs Meta
- Admin `/admin/instagram` — **Reels | Stories | Meta/DM**.
- Stories: rasm/video + mahsulot havolasi, preview `/instagram/story/[id]`.
- Model: `InstagramStory`; API: `/api/admin/instagram/stories`; UI: `StoriesManager` + `InstagramWorkspace`.

### 0b) Meta Graph — haqiqiy Instagramga joylash
- Lib: `src/lib/instagram-graph.ts` (Reels/Stories publish, IG user resolve, DM, comments)
- API: `POST /api/admin/instagram/publish` · `GET ?action=test`
- OAuth: `/api/admin/instagram/oauth/start` + callback (yuqorida)
- Instagram Login token: `graph.instagram.com` (Page linksiz ham publish). IG token Facebook Graph’ga yuborilmaydi.
- Token yaroqsiz (`Cannot parse access token`) — Meta/DM → **Instagram token olish (OAuth)**. App Token (`app-id|secret`) publish uchun emas.
- Caption 1-qator + 1-izoh: `🛒 Sotib olish: https://www.luxfabricshop.uz/i/{slug}?from=ig`
- Webhook: `/api/instagram` (messaging + comments)
- Schema: `metaMediaId`, `metaPublishedAt`

### 1) Musiqa + mux
- **Trash (O‘z kutubxonangiz):** kompyuterdan yuklangan trek DELETE → Reel `musicId` uziladi + DB row + Blob/`uploads` fayl. Blob `…/music/*.mp3` endi “protected” emas (faqat static `/music/*`). UI: darhol yo‘qoladi, xato qizil `musicMsg`. Tab unmount o‘rniga `hidden`.
- Admin Reels → **Musiqa kutubxonasi** + o‘ngda **Instagram** yon panel:
  1. **Kompyuterdan tanlash** (NOMI / IJROCHI / MP3 + o‘z kutubxonasi + «Yaxshi — Reelga»)
  2. **URL dan** (ixtiyoriy) — faqat to‘g‘ridan-to‘g‘ri `.mp3/.m4a/.aac` yoki `Content-Type: audio/*` → `POST /api/admin/instagram/music/from-url` (`src/lib/import-audio-url.ts`)
- Yon panel: `@luxfabric.shop` → **Graph API** orqali o‘z Reels/VIDEO + izohlar (`GET /api/admin/instagram/feed`); «Yangi oynada Instagram» saqlangan. Meta iframe blok — sayt `/instagram` alohida link.
- **Olib tashlangan:** Internet kutubxona / Trend·Xit RF UI + `GET .../music/trends` API (`trend-music.ts`). Eski RF fayllar `public/music/trends/` da qolishi mumkin (asosiy oqimda ko‘rinmaydi).
- **Qonuniy rad:** Instagram Music Library / YouTube / Spotify / HTML sahifa scrape yoki pirate «har qanday saytdan skachat» — **yo‘q**.
- «Yaxshi — Reelga» → `musicId` joriy yangi Reel draftiga darhol; saqlashda mux.
- **Manba tanlov:** Kutubxonadan | URL dan + «Musiqani videoga birlashtirish» (`POST .../music/mux`) — faqat tanlangan manba; IG Reels URL scrape yo‘q.
- Saqlashda ffmpeg → `*-mux.mp4`, `audioEmbedded` (`src/lib/mux-reel-audio.ts`; `/music/...` ham).

### 2) AI matn / AI izoh
- Caption: `/api/admin/ai/caption` · izoh/DM: `src/lib/shop-ai-reply.ts`
- `OPENAI_API_KEY` bo‘lmasa — **shablon**.

### 3) Tez xarid (biz nazorat qilamiz)
- Caption CTA yuqorida + birinchi izoh URL (`ig-caption.ts` + publish).
- `/i/[slug]?from=ig` sticky Sotib olish → checkout.
- Bio/QR: `/instagram`.
- **Meta cheklovi:** native Feed/Reels «SOTIB OLISH» / Shop Now / Story link sticker — API orqali emas.

### 4) Sharhlar (WB-lite)
- `Review` + `/admin/reviews` · foto Blob · buyurtma№+telefon → auto APPROVED.

### 5) Reels arxiv + izohlar paneli
- Chap Reels arxiv → Izohlar · sync · AI javob · `instagram_ai_comments` toggle.

### 6) Click + Payme + COD/CARD (kod tayyor — kalitlar kerak)
- **Ulash boshlandi (2026-08-13):** kod `main` + prod Ready (`/api/payments/status` jonli, configured=false); **kalitlar kutilyapti** (mc.click.uz → Admin Sozlamalar).
- Click: `src/lib/click.ts`, `click-webhook.ts`, `/api/click/prepare|complete` (+ `/api/click`)
- Payme: `src/lib/payme.ts`, `payme-webhook.ts`, `/api/payme` (JSON-RPC)
- Holat: `GET /api/payments/status` · qo‘llanma: `docs/TOLASH-ULASH.md` · reja: `docs/ISHGA-TUSHIRISH-REJA.md`
- Checkout: CLICK/PAYME → `checkoutUrl`/`paymentUrl`; CARD → Click (agar sozlangan); COD → `PENDING`
- Fake PAID yo‘q — faqat webhook → `PAID` + Telegram sync
- Admin → Sozlamalar: `click_*` + `payme_*` (yoki Vercel `CLICK_*` / `PAYME_*`)
- Migrate: `20260813020000_click_payment_fields`, `20260813100000_payme_fields`
- **Lokal migrate (2026-08-13):** Neon P1000 auth — SQL `docs/TOLASH-ULASH.md` da; kalitlar `.env` da yo‘q → Salayev kabinetdan qo‘yadi
- Success: `/orders/success` — online to‘lovda «kutilmoqda», webhookdan keyin PAID

### 7) Buyurtma kuzatish — maxfiylik (telefon / device token)
- Pastki nav **Kuzatish** → `/orders` — «Buyurtmam qayerda?»: telefon (+998) + ixtiyoriy `LF-…`
- `/track/LF-…` deep link ham **telefon yoki qurilma tokenisiz** tafsilot bermaydi (admin session alohida)
- API: `POST /api/track/lookup` — phone match (normalize +998) yoki `deviceToken` / `deviceTokens`
- Checkout muvaffaqiyatida `deviceOrderToken` → localStorage + cookie; serverda faqat `deviceTokenHash` (SHA-256)
- Shu qurilmada «Mening buyurtmalarim» avtomatik; boshqa qurilmada telefon + LF majburiy
- Rate limit: IP / phone+order brute-force
- Migrate: `20260813080000_order_device_token`
- Ochiq `GET /api/orders` endi faqat admin

---

## Muhim fayllar

| Vazifa | Fayl |
|--------|------|
| Holat (public) | `docs/HOLAT-SAQLANGAN.md` |
| Yetkazish strategiyasi | `docs/YETKAZISH-STRATEGIYA.md` |
| Mijoz kuzatish (private) | `/orders`, `/track/[id]`, `api/track/lookup`, `order-access.ts` |
| Cursor qoida | `.cursor/rules/luxfabric-holat.mdc` |
| Admin Reels UI | `src/components/admin/ReelsManager.tsx` |
| Workspace | `src/components/admin/InstagramWorkspace.tsx` |
| Graph / caption / AI | `instagram-graph.ts`, `ig-caption.ts`, `shop-ai-reply.ts` |
| Mux | `src/lib/mux-reel-audio.ts` |
| Musiqa import | `ReelsManager` (kompyuter + kutubxona), `api/.../music/from-url` |
| Webhook IG | `src/app/api/instagram/route.ts` |
| Comments API | `src/app/api/admin/instagram/comments/route.ts` |
| Click / Payme | `src/lib/click*.ts`, `payme*.ts`, `api/click/*`, `api/payme`, `docs/TOLASH-ULASH.md` |
| Landing | `src/app/i/[slug]/page.tsx` |
| Prisma | `prisma/schema.prisma` (**postgresql**) |
| Build | `scripts/build.mjs` |
| Env namuna | `.env.example` |
| Neon qo‘llanma | `docs/VERCEL-DEPLOY.md` |
| Telegram bot | `docs/TELEGRAM-BOT-ULASH.md`, `src/lib/telegram-orders.ts`, `/api/telegram/webhook` |

---

## Instagram «Sotib olish» — Meta haqiqati

**Muhim:** uchinchi tomon ilova Instagram Feed/Reels UI da qizil «SOTIB OLISH» overlay chiza **olmaydi**.

| Usul | Holat |
|------|--------|
| Captionda CTA + URL | ✓ Admin publish |
| Birinchi izoh | ✓ (IG Login: `instagram_business_manage_comments`) |
| Sayt `/instagram` + `/i` qizil tugma | ✓ |
| Product / shopping tag | ❌ Instagram Login bilan yo‘q |
| Post CTA Shop Now native | ❌ Graph orqali yo‘q |
| Story link sticker | ❌ faqat IG app qo‘lda |
| Telefon IG appdan qo‘lda joylash | Bizning avto caption/izoh **ishlamaydi** — Admin publish kerak |

### Kelishilgan tez-xarid oqimi

1. **IG post:** caption + birinchi izoh → `https://www.luxfabricshop.uz/i/{slug}?from=ig`
2. **Sahifa:** o‘lcham → **Sotib olish** → checkout
3. **Bio / QR:** `https://www.luxfabricshop.uz/instagram`

---

## Hali qilinmagan / keyingi qadamlar

- [x] Neon `DATABASE_URL` → Vercel + redeploy
- [x] Admin parol + Vercel Blob `luxfabric-media`
- [x] Instagram Login OAuth + ulanish
- [x] Private recovery PDF (parolli; gitignore)
- [x] `/i` bir-bosishda sotib olish + sharhlar MVP + AI izoh + Reels arxiv
- [x] Click + Payme kod (webhook, checkout URL, Admin sozlamalar) — `docs/TOLASH-ULASH.md`
- [ ] Click / Payme **merchant kalitlari** (mc.click.uz / business.payme.uz → Admin Sozlamalar)
- [ ] Payme migrate Neon da (auth yangilash yoki SQL qo‘lda)
- [ ] Telefon/ISP da domen ochilishini tasdiqlash
- [ ] Haqiqiy `OPENAI_API_KEY` (ixtiyoriy — Vercel Env)
- [ ] Webhook Meta da **comments** field yakuniy tasdiq
- [ ] Birinchi real Reel **Admin orqali** qayta joylash
- [ ] (Ixtiyoriy) Instagram Shop / Commerce
- [ ] Neon parol Reset · buyurtma/SMS/to‘lov to‘liq tekshiruv · Monitoring
- [ ] To‘liq WB: Q&A, “faqat xarid qilganlar”, video-sharh
- [x] Yetkazish strategiyasi hujjati + checkout/tracking ETA (`docs/YETKAZISH-STRATEGIYA.md`)
- [x] Buyurtma kuzatish maxfiyligi (telefon + device token; LF yolg‘iz yetarli emas)
- [x] Telegram bot buyurtmalar: avto xabar + rasmlar + QR + inline status + editMessage (`docs/TELEGRAM-BOT-ULASH.md`)

---

## Muhim commitlar (yo‘naltirish)

| Commit | Nima |
|--------|------|
| `5e1eaaf` | Initial Sales OS |
| `1709b08` / `67de5c9` | Postgres Neon + build seed |
| `a6d541d` / `d1cbfad` | Admin password |
| `6f16691` | Vercel Blob |
| `d74bf59` / `a2daac5` / `2f0d1fc` | Instagram Login OAuth |
| `c2979bb` | One-tap buy + reviews + AI comments (+ Click fields) |
| `355a21e` … `d624ecd` | Caption CTA + first comment + `from=ig` |
| `c5db425` | Reels edit side panel |
| `e16b4c4` | Reels archive + comments panel + AI toggle |
| `fab28f3` | Buyurtma kuzatish maxfiyligi (telefon + device token) |

---

## Texnik eslatmalar

- Javoblar foydalanuvchiga **o‘zbek** tilida. UI locale o‘zgartirilmasin.
- Commit / push — faqat foydalanuvchi so‘raganda (private hech qachon).
- Sirlar (`.env`, Neon URI, Meta secret) commit qilinmasin.
- Lokal endi `file:./dev.db` emas — Neon/Postgres URL kerak.
- Prisma generate EPERM: `npm run dev` to‘xtat → `npx prisma generate` → qayta.
