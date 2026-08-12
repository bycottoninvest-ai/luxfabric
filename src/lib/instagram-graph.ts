import { getSetting, getAppUrl } from "@/lib/settings";

const GRAPH_FB = "https://graph.facebook.com/v21.0";
const GRAPH_IG = "https://graph.instagram.com/v21.0";

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
  const data = (await res.json()) as GraphMe;
  return { res, data };
}

/** Token Page yoki IG Login ekanini aniqlab, IG user id + graph base qaytaradi */
export async function resolveIgAccess(token: string, preferredIgUserId?: string) {
  const preferred = preferredIgUserId?.trim() || "";

  // 1) Saqlangan IG ID + Facebook Graph (Page Access Token)
  if (preferred) {
    const fb = await graphGet(
      GRAPH_FB,
      `/${preferred}?fields=id,username,name,account_type`,
      token
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

    // 2) Saqlangan IG ID + Instagram Graph (Instagram Login token)
    const ig = await graphGet(
      GRAPH_IG,
      `/${preferred}?fields=id,username,name,account_type`,
      token
    );
    if (ig.res.ok && !ig.data.error && ig.data.id) {
      return {
        igUserId: ig.data.id,
        graphBase: GRAPH_IG,
        username: ig.data.username || null,
        name: ig.data.name || null,
        accountType: ig.data.account_type || null,
      };
    }
  }

  // 3) Instagram Login: /me
  const igMe = await graphGet(GRAPH_IG, `/me?fields=user_id,username,name,account_type`, token);
  if (igMe.res.ok && !igMe.data.error) {
    const id = igMe.data.user_id || igMe.data.id;
    if (id) {
      return {
        igUserId: id,
        graphBase: GRAPH_IG,
        username: igMe.data.username || null,
        name: igMe.data.name || null,
        accountType: igMe.data.account_type || null,
      };
    }
  }

  // 4) Page token: /me?fields=instagram_business_account
  const pageMe = await graphGet(GRAPH_FB, `/me?fields=instagram_business_account`, token);
  if (pageMe.res.ok && !pageMe.data.error) {
    const id = pageMe.data.instagram_business_account?.id;
    if (id) {
      const profile = await graphGet(
        GRAPH_FB,
        `/${id}?fields=id,username,name,account_type`,
        token
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

  // 5) User token: /me/accounts orqali Page + IG topish
  const accounts = await graphGet(
    GRAPH_FB,
    `/me/accounts?fields=id,name,access_token,instagram_business_account`,
    token
  );
  if (accounts.res.ok && !(accounts.data as { error?: unknown }).error) {
    const list = (accounts.data as { data?: Array<{
      id?: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: { id?: string };
    }> }).data || [];
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

  const hint =
    pageMe.data.error?.message ||
    igMe.data.error?.message ||
    "Token Page Access Token emas yoki Instagram Professional ulanmagan";
  throw new IgPublishError(hint);
}

export async function getIgCredentials(): Promise<IgCredentials> {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken.trim()) {
    throw new IgPublishError("Page Access Token yo‘q — Meta / DM bo‘limiga token qo‘ying");
  }

  const preferredIg =
    (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";

  const resolved = await resolveIgAccess(pageToken.trim(), preferredIg);
  const token = resolved.pageTokenOverride || pageToken.trim();

  const publicBase = ((await getSetting("app_domain")) || (await getAppUrl()) || "").replace(/\/$/, "");
  if (!publicBase || /localhost|127\.0\.0\.1/i.test(publicBase)) {
    throw new IgPublishError(
      "Meta video/rasmni localhost dan o‘qimaydi. Meta/DM da «Sayt domeni»ni https://… (yoki ngrok) qilib saqlang."
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
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken.trim()) {
    return { ok: false as const, error: "Page Access Token bo‘sh" };
  }
  try {
    const preferredIg =
      (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";
    const resolved = await resolveIgAccess(pageToken.trim(), preferredIg);
    return {
      ok: true as const,
      igUserId: resolved.igUserId,
      username: resolved.username,
      name: resolved.name,
      accountType: resolved.accountType,
      graphBase: resolved.graphBase,
    };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Ulanish xatosi" };
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
    throw new IgPublishError(data.error?.message || `Graph POST ${path} xatosi`);
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
