# Feature Specification: Marketing, Legal and SEO Pages

**Feature Branch**: `005-marketing-pages` (spec directory; work happens on the current worktree branch)

**Created**: 2026-11-06

**Status**: Implemented 2026-11-07 (plan, research, data model, contracts, quickstart and tasks written; open items in tasks.md)

**Input**: Inspired by shootix.ae footer and SEO pages: Terms & Conditions, Professional Terms, Arabic terms, Privacy Policy, Studios, Guides (blog), SEO landing pages such as /hire/proposal-photographer-dubai and /work/{specialty}, plus Extras and Plus pages. Scope for this pass: editor-built pages, versioned legal pages, guides with a feed, intent landing pages with the brief builder preset, a Studios page, and a friendly not-found/removed experience.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editors publish any page from blocks (Priority: P1)

An editor creates a page (title, a web address per language, search and
sharing text, and sections built from the same section types as the landing
page plus long-form text), previews it, publishes it, and places it in the
header navigation and/or footer, in English and Arabic, without a developer.
The Studios page, "About", "How we vet professionals" and any later page
(Extras, Plus) are created this way, not by code.

**Why this priority**: Every other story in this feature (legal pages,
studios, intent pages) is a page; the ability to publish one is the
foundation, and it is the owner's stated need ("edit the site without
engineers").

**Independent Test**: Create a page "Studios" in both languages with a
heading, a text section and a call to action; publish it; open it in both
languages, find it in the footer and the sitemap; unpublish it and confirm
it is gone.

**Acceptance Scenarios**:

1. **Given** a new page is published, **When** a visitor opens its address
   in either language, **Then** it renders within 60 seconds of
   publishing, appears in the sitemap with both language alternates, and
   meets the performance budgets.
2. **Given** a draft page, **When** an anonymous visitor opens its address,
   **Then** they see the not-found page; **When** a signed-in editor opens
   the preview link, **Then** they see the draft with a visible "draft
   preview" marker.
3. **Given** a page with an English address and text but no Arabic address
   or text yet, **When** a visitor opens the Arabic site at that address,
   **Then** the page is served with the English text as fallback, and the
   language switcher links the two languages' addresses of the same page;
   **When** the Arabic address and text are added later, **Then** the Arabic
   site uses them and the English page is unchanged.
4. **Given** a published page placed in the footer and navigation, **When**
   the editor changes its placement or title, **Then** the links update
   within 60 seconds in both languages, and nothing else on the site needs
   editing.
5. **Given** an editor enters an address that is reserved (`login`,
   `register`, `account`, `admin`, `api`, `next`, `ar`, `creators`, `work`,
   `book`, `guides`, `hire`, `sitemap.xml`, `robots.txt`) or already used by
   another page in the same language, **When** they save, **Then** the save
   is refused with a message that names the conflict.
6. **Given** a published page, **When** an editor deletes it, **Then** its
   links disappear from navigation and footer and visitors who open the old
   address see a "this page has been removed" notice (not the generic
   not-found text), which search engines are told not to index, and the
   address is dropped from the sitemap.

---

### User Story 2 - Legal pages (Priority: P1)

Terms & Conditions, Professional Terms (for creators) and the Privacy Policy
exist in English and Arabic, are linked from the footer, from the
registration form ("By registering you accept the Terms and Privacy
Policy"; creators see Professional Terms as well) and from the creator
profile editor. Each shows its effective date and version; earlier versions
remain readable for the record.

**Why this priority**: The site stores accounts and takes briefs; the
shootix.ae inspiration publishes these and no responsible launch ships
without them.

**Independent Test**: Publish version 1 and then version 2 of the Terms;
the public page shows version 2 with its effective date, the "previous
versions" list shows version 1, registration links to the current Terms,
and a new account records which versions it accepted.

**Acceptance Scenarios**:

1. **Given** published Terms, Professional Terms and Privacy Policy,
   **When** a visitor opens the footer, **Then** all three are linked in
   the visitor's language, at stable addresses (`/terms`,
   `/terms/professional`, `/privacy`, and under `/ar` for Arabic).
2. **Given** the registration form, **When** a visitor registers,
   **Then** the form states acceptance with links to the current legal
   pages; registration records the document versions accepted and the time.
   A creator registration also records Professional Terms.
