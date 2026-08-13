# LUXFABRIC — ishga tushirish reja (kuryer + to‘lov)

**Sana:** 2026-08-13  
**Domen:** https://www.luxfabricshop.uz · Vercel: `luxfabric-qhy9`  
**Bog‘liq:** [`TOLASH-ULASH.md`](./TOLASH-ULASH.md) · [`YETKAZISH-STRATEGIYA.md`](./YETKAZISH-STRATEGIYA.md) · [`PRODUCTION-REJA.md`](./PRODUCTION-REJA.md) · [`HOLAT-SAQLANGAN.md`](./HOLAT-SAQLANGAN.md)

> Fake API kalit / fake PAID yo‘q. Merchant kabinetdan kelgan haqiqiy kalitlar kerak.

### Holat (2026-08-13 kechqurun)
**Ulash boshlandi** — Click/Payme kod + docs commit/deploy qilinmoqda; **merchant kalitlar Salayevdan kutilyapti** (Admin → Sozlamalar). Neon Payme migrate — `.env` `DATABASE_URL` bilan urinib ko‘riladi / kerak bo‘lsa SQL qo‘lda.

---

## 1) Kuryerlar (O‘zbekiston) — rasmiy saytlar

Checkout «O‘zim kuryer tanlayman» ro‘yxati: `src/lib/uz-couriers.ts` (BTS, Fargo, UzPost, EMS, Yandex, Tezbor, DPD).

