-- Meta Commerce catalog product id (optional; Shopping tags require approved Instagram Shop + Facebook Login)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "metaCatalogProductId" TEXT;
