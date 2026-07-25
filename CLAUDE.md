# CLAUDE.md — 寫作與審稿指南

> 這份檔案是給 Claude Code（與未來的我）讀的：說明本站的內容定位、目錄結構、frontmatter 規範、法規紅線、OpenEvidence MCP 引用流程，以及上稿前的 audit 步驟。

## 1. 站定位

- **作者**：林協霆 M.D.（和信治癌中心醫院腫瘤內科專任主治醫師，2026.08–；2023.08–2026.07 為同院血液腫瘤科 Fellow）
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
| `title` | ✅ | 中文標題 |
| `titleEn` | ✅ | 英文標題（用於 AMA citation 英文版、BibTeX、`<title>` SEO 補強）|
| `date` | ✅ | 首次發布 `MM/DD/YYYY` |
| `frontmatter` | ✅ | 摘要（首頁 / RSS / 描述標籤共用），≤ 120 字 |
| `tags` | ✅ | 含癌別、藥物或機轉、`衛教` 一律加上 |
| `medical` | ✅ | 設為 `true` 啟用 MedicalReview + JSON-LD |
| `medicalCondition` | ✅ | 例：`胰臟腺癌 (Pancreatic Ductal Adenocarcinoma, PDAC)` |
| `reviewer` | ✅ | 通常 `林協霆`；客座作者要由本人掛名審稿 |
| `reviewerCredentials` | ✅ | 例：`MD, 內科專科醫師, 腫瘤內科專科醫師` |
| `reviewedDate` | ✅ | `MM/DD/YYYY` |
| `citable` | △ | `true` = 准予 push 後自動 mint Zenodo DOI（見 §11）；空 / `false` = 不 mint |
| `updatedDate` | △ | 重大修訂時更新（NCCN 改版、新藥核准等） |
| `faq` | △ | `[{q, a}]`，會輸出為 FAQPage schema，被 Google AI Overviews / Perplexity 引用機率高 |
| `image` | △ | 封面圖（相對路徑，深巢需 `../../../assets/...`） |
| `doi` / `conceptDoi` | 自動 | 由 `zenodo-mint.mjs` 寫回，**不要手動設**（除非是 backfill 既有 Zenodo record）|

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
2. **雙語標題** — 中文標題（`title`）＋ 英文標題（`titleEn`）兩個都要寫。英文標題會出現在 AMA citation 英文版、BibTeX `title` 與 cite key 內，方便英文讀者引用、也讓 Google Scholar / 國際資料庫能對得上。
3. **H2/H3 用病人問句** — 例：「目前有 RAS 標靶藥物獲准用於胰臟癌嗎？」「副作用有哪些？」
4. **比較表** — 治療選項、跨試驗數據用 markdown table，AI Overviews 最愛擷取。
5. **短段落、條列** — 每段 ≤ 4 行，避免 wall of text。
6. **超連結引用** — 引用論文必附 `[doi:XXX](https://doi.org/XXX)`。
7. **Topic cluster 內鏈** — 同癌別 / 同機轉文章互相 `[文字](/posts/...)`。

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

## 7. 上稿前 audit（**強制** ritual — Claude 必須跑完才能宣告文章完成）

```bash
pnpm run audit:all          # = audit:posts + audit:doi
pnpm run build              # type/schema 檢查（會驗 frontmatter zod schema）
```

或拆開來：

```bash
pnpm run audit:posts        # 法規禁用詞 + medical frontmatter 完整性 + 參考文獻區塊
pnpm run audit:doi          # 抓每個 https://doi.org/ 連結，確認 Crossref 有註冊
```

任一 audit 失敗 → 退出碼 1，**不可上稿**。失敗原因會印 `file:line — reason`。

`audit:doi` 只檢查 doi.org 的 redirect（302/303），不深入到出版社頁面 —
NEJM／JCO 等對 HEAD/GET 常 403，但那不代表 DOI 死掉，所以 audit 不會誤殺。

### 7.1 寫完一篇文章的 checklist（Claude 必跑，逐條打勾）

- [ ] frontmatter 含 `title / titleEn / medical / reviewer / reviewerCredentials / reviewedDate / medicalCondition`
- [ ] 前 100 字直接給結論
- [ ] 至少一張比較表（治療選項 / 跨試驗）
- [ ] 副作用、適應症、禁忌症章節都有
- [ ] 「## 參考文獻」+ 每筆含 `[doi:XX](https://doi.org/XX)`
- [ ] 文末有「> 引用整理協力：OpenEvidence …查詢」標註
- [ ] 全文沒有禁用詞（§4.1）
- [ ] `pnpm run audit:all` ✅（沒有 ERR、沒有 titleEn warn）
- [ ] `pnpm run build` ✅
- [ ] `draft: false`（或 frontmatter 沒設 draft）才算可上稿
- [ ] 想要 DOI 才設 `citable: true`；不想要的就維持空白／`false`

