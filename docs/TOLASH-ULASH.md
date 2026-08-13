# LUXFABRIC — Click + Payme ulash

Kod tayyor (2026-08-13). **Ulash boshlandi** — prod da status API jonli (`configured: false`); **kalitlar kutilyapti**. Merchant kabinetdan kalitlar sizniki — ularsiz to‘lov ochilmaydi. Fake PAID yo‘q.

**Ishga tushirish (kuryer + to‘lov tartibi):** [`docs/ISHGA-TUSHIRISH-REJA.md`](./ISHGA-TUSHIRISH-REJA.md)

## Holat tekshiruvi

```text
https://www.luxfabricshop.uz/api/payments/status
```

`click.configured` / `payme.configured` → `true` bo‘lishi kerak.

Lokal `.env` da `CLICK_*` / `PAYME_*` **yo‘q** (tekshirildi) — Admin → Sozlamalar yoki Vercel Sensitive ga qo‘ying.

---

## 1) Click.uz (asosiy)

### Kabinet
1. [mc.click.uz](https://mc.click.uz/) ga kiring (yoki ro‘yxatdan o‘ting).
2. Servis / Merchant ma’lumotlaridan oling:
   - **Merchant ID**
   - **Service ID**
   - **Secret Key**

### Callback URL (Click kabinetga)
| Nom | URL |
|-----|-----|
| Prepare | `https://www.luxfabricshop.uz/api/click/prepare` |
| Complete | `https://www.luxfabricshop.uz/api/click/complete` |

### Vercel yoki Admin → Sozlamalar
- `CLICK_MERCHANT_ID` / `click_merchant_id`
- `CLICK_SERVICE_ID` / `click_service_id`
- `CLICK_SECRET_KEY` / `click_secret_key` (Sensitive)

Redeploy. Checkout → **Click** yoki **Karta (Click orqali)** → `my.click.uz` → to‘lov → webhook → `PAID` + Telegram sync.

---

## 2) Payme Business

1. [business.payme.uz](https://business.payme.uz/) / Payme merchant kabinet.
2. **Merchant ID** + **Key** (secret).
3. Merchant API URL:
   ```text
   https://www.luxfabricshop.uz/api/payme
   ```
4. Env / Admin:
   - `PAYME_MERCHANT_ID` / `payme_merchant_id`
   - `PAYME_KEY` / `payme_key`

Checkout → **Payme** → `checkout.paycom.uz` → PerformTransaction → `PAID` + Telegram sync.

---

## 3) Boshqa usullar

| Usul | Holat |
|------|--------|
| **Karta (Click orqali)** | Click sozlangan bo‘lsa → `CLICK` + checkout URL |
| **Kuryerga naqd (COD)** | `PENDING` — yetkazishda to‘lov |
| Fake PAID | **Yo‘q** — faqat webhook |

Return URL (Click/Payme): `/orders/success?no=LF-…&pay=…&ps=PENDING` — sahifa webhook kutadi, PAID bo‘lsa yangilanadi.

---

## 4) DB migrate (Payme ustunlari)

Migration: `prisma/migrations/20260813100000_payme_fields/`

Lokal `prisma migrate deploy` (2026-08-13): Neon **P1000 auth failed** — `.env` dagi `DATABASE_URL` paroli eskirgan/noto‘g‘ri. Vercel build (`scripts/build.mjs`) yoki yangilangan Neon URI bilan qayta urinib ko‘ring.

Agar migrate ishlamasa, Neon SQL Editor da:

```sql
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeState" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeCreateTime" BIGINT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymePerformTime" BIGINT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeCancelTime" BIGINT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeReason" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymeId_key" ON "Order"("paymeId");
```

Keyin `_prisma_migrations` ga yozuv qo‘shish yoki `npx prisma migrate resolve --applied 20260813100000_payme_fields` (faqat SQL qo‘lda ishlagandan keyin).

---

## Kod

| Fayl | Vazifa |
|------|--------|
| `src/lib/click.ts` + `click-webhook.ts` | Click SHOP API |
| `src/app/api/click/*` | Prepare / Complete |
| `src/lib/payme.ts` + `payme-webhook.ts` | Payme JSON-RPC |
| `src/app/api/payme` | Merchant callback |
| `src/app/api/payments/status` | Holat (sirlar yo‘q) |
| `src/app/api/orders` | `paymentUrl` + `checkoutUrl`; COD/CLICK/PAYME → PENDING |
| Admin Sozlamalar | `click_*` + `payme_*` |

---

## Salayevdan nima kerak (keyingi qadam)

1. **Click:** Merchant ID + Service ID + Secret → Admin → Sozlamalar (yoki Vercel Sensitive) + kabinetga callback URL.
2. **Payme (ixtiyoriy):** Merchant ID + Key + Merchant API URL.
3. Neon `DATABASE_URL` yangilash (agar migrate hali ishlamagan bo‘lsa) yoki yuqoridagi SQL.
4. Chatga **secret yozmang**.
5. Tekshiruv: `/api/payments/status` → configured true → test buyurtma.
