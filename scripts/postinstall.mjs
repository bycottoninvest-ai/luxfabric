import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

if (!process.env.DATABASE_URL) {
  // generate uchun haqiqiy DB kerak emas — faqat valid Postgres URL formati
  process.env.DATABASE_URL =
    "postgresql://build:build@127.0.0.1:5432/build?schema=public";
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
