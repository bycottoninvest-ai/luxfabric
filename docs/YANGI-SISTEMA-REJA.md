# LUXFABRIC — yangi sistema ishga tushirish reja

**Sana:** 2026-08-18  
**Maqsad:** test/demo emas. Birinchi real mijoz: Instagram → sayt → to‘lov → ombor → kuryer → yetkazildi.

**Holat:** `docs/HOLAT-SAQLANGAN.md`  
**To‘lov:** `docs/TOLASH-ULASH.md` · **Kuryer:** `docs/YETKAZISH-STRATEGIYA.md`

---

## Sistema nima?

LUXFABRIC Sales OS — do‘kon + admin:

```text
IG Reels/Stories  →  luxfabricshop.uz/i/[slug]  →  checkout
                                                →  Click / Payme / COD
                                                →  Telegram + admin skan
                                                →  pack → kuryer trek → yetkazildi
```

**«Ishga tushdi» deb hisoblanadi, agar:**

1. Telefon da `https://www.luxfabricshop.uz` ochiladi
2. Katalogda mahsulotlar bor, `/i/[slug]` dan 1 bosishda checkout
3. Click yoki Payme **haqiqiy** to‘lov → `PAID` (webhook)
4. COD ham ishlaydi
5. Admin: buyurtma ko‘rinadi, status o‘zgaradi, Telegram xabar ketadi
6. Trek kodi qo‘yiladi, mijoz `/orders` da ko‘radi
7. Admin orqali 1 ta Reel Instagramga chiqadi + caption havola ishlaydi

---

## Nima allaqachon tayyor (kod)

| Qism | Holat |
|------|--------|
| Domen + Vercel + Neon | ✓ `luxfabric-qhy9` · `luxfabricshop.uz` |
| Katalog, checkout, admin QR/skan | ✓ |
| Click + Payme webhook kod | ✓ kalitlar yo‘q → `configured: false` |
| COD | ✓ |
| Yetkazish va’dasi / PVZ / fulfillment | ✓ kod; kuryer shartnomasi yo‘q |
| Telegram bot buyurtma | ✓ |
| Kuzatish (telefon + device token) | ✓ |
| Reels / Stories / mux / musiqa | ✓ |
| Meta Graph publish + OAuth | ✓ token/webhook yakuniy tasdiq kerak |
| Sharhlar MVP | ✓ |
| Vercel Blob | ✓ `luxfabric-media` |

---

## Nima blokirovka (sizsiz ochilmaydi)

