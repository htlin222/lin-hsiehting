#!/usr/bin/env node
// Render single-page CV PDFs (zh-TW + English) from /print/cv-zh and /print/cv-en.
//
// Usage:
//   pnpm run pdf:cv                         # render both
//   pnpm run pdf:cv -- --base=http://...    # override base URL
//
// Strategy:
//   1. start with default density, render to PDF
//   2. count rendered pages; if > 1, inject a tighter density CSS and retry
//   3. give up after MAX_ITERS — but log loudly so we can hand-tune
//
// Requires:
//   - dist/ already built (pnpm run build)
//   - static server running at baseUrl
//   - playwright + chromium installed

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "pdf");

const args = new Map();
for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args.set(m[1], m[2] === undefined ? true : m[2]);
}

const baseUrl = (args.get("base") || "http://127.0.0.1:4321").replace(/\/+$/, "");
const MAX_ITERS = 6;

const targets = [
    { slug: "cv-zh", out: "cv-zh.pdf" },
    { slug: "cv-en", out: "cv-en.pdf" },
];

// Progressively tighter typographic overrides applied via injected CSS.
// Each iter overrides custom properties on `:root` — the print-cv.css picks them up.
const densityLadder = [
    null, // iter 0: default (~8.6pt)
    { font: "8.3pt", line: "1.28", gap: "4pt", section: "7pt", name: "15.5pt" },
    { font: "8.1pt", line: "1.26", gap: "3.5pt", section: "6.5pt", name: "15pt" },
    { font: "7.9pt", line: "1.24", gap: "3.2pt", section: "6pt", name: "14.5pt" },
    { font: "7.7pt", line: "1.22", gap: "3pt", section: "5.5pt", name: "14pt" },
    { font: "7.5pt", line: "1.2", gap: "2.8pt", section: "5pt", name: "13.5pt" },
];

function cssFor(d) {
    if (!d) return "";
    return `
        :root {
            --cv-font: ${d.font};
            --cv-line: ${d.line};
            --cv-gap: ${d.gap};
            --cv-section-gap: ${d.section};
        }
        .cv-name { font-size: ${d.name}; }
    `;
}

async function renderOne(ctx, target) {
    const url = `${baseUrl}/print/${target.slug}/`;
    const dest = path.join(outDir, target.out);
    await mkdir(path.dirname(dest), { recursive: true });

    let success = false;
    let pages = null;
    let iter = 0;

    for (; iter < MAX_ITERS && iter < densityLadder.length; iter++) {
        const page = await ctx.newPage();
        page.setDefaultTimeout(45_000);

        const response = await page.goto(url, { waitUntil: "networkidle" });
        if (!response || response.status() >= 400) {
            await page.close();
            throw new Error(
                `failed to load ${url} (status ${response?.status() ?? "??"})`,
            );
        }

        const extraCss = cssFor(densityLadder[iter]);
        if (extraCss) {
            await page.addStyleTag({ content: extraCss });
        }

        await page.emulateMedia({ media: "print" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" },
            preferCSSPageSize: true,
            displayHeaderFooter: false,
        });

        // Count pages by counting "/Type /Page" objects in the raw PDF.
        // Playwright doesn't expose page count directly; this is good enough for A4 jobs.
        const buf = Buffer.from(pdfBuffer);
        const text = buf.toString("latin1");
        pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;

        if (pages <= 1) {
            const { writeFile } = await import("node:fs/promises");
            await writeFile(dest, pdfBuffer);
            success = true;
            await page.close();
            console.log(
                `  ✓ ${target.slug} → ${path.relative(root, dest)} (iter ${iter}, ${pages} page)`,
            );
            break;
        }

        await page.close();
        console.log(
            `  · ${target.slug} iter ${iter}: ${pages} pages — tightening…`,
        );
    }

    if (!success) {
        // Force-write the last attempt so user can inspect it, then fail loudly.
        const { writeFile } = await import("node:fs/promises");
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        const last = densityLadder[Math.min(iter, densityLadder.length - 1)];
        const extraCss = cssFor(last);
        if (extraCss) await page.addStyleTag({ content: extraCss });
        await page.emulateMedia({ media: "print" });
        const buf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" },
            preferCSSPageSize: true,
        });
        await writeFile(dest, buf);
        await page.close();
        throw new Error(
            `could not fit ${target.slug} onto one page after ${MAX_ITERS} iterations (last attempt at ${pages} pages, written to ${path.relative(root, dest)} for inspection)`,
        );
    }
}

async function main() {
    console.log(`base: ${baseUrl}`);
    console.log(`rendering ${targets.length} CV PDF(s) → ${path.relative(root, outDir)}/`);

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const ctx = await browser.newContext();

    let failed = 0;
    for (const target of targets) {
        try {
            await renderOne(ctx, target);
        } catch (e) {
            failed++;
            console.error(`  ✗ ${target.slug} — ${e.message}`);
        }
    }

    await ctx.close();
    await browser.close();

    console.log(`\n${targets.length - failed} ok, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
