# Feature Specification: Mobile API (read endpoints, contracts and app links)

**Feature Branch**: `008-mobile-api`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Feature 008 "mobile-api" (test-id prefix MR-). A versioned REST API on the
web app, read by the Flutter app (apps/mobile), which cannot call the website's server actions. A
shared handler wrapper (access declared per endpoint, validated input, the person's language, an
install id standing in for the visitor cookie in rate limits and duplicate detection, errors as
codes never text, cache rules). Read endpoints over the existing cached reads: site settings,
navigation and menu, personas, option sets and the brief-builder config, the landing content;
creators directory and profile, specialty page, hire page; guides list and article, editor pages,
legal documents; and a resolver that answers page, removed or not found for any app path. Public
shapes produced by mappers, never the internal records; images as absolute addresses with a size
list; long text as a reduced node tree. Contracts: schemas for every request and response, shared
JSON examples (the canvas placeholder data) used by the server tests, the app's model tests and the
app's goldens, and a schema snapshot that fails on any non-additive change. The website's deep-link
files and the app's matching link configuration. On the app side: the data layer for these reads,
an image widget that picks a size and falls back to a scene tile, and the install id on every
request. Out of scope: sign-in, codes and tokens (009); write commands for booking, creators and
briefs (011–014)."

Test-id prefix for this feature: `MR-` (for example `MR-US3-S2`).

