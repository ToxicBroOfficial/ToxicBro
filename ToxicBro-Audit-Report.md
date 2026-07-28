# ToxicBro Website — Full Audit Report
Repo: `ToxicBroYT/ToxicBro` · Domain: `https://toxicbro.pages.dev` · Stack: static HTML + Cloudflare Pages + Cloudflare Pages Function + GitHub Actions
Audited: 2026-07-28 (remediation pass completed in the local project files)

## Local remediation status
- Fixed locally: dead API endpoint removed, canonical/OG URLs aligned to extensionless paths, large SVG favicon link removed from the homepage, homepage debug logging reduced, and the SEO update script updated to replace the fallback stats block reliably.
- Remaining follow-up: push these changes to GitHub and re-run the workflow so the live automation can be validated end-to-end.

---

## TL;DR — the one thing to fix today

**Your daily stats/video-sync automation is currently broken.** On 2026-07-27 a commit ("JUst See") deleted `package.json` from the repo. The GitHub Actions workflow's "Update SEO metadata" step runs `npm run update-seo-data`, which needs that file — without it the step fails and the workflow never reaches the commit/push step. Proof: the last bot commit in your history is `🤖 Auto-update: New video + updated stats (2026-07-26 18:43:17 UTC)`, and there hasn't been one since, even though the workflow runs daily. Your `channel.json`/`videos.json` are now frozen and will keep drifting from your real stats until this is fixed.

**Also:** the zip you gave me is missing the entire `.github/` folder (workflows + scripts), even though those files exist in your Git history at `HEAD`. If your actual local folder is in this state too, running a normal `git add -A && git commit && git push` from that machine would delete your automation from GitHub entirely. Run `git status` there before you commit anything else.

---

## 🔴 Critical — actively broken right now

### 1. Automation pipeline is broken (missing `package.json`)
- **What happened:** commit `fb92fde` ("JUst See", 2026-07-27 16:45 +0600) deleted `package.json`.
- **Why it matters:** `.github/workflows/update-youtube-data.yml` has a step `run: npm run update-seo-data`. With no `package.json`, npm has no script to run and the step fails — the workflow stops before the commit/push step. Nothing downstream of it (including the daily stats commit) runs.
- **Evidence:** channel.json / videos.json `updatedAt` both stuck at `2026-07-26T18:43:17.33Z`; no `GitHub Actions Bot` commits after that timestamp despite the cron firing at `21:00 UTC` daily since.
- **Fix:**
  ```bash
  git show fb92fde~1:package.json > package.json
  git add package.json
  git commit -m "Restore package.json (accidentally deleted, broke update-seo-data workflow)"
  git push
  # then re-run the workflow manually once (Actions tab → Update YouTube Data → Run workflow)
  # to confirm it completes end-to-end again
  ```

### 2. `.github/` folder missing from your local working copy
- `git ls-tree HEAD` shows `.github/workflows/update-youtube-data.yml`, `.github/scripts/fetch-youtube-data.js`, and `.github/scripts/state.json` as tracked files — but none of them are in the zip you uploaded, even though `.git/` itself is.
- If this matches your actual local folder (not just an artifact of how the zip was made), your next `git add -A` would **delete these from GitHub too**.
- **Fix:** on the machine you work from, run `git status`. If it shows `.github/...` as deleted, run `git checkout HEAD -- .github` to restore them before committing anything else.

