import { getSetting, getAppUrl, setSettings } from "@/lib/settings";
import { publicShopOrigin } from "@/lib/ig-caption";
import {
  igTokenKind,
  looksLikeAppToken,
  looksLikeIgAccessToken,
  normalizeIgAccessToken,
  refreshInstagramLoginToken,
  igTokenReconnectMessage,
  isUnparseableTokenError,
} from "@/lib/ig-token";

const GRAPH_FB = "https://graph.facebook.com/v21.0";
const GRAPH_IG = "https://graph.instagram.com/v21.0";
const GRAPH_IG_BARE = "https://graph.instagram.com";

export type IgCredentials = {
  pageToken: string;
  igUserId: string;
  publicBase: string;
  /** graph.facebook.com (Page token) yoki graph.instagram.com (IG Login token) */
  graphBase: string;
};

export class IgPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IgPublishError";
  }
}

type GraphMe = {
  id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  user_id?: string;
  instagram_business_account?: { id?: string };
  error?: { message?: string; code?: number };
};

async function graphGet(base: string, path: string, token: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(
    `${base}${path}${sep}access_token=${encodeURIComponent(token)}`
  );
  try {
    const data = (await res.json()) as GraphMe;
    return { res, data };
  } catch {
    return { res, data: { error: { message: "Graph javobi o‘qilmadi" } } };
  }
}

type ResolvedIg = {
  igUserId: string;
  graphBase: string;
  username: string | null;
  name: string | null;
  accountType: string | null;
  pageTokenOverride?: string;
};

async function tryIgMe(token: string, bases: string[]): Promise<ResolvedIg | null> {
  for (const base of bases) {
    const igMe = await graphGet(base, `/me?fields=user_id,id,username,name,account_type`, token);
    if (igMe.res.ok && !igMe.data.error) {
      const id = igMe.data.user_id || igMe.data.id;
      if (id) {
        return {
          igUserId: id,
          graphBase: base,
          username: igMe.data.username || null,
          name: igMe.data.name || null,
          accountType: igMe.data.account_type || null,
        };
      }
    }
  }
  return null;
}

