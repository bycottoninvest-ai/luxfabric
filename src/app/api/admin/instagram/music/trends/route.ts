import { NextResponse } from "next/server";
import { loadTrendCatalog } from "@/lib/trend-music";

/**
 * Trend / Xit uslubidagi RF katalog.
 * Meta IG hit MP3 scrape qilinmaydi (copyright).
 * Optional: FREE_MUSIC_ARCHIVE_API_KEY yoki boshqa RF provider — hozircha static fallback.
 */
export async function GET() {
  const catalog = await loadTrendCatalog();

  // Optional env hook (no provider wired without key — static catalog always works).
  const fmaKey = process.env.FREE_MUSIC_ARCHIVE_API_KEY?.trim();
  const externalHint = fmaKey
    ? "FREE_MUSIC_ARCHIVE_API_KEY topildi; katalog hali curated local (FMA API deprecated bo‘lishi mumkin)."
    : null;

  return NextResponse.json({
    ok: true,
    ...catalog,
    externalHint,
    howToPickUz:
      "Xit/Trend dan trekni tinglang → «Yaxshi — Reelga» yoki «Kutubxonaga + Reelga». Yoki Kompyuter / URL dan (faqat to‘g‘ridan-to‘g‘ri audio). YouTube/IG/Spotify scrape yo‘q.",
  });
}
