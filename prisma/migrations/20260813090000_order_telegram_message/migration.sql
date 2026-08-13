-- Telegram buyurtma xabari (editMessage uchun)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "telegramMessageId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
