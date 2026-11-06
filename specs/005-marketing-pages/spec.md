# Feature Specification: Marketing, Legal and SEO Pages

**Feature Branch**: `005-marketing-pages`

**Created**: 2026-11-06

**Status**: Draft (spec only)

**Input**: Inspired by shootix.ae footer and SEO pages: Terms & Conditions, Professional Terms, Arabic terms, Privacy Policy, Studios, Guides (blog), SEO landing pages such as /hire/proposal-photographer-dubai and /work/{specialty}, plus Extras and Plus pages.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editors publish any page from blocks (Priority: P1)

Editors create pages (slug per language, title, SEO fields, sections built
from the same blocks as the landing page plus rich text), publish them, and
link them from navigation and footer, in both languages.

**Acceptance Scenarios**:

1. **Given** a new page is published, **Then** it is reachable at its slug
   in each language within 60 seconds, appears in the sitemap and renders
   within budget.
2. **Given** a draft page, **Then** it is not reachable publicly but
   previewable by editors.

---

### User Story 2 - Legal pages (Priority: P1)

Terms, professional terms and privacy exist in both languages, are linked
from the footer and from registration ("by registering you accept…"), and
record a version date.

### User Story 3 - Guides / blog (Priority: P2)

Editors publish articles with author, date, cover image, categories and
rich text; a listing page with pagination and per-language SEO; RSS feed.

### User Story 4 - SEO landing pages (Priority: P3)

Editors create intent pages ("hire a proposal photographer in Dubai") from
a template that embeds the brief builder pre-set to a persona, occasion and
location, with unique copy, FAQ and structured data.

### Edge Cases

- Slug collision with a reserved route (`/login`, `/register`, `/account`, `/admin`, `/api`, `/next`, `/ar`): refused.
- Page deleted while linked from navigation: link removed, 410 served.
- Article scheduled in the future: hidden until its time.

## Requirements *(mandatory)*

- **FR-001**: Editors MUST be able to manage pages with localised slugs, drafts,
  preview, SEO fields, block-based sections and navigation placement.
- **FR-002**: Legal pages MUST be versioned with an effective date and
  linked from registration.
- **FR-003**: Articles MUST support scheduling, categories, authors and
  feeds.
- **FR-004**: SEO landing pages MUST reuse the brief builder with preset
  slots and emit structured data.
- **FR-005**: All pages MUST meet performance, accessibility, bilingual and
  theme requirements and the recorded visual direction.

### Key Entities

Page, LegalDocument (versioned), Article, ArticleCategory, Author.

## Success Criteria *(mandatory)*

- **SC-001**: An editor creates and publishes a bilingual page in under 15
  minutes without a developer.
- **SC-002**: Every public page scores ≥ 90 performance and ≥ 95
  accessibility.

## Assumptions

- Comments, search and newsletters are out of scope.
