import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import ffmpegPath from "ffmpeg-static";

/** `/uploads/...` → `public/uploads/...` (faqat lokal upload). */
export function mediaUrlToPath(url: string): string {
  const clean = url.split("?")[0] || "";
  if (!clean.startsWith("/uploads/")) {
    throw new Error("Faqat /uploads/... media birlashtiriladi");
  }
  return path.join(process.cwd(), "public", clean.replace(/^\//, "").replace(/\//g, path.sep));
}

/**
 * Video + musiqa → bitta MP4 (video ovozi o‘rniga trek).
 * Musiqa video uzunligiga qisqartiriladi / loop qilinadi.
 */
export async function muxVideoWithMusic(videoUrl: string, musicUrl: string): Promise<string> {
  const bin = ffmpegPath;
  if (!bin) throw new Error("ffmpeg binary topilmadi (ffmpeg-static)");

  const videoPath = mediaUrlToPath(videoUrl);
  const musicPath = mediaUrlToPath(musicUrl);
  const outDir = path.join(process.cwd(), "public", "uploads", "reels");
  await mkdir(outDir, { recursive: true });
  const outName = `${Date.now()}-${randomBytes(4).toString("hex")}-mux.mp4`;
  const outPath = path.join(outDir, outName);

  await new Promise<void>((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-y",
      "-i",
      videoPath,
      "-stream_loop",
      "-1",
      "-i",
      musicPath,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-shortest",
      "-movflags",
      "+faststart",
      outPath,
    ];
    const proc = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg (${code}): ${stderr.slice(-800) || "noma’lum xato"}`));
    });
  });

  return `/uploads/reels/${outName}`;
}
