# LUXFABRIC Sales OS

Instagramdan yetkazib berishgacha — premium tekstil savdo tizimi (MVP).

## Stack

- Next.js (App Router) + PWA
- Prisma + SQLite (lokal) — prod uchun PostgreSQL ga oson o‘tadi
- Zustand (savat)
- Click / Payme / Card / COD (checkout)
- Telegram API stub
- QR API
- Admin panel + 12 ombor WMS

## Ishga tushirish

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Ochiladi: [http://localhost:3000](http://localhost:3000)

- Do‘kon: `/`
- Admin: `/admin`
- Demo tracking: `/track/LF-080963`

## Keyingi bosqichlar

1. Haqiqiy Instagram Graph API + AI DM
2. Click/Payme production kalitlari
3. PostgreSQL + Redis
4. Courier GPS API
5. Logo faylini `public/brand/` ga joylash
