// Cloudflare Pages Function — renders /og/<year>/<slug>.png on demand.
// Replaces the build-time `scripts/og-image.mjs --all` step; the OG URL shape
// is preserved (Layout.astro still emits `/og/<post-id>.png`), the post title
// is passed in `?t=<title>` by [...slug].astro so the Function can render it
// without a slug→title manifest.

import { ImageResponse, loadGoogleFont } from "workers-og";

interface Env {
    ASSETS: { fetch: (input: RequestInfo | URL) => Promise<Response> };
}

interface Ctx {
    request: Request;
    env: Env;
    waitUntil: (promise: Promise<unknown>) => void;
}

const SITE_TITLE = "林協霆 · 臨床筆記";
const SITE_URL = "lin.hsiehting.com";
const AUTHOR_LINE = "林協霆 M.D.";
const CRED_LINE = "腫瘤內科專科醫師";
const ACCENT = "#2c5f3a";

// Bump when the visual design changes so caches.default re-renders.
const DESIGN_VERSION = "1";

const ESC: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);

// Per-isolate caches — avatar bytes never change, font bytes only change when
// the title's glyph set differs (Google Fonts subset key).
let cachedAvatar: string | null = null;
const fontCache = new Map<string, ArrayBuffer>();

async function getAvatarDataUrl(env: Env, origin: string): Promise<string> {
    if (cachedAvatar) return cachedAvatar;
    const res = await env.ASSETS.fetch(new URL("/og-assets/avatar-220.png", origin));
    if (!res.ok) throw new Error(`avatar fetch failed: ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    cachedAvatar = `data:image/png;base64,${btoa(bin)}`;
    return cachedAvatar;
}

async function getFontData(text: string): Promise<ArrayBuffer> {
    // Dedup glyph-set so isolates with similar titles reuse the same subset.
    const key = [...new Set(text)].sort().join("");
    const hit = fontCache.get(key);
    if (hit) return hit;
    const data = await loadGoogleFont({
        family: "Noto Sans TC",
        weight: 700,
        text,
    });
    fontCache.set(key, data);
    return data;
}

// Satori needs every flex parent declared; text nodes wrapped in <span> so
// child counts are unambiguous. Mirrors scripts/og-image.mjs.
function buildHtml(title: string, avatarDataUrl: string): string {
    return `
<div style="width:1200px;height:630px;display:flex;flex-direction:column;padding:80px 96px;background:#fcfcf9;font-family:'Noto Sans TC';">
  <div style="display:flex;align-items:center;">
    <div style="display:flex;width:48px;height:6px;background:${ACCENT};border-radius:3px;"></div>
    <div style="display:flex;margin-left:20px;font-size:26px;color:#6f6f6f;letter-spacing:0.18em;"><span>${escapeHtml(SITE_TITLE)}</span></div>
  </div>
  <div style="flex:1;display:flex;align-items:center;padding:48px 0;">
    <div style="display:flex;font-size:72px;font-weight:700;color:#1a1a1a;line-height:1.18;letter-spacing:-0.01em;"><span>${escapeHtml(title)}</span></div>
  </div>
  <div style="display:flex;align-items:center;padding-top:32px;border-top:2px solid #e5e2d8;">
    <img src="${avatarDataUrl}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid ${ACCENT};" />
    <div style="display:flex;flex-direction:column;margin-left:24px;">
      <div style="display:flex;font-size:32px;font-weight:700;color:#1a1a1a;"><span>${escapeHtml(AUTHOR_LINE)}</span></div>
      <div style="display:flex;font-size:24px;color:#555;margin-top:4px;"><span>${escapeHtml(CRED_LINE)}</span></div>
    </div>
    <div style="display:flex;margin-left:auto;font-size:26px;color:#6f6f6f;letter-spacing:0.04em;"><span>${escapeHtml(SITE_URL)}</span></div>
  </div>
</div>`;
}

export const onRequestGet = async ({
    request,
    env,
    waitUntil,
}: Ctx): Promise<Response> => {
    const url = new URL(request.url);

    // Only handle `/og/<year>/<slug>.png`. The `[[path]]` catch-all also
    // matches `/og/pages/home.png` etc., but those are static assets generated
    // by scripts/og-pages.mjs — delegate to env.ASSETS so they keep working.
    const m = url.pathname.match(/^\/og\/(\d{4})\/([a-z0-9-]+)\.png$/);
    if (!m) return env.ASSETS.fetch(request);

    const rawTitle = url.searchParams.get("t");
    if (!rawTitle) {
        return new Response("Missing ?t= title", { status: 400 });
    }
    const title = rawTitle.slice(0, 200);

    // Cache key: origin + path + title + design version. Edge cache keys must
    // be a Request to a same-origin URL.
    const cacheKey = new Request(
        `${url.origin}${url.pathname}?t=${encodeURIComponent(title)}&v=${DESIGN_VERSION}`,
        { method: "GET" },
    );
    const cache = (caches as unknown as { default: Cache }).default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // Subset font to just the glyphs that appear on this card.
    const glyphText = title + SITE_TITLE + AUTHOR_LINE + CRED_LINE + SITE_URL;
    const [fontData, avatarDataUrl] = await Promise.all([
        getFontData(glyphText),
        getAvatarDataUrl(env, url.origin),
    ]);

    const html = buildHtml(title, avatarDataUrl);

    const rendered = new ImageResponse(html, {
        width: 1200,
        height: 630,
        fonts: [
            {
                name: "Noto Sans TC",
                data: fontData,
                weight: 700,
                style: "normal",
            },
        ],
    });

    // Buffer once so we can both store and serve.
    const png = await rendered.arrayBuffer();
    const headers = new Headers({
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    });
    const response = new Response(png, { headers });
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
};