| Kompaniya | Rasmiy sayt | Telefon / kabinet | Shartnoma turi | Integratsiya | LUXFABRIC tavsiya |
|-----------|-------------|-------------------|----------------|--------------|-------------------|
| **BTS Express** | [bts.uz](https://bts.uz) | Call-center **1230**; ofislar: bts.uz | Biznes shartnoma + COD | **1-bosqich: manual** (ofisga topshirish + trek qo‘lda). API (`api.bts.uz`) — faqat BTS hujjat/kalit berilgandan keyin | **#1 viloyat / XOR** — birinchi shartnoma |
| **Fargo** | [fargo.uz](https://fargo.uz) · trek: [my.fargo.uz](https://my.fargo.uz) | +998 71 200 00 37 · t.me/fargopochta_bot | E-com merchant shartnoma | **Manual / kabinet** (PVZ+locker). API keyinroq | **#2** — PVZ/locker kuchli |
| **Yandex Delivery** | [delivery.yandex.uz](https://delivery.yandex.uz) | Yandex Go / B2B ariza (saytda) | Yuridik / YaTT shartnoma | **Manual chaqirish** (ilova) yoki B2B API keyin | **#3 Toshkent «bugun»** |
| **UzPost** | [uz.post](https://uz.post) (eski pochta.uz → shu yerga) | **1165** · yuridik kabinet | Korporativ shartnoma | Manual trek / pochta bo‘limi | Zaxira (sekinroq) |
| **EMS Uzbekistan** | [emspost.uz](https://emspost.uz) | **1081** | UzPost orqali | Manual | Xalqaro / maxsus |
| **DPD Uzbekistan** | [dpd.uz](https://dpd.uz) | +998 91 787 87 87 · customer@dpd.uz | Biznes shartnoma | Manual / DPD kabinet | Zaxira |
| **Tezbor** | [tezbor.uz](https://tezbor.uz) | +998 55 500 50 51 | Shartnoma | Manual | Qo‘shimcha last-mile |
| **EMU Express** | [emu.uz](https://emu.uz) | Sayt/ofis orqali | Shartnoma + manual trek | API siz boshlash | Ixtiyoriy zaxira (checkoutda hali yo‘q) |
| **Express24** | [express24.uz](https://express24.uz) | — | — | **Posilka emas** (ovqat / Yandex Eats) | **Ulanmaydi** — katalogga kiritilmagan |

### Tavsiya tartibi (LUXFABRIC)

1. **BTS** — milliy SLA, Xorazm/viloyat, COD.  
2. **Fargo** — PVZ/locker, e-com.  
3. **Yandex Delivery** — faqat Toshkent tez yetkazish.  
4. UzPost / DPD / EMU — kerak bo‘lsa zaxira.

**Amaliy model (hozir):** shop-ships yoki mijoz tanlovi → ombordan pack → kuryer punktiga topshirish → `courierTracking` adminga → mijozga SMS/Telegram. To‘liq BTS/Fargo API — **kalit + hujjat kelguncha qurilmaydi**.

---

## 2) To‘lovlar

Batafsil kalitlar va SQL: [`docs/TOLASH-ULASH.md`](./TOLASH-ULASH.md).

| Provayder | Sayt / kabinet | Kerakli kalitlar | Callback (prod) | Holat |
|-----------|----------------|------------------|-----------------|-------|
| **Click** (asosiy) | [business.click.uz](https://business.click.uz) · merchant: [mc.click.uz](https://mc.click.uz) · docs: [docs.click.uz](https://docs.click.uz) | `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY` | Prepare: `https://www.luxfabricshop.uz/api/click/prepare` · Complete: `…/api/click/complete` | Kod tayyor — **kalitlar Salayevdan** |
| **Payme** | [business.payme.uz](https://business.payme.uz) · [merchant.payme.uz](https://merchant.payme.uz) | `PAYME_MERCHANT_ID`, `PAYME_KEY` | `https://www.luxfabricshop.uz/api/payme` | Kod tayyor — **Neon Payme migrate** hali kerak bo‘lishi mumkin |
| **Uzum Bank** (ixtiyoriy, keyin) | [merchants.uzumbank.uz](https://merchants.uzumbank.uz) | Merchant API kalitlari (shartnomadan) | Hali kodda yo‘q | Click+Payme dan keyin |
| **COD** | — | — | — | Ishlaydi (`PENDING`) |

Tekshiruv: `https://www.luxfabricshop.uz/api/payments/status` → `click.configured` / `payme.configured`.

---

## 3) Haftalik bosqichlar (checklist)

### A — Bugun / 1–2 kun (Salayev)

- [ ] **Click** merchant: [mc.click.uz](https://mc.click.uz) / [business.click.uz](https://business.click.uz) — ID + Service + Secret → Admin → Sozlamalar yoki Vercel Sensitive  
- [ ] Click kabinetga Prepare/Complete URL qo‘yish  
- [ ] Neon `DATABASE_URL` yangilash → Payme migration (`docs/TOLASH-ULASH.md` SQL)  
- [ ] **BTS** bilan bog‘lanish: [bts.uz](https://bts.uz) forma / **1230** — e-com shartnoma, COD, pickup soati  
- [ ] Test: `/api/payments/status` + kichik Click to‘lov

### B — Shu hafta

- [ ] Payme ariza ([business.payme.uz](https://business.payme.uz)) — ixtiyoriy, lekin tavsiya  
- [ ] Fargo merchant: [fargo.uz](https://fargo.uz) / +998 71 200 00 37  
- [ ] Yandex Delivery B2B ariza (Toshkent)  
- [ ] Admin: default kuryer kontaktlari (BTS/Fargo telefon) saqlash  
- [ ] Ops: cutoff 15:00, trek majburiy (`YETKAZISH-STRATEGIYA.md`)

### C — Keyingi 1–2 hafta

- [ ] Meta token + birinchi real Reel (PRODUCTION-REJA)  
- [ ] Kuryer API faqat shartnoma + hujjat kelgach  
- [ ] Uzum Bank — faqat Click/Payme barqaror bo‘lgach

---

## 4) Salayev vs Cursor

| Kim | Nima qiladi |
|-----|-------------|
| **Salayev** | Click/Payme/Uzum merchant ro‘yxat; BTS/Fargo/Yandex shartnoma; kalitlarni Admin/Vercelga qo‘yish (chatga secret yozmaslik); Neon URI; test to‘lov; kuryerga posilka topshirish |
| **Cursor** | Kod: Click/Payme webhook, checkout kuryer ro‘yxati, fulfillment, admin sozlamalar UI, hujjatlar; API integratsiya — **faqat rasmiy hujjat + kalit berilgandan keyin** |

---

## 5) Bu hafta ish tartibi (qisqa)

1. **Click ulash** (eng tez prepaid)  
2. **Neon Payme migrate**  
3. **BTS shartnoma** (birinchi kuryer)  
4. Fargo + Yandex ariza  
5. Meta / kontent (parallel)

**Birinchi ro‘yxatdan o‘tish:** Click (to‘lov) + BTS (yetkazish).
