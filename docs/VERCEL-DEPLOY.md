# Vercel akkaunt + real deploy

## Akkaunt ochish (hozir)
1. https://vercel.com oching
2. **Sign Up** → Google yoki GitHub
3. Emailni tasdiqlang
4. Dashboard ochiladi — tayyor

Rasm: `docs/` ichida `luxfabric-vercel-qadamlar.png` (agar nusxa qilingan bo‘lsa)

## Muhim (real tizim)

Loyiha hozir **SQLite** (`dev.db`) + **local uploads** ishlatadi.

**Vercel** serverless — SQLite va yuklangan video/rasm **barqaror saqlanmaydi**.
Shuning uchun “real to‘liq” uchun 2 yo‘l:

### Yo‘l A — Vercel (tavsiya, cloud)
1. Vercel akkaunt
2. **Postgres** (Neon / Prisma Postgres — bepul boshlash)
3. Fayllar uchun **Blob/S3** (video, musiqa)
4. Kodni moslash + deploy
5. Domen `luxfabricshop.uz` ni Vercelga bog‘lash

### Yo‘l B — VPS (soddaroq migratsiya)
1. Node.js VPS (sayt.uz VPS yoki boshqa)
2. SQLite + uploads shu serverda qoladi
3. nginx + HTTPS
4. Domen DNS → VPS IP

## Hozir qiling
Faqat Vercel akkaunt oching (Sign Up).  
Keyin qaysi yo‘lni tanlashimizni yozing: **A** yoki **B**.
