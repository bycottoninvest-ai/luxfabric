# LUXFABRIC — tez va ishonchli yetkazish strategiyasi

**Sana:** 2026-08-13  
**Domen:** luxfabricshop.uz · Ombor: Toshkent  
**Maqsad:** moda/apparel e-commerce uchun **tez** va **ishonchli** yetkazish — yolg‘on va’dasiz, O‘zbekiston realiyasiga mos.

> Qoida: «Butun UZ 2 soatda» deb va’da qilinmaydi. SLA faqat **shahar / zona + cutoff** bilan yoziladi.

---

## Sistema nima qiladi (ishlaydigan kod)

| Modul | Vazifa | Joy |
|-------|--------|-----|
| **Promise engine** | Region + usul + kuryer + cutoff 15:00 → `promisedBy` / `shipBy` saqlanadi | `src/lib/delivery-promise.ts`, `tashkent-time.ts` |
| **Carrier matrix** | Viloyat bo‘yicha tartib + «Tavsiya etiladi» (TAS: Yandex; viloyat/XOR: BTS/Fargo PVZ) | `src/lib/carrier-matrix.ts` |
| **Fulfillment pipeline** | `NEW→PAID→PICKING→PACKED→SHIPPED\|READY_PICKUP→DELIVERED→DONE` · har o‘tishda event | `src/lib/fulfillment.ts`, admin buyurtmalar |
| **PVZ-first checkout** | «Uyga» vs «Punktdan» · punkt majburiy PVZ da | `checkout/page.tsx` |
| **Ops** | Cutoff eslatma · «Bugun jo‘natilishi kerak» · SHIPPED da trek majburiy | `/admin/orders` |
| **Mijoz track** | `promisedBy`, hozirgi bosqich, keyingi qadam, kuryer link · **Live GPS yo‘q** | `/track/[orderNumber]` |

**World patternlar (moslashtirilgan):** Cainiao/JD — hub + cutoff + ship-by + expected-by; Pinduoduo — PVZ default; DHL Packstation / Zalando — Click&Collect + carrier matrix + aniq SLA bands, overpromise yo‘q.

**Ops intizom:** ish kunlari 15:00 gacha tasdiqlangan buyurtma — shu kun `shipBy`; trek bo‘lmasa `SHIPPED` yo‘q.

---

## 1. Nima uchun bu katta yutuq?

Fashion sotuvda mijoz **tezlikni** emas, balki **va’da + fakt** ni solishtiradi. Keçikish, trek yo‘qligi, COD chalkashligi — qaytarish va salbiy sharhga olib keladi.  
LUXFABRIC uchun g‘alaba: *«aytgan kunida keldi + trek + SMS/Telegram»*. Bu marketingdan ham kuchliroq.

---

## 2. Dunyo e-commerce modellari — LUXFABRICga mos xulosa

| Model | Mohiyati | Bizga nima beradi |
|-------|----------|-------------------|
| **Amazon regionalization** | Milliy bitta ombor o‘rniga mintaqaviy hublar — masofa qisqaradi | Uzoq muddat: Toshkent markaz + keyin 1–2 viloyat «forward stock» |
| **Same-day / SSD hubs** | Yuqori tezlikdagi SKU lar shahar yaqinida | Faqat **Toshkent** (va keyin Samarqand/Farg‘ona) — to‘liq katalog emas |
| **Dark store / micro-fulfillment** | Kichik ombor faqat online uchun | Hozir kerak emas; Toshkent omborini «dark» rejimida tartibga solish yetarli |
| **Click & collect** | Buyurtma → punktdan olib ketish | **PICKUP** + kuryer PVZ — UZ da eng ishonchli kanal |
| **3PL / partner last-mile** | O‘z flotingiz yo‘q — SLA bo‘yicha hamkor | Asosiy yo‘l: BTS / Fargo / Yandex |
| **Hub-and-spoke** | Markaz → viloyat punktlari | Hozirgi model: Toshkent ombor → milliy kuryer |
| **COD vs prepaid** | COD konversiyani oshiradi, lekin risk | Fashion uchun COD saqlanadi; prepaid/Click — chegirma yoki tezroq navbat |

**Asosiy dars:** tezlik = **inventar mijozga yaqin** + **last-mile hamkor** + **aniq cutoff**. Infrastruktura qurishdan oldin ops + va’da intizomi.

