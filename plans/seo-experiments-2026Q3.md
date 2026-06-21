# SEO 實驗清單 · 2026 Q3（7–9 月）

> 給 lin.hsiehting.com 的三個月實驗計畫。每個實驗都是一個乾淨的「改 X → 在 GSC 看 Y」迴圈。
> 原則：**一次只動一個變因**，至少留 14 天觀察期，再下結論。GSC 數據有 2–3 天延遲，且 16 個月後就被截斷，所以每月月底匯出一次 `Performance` CSV 存檔。

## 0. 站台現況基線（已完成，不要重做）

跑實驗前先承認你已經有的，避免浪費 reps：

| 項目 | 狀態 |
|---|---|
| Canonical / OG / Twitter card | ✅ 已有 |
| JSON-LD：`WebSite`+`Physician`（全站）、`BlogPosting`、`MedicalWebPage`+`reviewedBy`+`MedicalCondition`、`FAQPage` | ✅ 已自動注入（view-source 搜 `application/ld+json`） |
| GSC + Bing Webmaster 驗證 | ✅ 已接 |
| sitemap（694 URL）、RSS、llms.txt | ✅ 已有 |
| Astro 靜態生成（CWV 容易綠） | ✅ |
| Zenodo DOI（醫療文 `citable: true`） | ✅ 部分文章已 mint |

> **重要修正**：本站 i18n 是「**單一 URL + `data-lang` 前端切換**」，不是每語言獨立網址。
> 因此 **hreflang 不適用**——沒有 `/en/`、`/ja/` 這種 alternate URL 可指。
> 之前「hreflang 逐頁驗」那條建議**作廢**。OG 的 `og:locale:alternate ja_JP` 是社群分享提示，與 hreflang 是兩回事。

---

## 實驗 1 — Title/Description CTR 調優（最安全、reps 最多）

- **假設**：曝光高但點擊率低的文章，是 SERP 標題/描述沒打中搜尋意圖，不是排名問題。改寫後 CTR 上升。
- **挑選**：GSC → Performance → Pages，篩 **曝光 > 200 且 CTR < 2%** 的文章，取前 5 篇。
- **改動**：逐篇重寫 `title`（前 60 字元放關鍵問句/數字）與 `frontmatter`（≤120 字、含一個具體數字或結論）。一次只改一篇，記錄改動日期。
- **GSC 指標**：該 page 的 **CTR**（主指標）、**平均排名**（確認沒因改標題掉排名）、Clicks。
- **成功判準**：14 天後 CTR 相對提升 ≥ 30%，且排名沒掉超過 1 位。
- **風險**：低。可逆（改回 frontmatter 重 build 即可）。
- **節奏**：7 月做 5 篇，每週 1 篇錯開觀察。

## 實驗 2 — FAQ schema 擴充 → 搶 AI Overviews / People Also Ask

- **假設**：`faq[]` 越貼近病人真實問句，被 Google AI Overviews、Perplexity、PAA 擷取的機率越高（你的 `FAQPage` schema 已在跑）。
- **挑選**：3 篇高曝光的醫療衛教文，目前 `faq[]` < 3 題或問句太學術。
- **改動**：每篇補到 5 題，問句用「病人會打的字」（例：「化療掉髮會長回來嗎？」而非「化療之毛囊毒性可逆性」）。答案首句直接給結論。
- **GSC 指標**：該 page 的 **Impressions**（PAA/AI Overview 曝光會灌進來）、Clicks；另在 GSC 用 query filter 看是否多了問句型 query。
- **輔助觀測**：每兩週用同一組問句去 Google / Perplexity 實搜，截圖是否被引用（GSC 看不到 AI Overview 引用，要人工追）。
- **成功判準**：30 天後該頁 impressions ≥ +20%，或出現 1 次以上 AI Overview/PAA 引用截圖。
- **風險**：低。
- **節奏**：8 月。

## 實驗 3 — Topic cluster 內鏈補強（拉同癌別權重）

