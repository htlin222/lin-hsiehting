# CLAUDE.md — 寫作與審稿指南

> 這份檔案是給 Claude Code（與未來的我）讀的：說明本站的內容定位、目錄結構、frontmatter 規範、法規紅線、OpenEvidence MCP 引用流程，以及上稿前的 audit 步驟。

## 1. 站定位

- **作者**：林協霆 M.D.（和信治癌中心醫院腫瘤內科部 Fellow，2023.08–）
- **語言**：繁體中文（zh-TW）
- **讀者**：(a) 病友與家屬、(b) 同業與住院醫師
- **法源**：依**醫療法第 87 條第 2 項**，本站定位為「醫學新知發表 + 病人衛生教育」，不從事醫療業務招徠。
- **不寫**：個別醫療建議、特定醫師／醫院／藥廠的推薦或預約導流、未經去識別化的個案。

## 2. 目錄結構

```
src/
  posts/<YYYY>/<kebab-slug>.mdx     ← 文章本體
  components/
    Author.astro                   ← /about 頁
    posts/
      MedicalReview.astro          ← medical: true 自動注入的審稿/免責區塊
      AuthorBadge.astro            ← 文章 header 的作者頭像條
  config.ts                        ← 作者身分、ORCID、Scholar、醫院連結
  content.config.ts                ← frontmatter schema（zod）
  layouts/Layout.astro             ← 全站 WebSite + Physician JSON-LD
  pages/posts/[...slug].astro      ← 文章模板 + per-post JSON-LD
public/
  llms.txt                         ← AI crawler 路標
scripts/
  new-post.ts                      ← 建新文章骨架
  audit-posts.mjs                  ← 上稿前 lint
```

## 3. 寫一篇新文章的流程

### 3.1 一般文章（非醫療主題）

```bash
pnpm run new-post "你的標題"
# → src/posts/<YYYY>/<slug>.mdx
```

### 3.2 醫療文章（衛教 / 新藥整理 / 治療進展）

```bash
pnpm run new-post:medical "你的標題"
# → 包含 medical: true、reviewer、reviewedDate、medicalCondition、faq[] 完整骨架
```

### 3.3 frontmatter 必填欄位（醫療）

| 欄位 | 必填 | 說明 |
|---|---|---|
| `title` | ✅ | 標題 |
| `date` | ✅ | 首次發布 `MM/DD/YYYY` |
| `frontmatter` | ✅ | 摘要（首頁 / RSS / 描述標籤共用），≤ 120 字 |
| `tags` | ✅ | 含癌別、藥物或機轉、`衛教` 一律加上 |
| `medical` | ✅ | 設為 `true` 啟用 MedicalReview + JSON-LD |
| `medicalCondition` | ✅ | 例：`胰臟腺癌 (Pancreatic Ductal Adenocarcinoma, PDAC)` |
| `reviewer` | ✅ | 通常 `林協霆`；客座作者要由本人掛名審稿 |
| `reviewerCredentials` | ✅ | 例：`MD, 內科專科醫師, 腫瘤內科` |
| `reviewedDate` | ✅ | `MM/DD/YYYY` |
| `updatedDate` | △ | 重大修訂時更新（NCCN 改版、新藥核准等） |
| `faq` | △ | `[{q, a}]`，會輸出為 FAQPage schema，被 Google AI Overviews / Perplexity 引用機率高 |
| `image` | △ | 封面圖（相對路徑，深巢需 `../../../assets/...`） |

## 4. 法規紅線（**任何一條違反 = 重寫**）

### 4.1 禁用詞（一字都不能出現）

```
保證、根治、最有效、永不復發、第一例、唯一、立即諮詢、歡迎預約
```

替代寫法：
- 「保證 X 有效」→「在 X 試驗中達到 Y% 反應率」
- 「根治 / 永不復發」→「達到完全反應」「長期無復發追蹤」
- 「最有效」→「在跨試驗比較中（cross-trial comparison）反應率較高」
- 「唯一 / 第一例」→「目前已發表的少數案例之一」
- 「立即諮詢 / 歡迎預約」→ **直接刪除**，本站不做導流

### 4.2 必備區塊

每篇 `medical: true` 文章必須包含：

1. **適應症**（誰可以用）
2. **禁忌症**（誰不該用）
3. **副作用 / 不良反應**（含 ≥ Grade 3 比例）
4. **風險揭露**（試驗中、仿單外、健保不給付等狀態）
5. **參考文獻**（PubMed / NEJM / JCO / NCCN，含 DOI 超連結）
6. 文末 `<MedicalReview />` — frontmatter 設好就會自動注入

### 4.3 個案分享原則

- 必經充分**去識別化**（年齡區間、不寫單位／確切日期）
- 取得書面知情同意
- 僅作教學、衛教用途；不可變相招徠

## 5. 文章結構（讓 AI 引擎願意擷取）

1. **前 100 字直接給答案** — Lead paragraph 開門見山交代結論（藥物名、ORR、是否核准）。
2. **H2/H3 用病人問句** — 例：「目前有 RAS 標靶藥物獲准用於胰臟癌嗎？」「副作用有哪些？」
3. **比較表** — 治療選項、跨試驗數據用 markdown table，AI Overviews 最愛擷取。
4. **短段落、條列** — 每段 ≤ 4 行，避免 wall of text。
5. **超連結引用** — 引用論文必附 `[doi:XXX](https://doi.org/XXX)`。
6. **Topic cluster 內鏈** — 同癌別 / 同機轉文章互相 `[文字](/posts/...)`。

