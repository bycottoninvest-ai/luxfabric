import { getSetting, getAppUrl } from "@/lib/settings";

const GRAPH = "https://graph.facebook.com/v21.0";

export type IgCredentials = {
  pageToken: string;
  igUserId: string;
  publicBase: string;
};

export class IgPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IgPublishError";
  }
}

export async function getIgCredentials(): Promise<IgCredentials> {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken.trim()) {
    throw new IgPublishError("Page Access Token yo‘q — Meta / DM bo‘limiga token qo‘ying");
  }

  let igUserId = (await getSetting("instagram_ig_user_id")) || process.env.INSTAGRAM_IG_USER_ID || "";
  if (!igUserId.trim()) {
    igUserId = await resolveIgUserId(pageToken);
  }

  const publicBase = ((await getSetting("app_domain")) || (await getAppUrl()) || "").replace(/\/$/, "");
  if (!publicBase || /localhost|127\.0\.0\.1/i.test(publicBase)) {
    throw new IgPublishError(
      "Meta video/rasmni localhost dan o‘qimaydi. Meta/DM da «Sayt domeni»ni https://… (yoki ngrok) qilib saqlang."
    );
  }

  return { pageToken: pageToken.trim(), igUserId: igUserId.trim(), publicBase };
}

/** Page token orqali Instagram Business account ID topish */
export async function resolveIgUserId(pageToken: string): Promise<string> {
  const url = `${GRAPH}/me?fields=instagram_business_account&access_token=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    instagram_business_account?: { id?: string };
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    throw new IgPublishError(
      data.error?.message ||
        "Instagram Business akkaunt topilmadi — Page Instagram Professional bilan bog‘langanmi?"
    );
  }
  const id = data.instagram_business_account?.id;
  if (!id) {
    throw new IgPublishError(
      "Bu Page ga Instagram Professional ulanmagan. Meta Business Suite da Page ↔ Instagram bog‘lang."
    );
  }
  return id;
}

export async function testInstagramConnection() {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken.trim()) {
    return { ok: false as const, error: "Page Access Token bo‘sh" };
  }
  try {
    const igUserId = await resolveIgUserId(pageToken.trim());
    const meRes = await fetch(
      `${GRAPH}/${igUserId}?fields=id,username,name,account_type&access_token=${encodeURIComponent(pageToken)}`
    );
    const me = (await meRes.json()) as {
      id?: string;
      username?: string;
      name?: string;
      account_type?: string;
      error?: { message?: string };
    };
    if (!meRes.ok || me.error) {
      return { ok: false as const, error: me.error?.message || "IG profil o‘qilmadi" };
    }
    return {
      ok: true as const,
      igUserId: me.id || igUserId,
      username: me.username || null,
      name: me.name || null,
      accountType: me.account_type || null,
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

async function graphPost(path: string, token: string, body: Record<string, string>) {
  const params = new URLSearchParams({ ...body, access_token: token });
  const res = await fetch(`${GRAPH}${path}`, {
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

async function waitContainerReady(containerId: string, token: string, maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`
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
  const { pageToken, igUserId, publicBase } = await getIgCredentials();
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

  const containerId = await graphPost(`/${igUserId}/media`, pageToken, body);
  await waitContainerReady(containerId, pageToken);
  const mediaId = await graphPost(`/${igUserId}/media_publish`, pageToken, {
    creation_id: containerId,
  });
  return { containerId, mediaId, videoUrl };
}

export async function publishStoryToInstagram(opts: {
  mediaUrl: string;
  mediaType: "image" | "video";
}) {
  const { pageToken, igUserId, publicBase } = await getIgCredentials();
  const mediaUrl = toPublicUrl(opts.mediaUrl, publicBase);
  const body: Record<string, string> =
    opts.mediaType === "video"
      ? { media_type: "STORIES", video_url: mediaUrl }
      : { media_type: "STORIES", image_url: mediaUrl };

  const containerId = await graphPost(`/${igUserId}/media`, pageToken, body);
  await waitContainerReady(containerId, pageToken);
  const mediaId = await graphPost(`/${igUserId}/media_publish`, pageToken, {
    creation_id: containerId,
  });
  return { containerId, mediaId, mediaUrl };
}

/** Instagram DM javob (Page Messaging / IG) */
export async function sendInstagramDm(recipientId: string, text: string) {
  const pageToken =
    (await getSetting("instagram_page_token")) || process.env.INSTAGRAM_PAGE_TOKEN || "";
  if (!pageToken) throw new IgPublishError("Page token yo‘q");

  const res = await fetch(
    `${GRAPH}/me/messages?access_token=${encodeURIComponent(pageToken)}`,
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
