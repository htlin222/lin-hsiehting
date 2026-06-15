#!/usr/bin/env node
// Fetch htlin222 public repos + READMEs and produce a categorised portfolio
// snapshot at src/data/github-portfolio.json. Categorises each repo as
// "medical" or "it" via keyword heuristics; the /portfolio page reads the
// snapshot at build time so no live GitHub API calls happen during build.
//
// Usage:
//   pnpm run portfolio:fetch        # refresh everything (uses gh CLI auth)
//   pnpm run portfolio:fetch:no-readme   # metadata only, skip README fetch
//
// Requires:
//   - gh CLI (authenticated)

import { writeFile, mkdir } from "node:fs/promises";
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

async function fetchRepoList() {
    return ghJson([
        "repo",
        "list",
        USER,
        "--limit",
        String(limit),
        "--no-archived",
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

    // Fetch README excerpts (parallel).
    if (!skipReadme) {
        console.log(`fetching READMEs (concurrency=${concurrency})…`);
        const excerpts = await mapLimit(repos, concurrency, async (r, i) => {
            const excerpt = await fetchReadmeExcerpt(r.name);
            process.stdout.write(`  [${i + 1}/${repos.length}] ${r.name}\r`);
            return excerpt;
        });
        for (let i = 0; i < repos.length; i++) {
            repos[i].readmeExcerpt = excerpts[i];
        }
        console.log("");
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
