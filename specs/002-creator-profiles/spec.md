# Feature Specification: Creator Profiles and Directory

**Feature Branch**: `002-creator-profiles`

**Created**: 2026-11-06

**Status**: Planned (plan, research, data model, contracts, quickstart and tasks written 2026-11-07; merged with a parallel plan, see research §19; next `/speckit-analyze`)

**Input**: Inspired by shootix.ae: "Our network" creator cards, the recommended-creators page, specialty pages with sample and professional counts, "Pick your own pro" / "Find your professional" actions, verified badge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse verified creators (Priority: P1)

A visitor sees a "Our network" section on the landing page with creator
entries (photo, a short stable code whose prefix is decided with the brand name, city, professional type(s),
short bio, specialty tags) and can open a directory listing all active,
verified creators, filtered by professional type, specialty and emirate.

**Why this priority**: Showing real professionals is the trust signal that
turns a brief into a booking; it is the first thing the inspiration site
shows after the brief widget.

**Independent Test**: Seed three verified creators and one unverified; the
landing section and the directory show only the three, filters narrow
correctly, and each card opens the creator's profile.

**Acceptance Scenarios**:

1. **Given** active verified creators exist, **When** a visitor views the
   landing page, **Then** the network section shows up to N cards chosen by
   the editor's rule (featured first, then newest) with a link to the
   directory.
2. **Given** the directory, **When** the visitor filters by professional
   type and specialty, **Then** only matching creators are listed, featured
   creators first and then the most recently verified, with counts shown per
   filter (featuring a creator is the editor's way to set the order).
3. **Given** an unverified or deactivated creator, **When** any public page
   renders, **Then** that creator never appears.

---

### User Story 2 - View a creator profile (Priority: P1)

A visitor opens a creator's profile: portfolio samples (images, optional
video links), specialties, cities served, languages, "photo + video" badge,
a verified badge, and calls to action ("Book with this creator" pre-fills
the brief builder with the creator; "Ask on WhatsApp").

**Independent Test**: Open a seeded profile; every section renders from CMS
data; the CTA leads to the brief builder with the creator pre-selected.

**Acceptance Scenarios**:

1. **Given** a creator with samples, **When** the profile opens, **Then**
   samples display in a responsive gallery with alternative text and lazy
   loading, within the performance budgets.
2. **Given** the profile, **When** the visitor taps "Book with this
   creator", **Then** the brief builder opens with the creator fixed and the
   professional type set to the creator's; when the creator offers several
   professional types, the visitor chooses among those types only.

---

### User Story 3 - Creators manage their own profile (Priority: P2)

A signed-in provider completes a profile: display name, bio, specialties
(from the categories of their professional type), cities, languages, up to
30 samples, social links. Profiles start unverified; an admin verifies after
checking identity and portfolio; only verified profiles are public.

**Acceptance Scenarios**:

1. **Given** a provider account, **When** they open "My profile", **Then**
   they can edit every field above and upload samples, with validation and
   per-language text.
2. **Given** a submitted profile, **When** an admin marks it verified,
   **Then** it appears publicly within 60 seconds; un-verifying hides it.
3. **Given** a provider edits a public profile, **Then** the public page
   shows the last verified version until the edit is re-approved (or
   immediately, per an admin setting).

---

### User Story 4 - Specialty pages with counts (Priority: P3)

Each category has a public page listing creators and samples for that
specialty with counts ("428 samples, 43 pros"), reachable from the landing
grid, with per-language SEO text.

**Acceptance Scenarios**:

1. **Given** listed creators with samples in a specialty, **When** a visitor
   opens that specialty's page, **Then** it lists those creators and their
   samples with counts of samples and professionals computed from them;
   counts are not shown when they are zero.
2. **Given** the landing page's specialties section, **When** the visitor
   taps a specialty, **Then** its page opens with a title, description and
   introduction in the visitor's language (English when no translation
   exists).

### Edge Cases

- Creator with no samples: profile shows an "awaiting samples" state and is
  not featured.