/** Token Page yoki IG Login ekanini aniqlab, IG user id + graph base qaytaradi */
export async function resolveIgAccess(token: string, preferredIgUserId?: string) {
  const clean = normalizeIgAccessToken(token);
  if (!clean) {
    throw new IgPublishError(igTokenReconnectMessage("token bo‘sh"));
  }
  if (looksLikeAppToken(clean)) {
    throw new IgPublishError(
      igTokenReconnectMessage("bu App Token — Instagram Login OAuth kerak")
    );
  }
  if (!looksLikeIgAccessToken(clean)) {
    throw new IgPublishError(igTokenReconnectMessage("token format noto‘g‘ri"));
  }

  const preferred = preferredIgUserId?.trim() || "";
  const kind = igTokenKind(clean);
  const igBases = kind === "facebook" ? [] : [GRAPH_IG, GRAPH_IG_BARE];
  const tryFb = kind !== "instagram";

  // Instagram Login tokenni Facebook Graph ga yubormaslik — «Cannot parse access token»
  if (igBases.length) {
    if (preferred) {
      for (const base of igBases) {
        const ig = await graphGet(
          base,
          `/${preferred}?fields=id,username,name,account_type,user_id`,
          clean
        );
        if (ig.res.ok && !ig.data.error && (ig.data.id || ig.data.user_id)) {
          return {
            igUserId: ig.data.user_id || ig.data.id!,
            graphBase: base,
            username: ig.data.username || null,
            name: ig.data.name || null,
            accountType: ig.data.account_type || null,
          };
        }
      }
    }
    const me = await tryIgMe(clean, igBases);
    if (me) return me;

    const refreshed = await refreshInstagramLoginToken(clean);
    if (refreshed && refreshed !== clean) {
      const me2 = await tryIgMe(refreshed, igBases);
      if (me2) return { ...me2, pageTokenOverride: refreshed };
    }
  }

  if (tryFb && preferred) {
    const fb = await graphGet(
      GRAPH_FB,
      `/${preferred}?fields=id,username,name,account_type`,
      clean
    );
    if (fb.res.ok && !fb.data.error && fb.data.id) {
      return {
        igUserId: fb.data.id,
        graphBase: GRAPH_FB,
        username: fb.data.username || null,
        name: fb.data.name || null,
        accountType: fb.data.account_type || null,
      };
    }
  }

  if (tryFb) {
    const pageMe = await graphGet(GRAPH_FB, `/me?fields=instagram_business_account`, clean);
    if (pageMe.res.ok && !pageMe.data.error) {
      const id = pageMe.data.instagram_business_account?.id;
      if (id) {
        const profile = await graphGet(
          GRAPH_FB,
          `/${id}?fields=id,username,name,account_type`,
          clean
        );
        return {
          igUserId: id,
          graphBase: GRAPH_FB,
          username: profile.data.username || null,
          name: profile.data.name || null,
          accountType: profile.data.account_type || null,
        };
      }
    }

    const accounts = await graphGet(
      GRAPH_FB,
      `/me/accounts?fields=id,name,access_token,instagram_business_account`,
      clean
    );
    if (accounts.res.ok && !(accounts.data as { error?: unknown }).error) {
      const list =
        (
          accounts.data as {
            data?: Array<{
              id?: string;
              name?: string;
              access_token?: string;
              instagram_business_account?: { id?: string };
            }>;
          }
        ).data || [];
      const withIg = list.find((p) => p.instagram_business_account?.id);
      if (withIg?.instagram_business_account?.id && withIg.access_token) {
        const igId = withIg.instagram_business_account.id;
        const profile = await graphGet(
          GRAPH_FB,
          `/${igId}?fields=id,username,name,account_type`,
          withIg.access_token
        );
        return {
          igUserId: igId,
          graphBase: GRAPH_FB,
          pageTokenOverride: withIg.access_token,
          username: profile.data.username || null,
          name: profile.data.name || null,
          accountType: profile.data.account_type || null,
        };
      }
    }
  }

  throw new IgPublishError(igTokenReconnectMessage());
}

