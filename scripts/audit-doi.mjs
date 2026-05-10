#!/usr/bin/env node
// Audit DOI links inside src/posts/**/*.mdx — confirm each resolves with a
// 2xx/3xx so dead references don't ship. Network only; no frontmatter checks
// (those live in audit-posts.mjs).
//
// Usage:
//   pnpm run audit:doi               # check every doi.org URL
//   pnpm run audit:doi -- --quiet    # only print failures + summary

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "src", "posts");

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const concurrency = 5;
const timeoutMs = 12_000;

const colors = {
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

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

const DOI_RE = /https?:\/\/(?:dx\.)?doi\.org\/[^\s)\]"'<>]+/g;

function extractDois(text) {
    const hits = [];
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const matches = lines[i].matchAll(DOI_RE);
        for (const m of matches) {
            // Strip trailing markdown punctuation that may leak into the match.
            const url = m[0].replace(/[.,;:!?]+$/, "");
            hits.push({ line: i + 1, url });
        }
    }
    return hits;
}

async function fetchOne(url) {
    // We only verify the DOI is registered (i.e. doi.org redirects). We do
    // NOT follow into the publisher's landing page — many publishers 403 on
    // HEAD/GET without a browser session, which is irrelevant to whether
    // the DOI exists.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: "HEAD",
            redirect: "manual",
            signal: ctrl.signal,
            headers: { "User-Agent": "lin-hsiehting-doi-audit/1.0" },
        });
        // doi.org returns 302/303 with a Location header for valid DOIs,
        // 404 for unregistered ones. fetch's `redirect: manual` surfaces the
        // 30x as `res.status` directly (in Node 22+).
        const ok = res.status >= 200 && res.status < 400;
        return { ok, status: res.status, location: res.headers.get("location") };
    } catch (err) {
        return {
            ok: false,
            status: 0,
            error:
                err?.name === "AbortError"
                    ? "timeout"
                    : err?.message ?? "fetch error",
        };
    } finally {
        clearTimeout(timer);
    }
}

async function runWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function pull() {
        while (true) {
            const i = next++;
            if (i >= items.length) return;
            results[i] = await worker(items[i], i);
        }
    }
    const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
        pull(),
    );
    await Promise.all(runners);
    return results;
}

async function main() {
    const files = await walk(postsDir);
    const records = [];
    for (const file of files) {
        const raw = await readFile(file, "utf8");
        const dois = extractDois(raw);
        for (const d of dois) records.push({ file, ...d });
    }
    if (records.length === 0) {
        console.log(colors.green("✓ no DOI links found in posts"));
        return;
    }

    // Dedupe by URL — a 404 on shared DOI is reported under all files using it.
    const byUrl = new Map();
    for (const r of records) {
        if (!byUrl.has(r.url)) byUrl.set(r.url, []);
        byUrl.get(r.url).push(r);
    }
    const uniqueUrls = [...byUrl.keys()];

    if (!quiet) {
        console.log(
            colors.dim(
                `Checking ${uniqueUrls.length} unique DOI(s) across ${records.length} reference(s) in ${files.length} post(s)…`,
            ),
        );
    }

    const results = await runWithConcurrency(uniqueUrls, concurrency, async (url) => ({
        url,
        ...(await fetchOne(url)),
    }));

    let errors = 0;
    let warnings = 0;
    for (const r of results) {
        const refs = byUrl.get(r.url);
        if (r.ok) {
            if (!quiet) {
                for (const ref of refs) {
                    const rel = path.relative(root, ref.file);
                    console.log(
                        `${colors.green("OK  ")} ${rel}:${ref.line} — ${r.status} ${r.url}`,
                    );
                }
            }
        } else {
            const tag =
                r.status === 0 || r.status >= 500
                    ? colors.yellow("WARN")
                    : colors.red("ERR ");
            for (const ref of refs) {
                const rel = path.relative(root, ref.file);
                const detail = r.error ? r.error : `HTTP ${r.status}`;
                console.log(`${tag} ${rel}:${ref.line} — ${detail} ${r.url}`);
                if (tag.includes("31")) errors++;
                else warnings++;
            }
        }
    }

    console.log("");
    if (errors === 0 && warnings === 0) {
        console.log(
            colors.green(
                `✓ ${uniqueUrls.length} DOI(s) audited, all resolve`,
            ),
        );
    } else {
        console.log(
            `${colors.dim(`audited ${uniqueUrls.length} DOI(s) —`)} ` +
                `${colors.red(`${errors} error(s)`)}, ${colors.yellow(`${warnings} warning(s)`)}`,
        );
        console.log(
            colors.dim(
                "  WARN = network/timeout/5xx (transient); ERR = 4xx (likely dead)",
            ),
        );
    }
    process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
