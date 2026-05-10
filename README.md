# 林協霆 · 臨床筆記

> 腫瘤內科醫師的臨床筆記、衛教與閱讀記錄。
> 站台：[lin.hsiehting.com](https://lin.hsiehting.com)
> 作者：林協霆 M.D.（[ORCID](https://orcid.org/0009-0002-3974-4528) · [Google Scholar](https://scholar.google.com/citations?user=3-HCVDAAAAAJ&hl=zh-TW)）

依**醫療法第 87 條第 2 項**屬醫學新知與病人衛生教育，不從事醫療業務招徠。

---

## Stack

- [Astro 6](https://astro.build/) + MDX + Tailwind v4，fork 自 [serene-ink](https://github.com/) 主題並客製為醫學內容站
- 部署：GitHub Actions → Cloudflare Pages（`main` push 自動 build & deploy）
- AI 引用優化：`public/llms.txt` + 全站 `WebSite + Physician` JSON-LD + 文章層 `BlogPosting + MedicalWebPage + FAQPage`

## Quick Start

```bash
pnpm install
pnpm dev                                 # 本地預覽 localhost:4321
pnpm build                               # 靜態 build → dist/
```

## 寫一篇文章

```bash
# 一般文章（隨筆、書摘、coding 雜記）
pnpm run new-post "你的標題"

# 醫療文章（衛教、新藥整理、治療進展）— 含完整 frontmatter + 章節骨架
pnpm run new-post:medical "你的標題"

# 上稿前必跑：法規禁用詞 + medical frontmatter + 參考文獻區塊
pnpm run audit:posts
```

新檔案會落在 `src/posts/<YYYY>/<slug>.mdx`。

## Audit

```bash
pnpm run audit:posts
```

檢查項目：

- **法規禁用詞**：保證 / 根治 / 最有效 / 永不復發 / 第一例 / 唯一 / 立即諮詢 / 歡迎預約
- **frontmatter 完整性**（`medical: true` 文章必填）：reviewer、reviewedDate、medicalCondition、reviewerCredentials
- **參考文獻區塊**：醫療文章需有「## 參考文獻」或「## References」標題與 ≥ 1 個 URL
- **lead paragraph 長度**：≤ 30 字會被警告（建議前 100 字直接給答案）

任一 ERR → 退出碼 1，**不可上稿**。

## 完整作業規範

詳見 [`CLAUDE.md`](./CLAUDE.md)：目錄結構、frontmatter 全規範、OpenEvidence MCP 引用流程、JSON-LD 對照表、上稿 checklist。

## 編輯方針摘要

1. 依 NCCN / ASCO / ESMO 最新指引、PubMed 索引論文
2. 每篇醫療文章由本人署名審稿、文末標註審稿日期與最後更新日期
3. 個案經驗一律去識別化，並僅以教學、衛教為目的
4. 不寫個別醫療建議、不從事醫療業務招徠

## License

文章內容（`src/posts/`）：[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)
程式碼（其他所有檔案）：[MIT](./LICENSE)