3. **Given** an editor publishes a new version of a legal document with an
   effective date, **When** the date is in the future, **Then** the current
   version stays in force and the new one is shown as "applies from {date}";
   **When** the date arrives, **Then** the new version becomes the current
   one without an editor action.
4. **Given** a legal document with several versions, **When** a visitor
   opens "Previous versions", **Then** they can read each earlier version
   with its effective period; versions are never silently overwritten.
5. **Given** a legal document that has no Arabic text yet, **When** a
   visitor opens the Arabic page, **Then** the English text is shown with a
   notice that the Arabic text is not yet available, and the English text is
   labelled as the governing version.

---

### User Story 3 - Guides (blog) (Priority: P2)

Editors publish guide articles ("How to brief a wedding photographer",
"Preparing for a corporate shoot") with an author, publication date, cover
image, categories and long-form text. Visitors browse a listing with
category filter and pagination, read an article, and reach the brief
builder or WhatsApp from it. A feed lets readers and aggregators follow
new guides.

**Why this priority**: Guides attract search traffic and answer client
questions before they brief; valuable but the site is complete without
them.

**Independent Test**: Publish three articles in two categories (one dated in
the future); the listing shows the two live ones newest first, filters by
category, paginates at the configured page size, and the feed lists the two
live ones.

**Acceptance Scenarios**:

1. **Given** published articles, **When** a visitor opens the guides
   listing, **Then** articles appear newest first with cover image, title,
   summary, category and date, 12 per page with previous/next links that
   work without scripting, and a category filter.
2. **Given** an article scheduled for a future time, **When** a visitor or
   crawler requests the listing, the article page, the feed or the sitemap
   before that time, **Then** the article is absent everywhere; **When**
   the time passes, **Then** it appears everywhere within 60 seconds with
   no editor action.
3. **Given** an article, **When** it opens, **Then** it shows author name,
   date, reading time, cover image with alternative text, long-form text,
   related guides in the same category, and a call to action for the brief
   builder and WhatsApp.
4. **Given** the feed address, **When** a reader fetches it, **Then** they
   receive a valid feed of the latest 20 live articles per language, with
   title, summary, link, date and author.
5. **Given** an article with an Arabic title and text, **When** it is
   viewed in Arabic, **Then** it is right-to-left, with Arabic category
   names and dates; an article with no Arabic text falls back to English
   and is marked as such, and is not listed in the Arabic feed.
6. **Given** an author, **When** the author's name is shown, **Then** it
   links to a short author page listing their guides.

---

### User Story 4 - SEO landing pages (Priority: P3)

Editors create intent pages ("Hire a proposal photographer in Dubai") at
`/hire/{slug}` from a template that embeds the brief builder already set to
a professional type, a specialty/occasion and a location, with unique copy,
a FAQ and structured data so search results show a rich snippet.

**Why this priority**: High value for acquisition, but depends on the page
system (Story 1) and benefits from creators (002) existing; it can ship
after the rest.

**Independent Test**: Create "proposal photographer in Dubai" preset to
photographer + proposals + Dubai; open it; the brief builder shows the
preset slots, submitting a brief records those values, the page shows the
FAQ and emits structured data for FAQ and service, and a similar page with a
different preset has different copy.

**Acceptance Scenarios**:

1. **Given** an intent page with preset professional type, specialty and
   location, **When** a visitor opens it, **Then** the brief builder shows
   those slots filled (and still changeable) and nothing else on the page
   competes with it as the primary action.
2. **Given** a preset that names a persona, specialty or location that has
   since been disabled or removed, **When** an editor saves or a visitor
   opens the page, **Then** the editor is warned at save time and the
   visitor sees the page with that slot left open, never a broken builder.
3. **Given** an intent page with a FAQ, **When** it is crawled, **Then** it
   carries valid FAQ and service structured data, a unique title and
   description, and a canonical address; the language alternate is declared.
4. **Given** listed creators match the preset, **When** the page renders,
   **Then** it shows up to six of them (and counts only when non-zero);
   **When** none match, **Then** the section is omitted and no zero counts
   are shown.
5. **Given** two intent pages whose preset is identical, **When** an editor
   saves the second, **Then** they are warned about the duplicate so search
   engines are not given competing pages.
