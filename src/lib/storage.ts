import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Serverda fayl saqlash: Blob (prod) yoki public/uploads (lokal). */
export async function storeUpload(opts: {
  folder: string;
  filename: string;
  data: Buffer | Blob | File;
  contentType?: string;
}): Promise<string> {
  const pathname = `${opts.folder}/${opts.filename}`;

  if (hasBlobStorage()) {
    const blob = await put(pathname, opts.data, {
      access: "public",
      addRandomSuffix: false,
      contentType: opts.contentType,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads", opts.folder);
  await mkdir(dir, { recursive: true });
  const buffer =
    Buffer.isBuffer(opts.data)
      ? opts.data
      : Buffer.from(await (opts.data as Blob).arrayBuffer());
  await writeFile(path.join(dir, opts.filename), buffer);
  return `/uploads/${opts.folder}/${opts.filename}`;
}

export function makeUploadName(ext: string): string {
  return `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
}
