# LUXFABRIC — vizual holat va ertangi reja

**Sana:** 2026-08-11  
**Rasmlar (shu papkada):**
- `luxfabric-tizim-sxemasi.png` — to‘liq tizim qanday ishlaydi
- `luxfabric-ertaga-domen-rejasi.png` — ertaga domen bilan qilinadigan ishlar

Admin ichida ham ochiladi: loyiha ildizidagi `docs/` papkasi.

---

## Domen holati (2026-08-11)

- **Domen:** `luxfabricshop.uz` — foydalanuvchi tayyor deb bildirdi
- **DB sozlama:** `app_domain` = `https://luxfabricshop.uz`
- **IG username:** `luxfabric.shop` (instagram.com/luxfabric.shop)
- **Tekshiruv:** DNS hali ochilmasa — hostingda A-record + SSL (HTTPS) ni kutish/sozlash kerak
- **Keyin:** saytni shu domenga deploy → Meta webhook + «Instagramga joylash»

---

## To‘liq tizim (qisqa)

```text
ADMIN                          SERVER                         TASHQI
─────                          ──────                         ──────
Kirim/Chiqim/QR  ──►  Next.js + Prisma (SQLite)
Mahsulotlar      ──►  uploads/ + ffmpeg mux
Instagram panel:
  Reels   ──saqlash──►  /instagram (sayt Reels)
  Stories ──saqlash──►  /instagram/story + /i/slug
  Meta/DM ──token────►  Graph API
                         │
                         ├── Instagramga joylash (Reel/Story)
                         └── DM webhook avtojavob
                                      │
                                      ▼
                                 MIJOZ / IG
```

---

## Ertaga (domen olgach) — checklist

1. **Domen + HTTPS** (masalan `https://luxfabricshop.uz` yoki vaqtincha ngrok)
2. Admin → Instagram → **Meta/DM** → `app_domain` = shu HTTPS
3. Meta Developer:
   - Instagram Professional + Facebook Page
   - Ruxsatlar: `instagram_content_publish`, messaging
   - Page Access Token
4. Webhook: `https://SIZNING_DOMEN/api/instagram` + verify token
5. Panelda **Ulanishni tekshirish** → **Instagramni yoqish**
6. Reel/Story yaratib **Instagramga joylash** ni sinash
7. Telefondan `/i/slug` / Sotib olish tekshiruvi

> Meta **localhost** dagi video/rasmni o‘qimaydi — shuning uchun domen shart.

---

## Hozir nima tayyor (kod)

| Modul | Holat |
|--------|--------|
| Sayt Reels + musiqa + mux | ✓ |
| Stories panel + preview | ✓ |
| AI matn (shablon / ChatGPT) | ✓ |
| Meta publish tugmalari | ✓ (domen+token kerak) |
| DM webhook | ✓ (domen+token kerak) |
| OAuth (avto login) | Keyinroq (ixtiyoriy) |

**Ertaga eslatma (foydalanuvchi):** Instagram Professional — **@luxfabric.shop**. Meta/DM panelda `instagram_username` = `luxfabric.shop`; Page bilan bog‘lab token olinadi.
