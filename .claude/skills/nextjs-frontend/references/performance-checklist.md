# Performance checklist and budgets

Budgets (constitution Principle II), measured with Lighthouse on mobile
emulation, simulated 4G, against a production build (`next build && next start`):

| Metric                         | Budget      |
|--------------------------------|-------------|
| Performance score              | ≥ 90        |
| Largest Contentful Paint       | ≤ 2.5 s     |
| Cumulative Layout Shift        | ≤ 0.1       |
| Interaction to Next Paint      | ≤ 200 ms    |
| Time to First Byte             | ≤ 800 ms    |
| Total JS (landing, compressed) | ≤ 200 KB    |
| Total page weight (landing)    | ≤ 1.5 MB    |

## Run locally before pushing a UI change

```bash
pnpm --filter web build
pnpm --filter web start &            # serves on :3000
npx @lhci/cli autorun --config=lighthouserc.json
```

`lighthouserc.json` at the repo root encodes the budgets as assertions; CI
runs the same command, so a local pass predicts a CI pass.

## Bundle analysis

```bash
ANALYZE=true pnpm --filter web build
```

Open the client bundle report. If a page's first-load JS grew, find the
import that caused it: a client component importing a server-only helper, a
date/i18n library pulled into the client, an icon set imported wholesale
instead of per-icon.

## Common regressions and the fix

- **Hero image not the LCP element / late LCP**: add `priority`, correct
  `sizes`, make sure the image is not inside a client component that mounts
  late.
- **CLS from CMS content**: set explicit `width`/`height` from the media
  document; reserve min-heights for sections whose content varies.
- **Big JS jump**: a section became a client component. Split the
  interactive part (accordion header, carousel controls) into a small child.
- **Slow TTFB**: a query lost its `cachedQuery` wrapper or the page became
  dynamic (reading `cookies()`/`headers()` in a public page makes it
  dynamic; read the session only in `account/*` or in a small client-island).
- **Fonts flashing**: a `<link>` to a font CDN crept in; use `next/font`.
- **Third-party script**: load with `next/script` lazily or drop it.

## Images from the CMS

Payload generates size variants (`thumbnail`, `card`, `hero`). Pick the
variant that matches the rendered width and pass its `width`/`height`.
Serve AVIF/WebP via `next/image` (`formats` configured in `next.config.ts`).