6. **Given** the existing specialty pages (`/work/{specialty}`, feature
   002), **When** the sitemap is built, **Then** specialty pages and intent
   pages are listed together, each once.

---

### User Story 5 - Friendly not found and removed pages (Priority: P3)

A visitor who follows an old, mistyped or removed address sees a page in
the site's design, in their language, that says plainly what happened
("we can't find that page" or "this page has been removed") and offers the
brief builder, the guides and WhatsApp, with a not-found status that tells
search engines to drop it.

**Independent Test**: Open an unknown address, a draft page's address and a
deleted page's address, in both languages; the first two are "not found",
the last shows the "removed" wording, all offer next steps and none reveal
that a draft exists.

**Acceptance Scenarios**:

1. **Given** an address that never existed, **When** it is requested,
   **Then** the not-found page is shown in the visitor's language with the
   correct status and search engines are told not to index it.
2. **Given** a page or article that was deleted, **When** its old address is
   requested, **Then** the "removed" notice is shown with a not-found
   status and no indexing.
3. **Given** a draft's address, **When** an anonymous visitor requests it,
   **Then** the response is identical to an unknown address.

---

### Edge Cases

- Address collides with a reserved route or another page in the same
  language: refused at save (see Story 1, scenario 5). Addresses are
  lower-case letters, digits and hyphens; Arabic addresses may use Arabic
  letters; no trailing slash; maximum 80 characters.
- Page deleted while linked from navigation or the footer: the link is
  removed at once and the address shows the "removed" notice.
- Article scheduled in the future: hidden everywhere until its time.
- A page is renamed (address changed) after publishing: the old address
  redirects permanently to the new one for as long as the page exists.
- Legal document published with no effective date: it is effective at
  publication time.
- Two legal versions with the same effective date: refused at save.
- Article categories with no live articles are not listed; deleting a
  category used by articles is refused with the list of articles.
- Author with no live articles: author page is not reachable and not in the
  sitemap.
- Very long titles or text: titles are limited, long text wraps, nothing
  overflows at 360 px in either language.
- Editor pastes unsafe markup into long-form text: it is never rendered as
  script or arbitrary HTML.
- Page with zero sections: refused at publish ("add at least one section").
- Footer with many pages: shown in groups defined by the editor, at most
  four groups and 24 links in all.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Editors MUST be able to create, edit, preview, publish,
  unpublish and delete pages with a localised title, localised address,
  search/sharing title and description, sharing image, and ordered
  sections drawn from the landing-page section types plus long-form text.
- **FR-002**: Pages MUST support draft and published states; drafts MUST be
  invisible to the public (indistinguishable from unknown addresses) and
  previewable by signed-in editors.
- **FR-003**: The system MUST refuse addresses that are reserved, malformed
  or duplicate within a language, and MUST permanently redirect a page's
  previous address when it changes.
- **FR-004**: Editors MUST be able to place a published page in the header
  navigation and in a footer group, with a localised label and order,
  without editing code.
- **FR-005**: Removed pages and articles MUST show a "removed" notice
  (distinct wording from "not found"), be dropped from navigation, feeds
  and the sitemap, be excluded from indexing, and offer next steps.
- **FR-006**: Legal documents (Terms, Professional Terms, Privacy Policy)
  MUST be versioned, each version carrying a version number, an effective
  date and its text per language; the version in force MUST be derived from
  the effective date; earlier versions MUST remain readable.
- **FR-007**: Registration MUST link to the legal documents that apply to
  the account type and MUST record which versions were accepted and when;
  registration without acceptance MUST be refused.
- **FR-008**: The footer MUST link the legal pages and every page placed in
  it, in the visitor's language.
- **FR-009**: Articles MUST support title, summary, cover image with
  alternative text, long-form text, author, categories, publication time
  (including a future time), and per-language text with English fallback.
- **FR-010**: The guides listing MUST be paginated, filterable by category
  and ordered newest first; future-dated articles MUST be absent from every
  public surface until their time.
- **FR-011**: A feed of the latest 20 live articles MUST be available per
  language.
- **FR-012**: Intent pages MUST embed the brief builder with preset
  professional type, specialty and location (each optional), unique copy,
  a FAQ and structured data (FAQ and service) and MUST degrade gracefully
  when a preset item is no longer active.
