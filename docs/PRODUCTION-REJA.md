# LUXFABRIC — REAL (production) reja

**Maqsad:** test/demo emas. Mijoz Instagram → sayt → buyurtma to‘liq ishlashi kerak.

## Nima “real” degani

| Qism | Real holat |
|------|------------|
| Domen | `https://luxfabricshop.uz` ochiladi (HTTPS) |
| Sayt | Next.js shu domenda ishlaydi (localhost emas) |
| Instagram | `@luxfabric.shop` Professional + Facebook Page |
| Meta | Page token + webhook + Reels/Stories joylash |
| Do‘kon | Sotib olish, buyurtma, admin skan — prod da |

## Bosqichlar (tartib muhim)

### 1) Hosting (sayt internetda)
- Oddiy sayt.uz PHP hosting **emas**
- **Vercel** (yoki Node VPS) — Next.js uchun
- DNS: `luxfabricshop.uz` → Vercel
- Natija: brauzerda `https://luxfabricshop.uz` ochiladi

### 2) Sozlamalar (prod)
Admin → Instagram → Meta/DM:
- `app_domain` = `https://luxfabricshop.uz`
- `instagram_username` = `luxfabric.shop`
- Page Access Token (real)
- Webhook: `https://luxfabricshop.uz/api/instagram`
- **Instagramni yoqish**

### 3) Meta App (real ruxsatlar)
- `instagram_content_publish`
- messaging / DM
- App Review kerak bo‘lishi mumkin (production limitlar)

### 4) Kontent oqimi
1. Admin da Reel/Story yaratish (musiqa mux bilan)
2. **Instagramga joylash**
3. Mijoz IG da ko‘radi → link → sayt → Sotib olish

## Hozir qilinmasin
- SSL sotib olish (Vercel bepul beradi)
- WHOIS “Ochish”
- Faqat localhost da “tayyor” deb hisoblash

## Joriy holat
- [x] Domen: luxfabricshop.uz (faol)
- [x] IG: @luxfabric.shop Professional + FB bog‘langan
- [x] Kod: Reels/Stories/Meta publish
- [ ] Sayt deploy + DNS
- [ ] Meta token + webhook prod
- [ ] Birinchi real Reel joylash testi

Batafsil holat: `docs/HOLAT-SAQLANGAN.md`