export async function getIgCredentials(): Promise<IgCredentials> {
  const raw =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  const pageToken = normalizeIgAccessToken(raw);
  if (!pageToken) {
    throw new IgPublishError(igTokenReconnectMessage("token yo‘q"));
  }

  const preferredIg =
    (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";

  const resolved = await resolveIgAccess(pageToken, preferredIg);
  const token = resolved.pageTokenOverride || pageToken;

  if (resolved.pageTokenOverride && resolved.pageTokenOverride !== pageToken) {
    try {
      await setSettings({ instagram_page_token: resolved.pageTokenOverride });
    } catch {
      /* saqlash ixtiyoriy */
    }
  }

  const publicBase = publicShopOrigin(
    (await getSetting("app_domain")) || (await getAppUrl()) || ""
  );
  if (!publicBase || /localhost|127\.0\.0\.1/i.test(publicBase)) {
    throw new IgPublishError(
      "Meta video/rasmni localhost dan o‘qimaydi. Meta/DM da «Sayt domeni»ni https://www.luxfabricshop.uz qilib saqlang."
    );
  }

  return {
    pageToken: token,
    igUserId: resolved.igUserId,
    publicBase,
    graphBase: resolved.graphBase,
  };
}

/** Page token orqali Instagram Business account ID topish */
export async function resolveIgUserId(pageToken: string): Promise<string> {
  const resolved = await resolveIgAccess(pageToken);
  return resolved.igUserId;
}

export async function testInstagramConnection() {
  const pageToken = normalizeIgAccessToken(
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || ""
  );
  if (!pageToken) {
    return { ok: false as const, error: igTokenReconnectMessage("token bo‘sh") };
  }
  if (!looksLikeIgAccessToken(pageToken)) {
    return { ok: false as const, error: igTokenReconnectMessage("token format noto‘g‘ri") };
  }
  try {
    const preferredIg =
      (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";
    const resolved = await resolveIgAccess(pageToken, preferredIg);
    if (resolved.pageTokenOverride) {
      try {
        await setSettings({ instagram_page_token: resolved.pageTokenOverride });
      } catch {
        /* ignore */
      }
    }
    return {
      ok: true as const,
      igUserId: resolved.igUserId,
      username: resolved.username,
      name: resolved.name,
      accountType: resolved.accountType,
      graphBase: resolved.graphBase,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ulanish xatosi";
    return {
      ok: false as const,
      error: isUnparseableTokenError(msg) ? igTokenReconnectMessage(msg) : msg,
    };
  }
}

function toPublicUrl(pathOrUrl: string, publicBase: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    if (/localhost|127\.0\.0\.1/i.test(pathOrUrl)) {
      throw new IgPublishError("Media URL localhost — Meta o‘qimaydi. Prod/ngrok domen kerak.");
    }
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${publicBase}${path}`;
}

async function graphPost(base: string, path: string, token: string, body: Record<string, string>) {
  const params = new URLSearchParams({ ...body, access_token: token });
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string; code?: number } };
  if (!res.ok || data.error || !data.id) {
    const raw = data.error?.message || `Graph POST ${path} xatosi`;
    throw new IgPublishError(isUnparseableTokenError(raw) ? igTokenReconnectMessage(raw) : raw);
  }
  return data.id;
}

async function waitContainerReady(base: string, containerId: string, token: string, maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const res = await fetch(
      `${base}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`
    );
    const data = (await res.json()) as {
      status_code?: string;
      status?: string;
      error?: { message?: string };
    };
    if (data.error) throw new IgPublishError(data.error.message || "Container status xatosi");
    const code = (data.status_code || "").toUpperCase();
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new IgPublishError(`Media tayyorlanmadi: ${data.status_code} ${data.status || ""}`.trim());
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new IgPublishError("Media tayyorlanishi juda uzoq — keyinroq qayta urinib ko‘ring");
}

export async function publishReelToInstagram(opts: {
  videoUrl: string;
  caption: string;
  coverUrl?: string | null;
  shareToFeed?: boolean;
}) {
  const { pageToken, igUserId, publicBase, graphBase } = await getIgCredentials();
  const videoUrl = toPublicUrl(opts.videoUrl, publicBase);
  const body: Record<string, string> = {
    media_type: "REELS",
    video_url: videoUrl,
    caption: opts.caption.slice(0, 2200),
    share_to_feed: opts.shareToFeed === false ? "false" : "true",
  };
  if (opts.coverUrl) {
    try {
      body.cover_url = toPublicUrl(opts.coverUrl, publicBase);
    } catch {
      /* cover ixtiyoriy */
    }
  }

  const containerId = await graphPost(graphBase, `/${igUserId}/media`, pageToken, body);
  await waitContainerReady(graphBase, containerId, pageToken);
  const mediaId = await graphPost(graphBase, `/${igUserId}/media_publish`, pageToken, {
    creation_id: containerId,
  });
  return { containerId, mediaId, videoUrl };
}

export async function publishStoryToInstagram(opts: {
  mediaUrl: string;
  mediaType: "image" | "video";
}) {
  const { pageToken, igUserId, publicBase, graphBase } = await getIgCredentials();
  const mediaUrl = toPublicUrl(opts.mediaUrl, publicBase);
  const body: Record<string, string> =
    opts.mediaType === "video"
      ? { media_type: "STORIES", video_url: mediaUrl }
      : { media_type: "STORIES", image_url: mediaUrl };

  const containerId = await graphPost(graphBase, `/${igUserId}/media`, pageToken, body);
  await waitContainerReady(graphBase, containerId, pageToken);
  const mediaId = await graphPost(graphBase, `/${igUserId}/media_publish`, pageToken, {
    creation_id: containerId,
  });
  return { containerId, mediaId, mediaUrl };
}

/** Instagram DM javob (Page Messaging / IG) — Page Access Token kerak */
export async function sendInstagramDm(recipientId: string, text: string) {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken) throw new IgPublishError("Page token yo‘q");

  const res = await fetch(
    `${GRAPH_FB}/me/messages?access_token=${encodeURIComponent(pageToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text.slice(0, 1000) },
      }),
    }
  );
  const data = (await res.json()) as { error?: { message?: string } };
  if (!res.ok || data.error) {
    throw new IgPublishError(data.error?.message || "DM yuborilmadi");
  }
  return data;
}

