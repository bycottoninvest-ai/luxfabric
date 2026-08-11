# LUXFABRIC — REAL (production) reja

**Maqsad:** test/demo emas. Mijoz Instagram → sayt → buyurtma to‘liq ishlashi kerak.

## Nima “real” degani

| Qism | Real holat |
|------|------------|
| Domen | `https://luxfabricshop.uz` / `www` ochiladi (HTTPS) |
| Sayt | Next.js Vercelda (`luxfabric-qhy9`) |
| Baza | **Postgres (Neon)** — SQLite Vercelda yo‘q |
| Instagram | `@luxfabric.shop` Professional + Facebook Page |
| Meta | Page token + webhook + Reels/Stories joylash |
| Do‘kon | Sotib olish, buyurtma, admin skan — prod da |

## Bosqichlar (tartib muhim)

### 1) Hosting + DNS ✓ (deyarli)
- Vercel: `luxfabric-qhy9` — domenlar **Valid Configuration**
- Cloudflare NS: `ivan` / `norah` (sayt.uz da saqlangan, Active)
- DNS only: CNAME `@` va `www` → `f73a9a889ef49299.vercel-dns-017.com`
- apex **308** → www; public resolverlarda ochiladi
- Ba’zi telefon/ISP hali NXDOMAIN — DNS kesh tozalash / 24 soatgacha kutish

### 2) Postgres (HOZIR — majburiy)
Katalog bo‘shligi sababi: serverlessda SQLite yo‘q.
1. Neon project + connection string
2. Vercel `DATABASE_URL`
3. Redeploy → `prisma migrate deploy` (build ichida)
4. `npm run db:seed`

Batafsil: `docs/VERCEL-DEPLOY.md`

### 3) Sozlamalar (prod)
Admin → Instagram → Meta/DM:
- `app_domain` = `https://luxfabricshop.uz` (yoki www)
- `instagram_username` = `luxfabric.shop`
- Page Access Token (real)
- Webhook: `https://luxfabricshop.uz/api/instagram`
- **Instagramni yoqish**

### 4) Meta App (real ruxsatlar)
- `instagram_content_publish`
- messaging / DM
- App Review kerak bo‘lishi mumkin

### 5) Kontent oqimi
1. Admin da Reel/Story yaratish
2. **Instagramga joylash**
3. Mijoz IG → link → sayt → Sotib olish

## Hozir qilinmasin
- SSL sotib olish (Vercel beradi)
- WHOIS “Ochish”
- Faqat localhost da “tayyor” deb hisoblash

## Joriy holat (2026-08-11)
- [x] Domen: luxfabricshop.uz (Cloudflare Active, Vercel Valid)
- [x] Deploy: https://luxfabric-qhy9.vercel.app (200)
- [x] Public DNS → Vercel (apex 308 → www)
- [x] Kod: Prisma **postgresql** + migrate deploy buildda
- [ ] Neon `DATABASE_URL` Vercelga (foydalanuvchi)
- [ ] `db:seed` production
- [ ] Meta token + webhook prod
- [ ] Birinchi real Reel joylash
- [ ] Media Blob/S3 (keyinroq)

Batafsil holat: `docs/HOLAT-SAQLANGAN.md`
