import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

if (!process.env.DATABASE_URL && (process.env.VERCEL || process.env.CI)) {
  process.env.DATABASE_URL = "file:./build.db";
} else if (!process.env.DATABASE_URL) {
  // Lokal install: .env bo‘lmasa ham generate ishlasin
  process.env.DATABASE_URL = "file:./build.db";
}

const prismaBin = (() => {
  const base = path.join(root, "node_modules", ".bin", "prisma");
  return isWin && existsSync(`${base}.cmd`) ? `${base}.cmd` : base;
})();

const result = spawnSync(prismaBin, ["generate"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: isWin,
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}
