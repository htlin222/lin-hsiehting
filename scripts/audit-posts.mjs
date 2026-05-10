#!/usr/bin/env node
// Audit script for medical posts on lin.hsiehting.com.
// Checks:
//   1. Banned 法規 vocabulary anywhere in the .mdx body
//   2. Required frontmatter for `medical: true` posts
//   3. Presence of a 參考文獻 / References section with at least one URL
// Exit code 1 on any failure so CI / pre-commit can gate.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "src", "posts");

// 醫療法 §87 violations — single occurrence kills the post.
const BANNED = [
    "保證",
    "根治",
    "最有效",
    "永不復發",
    "第一例",
    "唯一",
    "立即諮詢",
    "歡迎預約",
];

const REQUIRED_MEDICAL_FIELDS = [
    "title",
    "date",
    "frontmatter",
    "tags",
    "medical",
    "medicalCondition",
    "reviewer",
    "reviewerCredentials",
    "reviewedDate",
];

const REQUIRED_GENERAL_FIELDS = ["title", "date", "frontmatter", "tags"];

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

function parseFrontmatter(raw) {
    if (!raw.startsWith("---")) {
        return { data: null, body: raw, bodyOffset: 0 };
    }
    const end = raw.indexOf("\n---", 3);
    if (end === -1) return { data: null, body: raw, bodyOffset: 0 };
    const yaml = raw.slice(3, end).replace(/^\n/, "");
    const body = raw.slice(end + 4).replace(/^\n/, "");
    const bodyOffset = raw.slice(0, end + 4).split("\n").length;
    const data = {};
    let currentKey = null;
    for (const line of yaml.split("\n")) {
        if (!line.trim()) continue;
        const arrayItem = line.match(/^\s+-\s+(.+)$/);
        if (arrayItem && currentKey && Array.isArray(data[currentKey])) {
            data[currentKey].push(stripQuotes(arrayItem[1]));
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
    return { data, body, bodyOffset };
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

function checkBanned(file, body, bodyOffset) {
    const failures = [];
    const lines = body.split("\n");
    for (let i = 0; i < lines.length; i++) {
        for (const word of BANNED) {
            if (lines[i].includes(word)) {
                failures.push({
                    file,
                    line: bodyOffset + i + 1,
                    severity: "error",
                    message: `禁用詞「${word}」`,
                });
            }
        }
    }
    return failures;
}

function checkMedicalFrontmatter(file, data) {
    const failures = [];
    if (!data) {
        failures.push({
            file,
            line: 1,
            severity: "error",
            message: "找不到 frontmatter（檔案開頭應為 ---）",
        });
        return failures;
    }
    const required = data.medical
        ? REQUIRED_MEDICAL_FIELDS
        : REQUIRED_GENERAL_FIELDS;
    for (const key of required) {
        const v = data[key];
        const missing =
            v === undefined ||
            v === "" ||
            (Array.isArray(v) && v.length === 0) ||
            (key === "medical" && v !== true);
        if (missing) {
            failures.push({
                file,
                line: 1,
                severity: "error",
                message: `frontmatter 缺欄位：${key}`,
            });
        }
    }
    return failures;
}

function checkReferences(file, body, bodyOffset, isMedical) {
    if (!isMedical) return [];
    const failures = [];
    const refHeading = /^#{1,3}\s*(參考文獻|References)/m;
    if (!refHeading.test(body)) {
        failures.push({
            file,
            line: bodyOffset + 1,
            severity: "error",
            message: "醫療文章缺少「參考文獻 / References」區塊",
        });
        return failures;
    }
    const url = /https?:\/\/\S+/;
    if (!url.test(body)) {
        failures.push({
            file,
            line: bodyOffset + 1,
            severity: "error",
            message: "醫療文章參考文獻區塊沒有任何 URL（DOI / PubMed）",
        });
    }
    return failures;
}

function checkLeadParagraph(file, body, bodyOffset, isMedical) {
    if (!isMedical) return [];
    const lines = body.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) return [];
    // Skip mdx import lines
    const firstProse = lines.find(
        (l) => !l.trim().startsWith("import ") && !l.trim().startsWith("---"),
    );
    if (!firstProse) return [];
    const len = firstProse.replace(/[\s\p{P}]/gu, "").length;
    if (len < 30) {
        return [
            {
                file,
                line: bodyOffset + 1,
                severity: "warn",
                message: `lead paragraph 過短（${len} 字），建議 100 字內直接給答案`,
            },
        ];
    }
    return [];
}

const colors = {
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

async function main() {
    const files = await walk(postsDir);
    let errors = 0;
    let warnings = 0;
    for (const file of files) {
        const raw = await readFile(file, "utf8");
        const { data, body, bodyOffset } = parseFrontmatter(raw);
        const isMedical = !!data?.medical;
        const failures = [
            ...checkBanned(file, body, bodyOffset),
            ...checkMedicalFrontmatter(file, data),
            ...checkReferences(file, body, bodyOffset, isMedical),
            ...checkLeadParagraph(file, body, bodyOffset, isMedical),
        ];
        if (failures.length === 0) continue;
        const rel = path.relative(root, file);
        for (const f of failures) {
            const tag =
                f.severity === "error"
                    ? colors.red("ERR ")
                    : colors.yellow("WARN");
            console.log(`${tag} ${rel}:${f.line} — ${f.message}`);
            if (f.severity === "error") errors++;
            else warnings++;
        }
    }
    console.log("");
    if (errors === 0 && warnings === 0) {
        console.log(colors.green(`✓ ${files.length} posts audited, all clean`));
    } else {
        console.log(
            `${colors.dim(`audited ${files.length} posts —`)} ` +
                `${colors.red(`${errors} error(s)`)}, ${colors.yellow(`${warnings} warning(s)`)}`,
        );
    }
    process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
