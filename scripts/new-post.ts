import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const postsDir = path.join(rootDir, "src", "posts");

const argv = process.argv.slice(2);
const medical = argv.includes("--medical");
const titleParts = argv.filter((a) => a !== "--medical");
const title = titleParts.join(" ").trim();

if (!title) {
    console.error("Please provide a title for the post.");
    console.error('Usage: pnpm run new-post "Post Title"');
    console.error('       pnpm run new-post:medical "Post Title"');
    process.exit(1);
}

const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/(^-|-$)+/g, "");

if (!slug) {
    console.error(`Could not derive a slug from title: "${title}"`);
    console.error("Tip: include a few ASCII letters or digits in the title.");
    process.exit(1);
}

const today = new Date();
const yyyy = today.getFullYear().toString();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const formattedDate = `${mm}/${dd}/${yyyy}`;

const yearDir = path.join(postsDir, yyyy);
fs.mkdirSync(yearDir, { recursive: true });
const filePath = path.join(yearDir, `${slug}.mdx`);

if (fs.existsSync(filePath)) {
    console.error(`Post already exists at: ${filePath}`);
    process.exit(1);
}

const generalTemplate = `---
title: "${title}"
date: "${formattedDate}"
updatedDate: ""
frontmatter: "Write a short summary here..."
tags: ["general"]
draft: false
image: ""
---

Write your post content here!
`;

const medicalTemplate = `---
title: "${title}"
date: "${formattedDate}"
updatedDate: "${formattedDate}"
frontmatter: "前 100 字直接給答案：藥物 / ORR / mPFS / mOS / 監管現況。"
tags: ["衛教"]
medical: true
medicalCondition: "癌別中文名 (English Name)"
reviewer: "林協霆"
reviewerCredentials: "MD, 內科專科醫師, 腫瘤內科專科醫師"
reviewedDate: "${formattedDate}"
faq:
  - q: "病人最常問的問題 1？"
    a: "短答；事實要可在文章內找到對應段落。"
  - q: "病人最常問的問題 2？"
    a: "短答。"
draft: true
---

import Callout from '@/components/ui/Callout.astro';
import Steps from '@/components/ui/Steps.astro';
import ProsCons from '@/components/ui/ProsCons.astro';
import LinkCard from '@/components/ui/LinkCard.astro';
import Divider from '@/components/ui/Divider.astro';

> 第一段：≤ 100 字，直接給結論（藥名、ORR、是否核准、最關鍵的一句話）。

<Callout type="note" title="閱讀對象">
本文設定讀者為 X 與 Y。所有實際治療決策請與您的主治醫師討論。
</Callout>

<Divider />

## 為什麼這個議題重要？

（背景、流行病學、為什麼此時值得寫）

## 目前有哪些治療選項？（含比較表）

| 藥物 | 機轉 | 試驗 | n | ORR | mPFS | mOS |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

<Callout type="warning" title="跨試驗比較的限制">
不同試驗的病人族群、線數、評估基準、隨訪期皆不一致；此表僅作概念性參考。
</Callout>

## 副作用、適應症與禁忌症

### 常見不良反應
- 任何級別最常見：
- ≥ Grade 3 比例：

### 適應症（試驗中 / 仿單）
-

### 禁忌症與謹慎使用
-

## 哪些臨床試驗正在進行？

<LinkCard
  href="https://clinicaltrials.gov/study/NCTxxxxxxx"
  title="試驗名稱 (NCTxxxxxxx)"
  description="一句話描述。"
  domain="clinicaltrials.gov"
/>

## 對病人與家屬的實務建議

<Steps>
  <div>
    ### 確認 X
  </div>
  <div>
    ### 詢問 Y
  </div>
  <div>
    ### 帶去診間的問題清單
  </div>
</Steps>

<Divider />

## 參考文獻

1. 作者. **論文標題.** *期刊.* 年;卷(期):頁. [doi:10.xxxx/xxxxx](https://doi.org/10.xxxx/xxxxx)
2.
3.

> 引用整理協力：OpenEvidence (Ask OpenEvidence Light, ${yyyy}/${mm}/${dd} 查詢)
`;

const content = medical ? medicalTemplate : generalTemplate;
fs.writeFileSync(filePath, content, "utf8");

const relPath = path.relative(rootDir, filePath);
console.log("");
console.log(`Created ${medical ? "medical" : "general"} post: "${title}"`);
console.log(`File:     ${relPath}`);
if (medical) {
    console.log("");
    console.log("Next (ritual — see CLAUDE.md §7.1 checklist):");
    console.log("  1. Edit frontmatter (medicalCondition, faq, tags)");
    console.log("  2. Pull evidence: oe_ask via OpenEvidence MCP");
    console.log("  3. Lead paragraph ≤ 100 chars, H2 = patient questions");
    console.log("  4. Run: pnpm run audit:all   (posts + doi, MUST pass)");
    console.log("  5. Run: pnpm run build       (schema/type check)");
    console.log("  6. Set draft: false when both audits are green");
}
console.log("");
