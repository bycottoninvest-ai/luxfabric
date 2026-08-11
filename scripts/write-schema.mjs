import { writeFileSync } from "fs";

const schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Category {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  products  Product[]
  createdAt DateTime  @default(now())
}

model Product {
  id          String           @id @default(cuid())
  name        String
  slug        String           @unique
  description String
  fabric      String
  care        String
  price       Int
  oldPrice    Int?
  rating      Float            @default(4.8)
  soldCount   Int              @default(0)
  status      String           @default("ACTIVE")
  featured    Boolean          @default(false)
  categoryId  String
  category    Category         @relation(fields: [categoryId], references: [id])
  images      ProductImage[]
  variants    ProductVariant[]
  orderItems  OrderItem[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model ProductImage {
  id        String  @id @default(cuid())
  url       String
  alt       String?
  sortOrder Int     @default(0)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductVariant {
  id         String           @id @default(cuid())
  sku        String           @unique
  color      String
  colorHex   String
  size       String
  barcode    String           @unique
  productId  String
  product    Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  stocks     WarehouseStock[]
  orderItems OrderItem[]
}

model Region {
  id         String      @id @default(cuid())
  code       String      @unique
  name       String
  nameUz     String
  sortOrder  Int         @default(0)
  warehouses Warehouse[]
}

model Warehouse {
  id        String           @id @default(cuid())
  name      String
  city      String
  address   String
  phone     String?
  lat       Float
  lng       Float
  isCentral Boolean          @default(false)
  isActive  Boolean          @default(true)
  regionId  String?
  region    Region?          @relation(fields: [regionId], references: [id])
  stocks    WarehouseStock[]
  orders    Order[]
}

model WarehouseStock {
  id          String         @id @default(cuid())
  quantity    Int            @default(0)
  warehouseId String
  warehouse   Warehouse      @relation(fields: [warehouseId], references: [id])
  variantId   String
  variant     ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([warehouseId, variantId])
}

model Customer {
  id        String   @id @default(cuid())
  name      String?
  phone     String   @unique
  city      String?
  address   String?
  orders    Order[]
  createdAt DateTime @default(now())
}

model Order {
  id            String          @id @default(cuid())
  orderNumber   String          @unique
  status        String          @default("NEW")
  paymentMethod String
  paymentStatus String          @default("PENDING")
  subtotal      Int
  deliveryFee   Int             @default(0)
  total         Int
  customerName  String
  customerPhone String
  city          String
  address       String
  note          String?
  source        String          @default("STORE")
  customerId    String?
  customer      Customer?       @relation(fields: [customerId], references: [id])
  warehouseId   String?
  warehouse     Warehouse?      @relation(fields: [warehouseId], references: [id])
  items         OrderItem[]
  events        TrackingEvent[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model OrderItem {
  id        String         @id @default(cuid())
  quantity  Int
  price     Int
  orderId   String
  order     Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product        @relation(fields: [productId], references: [id])
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
}

model TrackingEvent {
  id        String   @id @default(cuid())
  status    String
  title     String
  note      String?
  lat       Float?
  lng       Float?
  createdAt DateTime @default(now())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         String   @default("ADMIN")
  createdAt    DateTime @default(now())
}

model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
`;

writeFileSync("prisma/schema.prisma", schema);
console.log("schema written");
