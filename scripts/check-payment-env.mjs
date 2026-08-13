import fs from "fs";

function chk(p) {
  if (!fs.existsSync(p)) {
    console.log(p + ": missing");
    return;
  }
  const t = fs.readFileSync(p, "utf8");
  for (const k of [
    "CLICK_MERCHANT_ID",
    "CLICK_SERVICE_ID",
    "CLICK_SECRET_KEY",
    "CLICK_MERCHANT_USER_ID",
    "PAYME_MERCHANT_ID",
    "PAYME_KEY",
    "PAYME_SECRET",
  ]) {
    const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
    if (!m) console.log(k + ": absent");
    else {
      const v = (m[1] || "").trim().replace(/^["']|["']$/g, "");
      console.log(k + ": " + (v ? "SET(" + v.length + ")" : "EMPTY"));
    }
  }
}

chk(".env");
chk(".env.local");
if (fs.existsSync(".env.vercel.check")) chk(".env.vercel.check");
