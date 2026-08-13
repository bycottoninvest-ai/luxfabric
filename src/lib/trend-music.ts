import { readFile } from "fs/promises";
import path from "path";

export type TrendTrack = {
  id: string;
  title: string;
  artist: string;
  mood: string;
  genre: string;
  badge: string;
  bpm?: number;
  durationSec?: number;
  fileUrl: string;
  license: string;
  rank?: number;
  source?: string;
};

export type TrendCatalog = {
  version: number;
  license: string;
  disclaimerUz: string;
  source: string;
  tracks: TrendTrack[];
  metaNoteUz?: string;
};

const DEFAULT_DISCLAIMER =
  "Instagram rasmiy xitlarini to‘g‘ridan-to‘g‘ri olish taqiqlangan; shu yerda litsenziyalangan trend uslubidagi treklar.";

const META_NOTE =
  "Meta Instagram Audio API (2026) mavjud, lekin faqat Facebook Login + uchinchi tomonga ruxsat berilgan Sound Collection uchun; to‘liq IG xit katalogi / MP3 yuklab olish ochiq emas. Sayt Reels mux uchun RF treklar ishlatiladi.";

let cached: TrendCatalog | null = null;

export async function loadTrendCatalog(): Promise<TrendCatalog> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "public", "music", "trends", "catalog.json");
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as TrendCatalog;
    cached = {
      ...data,
      disclaimerUz: data.disclaimerUz || DEFAULT_DISCLAIMER,
      metaNoteUz: META_NOTE,
      tracks: (data.tracks || []).map((t, i) => ({
        ...t,
        badge: t.badge || "Instagram Reels da mashhur",
        license: t.license || "royalty-free",
        rank: t.rank ?? i + 1,
        source: t.source || data.source || "local-curated",
      })),
    };
    return cached;
  } catch {
    return {
      version: 0,
      license: "fallback",
      disclaimerUz: DEFAULT_DISCLAIMER,
      metaNoteUz: META_NOTE,
      source: "fallback-empty",
      tracks: [],
    };
  }
}
