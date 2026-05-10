# Session Resume — 2026-05-10

下次開新對話可以把這份直接給 Claude 讀，省掉重新摸路。

## TL;DR

- 站已上線 → https://lin.hsiehting.com
- 主題 `serene-ink` 客製化過、CV 頁建好、自訂游標已移除、html lang=zh-TW
- GitHub repo：https://github.com/htlin222/lin-hsiehting （public）
- `git push` 自動觸發 GH Actions → 部署到 Cloudflare Pages
- `physician.tw` 的 Gandi 遷移計畫**已放棄**，改走 hsiehting.com 子網域

## Live URLs

| URL | 用途 |
|---|---|
| https://lin.hsiehting.com | 正式站 |
| https://lin.hsiehting.com/cv | CV 頁 |
| https://lin-hsiehting.pages.dev | CF Pages 直接 URL（備援）|
| https://github.com/htlin222/lin-hsiehting | repo |
| https://github.com/htlin222/lin-hsiehting/actions | CI |
| https://dash.cloudflare.com/3a77813251d473c40d8873a59f6c0e80/pages/view/lin-hsiehting | CF Pages dashboard |

## 關鍵 ID / 路徑

```
CF Account ID:   3a77813251d473c40d8873a59f6c0e80
hsiehting.com Zone ID: 738c462199c52f092150fb20bb14f230
CF Pages project name: lin-hsiehting
GitHub repo: htlin222/lin-hsiehting (default branch: main)
本地專案路徑: ~/lin-hsiehting
Secrets / token 暫存: ~/.config/onco/env  (chmod 600)
```

## 已完成的 commits

```
init: bootstrap from serene-ink theme
feat: lang zh-TW, /cv page, custom favicon, GH deploy workflow
ci: pin wrangler to v4 in deploy workflow
ci: deploy via direct wrangler invocation
```

## 客製化清單（已做）

- [x] `src/config.ts` — 站名、bio、nav (文章/標籤/CV/關於)、socials.github
- [x] `astro.config.mjs` — `site: "https://lin.hsiehting.com"`
- [x] `src/layouts/Layout.astro` — `<html lang="zh-TW">`
- [x] `src/layouts/Layout.astro` — 移除自訂游標 div + script
- [x] `src/pages/cv.astro` — 新建 CV 頁（positions/exp/edu/pubs/talks/certs）
- [x] `public/favicon.svg` — 替換成「林」字 mark（dark/light auto）
- [x] `.github/workflows/deploy.yml` — 直接 `pnpm dlx wrangler@4`，不走 wrangler-action
- [x] `src/scripts/cursor.ts` — 已刪（rip 進 graveyard）

## 還沒做的事（依優先序）

1. **撤掉外洩過的 CF API token**（在對話歷史出現過）。到 https://dash.cloudflare.com/profile/api-tokens 找 `physician-tw-migration` → Roll 或 Delete。Roll 後拿新 token 替換 GH secret + 本地 `~/.config/onco/env`。
2. **砍掉 demo posts**：`src/posts/2022/` 跟 `src/posts/2026/` 是上游 theme 的範例文，留著有點假。準備寫第一篇前刪掉。
3. **寫 `public/llms.txt`**（30 行內，列主要 URL，方便 AI 引擎索引）。
4. **加基本 JSON-LD**：在 `Layout.astro` 加 `Person` schema，文章模板加 `BlogPosting`。
5. **改 og:image**：現在是 theme 預設的 `/images/home.webp`，可改成 1 張你選的圖（最少 1200×630）。
6. **改 favicon.ico**：目前只換了 `.svg`，`.ico` 還是 theme 原本那顆。Safari 老版會 fallback 到 ico，可以用 https://realfavicongenerator.net 從 svg 生 ico。
7. **裝 Claude Code SEO skill**（之後寫文章時用 lint）：
   ```bash
   # 6.3k stars 那個
   git clone https://github.com/AgriciDaniel/claude-seo ~/.claude/skills/claude-seo
   ```
8. **寫第一篇真的文章**——前面 2-7 都是錦上添花，文章才是主軸。

## 我做了但失敗 / 該注意的事

### `~/.config/onco/env` 被某個 hook 砍了

session 中段這個檔案突然消失（不在 `/tmp/graveyard-htlin/` 裡，所以**不是 rip 砍的**）。已經重建。如果再消失，去 `~/.claude/settings.json` 翻 hooks 或 PreToolUse 看誰會碰 `~/.config/onco/`。

### CF API token 還在 chat 歷史

兩顆都進過對話：
- `cfut_ovEeoZUo...48d8` — 第 1 顆（權限不全，已棄用）
- `cfut_83oiZvAH...e75a` — 第 2 顆（目前在 GH secret 跟本地 env 用）

正式安全做法：roll 第 2 顆 → 同步更新 GH secret + 本地 env。短期用著不致於出事（token 範圍只能讀寫這個 account 的 zone/pages，沒帳務權限）。

### Cloudflare Registrar 不支援 .tw

如果未來想把 `physician.tw` 也搬過來，**只能**「外部 registrar (Gandi/別家) + CF DNS」這條路。CF Registrar 不收 .tw / .com.tw 等 ccTLD。

## SEO 建議的 fact-check（針對之前那串長 message）

| 推薦項 | npm/repo 是否真存在 | 我的建議 |
|---|---|---|
| `jdevalk/seo-graph` (GitHub) | ✅ 真，27 ⭐，5/7 才 push | 等寫完 5+ 篇文章再裝 |
| `@jdevalk/astro-seo-graph` (npm) | ✅ 真，v2.0.0，4/9 publish | 同上 |
| `AGENTS.md` 內 113KB ≈ 3000 行 | ✅ 真 | 真的可拿來餵 Claude |
| `@jdevalk/seo-graph-core` (npm) | ❌ 不存在 | 對方幻覺出來的 |
| `starlight-blog` / `astro-llmstxt` | ❌ 都不存在 | npm 上查無 |
| `aaron-he-zhu/seo-geo-claude-skills` | ✅ 真，1.5k ⭐ | 可裝 |
| `AgriciDaniel/claude-seo` | ✅ 真，6.3k ⭐ | **更推薦**，下次裝 |

**結論**：`Joost de Valk` + `seo-graph` 是真的金礦但對你目前內容量還沒到非用不可。**不要換 Starlight**——你選 serene-ink 是有理由的，換框架是整站重做。

## 下次開 session 起手的話

```bash
cd ~/lin-hsiehting
source ~/.config/onco/env  # 載入 CF_API_TOKEN, CF_ACCOUNT_ID, ZONE_ID
git status
git log --oneline -5
gh run list --repo htlin222/lin-hsiehting --limit 3
```

或直接給 Claude：「讀 ~/lin-hsiehting/docs/RESUME.md，從『還沒做的事』第 1 項繼續」。