/**
 * O‘z mediaiga izoh (birinchi «Sotib olish» izohi).
 * POST /{ig-media-id}/comments — Instagram Login: instagram_business_manage_comments.
 */
export async function commentOnInstagramMedia(mediaId: string, message: string) {
  const { pageToken, graphBase } = await getIgCredentials();
  const params = new URLSearchParams({
    message: message.slice(0, 800),
    access_token: pageToken,
  });
  const res = await fetch(`${graphBase}/${mediaId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string; code?: number } };
  if (!res.ok || data.error || !data.id) {
    throw new IgPublishError(data.error?.message || "Birinchi izoh yozilmadi");
  }
  return { commentId: data.id };
}

/** Publishdan keyin media biroz kechikishi mumkin — kutib, keyin bir necha marta urinadi. */
export async function commentOnInstagramMediaWithRetry(
  mediaId: string,
  message: string,
  attempts = 5
) {
  let lastErr: unknown;
  // Meta container → media id ba’zan 2–8 s keyin comment qabul qiladi
  await new Promise((r) => setTimeout(r, 2500));
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2500 * i));
    try {
      return await commentOnInstagramMedia(mediaId, message);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new IgPublishError("Birinchi izoh yozilmadi");
}

/**
 * Meta Commerce katalogdan mahsulotni o‘chirish (best-effort).
 *
 * Meta to‘liq «katalog o‘chirish» ni har doim bir xil qilmaydi:
 * - Facebook Graph + Product Item id bo‘lsa: DELETE /{product-item-id}
 * - `meta_catalog_id` setting/env + retailer/id bo‘lsa: POST /{catalog}/items_batch DELETE
 * - Instagram Login token (graph.instagram.com) Commerce API bermaydi — skip
 *
 * Soft-fail: hech qachon throw qilmaydi.
 */
export async function tryDeleteCatalogProduct(metaCatalogProductId: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  note?: string;
}> {
  const productRef = metaCatalogProductId.trim();
  if (!productRef) {
    return { ok: false, skipped: true, note: "metaCatalogProductId yo‘q — IG o‘tkazib yuborildi" };
  }

  try {
    const pageToken =
      (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
    if (!pageToken.trim()) {
      return {
        ok: false,
        skipped: true,
        note: "Page token yo‘q — LUXFABRIC dan o‘chirildi, IG katalogda qo‘lda o‘chiring",
      };
    }

    let graphBase = GRAPH_FB;
    try {
      const creds = await getIgCredentials();
      graphBase = creds.graphBase;
    } catch {
      /* token resolve bo‘lmasa ham Facebook Graph bilan urinish */
    }

    if (graphBase.includes("graph.instagram.com")) {
      return {
        ok: false,
        skipped: true,
        note:
          "Instagram Login token Commerce katalog o‘chirishni qo‘llab-quvvatlamaydi — IG da qo‘lda o‘chiring",
      };
    }

    // 1) To‘g‘ridan-to‘g‘ri Product Item node (id = Graph product item id)
    const delRes = await fetch(
      `${GRAPH_FB}/${encodeURIComponent(productRef)}?access_token=${encodeURIComponent(pageToken)}`,
      { method: "DELETE" }
    );
    const delData = (await delRes.json()) as { success?: boolean; error?: { message?: string } };
    if (delRes.ok && (delData.success === true || !delData.error)) {
      return { ok: true, note: "Meta katalogdan o‘chirildi" };
    }

    // 2) Catalog items_batch — catalog id kerak (setting: meta_catalog_id yoki META_CATALOG_ID)
    // Meta PRODUCT_ITEM delete identifikatori odatda `id`; ba’zi kataloglarda retailer_id.
    const catalogId =
      (await getSetting("meta_catalog_id")) || process.env.META_CATALOG_ID || "";
    if (catalogId.trim()) {
      for (const data of [{ id: productRef }, { retailer_id: productRef }] as const) {
        const requests = JSON.stringify([{ method: "DELETE", data }]);
        const batchParams = new URLSearchParams({
          item_type: "PRODUCT_ITEM",
          requests,
          access_token: pageToken,
        });
        const batchRes = await fetch(
          `${GRAPH_FB}/${encodeURIComponent(catalogId.trim())}/items_batch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: batchParams.toString(),
          }
        );
        const batchData = (await batchRes.json()) as {
          handles?: string[];
          error?: { message?: string };
        };
        if (batchRes.ok && !batchData.error) {
          return {
            ok: true,
            note: "Meta katalog items_batch orqali o‘chirish yuborildi (async)",
          };
        }
      }
      return {
        ok: false,
        error: delData.error?.message || "Meta katalogdan o‘chirib bo‘lmadi",
        note: "LUXFABRIC dan o‘chirildi; IG katalogda qo‘lda tekshiring",
      };
    }

    return {
      ok: false,
      error: delData.error?.message || "Meta katalog delete muvaffaqiyatsiz",
      note:
        "LUXFABRIC dan o‘chirildi. To‘liq katalog delete uchun meta_catalog_id + Facebook Login kerak; aks holda Commerce Managerda qo‘lda o‘chiring",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Meta katalog xatosi",
      note: "LUXFABRIC dan o‘chirildi; IG da qo‘lda o‘chiring",
    };
  }
}

