# Click.uz — Salayev uchun qisqa yo‘riqnoma

**Maqsad:** LUXFABRIC uchun Click merchant kalitlarini olish va saytga ulash.  
**Sirlar:** Merchant ID / Service ID / Secret ni chatga yozmang — faqat Admin yoki Vercel Sensitive.

Kabinet: [https://mc.click.uz/](https://mc.click.uz/) · (ba’zan) [https://business.click.uz/](https://business.click.uz/)  
Docs: [https://docs.click.uz](https://docs.click.uz)

---

## 1) Ro‘yxat / kirish (mc.click.uz)

1. Brauzerda **https://mc.click.uz/** ni oching.
2. Login ekranida ko‘rinadi: **номер/логин** + **пароль** + **Войти**.
3. Agar akkaunt yo‘q bo‘lsa — Click biznes/merchant ro‘yxatidan o‘ting (sahifadagi ro‘yxat yoki «Установка/Восстановление пароля» / qo‘llab-quvvatlash orqali).
4. **Parol / OTP** ni siz kiritasiz — AI yubormaydi.
5. Kirgach, agar «доступ ограничен» chiqsa: **+998 71 231 08 83** ga qo‘ng‘iroq qiling.

---

## 2) Hujjatlar va servis

1. Kabinetda **servis / do‘kon** yaratish yoki mavjudini ochish.
2. Click so‘ragan **yuridik / STIR / bank** hujjatlarini yuklang (ularning formasi bo‘yicha).
3. Holat **faol / tasdiqlangan** bo‘lishini kuting (ba’zan 1–3 ish kuni).

---

## 3) Kalitlarni oling

Kabinetdan (Servis / Merchant / API sozlamalari) quyidagilarni ko‘chirib oling:

| Nom | Admin maydoni |
|-----|----------------|
| Merchant ID | `click_merchant_id` |
| Service ID | `click_service_id` |
| Secret Key | `click_secret_key` |

---

## 4) Callback URL — Click kabinetga joylang

Aniq shu ikkita URL ni Prepare / Complete maydonlariga joylashtiring:

```text
https://www.luxfabricshop.uz/api/click/prepare
https://www.luxfabricshop.uz/api/click/complete
```

| Maydon | URL |
|--------|-----|
| **Prepare** | `https://www.luxfabricshop.uz/api/click/prepare` |
| **Complete** | `https://www.luxfabricshop.uz/api/click/complete` |

Saqlang.

---

## 5) Kalitlarni LUXFABRIC Admin ga qo‘ying

1. Ochilgan: **https://www.luxfabricshop.uz/admin/settings** (yoki `/admin/login` → Sozlamalar).
2. Bo‘lim: **To‘lov — Click + Payme**.
3. Maydonlar:
   - **Click Merchant ID** → `click_merchant_id`
   - **Click Service ID** → `click_service_id`
   - **Click Secret Key** → `click_secret_key` (password)
4. **Saqlash**.
5. (Ixtiyoriy) Vercel → Env Sensitive: `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY` — Admin o‘rniga yoki qo‘shimcha.

---

## 6) Tekshiruv

1. Ochilgan: **https://www.luxfabricshop.uz/api/payments/status**
2. Kutiladi: `"click": { "configured": true, ... }`
3. Keyin checkout → **Click** → kichik test to‘lov → buyurtma `PAID`.

---

## Hozir Salayev qiladi (1–2–3)

1. **mc.click.uz** da kiring / ro‘yxatdan o‘ting (parol+OTP o‘zingiz).
2. Kabinetga **Prepare + Complete** URL larini qo‘ying (yuqoridagi 2 ta).
3. **Merchant ID + Service ID + Secret** ni Admin → Sozlamalar → Click maydonlariga yozib saqlang.

Batafsil: [`docs/TOLASH-ULASH.md`](./TOLASH-ULASH.md).