任何一項沒打勾 → **不要**告訴使用者「文章好了」。

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

`git push origin main` → GitHub Actions（`.github/workflows/deploy.yml`：build + `wrangler pages deploy`）→ Cloudflare Pages（`lin-hsiehting` project）→ <https://lin.hsiehting.com>。

`pnpm run build` 在本地必須先綠燈再 push；CI 失敗會在 Actions 頁顯示。

### 9.1 push 後必盯到底（Claude 不可省略）

Cloudflare Pages 的 deploy 由 GitHub Actions 跑（不是 CF 直連 repo），所以 **Action 綠燈 = 已上線**。每次 push 後：

```bash
gh run watch --exit-status               # 盯最新一個 run 直到結束，非 0 = 失敗
gh run list --workflow=deploy.yml -L 3   # 看 deploy.yml 最近三次狀態
gh run view --log-failed                 # 失敗時抓失敗 step 的 log
```

如果是醫療文章上稿，DOI mint 也會跟著跑：

```bash
gh run list --workflow=zenodo-on-push.yml -L 3
```

Action 全綠後再做一次 live check（驗證 CF 的 edge cache 也更新了）：

```bash
curl -sI https://lin.hsiehting.com/ | grep -iE 'etag|cf-ray|last-modified'
# 或抓本次改動的具體 marker（OG tag、新檔名、frontmatter 等）
curl -s https://lin.hsiehting.com/ | grep -oE '<meta property="og:image:width"[^>]*'
```

任一步失敗 → **不要**告訴使用者「部署好了」。先讀 log 修，必要時 revert。

## 11. OG image 自動產生

每篇文章建構期會自動產生一張 1200×630 的社群預覽圖（`public/og/<post-id>.png`），
作為 `og:image` 與 `twitter:image` 的 fallback。

### 11.0 設計與位置

- 字型：Noto Sans TC Bold（首次跑時 cache 到 `node_modules/.cache/og-fonts/`）
- 排版：site 名稱（eyebrow）+ 大標題（最多 3 行）+ 頭照／姓名／頭銜／URL（底部）
- 觸發：`pnpm run build` 會先跑 `pnpm run prebuild` → 自動 `og --all`
- 已存在的 PNG 會 skip（避免每次重生）；要強制重生用 `pnpm run og -- --slug=<sub> --force`

### 11.1 Frontmatter 控制

- 不設 `image` → 自動套用 `/og/<post-id>.png`
- 自定 `image: ../../assets/images/cover.webp` → 用你指定的圖

### 11.2 改設計

改 `scripts/og-image.mjs` 的 `buildTree()`，重跑 `pnpm run og -- --all --force`，commit。

---

## 12. Zenodo DOI 流程

文章可透過 Zenodo（DataCite DOI）取得永久學術引用標識。**每篇 = 1 個 record = 1 個 concept DOI + n 個 version DOI**，互不相干。

### 12.1 一次性設定

1. **本地 token**（給 `pnpm run zenodo:*` 用）
   - 到 <https://zenodo.org/account/settings/applications/tokens/new/>
   - scopes：`deposit:write` + `deposit:actions`
   - 寫進 `.env`：`ZENODO_PAT=<token>`（已 gitignored）
   - 也可用 `ZENODO_TOKEN`（GH Action secret 慣例）；腳本兩個都吃

2. **GitHub Action secrets**
   - `ZENODO_TOKEN`：production token（zenodo.org）— 給 `zenodo-on-push.yml` 用
   - `ZENODO_SANDBOX_TOKEN`：sandbox token（sandbox.zenodo.org，**獨立帳號**）— 給手動 dispatch 用

### 12.2 mint 條件

只有同時滿足以下三條的文章才會被 mint：

```
citable: true   AND   draft != true   AND   doi: 還沒設
```

`citable` 是**顯式 opt-in**。沒寫或寫 `false` = 不 mint，不會被 push 觸發誤動作。

### 12.3 兩種觸發方式

