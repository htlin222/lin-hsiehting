#!/usr/bin/env node
// Fetch htlin222 public repos + READMEs and produce a categorised portfolio
// snapshot at src/data/github-portfolio.json. Categorises each repo as
// "medical" or "it" via keyword heuristics; the /portfolio page reads the
// snapshot at build time so no live GitHub API calls happen during build.
//
// Usage:
//   pnpm run portfolio:fetch        # refresh; README fetched incrementally
//   pnpm run portfolio:fetch:no-readme   # metadata only, skip README fetch
//   node scripts/fetch-github-portfolio.mjs --full-readme  # force full README re-fetch (backfill)
//
// Repo metadata (stars/forks/pushedAt) is ALWAYS fetched fresh (one GraphQL
// call). README excerpts are fetched INCREMENTALLY: a repo's README is only
// re-hit if it's new or was pushed since the previous snapshot's fetchedAt;
// otherwise the old excerpt is reused. This skips the heaviest, most
// rate-limit-prone part of the run. --full-readme forces a full re-fetch.
//
// Requires:
//   - gh CLI (authenticated)

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const outFile = path.join(root, "src", "data", "github-portfolio.json");

const args = process.argv.slice(2);
const skipReadme = args.includes("--no-readme");
const forceReadme = args.includes("--full-readme");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8)) || 500;
const concurrency = Number(args.find((a) => a.startsWith("--concurrency="))?.slice(14)) || 6;

const USER = "htlin222";

// Heuristic: classify a repo as medical if any of these substrings appears
// in the name, description, or topics (case-insensitive). Otherwise: it.
const MEDICAL_KEYWORDS = [
    // English
    "cancer", "oncology", "oncolog", "hematology", "hem-onc", "hemonc",
    "medical", "medicine", "clinical", "patient", "hospital", "pharmacy",
    "irb", "nccn", "ash-", "ash2", "asco", "esmo", "ehp", "ebmt",
    "pubmed", "pathology", "biostat", "biostatistics", "fda", "tfda",
    "ngs", "genomic", "transcriptom", "tcga", "geo", "scrna",
    "kfsyscc", "ntuh", "vghtpe", "hpv", "hbv",
    "manuscript", "literature", "lit-review", "lit review",
    "ema", "drug-drug", "ddi", "abim", "boards-",
    "neonat", "uro", "iron-metabolism", "tma", "tls", "tmle",
    "anki", "qbank", "prisma", "lymphoma", "leukemia", "myeloma",
    "vabysmo", "breast", "milk", "duty", "ICU", "sepsis",
    "survival", "cohort", "meta-analysis", "meta-pipe",
    "ebn", "ebm", "evidence",
    // 中文
    "醫療", "醫學", "腫瘤", "護理", "臨床", "病理", "中醫", "健保",
    "病人", "病友", "醫師", "病歷", "醫院", "衛福", "癌",
];

function classify(repo) {
    const haystack = [
        repo.name,
        repo.description ?? "",
        ...(repo.topics ?? []),
    ]
        .join(" ")
        .toLowerCase();
    return MEDICAL_KEYWORDS.some((kw) => haystack.includes(kw.toLowerCase()))
        ? "medical"
        : "it";
}

async function ghJson(args) {
    const { stdout } = await exec("gh", args, { maxBuffer: 100 * 1024 * 1024 });
    return JSON.parse(stdout);
}

// GitHub's GraphQL endpoint intermittently 502s on the heavy repo-list query.
// Retry transient 5xx / network errors with exponential backoff so a single
// blip doesn't waste a whole cron run.
async function ghJsonRetry(args, { tries = 6, baseMs = 1500 } = {}) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
        try {
            return await ghJson(args);
        } catch (e) {
            lastErr = e;
            const msg = String(e?.stderr || e?.message || "");
            const retryable = /HTTP 5\d\d|Bad Gateway|timeout|EAI_AGAIN|ECONNRESET|ETIMEDOUT/i.test(msg);
            if (!retryable || i === tries - 1) throw e;
            const wait = baseMs * 2 ** i;
            console.warn(`  gh transient error, retry ${i + 1}/${tries - 1} in ${wait}ms…`);
            await new Promise((r) => setTimeout(r, wait));
        }
    }
    throw lastErr;
}

async function fetchRepoList() {
    return ghJsonRetry([
        "repo",
        "list",
        USER,
        "--limit",
        String(limit),
        "--no-archived",
        // PUBLIC ONLY. The daily Action runs with the repo-scoped GITHUB_TOKEN,
        // which can only see public repos — so the snapshot has always been
        // public-only. Running this locally with a personal `gh` login would
        // otherwise pull in PRIVATE repos (unpublished research, patient-facing
        // drafts) and leak them onto the public /portfolio page. Pin it here so
        // local and CI runs produce the same public-only result.
        "--visibility",
        "public",
        "--source",
        "--json",
        "name,description,primaryLanguage,stargazerCount,forkCount,pushedAt,createdAt,repositoryTopics,url,homepageUrl,licenseInfo,isFork,isArchived,defaultBranchRef",
    ]);
}

