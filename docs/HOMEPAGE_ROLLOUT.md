# Homepage rollout checklist

Approved on November 6, 2026: the Cadence-inspired statistics preview becomes the main homepage after the checks in this file pass. This is not a redesign of the other public URLs and not a new About biography.

## Approved reference

- Visual reference: the current `/preview/dashboard.html` layout. Dark introduction, light count panels, Powerball red and Mega Millions blue, existing LotteryMigo logo.
- Floating glossy numbered balls in a reserved strip. Hover lifts them. Click or tap bounces them inside that strip only. They are decoration, not picks or predictions.
- Fixes that stay: readable inactive pool controls, sticky navigation that does not steal ordinary clicks or keyboard focus, and a table caption that does not repeat "Powerball Powerball".
- Production features that stay on `/`: the existing title, description, H1, canonical, Open Graph tags, key facts, Dataset JSON, sign-in, saved picks, CSV download, heatmap, draw history, number ideas, Buy Me a Coffee link, AdSense, and the analytics opt-in.

## Rollback

If a critical flow fails after this change is on main, revert the rollout commit. Do not rewrite history.

```bash
git revert <rollout-commit-sha>
git push origin main
```

The previous homepage remains in the parent commit. `/preview/dashboard.html` can stay as the noindex experiment. The service worker cache name stays `lotterymigo-shell-v3`. Navigations are network-first, and the new dashboard CSS and script are not in the precache list, so a reload gets the new homepage assets without a cache-name change. `design.css` is precached and was not edited.

## Checks before merge

- Root is indexable. It does not use `noindex` and it does not say "Design preview".
- One AdSense script, one `assets/analytics.js`, the existing Search Console meta, and unchanged `ads.txt`, verification file, and `site-config.js` slot and measurement values.
- `npm run test:preview` and `npm run test:analytics` pass.
- `node scripts/build-content.mjs` still rewrites the key facts, and a second run does not duplicate tags.
- `node scripts/build-www.mjs` leaves the app copy without analytics or AdSense.
