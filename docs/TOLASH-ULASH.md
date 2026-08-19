# LUXFABRIC — Click + Payme + Paynet ulash

Kod tayyor. **Ulash** — prod da status API jonli (`configured: false` kalitlar bo‘lmasa); **kalitlar kutilyapti**. Merchant kabinetdan kalitlar sizniki — ularsiz to‘lov ochilmaydi. Fake PAID yo‘q.

**Ishga tushirish (kuryer + to‘lov tartibi):** [`docs/ISHGA-TUSHIRISH-REJA.md`](./ISHGA-TUSHIRISH-REJA.md)

## Holat tekshiruvi

```text
https://www.luxfabricshop.uz/api/payments/status
```

`click.configured` / `payme.configured` / `paynet.configured` → `true` bo‘lishi kerak.

Lokal `.env` da `CLICK_*` / `PAYME_*` / `PAYNET_*` **yo‘q** bo‘lsa — Admin → Sozlamalar yoki Vercel Sensitive ga qo‘ying.

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

## 2b) Paynet (terminal / ilova)

Kod: `src/lib/paynet.ts` + `paynet-webhook.ts` · `POST /api/paynet`

### Anketa (Paynetga)
| Maydon | Qiymat |
|--------|--------|
| API Endpoint URL | `https://www.luxfabricshop.uz/api/paynet` |
| Username | masalan `luxfabric` (o‘zingiz belgilaysiz) |
| Password | yangi kuchli parol (chatga yozmang) |
| service_id | Paynet bersa — o‘sha; yo‘qsa `1` |
| Field Name | `order_id` |
| Field Value | `Buyurtma raqami (LF-xxxxxx)` |

### Admin / Vercel
- `PAYNET_USERNAME` / `paynet_username`
- `PAYNET_PASSWORD` / `paynet_password`
- `PAYNET_SERVICE_ID` / `paynet_service_id` (ixtiyoriy)
- `PAYNET_MERCHANT_ID` (ixtiyoriy, `app.paynet.uz` havola)

Checkout → **Paynet** → terminal/ilovada `LF-…` kiritiladi → GetInformation + PerformTransaction → `PAID`.

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

```sql
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paynetTransactionId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paynetProviderTrnId" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paynetState" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paynetTransactionId_key" ON "Order"("paynetTransactionId");
```

Paynet migration: `prisma/migrations/20260819100000_paynet_fields/`

---

## Kod

| Fayl | Vazifa |
|------|--------|
| `src/lib/click.ts` + `click-webhook.ts` | Click SHOP API |
| `src/app/api/click/*` | Prepare / Complete |
| `src/lib/payme.ts` + `payme-webhook.ts` | Payme JSON-RPC |
| `src/app/api/payme` | Merchant callback |
| `src/lib/paynet.ts` + `paynet-webhook.ts` | Paynet JSON-RPC / SOAP |
| `src/app/api/paynet` | Provider callback |
| `src/app/api/payments/status` | Holat (sirlar yo‘q) |
| `src/app/api/orders` | `paymentUrl` + `checkoutUrl`; COD/CLICK/PAYME/PAYNET → PENDING |
| Admin Sozlamalar | `click_*` + `payme_*` + `paynet_*` |

---

## Salayevdan nima kerak (keyingi qadam)

1. **Click:** Merchant ID + Service ID + Secret → Admin → Sozlamalar (yoki Vercel Sensitive) + kabinetga callback URL.
2. **Payme (ixtiyoriy):** Merchant ID + Key + Merchant API URL.
3. **Paynet:** Username + Password + (service_id) → Admin → Sozlamalar; anketa URL: `/api/paynet`.
4. Neon `DATABASE_URL` yangilash (agar migrate hali ishlamagan bo‘lsa) yoki yuqoridagi SQL.
5. Chatga **secret yozmang**.
6. Tekshiruv: `/api/payments/status` → configured true → test buyurtma.