Who the "users" are: the people using the app (they see the site's own content, in their language,
and links that open in the app), the owner (who edits content once in the CMS and expects the app
to follow), and the people building the app screens in features 010–015 (who need a stable,
documented contract that never breaks an app already in people's hands).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The app shows the site's own words and settings, in the person's language (Priority: P1)

A person opens the app. Everything that the owner edits in the CMS for the website (the site name,
the WhatsApp number and its default message, the expected reply time, the menu, the kinds of
professional the site offers and their specialties, the brief builder's sentence and options, and
the landing page's sections) reaches the app from the same source, in the language the app is set
to. When the owner changes any of it, the app shows the change within a minute, with no app
release. Nothing the owner keeps private (limits, notification templates, internal flags) ever
leaves the server.

**Why this priority**: Every app screen in features 010–015 starts from this data; without it the app
would need copies of the site's copy and settings, which the constitution forbids (content lives in
the CMS). It is the smallest slice that proves the whole path: request, language, access, public
shape, cache and the app's data layer.

**Independent Test**: Seed the CMS, read the site settings, menu, professional types, brief builder
and landing through the API in English and Arabic, and decode each answer with the app's models;
change the WhatsApp number in the CMS and read it again.

**Acceptance Scenarios**:

1. **Given** the owner set a WhatsApp number, default message and reply time, **When** the app reads
   the site settings, **Then** it receives exactly those values, and after the owner changes the
   number the next read (at most 60 seconds later) returns the new one.
2. **Given** the app is set to Arabic, **When** it reads any of these, **Then** every text comes back
   in Arabic, and a text the owner has not translated yet comes back in English rather than empty.
3. **Given** a request names a language explicitly, **When** it also sends a different preferred
   language, **Then** the explicit one wins; **and given** it names a language the site does not
   offer, **Then** the request is refused with an error code that names the field.
4. **Given** the owner adds, renames, reorders or switches off a kind of professional, **When** the
   app reads the professional types, **Then** it sees only the active ones, in the site's order, with
   their specialties, and no app release was needed.
5. **Given** the owner edited the brief builder and the landing sections, **When** the app reads
   them, **Then** it receives the sentence, every step with its options, and the sections in the
   CMS order, each with its own content (specialty tiles with their real counts, the creators the
   section's rule picks).
6. **Given** settings the owner keeps internal (rate limits, notification templates and channels,
   translation status, auto-publish), **When** any endpoint answers, **Then** none of them appears in
   the answer.

---

### User Story 2 - Apps already installed keep working, and errors speak the person's language (Priority: P1)

The app on someone's phone may be months older than the server. Every answer has a written,
versioned shape; the server may add to it but never remove or change what an older app relies on.
When something goes wrong, the app receives a short code it can turn into words in English or
Arabic, never a technical message. Every endpoint states who may call it. Requests from the app
carry an anonymous install id so that limits and duplicate checks treat each installation fairly,
as the website does for each browser.

**Why this priority**: A broken contract breaks every installed app at once, and app updates take
days to reach people. This guarantee must exist before the first screen depends on the API.

**Independent Test**: Make an additive change to a response shape and see the contract check
accept it and record it; make a breaking change and see the check refuse it; decode every shared
example on the server and in the app; trigger each kind of error and read its code in both
languages.

**Acceptance Scenarios**:

1. **Given** a change that only adds (a new endpoint, a new optional request field, a new response
   field, a new value in a list of choices, a new error code), **When** the contract check runs,
   **Then** it passes and the recorded contract is updated in the same change.
2. **Given** a change that removes or renames anything, changes a type, makes a request field
   required, narrows what a request accepts, or tightens who may call an endpoint, **When** the
   contract check runs, **Then** it fails and names the endpoint and the field.
3. **Given** the shared examples, **When** the server's tests and the app's tests run, **Then** every
   example is valid against its endpoint's schema on the server and decodes into the app's models
   and back.
4. **Given** the list of error codes, **When** the checks run, **Then** every code has words in
   English and Arabic on the website and in the app.
5. **Given** an answer that carries a new value in a list of choices or a new field the app does not
   know, **When** an older app decodes it, **Then** decoding succeeds, the unknown value reads as
   "unknown" and the new field is ignored.
6. **Given** any failure (invalid input, not found, unexpected error), **When** the server answers,
   **Then** the answer is a problem document with a status and a code (and one code per invalid
   field), with no stack trace, no internal message and no personal data, and the failure is
   logged without personal data.
7. **Given** any endpoint, **When** it is called without the access it declares (for example a
   signed-in-only test endpoint without a valid token, or an expired token), **Then** it is refused
   with a code, an address under the API that does not exist answers "not found" in the same
   problem format, and every endpoint of this feature is readable by anyone, as declared.
8. **Given** two installations of the app behind the same network address, **When** both use an
   action that is limited per visitor, **Then** each installation is counted separately by its
   install id, and a request without a valid install id is counted by its network address.

---

### User Story 3 - Find and look at creators in the app (Priority: P1)

A person browses the creators the site lists, narrows them by kind of professional, specialty and
place, opens a creator's profile by the code they were given (in any spelling), and opens a
specialty page or a "hire" page. They see the same creators, in the same order, with the same
photos and samples as on the website, and photos load at a size that suits their screen. Where a
creator has no photo, the app shows the designed scene tile, never a broken image or an invented
picture.

**Why this priority**: Browsing creators is the app's core discovery journey (feature 011) and the
largest response shapes; settling them early de-risks the most screens.

**Independent Test**: Seed listed and unlisted creators; read the directory with and without filters,
a profile by code in lower case and with an old prefix, a specialty page and a hire page; decode
each in the app; render a creator photo at two sizes and a creator without a photo.

**Acceptance Scenarios**:

1. **Given** listed, unlisted and suspended creators, **When** the app reads the directory, with or
   without filters and pages, **Then** it receives only listed creators, featured first and then
   newest, with the available filters and their counts, matching the website.
2. **Given** a creator's code written in lower case or with an earlier prefix, **When** the app reads
   the profile, **Then** it receives the profile with the code as currently displayed; **and given**
   an unknown, unpublished or suspended creator, **Then** it receives "not found".
3. **Given** a specialty the site offers, **When** the app reads its page, **Then** it receives the
   editor's text, the real counts, the creators who offer it and their samples; a specialty the
   site does not offer is "not found".
4. **Given** a hire page, **When** the app reads it, **Then** it receives the page's text, the brief
   builder with the page's preset choices, up to six fitting creators and the questions and answers;
   a hire page whose address changed answers with the page's current address.
5. **Given** a photo stored in several sizes, **When** the app shows it at a given width on a device
   of a given pixel density, **Then** it loads the smallest stored size at least as wide as needed
   (the largest when none is), using an absolute address.
6. **Given** a creator without a photo, or a photo that fails to load, **When** the app shows the
   creator, **Then** it shows the designed scene tile in its place.

---

### User Story 4 - Read guides, editor pages and legal documents in the app (Priority: P2)

A person reads the site's guides (a list by page, category or author, and each article), the pages
the editor built, and the terms and privacy documents with their earlier versions, in their
language. Long text keeps its headings, lists, quotes, links and pictures; nothing unsafe is passed
on, and an article not yet translated is shown in English and marked as such.

**Why this priority**: Content screens (feature 015) are valuable but not on the booking path; they
can follow the creator and site reads.

**Independent Test**: Seed guides (one scheduled for later), an editor page, and terms with two
versions; read each through the API in both languages; decode in the app.

**Acceptance Scenarios**:

1. **Given** published guides, **When** the app reads the guide list, a page of it, a category or an
   author, **Then** it receives the matching articles newest first with the page count, and a
   guide scheduled for later does not appear until its time.
2. **Given** an article whose text has headings, lists, a quote, links and a picture, **When** the
   app reads it, **Then** it receives that text as a tree of those parts, site links as site paths,
   and a link with an unsafe address reduced to plain text.
3. **Given** an article the editor has not translated to Arabic, **When** the app reads it in Arabic,
   **Then** it receives the English text marked as not in the requested language.
4. **Given** an editor-built page, **When** the app reads it by its address in either language,
   **Then** it receives the page's sections; a page that is only a draft is "not found", and an
   earlier address of a renamed page answers with the current address.
5. **Given** terms with a current and an earlier version, **When** the app reads the terms, the list
   of versions and one earlier version, **Then** it receives the current text, every published
   version with its dates and change summary, and the earlier text.

---

### User Story 5 - A shared link opens the right place in the app (Priority: P2)

Someone taps a link to the website (a creator, a guide, a page, a booking) on a phone with the app
installed. The app opens instead of the browser, at the matching place, in the link's language.
For an address the app does not know by heart, it asks the server whether the address is a page, a
page that was removed, or nothing, and shows the right screen. Booking and account addresses are
never checked or revealed by this question.

**Why this priority**: Links make the app reachable from WhatsApp and the website, but every screen
also works without them, so this follows the content.

**Independent Test**: Resolve a page, a renamed page, a removed page, an unknown address and a
booking address; request both association files with and without configured app ids; check the
app's link configuration against the same list of paths.

**Acceptance Scenarios**:

1. **Given** the address of an editor page, a guide, a creator, a specialty, a hire page or a legal
   document, in either language, **When** the app asks the resolver, **Then** it answers "page" with
   what kind of place it is, its current address and its language.
2. **Given** an earlier address of a renamed page, or the other language's address of a page,
   **When** the app asks the resolver, **Then** it answers "page" with the page's current address in
   the requested language.
3. **Given** an address that used to be a page or a guide, **When** the app asks the resolver,
   **Then** it answers "removed"; **and given** an address that never existed, **Then** it answers
   "not found".
4. **Given** a booking, quotation or account address, **When** the app asks the resolver, **Then** it
   answers "page" for that kind of place without looking up whether the booking exists.
5. **Given** the app's identifiers are configured for the site, **When** a phone fetches the
   website's association files, **Then** it receives them at the fixed addresses, in the format
   Apple and Google require, never redirected or localised; **and given** they are not configured,
   **Then** the files answer "not found".
6. **Given** the list of link paths the website declares, **When** the app's iOS and Android link
   configuration is checked, **Then** both declare the same paths for the site's host, and Android
   asks for verification.

---

### Edge Cases

- The database is unreachable: every endpoint answers a problem with status 500 and the generic
  code; no partial answer and no internal message.
- A request sends a token on an endpoint that does not use one: the token is ignored and the answer
  stays shareable by caches.
- A request carries the website's sign-in cookie but no token: the cookie is ignored; the API only
  recognises a token sent in the request header.
- `Accept-Language` lists several languages with weights (`fr;q=1, ar;q=0.8`): the first supported
  one by weight is used (Arabic); none supported means English.
- Query values the endpoint does not know are ignored, never an error, so a newer app calling an
  older server still works.
- A page number past the last page: the last page is returned with its real page number (as on the
  website), not an error.
- An image without stored sizes (an old upload): the size list holds the original only.
- Rich text with a node the reducer does not know: its text is kept as a paragraph and its markup is
  dropped; nothing raw is passed on.
- A creator code containing look-alike characters (`O` for `0`): not found, never silently mapped.
- The resolver receives a full URL, a path with `..`, a protocol-relative `//host` path or a path
  over 512 characters: refused as invalid input.
- An address in the `/ar` form: the resolver answers in Arabic regardless of the request's language.
- The association files are requested with an `/ar` prefix or a trailing slash: "not found"; only
  the exact addresses are served.
- The install id header is missing, too long or malformed: it is ignored and the network address is
  used; a read never fails because of it.
- A response field marked deprecated keeps its value for the life of version 1 and is announced in
  the contract and a response header.

## Requirements *(mandatory)*

### Functional Requirements

**The API and every endpoint**

- **FR-001**: The web app MUST serve a versioned API for the app under one address prefix with a
  version number, separate from the CMS's own API, and MUST keep version 1 working for as long as a
  supported app version calls it.
- **FR-002**: Every endpoint MUST declare who may call it (anyone; anyone, with extra for a signed-in
  person; signed-in only) and MUST refuse anything outside that declaration. Every endpoint in this
  feature is readable by anyone.
- **FR-003**: Every endpoint MUST validate its input and refuse invalid input with one error code per
  invalid field; unknown query values MUST be ignored.
- **FR-004**: A signed-in person MUST be recognised only from a token sent in the request header,
  never from a website cookie; a token that is present but invalid or expired MUST be refused on
  endpoints that use tokens.
- **FR-005**: Every answer MUST be in the requested language (an explicit language in the request
  first, then the preferred language the request sends, then English), with English for any text not
  yet translated, and MUST say which language it is in.
- **FR-006**: Every failure MUST be a problem document with a status, a code that is a message key
  (never text), and one code per invalid field where relevant; it MUST contain no technical detail
  and no personal data.
- **FR-007**: Every error code MUST be listed once in the contract and have words in English and
  Arabic on the website and in the app.
- **FR-008**: Public content answers MUST be cacheable by shared caches for at most 60 seconds and
  vary by language; any answer to a signed-in request MUST be private and not stored; failures MUST
  not be stored.
- **FR-009**: Requests MAY carry an anonymous install id; when it is valid, limits and duplicate
  checks MUST count by it, as the website counts by its visitor cookie, and otherwise by network
  address. The install id MUST never be logged together with personal data.
- **FR-010**: An address under the API prefix that matches no endpoint MUST answer "not found" in
  the problem format.

**Public shapes**

- **FR-011**: Every answer MUST be built by a mapper into a documented public shape; internal records
  MUST never be sent as they are, and only fields on the public list may appear.
- **FR-012**: Images MUST be sent as absolute addresses with their alternative text and the list of
  stored sizes (width, height, address), smallest first, original included.
- **FR-013**: Long text MUST be sent as a tree of a fixed set of parts (paragraph, heading, list,
  quote, link, picture, text with emphasis, line break); links MUST be site paths, web, mail or phone
  addresses only, anything else becomes plain text.
- **FR-014**: Site paths in answers MUST be given without the language prefix; the app adds it for
  its language.
- **FR-015**: Kinds of professional, specialties, copy and options MUST come from the CMS through the
  API; no answer shape and no app code may name a profession.

**Read endpoints**

- **FR-020**: Site settings: site name, logos, WhatsApp number, default message, expected reply time,
  phone, contact email, social links, the seeker and provider labels, the creator code prefix, and
  whether Quick Match is on.
- **FR-021**: Navigation: the header pages, the footer groups with their pages, and the legal links,
  as on the website (the app's menu).
- **FR-022**: Professional types: the active ones in the site's order, with their specialties for
  that audience.
- **FR-023**: Brief builder: the sentence, the steps with their options (from the CMS option sets),
  the labels and the steps shown after sending; or nothing when the builder is off.
- **FR-024**: Landing: the hero and every section in CMS order, with the data a section shows
  resolved (specialty tiles with counts, the creators the network section picks).
- **FR-025**: Creators directory: listed creators with filters (kind, specialty, place) and pages,
  in the website's order, with the filter options and counts.
- **FR-026**: Creator profile by any spelling of the code: name, photo, kinds, places, specialties,
  languages, experience, samples, social links, whether the creator can be booked, the displayed
  code.
- **FR-027**: Specialty page and hire page, with the same content and rules as on the website.
- **FR-028**: Guides list (by page, category, author) and article, editor pages, and legal documents
  (current version, list of versions, one version), with the same visibility rules as the website
  (no drafts, scheduled items only from their time).
- **FR-029**: Resolver: for any app path, answer "page" (with the kind of place, its current address
  and language), "removed" or "not found"; it MUST follow renamed pages and other-language addresses,
  and MUST NOT look up booking, quotation or account addresses.

**Contracts**

- **FR-030**: Every request and answer MUST have a schema in the shared domain package, with the same
  test-coverage gate as the rest of it.
- **FR-031**: Every endpoint MUST have at least one shared JSON example, in English, and in Arabic
  where an app screen shows it in Arabic; the examples MUST reuse the design canvas's placeholder
  data, and the server tests, the app's model tests and the app's goldens MUST read the same files.
- **FR-032**: A snapshot of every schema MUST be committed; a check MUST fail on any change to it
  that is not additive; a breaking change MUST become version 2.
- **FR-033**: A deprecated field or endpoint MUST be marked in the contract and announced in a
  response header, and MUST keep working for the life of version 1.

**App links**

- **FR-040**: The website MUST serve the Apple and Android association files at their fixed
  addresses, built from configured app identifiers and one list of link paths, not localised, not
  redirected, and "not found" when not configured.
- **FR-041**: The app MUST declare the same link paths for the site's host on iOS and Android, with
  verification requested on Android.

**The app's data layer**

- **FR-050**: The app MUST read every endpoint of this feature through a repository per feature that
  returns a value or a failure (never throws), decoding answers with hand-written models.
- **FR-051**: The app MUST send its install id and its language on every request; the install id is
  created once per installation, kept on the device, and contains nothing about the person.
- **FR-052**: The app MUST show images through one image component that picks a stored size by the
  rendered width and pixel density, and shows the designed scene tile while loading, on failure and
  when there is no image.
- **FR-053**: The app MUST turn every error code into words through its one failure-to-message
  mapping, with a general message for a code it does not know.

### Key Entities

- **Endpoint**: an address, a method, who may call it, its cache class, its request and answer
  schemas and its examples.
- **Problem**: a status, a code (message key), optional field codes, an optional retry delay.
- **Public shapes**: site settings, navigation, professional type and specialty, brief builder,
  landing and section, creator card, creator list, creator profile, specialty page, hire page, guide
  summary, guide list, article, editor page, legal document and version list, resolution.
- **Image**: alternative text and a list of sizes (address, width, height).
- **Rich text**: a tree of a fixed set of parts.
- **Install id**: a random, anonymous identifier of one app installation.
- **Contract snapshot**: the recorded schemas of version 1 and its error codes.
- **Link path list**: the path prefixes that open the app, shared by the website's association
  files and the app's configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % of this feature's endpoints answer in English and Arabic with an answer that is
  valid against its published schema, checked by an automated test per endpoint.
- **SC-002**: A change to any CMS text, setting, professional type or page reaches the app's next
  read within 60 seconds, with no deployment and no app release.
- **SC-003**: 0 non-additive changes to version 1 pass the contract check; a deliberate breaking
  change in a test fails it 100 % of the time.
- **SC-004**: 100 % of shared examples are valid on the server and decode in the app; 100 % of error
  codes have English and Arabic words on both sides.
- **SC-005**: 0 fields outside the public list appear in any answer (checked against a list of
  internal field names), and 0 answers contain a stack trace or an internal message.
- **SC-006**: The first page of the creators directory is at most 100 KB compressed.
- **SC-007**: A shared link with a declared path opens the app on an iPhone and an Android phone with
  the app installed, and Apple's and Google's validators accept the association files on the
  staging host.
- **SC-008**: Every acceptance scenario `MR-US1-S1` … `MR-US5-S6` has an automated test named with its
  id (SC-007 also has a manual check).

## Assumptions

- Features 001, 002, 003 and 005 are merged: every read endpoint wraps a read those features already
  ship, with the same visibility and ordering rules; this feature adds no business rule and no
  database change.
- Features 006 and 007 land first on the app side: 006's on-device preferences store keeps the
  install id, and 007's scene tile is the image fallback.
- The app is a native client: no browser calls the API, so it sends no cross-origin headers.
- Every endpoint here is readable by anyone. Signed-in reads (the person's own data) start with
  feature 009 (sign-in) and 013; the token and signed-in rules are built and tested now, through
  test-only endpoints, so that 009 only adds endpoints.
- The design canvas's placeholder data reused in the examples is display data for tests and goldens
  only, never shipped as content. The creator code shown on the boards ("SH-0087") is not a valid
  stored code; examples keep the boards' visible text so the goldens match, and seeded test data
  uses real codes.
- The boards show a "from" price per creator (directory and profile). The website computes no such
  price today, so this feature sends none; feature 011 adds it as an additive field once its rule is
  specified.
- Editor-built pages at the site root (`/{slug}`) open in the browser rather than the app, because
  their addresses cannot be declared as a path list; every other public and private path opens the
  app.
- Sign-in, codes and tokens are feature 009; write endpoints (booking, creators, briefs) are features
  011–014, built on the pattern recorded in this feature's research.
- Removing the app's example screen (`service_health`) waits for feature 010, which replaces the
  home screen.
