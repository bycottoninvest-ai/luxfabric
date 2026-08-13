/**
 * Original royalty-free trend-style beds (LUXFABRIC).
 * No third-party scraping — generated with ffmpeg lavfi.
 */
import { spawn } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "music", "trends");
mkdirSync(outDir, { recursive: true });

/** @type {{ id: string; title: string; artist: string; mood: string; genre: string; badge: string; file: string; bpm: number; durationSec: number; freq: number; beatHz: number; bright: number }[]} */
const tracks = [
  { id: "trend-velvet-pulse", title: "Velvet Pulse", artist: "LUXFABRIC RF", mood: "Confident", genre: "Trap vibe", badge: "Instagram Reels da mashhur", file: "velvet-pulse.mp3", bpm: 140, durationSec: 45, freq: 110, beatHz: 2.33, bright: 440 },
  { id: "trend-night-runway", title: "Night Runway", artist: "LUXFABRIC RF", mood: "Glamour", genre: "Electronic", badge: "Instagram Reels da mashhur", file: "night-runway.mp3", bpm: 118, durationSec: 45, freq: 98, beatHz: 1.97, bright: 392 },
  { id: "trend-soft-drip", title: "Soft Drip", artist: "LUXFABRIC RF", mood: "Chill", genre: "Lo-fi", badge: "Instagram Reels da mashhur", file: "soft-drip.mp3", bpm: 85, durationSec: 50, freq: 130, beatHz: 1.42, bright: 260 },
  { id: "trend-gold-hour", title: "Gold Hour", artist: "LUXFABRIC RF", mood: "Warm", genre: "Pop vibe", badge: "Instagram Reels da mashhur", file: "gold-hour.mp3", bpm: 105, durationSec: 45, freq: 147, beatHz: 1.75, bright: 294 },
  { id: "trend-city-mirror", title: "City Mirror", artist: "LUXFABRIC RF", mood: "Urban", genre: "Hip-hop vibe", badge: "Instagram Reels da mashhur", file: "city-mirror.mp3", bpm: 92, durationSec: 48, freq: 82, beatHz: 1.53, bright: 246 },
  { id: "trend-silk-motion", title: "Silk Motion", artist: "LUXFABRIC RF", mood: "Elegant", genre: "Chillwave", badge: "Instagram Reels da mashhur", file: "silk-motion.mp3", bpm: 100, durationSec: 50, freq: 164, beatHz: 1.67, bright: 328 },
  { id: "trend-flash-drop", title: "Flash Drop", artist: "LUXFABRIC RF", mood: "Hype", genre: "EDM vibe", badge: "Instagram Reels da mashhur", file: "flash-drop.mp3", bpm: 128, durationSec: 40, freq: 123, beatHz: 2.13, bright: 492 },
  { id: "trend-cotton-haze", title: "Cotton Haze", artist: "LUXFABRIC RF", mood: "Dreamy", genre: "Ambient", badge: "Instagram Reels da mashhur", file: "cotton-haze.mp3", bpm: 70, durationSec: 55, freq: 175, beatHz: 1.17, bright: 220 },
  { id: "trend-street-gloss", title: "Street Gloss", artist: "LUXFABRIC RF", mood: "Bold", genre: "Trap vibe", badge: "Instagram Reels da mashhur", file: "street-gloss.mp3", bpm: 145, durationSec: 42, freq: 104, beatHz: 2.42, bright: 415 },
  { id: "trend-pastel-beat", title: "Pastel Beat", artist: "LUXFABRIC RF", mood: "Playful", genre: "Pop vibe", badge: "Instagram Reels da mashhur", file: "pastel-beat.mp3", bpm: 112, durationSec: 45, freq: 156, beatHz: 1.87, bright: 312 },
  { id: "trend-luxe-tempo", title: "Luxe Tempo", artist: "LUXFABRIC RF", mood: "Premium", genre: "House vibe", badge: "Instagram Reels da mashhur", file: "luxe-tempo.mp3", bpm: 122, durationSec: 48, freq: 116, beatHz: 2.03, bright: 348 },
  { id: "trend-fade-look", title: "Fade Look", artist: "LUXFABRIC RF", mood: "Moody", genre: "R&B vibe", badge: "Instagram Reels da mashhur", file: "fade-look.mp3", bpm: 88, durationSec: 50, freq: 138, beatHz: 1.47, bright: 277 },
  { id: "trend-neon-cut", title: "Neon Cut", artist: "LUXFABRIC RF", mood: "Sharp", genre: "Synthwave", badge: "Instagram Reels da mashhur", file: "neon-cut.mp3", bpm: 108, durationSec: 45, freq: 185, beatHz: 1.8, bright: 370 },
  { id: "trend-atelier", title: "Atelier", artist: "LUXFABRIC RF", mood: "Minimal", genre: "Downtempo", badge: "Instagram Reels da mashhur", file: "atelier.mp3", bpm: 95, durationSec: 52, freq: 98, beatHz: 1.58, bright: 196 },
  { id: "trend-runway-click", title: "Runway Click", artist: "LUXFABRIC RF", mood: "Fashion", genre: "Electronic", badge: "Instagram Reels da mashhur", file: "runway-click.mp3", bpm: 120, durationSec: 44, freq: 131, beatHz: 2.0, bright: 392 },
  { id: "trend-soft-spotlight", title: "Soft Spotlight", artist: "LUXFABRIC RF", mood: "Soft sell", genre: "Lo-fi", badge: "Instagram Reels da mashhur", file: "soft-spotlight.mp3", bpm: 80, durationSec: 50, freq: 147, beatHz: 1.33, bright: 233 },
  { id: "trend-metro-fit", title: "Metro Fit", artist: "LUXFABRIC RF", mood: "Everyday", genre: "Hip-hop vibe", badge: "Instagram Reels da mashhur", file: "metro-fit.mp3", bpm: 96, durationSec: 46, freq: 110, beatHz: 1.6, bright: 275 },
  { id: "trend-crystal-bag", title: "Crystal Bag", artist: "LUXFABRIC RF", mood: "Sparkle", genre: "Pop vibe", badge: "Instagram Reels da mashhur", file: "crystal-bag.mp3", bpm: 115, durationSec: 42, freq: 196, beatHz: 1.92, bright: 392 },
];

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const bin = ffmpegPath;
    if (!bin) return reject(new Error("ffmpeg-static topilmadi"));
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => {
      err += d.toString();
    });
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.slice(-400) || `ffmpeg exit ${code}`));
    });
  });
}