| 觸發 | 條件 | 用途 |
|---|---|---|
| **`git push` 自動**（`zenodo-on-push.yml`）| 任何 `src/posts/**.mdx` 變更，且 commit message 不含 `[skip mint]` | 日常上稿；mint 完自動 commit DOI 回 main |
| **手動 dispatch**（`zenodo-mint.yml`）| 在 GitHub Actions 介面選 sandbox/production + slug filter | 補 mint、sandbox 試水溫 |
| **本地命令** | 跑下面的 pnpm script | 開發、debug、backfill |

### 12.4 本地命令

```bash
pnpm run zenodo:dry                          # 不打 API，預覽 metadata
pnpm run zenodo:dry -- --slug=<sub>          # 只看某篇
pnpm run zenodo:sandbox -- --slug=<sub>      # sandbox 試一次（要 sandbox token）
pnpm run zenodo:production -- --slug=<sub>   # 真正 mint（永久！）
```

mint 流程（自動）：
1. `POST /api/deposit/depositions` 建 draft
2. `PUT <bucket>/<filename>` 上傳該篇 `.mdx`
3. `POST .../actions/publish` 發布 → 拿到 `doi` + `conceptDoi`
4. 自動寫回 frontmatter `doi:` 與 `conceptDoi:`

### 12.5 DOI 在站上會做什麼

- `MedicalReview` 元件多一塊「引用本文 · Cite this」：concept DOI 連結 + 中英 AMA citation + BibTeX 折疊
- `BlogPosting` JSON-LD 補 `identifier`（PropertyValue）+ `sameAs: doi.org/...`
- `audit:doi` 會把這些 DOI 一併納入檢查（302 from doi.org = OK）

### 12.6 修文章後要不要重 mint？

| 情境 | 動作 |
|---|---|
| 改錯字、補連結（檔案內容變） | 之後做 versioning：mint v2 → 新 version DOI、conceptDoi 不變 |
| 只是改 metadata（title, keywords）| 直接到 Zenodo 網站編輯，無需新 DOI |
| 改 frontmatter 但不影響可引用內容 | 不用動 |

> v2 版本流程目前**還沒寫進腳本**，第一次重 mint 時要走 `/api/deposit/depositions/<id>/actions/newversion`。先不急。

### 12.7 手動 GH Action 路線

- 進入 repo Actions → "Mint DOIs via Zenodo" → Run workflow
- target: `sandbox` / `production`
- slug: 可選 substring filter
- dry_run: 預覽用
- Action 執行完會開 PR 把 DOI 寫進 frontmatter，你 review 後 merge

## 10. 給 Claude 的提醒

- **上稿前必跑** `pnpm run audit:all && pnpm run build`。沒跑、或有 ERR 還沒修，**不可以**對使用者說「文章好了 / 完成了 / 可以 push 了」。這是搶答，不是完成。
- **醫療文章一律雙語標題**：`title`（zh-TW）+ `titleEn`（English）。英文標題出現在 AMA citation、BibTeX、Google Scholar 索引。
- **LINE 官方帳號 (@927pjtfa) 僅用於文章勘誤、衛教提問、學術討論**。**禁止**寫成「諮詢病情」「預約看診」「個別治療建議」等可能踩到醫療法 §87 招徠紅線的字眼。提到 LINE 必同時聲明「不提供個別診療建議」。
- 寫醫療文章前先 `oe_auth_status` 確認 OpenEvidence 可用。
- 引用論文時若 `crossrefValidationPath` 顯示 DOI 無效 → **不要寫進文章**，改抓另一篇；`audit:doi` 是第二道防線，不是免責金牌。
- 數字（ORR / mPFS / mOS）一律附「n = X」與信心區間，沒有 CI 的初步數據要在文中標明 `初步報告`。
- 跨試驗比較表必須附 `Callout type="warning"` 警語：不同試驗族群／線數／評估基準不一致。
- 一律用「副作用 / 不良反應」、「治療反應」、「無惡化存活」這類繁中標準術語，不直接寫 ORR / PFS 的英文縮寫前要先寫一次中文全名。
- `git push` 是部署動作（會觸發 Cloudflare Pages 重 build），**只在使用者明確說「push」「部署」「上線」時才執行**，不要自己決定。
- **push 完必盯**：每次 push 後跑 `gh run watch --exit-status` 直到 GitHub Action 綠燈（deploy.yml 內含 `wrangler pages deploy`，綠燈 = 已上線），再用 `curl` 驗證 live site 有出現本次改動的 marker。失敗就讀 log 修，不可以 push 完就走人或宣稱「部署好了」。詳細指令見 §9.1。
