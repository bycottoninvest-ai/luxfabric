# LUXFABRIC — saqlangan holat (2026-08-11)

**Maqsad:** ertaga / limit tugaganda chatni qayta ochib, shu fayldan davom etish.

**Vizual:** `docs/VIZUAL-TIZIM.md` + rasmlar  
**Real (production) reja:** `docs/PRODUCTION-REJA.md` — test emas, to‘liq ishlashi kerak

**Oldingi chat:** [Instagram Reels musiqa](d78b58f1-3fb6-49e9-b3d6-7efb219cdec9)

**Loyiha:** `C:\Users\1\luxfabric`  
**Lokal:** `http://localhost:3000`  
**Admin Instagram:** `/admin/instagram`  
**Do‘kon Reels:** `/instagram`

---

## Loyiha nima?

LUXFABRIC Sales OS — Next.js (App Router) + Tailwind + Prisma (SQLite) admin + do‘kon.

- Kirim / Chiqim / Buyurtma skan (QR)
- Mahsulotlar, ombor, yetkazish
- Instagram: Reels (sayt ichida) + Stories (hikoya) + Meta/DM sozlamalari

> Bu Next.js versiyasi odatdagidan farq qilishi mumkin — kod yozishdan oldin `node_modules/next/dist/docs/` va `AGENTS.md` ga qarang.

---

## Bugun tugagan ishlar (Instagram / Reels)

### 0) Reels vs Stories tanlash
- Admin `/admin/instagram` — yuqorida **Reels | Stories | Meta/DM** tanlov.
- Stories: rasm/video + mahsulot havolasi, «Story havolasi nusxa», preview `/instagram/story/[id]`.
- Model: `InstagramStory`; API: `/api/admin/instagram/stories`; UI: `StoriesManager` + `InstagramWorkspace`.

### 0b) Meta Graph — haqiqiy Instagramga joylash
- Lib: `src/lib/instagram-graph.ts` (Reels/Stories publish, IG user resolve, DM)
- API: `POST /api/admin/instagram/publish` `{ type: "reel"|"story", id }` · `GET ?action=test`
- UI: Reels/Stories ro‘yxatida **«Instagramga joylash»**
- Sozlamalar: Page token, IG User ID, `app_domain` (HTTPS public — localhost Meta o‘qimaydi)
- Webhook DM: `/api/instagram` (verify + messaging + changes)
- Schema: `metaMediaId`, `metaPublishedAt` (Reel/Story)

### 1) Musiqa kutubxonasi
- MP3 tanlanganda **darhol** DB kutubxonaga yoziladi (ikkita bosqich kerak emas).
- Fayl yuklangan, lekin «Hali musiqa yo‘q» — demak eski oqim: faqat fayl, bazaga yozilmagan edi. Tuzatilgan.

### 2) AI matn (ChatGPT)
- API: `src/app/api/admin/ai/caption/route.ts`
- Kalit bo‘lmasa — **shablon** matn ishlaydi.
- To‘liq ChatGPT: `.env` ga `OPENAI_API_KEY=sk-...` qo‘yib **`npm run dev` ni qayta ishga tushirish**.
- Haqiqiy kalitni commit qilmang.

### 3) Avtomatik musiqa tanlash
- Mahsulot / «AI matn» da kutubxonadan trek tanlanadi (nomga yaqin, aks holda eng yangisi).
- «Musiqani avto tanlash» tugmasi bor.

### 4) Video + musiqa birlashtirish (mux)
- Reel **saqlanganda** ffmpeg orqali video + musiqa → bitta MP4 (`*-mux.mp4`).
- Paket: `ffmpeg-static`
- Lib: `src/lib/mux-reel-audio.ts`
- API: `src/app/api/admin/instagram/reels` (POST da mux; PATCH `remux: true` eski Reel uchun)
- Schema: `InstagramReel.audioEmbedded`
- Player: `src/components/ReelsFeed.tsx` — mux bo‘lsa video ovozi; aks holda alohida `<audio>`
- Adminda eski Reel: **«Musiqani birlashtirish»**

### 5) Do‘kon Reels UX
- `/instagram` — qora Reels shell, Sotib olish
- Deep link: `/instagram?reel=ID`, `/i/[slug]`

---

## Muhim fayllar

| Vazifa | Fayl |
|--------|------|
| Admin Reels UI | `src/components/admin/ReelsManager.tsx` |
| Admin sahifa | `src/app/admin/instagram/page.tsx` |
| Do‘kon feed | `src/components/ReelsFeed.tsx`, `src/app/instagram/page.tsx` |
| Mux | `src/lib/mux-reel-audio.ts` |
| Reels API | `src/app/api/admin/instagram/reels/route.ts` |
| Music API | `src/app/api/admin/instagram/music/route.ts` |
| Upload | `src/app/api/admin/upload-media/route.ts` |
| AI caption | `src/app/api/admin/ai/caption/route.ts` |
| Stories UI | `src/components/admin/StoriesManager.tsx`, `InstagramWorkspace.tsx` |
| Stories API | `src/app/api/admin/instagram/stories/route.ts` |
| Story preview | `src/app/instagram/story/[id]/page.tsx` |
| Prisma | `prisma/schema.prisma` (`InstagramMusic`, `InstagramReel`, `InstagramStory`) |
| Env namunasi | `.env.example` (`OPENAI_API_KEY`, `OPENAI_MODEL`) |

---

## Qanday ishlatish (qisqa)

1. Admin → Instagram  
2. **Musiqa kutubxonasi** → MP3 tanlash (avto qo‘shiladi)  
3. **Yangi Reel** → video yuklash → mahsulot tanlash (matn + musiqa)  
4. **Reelni saqlash (video + musiqa)** — bir necha soniya mux  
5. Tekshirish: `/instagram` (ovoz tugmasi)

Agar Prisma `EPERM` / `audioEmbedded` xatosi: `npm run dev` ni **to‘xtating** → `npx prisma generate` → yana `npm run dev`.

---

## Hali qilinmagan / keyingi qadamlar (ixtiyoriy)

- [ ] Haqiqiy `OPENAI_API_KEY` qo‘yish (foydalanuvchi)
- [ ] Meta orqali Instagram akkauntiga to‘g‘ridan-to‘g‘ri Reel post (hozir asosan sayt ichidagi Reels)
- [ ] Eski (mux qilinmagan) Reellarni ro‘yxatdan «Musiqani birlashtirish» bilan yangilash
- [ ] Kerak bo‘lsa: Kirim/Chiqim/QR bo‘yicha alohida qo'shimcha polish

---

## Texnik eslatmalar

- Javoblar foydalanuvchiga **o‘zbek** tilida.
- Commit / push — faqat foydalanuvchi so‘raganda.
- Sirlar (`.env` kalitlar) commit qilinmasin.
- Windows: `ffmpeg-static` → `node_modules/ffmpeg-static/ffmpeg.exe` (mux test muvaffaqiyatli o‘tgan).

---

## Ertaga agentga qisqa buyruq (nusxa)

```
docs/HOLAT-SAQLANGAN.md ni o‘qi va shu yerdan davom et.
LUXFABRIC Instagram Reels: musiqa kutubxona, AI matn, ffmpeg mux.
Kerak: …
```
