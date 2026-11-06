# Data Model: Landing Page, Member Accounts and CMS-Managed Content

**Date**: 2026-11-06 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

All entities are Payload collections or globals in MongoDB. Access functions
(`shared/payload/access.ts`): `anyone`, `authenticated`, `isAdmin`
(`roles` ∋ admin), `isEditor` (`roles` ∋ admin | editor), `isAdminOrSelf`
(admin → true; member → `{ id: { equals: user.id } }`). Default for anything
not listed is deny.

## Collections

### `users` (auth-enabled) — FR-019…FR-025

| Field | Type | Rules |
|-------|------|-------|
| `email` | email (auth) | unique, required, lowercase on save |
| `password` | auth | ≥ 8 chars (zod `registerSchema`), hashed by Payload, never returned |
| `name` | text | required, 2–80 chars |
| `roles` | select hasMany | options `admin`, `editor`, `member`; default `['member']`; `saveToJWT`; field access `create/update: isAdmin` |
| `accountType` | select | required; `seeker` \| `provider` |
| `persona` | relationship → `personas` | required when `accountType = provider`; must be active at registration (validated in server action via `isProviderRegistrationValid`) |
| `categories` | relationship → `categories` hasMany | optional; providers only |
| `phone` | text | optional; normalised E.164 if present |
| auth internals | — | `loginAttempts`, `lockUntil`, sessions (managed by Payload) |

Auth options: `tokenExpiration 604800`, `maxLoginAttempts 5`, `lockTime 900000`,
`verify false`, cookies `{ sameSite: 'Lax', secure: prod }`.

Access: `admin: isEditor` (panel entry), `create: anyone`, `read: isAdminOrSelf`,
`update: isAdminOrSelf`, `delete: isAdmin`.

State: `active` → (5 failed logins) → `locked` (until `lockUntil`) → `active`.

### `media` (upload) — FR-017

| Field | Type | Rules |
|-------|------|-------|
| `alt` | text | required |
| file | upload | images only (`image/*`), max 10 MB; sizes `thumbnail` 400w, `card` 800w, `hero` 1600w (webp); `focalPoint` on |

Access: `read: anyone`, `create/update/delete: isEditor`. Hook: `afterChange` → `revalidateTag('media','max')`.

### `personas` — FR-026, FR-029, FR-030

| Field | Type | Rules |
|-------|------|-------|
| `singular` | text | required, 2–40 chars ("Photographer") |
| `plural` | text | required ("Photographers") |
| `slug` | text | required, unique, indexed, kebab-case, read-only after create (admin `condition` + `beforeValidate` guard) |
| `description` | textarea | optional, ≤ 300 chars |
| `icon` | relationship → `media` | optional |
| `order` | number | default 100 |
| `active` | checkbox | default true |
| `copy` | group | `seekerCta` ("I need a {persona.singular}"), `providerCta` ("I'm a {persona.singular}"), `providerPitch` (textarea) — placeholders allowed |

Access: `read: anyone`, `create/update/delete: isAdmin`.
Hooks: `afterChange`/`afterDelete` → `revalidateTag('personas','max')`;
`beforeDelete` → throw `ValidationError` if any `users.persona`,
`categories.personas` or `site-settings.activePersonas` references it.

### `categories` — FR-026, FR-029

| Field | Type | Rules |
|-------|------|-------|
| `name` | text | required |
| `slug` | text | required, unique, indexed, immutable |
| `description` | textarea | optional |
| `image` | relationship → `media` | optional |
| `personas` | relationship → `personas` hasMany | required, ≥ 1 |
| `order` | number | default 100 |
| `active` | checkbox | default true |

Access: `read: anyone`, `create/update/delete: isAdmin`.
Hooks: revalidate `categories`; `beforeDelete` refuses if referenced by `users.categories`.

## Globals

### `site-settings` — FR-010…FR-012, FR-027

| Field | Type | Rules |
|-------|------|-------|
| `siteName` | text | required |
| `whatsappNumber` | text | required; `validate: isE164` from domain; stored normalised (`beforeValidate` → `normaliseE164`) |
| `whatsappDefaultMessage` | textarea | default "Hi! I'd like to book a shoot." (placeholders allowed) |
| `contactEmail` | email | optional |
| `social` | array | `{ platform: select(instagram, linkedin, youtube, tiktok, x), url }` |
| `activePersonas` | relationship → `personas` hasMany (ordered) | ≥ 0; warning banner in admin when empty |
| `labels` | group | `seekerLabel`, `providerLabel` templates with placeholders |