---

## 3. O‘zbekiston logistika realiyasi (2024–2026)

### 3.1 Bozor konteksti
- **Uzum** — o‘z fulfillment + 1500+ pickup punkt; «ertangi kun» kutishini ommalashtirdi.
- **UzPost** — 1600+ bo‘lim; Temu/Ozon bilan hamkorlik — qamrov keng, tezlik o‘rtacha.
- **Fargo** — e-commerce last-mile, COD, pickup/locker; Toshkentda tez, viloyatlarda next-day da’vo.
- **BTS Express** — milliy ekspress; rasmiy FAQ: ko‘p yo‘nalishlarda **1 ish kuni**, **Xorazm / Surxondaryo / Qoraqalpog‘iston ~2 kun** (Nukus/Urganch 48 soatgacha).
- **Yandex Delivery** — Toshkentda soatlik/ekspress; 2025 oxirida shaharlararo (avval Toshkent–Samarqand–Buxoro–Farg‘ona) punkt orqali.
- **DPD / Tezbor / EMS** — qo‘shimcha tanlov; fashion uchun asosiy emas, lekin checkoutda qolishi mumkin.

### 3.2 Fashion uchun nima ishlaydi
1. **PVZ / ofisdan olish** — uyga yetkazishdan ishonchliroq (mijoz ishda, telefon o‘chirilgan).
2. **COD** — hali konversiya uchun muhim; lekin qaytarish foizini o‘lchash kerak.
3. **Trek + Telegram** — UZ mijozlari bot/ilovani yaxshi qabul qiladi (BTS `@btsrobot` namunasi).
4. **Toshkent ekspress** — Yandex / shahar kuryer: soatlik yoki shu kun.
5. **Viloyat** — realistik **1–3 ish kuni** (ombordan jo‘natish + kuryer SLA).

### 3.3 Nima ishlamaydi
- Butun respublikaga «2 soat» yoki «har doim ertaga».
- Trek-kodsiz «yo‘lda» statusi.
- Cutoffsiz «bugun jo‘natamiz» (kechki buyurtma ertaga chiqadi).
- Barcha SKUlarni viloyatga oldindan tarqatish (moda o‘lchami/rang — overstock xavfi).

---

## 4. LUXFABRIC uchun tanlangan model

**Hybrid: Toshkent hub + partner last-mile + click&collect**

```
[Toshkent ombori] ──pack──► [BTS / Fargo / DPD …] ──► [PVZ yoki uy]
        │
        ├── Yandex (faqat Toshkent / qoplanadigan shahar)
        └── PICKUP (mijoz o‘zi ombordan)
```

| Zona | Asosiy kanal | Zaxira |
|------|--------------|--------|
| Toshkent shahar | Yandex (tez) yoki BTS/Fargo | Do‘kon o‘zi yuboradi |
| Toshkent viloyati | BTS / Fargo | UzPost |
| Yirik viloyat markazlari (SAM, FER, AND, NAM, BUH, …) | BTS yoki Fargo → PVZ | DPD |
| Uzoq zona (XOR, SUR, QQR) | BTS (2 kun band) / Fargo | UzPost (arzonroq, sekinroq) |
| Mijoz shaharda | Click & collect (PICKUP) | — |

**Shop-ships** (`SHOP_DELIVERY`): admin eng ishonchli kuryerni tanlaydi — yangi mijoz uchun yaxshi default.  
**Courier choice**: tajribali mijoz uchun (Urganchda BTS punkti yaqin bo‘lsa).

---

## 5. Realistik SLA jadvali (va’da qilish mumkin)

> **Hisoblash:** «ish kuni» = ombordan kuryerga topshirilgan kundan keyin.  
> **Cutoff (tavsiya):** ish kunlari **15:00** gacha tasdiqlangan + to‘langan/COD tasdiqlangan buyurtma — shu kun jo‘natiladi. 15:00 dan keyin — keyingi ish kuni.

