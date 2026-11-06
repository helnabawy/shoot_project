# Responsive and accessibility checklist

## Breakpoints and layout

Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Design
mobile-first. Containers: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Sections
use consistent vertical rhythm (`py-16 md:py-24`).

Verify every change at these viewport widths (Playwright `page.setViewportSize` or
browser devtools): **360, 768, 1024, 1440**. Look for: horizontal scroll,
clipped text, overlapping CTAs, images stretching, the floating WhatsApp
button covering content, tap targets under 44 px, headings wrapping badly.

## Right-to-left (Arabic)

- Verify every change at 360 and 1024 px on `/ar` as well: text alignment,
  icon direction, menu slide direction, form error placement, the floating
  WhatsApp button position (it stays bottom-**end**).
- Logical utilities only (`ms/me/ps/pe/inset-s/inset-e/text-start/text-end`); the lint
  script fails the build on physical ones.
- Mixed-direction content: numbers, emails, URLs in `Bidi`; brand names may
  stay Latin.
- Screen readers announce in the page language because `lang` is set on
  `<html>`; a Latin fragment inside Arabic text that must be read in
  English gets `lang="en"`.

## Dark theme

- Contrast is checked per token pair in both themes; never introduce a
  one-off colour.
- Focus rings must be visible on both backgrounds (use the `--focus` token
  (ink on ground, ground on panels) with an offset ring; never `--arrow`).
- Images and illustrations: provide a dark variant or a neutral chip; avoid
  pure white logos on transparent backgrounds without a chip.

## Navigation

- Mobile: a toggle button with `aria-expanded`, `aria-controls`, and the
  menu in the DOM (hidden with `hidden`, not removed) so it is testable and
  focusable; close on Escape and on route change.
- Desktop: plain links; current section highlighted via `aria-current` when
  using in-page anchors.
- Skip link as the first focusable element: "Skip to content".

## Forms (login, register, brief builder)

- Every input has a visible `<label>`; placeholders are not labels.
- Errors are rendered next to the field, linked with `aria-describedby`, and
  announced (`role="alert"` on the summary).
- Submit button shows a pending state and is disabled while submitting;
  text stays visible (no spinner-only buttons).
- Autocomplete attributes: `email`, `new-password`, `current-password`,
  `name`, `tel`.
- Works with keyboard only: Tab order follows visual order; Enter submits.

## Content and media

- `alt` text is required in the CMS; decorative images use `alt=""`.
- Headings form an outline: one `h1` (hero), `h2` per section, `h3` inside.
- Colour contrast ≥ 4.5:1 for text, ≥ 3:1 for large text and UI borders.
  Check token pairs once in the design tokens, not per component.
- Icons that convey meaning have an accessible name; icon-only buttons use
  `aria-label`.
- Motion: `motion-safe:` variants only; respect `prefers-reduced-motion`.

## Automated checks

- Component tests assert roles and accessible names (`getByRole`), which
  catches most missing labels.
- Playwright runs `@axe-core/playwright` on the landing, login and register
  pages and fails on serious/critical violations.
- Lighthouse Accessibility score ≥ 95 in CI.
