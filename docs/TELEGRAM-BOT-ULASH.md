# Telegram bot — buyurtmalar (LUXFABRIC)

Yangi buyurtma → admin/direktor chatiga avtomatik xabar (mahsulot rasmlari, QR, inline status tugmalari).  
Sayt / QR skaner / Telegram tugma → status **real vaqtda** sinxron (`editMessage`).

## 1) BotFather

1. Telegramda [@BotFather](https://t.me/BotFather) → `/newbot`
2. Nom va username bering (masalan `LuxfabricOrdersBot`)
3. Berilgan **HTTP API token** ni saqlang (sir — commit qilmang)
4. Ixtiyoriy: `/setcommands` → `start - Botni ishga tushirish`

## 2) Chat ID

1. Botga o‘zingiz (yoki admin guruh) dan `/start` yozing
2. Brauzerda (TOKEN o‘rniga o‘zingizniki):

   `https://api.telegram.org/bot<TOKEN>/getUpdates`

3. JSON ichidan `message.chat.id` ni oling (shaxsiy: musbat; guruh: manfiy, masalan `-100…`)
4. Bir nechta chat: vergul bilan `123, -100456`

## 3) Env / Admin Sozlamalar

**Vercel → Settings → Environment Variables** (production):

| Kalit | Majburiy | Izoh |
|--------|----------|------|
| `TELEGRAM_BOT_TOKEN` | ha | BotFather token |
| `TELEGRAM_ORDERS_CHAT_ID` | ha | Chat id(lar) |
| `TELEGRAM_DIRECTOR_CHAT_ID` | ixtiyoriy | Eski nom — ham ishlaydi |
| `TELEGRAM_WEBHOOK_SECRET` | tavsiya | Webhook himoya |

Yoki **Admin → Sozlamalar**:

- `telegram_bot_token`
- `telegram_director_chat_id` / `telegram_orders_chat_id`
- «Telegram buyurtma xabarlarini yoqish»
- **Telegram buyurtma test** tugmasi

## 4) Webhook (production)

URL:

```text
https://www.luxfabricshop.uz/api/telegram/webhook
```

Alias: `/api/telegram/bot`

Secret bilan o‘rnatish (PowerShell misol — TOKEN/SECRET o‘zingizniki):

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://www.luxfabricshop.uz/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

Tekshiruv:

```text
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

Lokal `localhost` uchun Telegram webhook ishlamaydi — production domen kerak.

## 5) Nima yuboriladi

- Buyurtma raqami (`LF-…`), status, manba (Sayt / Instagram / …)
- Mijoz: ism, telefon, manzil
- Har bir mahsulot: rasm + nom, model (SKU), rang, o‘lcham, soni, narx
- Jami, to‘lov turi, QR rasm + kod
- Inline tugmalar: Yangi → Yig‘ilmoqda → Tayyor → Kuryerga berildi → Yetkazildi + Bekor

Tugma bosilsa → Order.status yangilanadi → xabar `editMessage` bilan yangilanadi.  
Admin / QR skaner status o‘zgartirsa → Telegram ham yangilanadi.

## 6) Kod

| Fayl | Vazifa |
|------|--------|
| `src/lib/telegram-orders.ts` | send / sync / caption / keyboard |
| `src/app/api/telegram/webhook/route.ts` | callback_data `order:{id}:{status}` |
| `Order.telegramMessageId` / `telegramChatId` | edit uchun |
| `notifyDirector` | checkout + admin + scan + Click → Telegram |

Soft-fail: Telegram xatosi buyurtmani bekor qilmaydi.

## 7) Tekshiruv ro‘yxati

1. Token + chat ID saqlangan (Admin yoki Vercel)
2. Webhook `getWebhookInfo` da URL to‘g‘ri
3. Test tugma yoki yangi checkout → chatda xabar + rasmlar + tugmalar
4. Tugma → status saytda o‘zgaradi
5. Admin status → Telegram matn/tugma yangilanadi
