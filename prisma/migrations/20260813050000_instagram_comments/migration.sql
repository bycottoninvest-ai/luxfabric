-- Instagram Reel comments (webhook + Graph sync) for admin panel
CREATE TABLE IF NOT EXISTS "InstagramComment" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "mediaId" TEXT,
    "reelId" TEXT,
    "username" TEXT NOT NULL DEFAULT '',
    "fromId" TEXT,
    "text" TEXT NOT NULL,
    "parentId" TEXT,
    "postedAt" TIMESTAMP(3),
    "ourReplyText" TEXT,
    "ourReplyId" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InstagramComment_commentId_key" ON "InstagramComment"("commentId");
CREATE INDEX IF NOT EXISTS "InstagramComment_mediaId_idx" ON "InstagramComment"("mediaId");
CREATE INDEX IF NOT EXISTS "InstagramComment_reelId_postedAt_idx" ON "InstagramComment"("reelId", "postedAt");

DO $$ BEGIN
  ALTER TABLE "InstagramComment"
    ADD CONSTRAINT "InstagramComment_reelId_fkey"
    FOREIGN KEY ("reelId") REFERENCES "InstagramReel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
