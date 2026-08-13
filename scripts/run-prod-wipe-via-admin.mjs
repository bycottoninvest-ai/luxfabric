/**
 * Productionda admin session + mavjud delete API orqali barcha mahsulotlarni tozalaydi.
 * ADMIN_PASSWORD: .env.local yoki muhit. Secret chop etilmaydi.
 *
 *   node scripts/run-prod-wipe-via-admin.mjs --confirm
 *   node scripts/run-prod-wipe-via-admin.mjs --confirm --clear-ig
 *   node scripts/run-prod-wipe-via-admin.mjs --confirm --purge-deleted
 */
import fs from "fs";
import { config as loadDotenv } from "dotenv";

const argv = process.argv.slice(2);
const confirm = argv.includes("--confirm");
const clearIg = argv.includes("--clear-ig");
const purgeDeleted = argv.includes("--purge-deleted");
const base = (process.env.BASE_URL || "https://www.luxfabricshop.uz").replace(
  /\/$/,
  ""
);

for (const f of [".env.local", ".env"]) {
  if (fs.existsSync(f)) loadDotenv({ path: f });
}

function readAdminPassword() {
  let v = (process.env.ADMIN_PASSWORD || "").trim().replace(/^["']+|["']+$/g, "");
  if (v && v !== "[SENSITIVE]") return v;
  return "";
}

function cookieFromLogin(res) {
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length > 0) {
    return setCookie.map((c) => c.split(";")[0]).join("; ");
  }
  const raw = res.headers.get("set-cookie");
  if (!raw) return "";
  return raw
    .split(/,(?=\s*[^;]+=)/)
    .map((p) => p.split(";")[0].trim())
    .join("; ");
}

async function login(password) {
  const email = process.env.ADMIN_EMAIL || "admin@luxfabricshop.uz";
  const loginRes = await fetch(`${base}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await loginRes.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  if (!loginRes.ok) {
    throw new Error(`Login fail ${loginRes.status}: ${json.error || text.slice(0, 200)}`);
  }
  const cookie = cookieFromLogin(loginRes);
  if (!cookie.includes("lf_admin_session")) {
    throw new Error("Session cookie olinmadi");
  }
  return cookie;
}

async function listProductIds() {
  // GET /api/products — barcha statuslar (deploydagi route status filtrlamiydi)
  const pub = await fetch(`${base}/api/products`);
  const pubJson = await pub.json().catch(() => []);
  const fromApi = Array.isArray(pubJson) ? pubJson : [];
  const targets = fromApi.filter((p) => p?.id && p.status !== "DELETED");
  const deleted = fromApi.filter((p) => p?.id && p.status === "DELETED");
  return {
    total: fromApi.length,
    active: fromApi.filter((p) => p.status === "ACTIVE").length,
    deletedCount: deleted.length,
    targets: targets.map((p) => ({
      id: p.id,
      slug: p.slug,
      status: p.status,
      name: p.name,
    })),
    deleted: deleted.map((p) => ({
      id: p.id,
      slug: p.slug,
      status: p.status,
      name: p.name,
    })),
  };
}

async function deleteOne(cookie, id) {
  const res = await fetch(`${base}/api/admin/products/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ id }),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function clearIgLocal(cookie) {
  const reelsRes = await fetch(`${base}/api/admin/instagram/reels`, {
    headers: { Cookie: cookie },
  });
  const reelsJson = await reelsRes.json().catch(() => ({}));
  const reels = Array.isArray(reelsJson)
    ? reelsJson
    : Array.isArray(reelsJson.reels)
      ? reelsJson.reels
      : [];

  let reelsDeleted = 0;
  for (const r of reels) {
    if (!r?.id) continue;
    const del = await fetch(`${base}/api/admin/instagram/reels/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ id: r.id }),
    });
    if (del.ok) reelsDeleted += 1;
  }

  const storiesRes = await fetch(`${base}/api/admin/instagram/stories`, {
    headers: { Cookie: cookie },
  });
  const storiesJson = await storiesRes.json().catch(() => ({}));
  const stories = Array.isArray(storiesJson)
    ? storiesJson
    : Array.isArray(storiesJson.stories)
      ? storiesJson.stories
      : [];

  let storiesDeleted = 0;
  for (const s of stories) {
    if (!s?.id) continue;
    const del = await fetch(`${base}/api/admin/instagram/stories`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ id: s.id }),
    });
    if (del.ok) storiesDeleted += 1;
  }

  return {
    reelsFound: reels.length,
    reelsDeleted,
    storiesFound: stories.length,
    storiesDeleted,
  };
}

if (!confirm) {
  console.error("Xavfsizlik: --confirm kerak");
  process.exit(1);
}

const password = readAdminPassword();
if (!password) {
  console.error("ADMIN_PASSWORD topilmadi (.env.local)");
  process.exit(1);
}

async function main() {
  console.log(`Base: ${base}`);
  const cookie = await login(password);
  console.log("Login OK");

  const listed = await listProductIds();
  console.log(
    JSON.stringify(
      {
        totalInApi: listed.total,
        active: listed.active,
        toWipe: listed.targets.length,
        names: listed.targets.map((t) => t.name),
      },
      null,
      2
    )
  );

  const targets = listed.targets;

  let hard = 0;
  let soft = 0;
  let skip = 0;
  let fail = 0;
  const igNotes = [];

  for (const t of targets) {
    const { status, json } = await deleteOne(cookie, t.id);
    if (!status || status >= 400) {
      fail += 1;
      console.log(`FAIL ${t.slug}:`, status, json.error || json);
      continue;
    }
    if (json.alreadyGone) skip += 1;
    else if (json.mode === "hard") hard += 1;
    else if (json.mode === "soft") soft += 1;
    else skip += 1;
    if (json.ig?.error || (json.ig?.attempted && json.ig?.ok === false)) {
      igNotes.push(json.ig.error || json.ig.note || "ig fail");
    }
    console.log(`OK ${json.mode || "?"} ${t.slug}`);
  }

  // Allaqachon DELETED: delete API soft deb skip qiladi — hard uchun maxsus endpoint yo‘q.
  // --purge-deleted: qayta delete chaqirish (alreadyGone). Haqiqiy hard uchun DB skript kerak.
  let purgedAttempts = 0;
  if (purgeDeleted && listed.deleted?.length) {
    for (const d of listed.deleted) {
      const { status, json } = await deleteOne(cookie, d.id);
      purgedAttempts += 1;
      console.log(`purge-deleted ${d.slug}:`, status, json.mode || json.error || json);
    }
  }

  let igClear = null;
  if (clearIg) {
    igClear = await clearIgLocal(cookie);
    console.log("IG clear:", igClear);
  }

  const after = await listProductIds();
  const adminPage = await fetch(`${base}/admin/products`, {
    headers: { Cookie: cookie },
  });
  const adminHtml = await adminPage.text();
  const adminHasDeleteBtn = /productId="/i.test(adminHtml);

  console.log(
    JSON.stringify(
      {
        processed: targets.length,
        hard,
        soft,
        skip,
        fail,
        alreadyDeletedBefore: listed.deletedCount,
        purgedAttempts,
        nonDeletedLeft: after.targets.length,
        activeLeft: after.active,
        deletedLeft: after.deletedCount,
        totalLeft: after.total,
        adminHasDeleteBtn,
        igNotes: [...new Set(igNotes)].slice(0, 5),
        igClear,
        note: "IG Graph katalog: token invalid bo‘lsa Meta tomonda qoladi — Admin → Instagram → Meta/DM qayta ulash",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
