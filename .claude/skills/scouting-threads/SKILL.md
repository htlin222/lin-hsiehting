---
name: scouting-threads
description: Queries Meta Threads via threads-scraper.p.rapidapi.com to find latest posts or users matching a keyword. Use when the user asks to scout Threads / 脈搜索 a topic, build a content pulse for zh-TW medical writing, or wants the latest discussion on a Chinese-language keyword.
---

# Scouting Threads (RapidAPI)

`threads-scraper.p.rapidapi.com` is a paid RapidAPI endpoint that proxies Threads search. Used on this site to scout zh-TW cancer / oncology discussion before writing衛教 posts (see [docs/topic-proposals/threads-pulse-2026-05.md](../../../docs/topic-proposals/threads-pulse-2026-05.md) for output format).

## Auth

Key lives in `.env` as `RAPIDAPI_KEY` (`.env` is gitignored — never hardcode the key in scripts, commits, or chat output). Headers required on every request:

```
x-rapidapi-host: threads-scraper.p.rapidapi.com
x-rapidapi-key:  $RAPIDAPI_KEY
```

If the user has not yet set the env var, ask them to add `RAPIDAPI_KEY=...` to `.env`. Don't paste the value back into the chat after reading it.

## Two endpoints actually work

| Endpoint | Returns | Use for |
|---|---|---|
| `GET /api/v1/posts/search?query=<urlenc>` | up to 20 posts per page + `cursor` | **discussion pulse — the one you want 99% of the time** |
| `GET /api/v1/users/search?query=<urlenc>` | up to 10 user accounts | finding KOL / medical accounts |

Everything else (`/keyword/search`, `/search/posts`, `/tags/search`, `/topics/search` …) returns 404. Do not guess; only the two above exist.

## Quirks (learned the hard way)

1. **Token match, not substring.** `query=標靶` → 0 results; `query=標靶治療` → 19. Always use full phrases users would actually type. If a single Chinese word returns empty, retry with a 2–3 character compound before declaring "no discussion".
2. **URL-encode CJK manually.** Use `python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$kw"` — letting the shell pass raw bytes works but breaks under some quoting.
3. **RTK proxy hijacks the response shape.** This repo's shell runs commands through `rtk`, which token-compresses JSON to a schema preview. To get raw JSON for parsing, prefix with `rtk proxy`:
   ```bash
   rtk proxy curl -s "https://threads-scraper.p.rapidapi.com/api/v1/posts/search?query=..." \
     -H 'x-rapidapi-host: threads-scraper.p.rapidapi.com' \
     -H "x-rapidapi-key: $RAPIDAPI_KEY"
   ```
4. **Pagination via `cursor`.** Each `results[]` entry has a `cursor` field; the last one is the next-page token. To go deeper than 20: pass `&max_id=<cursor>` (untested in this repo — verify before relying on it).
5. **Paid quota.** RapidAPI bills per call. For a 7-keyword pulse you spend ~7 requests; for a paged sweep you can hit limits fast. Cache responses to `/tmp/threads_<kw>.json` while iterating on the parser.

## Response shape (only the useful fields)

```
results[].node.thread.thread_items[].post
  .pk                                   # post id (string)
  .code                                 # shortcode → URL slug
  .taken_at                             # unix seconds
  .user.username                        # @handle
  .caption.text                         # may be null
  .like_count
  .text_post_app_info.direct_reply_count
  .text_post_app_info.repost_count
```

**Permalink:** `https://www.threads.net/@<username>/post/<code>`

**De-dup:** Threads sometimes returns the root post + a reply in the same thread. Dedupe by `post.code`.

## Minimal extractor (copy-paste-friendly)

```python
import json, datetime
def rows(path):
    d = json.load(open(path))
    out, seen = [], set()
    for r in d.get('data', {}).get('results', []):
        for ti in r['node']['thread']['thread_items']:
            p = ti['post']
            code = p.get('code')
            if not code or code in seen: continue
            seen.add(code)
            out.append({
                'when':    datetime.datetime.fromtimestamp(p.get('taken_at') or 0).strftime('%Y-%m-%d'),
                'user':    (p.get('user') or {}).get('username',''),
                'url':     f"https://www.threads.net/@{(p.get('user') or {}).get('username','')}/post/{code}",
                'likes':   p.get('like_count') or 0,
                'replies': (p.get('text_post_app_info') or {}).get('direct_reply_count') or 0,
                'reposts': (p.get('text_post_app_info') or {}).get('repost_count') or 0,
                'caption': ((p.get('caption') or {}).get('text','') or '').replace('\n',' ').strip(),
            })
    return sorted(out, key=lambda r: r['when'], reverse=True)
```

## End-to-end pulse workflow

When the user asks "find the latest discussion on X" or "scout Threads for Y":

1. Pick 5–7 keywords that match what real users type (e.g. `化療`, `免疫治療`, `標靶治療` — not `標靶`).
2. Fetch each in parallel, save to `/tmp/threads_<kw>.json`:
   ```bash
   for kw in 化療 免疫治療 標靶治療; do
     enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$kw")
     rtk proxy curl -s "https://threads-scraper.p.rapidapi.com/api/v1/posts/search?query=$enc" \
       -H 'x-rapidapi-host: threads-scraper.p.rapidapi.com' \
       -H "x-rapidapi-key: $RAPIDAPI_KEY" > "/tmp/threads_${kw}.json" &
   done; wait
   ```
3. Run the extractor, sort by `taken_at` desc, dedupe by `code`.
4. Render to `docs/topic-proposals/threads-pulse-<YYYY>-<MM>.md` with the structure of the 2026-05 file:
   - TL;DR — content-gap observations (what's missing from the discussion vs. what衛教 the user could write)
   - Suggested post topics ranked by補位 opportunity
   - One markdown table per keyword: `日期 | @user | ♥ | ↩ | ⟳ | 摘要`
5. Quote no more than ~90 chars of each caption (fair use; user attribution via permalink).

## Things this skill is NOT for

- Posting to Threads (this API is read-only).
- Scraping a single user's full timeline (different endpoint; not explored).
- Real-time monitoring — RapidAPI quota makes polling expensive. Use cron-style weekly/monthly pulls instead.
- Anything outside the user's authenticated RapidAPI subscription.
