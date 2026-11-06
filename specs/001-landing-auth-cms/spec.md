# Feature Specification: Landing Page, Member Accounts and CMS-Managed Content

**Feature Branch**: `001-landing-auth-cms`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "New website inspired by shootix.ae. Fast, single-page feel, responsive. Hero section 'You brief. We shoot.' Visitors can register and log in. A CMS lets the owner edit the landing page content and the WhatsApp mobile number. The structure must scale. Unit tests cover all use cases. The target audience (today photographers, videographers and other shooters) must be changeable from the backend in future, e.g. to teachers, without code changes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover the offer on the landing page (Priority: P1)

A visitor, usually on a phone, opens the website and immediately understands
what the business does ("You brief. We shoot."), who it is for, how it works
and why to trust it. The page is a single scrolling page with in-page
navigation to its sections (how it works, specialties, why us, for
professionals, FAQ) and feels instant: no full page reloads when moving
between sections or to the login and registration screens.

**Why this priority**: This is the product. Without a fast, clear landing
page nothing else (contact, registration, CMS) has any value.

**Independent Test**: Load the site with the default seeded content on a
phone-sized and a desktop-sized viewport and verify every section renders in
order with its content, the in-page links scroll to the right section, and
the page meets the performance and accessibility targets in Success Criteria.

**Acceptance Scenarios**:

1. **Given** the site has published landing content, **When** a visitor opens
   the home page, **Then** they see the hero with the headline "You brief. We
   shoot.", a sub-headline, trust statements, a primary contact action and a
   secondary action, followed by the published sections in the configured
   order.
2. **Given** the visitor is on the home page, **When** they tap an in-page
   navigation link (e.g. "How it works"), **Then** the page scrolls to that
   section without reloading and the browser URL reflects the section.
3. **Given** the visitor is on a 360 px wide phone, **When** they scroll the
   whole page, **Then** nothing overflows horizontally, all text is readable
   without zooming, and every tap target is comfortably tappable.
4. **Given** the visitor uses only a keyboard or a screen reader, **When**
   they navigate the page, **Then** every section, link and control is
   reachable and announced with a meaningful name.
5. **Given** a section has no items (for example an empty FAQ), **When** the
   page renders, **Then** that section is omitted rather than shown empty.

---

### User Story 2 - Contact the business on WhatsApp (Priority: P1)

A visitor who wants a shoot (or, later, any service) taps a WhatsApp action
and lands in a WhatsApp chat with the business, with a pre-filled opening
message, on the number the owner configured.

**Why this priority**: WhatsApp is the primary conversion path for this kind
of business in the target market; it must work from day one and must always
use the current number.

**Independent Test**: With a known WhatsApp number configured, open the home
page and verify every WhatsApp action (hero, section calls to action,
floating button) opens a WhatsApp chat link for exactly that number with the
configured message.

**Acceptance Scenarios**:

1. **Given** the owner configured the number +971 58 149 8824 and a default
   message, **When** a visitor taps "Get a quote on WhatsApp", **Then** a
   WhatsApp chat opens for that number with the message pre-filled.
2. **Given** the visitor is anywhere on the page on a phone, **When** they
   look at the bottom of the screen, **Then** a floating WhatsApp button is
   visible and does not cover form submit buttons or other controls.
3. **Given** the owner changes the number in the CMS, **When** a visitor
   opens the page within one minute, **Then** every WhatsApp action uses the
   new number.

---

### User Story 3 - Edit landing content and the WhatsApp number without a developer (Priority: P2)

The owner (or an editor) signs in to the content management area, changes
any landing-page text, image, section order or the WhatsApp number, previews
the change, publishes it, and sees it live on the site within a minute, with
no deployment.

**Why this priority**: Editing without engineers is a stated goal; it is
second only to having the page itself.

**Independent Test**: Sign in as an editor, change the hero sub-headline,
reorder two sections, add an FAQ item, change the WhatsApp number, publish,
and confirm the public page reflects all four changes within one minute.

**Acceptance Scenarios**:

1. **Given** an editor is signed in to the content area, **When** they edit
   the hero headline and publish, **Then** the public home page shows the
   new headline within 60 seconds.
2. **Given** an editor reorders, adds or removes a section, **When** they
   publish, **Then** the public page shows sections in the new order.