### 3. `functions/api/youtube.js` is dead code, deployed but unused
- Nothing in `index.html` (or any other page) ever calls `/api/youtube`. Your live data path is entirely different: static `channel.json` / `videos.json`, refreshed by `.github/scripts/fetch-youtube-data.js`.
- This Cloudflare Pages Function is still deployed, still holds your `YOUTUBE_API_KEY` / `YOUTUBE_API_KEY_FALLBACK`, and still has its own rate limiter and CORS logic — for a code path nothing uses.
- **Fix:** either delete `functions/api/youtube.js` (and drop the now-unneeded `https://api.allorigins.win` entry from your CSP `connect-src`, which was for an even older proxy-based approach — see #10), or, if you have a future use for it, wire something to actually call it and document why two data paths coexist.

### 4. Sitemap and canonical tags disagree with each other
- `sitemap.xml` lists extensionless URLs: `https://toxicbro.pages.dev/about`, `/achievements`, `/biography`, etc.
- Every one of those pages' own `<link rel="canonical">` tag says the **`.html`** version is canonical: `https://toxicbro.pages.dev/about.html`.
- You're telling Google two different "correct" URLs for the same page. Pick one (extensionless is the more modern convention) and make sitemap + canonical + any internal links agree.

### 5. `llms.txt` points at the wrong domain
- It links to `https://toxicbro.com/...`, not `https://toxicbro.pages.dev/...` (the domain used everywhere else — canonical tags, JSON-LD, CSP, robots.txt, sitemap).
- I searched for `toxicbro.com` and found nothing tying it to your channel — it doesn't appear to be a domain you control, so any AI crawler that reads `llms.txt` and follows those links most likely won't land on your real site.
- It also references `/pages/about.html`-style paths that don't match your current flat file layout (they happen to work only because of the `/pages/* → /:splat` redirect in `_redirects` — see #14). Point these directly at `https://toxicbro.pages.dev/about.html` etc.

---

## 🟠 High priority

### 6. `favicon/favicon.svg` is 2.3 MB
It's not a real vector — it's a PNG re-encoded as base64 and wrapped in `<svg><image>` (generated by RealFaviconGenerator). Because your `<head>` links it with `type="image/svg+xml"`, browsers that prefer SVG icons will fetch a 2.3 MB "favicon." Regenerate a real vector SVG, or just drop that one `<link rel="icon">` line — your `.ico` (15 KB) and PNG favicons (14–43 KB) already cover every browser fine.

### 7. CORS sets `Access-Control-Allow-Origin: null` for disallowed origins
In `functions/api/youtube.js`, `getAllowedOrigin()` returning `null` gets turned into the literal header value `"null"` rather than omitting the header. Browsers treat requests with an `Origin: null` header (sandboxed iframes, some local/file contexts) as matching that literally — a known CORS anti-pattern. Low real-world risk given #3 (nothing calls this endpoint), but fix it if you keep the function: omit the CORS header entirely instead of setting it to the string `"null"`.

---

## 🟡 Medium priority

### 8. Same cache duration for success *and* error responses
`functions/api/youtube.js` uses the same `Cache-Control: ... s-maxage=43200, stale-while-revalidate=86400` header on 200, 429, and 502 responses alike. If this endpoint is ever hit and cached at the edge, a single YouTube API failure or rate-limit hit could get served to visitors for up to 12 hours. Error/rate-limited responses should use `no-store` or a very short max-age.

### 9. `update-seo-data.js`'s stat sync silently no-ops
The script's regex targets look for `"subscriberCount": "…"` style quoted JSON literals inside `index.html`. But `index.html`'s JS only ever references these as object properties (`stats.subscriberCount`), never as that literal string — so those three `.replace()` calls never match anything, and `.replace()` on no match just silently returns the string unchanged (no error, no warning). Net effect: `DEFAULT_FALLBACK_STATS = { subscribers: 17300, views: 1444684, videos: 64 }` (the numbers shown for the instant before live data loads) is **not** actually being kept in sync by this script and has to be updated by hand. Worth either fixing the regex target or removing the dead replacement calls so the script doesn't imply something it doesn't do.

### 10. CSP maintained in two places
The exact same policy string is duplicated: once as a real HTTP header in `_headers`, and again as a `<meta http-equiv="Content-Security-Policy">` tag inside `index.html`. They currently match, but nothing keeps them in sync — edit one and forget the other, and you'll get confusing, hard-to-debug behavior differences between browsers. Keep the header (it's applied earlier and supports directives like `frame-ancestors` that meta tags can't) and drop the meta tag.

### 11. CSP `default-src 'self' https:` is broader than it looks
Because `default-src` falls back to `https:` for any directive you haven't explicitly set, directives like `object-src`, `base-uri`, `form-action`, and `manifest-src` currently allow *any* HTTPS origin. Add explicit tightening:
```
object-src 'none'; base-uri 'self'; form-action 'self';
```
(`form-action 'self'` costs nothing — your contact page uses a plain `mailto:` link, not a form.)

---

## 🟢 Low priority / cleanup

### 12. Debug logging shipped to production
`index.html` runs a `console.log('📋 SITE SECTIONS CHECK...')` block on every load, plus ~15 emoji-prefixed `console.log` calls throughout `loadVideos()`. Harmless, but unprofessional if anyone opens devtools, and it's unnecessary work on every page view. Strip it (or gate it behind a `?debug=1` flag) before your next cleanup pass.

### 13. Dead proxy code left in `index.html`
`PROXY`, `PROXY_FALLBACKS`, `currentProxyIndex`, and `buildJsonUrl()` are explicitly commented `// DEPRECATED - Using YouTube API v3 now` but are still declared and shipped, unused. The CSP's `connect-src` still allow-lists `https://api.allorigins.win` purely to support this dead path — safe to delete both.

### 14. Stale "hourly" comment vs. actual daily cron
`index.html`'s script comment says data is "Auto-generated by GitHub Actions hourly," but the workflow cron is `0 21 * * *` — once a day. Fast updates only happen via the `repository_dispatch`/`workflow_dispatch` triggers when something external fires them. Fix the comment so it doesn't mislead future-you about data freshness.

### 15. Leftover `/pages/` structure
`_redirects` has `/pages/* /:splat 301`, secondary pages link home via `../index.html` (works because browsers clamp `../` at the domain root — not actually broken, just confusing), and `achievements.html` defensively tries three different relative paths (`['../channel.json', '/channel.json', './channel.json']`) to find `channel.json`. All three are residue from an earlier `/pages/` folder structure that's since been flattened. None of these are currently broken, but they're confusing for future maintenance and easy to break by "fixing" the wrong one. Worth a deliberate cleanup pass once the automation (#1–#2) is stable.

### 16. Per-page data-fetching logic duplicated, not shared
Each secondary page (`achievements.html`, etc.) reimplements its own `channel.json` fetch/parse logic rather than sharing one script with `index.html`. Consolidating into one small shared `.js` file would cut duplication and the risk of pages drifting out of sync with each other.

### 17. Hardcoded avatar/image URLs in ~4 places
The YouTube CDN avatar URL is hardcoded in `og:image`, `twitter:image`, the JSON-LD `Person.image`, and the on-page `<img>` tag. If you ever change your channel photo, all four need manual updates (nothing in the automation touches these). Consider having `fetch-youtube-data.js` pull and store the current avatar URL too.

### 18. Commit message hygiene
Recent history has a lot of `x1`, `x9`, `x11`, `x109`, `fix09`, `DF`, `Xx`, `JUst See` style messages — hard to `git blame` or bisect through later, especially with a solo/small team. Not urgent, but worth tightening up going forward (`type: what changed`, e.g. `fix: restore package.json for SEO workflow`).

---

## ✅ What's actually working well
- `escapeHTML()` is used correctly before injecting YouTube video titles into `innerHTML` — deliberate, correct XSS prevention.
- Contact page uses a plain `mailto:` link instead of a form — zero backend/CSRF surface to maintain.
- Every `target="_blank"` link is correctly paired with `rel="noopener noreferrer"`.
- Strong baseline SEO: unique per-page titles/descriptions, canonical tags, OG/Twitter cards, JSON-LD, sitemap, robots.txt.
- `prefers-reduced-motion` and coarse-pointer checks correctly disable the particle-canvas animation for mobile and motion-sensitive users.
- The automation's *design* — a cheap RSS-feed check for new uploads, only calling the quota-expensive Search API when something's actually new — is a smart, quota-conscious approach. It's currently broken (see #1), not badly designed.
- One thing worth a conscious (not accidental) decision: your `Person` JSON-LD block publishes a full legal-name `alternateName` and a `birthDate`. That's a deliberate SEO move (it helps Google build a Knowledge Panel), but it also means that exact info is published in machine-readable form on every page — worth confirming that's what you want out there rather than something left over from a template.

---

## Suggested order of operations
1. Restore `package.json` (#1) and confirm the workflow runs clean end-to-end (manual `workflow_dispatch`).
2. Check your local `.github/` folder against `git status` before your next commit (#2).
3. Decide whether to delete or wire up `functions/api/youtube.js` (#3) — this also resolves #7 and #8.
4. Fix the sitemap/canonical mismatch (#4) and the `llms.txt` domain (#5).
5. Swap in a real `favicon.svg` or drop the link (#6).
6. Everything else (#9–18) is cleanup you can batch whenever convenient — none of it is currently causing visible breakage.
