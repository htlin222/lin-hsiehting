#!/usr/bin/env node
// Mint DOIs for medical posts via Zenodo, then write the DOI back into
// each .mdx's frontmatter. Sandbox by default. Production requires
// --production AND a token issued from https://zenodo.org (not sandbox).
//
// Usage:
//   node scripts/zenodo-mint.mjs [--production] [--dry-run] [--slug=<sub>]
//
// Required env:
//   ZENODO_TOKEN    Personal access token with `deposit:write deposit:actions`
//                   issued from sandbox.zenodo.org (default) or zenodo.org
//                   (when --production).
//
// Behaviour:
//   - Walks src/posts/**/*.mdx
//   - Skips: draft, non-medical, posts that already have `doi:` set
//   - For each remaining post:
//       1. POST  /api/deposit/depositions               → create draft
//       2. PUT   <bucket>/<filename>                    → upload raw .mdx
//       3. POST  /api/deposit/depositions/<id>/actions/publish
//       4. Write `doi:` and `conceptDoi:` back to frontmatter
//   - Exit non-zero on any error.

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "src", "posts");

const args = process.argv.slice(2);
const isProduction = args.includes("--production");
const isDryRun = args.includes("--dry-run");
const slugArg = args.find((a) => a.startsWith("--slug="))?.slice(7);

const ZENODO_BASE = isProduction
    ? "https://zenodo.org"
    : "https://sandbox.zenodo.org";
// Accept both names: ZENODO_TOKEN (GH Actions secret convention) and
// ZENODO_PAT (local .env convention).
const ZENODO_TOKEN = process.env.ZENODO_TOKEN || process.env.ZENODO_PAT;
const SITE_URL = "https://lin.hsiehting.com";
const ORCID = "0009-0002-3974-4528";
const AUTHOR_NAME = "Lin, Hsieh-Ting";
const AFFILIATION = "Koo Foundation Sun Yat-Sen Cancer Centre";