- **FR-013**: Every public page of this feature MUST carry a unique title
  and description, a canonical address, language alternates, sharing
  metadata and be listed in the sitemap (unless excluded by the editor via
  an explicit "hide from search engines" switch).
- **FR-014**: Not-found and removed pages MUST be designed in the site's
  direction, localised, and return a not-found status.
- **FR-015**: Long-form text MUST be rendered safely: no script, no
  arbitrary HTML, links to external sites open safely, images carry
  alternative text.
- **FR-016**: Published changes MUST be visible within 60 seconds without a
  rebuild; scheduled publication MUST take effect without an editor action.
- **FR-017**: All pages MUST meet the performance, accessibility, bilingual
  (English and right-to-left Arabic), light/dark and recorded visual
  direction requirements of the constitution (Principles II, VI, IX); page
  copy shipped as seed content MUST NOT contain invented proof (made-up
  testimonials, counts, ratings, client logos).
- **FR-018**: Every content type of this feature MUST declare explicit
  access: the public reads only what is live; editors manage content;
  only admins change the legal documents' versions once published.

### Key Entities

- **Page**: localised title and address, search/sharing fields, ordered
  sections, state (draft/published), navigation and footer placement,
  hide-from-search switch. An intent page is a Page of kind "intent" with
  presets (professional type, specialty, location), FAQ and keywords.
- **Legal Document**: a kind (terms, professional terms, privacy) with
  versions; **Legal Version**: number, effective date, text per language,
  change summary.
- **Acceptance Record**: account, document kind, version, time.
- **Article**: localised title, summary, text, cover image, author,
  categories, publication time, state.
- **Article Category**: localised name and address.
- **Author**: name, short bio per language, optional photo; linked to
  articles, not necessarily to a user account.
- **Navigation Placement**: the header/footer group, label and order
  of a page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An editor creates and publishes a bilingual page in under 15
  minutes without a developer.
- **SC-002**: Every public page of this feature scores ≥ 90 for performance
  and ≥ 95 for accessibility on a mid-range mobile device on simulated 4G.
- **SC-003**: An editor publishes a new legal version and a visitor sees it
  within 60 seconds; 100% of accounts created after launch have a recorded
  acceptance of the then-current documents.
- **SC-004**: A guide scheduled for a future time appears within 60 seconds
  of that time and is never visible to the public before it.
- **SC-005**: An editor creates an intent page, with preset, FAQ and copy, in
  under 20 minutes; a visitor on it reaches a sent brief in the same
  number of steps as from the home page.
- **SC-006**: 100% of acceptance scenarios are covered by automated tests
  named with their scenario ids (`MP-`).

## Assumptions

- Comments, site search, newsletters, tags beyond categories and related
  article algorithms beyond "same category" are out of scope.
- The `/work/{specialty}` pages already exist (feature 002) and are reused,
  not rebuilt; this feature only adds them to shared sitemap handling.
- Legal text itself is supplied by the owner and reviewed by counsel; the
  seed ships clearly marked placeholder drafts that cannot be published
  until an editor replaces them. Arabic legal text is a translation of the
  English text, and the English text governs unless the owner decides
  otherwise.
- "Studios" is an ordinary editor-built page for now; a structured studio
  directory (bookable studios, hourly rates) is a later feature.
- "Extras" and "Plus" pages need pricing and are created from the page
  system after feature 004; they are not designed here.
- Acceptance of legal documents is recorded at registration; re-acceptance
  prompts when a new version applies to existing accounts are out of scope.
- Redirects for changed page addresses cover pages only. An article has one
  address shared by both languages (letters, digits, hyphens) that cannot be
  changed after it is saved; a page has one address per language.
- A true HTTP 410 "gone" status is not available for server-rendered pages
  in the chosen framework; the "removed" wording plus a not-found status
  gives search engines the same signal. Revisit if SEO data shows a need.
- Article reading time is derived from the text length; page size for the
  guides listing is 12.
- The visual direction is inherited from "The Brief Bar" (constitution
  Principle IX); long-form pages use the reading layout recorded in the
  surface briefs under `.impeccable/surfaces/`, created in the plan step.