| # | Blok | Kim | Qayer |
|---|------|-----|--------|
| 1 | **Click kalitlari** | Salayev | [mc.click.uz](https://mc.click.uz) → Admin Sozlamalar |
| 2 | **Payme kalitlari** (ixtiyoriy, lekin kerak) | Salayev | [business.payme.uz](https://business.payme.uz) |
| 3 | **BTS / Fargo shartnoma** | Salayev | Telefon / ofis — 1-bosqich manual trek |
| 4 | Click kabinetda Prepare/Complete URL | Salayev | `docs/TOLASH-ULASH.md` |
| 5 | Birinchi real Reel (Admin orqali) | Salayev + Cursor | `/admin/instagram` |
| 6 | Telefon/ISP da domen | kutish / DNS flush | ba’zi tarmoqlarda kesh |

Cursor **fake kalit / fake PAID** qo‘ymaydi.

---

## 7 kunlik tartib

### 0-kun — tayyorlik (bugun, ~1 soat)

- [ ] Production ochilishini tasdiqlash: `https://www.luxfabricshop.uz`
- [ ] `https://www.luxfabricshop.uz/api/payments/status` — Click/Payme `configured`
- [ ] Admin login: `/admin/login`
- [ ] Katalogda sotiladigan SKU lar (rasm, o‘lcham, narx, ombor > 0)
- [ ] Telegram bot buyurtma kanaliga test xabar

**Natija:** «sayt tirik / to‘lov o‘chiq / mahsulot bor» aniq.

### 1-kun — to‘lov (asosiy)

Salayev:

- [ ] Click merchant: Merchant ID + Service ID + Secret
- [ ] Kabinetga URL:
  - Prepare: `https://www.luxfabricshop.uz/api/click/prepare`
  - Complete: `https://www.luxfabricshop.uz/api/click/complete`
- [ ] Kalitlarni **Admin → Sozlamalar** (yoki Vercel Sensitive). Chatga secret yozilmaydi.

Cursor (kalit qo‘yilgach):

- [ ] Status API `click.configured = true`
- [ ] 1 so‘m/kichik test to‘lov → webhook → `PAID` + Telegram
- [ ] Success sahifa: avval «kutilmoqda», keyin PAID

**Natija:** prepaid ishlaydi. COD zaxira.

### 2-kun — birinchi to‘liq oqim (ichki test)

- [ ] `/i/[slug]?from=ig` → o‘lcham → Sotib olish → Click **yoki** COD
- [ ] Admin `/admin/orders`: NEW → PAID/PICKING → PACKED
- [ ] Trek qo‘lda (test kod) → SHIPPED → mijoz `/orders` da ko‘radi
- [ ] QR skan (ombor chiqim) sinovi

**Natija:** bitta «soxta» buyurtma oxirigacha o‘tadi.

### 3–4-kun — yetkazish ops (manual)

Salayev:

- [ ] BTS: [bts.uz](https://bts.uz) / **1230** — e-com + COD + pickup
- [ ] Fargo zaxira: +998 71 200 00 37
- [ ] Yandex — faqat Toshkent «bugun» (ixtiyoriy)

Ops qoida (kod allaqachon):

- Ish kuni **15:00** gacha tasdiqlangan → shu kun `shipBy`
- `SHIPPED` faqat trek bilan
- Toshkent: Yandex/uyga yoki PVZ; viloyat: BTS/Fargo

**Natija:** posilka topshirish yo‘li aniq, API shart emas.

### 5-kun — Instagram sotuv mashinasi

- [ ] Meta/DM: token yaroqli (`GET /api/admin/instagram/publish?action=test`)
- [ ] Webhook comments field tasdiq
- [ ] 1 Reel Admin orqali joylash
- [ ] Caption + 1-izoh: `https://www.luxfabricshop.uz/i/{slug}?from=ig`
- [ ] Telefondan havola → checkout

**Natija:** IG → sayt → buyurtma yopiq zanjir.

### 6–7-kun — ochiq savdo + barqarorlik

- [ ] Bio/QR: `https://www.luxfabricshop.uz/instagram`
- [ ] 3–5 SKU «sotuvga tayyor» (rasm + o‘lcham + ombor)
- [ ] Payme ulash (Click ishlagach)
- [ ] SMS ixtiyoriy (`docs/SMS-ULASH.md`) — Telegram yetarli bo‘lsa keyinroq
- [ ] Monitoring: sayt yiqilsa xabar (Vercel + Telegram)

**Ochiq savdo:** 1-chi notanish mijoz buyurtmasi qabul qilinadi.

---

## Kim nima qiladi

| Salayev | Cursor |
|---------|--------|
| Click / Payme kabinet + kalitlar | Kod, webhook, checkout, xato tuzatish |
| BTS/Fargo/Yandex shartnoma | Fulfillment UI, trek maydoni, ETA |
| Kalitlarni Admin/Vercelga qo‘yish | Status tekshiruv, test oqim |
| Ombor, pack, kuryerga topshirish | Admin skan, Telegram xabar |
| Meta akkaunt / OAuth tasdiq | Publish, caption, Reels mux |
| Neon parol Reset (xavfsizlik) | Migrate/deploy yo‘riqnoma |

---

## Hozir qilinmasin

- Fake to‘lov / fake PAID
- Kuryer API (hujjat+kalit kelguncha)
- Uzum Bank (Click+Payme dan keyin)
- To‘liq Wildberries: video-sharh, «faqat xarid qilganlar»
- Instagram native Shop Now / Product tag (Meta API bermaydi)
- SSL sotib olish (Vercel beradi)

---

## Bugungi birinchi qadam

1. Salayev: Click kalitlari bormi?
   - **Ha** → Admin Sozlamalarga qo‘ying, Cursor test to‘lovni tekshiradi
   - **Yo‘q** → [mc.click.uz](https://mc.click.uz) / [docs/CLICK-REGISTRATSIYA.md](./CLICK-REGISTRATSIYA.md)
2. Cursor: katalog + payments/status + Telegram jonliligini tekshiradi
3. Keyin 2-kun oqimi (ichki test buyurtma)

**Birinchi ro‘yxat:** Click (pul) + BTS (yetkazish) + 1 Reel (trafik).