Access: `read: anyone`, `update: isAdmin`. Hook: revalidate `site-settings`.

### `landing-page` — FR-001…FR-003, FR-008, FR-009, FR-013…FR-015, FR-018

`versions: { drafts: true }`; `_status` draft/published; Payload records
`updatedAt` and, via `beforeChange`, `publishedBy` (user id) when `_status`
becomes `published`.

| Field | Type | Rules |
|-------|------|-------|
| `hero` | group | `headline` (required, ≤ 80, default "You brief. We shoot."), `subheadline` (≤ 200), `trustChips` array (≤ 3, `text` ≤ 40), `primaryCta` group (`label`, `kind: whatsapp\|link`, `href?`), `secondaryCta` group (same; may be `personaSelector`), `image` → media, `imageMobile` → media |
| `navigation` | array | `{ label, target }` where `target` is a section anchor or path |
| `sections` | blocks | ordered; block types below |
| `seo` | group | `title` (≤ 60), `description` (≤ 160), `ogImage` → media |

Access: `read: anyone` (published only; draft reads require `isEditor`),
`update: isEditor`, `readVersions: isEditor`. Hooks: `afterChange` →
`revalidateTag('landing-page','max')` + `revalidatePath('/')`.

#### Blocks (`sections`)

| Block `slug` | Fields | Renders as |
|--------------|--------|------------|
| `howItWorks` | `anchor` (default `how-it-works`), `heading`, `subheading`, `steps[]` {`title`, `body`, `icon`?} (3–6), `cta`? | numbered steps |
| `features` | `anchor`, `heading`, `subheading`, `items[]` {`title`, `body`, `icon`?} (≤ 8) | "Why us" grid |
| `categoriesGrid` | `anchor`, `heading`, `subheading`, `source: active\|manual`, `categories[]` (manual), `cta`? | specialties grid from `categoriesForPersonas` |
| `personaBand` | `anchor`, `heading` (placeholders), `body`, `layout: combined\|perPersona`, `cta` | "Are you a {persona.singular}?" |
| `faq` | `anchor` (default `faq`), `heading`, `items[]` {`question`, `answer` richText} | accordion + FAQPage JSON-LD |
| `logoCloud` | `anchor`, `heading`, `logos[]` → media (alt required) | trusted-by strip |
| `richText` | `anchor`?, `content` richText | prose |
| `callToAction` | `anchor`?, `heading`, `body`, `primary` cta, `secondary` cta? | banner |

Every block has `anchor` (kebab-case, unique per page — validated in a
global `beforeValidate` hook) so in-page navigation (FR-004) is data-driven.
A block whose item array is empty is skipped by `RenderBlocks` (FR-008).

## Shared domain types (`packages/domain`)

```ts
type Persona = { id: string; slug: string; singular: string; plural: string; order: number; active: boolean; copy?: {...} }
type Category = { id: string; slug: string; name: string; order: number; active: boolean; personas: string[] }
type Cta = { label: string; kind: 'whatsapp' | 'link' | 'personaSelector'; href?: string }
registerSchema = { name, email, password, accountType, persona?, categories? }   // zod
loginSchema = { email, password }
whatsappNumberSchema = E.164 (8–15 digits)
```

## Relationships

```
site-settings.activePersonas ──▶ personas (ordered, many)
categories.personas          ──▶ personas (many)
users.persona                ──▶ personas (one, providers)
users.categories             ──▶ categories (many)
landing-page.hero.image      ──▶ media
landing-page.sections[*]     ──▶ media (logos, icons), categories (manual grid)
personas.icon / categories.image ──▶ media
```

## Indexes

`users.email` (unique, Payload), `personas.slug` (unique), `categories.slug`
(unique), `categories.personas` (multikey), `users.persona`.

## Seed data (FR-032)

- Admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (only when no users exist).
- Personas: `photographer`, `videographer`.
- Categories (both personas unless noted): `portrait`, `events`,
  `fashion-beauty`, `wedding-engagement`, `corporate-branding`,
  `real-estate-architecture`.
- Site settings: siteName "Shoot Project", `whatsappNumber` placeholder
  `+971500000000`, default message, `activePersonas` = both.
- Landing page (published): hero "You brief. We shoot." + sub-headline +
  3 trust chips + WhatsApp primary CTA + persona-selector secondary CTA;
  sections: howItWorks (Choose → Book → Shoot), features (6), categoriesGrid
  (active), personaBand (combined), faq (6), callToAction.
- Idempotent: upsert by `slug`; globals updated in place; all writes with
  `context.disableRevalidate`.