## 6. OpenEvidence MCP 引用流程

OpenEvidence MCP 已 authenticated（見 `mcp__openevidence__oe_auth_status`）。建議流程：

### 6.1 第一輪查詢

```
mcp__openevidence__oe_ask
  question: 把臨床問題寫清楚，包含 (1) 疾病、(2) 想要的藥物 / 機轉 / 線數、
            (3) 想看的指標（ORR / mPFS / mOS）、(4) 是否要組合策略、
            (5) 監管現況（FDA approval / Breakthrough）
  timeout_sec: 300
  include_bibtex: true
```

回傳 payload：
- `extracted_answer_raw` — markdown 答案 + 內嵌 citation `[NN]`
- `figures` — 表格 / 流程圖（NCCN guideline 圖、NEJM Figure 1 等）
- `artifacts.articlePath` — `article.json`（完整文章 metadata）
- `artifacts.bibPath` — `citations.bib`（直接餵給 BibTeX）
- `artifacts.crossrefValidationPath` — Crossref 驗證結果（哪些 DOI 真的存在）

### 6.2 跨檢驗 / 追問

第二題用 `original_article_id` 串接，避免重新跑：
```
mcp__openevidence__oe_ask
  question: 「上題之中，daraxonrasib 失效後的二線選項？」
  original_article_id: <第一題回傳的 article_id>
```

### 6.3 落地到文章

- **不要原樣貼 OpenEvidence 答案**。重寫成繁中、加自己的臨床判斷。
- 引用論文：抓 `citations.bib` 的 DOI，文章用 numbered list + `[doi:XX](https://doi.org/XX)`。
- 表格：自己重畫 markdown table（OE 的 `<mdtable>` 不是標準 markdown）。
- 圖片：NCCN 受版權保護，**不要直接 hotlink** OpenEvidence 的 GCS URL；改寫文字描述或自繪。
- 文末加：`> 引用整理協力：OpenEvidence (Ask OpenEvidence Light, YYYY/MM/DD 查詢)`。

### 6.4 其他可組合 MCP

- **PubMed** (`mcp__claude_ai_PubMed__*`) — 補抓 abstract、找 related articles
- **bioRxiv** (`mcp__claude_ai_bioRxiv__*`) — 找尚未 peer-review 的 preprint（要在文中標明 *preprint*，不可當第一線實證）

## 7. 上稿前 audit

```bash
pnpm run audit:posts        # 法規禁用詞 + medical frontmatter 完整性 + 參考文獻區塊
pnpm run audit:doi          # 抓每個 https://doi.org/ 連結，確認 Crossref 有註冊
pnpm run audit:all          # 上面兩個一起跑
pnpm run build              # type/schema 檢查（會驗 frontmatter zod schema）
```

任一 audit 失敗 → 退出碼 1，**不可上稿**。失敗原因會印 `file:line — reason`。

`audit:doi` 只檢查 doi.org 的 redirect（302/303），不深入到出版社頁面 —
NEJM／JCO 等對 HEAD/GET 常 403，但那不代表 DOI 死掉，所以 audit 不會誤殺。

外部進階 SEO 工具（已 clone，未 install）：
- `~/.claude/skills/claude-seo`（AgriciDaniel/claude-seo, 6.3k ⭐）— 跑 `bash install.sh` 後可用 `/seo-audit`、`/seo-schema` 等 sub-skill。

## 8. JSON-LD / schema 對照表（自動產生，不用手寫）

| 出現位置 | 觸發條件 | schema |
|---|---|---|
| 全站每頁 | always | `WebSite` + `Physician` |
| 文章頁 | always | `BlogPosting` |
| 文章頁 | `medical: true` | `MedicalWebPage` + `reviewedBy` + `MedicalCondition` |
| 文章頁 | `faq[]` 有資料 | `FAQPage` |

`affiliation` 自動展開為 `Organization { name, url }`，URL 從 `siteConfig.author.affiliationUrl` 取。

## 9. 部署

`git push origin main` → GitHub Actions → Cloudflare Pages（`lin-hsiehting` project）→ <https://lin.hsiehting.com>。

`pnpm run build` 在本地必須先綠燈再 push；CI 失敗會在 Actions 頁顯示。

## 10. 給 Claude 的提醒

- 寫醫療文章前先 `oe_auth_status` 確認 OpenEvidence 可用。
- 引用論文時若 `crossrefValidationPath` 顯示 DOI 無效 → **不要寫進文章**，改抓另一篇。
- 數字（ORR / mPFS / mOS）一律附「n = X」與信心區間，沒有 CI 的初步數據要在文中標明 `初步報告`。
- 跨試驗比較表必須附 `Callout type="warning"` 警語：不同試驗族群／線數／評估基準不一致。
- 一律用「副作用 / 不良反應」、「治療反應」、「無惡化存活」這類繁中標準術語，不直接寫 ORR / PFS 的英文縮寫前要先寫一次中文全名。