/**
 * Shopping product tag (faqat Facebook Login + tasdiqlangan Instagram Shop + katalog).
 * Instagram Login token bilan Meta API product tagging bermaydi — chaqirmang.
 * Soft-fail: xato tashlamaydi, { ok: false } qaytaradi.
 */
export async function tryTagProductsOnMedia(
  mediaId: string,
  productIds: string[],
  coords?: { x?: number; y?: number }
): Promise<{ ok: boolean; error?: string }> {
  if (!productIds.length) return { ok: false, error: "product_id yo‘q" };
  try {
    const { pageToken, graphBase } = await getIgCredentials();
    if (graphBase.includes("graph.instagram.com")) {
      return {
        ok: false,
        error:
          "Product tag faqat Facebook Login + Instagram Shop (Commerce) bilan. Hozirgi Instagram Login token yetarli emas.",
      };
    }
    const updated_tags = JSON.stringify(
      productIds.slice(0, 20).map((product_id) => ({
        product_id,
        ...(coords?.x != null && coords?.y != null ? { x: coords.x, y: coords.y } : {}),
      }))
    );
    const params = new URLSearchParams({
      updated_tags,
      access_token: pageToken,
    });
    const res = await fetch(`${graphBase}/${mediaId}/product_tags`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await res.json()) as { success?: boolean; error?: { message?: string } };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message || "product_tags xatosi" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "product_tags xatosi" };
  }
}

export type IgMediaComment = {
  id: string;
  text: string;
  username?: string;
  timestamp?: string;
  fromId?: string;
  parentId?: string;
};

export type IgMediaItem = {
  id: string;
  caption: string;
  mediaType: string;
  mediaProductType: string;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  likeCount: number | null;
  commentsCount: number | null;
};

/**
 * Ulangan IG akkauntining media/Reels ro‘yxati: GET /{ig-user-id}/media
 * Faqat o‘z Professional akkaunt — boshqa profil scrape qilinmaydi.
 */
