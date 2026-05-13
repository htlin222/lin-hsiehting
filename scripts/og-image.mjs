#!/usr/bin/env node
// Generate static OG images (1200x630) for posts using satori + sharp.
// Style: minimalist GitHub-style social card — site eyebrow, big title,
// avatar + author byline + URL strip at the bottom with a thin accent line.
//
// Usage:
//   pnpm run og:preview                       # render the most recent post only
//   pnpm run og -- --slug=<sub>               # render one matching post
//   pnpm run og -- --all                      # render every non-draft post
//   pnpm run og -- --all --force              # re-render even if PNG exists
//
// Output: public/og/<post-id>.png (preserves YYYY/<slug> structure)
//
// Font: Noto Sans TC Bold from notofonts/noto-cjk (~9MB).
//   Cached to node_modules/.cache/og-fonts/ on first run.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "src", "posts");
const ogOutDir = path.join(root, "public", "og");
const fontCacheDir = path.join(root, "node_modules", ".cache", "og-fonts");

const FONT_URL =
    "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Bold.otf";
const FONT_CACHE = path.join(fontCacheDir, "NotoSansCJKtc-Bold.otf");

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith("--slug="))?.slice(7);
const all = args.includes("--all");
const force = args.includes("--force");

const colors = {
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
};

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

function parseFrontmatter(raw) {
    if (!raw.startsWith("---")) return null;
    const end = raw.indexOf("\n---", 3);
    if (end === -1) return null;
    const yaml = raw.slice(3, end).replace(/^\n/, "");
    const data = {};
    for (const line of yaml.split("\n")) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if (
            (v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))
        ) {
            v = v.slice(1, -1);
        }
        if (v === "true") v = true;
        else if (v === "false") v = false;
        data[m[1]] = v;
    }
    return data;
}

const SITE_TITLE = "林協霆 · 臨床筆記";
const SITE_URL = "lin.hsiehting.com";
const AUTHOR_LINE = "林協霆 M.D.";
const CRED_LINE = "腫瘤內科專科醫師";
const ACCENT = "#2c5f3a"; // lizard green from favicon

function buildTree({ title, avatarDataUrl }) {
    // Satori: every div with >1 child needs explicit display:flex.
    // We also wrap text nodes in <span> to keep child counts unambiguous.
    return html(`
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
</div>
`);
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

async function renderOne({ slug, title }, { fontData, avatarDataUrl }) {
    const tree = buildTree({ title, avatarDataUrl });
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
    const outPath = path.join(ogOutDir, `${slug}.png`);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, png);
    return { outPath, bytes: png.length };
}

async function walk(dir) {
    const out = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...(await walk(full)));
        else if (e.name.endsWith(".mdx")) out.push(full);
    }
    return out;
}

async function main() {
    const files = await walk(postsDir);
    if (files.length === 0) {
        console.error(colors.red("no posts found"));
        process.exit(1);
    }

    let fontData = null;
    let avatarDataUrl = null;

    let targets;
    if (slugArg) {
        targets = files.filter((f) => f.includes(slugArg));
        if (targets.length === 0) {
            console.error(colors.red(`no posts matched --slug=${slugArg}`));
            process.exit(1);
        }
    } else if (all) {
        targets = files;
    } else {
        // default: most recent by mtime, useful for previewing
        targets = [
            files
                .map((f) => ({ f, m: statSync(f).mtimeMs }))
                .sort((a, b) => b.m - a.m)[0].f,
        ];
    }

    let rendered = 0;
    let skipped = 0;
    for (const file of targets) {
        const raw = await readFile(file, "utf8");
        const data = parseFrontmatter(raw);
        if (!data) continue;
        if (data.draft) {
            skipped++;
            continue;
        }
        const slug = path
            .relative(postsDir, file)
            .replace(/\.mdx$/, "")
            .split(path.sep)
            .join("/");
        const outPath = path.join(ogOutDir, `${slug}.png`);
        if (!force && existsSync(outPath)) {
            console.log(colors.dim(`= ${path.relative(root, outPath)} (cached)`));
            skipped++;
            continue;
        }
        if (!fontData) fontData = await fetchFont();
        if (!avatarDataUrl) avatarDataUrl = await getAvatarDataUrl();
        const { bytes } = await renderOne(
            { slug, title: data.title || "(untitled)" },
            { fontData, avatarDataUrl },
        );
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
