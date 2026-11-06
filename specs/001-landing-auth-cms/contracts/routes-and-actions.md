# Contract: Public routes, server actions, cache tags and test hooks

## Routes

| Route | Rendering | Data | Auth | Notes |
|-------|-----------|------|------|-------|
| `/` | cached server render (tags: `landing-page`, `site-settings`, `personas`, `categories`, `media`); `draftMode` bypasses cache | `getLandingPage`, `getSiteSettings`, `getActivePersonas`, `getCategoriesForAudience` | none | Hero + sections; anchors from block `anchor`; JSON-LD Organization + FAQPage |
| `/login?next=` | cached shell + client form | `getSiteSettings` (header/footer) | redirect to `next` or `/account` if already signed in | |
| `/register` | cached shell + client form | `getActivePersonas` | redirect if signed in | provider → persona select from active personas |
| `/account` | dynamic (reads cookie) | `getCurrentUser` | required → `/login?next=/account` | name, email, account type, persona, logout |
| `/admin/*` | Payload | — | `access.admin` (admin/editor) | |
| `/next/preview`, `/next/exit-preview` | route handlers | — | editor + secret | |
| `/api/health` | route handler | DB ping | none | |

Navigation between `/`, `/login`, `/register`, `/account` uses `next/link`
(no full reloads). In-page links use `href="#<anchor>"` and the header marks
the active section with `aria-current="true"`.

## Server actions (`modules/auth/actions.ts`)

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

All three are idempotent under double submit (forms disable the button while
pending; a second concurrent register with the same email fails on the unique
index and returns the duplicate error).

## Cache tags and who revalidates them

| Tag | Revalidated by |
|-----|----------------|
| `landing-page` | `landing-page` global afterChange (+ `revalidatePath('/')`) |
| `site-settings` | `site-settings` global afterChange |
| `personas` | `personas` afterChange/afterDelete |
| `categories` | `categories` afterChange/afterDelete |
| `media` | `media` afterChange/afterDelete |

## Stable test hooks

Prefer roles/names. Where a role is ambiguous, these `data-testid`s are the
contract: `hero`, `hero-primary-cta`, `hero-secondary-cta`, `section-<anchor>`,
`whatsapp-floating`, `nav-mobile-toggle`, `persona-select`, `register-form`,
`login-form`, `account-summary`.

## Environment variables (`apps/web/.env.example`)

| Name | Required | Purpose |
|------|----------|---------|
| `DATABASE_URI` | yes | MongoDB connection string |
| `PAYLOAD_SECRET` | yes | JWT/cookie signing |
| `NEXT_PUBLIC_SITE_URL` | yes | absolute URLs (OG, sitemap, wa.me return) |
| `PREVIEW_SECRET` | yes | draft preview route |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed only | first admin |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | prod | media storage |