export async function listOwnInstagramMedia(opts?: {
  limit?: number;
}): Promise<{ username: string | null; igUserId: string; media: IgMediaItem[] }> {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken.trim()) {
    throw new IgPublishError("Page Access Token yo‘q — Meta / DM bo‘limiga token qo‘ying");
  }

  const preferredIg =
    (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";
  const resolved = await resolveIgAccess(pageToken.trim(), preferredIg);
  const token = resolved.pageTokenOverride || pageToken.trim();
  const limit = Math.min(Math.max(opts?.limit ?? 24, 1), 50);
  const fields =
    "id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count";
  const url = `${resolved.graphBase}/${resolved.igUserId}/media?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      caption?: string;
      media_type?: string;
      media_product_type?: string;
      thumbnail_url?: string;
      media_url?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    }>;
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    throw new IgPublishError(data.error?.message || "IG media ro‘yxati olinmadi");
  }

  const media = (data.data || [])
    .filter((m) => {
      if (!m.id) return false;
      const product = (m.media_product_type || "").toUpperCase();
      const type = (m.media_type || "").toUpperCase();
      return product === "REELS" || type === "VIDEO";
    })
    .map((m) => ({
      id: String(m.id),
      caption: (m.caption || "").slice(0, 500),
      mediaType: String(m.media_type || ""),
      mediaProductType: String(m.media_product_type || ""),
      thumbnailUrl: m.thumbnail_url || m.media_url || null,
      permalink: m.permalink || null,
      timestamp: m.timestamp || null,
      likeCount: typeof m.like_count === "number" ? m.like_count : null,
      commentsCount: typeof m.comments_count === "number" ? m.comments_count : null,
    }));

  return {
    username: resolved.username,
    igUserId: resolved.igUserId,
    media,
  };
}

/**
 * Media izohlarini olish: GET /{media-id}/comments
 * Instagram Login: instagram_business_manage_comments
 */
export async function listInstagramMediaComments(mediaId: string): Promise<IgMediaComment[]> {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken.trim()) throw new IgPublishError("Page token yo‘q");
  if (!mediaId.trim()) throw new IgPublishError("mediaId yo‘q");

  const preferredIg =
    (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";
  let graphBase = GRAPH_FB;
  try {
    const resolved = await resolveIgAccess(pageToken.trim(), preferredIg);
    graphBase = resolved.graphBase;
  } catch {
    /* default FB */
  }

  const fields = "id,text,username,timestamp,from,parent_id";
  const url = `${graphBase}/${mediaId.trim()}/comments?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(pageToken.trim())}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      text?: string;
      username?: string;
      timestamp?: string;
      parent_id?: string;
      from?: { id?: string; username?: string };
    }>;
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    throw new IgPublishError(data.error?.message || "Izohlar olinmadi");
  }

  return (data.data || [])
    .filter((c) => c.id && c.text)
    .map((c) => ({
      id: String(c.id),
      text: String(c.text),
      username: c.username || c.from?.username || undefined,
      timestamp: c.timestamp,
      fromId: c.from?.id ? String(c.from.id) : undefined,
      parentId: c.parent_id ? String(c.parent_id) : undefined,
    }));
}

/**
 * Instagram izohga javob (Graph: POST /{comment-id}/replies).
 * Page yoki IG Login token + comments ruxsati kerak.
 */
export async function replyToInstagramComment(commentId: string, message: string) {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken.trim()) throw new IgPublishError("Page token yo‘q");

  const preferredIg =
    (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";
  let graphBase = GRAPH_FB;
  try {
    const resolved = await resolveIgAccess(pageToken.trim(), preferredIg);
    graphBase = resolved.graphBase;
  } catch {
    /* default FB */
  }

  const params = new URLSearchParams({
    message: message.slice(0, 800),
    access_token: pageToken.trim(),
  });
  const res = await fetch(`${graphBase}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || data.error) {
    throw new IgPublishError(data.error?.message || "Izoh javobi yuborilmadi");
  }
  return data;
}