3. **Given** an editor enters a WhatsApp number in a non-international
   format, **When** they try to save, **Then** the save is rejected with a
   message explaining the required format and the previous number stays live.
4. **Given** an editor saves a draft without publishing, **When** a visitor
   opens the public page, **Then** the visitor still sees the last published
   content.
5. **Given** a visitor who is not an editor, **When** they try to open the
   content area, **Then** they are denied access.

---

### User Story 4 - Register and log in (Priority: P2)

A visitor creates an account, choosing whether they need a professional
("seeker") or are a professional ("provider", picking which kind from the
active audience list), then logs in and out, and sees a simple account page.

**Why this priority**: Accounts are required by the owner now and are the
foundation for future briefs, bookings and provider profiles, but the site
converts via WhatsApp even without them.

**Independent Test**: Register a new seeker and a new provider through the
public forms, log out, log back in, and view the account page; verify
validation messages, duplicate-email handling and lockout after repeated
wrong passwords.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration page, **When** they submit a
   valid name, email, password and account type, **Then** an account is
   created, they are signed in, and they land on their account page.
2. **Given** a visitor chooses "provider", **When** the form shows the
   professional type, **Then** the options are exactly the active personas
   configured in the CMS, and one must be selected.
3. **Given** an email that already has an account, **When** a visitor tries
   to register with it, **Then** they see a clear message and no second
   account is created.
4. **Given** a registered member, **When** they log in with the correct
   password, **Then** they are signed in and taken to their account page (or
   the page they were trying to reach).
5. **Given** a member enters a wrong password five times in a row, **When**
   they try a sixth time, **Then** the account is temporarily locked and the
   message says so, even if the password is now correct.
6. **Given** a signed-in member, **When** they log out, **Then** protected
   pages are no longer accessible without logging in again.
7. **Given** a member registers while attempting to grant themselves editor
   or admin rights through the form, **When** the account is created,
   **Then** it is an ordinary member account.

---

### User Story 5 - Change the target audience from the CMS (Priority: P3)

The owner adds a new persona (for example "Teacher") with its categories, or
deactivates the current ones, entirely from the content area, and the public
site and registration form reflect the new audience without any code change
or deployment.

**Why this priority**: It is a stated future need; building the model now is
cheap, retrofitting it later is expensive. The MVP ships with photographers
and videographers active.

**Independent Test**: As an admin, create a "Teacher" persona with two
categories, activate it, publish, and confirm the hero selector, the
category grid, the professionals section and the provider registration
options all include Teacher within one minute, with no code changed.

**Acceptance Scenarios**:

1. **Given** the active audience is "Photographer, Videographer", **When**
   the admin adds "Teacher" and activates it, **Then** every place on the
   site that lists professional types shows all three in the configured
   order.
