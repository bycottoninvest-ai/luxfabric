import fs from "fs";

const t = fs.readFileSync(".env.vercel.check", "utf8");
const m = t.match(/^ADMIN_PASSWORD=(.*)$/m);
if (!m) {
  console.log("ADMIN_PASSWORD: MISSING");
  process.exit(0);
}
let raw = m[1];
let v = raw.trim();
let quoted = false;
if (
  (v.startsWith('"') && v.endsWith('"')) ||
  (v.startsWith("'") && v.endsWith("'"))
) {
  quoted = true;
  v = v.slice(1, -1);
}
console.log("ADMIN_PASSWORD: SET");
console.log("len=" + v.length);
console.log("quoted=" + quoted);
console.log("leadingOrTrailingSpaceInRaw=" + /^\s|\s$/.test(raw));
console.log("containsWhitespace=" + /\s/.test(v));