async function generateOne(t) {
  const out = path.join(outDir, t.file);
  // Kick-ish pulse + bass + bright pad — original RF bed
  const filter = [
    `aevalsrc=exprs='0.28*sin(2*PI*${t.freq}*t)*(0.55+0.45*sin(2*PI*${t.beatHz}*t))+0.12*sin(2*PI*${t.bright}*t)*sin(2*PI*0.25*t)+0.08*sin(2*PI*${t.freq * 2}*t)*max(0,sin(2*PI*${t.beatHz * 2}*t))':s=44100:d=${t.durationSec}`,
    "aformat=sample_fmts=fltp:channel_layouts=stereo",
    "alimiter=limit=0.9",
  ].join(",");

  await runFfmpeg([
    "-hide_banner",
    "-y",
    "-f",
    "lavfi",
    "-i",
    filter,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "160k",
    out,
  ]);
  console.log("ok", t.file);
}

const catalog = {
  version: 1,
  license:
    "Original LUXFABRIC royalty-free beds (generated). Commercial use in Luxfabric Reels OK. Not Instagram/Meta copyrighted hits.",
  disclaimerUz:
    "Instagram rasmiy xitlarini to‘g‘ridan-to‘g‘ri olish taqiqlangan; shu yerda litsenziyalangan trend uslubidagi treklar.",
  source: "local-curated",
  tracks: tracks.map((t, i) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    mood: t.mood,
    genre: t.genre,
    badge: t.badge,
    bpm: t.bpm,
    durationSec: t.durationSec,
    fileUrl: `/music/trends/${t.file}`,
    license: "LUXFABRIC RF / original",
    rank: i + 1,
  })),
};

writeFileSync(path.join(outDir, "catalog.json"), JSON.stringify(catalog, null, 2), "utf8");

for (const t of tracks) {
  await generateOne(t);
}
console.log(`Generated ${tracks.length} tracks → ${outDir}`);
