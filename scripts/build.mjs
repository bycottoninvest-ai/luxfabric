import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

/** Vercel/CI: Prisma generate uchun dummy Postgres URL (haqiqiy data — Neon DATABASE_URL). */
if (!process.env.DATABASE_URL && (process.env.VERCEL || process.env.CI)) {
  process.env.DATABASE_URL =
    "postgresql://build:build@127.0.0.1:5432/build?schema=public";
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

/**
 * Production: haqiqiy DATABASE_URL bo‘lsa sxemani deploy qilamiz.
 * Dummy/local build URL bo‘lsa migrate o‘tkazilmaydi (faqat generate + next build).
 */
const dbUrl = process.env.DATABASE_URL || "";
const isRealPostgres =
  dbUrl.startsWith("postgres") &&
  !dbUrl.includes("@127.0.0.1:5432/build") &&
  !dbUrl.includes("@localhost:5432/build");

if (isRealPostgres && (process.env.VERCEL || process.env.CI || process.env.PRISMA_MIGRATE_DEPLOY === "1")) {
  const deployStatus = run(prismaBin, ["migrate", "deploy"]);
  if (deployStatus !== 0) process.exit(deployStatus);

  /**
   * Katalog bo‘sh bo‘lsa avtomatik seed (idempotent: seed.ts mahsulotlar > 0 bo‘lsa skip).
   * Lokal Neon/.env kerak emas — Vercel buildda DATABASE_URL allaqachon bor.
   */
  console.log("[build] prisma db seed (bo‘sh bo‘lsa to‘ldiriladi)...");
  const seedStatus = run(prismaBin, ["db", "seed"]);
  if (seedStatus !== 0) {
    console.warn("[build] seed muvaffaqiyatsiz — katalog bo‘sh qolishi mumkin");
    process.exit(seedStatus);
  }
}

const buildStatus = run(nextBin, ["build"]);
process.exit(buildStatus);