| Manzil zonasi | Jo‘natish (ombor) | Yetkazish (kuryer) | Mijozga ko‘rsatiladigan matn |
|---------------|-------------------|--------------------|------------------------------|
| **Toshkent** — Yandex | Shu kun (cutoff ichida) | 1–4 soat | «Bugun yoki 1–4 soat ichida (cutoff 15:00)» |
| **Toshkent** — BTS/Fargo/PVZ | Shu kun | 0–1 ish kuni | «1 ish kuni ichida» |
| **Yaqin viloyatlar** (AND, BUH, FER, JIZ, NAM, NAV, QAS, SAM, SIR, TOS) | Shu / keyingi ish kuni | 1 ish kuni (ko‘pincha) | «1–2 ish kuni» |
| **Uzoq** (XOR, SUR, QQR) | Shu / keyingi ish kuni | 2 ish kuni tipik | «2–3 ish kuni» |
| **PICKUP** Toshkent ombor | — | Tayyor bo‘lgach | «Bugun / ertaga ombordan olishingiz mumkin» |
| **UzPost / EMS** | +1 | 2–5 ish kuni | «2–5 ish kuni (pochta)» — tez deb yozilmasin |

**Xorazm / Urganch misoli:** Toshkent ombordan BTS bilan realistik va’da — **2–3 ish kuni** (kuryer 48 soat + cutoff + dam olish kunlari). «Ertaga Urganchda» faqat alohida ekspress kelishuv bo‘lsa.

Bayram / ob-havo / yo‘l yopilishi — UI da «taxminiy», kafolat emas.

---

## 6. Amaliy reja (prioritet)

### A) Qisqa muddat — 1–2 hafta (kod + ops)

1. **Cutoff qoidasi** — admin va checkoutda yozma: 15:00.  
2. **Trek-kod majburiy** — kuryerga topshirilganda `courierTracking` bo‘sh qolmasin (CouriersPanel / skan oqimi).  
3. **SMS/Telegram status** — `notifyChannel` allaqachon bor; jo‘natildi + trek xabarini standartlashtirish.  
4. **Checkout ETA** — viloyat + kanal bo‘yicha «Taxminiy yetkazish: …» (`src/lib/delivery-eta.ts`).  
5. **Default tavsiya** — Toshkent → Yandex/BTS; XOR → BTS PVZ; shop-ships → BTS birinchi.  
6. **Qadoqlash checklist** — o‘lcham yorlig‘i, qaytarish qoidasi, posilka og‘irligi (moda: yengil, lekin shikastlanmasin).  
7. **Kunlik jo‘natish oynasi** — 1–2 marta (ertalab + 14:30) BTS/Fargo topshirish.

### B) O‘rta muddat — 1–2 oy

1. **BTS yoki Fargo bilan bizness-akkaunt** — shartnoma, COD hisob-kitob, pickup soati.  
2. **PVZ-first UX** — «Uyga» vs «Punktdan» aniq tanlov; punkt tanlashni kuchaytirish.  
3. **Qaytarish oqimi** — fashion uchun 3–7 kun ichida PVZ orqali qaytarish yo‘riqnomasi.  
4. **Metrikalar dashboard** — o‘rtacha yetkazish kuni, kechikish %, COD rad %, treksiz buyurtma %.  
5. **Yandex B2B** — faqat Toshkent buyurtmalari uchun API yoki oddiy qo‘lda chaqirish jarayoni.  
6. **Hot SKU** — eng ko‘p sotiladigan 10–20 SKU ni omborda «tez javon»da saqlash (dark-store mantiq, alohida bino yo‘q).

### C) Uzoq muddat — ombor / hub

1. **Toshkent hubni mustahkamlash** — markaziy ombor + aniq joylashuv (skan, zona).  
2. **Forward stock (ixtiyoriy)** — faqat isbotlangan talab bo‘lsa: masalan Samarqand yoki Farg‘ona punktda 5–15 ta bestseller (o‘lcham riskini hisobga olib).  
3. **3PL fulfillment** — buyurtma hajmi oshsa Fargo/BTS omboriga tovar joylash (o‘z omborni yopmasdan).  
4. **Marketplace sinxron** — agar Uzum/Yandex Marketga chiqilsa, stock bir manbadan.

---

## 7. Aniq tavsiyalar (qisqa)

