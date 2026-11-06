---
name: persona-extensibility
description: The audience model that lets this website switch or add target audiences (personas) and their categories through the CMS with zero code changes — today photographers, videographers and other "shooters", tomorrow teachers or any other profession. Use this skill whenever a task mentions personas, audiences, target audience, "who the site is for", categories or specialties, role selection at registration ("I need a photographer" vs "I'm a photographer"), the brief builder's professional-type slot, persona-specific copy, or adds any collection, field, component or copy that names a profession. Also use it to review a change for hardcoded audience assumptions.
---

# Persona extensibility

The business brokers professionals to people who need them. Today the
professionals are photographers and videographers; the owner wants to be
able to point the same site at teachers (or any profession) later **without
a deployment**. Constitution Principle IV makes this binding: audience
definitions are CMS data, and adding a persona is a CMS edit.

## Vocabulary (use these words consistently in code, CMS labels and specs)

| Term          | Meaning                                                                 | Examples                         |
|---------------|-------------------------------------------------------------------------|----------------------------------|
| **Persona**   | A kind of professional the platform offers.                             | Photographer, Videographer, Teacher |
| **Category**  | A specialty within one or more personas.                                | Portrait, Events (photo); Math, Physics (teacher) |
| **Seeker**    | A visitor/member who needs a professional.                              | a brand, a bride, a parent       |
| **Provider**  | A member who *is* a professional, linked to exactly one persona.        | a photographer account           |
| **Audience**  | The set of active personas the site currently targets, in display order.| "photographer, videographer"     |

"Persona" never means "user segment" here; the two member kinds are
`accountType: seeker | provider`.

## The data model

```
Persona  (collection)          Category (collection)            SiteSettings (global)
- singular, plural             - name, slug                     - activePersonas: Persona[] (ordered)
- slug (immutable)             - description, image             - seekerLabel ("I need a {persona.singular}")
- description, icon            - personas: Persona[] (many)     - providerLabel ("I'm a {persona.singular}")
- order, active                - order, active
- copy: { seekerCta, providerCta, providerPitch }                    User (collection)
                                                                - accountType: seeker | provider
                                                                - persona: Persona (required if provider)
                                                                - categories: Category[] (optional, provider)
```

- `slug` is shared across languages and is the only thing code may
  reference, and only for seed upserts and tests; runtime behaviour never
  branches on a specific slug. If you find
  `if (persona.slug === 'photographer')` in application code, it is a bug.
- `activePersonas` on `SiteSettings` defines what the public site shows and
  in which order. A persona that exists but is not active is invisible to
  visitors and not selectable at registration.
- Categories belong to one or more personas; the category grid on the
  landing page shows categories of the active personas only.

## Copy with placeholders

Landing copy that mentions the profession is stored with placeholders and
rendered through the domain helper:

```ts
import { interpolatePersonaCopy } from '@shoot/domain/personas'
interpolatePersonaCopy('Book {persona.plural} at fixed prices', photographer)
// → "Book Photographers at fixed prices"
interpolatePersonaCopy('Find a {personas.list}', [photographer, videographer])
// → "Find a photographer or videographer"
```

Supported tokens: `{persona.singular}`, `{persona.plural}`,
`{personas.list}` (joined with "or"), `{personas.listAnd}` (joined with
"and"). Unknown tokens render verbatim and are flagged by a unit test on the
seed content, so editors cannot silently break copy.

Personas are bilingual: `singular`, `plural` and `copy.*` are localised
fields, so the persona object you interpolate with is already the one
resolved for the current locale (queries pass `locale`). Pass the locale to
the helper so list conjunctions are right:

```ts
interpolatePersonaCopy('ابحث عن {personas.list}', [photographer, videographer], { locale: 'ar' })
// → "ابحث عن مصوّر أو مصوّر فيديو"
```

Conjunctions per locale live in `packages/domain/src/personas/conjunctions.ts`
(`en: { or: 'or', and: 'and' }`, `ar: { or: 'أو', and: 'و' }`); adding a
language means adding one entry there plus translations, never a code path.

## Domain functions (`packages/domain/src/personas`)

| Function                                   | Purpose                                                     |
|--------------------------------------------|-------------------------------------------------------------|
| `resolveActivePersonas(settings, personas)`| ordered, active personas; tolerates dangling references     |
| `categoriesForPersonas(categories, personas)` | filters/sorts categories for the active audience         |
| `interpolatePersonaCopy(template, personaOrList, { locale })` | placeholder rendering described above, locale-aware conjunctions |
| `isProviderRegistrationValid(input, activePersonas)` | provider must pick an active persona               |

All are pure, 100% covered, and framework-free (Principle V).

## Option sets: the brief builder's words are rows too

The hero's brief builder ("I need a {persona} for {occasion} on {date} for
{duration} in {location}, shot by {shotBy}") takes every selectable word
from the `option-sets` collection. Each option carries `personas[]` (empty
= all), so occasions for photographers and subjects for teachers live in
the same model. The sentence itself is CMS text with `{token}` slots; a new
audience edits the sentence, adds an option set and binds a slot — no code.
Domain helpers: `parseSentence`, `optionsForSlot(set, personaId)`,
`briefSchema(slots)`, `renderBriefMessage`. Never hardcode a slot name or
an occasion in a component; the component renders whatever slots the
published config defines.

## Where personas surface in the UI (all must be data-driven)

1. Hero brief builder: the `{persona}` slot lists `activePersonas`; other
   slots are filtered by the chosen persona through option `personas[]`.
2. Registration: `accountType` toggle, then a persona `<select>` rendered
   from `activePersonas` when `provider` is chosen.
3. Category grid section: `categoriesForPersonas`.
4. Persona band section ("Are you a {persona.singular}? Join free"): one
   small `BriefBar` per active persona or a single combined bar, chosen by the block's
   `layout` field.
5. SEO text and FAQ answers: written by editors with placeholders.
6. Account page: shows the member's persona and categories.

## The zero-code guarantee is tested

`apps/web/tests/integration/personas.int.test.ts` seeds a brand-new persona
("Teacher", slug `teacher`) and two categories, activates it in
`SiteSettings`, and asserts that `resolveActivePersonas` + the landing
queries return it in order. A component test renders the brief builder's persona
slot and the registration form with a three-persona fixture (photographer, videographer,
teacher) and asserts all three options appear with interpolated labels. A
Playwright spec tagged `@persona` does the same through the admin panel in
the full suite. If a change breaks any of these, the extensibility promise is
broken.

## When you add anything that names a profession

Stop and ask: would this still be correct if the owner switched the audience
to teachers tonight? If the answer is no, move the text into CMS content with
a placeholder, or derive the behaviour from `activePersonas`. The
step-by-step for adding a persona (as an admin, and as a developer updating
seeds, fixtures and tests) is in `references/adding-a-persona.md`.
