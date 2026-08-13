import { prisma } from "@/lib/prisma";
import { removeStoredUpload } from "@/lib/storage";

export type DeleteReelResult = {
  ok: true;
  alreadyGone?: boolean;
  storageErrors?: string[];
  igNote?: string;
};

/**
 * Reelni DB + video/cover fayldan o‘chiradi.
 * musicId FK: Reel o‘chadi, musiqa qoladi (SetNull).
 * InstagramComment: avval tozalash; muvaffaqiyatsiz bo‘lsa ham Reel delete (SetNull).
 */
export async function deleteInstagramReel(id: string): Promise<DeleteReelResult> {
  const reel = await prisma.instagramReel.findUnique({ where: { id } });
  if (!reel) {
    return { ok: true, alreadyGone: true };
  }

  const videoUrl = reel.videoUrl;
  const coverUrl = reel.coverUrl;
  const hadMeta = Boolean(reel.metaMediaId);

  try {
    await prisma.instagramComment.deleteMany({ where: { reelId: id } });
  } catch {
    try {
      await prisma.instagramComment.updateMany({
        where: { reelId: id },
        data: { reelId: null },
      });
    } catch {
      /* izoh jadvali yo‘q / sync kechikishi — Reel delete davom etadi */
    }
  }

  await prisma.instagramReel.delete({ where: { id } });

  const storageErrors: string[] = [];
  for (const url of [videoUrl, coverUrl].filter(Boolean) as string[]) {
    try {
      await removeStoredUpload(url);
    } catch (e) {
      storageErrors.push(e instanceof Error ? e.message : "Fayl o‘chirilmadi");
    }
  }

  return {
    ok: true,
    storageErrors: storageErrors.length ? storageErrors : undefined,
    igNote: hadMeta ? "Saytdan o‘chirildi; IG da qo‘lda o‘chiring" : undefined,
  };
}