2. **Given** copy such as "Find a {personas.list}", **When** the audience
   changes, **Then** the rendered sentence updates to the new list ("Find a
   photographer, videographer or teacher").
3. **Given** a persona is deactivated, **When** visitors use the site,
   **Then** it no longer appears anywhere public, while existing provider
   accounts linked to it are kept intact.
4. **Given** a persona is referenced by any account or category, **When**
   an admin tries to delete it, **Then** deletion is refused with an
   explanation.

---

### Edge Cases

- No persona is active: the site still renders; audience-dependent sections
  and the provider option in registration are hidden, and the admin sees a
  warning in the content area.
- Landing content has never been published: the public page shows the hero
  with seeded defaults and no sections, never an error page.
- Hero image missing or slow: the layout reserves its space so text does not
  jump; a solid colour background is shown until the image arrives.
- Very long headline or sub-headline (200+ characters): wraps gracefully on
  all viewports; the content area warns editors above a recommended length.
- Visitor has JavaScript disabled: the page, its anchors, the WhatsApp links
  and both forms still work.
- WhatsApp number contains spaces, dashes or a leading "00": it is stored
  normalised and the chat link uses digits only.
- Registration or login submitted twice quickly: only one account or session
  results; the button is disabled while pending.
- Session expires while on the account page: the next protected action
  redirects to login and returns to the intended page afterwards.
- Two editors edit the same page: the last publish wins and the content area
  shows who published last and when.

## Requirements *(mandatory)*

### Functional Requirements

**Landing page**

- **FR-001**: The system MUST serve a single public landing page composed of a
  hero area followed by an ordered list of content sections.
- **FR-002**: The hero MUST display a headline, sub-headline, up to three
  trust statements, a primary WhatsApp action and a secondary action, all
  sourced from the content store; the shipped default headline is "You brief.
  We shoot.".
- **FR-003**: The system MUST support at least these section types, each
  fully editable: How it works (ordered steps), Why us (feature list),
  Specialties/categories grid, For professionals (persona band), FAQ,
  Trusted-by logos, Rich text, and a generic call-to-action.
- **FR-004**: In-page navigation links MUST scroll to the matching section
  without a full page reload and update the URL fragment.
- **FR-005**: Moving between the landing page, login, registration and
  account pages MUST not trigger a full page reload once the site is loaded.
- **FR-006**: The landing page MUST render correctly, with no horizontal
  scrolling, at viewport widths from 360 px to 1440 px and above.
- **FR-007**: Every page MUST meet WCAG 2.1 AA for structure, labels,
  keyboard operability, focus visibility and colour contrast.
- **FR-008**: Sections with no items MUST be omitted from the public page.
- **FR-009**: The landing page MUST expose a title, description and social
  preview image editable from the content store, and a machine-readable
  sitemap.

**WhatsApp contact**

- **FR-010**: Every WhatsApp action on the site MUST open a WhatsApp chat
  for the single number configured in site settings, with the configured
  default message pre-filled.
- **FR-011**: A floating WhatsApp button MUST be visible on all public pages
  on phone-sized viewports without obstructing form controls.
- **FR-012**: The configured WhatsApp number MUST be validated as an
  international number on save and stored in a normalised form.

**Content management**

- **FR-013**: Editors MUST be able to create, edit, reorder, remove, preview
  (draft) and publish every hero field and section through the content area
  without technical knowledge.
- **FR-014**: Published changes to landing content, site settings, personas
  or categories MUST be visible to visitors within 60 seconds without a
  deployment or rebuild.
- **FR-015**: Draft (unpublished) content MUST never be visible to visitors.
- **FR-016**: Only users with the admin or editor role MUST be able to access
  the content area; all other users and anonymous visitors MUST be denied.
- **FR-017**: Editors MUST be able to upload images with required alternative
  text, and the site MUST serve appropriately sized versions.
- **FR-018**: The content area MUST record who last published each item and
  when.

**Accounts**

- **FR-019**: Visitors MUST be able to register with name, email, password
  and account type (seeker or provider); providers MUST choose one active
  persona and MAY choose categories.
- **FR-020**: The system MUST reject registration with an email that already
  has an account, with a clear message.
- **FR-021**: Passwords MUST be at least 8 characters and never be shown,
  returned or logged; the system MUST store them only in hashed form.
- **FR-022**: Members MUST be able to log in with email and password, stay
  signed in across browser restarts for a bounded period, and log out.
- **FR-023**: After five consecutive failed logins the account MUST be
  locked for at least 15 minutes with a message that says so.
- **FR-024**: Members MUST only be able to read and edit their own account;
  admins MAY manage all accounts. Members MUST NOT be able to grant
  themselves elevated roles.
- **FR-025**: Protected pages MUST redirect unauthenticated visitors to login
  and return them to the intended page after success.

**Audience extensibility**

- **FR-026**: Personas (kinds of professional) and categories (specialties)
  MUST be managed as content, each with a stable identifier, display names
  (singular and plural), description, image, order and active flag.
- **FR-027**: Site settings MUST define the ordered list of active personas;
  every public listing of professional types and every registration option
  MUST derive from that list.
- **FR-028**: Content text MUST support placeholders for persona names
  ({persona.singular}, {persona.plural}, {personas.list}, {personas.listAnd})
  that are replaced at display time.
- **FR-029**: Deleting a persona or category that is referenced by any
  account or other content MUST be refused with an explanation;
  deactivation MUST always be allowed.
- **FR-030**: Adding, activating, deactivating or renaming a persona or
  category MUST require no code change or deployment.

**Quality and operations**

- **FR-031**: Every acceptance scenario in this specification MUST be
  covered by at least one automated test that runs in continuous
  integration.
- **FR-032**: A single command MUST be able to seed a fresh environment with
  default content: two personas (Photographer, Videographer), six
  categories, site settings with a placeholder WhatsApp number, the default
  landing page, and one admin account from environment configuration.
- **FR-033**: The system MUST run as a single stateless web application so
  that additional instances can be added behind a load balancer without
  code changes.

### Key Entities

- **Landing Page**: the single public page; holds the hero (headline,
  sub-headline, trust statements, primary and secondary actions, image), an
  ordered list of sections, search-engine metadata and publication state
  (draft/published, last published by/at).
- **Section**: one block of the landing page of a given type (how-it-works,
  why-us, categories grid, persona band, FAQ, logos, rich text, call to
  action) with its own fields; sections belong to exactly one landing page.
- **Site Settings**: site name, WhatsApp number and default message, contact
  email, social links, and the ordered list of active personas.
- **Persona**: a kind of professional (singular/plural names, stable
  identifier, description, image, order, active flag, persona-specific call
  to action copy). Referenced by categories, users and site settings.
- **Category**: a specialty (name, stable identifier, description, image,
  order, active flag) linked to one or more personas.
- **User**: an account with name, email, hashed password, roles (member,
  editor, admin), account type (seeker/provider), optional persona and
  categories (providers), login-attempt and lock state, timestamps.
- **Media**: an uploaded image with required alternative text and generated
  size variants, referenced by the hero, sections, personas and categories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a mid-range phone over a simulated 4G connection, the
  landing page's main content is visible within 2.5 seconds, layout shift
  stays under 0.1, and interactions respond within 200 ms; the page scores
  at least 90 on an industry-standard performance audit.
- **SC-002**: A visitor can go from landing on the page to an open WhatsApp
  chat in two taps.
- **SC-003**: An editor can change the hero text and the WhatsApp number and
  see both live on the public site within 60 seconds, without developer
  involvement, on their first attempt.
- **SC-004**: A new visitor can complete registration in under 2 minutes and
  log in afterwards in under 30 seconds.
- **SC-005**: Adding a new persona with two categories through the content
  area takes an admin under 10 minutes and requires zero code changes; all
  audience-dependent parts of the site reflect it within 60 seconds.
- **SC-006**: 100% of the acceptance scenarios in this specification are
  covered by automated tests; overall automated coverage is at least 80% of
  statements and branches, and 100% for shared business rules.
- **SC-007**: The landing, login and registration pages have no serious or
  critical accessibility violations in automated audits and score at least
  95 on an industry-standard accessibility audit.
- **SC-008**: The site renders without horizontal scrolling or overlapping
  controls at 360, 768, 1024 and 1440 px wide viewports.
- **SC-009**: The application can be scaled horizontally: two instances
  behind a load balancer serve the site and the content area without errors
  or lost sessions.

## Assumptions

- Visitors are primarily in the UAE and arrive mostly on mobile devices;
  WhatsApp is the preferred contact channel. One business WhatsApp number is
  sufficient for the MVP.
- The MVP is English only; the content model is designed so Arabic (or any
  language) can be added later without restructuring content.
- Authentication is email and password. Email verification and password
  reset emails are supported by the account model but are switched off until
  an email provider is configured; one-time codes and social login are out
  of scope for this feature.
- Registration is open to anyone; admin and editor accounts are created by
  the seed command or by an existing admin, never by self-registration.
- The default audience at launch is Photographer and Videographer with six
  categories inspired by shootix.ae (Portrait, Events, Fashion & Beauty,
  Wedding & Engagement, Corporate & Branding, Real Estate & Architecture).
  Copy and imagery are placeholders for the owner to replace.
- Briefs, quotes, bookings, payments, pricing pages, provider public
  profiles and a provider directory are out of scope for this feature; the
  persona and account model is built so they can be added later.
- The account page in this feature shows the member's details and a logout
  action only.
- Images are uploaded only by editors; members do not upload media in this
  feature.
- "Single page" means the landing page is one scrolling page and the site
  navigates without full reloads; it does not require that login and
  registration live on the same URL as the landing page.
- The project working name is the repository name; final branding is
  pending and does not block this feature.