async function fetchReadmeExcerpt(name) {
    try {
        const { stdout } = await exec(
            "gh",
            ["api", `repos/${USER}/${name}/readme`, "-H", "Accept: application/vnd.github.raw"],
            { maxBuffer: 8 * 1024 * 1024 },
        );
        // Strip front-matter / HTML / heading hashes; take first ~280 chars as excerpt.
        const cleaned = stdout
            .replace(/<[^>]+>/g, " ")
            .replace(/^#+ */gm, "")
            .replace(/\!\[[^\]]*\]\([^)]*\)/g, "") // images
            .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
            .replace(/`+/g, "")
            .replace(/[*_~]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        if (!cleaned) return null;
        const excerpt = cleaned.length > 280 ? cleaned.slice(0, 280).trimEnd() + "…" : cleaned;
        return excerpt;
    } catch {
        return null;
    }
}

async function mapLimit(arr, limit, fn) {
    const out = new Array(arr.length);
    let next = 0;
    async function worker() {
        while (true) {
            const i = next++;
            if (i >= arr.length) return;
            out[i] = await fn(arr[i], i);
        }
    }
    await Promise.all(Array.from({ length: limit }, worker));
    return out;
}

async function main() {
    console.log(`fetching repo list for ${USER}…`);
    const raw = await fetchRepoList();
    console.log(`  ${raw.length} repos (after --no-archived)`);

    const repos = raw
        .filter((r) => !r.isFork && !r.isArchived)
        .map((r) => ({
            name: r.name,
            description: r.description ?? "",
            language: r.primaryLanguage?.name ?? null,
            stars: r.stargazerCount ?? 0,
            forks: r.forkCount ?? 0,
            pushedAt: r.pushedAt,
            createdAt: r.createdAt,
            topics: (r.repositoryTopics ?? []).map((t) => t.name),
            url: r.url,
            homepage: r.homepageUrl || null,
            license: r.licenseInfo?.spdxId || null,
            defaultBranch: r.defaultBranchRef?.name || "main",
        }));

    console.log(`  ${repos.length} repos kept (all non-fork non-archived)`);

    // Categorise.
    for (const r of repos) {
        r.category = classify(r);
    }

    // Load the previous snapshot so README excerpts can be reused incrementally.
    let prev = null;
    try {
        prev = JSON.parse(await readFile(outFile, "utf8"));
    } catch {
        prev = null; // first run, or file missing/corrupt → fetch everything
    }
    const prevFetchedMs = prev?.fetchedAt ? new Date(prev.fetchedAt).getTime() : 0;
    const prevByName = new Map((prev?.repos ?? []).map((r) => [r.name, r]));

    // Fetch README excerpts (parallel, incremental).
    if (!skipReadme) {
        let fetched = 0;
        let reused = 0;
        console.log(
            `fetching READMEs (concurrency=${concurrency}, ${forceReadme ? "FULL re-fetch" : "incremental"})…`,
        );
        const excerpts = await mapLimit(repos, concurrency, async (r, i) => {
            const prevRepo = prevByName.get(r.name);
            // Reuse the old excerpt when the repo existed last time, already had
            // a README excerpt recorded, and hasn't been pushed since that fetch.
            const unchanged =
                !forceReadme &&
                prevRepo &&
                "readmeExcerpt" in prevRepo &&
                new Date(r.pushedAt).getTime() <= prevFetchedMs;
            if (unchanged) {
                reused++;
                return prevRepo.readmeExcerpt;
            }
            const excerpt = await fetchReadmeExcerpt(r.name);
            fetched++;
            process.stdout.write(`  [${i + 1}/${repos.length}] ${r.name}\r`);
            return excerpt;
        });
        for (let i = 0; i < repos.length; i++) {
            repos[i].readmeExcerpt = excerpts[i];
        }
        console.log(
            `\n  README: ${fetched} fetched, ${reused} reused from previous snapshot`,
        );
    }

    // Drop repos with truly nothing to show (no description, no topics, no README).
    const before = repos.length;
    const final = repos.filter(
        (r) =>
            (r.description && r.description.trim().length > 0) ||
            r.topics.length > 0 ||
            (r.readmeExcerpt && r.readmeExcerpt.trim().length > 0),
    );
    if (final.length < before) {
        console.log(`  dropped ${before - final.length} empty repos`);
    }
    repos.length = 0;
    repos.push(...final);

    // Sort: by pushedAt (newest first), category secondary.
    repos.sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime());

    const medical = repos.filter((r) => r.category === "medical").length;
    const it = repos.filter((r) => r.category === "it").length;
    console.log(`categorised: ${medical} medical, ${it} it`);

    const snapshot = {
        user: USER,
        fetchedAt: new Date().toISOString(),
        count: repos.length,
        medicalCount: medical,
        itCount: it,
        repos,
    };

    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, JSON.stringify(snapshot, null, 2));
    console.log(`wrote ${path.relative(root, outFile)} (${repos.length} repos)`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