- Creator pauses their profile: it is hidden everywhere at once, direct link
  included, until they resume; existing briefs keep the reference. An
  account that has a profile is not deleted; an admin suspends the profile
  instead, which also hides it at once without publishing any pending edits.
- Persona deactivated (no longer part of the site's audience): its
  creators' profiles remain reachable by direct link but are not listed, and
  providers cannot newly choose it.
- Very large sample uploads: rejected above the size limit with a message.

## Requirements *(mandatory)*

- **FR-001**: Providers MUST be able to create and edit a profile with the
  fields in User Story 3, text fields per language.
- **FR-011** (amended 2026-11-07, owner request with feature 003): a profile
  MUST also record the creator's **gender** (female or male only; required
  before review), **nationality** (one country, optional) and **years of
  experience** (whole years 0–60, optional). Nationality and years of
  experience are shown on the public profile and on Quick Match results;
  gender is never shown publicly and is used only to match a brief's
  "shot by" choice (feature 003).
- **FR-012** (amended 2026-11-08, owner request): a provider MUST choose the
  **emirates** they work in, never the cities inside an emirate. A city sent
  by any client is stored as its emirate; existing profiles were converted
  by migration. Locations keep cities for other uses.
- **FR-013** (amended 2026-11-08, owner request): every provider MUST upload
  an **Emirates ID** and a **trade license** before the profile can be sent
  for review. The files are confidential (owner and editors only, served
  through access control, never public); each waits for the team's check
  (waiting, verified, not accepted with a note the provider reads). A newer
  upload replaces the older one of the same kind; a rejected document no
  longer counts. Images or PDF, up to 5 MB.
- **FR-014** (amended 2026-11-08, owner request): the profile editor MUST
  include a calendar of the next 90 days where the provider marks days they
  cannot work (the same availability blocks as `/account/availability`,
  feature 003); booked days show and cannot be changed; each tap saves at once.
- **FR-015** (amended 2026-11-08, owner request): the profile editor MUST show
  the profile as numbered steps, each saying what it still needs, what it
  holds, or that it is done, and linking to its section. While anything
  required is missing, a message MUST say plainly that the profile is not
  complete, that clients cannot find or book the provider until it is
  approved, and how many steps need attention.
- **FR-002**: Profiles MUST have a verification state managed by admins;
  only verified, active profiles MUST be publicly visible.
- **FR-003**: The landing page MUST offer a creator-network section with an
  editor-configured selection rule and card count.
- **FR-004**: A public directory MUST list verified creators with filters
  for professional type, specialty and location, with counts.
- **FR-005**: Each creator MUST have a public profile page with portfolio,
  specialties, cities, languages, badges and calls to action.
- **FR-006**: Each category MUST have a public page with creators, samples
  and counts for that specialty.
- **FR-007**: Each creator MUST have a stable public code (a short code;
  prefix decided with the brand name) shown on creator entries and usable in support conversations.
- **FR-008**: Samples MUST carry alternative text, be served in sized
  variants, and respect the performance budgets on every page.
- **FR-009**: All of the above MUST honour the persona model: a new persona's
  providers get profiles and directory entries with no code change.
- **FR-010**: All pages MUST meet the performance, accessibility, bilingual
  (English and Arabic right-to-left), light/dark and recorded visual
  direction requirements of the constitution (Principles II, VI, IX).

### Key Entities

- **Creator Profile**: provider user, display name, code, bio (per
  language), professional types, specialties (categories), cities,
  languages, samples, social links, verification state, featured flag,
  active flag.
- **Sample**: media item (image or video link) with caption per language,
  specialty, order.

## Success Criteria *(mandatory)*

- **SC-001**: A visitor finds a creator for a given specialty and emirate in
  under 30 seconds from the landing page.
- **SC-002**: Profile pages meet the same performance and accessibility
  budgets as the landing page.
- **SC-003**: A provider completes a profile in under 10 minutes; an admin
  verifies it in under 2 minutes.
- **SC-004**: 100% of acceptance scenarios covered by automated tests.

## Assumptions

- Verification is a manual admin decision in this feature; document upload
  for identity checks is out of scope.
- Availability is feature 003; reviews and ratings are not yet scheduled.
