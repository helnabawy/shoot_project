# Adding a persona

## As the site owner (no code)

1. Admin panel → Personas → Create: singular "Teacher", plural "Teachers",
   slug `teacher`, description, icon, copy (seeker CTA, provider CTA). Switch
   the locale selector to Arabic and enter "معلّم" / "معلّمون" and the Arabic
   copy; until you do, the Arabic site shows the English words.
2. Categories → create "Mathematics", "Physics" and tick the Teacher persona
   on each. If the brief sentence needs a teacher-only word, add an option
   set (e.g. `subjects`) and bind a `{subject}` slot in Landing Page → Brief
   builder; options can also be limited to the Teacher persona.
3. Site Settings → Active personas → add Teacher (drag to order) → Save.
4. Landing Page → review copy; placeholders such as `{personas.list}` update
   automatically. Publish.
5. Within a minute the public site offers "I need a Teacher", the category
   grid shows the new categories, and registration lets providers pick
   Teacher.

To *replace* photographers with teachers, deactivate the photographer and
videographer personas (do not delete: existing provider accounts reference
them) and activate Teacher.

## As a developer (seed, fixtures, tests)

1. `shared/payload/seed/personas.ts` and `seed/categories.ts` (and
   `seed/option-sets.ts` if needed): add the persona, its categories and any
   persona-specific options (upsert by slug).
2. `tests/fixtures/personas.ts`: add the fixture used by component tests.
3. Run `pnpm test`; the extensibility tests should pass unchanged. If any
   test needed editing to accommodate the new persona, that test was
   asserting on a specific slug or label and must be rewritten to be
   persona-agnostic.
4. Nothing under `src/app` or `src/modules/*/components` should need a
   change. If it does, the component hardcodes an audience; fix the component.

## Renaming and deleting

- Labels (`singular`, `plural`, copy) are safe to change at any time.
- `slug` is immutable after launch; the admin UI marks it read-only once
  created. Changing it would orphan users, categories and seed upserts.
- Deleting a persona is admin-only and blocked while any user, category or the Site
  Settings active list references it (a `beforeDelete` hook checks and throws a readable error).
