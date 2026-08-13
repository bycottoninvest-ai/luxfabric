# LUXFABRIC — SMS ulash (Eskiz.uz)

Mijozlarga buyurtma va holat SMS lari **Eskiz.uz** orqali yuboriladi.

## Qanday ishlaydi

1. Checkout da mijoz **SMS** (default), Telegram, BOTH yoki NONE tanlaydi.
2. Buyurtma yaratilganda — qabul qilindi SMS (SMS tanlangan bo‘lsa).
3. Holat o‘zgaganda ham SMS:
   - **PAID** — to‘lov tasdiqlandi
   - **PICKING** — omborda yig‘ilmoqda
   - **PACKED** — qadoqlandi
   - **SHIPPED** — kuryerga topshirildi + trek-kod
   - **READY_PICKUP** — olib ketishga tayyor
   - **DELIVERED** — yetkazildi
4. Matnda: `LUXFABRIC.shop`, buyurtma raqami (`LF-...`), tracking:
   `https://www.luxfabricshop.uz/track/{orderNumber}` (domen `app_domain` / env dan).
5. SMS xato bo‘lsa buyurtma **buzilmaydi** — faqat log.

Telegram tanlangan bo‘lsa — Telegram; BOTH da ikkalasi; SMS da faqat SMS.

## Salayevdan nima kerak

1. **Eskiz akkaunt** — [eskiz.uz](https://eskiz.uz) ro‘yxatdan o‘tish (yuridik / tadbirkor).
2. **Login**: email + parol (API token shu login orqali olinadi).
3. **Sender nick** (alfa-nom) — masalan `LUXFABRIC` yoki `luxfabric.shop`  
   - Operatorlar tasdiqlashi 1–2 oy olishi mumkin.  
   - Tasdiqlangunicha test uchun odatda `4546` ishlaydi.
4. **Qaysi raqamdan / nick bilan** mijozlarga chiqishi kerak — `ESKIZ_FROM` ga yoziladi.  
   - Agar alohida SIM/raqam bo‘lsa: `SMS_FROM_PHONE=+998XXXXXXXXX` (ixtiyoriy eslatma; asosan `ESKIZ_FROM`).
5. Balans — Eskiz kabinetda to‘ldirish.

Raqamni chatga yozish shart emas: Vercel Environment Variables yetarli.

## Vercel env (production)

Project: `luxfabric-qhy9` → Settings → Environment Variables → Production (+ Preview ixtiyoriy):

| Kalit | Qiymat |
|-------|--------|
| `SMS_PROVIDER` | `eskiz` |
| `ESKIZ_EMAIL` | Eskiz kabinet email |
| `ESKIZ_PASSWORD` | Eskiz parol |
| `ESKIZ_FROM` | `4546` (test) yoki tasdiqlangan nick (`LUXFABRIC` / `luxfabric.shop`) |
| `SMS_FROM_PHONE` | ixtiyoriy: `+998...` (hujjat / eslatma) |

Keyin **Redeploy**.

Lokal: `.env.local` ga xuddi shu kalitlar (commit qilinmasin).

## Admin tekshiruv

Admin → **Sozlamalar** → «SMS va Telegram»:

- **SMS holati: sozlangan / yo‘q** — env bor-yo‘qligi (kalit UI da ko‘rinmaydi).
- **Test SMS** — telefon kiriting → Eskiz orqali bitta xabar.

## API (texnik)

- Login: `POST https://notify.eskiz.uz/api/auth/login` → Bearer token
- Send: `POST https://notify.eskiz.uz/api/message/sms/send`  
  `mobile_phone=998XXXXXXXXX`, `message=...`, `from=...`
- Kod: `src/lib/sms.ts`, triggerlar: `src/lib/notify.ts`

## Xavfsizlik

- Parol / token ni gitga qo‘ymang.
- Admin Settings dagi eski `sms_api_key` maydoni endi asosiy emas — env ishlatiladi.