const colors = {
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

if (!ZENODO_TOKEN && !isDryRun) {
    console.error(
        colors.red("✗ ZENODO_PAT (or ZENODO_TOKEN) is not set"),
    );
    console.error(
        colors.dim(
            "  put it in .env (loaded via --env-file) or pass --dry-run to preview without network",
        ),
    );
    process.exit(2);
}

function stripQuotes(s) {
    const t = s.trim();
    if (
        (t.startsWith('"') && t.endsWith('"')) ||
        (t.startsWith("'") && t.endsWith("'"))
    ) {
        return t.slice(1, -1);
    }
    return t;
}

function parseFrontmatter(raw) {
    if (!raw.startsWith("---")) return null;
    const end = raw.indexOf("\n---", 3);
    if (end === -1) return null;
    const yaml = raw.slice(3, end).replace(/^\n/, "");
    const data = {};
    let currentKey = null;
    for (const line of yaml.split("\n")) {
        if (!line.trim()) continue;
        const arr = line.match(/^\s+-\s+(.+)$/);
        if (arr && currentKey && Array.isArray(data[currentKey])) {
            data[currentKey].push(stripQuotes(arr[1]));
            continue;
        }
        const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
        if (!kv) continue;
        const [, key, valueRaw] = kv;
        currentKey = key;
        const value = valueRaw.trim();
        if (value === "" || value === "[]") {
            data[key] = value === "[]" ? [] : "";
        } else if (value.startsWith("[") && value.endsWith("]")) {
            data[key] = value
                .slice(1, -1)
                .split(",")
                .map((s) => stripQuotes(s.trim()))
                .filter(Boolean);
        } else if (value === "true" || value === "false") {
            data[key] = value === "true";
        } else {
            data[key] = stripQuotes(value);
        }
    }
    return { data, fmEnd: end };
}

function setFrontmatterFields(raw, fields) {
    const fmEnd = raw.indexOf("\n---", 3);
    if (fmEnd === -1) throw new Error("no frontmatter");
    let fm = raw.slice(0, fmEnd);
    for (const [k, v] of Object.entries(fields)) {
        if (v == null || v === "") continue;
        const re = new RegExp(`^${k}:\\s*.*$`, "m");
        const line = `${k}: "${v}"`;
        if (re.test(fm)) fm = fm.replace(re, line);
        else fm = fm.replace(/\s*$/, "") + "\n" + line;
    }
    return fm + raw.slice(fmEnd);
}

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

function isoDate(s) {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[1]}-${m[2]}`;
    return s;
}

function escapeHtml(s) {
    return String(s).replace(
        /[&<>"']/g,
        (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
}

function buildMetadata(post, file) {
    const slug = path
        .relative(postsDir, file)
        .replace(/\.mdx$/, "")
        .split(path.sep)
        .join("/");
    const canonicalUrl = `${SITE_URL}/posts/${slug}/`;
    const pubDate = isoDate(post.date || "");
    const reviewBlock = post.reviewer
        ? `<p><strong>審稿醫師：</strong>${escapeHtml(post.reviewer)}` +
          (post.reviewerCredentials
              ? `（${escapeHtml(post.reviewerCredentials)}）`
              : "") +
          (post.reviewedDate
              ? `<br/><strong>審稿日期：</strong>${isoDate(post.reviewedDate)}`
              : "") +
          `</p>`
        : "";
    const description =
        `<p>${escapeHtml(post.frontmatter || "")}</p>` +
        `<p><strong>線上閱讀：</strong><a href="${canonicalUrl}">${canonicalUrl}</a></p>` +
        (post.medicalCondition
            ? `<p><strong>主題：</strong>${escapeHtml(post.medicalCondition)}</p>`
            : "") +
        reviewBlock;

    return {
        metadata: {
            title: post.title,
            creators: [
                {
                    name: AUTHOR_NAME,
                    orcid: ORCID,
                    affiliation: AFFILIATION,
                },
            ],
            description,
            publication_date: pubDate,
            language: "zho",
            keywords: Array.isArray(post.tags) ? post.tags : [],
            upload_type: "publication",
            publication_type: "article",
            access_right: "open",
            license: "cc-by-nc-nd-4.0",
            related_identifiers: [
                {
                    relation: "isPublishedIn",
                    identifier: canonicalUrl,
                    scheme: "url",
                },
            ],
            notes:
                "本文發表於「林協霆 · 臨床筆記」（lin.hsiehting.com），並依 CC BY-NC-ND 4.0 授權同步存檔於 Zenodo。",
        },
    };
}

async function api(method, urlPath, body, contentType = "application/json") {
    const url = urlPath.startsWith("http")
        ? urlPath
        : `${ZENODO_BASE}${urlPath}`;
    const headers = { Authorization: `Bearer ${ZENODO_TOKEN}` };
    let payload;
    if (body !== undefined) {
        if (contentType === "application/json") {
            headers["Content-Type"] = contentType;
            payload = JSON.stringify(body);
        } else {
            headers["Content-Type"] = contentType;
            payload = body;
        }
    }
    const res = await fetch(url, { method, headers, body: payload });
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        // non-JSON response, keep text
    }
    if (!res.ok) {
        const err = new Error(`Zenodo ${method} ${urlPath} → ${res.status}`);
        err.status = res.status;
        err.body = json ?? text;
        throw err;
    }
    return json;
}

async function mintOne(file) {
    const raw = await readFile(file, "utf8");
    const parsed = parseFrontmatter(raw);
    if (!parsed) return { skipped: "no-frontmatter", file };
    const post = parsed.data;
    if (post.draft) return { skipped: "draft", file };
    if (post.citable !== true)
        return { skipped: "not-citable (set frontmatter `citable: true`)", file };
    if (post.doi) return { skipped: "has-doi", file, doi: post.doi };

    const meta = buildMetadata(post, file);
    console.log(colors.cyan(`→ ${path.relative(root, file)}`));
    console.log(`  title: ${post.title}`);
    if (isDryRun) {
        console.log(colors.dim("  [dry-run] would deposit metadata:"));
        console.log(
            JSON.stringify(meta, null, 2)
                .split("\n")
                .map((l) => colors.dim("    " + l))
                .join("\n"),
        );
        return { dryRun: true };
    }

    const created = await api("POST", "/api/deposit/depositions", meta);
    const id = created.id;
    const bucket = created.links?.bucket;
    if (!bucket) throw new Error(`deposit ${id} returned no bucket URL`);
    console.log(colors.dim(`  created deposit ${id}`));

    const fileBuf = await readFile(file);
    const filename = path.basename(file);
    await api(
        "PUT",
        `${bucket}/${filename}`,
        fileBuf,
        "application/octet-stream",
    );
    console.log(colors.dim(`  uploaded ${filename} (${fileBuf.length} bytes)`));

    const published = await api(
        "POST",
        `/api/deposit/depositions/${id}/actions/publish`,
    );
    const doi = published.doi;
    const conceptDoi =
        published.conceptdoi ||
        published.metadata?.relations?.version?.[0]?.parent?.pid_value ||
        null;
    console.log(
        colors.green(
            `  ✓ doi=${doi}${conceptDoi ? `  conceptDoi=${conceptDoi}` : ""}`,
        ),
    );

    const updated = setFrontmatterFields(raw, { doi, conceptDoi });
    await writeFile(file, updated);
    console.log(colors.dim(`  wrote DOI to ${path.relative(root, file)}`));

    return { file, doi, conceptDoi };
}

async function main() {
    console.log(
        `Zenodo target: ${colors.cyan(ZENODO_BASE)}${
            isDryRun ? colors.yellow(" (DRY RUN)") : ""
        }`,
    );
    if (isProduction && !isDryRun) {
        console.log(
            colors.yellow(
                "⚠ PRODUCTION mint — published DOIs are permanent. ⌃C now if uncertain.",
            ),
        );
    }
    const files = await walk(postsDir);
    let target = files;
    if (slugArg) {
        target = files.filter((f) => f.includes(slugArg));
        if (target.length === 0) {
            console.error(`no posts matched --slug=${slugArg}`);
            process.exit(2);
        }
    }
    let minted = 0;
    let skipped = 0;
    let errored = 0;
    for (const file of target) {
        try {
            const result = await mintOne(file);
            if (result?.skipped) {
                if (slugArg)
                    console.log(
                        colors.dim(
                            `  skipped ${path.relative(root, file)} (${result.skipped})`,
                        ),
                    );
                skipped++;
            } else if (!result?.dryRun) {
                minted++;
            }
        } catch (err) {
            errored++;
            console.error(
                colors.red(`✗ ${path.relative(root, file)}: ${err.message}`),
            );
            if (err.body) {
                const body =
                    typeof err.body === "string"
                        ? err.body
                        : JSON.stringify(err.body, null, 2);
                console.error(
                    body
                        .split("\n")
                        .map((l) => "    " + l)
                        .join("\n"),
                );
            }
        }
    }
    console.log("");
    const summary = `${colors.green(`${minted} minted`)}, ${colors.dim(`${skipped} skipped`)}, ${
        errored > 0 ? colors.red(`${errored} errored`) : `${errored} errored`
    }`;
    console.log(summary);
    process.exit(errored > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(colors.red(`fatal: ${err?.stack ?? err}`));
    process.exit(2);
});
