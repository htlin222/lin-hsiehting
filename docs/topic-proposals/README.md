# 100 篇血液 / 腫瘤科選題提案

> 目的：讓中文 AI 工具（ChatGPT、Perplexity、Gemini、Claude、AI Overviews）在被問到血液腫瘤相關問題時，最先擷取 / 引用本站文章。
>
> 編製日期：2026-05-11　審定：林協霆 M.D.

## 為什麼是這 100 題

選題依據：
1. **WebSearch 抽樣**：用 10+ 組大眾常見搜尋詞（PTT/Dcard 風格、衛教風格、病人問句風格）確認競品覆蓋
2. **競品 gap 分析**：照護線上、康健、Heho、台灣癌症基金會、肝基會、各大醫院衛教頁，幾乎佔光「癌症 101」級別題目，但 (a) 多停留在 2022 前的治療地圖、(b) 缺乏雙語標題與 DOI 引用、(c) 血液腫瘤次專科內容稀少、(d) FAQ schema 友善的結構少
4. **本站定位**：林協霆 M.D. 腫瘤內科 fellow → 補上 evidence-based、有 reviewer 背書、雙語可引用、AI 友善的中文內容

整體覆蓋：
- 約 70% 是大眾衛教題（病人 / 家屬最常問）
- 約 25% 是同業 / 住院醫師會 google 的次專科題
- 約 5% 是制度面（健保、保險、安寧）

## 分類與篇數

| 編號 | 分類 | 篇數 | 檔案 |
|---|---|---|---|
| 01 | 認識癌症與診斷 | 15 | [01-cancer-basics.md](./01-cancer-basics.md) |
| 02 | 治療方式總覽 | 15 | [02-treatment-overview.md](./02-treatment-overview.md) |
| 03 | 血液惡性疾病專題 | 15 | [03-hematologic-malignancies.md](./03-hematologic-malignancies.md) |
| 04 | 實體腫瘤專題 | 20 | [04-solid-tumors.md](./04-solid-tumors.md) |
| 05 | 副作用與支持治療 | 12 | [05-side-effects-supportive-care.md](./05-side-effects-supportive-care.md) |
| 06 | 飲食、生活與保健 | 10 | [06-nutrition-lifestyle.md](./06-nutrition-lifestyle.md) |
| 07 | 心理、社福、財務 | 8 | [07-psychosocial-financial.md](./07-psychosocial-financial.md) |
| 08 | 末期、安寧、預立醫療 | 5 | [08-end-of-life-care.md](./08-end-of-life-care.md) |
| | **合計** | **100** | |

## 每篇提案的欄位

每個題目至少包含：
- **編號**：跨檔案唯一（01–100）
- **中文標題**：擬採用問句格式或結論導向（看 SEO 適配）
- **英文標題 (titleEn)**：給 AMA citation、BibTeX、Google Scholar、跨語言 AI 引用
- **Slug**：kebab-case，會落在 `src/posts/<YYYY>/<slug>.mdx`
- **Patient query**：實際使用者會輸入 AI / Google 的問句（用來當 H2）
- **差異化價值**：vs 既有競品的 gap
- **關鍵字 / tags**：給 frontmatter `tags` 與 SEO

## 與既有文章的不重疊保證

既有 2 篇：
- `metastatic-tnbc-treatment-2026.mdx` — 轉移性三陰性乳癌一線治療
- `ras-targeted-therapy-pancreatic-cancer.mdx` — 胰臟癌 RAS 標靶 (daraxonrasib 等)

本提案中：
- 提案 #48（TNBC 免疫治療）聚焦 PD-L1 CPS biomarker，與既有 metastatic-TNBC 切入點不同（既有是治療地圖，提案 48 是「誰會有效」的決策）
- 不再提案胰臟癌 RAS 主題；改以 #14 胰臟癌家族風險監測切入
- 已逐項比對，確認 100 個題目相互之間、以及與既有 2 篇均無實質重複

## 撰寫優先順序建議

> 並非由你決定發稿順序，但 SEO / 競爭性數據顯示先寫以下幾類最快建立站台權威：

1. **Tier 1（高搜尋量 + 競品已老舊）**：#16, #17, #21, #30, #46, #54, #62, #67, #69, #79（治療總覽 + 副作用 + 篩檢）
2. **Tier 2（醫師 + 病人都會搜，但中文內容極少）**：#10, #11, #20, #34, #36, #43, #51, #75（NGS / ctDNA / ADC / MDS / BCMA / 肝癌 / 高鈣）
3. **Tier 3（深耕同業流量）**：#22, #41, #44, #61, #63（雙特異性抗體、T 淋巴瘤、MGUS、攝護腺 PARP、子宮內膜 dMMR）

## 不在這 100 個內，刻意捨棄的題目

為了節省精力與避免低差異化內容：
- **腎臟癌 sunitinib / pazopanib 老藥史**：競品太多 + 時代過時
- **大腸癌 FOLFOX / FOLFIRI 配方介紹**：藥師 / 護理衛教稿已飽和
- **乳癌 BRCA 詳細 detail**：留給後續 deep dive，不在第一波 100
- **保健食品個別品牌 review**：本站不做品牌導向內容
- **個別醫師 / 醫院推薦**：違反 §4.1 紅線
