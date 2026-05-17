#!/usr/bin/env node
// Render journal-style PDFs from /print/<slug> routes using Playwright.
//
// Usage:
//   pnpm run pdf                         # render every non-draft post
//   pnpm run pdf -- --slug=<sub>         # render posts whose id contains <sub>
//   pnpm run pdf -- --force              # re-render even if PDF exists
//   pnpm run pdf -- --base=http://...    # override base URL (default localhost preview)
//
// Output: public/pdf/<post-id>.pdf (mirrors src/posts/<post-id>.mdx structure).
//
// Requires:
//   - dist/ already built (`pnpm run build`)
//   - a static server already serving dist/ at the base URL
//   - playwright + chromium installed (`npx playwright install chromium`)
//
// In CI (.github/workflows/pdf-build.yml) the workflow:
//   1. pnpm install
//   2. pnpm run build
//   3. start a static server in the background (npx http-server dist -p 4321)
//   4. npx playwright install --with-deps chromium
//   5. node scripts/render-pdfs.mjs --base=http://127.0.0.1:4321 --all
//
// Locally:
//   1. pnpm run build && pnpm run preview &
//   2. node scripts/render-pdfs.mjs

import { readFile, readdir, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "src", "posts");
const outDir = path.join(root, "public", "pdf");

const args = new Map();
for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args.set(m[1], m[2] === undefined ? true : m[2]);
}

const baseUrl = (args.get("base") || "http://127.0.0.1:4321").replace(
    /\/+$/,
    "",
);
const slugFilter = typeof args.get("slug") === "string" ? args.get("slug") : null;
const force = !!args.get("force");

async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const out = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...(await walk(full)));
        else if (entry.isFile() && entry.name.endsWith(".mdx")) out.push(full);
    }
    return out;
}

function parseDraft(raw) {
    if (!raw.startsWith("---")) return false;
    const end = raw.indexOf("\n---", 3);
    if (end === -1) return false;
    const yaml = raw.slice(3, end);
    return /^draft:\s*true\s*$/m.test(yaml);
}

async function listPosts() {
    const files = await walk(postsDir);
    const posts = [];
    for (const file of files) {
        const raw = await readFile(file, "utf8");
        if (parseDraft(raw)) continue;
        const id = path.relative(postsDir, file).replace(/\.mdx$/, "");
        if (slugFilter && !id.includes(slugFilter)) continue;
        posts.push({ id, file });
    }
    posts.sort((a, b) => a.id.localeCompare(b.id));
    return posts;
}

async function renderOne(browserCtx, post) {
    // trailingSlash:'always' means dist serves /print/<slug>/index.html;
    // http-server doesn't auto-rewrite, so request the slash form directly.
    const url = `${baseUrl}/print/${post.id}/`;
    const dest = path.join(outDir, `${post.id}.pdf`);
    if (!force && existsSync(dest)) {
        const srcStat = await stat(post.file);
        const dstStat = await stat(dest);
        if (dstStat.mtimeMs >= srcStat.mtimeMs) {
            return { post, dest, status: "cached" };
        }
    }

    await mkdir(path.dirname(dest), { recursive: true });

    const page = await browserCtx.newPage();
    page.setDefaultTimeout(45_000);
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (!response || response.status() >= 400) {
        await page.close();
        throw new Error(
            `failed to load ${url} (status ${response?.status() ?? "??"})`,
        );
    }

    await page.emulateMedia({ media: "print" });
    await page.pdf({
        path: dest,
        format: "A4",
        printBackground: true,
        margin: {
            top: "22mm",
            bottom: "24mm",
            left: "18mm",
            right: "18mm",
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
    });
    await page.close();
    return { post, dest, status: "rendered" };
}

async function main() {
    const posts = await listPosts();
    if (posts.length === 0) {
        console.log("no posts to render");
        return;
    }

    console.log(`base: ${baseUrl}`);
    console.log(`rendering ${posts.length} post(s) → ${path.relative(root, outDir)}/`);

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const ctx = await browser.newContext();

    let rendered = 0;
    let cached = 0;
    let failed = 0;
    for (const post of posts) {
        try {
            const r = await renderOne(ctx, post);
            const rel = path.relative(root, r.dest);
            if (r.status === "cached") {
                cached++;
                console.log(`  · ${post.id} (cached, ${rel})`);
            } else {
                rendered++;
                console.log(`  ✓ ${post.id} → ${rel}`);
            }
        } catch (e) {
            failed++;
            console.error(`  ✗ ${post.id} — ${e.message}`);
        }
    }

    await ctx.close();
    await browser.close();

    console.log(`\n${rendered} rendered, ${cached} cached, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
