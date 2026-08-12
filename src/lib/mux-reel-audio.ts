import { spawn } from "child_process";
import { mkdir, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { randomBytes } from "crypto";
import ffmpegPath from "ffmpeg-static";
import { hasBlobStorage, storeUpload } from "@/lib/storage";

/** `/uploads/...` → lokal path; https → /tmp ga yuklab olish. */
async function resolveMediaFile(
  url: string
): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  const clean = url.split("?")[0] || "";

  if (clean.startsWith("/uploads/")) {
    return {
      filePath: path.join(
        process.cwd(),
        "public",
        clean.replace(/^\//, "").replace(/\//g, path.sep)
      ),
      cleanup: async () => {},
    };
  }

  if (clean.startsWith("https://") || clean.startsWith("http://")) {
    const res = await fetch(clean);
    if (!res.ok) throw new Error(`Media yuklab bo‘lmadi (${res.status})`);
    const ext = clean.match(/\.([a-z0-9]+)$/i)?.[1] || "bin";
    const tmp = path.join(os.tmpdir(), `lf-${randomBytes(8).toString("hex")}.${ext}`);
    await writeFile(tmp, Buffer.from(await res.arrayBuffer()));
    return {
      filePath: tmp,
      cleanup: async () => {
        try {
          await unlink(tmp);
        } catch {
          /* ignore */
        }
      },
    };
  }

  throw new Error("Faqat /uploads/... yoki https media birlashtiriladi");
}

/**
 * Video + musiqa → bitta MP4 (video ovozi o‘rniga trek).
 * Natija Blob yoki /uploads/reels ga yoziladi.
 */
export async function muxVideoWithMusic(videoUrl: string, musicUrl: string): Promise<string> {
  const bin = ffmpegPath;
  if (!bin) throw new Error("ffmpeg binary topilmadi (ffmpeg-static)");

  const video = await resolveMediaFile(videoUrl);
  const music = await resolveMediaFile(musicUrl);
  const outName = `${Date.now()}-${randomBytes(4).toString("hex")}-mux.mp4`;
  const outPath = path.join(os.tmpdir(), outName);

  try {
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-hide_banner",
        "-y",
        "-i",
        video.filePath,
        "-stream_loop",
        "-1",
        "-i",
        music.filePath,
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

    if (hasBlobStorage()) {
      const { readFile } = await import("fs/promises");
      const buf = await readFile(outPath);
      return storeUpload({
        folder: "reels",
        filename: outName,
        data: buf,
        contentType: "video/mp4",
      });
    }

    const outDir = path.join(process.cwd(), "public", "uploads", "reels");
    await mkdir(outDir, { recursive: true });
    const { copyFile } = await import("fs/promises");
    await copyFile(outPath, path.join(outDir, outName));
    return `/uploads/reels/${outName}`;
  } finally {
    await video.cleanup();
    await music.cleanup();
    try {
      await unlink(outPath);
    } catch {
      /* ignore */
    }
  }
}