1. **Model:** Toshkent hub + hybrid shop-ships / mijoz kuryer tanlashi + pickup.  
2. **«1–2 kun» va’dasi:** faqat yaqin viloyatlar + cutoff ichida; Xorazm uchun **2–3 kun**.  
3. **Toshkent «bugun»:** faqat Yandex (yoki shahar ekspress) + 15:00 cutoff.  
4. **Trek-kod:** jo‘natish = trek; trek bo‘lmasa status «yo‘lda» bo‘lmasin.  
5. **Bildirishnoma:** SMS yoki Telegram — trek + taxminiy kun.  
6. **Stock:** 100% Toshkentda; viloyatga oldindan tarqatish — keyinroq va faqat bestseller.  
7. **COD:** saqlang, lekin prepaid (Click) uchun kichik rag‘bat (tezroq yoki bepul PVZ).  
8. **Ishonch:** kechiksa — proaktiv xabar; yolg‘on «tez orada» o‘rniga yangi taxminiy sana.

---

## 8. Partner matritsasi (fashion)

| Partner | Qachon birinchi tanlov | COD | Izoh |
|---------|------------------------|-----|------|
| **BTS** | Viloyatlar, Urganch/Xorazm | Ha | Eng aniq milliy SLA (1–2 kun); ofis tarmog‘i |
| **Fargo** | PVZ/locker qulayligi | Ha | E-com uchun mos; hub/sorting bor |
| **Yandex** | Toshkent tez yetkazish | Ha (shartnoma) | Soatlik; milliy PVZ emas |
| **UzPost** | Arzon / uzoq qishloq | Ha | Sekinroq — «tez» deb yozilmasin |
| **DPD** | Biznes / og‘irroq / xalqaro | Ha | Zaxira |
| **Tezbor** | Qo‘shimcha last-mile | Tekshirish | Katalogda qoladi |
| **EMS** | Xalqaro / maxsus | Ha | Ichki moda uchun asosiy emas |

---

## 9. Operatsion SOP (qisqa)

1. Buyurtma keldi → ombor zaxirasi tekshirildi (Toshkent).  
2. Cutoff ichidami? → bugun pack / yo‘q → ertaga.  
3. Kuryer tanlandi → yorliq + trek.  
4. Mijozga: «Jo‘natildi · trek · taxminiy yetkazish».  
5. Tracking timeline yangilandi (`PACKED` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED`).  
6. Yetkazilmasa / rad: COD qayta urinish yoki PVZga qoldirish — 2–3 kun ichida yopish.

---

## 10. Muvaffaqiyat metrikasi (KPI)

| KPI | Maqsad (1–2 oy) |
|-----|-----------------|
| Trek-kod foizi (jo‘natilganlar) | ≥ 98% |
| Va’da ichida yetkazish | ≥ 90% |
| Toshkent cutoff ichida shu kun jo‘natish | ≥ 85% |
| COD rad / qaytarish | o‘lchash + pasaytirish |
| Mijoz «qayerda buyurtmam?» savollari | kamayishi |

---

## 11. Kod / hujjat bog‘lanishi

| Narsa | Joy |
|-------|-----|
| Kuryer katalogi | `src/lib/uz-couriers.ts` |
| Promise / ETA | `src/lib/delivery-promise.ts`, `delivery-eta.ts` |
| Carrier matrix | `src/lib/carrier-matrix.ts` |
| Fulfillment | `src/lib/fulfillment.ts` |
| Checkout | `src/app/checkout/page.tsx` |
| Tracking timeline | `src/lib/order-tracking.ts`, `/track/[orderNumber]` |
| Admin pipeline | `src/app/admin/orders/page.tsx` |
| Holat | `docs/HOLAT-SAQLANGAN.md` |

---

## 12. Eng muhim 7 yo‘l (xulosa)

1. Toshkent hubni intizomli ishlatish — cutoff 15:00.  
2. Viloyatda BTS/Fargo + **PVZ-first**.  
3. Toshkentda Yandex bilan haqiqiy «bugun».  
4. Trek + SMS/Telegram — majburiy.  
5. SLA jadvali bo‘yicha va’da (Xorazm = 2–3 kun).  
6. Metrika: kechikish va trek foizi.  
7. Hub/forward stock — faqat hajm oshganda.

*Manbalar (tadqiqot): Amazon regionalization / same-day node strategiyasi; BTS FAQ (24–48 soat); Fargo hub/pickup; UzPost–Temu/Ozon; Yandex Go intercity (2025); Uzum pickup tarmog‘i; mahalliy e-com logistika sharhlari 2024–2026.*
