# Feature Specification: Creator Profiles and Directory

**Feature Branch**: `002-creator-profiles`

**Created**: 2026-11-06

**Status**: Draft (spec only — run `/speckit-plan` after feature 001 ships)

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
   type and specialty, **Then** only matching creators are listed, in the
   configured order, with counts shown per filter.
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
   professional type set to the creator's.

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

### Edge Cases

- Creator with no samples: profile shows an "awaiting samples" state and is
  not featured.
- Creator deactivates their account: profile hidden, existing briefs keep
  the reference.
- Persona deactivated: its creators' profiles remain reachable by direct
  link but are not listed.
- Very large sample uploads: rejected above the size limit with a message.

## Requirements *(mandatory)*

- **FR-001**: Providers MUST be able to create and edit a profile with the
  fields in User Story 3, text fields per language.
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