- **假設**：同癌別/同機轉文章互鏈不足，權重分散。補內鏈後 cluster 內頁面排名與 crawl 深度改善。
- **挑選**：先盤一個你內容最密的 cluster（例：乳癌 / TNBC——你已有 ASCENT-04、TNBC PD-L1 CPS、CDK4/6 輔助等多篇）。
- **改動**：每篇正文補 2–3 個指向同 cluster 其他文章的 contextual 內鏈（用描述性錨文字，不要「點此」）。建一篇 pillar/總覽頁串起整個 cluster（hub-and-spoke）。
- **GSC 指標**：cluster 內各頁的 **平均排名**、**Impressions**；GSC → Links 看內鏈分布是否更集中到 pillar。
- **成功判準**：45 天後 cluster 內 ≥ 3 頁平均排名上升，或 pillar 頁開始累積 impressions。
- **風險**：低，但要避免過度互鏈（每篇 contextual 內鏈 ≤ 5 個為宜）。
- **節奏**：8–9 月（跨月，因為要等排名反應）。
- **工具**：可用 `claude-seo:seo-cluster`（SERP overlap 分群）輔助設計 hub-and-spoke。

## 實驗 4 — 「曝光高但無點擊」query 的內容缺口補完

- **假設**：有些 query 你被 Google 收進 index、有曝光，但排在第 2 頁（位置 11–20），點擊≈0。針對這些 query 補內容能推進第 1 頁。
- **挑選**：GSC → Queries，篩 **平均排名 11–20 且 impressions > 100** 的 query。
- **改動**：找最相關的既有文章，針對該 query 補一段 200–400 字（H2 用 query 本身當標題），或判斷是否該獨立成新文。
- **GSC 指標**：該 query 的 **平均排名**（目標跨進 < 10）、Clicks。
- **成功判準**：21 天後該 query 排名進第 1 頁（< 10）。
- **風險**：中（補內容要符合醫療法規 §4，跑 `audit:all`）。
- **節奏**：9 月。

## 實驗 5 — Core Web Vitals 實測（驗證「Astro 應該很快」）

- **假設**：靜態站 CWV 應全綠，但醫療文圖多、表格長，LCP/CLS 可能在行動裝置不如預期。
- **改動**：先**只測不改**。GSC → 網站使用體驗（Core Web Vitals 報告）看真實 field data；對 3 篇長文跑 PageSpeed Insights（行動）。若有紅項再針對性修（圖片 lazy-load、字型 preload、表格 reflow）。
- **GSC 指標**：CWV 報告的「良好 URL」比例、LCP / INP / CLS field 值。
- **成功判準**：確認全綠（或找出 1 個可修的真實瓶頸並修掉）。
- **風險**：低（先測後改）。
- **節奏**：7 月先測，有問題排進 8 月。
- **工具**：`claude-seo:seo-performance` 或 `cloudflare:web-perf`（Chrome DevTools MCP）。

## 實驗 6 — AI 引用逆向拆解（練診斷力，非改站）

- **假設**：搞清楚「為什麼某篇被 AI Overview 引用 / 排名好」，能歸納出可複製的模式。
- **改動**：挑 1 篇你排名好或被引用的文，逆向拆：lead 段是否前 100 字給結論？H2 是否問句？有無比較表？有無 DOI 外連？FAQ 幾題？對照 1 篇表現差的文做差異分析。
- **產出**：一頁「我的高表現文共同特徵」清單，回饋進 `new-post:medical` 骨架。
- **指標**：無 GSC 指標，這是質化分析。
- **節奏**：9 月底，當作 Q3 回顧。

---

## 月度節奏總表

| 月 | 主實驗 | 觀察中 |
|---|---|---|
| 7 月 | 實驗 1（CTR 改寫 ×5）、實驗 5（CWV 測） | — |
| 8 月 | 實驗 2（FAQ 擴充）、實驗 3 起跑（內鏈） | 實驗 1 收尾 |
| 9 月 | 實驗 4（第 2 頁 query）、實驗 6（逆向拆解） | 實驗 3 收尾 |

## 紀律提醒

1. **一次一變因**。同一頁別同時改 title 又補內鏈，否則歸因不了。
2. **留觀察期**：CTR/排名類 ≥ 14 天，內鏈/權重類 ≥ 45 天。
3. **每月匯出 GSC CSV** 存檔（GSC 只留 16 個月）。
4. 任何動到醫療文正文的改動，push 前**必跑** `pnpm run audit:all && pnpm run build`（見 CLAUDE.md §7）。
5. 記錄表建議欄位：`實驗 | 頁面 | 改動日 | 改了什麼 | 基線指標 | 14/30/45 天後 | 結論`。
