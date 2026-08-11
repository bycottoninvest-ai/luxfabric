-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fabric" TEXT NOT NULL,
    "care" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'WOMEN',
    "price" INTEGER NOT NULL,
    "oldPrice" INTEGER,
    "rating" REAL NOT NULL DEFAULT 4.8,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("care", "categoryId", "createdAt", "description", "fabric", "featured", "id", "name", "oldPrice", "price", "rating", "slug", "soldCount", "status", "updatedAt") SELECT "care", "categoryId", "createdAt", "description", "fabric", "featured", "id", "name", "oldPrice", "price", "rating", "slug", "soldCount", "status", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
