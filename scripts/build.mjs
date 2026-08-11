import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

/** Vercel/CI: Prisma generate uchun dummy SQLite URL (production data keyin Postgres). */
if (!process.env.DATABASE_URL && (process.env.VERCEL || process.env.CI)) {
  // Prisma `file:` yo‘llari schema papkasiga nisbatan (`prisma/`).
  process.env.DATABASE_URL = "file:./build.db";
}

function bin(name) {
  const base = path.join(root, "node_modules", ".bin", name);
  return isWin && existsSync(`${base}.cmd`) ? `${base}.cmd` : base;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: isWin,
  });
  return result.status ?? 1;
}

const prismaBin = bin("prisma");
const nextBin = bin("next");

const clientReady = existsSync(
  path.join(root, "node_modules", ".prisma", "client", "index.js")
);
const generateStatus = run(prismaBin, ["generate"]);
if (generateStatus !== 0) {
  if (!clientReady) process.exit(generateStatus);
  console.warn(
    "[build] prisma generate failed (often Windows EPERM while dev is running); using existing client."
  );
}

/** Build paytida sahifalar Prisma o‘qiydi — fayl bo‘lmasa schema ni push qilamiz. */
const dbUrl = process.env.DATABASE_URL;
if (dbUrl.startsWith("file:")) {
  const rel = dbUrl.replace(/^file:/, "");
  const dbPath = path.isAbsolute(rel)
    ? rel
    : path.resolve(root, "prisma", rel.startsWith("./") ? rel.slice(2) : rel);
  if (!existsSync(dbPath)) {
    const pushStatus = run(prismaBin, ["db", "push", "--skip-generate"]);
    if (pushStatus !== 0) process.exit(pushStatus);
  }
}

const buildStatus = run(nextBin, ["build"]);
process.exit(buildStatus);
