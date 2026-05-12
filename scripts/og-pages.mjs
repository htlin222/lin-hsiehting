#!/usr/bin/env node
// Generate static OG images (1200x630) for non-post pages: home / about / cv /
// tags index / a default fallback. Mirrors the post OG style so the social
// preview stays consistent across the whole site.
//
// Usage:
//   pnpm run og:pages              # render all page OGs (skips up-to-date PNGs)
//   pnpm run og:pages -- --force   # re-render every page OG
//
// Output: public/og/pages/<slug>.png

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const ogOutDir = path.join(root, "public", "og", "pages");
const fontCacheDir = path.join(root, "node_modules", ".cache", "og-fonts");

const FONT_URL =
    "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf";
const FONT_CACHE = path.join(fontCacheDir, "NotoSansCJKtc-Bold.otf");

const args = process.argv.slice(2);
const force = args.includes("--force");

const colors = {
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
};

const SITE_TITLE = "林協霆 · 臨床筆記";
const SITE_URL = "lin.hsiehting.com";
const AUTHOR_LINE = "林協霆 M.D.";
// Avoid ampersands — satori-html doesn't decode HTML entities, so an `&`
// (escaped to `&amp;` upstream) would render literally as "Hematology &amp; ...".
const CRED_LINE = "腫瘤內科專科醫師 · Hematology, Medical Oncology";
const ACCENT = "#2c5f3a";

const PAGES = [
    {
        slug: "home",
        eyebrow: SITE_TITLE,
        title: "腫瘤內科衛教筆記",
        subtitle: "Clinical notes in hematology and medical oncology",
    },
    {
        slug: "about",
        eyebrow: SITE_TITLE,
        title: "關於 · About",
        subtitle: "編輯方針、學經歷與聯絡方式",
    },
    {
        slug: "cv",
        eyebrow: SITE_TITLE,
        title: "Curriculum Vitae",
        subtitle: "Hsieh-Ting Lin, M.D. — bilingual (zh-TW + English)",
    },
    {
        slug: "tags",
        eyebrow: SITE_TITLE,
        title: "標籤 · Tags",
        subtitle: "依主題瀏覽文章",
    },
    {
        slug: "portfolio",
        eyebrow: SITE_TITLE,
        title: "Portfolio",
        subtitle: "GitHub repos — medical and developer tools",
    },
    {
        slug: "default",
        eyebrow: SITE_TITLE,
        title: "腫瘤內科衛教筆記",
        subtitle: "醫學新知與病人衛生教育（醫療法 §87.2）",
    },
];

async function fetchFont() {
    if (existsSync(FONT_CACHE)) return readFile(FONT_CACHE);
    console.log(
        colors.dim(
            `Downloading Noto Sans TC Bold (~9MB)\n  ${FONT_URL}\n  → ${path.relative(root, FONT_CACHE)}`,
        ),
    );
    await mkdir(fontCacheDir, { recursive: true });
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`font download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(FONT_CACHE, buf);
    return buf;
}

async function getAvatarDataUrl() {
    const buf = await sharp(path.join(root, "src/assets/images/avatar.jpg"))
        .resize(220, 220, { fit: "cover" })
        .png({ compressionLevel: 9 })
        .toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
}

function escapeHtml(s) {
    return String(s).replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c],
    );
}

function buildTree({ eyebrow, title, subtitle, avatarDataUrl }) {
    return html(`
<div style="width:1200px;height:630px;display:flex;flex-direction:column;padding:80px 96px;background:#fcfcf9;font-family:'Noto Sans TC';">
  <div style="display:flex;align-items:center;">
    <div style="display:flex;width:48px;height:6px;background:${ACCENT};border-radius:3px;"></div>
    <div style="display:flex;margin-left:20px;font-size:26px;color:#6f6f6f;letter-spacing:0.18em;"><span>${escapeHtml(eyebrow)}</span></div>
  </div>

  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:48px 0;">
    <div style="display:flex;font-size:84px;font-weight:700;color:#1a1a1a;line-height:1.1;letter-spacing:-0.01em;"><span>${escapeHtml(title)}</span></div>
    <div style="display:flex;margin-top:24px;font-size:30px;color:#555;line-height:1.35;"><span>${escapeHtml(subtitle)}</span></div>
  </div>

  <div style="display:flex;align-items:center;padding-top:32px;border-top:2px solid #e5e2d8;">
    <img src="${avatarDataUrl}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid ${ACCENT};" />
    <div style="display:flex;flex-direction:column;margin-left:24px;">
      <div style="display:flex;font-size:32px;font-weight:700;color:#1a1a1a;"><span>${escapeHtml(AUTHOR_LINE)}</span></div>
      <div style="display:flex;font-size:22px;color:#555;margin-top:4px;"><span>${escapeHtml(CRED_LINE)}</span></div>
    </div>
    <div style="display:flex;margin-left:auto;font-size:26px;color:#6f6f6f;letter-spacing:0.04em;"><span>${escapeHtml(SITE_URL)}</span></div>
  </div>
</div>
`);
}

async function renderOne(page, { fontData, avatarDataUrl }) {
    const tree = buildTree({ ...page, avatarDataUrl });
    const svg = await satori(tree, {
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
    const png = await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();
    const outPath = path.join(ogOutDir, `${page.slug}.png`);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, png);
    return { outPath, bytes: png.length };
}

async function main() {
    const fontData = await fetchFont();
    const avatarDataUrl = await getAvatarDataUrl();

    let rendered = 0;
    let skipped = 0;
    for (const page of PAGES) {
        const outPath = path.join(ogOutDir, `${page.slug}.png`);
        if (!force && existsSync(outPath)) {
            console.log(colors.dim(`= ${path.relative(root, outPath)} (cached)`));
            skipped++;
            continue;
        }
        const { bytes } = await renderOne(page, { fontData, avatarDataUrl });
        console.log(
            colors.green(
                `✓ ${path.relative(root, outPath)} (${(bytes / 1024).toFixed(1)} KB)`,
            ),
        );
        rendered++;
    }
    console.log("");
    console.log(`${colors.cyan(`${rendered} rendered`)}, ${colors.dim(`${skipped} skipped`)}`);
}

main().catch((err) => {
    console.error(colors.red(`fatal: ${err?.stack ?? err}`));
    process.exit(1);
});
