# Contract: Public routes, server actions, cache tags and test hooks

## Locales and addresses (FR-035, FR-036)

English is served at the root (`/`, `/login`, …); Arabic under the `/ar`
prefix (`/ar`, `/ar/login`, …). A request to a root path with no language
cookie is negotiated from `Accept-Language` (first visit) and redirected to
`/ar…` when Arabic is preferred; the switcher sets the `NEXT_LOCALE` cookie
(1 year) and links to the equivalent path in the other language, preserving
the `#anchor` and `?next=` parts. `<html lang="ar" dir="rtl">` on Arabic
pages. Every page emits `alternates.languages` (`en`, `ar`, `x-default`).

## Routes (shown for English; the same routes exist under `/ar`)

| Route | Rendering | Data | Auth | Notes |
|-------|-----------|------|------|-------|
| `/` | cached server render per locale (tags: `landing-page`, `site-settings`, `personas`, `categories`, `option-sets`, `media`); `draftMode` bypasses cache | `getLandingPage({ locale })`, `getBriefBuilderConfig({ locale })`, `getSiteSettings({ locale })`, `getActivePersonas({ locale })`, `getCategoriesForAudience({ locale })` | none | Hero + sections; anchors from block `anchor`; JSON-LD Organization + FAQPage in page language |
| `/login?next=` | cached shell + client form | `getSiteSettings` (header/footer) | redirect to `next` or `/account` if already signed in | |
| `/register` | cached shell + client form | `getActivePersonas({ locale })` | redirect if signed in | provider → persona select from active personas |
| `/account` | dynamic (reads cookie) | `getCurrentUser`, `getMyBriefs` | required → `/login?next=/account` | name, email, account type, persona, my briefs, logout |
| `/admin/*` | Payload | — | `access.admin` (admin/editor) | admin UI language (en/ar) and theme (light/dark/system) are per-user preferences inside Payload; content locale switcher in the edit views |
| `/next/preview`, `/next/exit-preview` | route handlers | — | editor + secret | |
| `/api/health` | route handler | DB ping | none | |
| `/api/cron/cleanup` | route handler | deletes rate-limit rows older than 1 h | `Authorization: Bearer $CRON_SECRET` | called every 15 min by the host scheduler |

Navigation between `/`, `/login`, `/register`, `/account` uses `next/link`
(no full reloads). In-page links use `href="#<anchor>"` and the header marks
the active section with `aria-current="true"`.

## Server actions (`modules/auth/actions.ts`, `modules/brief/actions.ts`)

```ts
type FormState = { errors?: Record<string, string[]>; formError?: string } | undefined

register(prev: FormState, formData: FormData): Promise<FormState>
  // fields: name, email, password, accountType, persona?, categories[]?
  // success: creates user, logs in, redirect('/account')
  // errors: zod field errors; duplicate email → errors.email; inactive persona → errors.persona

login(prev: FormState, formData: FormData): Promise<FormState>
  // fields: email, password, next?
  // success: sets cookie, redirect(next ?? '/account')
  // errors: formError 'Email or password is incorrect.' | 'Too many attempts. Try again in 15 minutes.'

logout(): Promise<void>
  // clears cookie, redirect('/')
```

### Brief builder (`modules/brief/actions.ts`)

```ts
submitBrief(prev: BriefState, formData: FormData): Promise<BriefState>
  // fields: persona, one field per slot token (value or custom text), date?, website (honeypot), sourcePath
  // validates with briefSchema(slots) from the published builder config (server-side, never trusts client slot list)
  // enforces fingerprint dedupe (60 s) and per-visitor limit (site-settings.briefLimitPerHour, cookie-based visitor id)
  // creates the brief (member from session if any), builds the WhatsApp URL with renderBriefMessage
  // progressive enhancement: with JS → returns { ok: true, whatsappUrl, briefId, reference } and the client opens WhatsApp in a new tab;
  //                           without JS → redirect(whatsappUrl)
  // errors: { errors: { [token]: string[] }, formError? }  (429 → formError from messages)
```

All four are idempotent under double submit (forms disable the button while
pending; a second concurrent register with the same email fails on the unique
index and returns the duplicate error).

## Visitor preferences

| Preference | Where | Set by | Read by |
|------------|-------|--------|---------|
| language | cookie `NEXT_LOCALE` = `en` \| `ar`, max-age 1 year (`localeCookie.maxAge`) | language switcher; first-visit negotiation (set when the chosen locale differs from `Accept-Language`) | `proxy.ts` (redirect), `[locale]` layout |
| theme | `localStorage.theme` = `light` \| `dark` \| `system` | theme toggle | inline no-flash script in `<head>`, theme provider |

## Cache tags and who revalidates them

Cached queries are keyed by locale (`cachedQuery(['landing-page'], fn, { locale })`
produces distinct cache entries per locale) and a single tag revalidation
clears both languages.

| Tag | Revalidated by |
|-----|----------------|
| `landing-page` | `landing-page` global afterChange (+ `revalidatePath('/')`) |
| `site-settings` | `site-settings` global afterChange |
| `personas` | `personas` afterChange/afterDelete |
| `categories` | `categories` afterChange/afterDelete |
| `media` | `media` afterChange/afterDelete |
| `option-sets` | `option-sets` afterChange/afterDelete |

## Stable test hooks

Prefer roles/names. Where a role is ambiguous, these `data-testid`s are the
contract: `hero`, `hero-primary-cta`, `hero-secondary-cta`, `section-<anchor>`,
`whatsapp-floating`, `nav-mobile-toggle`, `persona-select`, `register-form`,
`login-form`, `account-summary`, `locale-switcher`, `theme-toggle`,
`brief-builder`, `brief-slot-<token>`, `brief-submit`, `brief-success`,
`brief-reference`, `whatsapp-secondary`.

## Environment variables (`apps/web/.env.example`)

| Name | Required | Purpose |
|------|----------|---------|
| `DATABASE_URI` | yes | PostgreSQL connection string (`postgres://…`) |
| `PAYLOAD_SECRET` | yes | JWT/cookie signing |
| `NEXT_PUBLIC_SITE_URL` | yes | absolute URLs (OG, sitemap, wa.me return) |
| `PREVIEW_SECRET` | yes | draft preview route |
| `CRON_SECRET` | yes | bearer token for `/api/cron/cleanup` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed only | first admin |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | prod | media storage |
