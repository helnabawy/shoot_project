# Feature Specification: Landing Page, Member Accounts and CMS-Managed Content

**Feature Branch**: `001-landing-auth-cms`

**Created**: 2026-11-06

**Status**: Draft

**Amended**: 2026-11-06 — added bilingual English/Arabic (US6, FR-034–FR-041) and light/dark appearance (US7, FR-042–FR-045) for the public site and the content area; added the one-sentence brief builder with CMS-managed options (US8, FR-046–FR-054), modelled on shootix.ae's Quick Match step 1. Later Quick Match steps (creator, details, quotation) are feature 003. 2026-11-07 — added client-flow simplicity and design-quality requirements (FR-055–FR-062, SC-015–SC-017); visual direction chosen through the impeccable workflow: "The Shoot Pass" first, replaced the same day by "Bilingual Wayfinding" at the owner's request (premium, more readable, no ticket gimmick), then replaced again the same day by "The Brief Bar", a Spotlight / Quick Actions direction the owner pinned after a re-roll (warmer, more premium, no costume). 2026-11-07 — the brief builder's professional slot may let the visitor pick more than one professional type, e.g. a photographer and a videographer for the same shoot (FR-063, US8 scenario 10). 2026-11-07 — at the owner's request the brief is built one step at a time instead of pre-filled: the bar opens as one search field with only the professional list, each choice prints into the sentence and reveals the next list, and the primary action appears once every part is answered (FR-067; FR-055, FR-057, FR-064 and FR-065 amended, the folded options drawer is replaced; US8 scenarios 1, 11, 12 and 13).

**Input**: User description: "New website inspired by shootix.ae. Fast, single-page feel, responsive. Hero section 'You brief. We shoot.' Visitors can register and log in. A CMS lets the owner edit the landing page content and the WhatsApp mobile number. The structure must scale. Unit tests cover all use cases. The target audience (today photographers, videographers and other shooters) must be changeable from the backend in future, e.g. to teachers, without code changes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover the offer on the landing page (Priority: P1)

A visitor, usually on a phone, opens the website and immediately understands
what the business does ("You brief. We shoot."), who it is for, how it works
and why to trust it. The page is a single scrolling page with in-page
navigation to its sections (how it works, why us, specialties, for
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
   the home page, **Then** they see the hero filling the screen under the
   header: the headline "You brief. We shoot." as its title and the brief
   builder beneath it as the primary action, over the hero image (FR-066),
   with a WhatsApp link as the secondary action, followed by the published
   sections in the configured order.
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
categories, activate it, publish, and confirm the brief builder's professional-type slot, the
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

### User Story 6 - Read and manage the site in Arabic or English (Priority: P2)

A visitor chooses Arabic or English. The whole public site (landing page,
login, registration, account) appears in that language, laid out
right-to-left for Arabic with suitable typefaces, and the choice is
remembered. Editors enter the Arabic and English version of every piece of
content in the content area, and can use the content area itself in Arabic
or English.

**Why this priority**: The target market is the UAE, where a large share of
visitors read Arabic and competitors offer both languages. It ranks below
the landing page and WhatsApp contact only because the English site already
converts; it must ship in the first release.

**Independent Test**: With both languages published, open the Arabic site on
a phone: every text is Arabic, layout is right-to-left, no overflow; switch
to English and back without reloads; in the content area edit a field in
both languages and publish; leave one Arabic field empty and confirm the
English text shows in its place.

**Acceptance Scenarios**:

1. **Given** content is published in both languages, **When** a visitor opens
   the Arabic site, **Then** every heading, paragraph, button, label, image
   description and the WhatsApp opening message are in Arabic and the page is
   laid out right-to-left.
2. **Given** a visitor on the English page, **When** they use the language
   switcher, **Then** the same page appears in Arabic at its own
   language-specific address without a full reload, keeping the section they
   were viewing, and the choice is remembered on their next visit.
3. **Given** a first-time visitor whose browser prefers Arabic, **When** they
   open the site's root address, **Then** they see the Arabic site; visitors
   with any other preference see English.
4. **Given** an editor in the content area, **When** they edit the landing
   page, personas, categories or site settings, **Then** they can enter the
   English and the Arabic value of every text field and publish both.
5. **Given** an Arabic value is missing for a field, **When** the Arabic page
   renders, **Then** the English value is shown in its place and the content
   area marks the field as untranslated.
6. **Given** an editor who prefers Arabic, **When** they open the content
   area, **Then** its menus, labels, buttons and messages are in Arabic.
7. **Given** the Arabic site on a 360 px phone, **When** the visitor scrolls,
   **Then** nothing overflows, phone numbers and email addresses read
   left-to-right inside the right-to-left text, and directional icons
   (arrows, chevrons) point the right way.
8. **Given** a search engine, **When** it crawls either language, **Then**
   each page declares its language and links to its counterpart in the other
   language.

---

### User Story 7 - Choose a light or dark appearance (Priority: P3)

A visitor sees the site in the appearance matching their device (light or
dark) from the very first paint, can switch with a visible toggle, and the
choice sticks. Editors get the same choice in the content area.

**Why this priority**: Many phones are in dark mode; a light-only site
glares, and a flash of the wrong theme looks broken. It is last because the
site is fully usable in a single theme.

**Independent Test**: Open the site with the device in dark mode and confirm
dark from the first frame; toggle to light; reload and navigate; confirm the
choice persists; run the accessibility audit in both themes; switch the
content area to dark in editor preferences.

**Acceptance Scenarios**:

1. **Given** a device set to dark mode, **When** a visitor opens any public
   page, **Then** it renders in the dark theme immediately, with no flash of
   the light theme.
2. **Given** a visitor on any public page, **When** they use the theme
   toggle, **Then** the appearance changes at once, applies to every page, and
   is remembered on their next visit; choosing "system" returns to following
   the device.
3. **Given** either theme, **When** the page is audited, **Then** text and
   controls meet the contrast requirements and logos and images remain
   legible (editors can provide a dark-background variant where needed).
4. **Given** an editor, **When** they choose light, dark or system in their
   content-area preferences, **Then** the content area follows that choice.

---

### User Story 8 - Build a brief in one sentence (Priority: P1)

A visitor describes the shoot by completing a sentence made of selectable
words — "I need a **photographer** for **an event** on **12 Dec** for
**2 hours** in **Dubai**, shot by **anyone**" — and taps "See who's free". Every selectable word
(professional type, occasion, date, duration, location, shot by, and any slot the owner
adds later) comes from the content area, filtered to the chosen
professional type, so the owner can add "a product shoot", change the
emirates, or, for a different audience, replace occasions with school
subjects, without a developer. In this release the completed brief is saved
as a lead and handed to WhatsApp with the sentence pre-filled; the later
matching steps (choose a creator, your details, your quotation) are a
separate feature that will start from the same saved brief.

**Why this priority**: This widget is the heart of the inspiration site and
the fastest path from "I need a shoot" to a conversation; it also captures
leads with structured data instead of free text.

**Independent Test**: With the seeded option sets, complete the sentence on
a phone, submit, and verify that a brief is recorded in the content area and
that WhatsApp opens with the sentence pre-filled in the page language; add
an occasion in the content area and see it in the list within a minute.

**Acceptance Scenarios**:

1. **Given** the brief builder is enabled with its option sets, **When** a
   visitor opens the page, **Then** the bar shows one search field ("Type
   what you're looking for") and only the first list (the professional
   types); picking one prints it into the sentence and shows the next list,
   and so on until every part is answered.
2. **Given** the visitor changes the professional type, **When** they open
   the occasion slot, **Then** only occasions linked to that type (or to all
   types) are listed, in the configured order.
3. **Given** every required slot is filled, **When** the visitor taps "See
   who's free", **Then** the brief is recorded and WhatsApp opens with the
   configured message containing every selected word and the date; the
   visitor stays on the page with a confirmation.
4. **Given** a required slot is empty or the date is in the past, **When**
   the visitor submits, **Then** that slot is highlighted with a message and
   nothing is sent or recorded.
5. **Given** an editor adds the option "a product shoot" to the Occasions
   set and publishes, **When** a visitor reloads, **Then** the new option is
   listed within 60 seconds.
6. **Given** an editor changes the sentence to add a new slot bound to a
   new option set (for example "{subject}" for teachers), **When** the page
   renders, **Then** the new slot appears in the sentence with its options,
   with no code change.
7. **Given** the Arabic site, **When** the visitor uses the builder,
   **Then** the sentence, the options and the WhatsApp message are in
   Arabic, laid out right-to-left.
8. **Given** a signed-in member submits a brief, **When** an admin opens
   the content area, **Then** the brief shows the member's name and contact,
   and the member sees it listed on their account page.
9. **Given** JavaScript is disabled, **When** the visitor submits the
   sentence, **Then** the brief is still recorded and they are taken to the
   WhatsApp chat.
10. **Given** the editor allows several professional types in the
   professional slot, **When** the visitor picks Photographer and
   Videographer, **Then** the sentence reads "a photographer and
   videographer" (joined in the page language), the other slots list the
   options of either type, and the recorded brief and the WhatsApp message
   name both types.
11. **Given** JavaScript is available, **When** a visitor opens the page,
   **Then** the builder shows only the search field and the first step's
   list, with no primary action yet; **When** they tap a chosen word of the
   sentence, **Then** that step's list comes back with focus on its current
   choice (FR-064, FR-067).
12. **Given** the builder is on the page, **When** the visitor presses
   Cmd+K (Ctrl+K off Apple devices), **Then** focus moves to the search
   field; Escape clears what they typed first, then leaves a reopened step
   (FR-065).
13. **Given** the visitor has picked only a professional type, **When** they
   look at the bar, **Then** they see the sentence so far ("I need a
   photographer for …") and only the next list; tapping "photographer"
   reopens the professional list, and Backspace in the empty field takes
   that answer back (FR-067).

---

### Edge Cases

- No persona is active: the site still renders; audience-dependent sections
  and the provider option in registration are hidden, and the admin sees a
  warning in the content area.
- Landing content has never been published: the public page shows the hero
  with seeded defaults and no sections, never an error page.
- Hero image missing or slow: the full-screen stage reserves its space so
  text does not jump; with no image, a designed studio backdrop is shown
  instead (FR-066), never an invented photo.
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
- Arabic text containing Latin fragments (brand names, email addresses,
  phone numbers, URLs): the fragments keep left-to-right direction inside
  right-to-left lines and never break the WhatsApp number.
- Persona placeholders in Arabic: {persona.singular} and {persona.plural}
  resolve to the Arabic names the editor entered; list placeholders use the
  Arabic conjunction ("أو" / "و").
- Arabic typeface slow to load: text stays visible in a fallback system
  typeface; no layout jump larger than the layout-shift budget.
- Language switch while a form has errors or a `next` destination: the
  errors are shown in the new language and the destination is preserved.
- Editor saves Arabic for the hero but leaves a section untranslated: the
  Arabic page shows the English section text and the content area lists the
  untranslated fields.
- Visitor's stored theme or language preference is invalid or cleared: the
  site falls back to the device setting and English without error.
- Theme toggle with JavaScript disabled: the site follows the device
  setting; the toggle is hidden rather than broken.
- Dark theme and uploaded logos: a logo without a dark variant is shown on a
  light chip so it stays legible.
- Brief builder sentence contains a slot token with no matching slot
  definition: the token is shown verbatim, the content area warns the
  editor, and submission still works for the defined slots.
- An option set linked to a slot has no option for the chosen professional
  type: the slot shows the options available to all types; if none, the
  slot shows "no options yet" and the brief cannot be submitted.
- Visitor submits the same brief twice within a minute (double tap or
  reload): one brief is recorded and WhatsApp opens once.
- Anonymous visitor submits many briefs quickly: submissions beyond the
  limit are refused politely and not recorded; signed-in members are not
  limited.
- Date slot: dates are interpreted in the business time zone (UAE); today
  is allowed; the date can be chosen without JavaScript.
- Very long option labels ("a corporate, branding or advertising shoot"):
  the sentence wraps across lines without breaking a slot in two.

## Requirements *(mandatory)*

### Functional Requirements

**Landing page**

- **FR-001**: The system MUST serve a single public landing page composed of a
  hero area followed by an ordered list of content sections.
- **FR-002**: The hero MUST display a headline, up to three
  trust statements, the brief builder (FR-046) as the primary action and a
  WhatsApp link as the secondary action (editors MAY switch to an alternative
  layout with two plain actions), all sourced from the content store; the shipped default headline is "You brief.
  We shoot.". The sub-headline stays an editable field but is not shown in
  the full-screen hero (FR-066).
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

**Languages**

- **FR-034**: The public site MUST be available in English and Arabic;
  Arabic pages MUST be laid out right-to-left (text alignment, reading order,
  mirrored directional icons) with typefaces suited to Arabic script.
- **FR-035**: Each language MUST have its own address (English at the root,
  Arabic under a language prefix); every page MUST declare its language and
  reference its counterpart in the other language for search engines.
- **FR-036**: Every public page MUST show a language switcher that keeps the
  visitor on the equivalent page; the chosen language MUST persist across
  visits; first-time visitors MUST be directed to the language matching
  their browser preference, defaulting to English.
- **FR-037**: Every user-visible text in the content store (landing page
  content, navigation labels, site-settings messages and labels, persona
  and category names and descriptions, image alternative text) MUST be
  editable per language; identifiers, numbers, order, flags, images and the
  WhatsApp number MUST be shared across languages.
- **FR-038**: Where an Arabic value is missing, the English value MUST be
  shown in its place, and the content area MUST indicate which fields are
  untranslated.
- **FR-039**: Static interface text (navigation, form labels, validation and
  error messages, account page, theme and language controls) MUST be
  provided in both languages from versioned translation files, and a missing
  key MUST fail the automated tests.
- **FR-040**: The content area MUST be usable in English or Arabic, chosen
  per editor, with right-to-left presentation for Arabic.
- **FR-041**: Persona placeholders MUST resolve to the persona names and
  conjunctions of the language being displayed.

**Appearance**

- **FR-042**: The public site MUST offer light and dark appearance: the
  default follows the device setting, a visible toggle (light / dark /
  system) overrides it, the choice persists across visits, and the first
  paint already uses the correct theme.
- **FR-043**: Both themes MUST meet the contrast requirements of FR-007;
  editors MUST be able to provide a dark-background variant for the site
  logo and for partner logos.
- **FR-044**: The content area MUST support light and dark appearance per
  editor preference, following the device setting by default.
- **FR-045**: Performance, accessibility and responsive criteria (SC-001,
  SC-007, SC-008) MUST hold for both languages and both themes.

**Brief builder**

- **FR-046**: The landing page MUST offer a brief builder: a sentence
  defined in the content store whose slot tokens (e.g. {persona},
  {occasion}, {date}, {duration}, {location}, {shotBy}) render as selectable words,
  each bound to a slot definition of kind professional type, option set,
  date or number; a slot MAY additionally let the visitor type their own
  words when the editor allows it.
- **FR-047**: Option sets MUST be managed in the content store, each with a
  name, stable identifier and ordered options; every option MUST have a
  label per language, a stable value, an order, an active flag and an
  optional list of professional types it applies to (empty meaning all).
- **FR-048**: Options shown in a slot MUST be filtered to the currently
  selected professional type and ordered as configured; changing the
  professional type MUST re-filter dependent slots and clear selections
  that are no longer valid.
- **FR-049**: Submitting a complete brief MUST record it (every slot's value
  and label, the date, the language, the page, the member if signed in, and
  the time) and open WhatsApp with the configured message template filled
  with the selections, using the site's WhatsApp number.
- **FR-050**: The builder MUST validate required slots and reject dates in
  the past (business time zone), MUST record at most one brief for repeated
  identical submissions within one minute, and MUST limit anonymous
  submissions per visitor to a configurable number per hour.
- **FR-051**: Editors MUST be able to change the sentence, add or remove
  slots, bind slots to option sets, set each slot's default and placeholder,
  the submit label, the helper text and the WhatsApp message template, in
  both languages, without a developer.
- **FR-052**: Admins MUST be able to list, filter (by professional type,
  date range, status) and export briefs, and set each brief's status (new,
  contacted, closed); members MUST see their own briefs on their account
  page; no one else MUST be able to read briefs.
- **FR-053**: The builder MUST be fully usable with a keyboard and screen
  reader (each slot a labelled control) and MUST work without JavaScript.
- **FR-054**: Each recorded brief MUST have a stable identifier so that a
  later feature can resume the matching flow from it.
- **FR-063**: Editors MUST be able to let visitors pick more than one
  professional type in the professional slot (a per-slot setting, off by
  default). When it is on, the visitor MAY pick any number of the active
  types (at least one when the slot is required); the sentence and the
  WhatsApp message MUST join the chosen types with the page language's
  "and"; dependent slots MUST list options that apply to any chosen type
  (FR-048); and the recorded brief MUST reference every chosen type, so
  admins can filter by any of them (FR-052). No type name is hardcoded: the
  setting works for any audience.
- **FR-067**: With JavaScript the builder MUST work as a step-by-step search:
  it opens with a search field and only the first slot's list; choosing a
  value prints it into the sentence as a token and shows the next
  unanswered slot's list (single choice advances in one tap; a slot that
  takes several choices advances with a "Continue" action; an optional slot
  offers a skip such as "any date"); typing searches every slot's options at
  once; tapping a chosen token reopens that step; Backspace in the empty
  field takes back the last answer; changing the professional type sends the
  visitor back to any step whose answer it no longer offers; the primary
  action appears once every slot is answered. Without JavaScript every list
  shows at once as a form (FR-053). A slot's default value only lists that
  option first.

**Client flow simplicity and design quality**

- **FR-055**: The client journey MUST be: land → build the brief one step at
  a time, one short list per step, nothing pre-filled (FR-067) → one tap to
  submit → confirmation
  with a reference and a WhatsApp chat already written. No account, login,
  email or phone number MUST be required to submit a brief.
- **FR-056**: Each screen MUST present exactly one primary action, visually
  dominant; secondary actions (WhatsApp, login) MUST be visibly secondary.
- **FR-057**: The brief builder MUST be the first thing on the landing page
  on every viewport, with the search field and the current step's list
  starting above the fold on a 360 × 640 phone, and the primary action
  appearing right under the field once the brief is complete.
- **FR-058**: Every label, hint and error MUST be plain language of at most
  one short sentence, say what to do next, and appear next to the thing it
  refers to; no jargon, no codes shown to clients except the brief
  reference.
- **FR-059**: After submitting, the client MUST see what happens next
  (reference, "we'll reply on WhatsApp", expected response time from site
  settings) and a way to start another brief; members MUST find past briefs
  on their account page.
- **FR-060**: Registration MUST ask only name, email, password and account
  type (plus the professional type for providers); login MUST ask only email
  and password; both MUST be reachable in one tap from the header and MUST
  return the client to where they were.
- **FR-061**: The public site MUST follow the recorded visual direction
  (The Brief Bar: one Spotlight-style panel, the brief as a search field,
  options as grouped result rows, the Top Hit as the one primary action),
  in both languages and both themes, and MUST NOT contain stock gradients,
  translucent panels other than the brief bar itself, generic icon tiles, or invented proof
  (testimonials, client logos, counts, ratings). The hero stage (FR-066) is
  the one place for a photograph or the designed studio backdrop behind
  the bar.
- **FR-062**: Interactive feedback MUST be immediate: every tap shows a
  visible state within 100 ms; pending actions show progress; set route
  lines show a check and the route progress advances; submission marks the
  route complete with its reference, and an equivalent non-animated
  confirmation appears when the visitor prefers reduced motion.

**Brief bar refinements** (owner-directed, 2026-11-07)

- **FR-064**: (Amended 2026-11-07: the folded options drawer and its toggle
  are replaced by the step-by-step search of FR-067.) With JavaScript only
  the asked step's list MUST show under the field. Tapping a chosen word of
  the sentence MUST bring that step's list back with focus on its current
  choice, and a validation error (FR-050) MUST reopen the step it concerns.
  Without JavaScript every group MUST stay open so the plain form works
  (FR-053).
- **FR-065**: Cmd+K on Apple devices and Ctrl+K elsewhere MUST move focus to
  the search field from anywhere on the page, matched by the physical key so
  it works on an Arabic keyboard layout. Escape MUST clear a typed search
  first, then leave a reopened step. The shortcut MUST be shown as a key hint
  on devices with a pointer that can hover, and never on touch-only
  devices.
- **FR-066**: The hero MUST fill the screen below the header, edge to edge:
  the headline as its title in the page language (the other language's line
  and the sub-headline are not shown) and the brief bar beneath it, over the
  hero image from the content area, or over a designed studio backdrop until
  an image is uploaded (never an invented photo). Over that background the
  bar MUST be frosted glass (light in the light theme, smoked in the dark
  theme) whose text keeps WCAG AA contrast over any photograph, which a
  theme-matched tint over the image guarantees.
- **FR-068**: Once every step of the brief is answered, the bar's secondary
  "WhatsApp us instead" action MUST open the chat pre-filled with the brief
  as the visitor built it (the same wording as the message a submitted brief
  sends, without a brief ID because none is created); before that it opens
  the chat with the default WhatsApp message from site settings.

### Key Entities

- **Landing Page**: the single public page; holds the hero (headline,
  sub-headline, trust statements, layout: brief builder or two actions,
  optional image), an
  ordered list of sections, search-engine metadata and publication state
  (draft/published, last published by/at).
- **Section**: one block of the landing page of a given type (how-it-works,
  why-us, categories grid, persona band, FAQ, logos, rich text, call to
  action) with its own fields; sections belong to exactly one landing page.
- **Site Settings**: site name, logo (light and dark variants), WhatsApp
  number (shared) and default message (per language), contact email, social
  links, interface labels (per language), the expected reply time (per
  language), the anonymous brief limit per hour and the ordered list of
  active personas.
- **Persona**: a kind of professional (singular/plural names, stable
  identifier, description, image, order, active flag, persona-specific call
  to action copy). Referenced by categories, users and site settings.
- **Category**: a specialty (name, stable identifier, description, image,
  order, active flag) linked to one or more personas.
- **User**: an account with name, email, hashed password, roles (member,
  editor, admin), account type (seeker/provider), optional persona and
  categories (providers), login-attempt and lock state, timestamps.
- **Media**: an uploaded image with required alternative text (per
  language), optional dark-background variant, and generated size variants,
  referenced by the hero, sections, personas and categories.
- **Brief Builder** (part of Landing Page): enabled flag, sentence template
  per language, ordered slot definitions (token, kind, bound option set,
  default, placeholder per language, required), submit label, helper text,
  WhatsApp message template per language.
- **Option Set**: a named, ordered list of options (name per language,
  stable identifier) such as Occasions, Durations or Locations; each option
  has a label per language, a stable value, order, active flag and the
  professional types it applies to.
- **Brief**: a visitor's completed sentence: selections (slot token, value,
  label), date, language, source page, optional member, visitor contact if
  provided, status (new, contacted, closed), created time, stable
  identifier and a short reference shown to the client.
- **Language**: one of the supported languages (English, Arabic) with its
  text direction; every localised text field holds one value per language,
  English being the fallback.
- **Visitor Preferences**: the language and appearance (light, dark, system)
  a visitor last chose, remembered on their device.

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
- **SC-010**: Switching language or appearance takes effect within 1 second
  and is remembered on the visitor's next visit; a visitor whose device is
  in dark mode never sees a light frame.
- **SC-011**: 100% of text fields in the content store can be edited in both
  languages; an editor can translate the entire default landing page in the
  content area without developer help.
- **SC-012**: The Arabic site and the dark theme meet the same performance,
  accessibility and responsive criteria as the English light site (SC-001,
  SC-007, SC-008), verified by the same automated audits.
- **SC-013**: A first-time visitor can complete the brief sentence and reach
  the WhatsApp chat in under 60 seconds and at most six taps on a phone.
- **SC-014**: An editor can add an occasion, change a default, or add a new
  slot with its option set in the content area in under 10 minutes with no
  developer involvement, and every recorded brief is visible to admins with
  its structured selections.
- **SC-015**: In moderated tests with five first-time participants per
  language, at least four complete a brief without help and none needs more
  than one attempt at the primary action.
- **SC-016**: The landing, login, register and account pages pass an
  independent design review against the recorded visual direction with a
  ship verdict and zero occurrences of the banned patterns in FR-061.
- **SC-017**: The happy path from first paint to WhatsApp is at most three
  taps when the defaults fit (tap a line, pick an option, tap the action) and
  at most six taps otherwise.

## Assumptions

- Visitors are primarily in the UAE and arrive mostly on mobile devices;
  WhatsApp is the preferred contact channel. One business WhatsApp number is
  sufficient for the MVP.
- The site ships in English (default) and Modern Standard Arabic. Default
  content is seeded in both languages; the Arabic seed copy is a starting
  point for the owner to review. No automatic machine translation is used.
- Addresses, section anchors and identifiers stay in Latin characters in
  both languages; numerals use Western Arabic digits (0–9) by default and
  editors may type Eastern Arabic digits in content if they prefer.
- The language and appearance preferences are stored on the visitor's device
  (not in an account) and apply to the whole site.
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
- The brief builder in this feature ends at WhatsApp plus a recorded lead.
  Creator availability, creator selection, client details, quotations,
  bookings and payments (shootix.ae's Quick Match steps 2–4) are feature
  003; provider public profiles and the creator directory are feature 002;
  pricing and corporate packages are feature 004; blog, legal and other
  marketing pages are feature 005. See `specs/ROADMAP.md`.
- The seeded slots are professional type, occasion, date, duration,
  location and shot by, with option sets seeded from shootix.ae's lists
  (occasions; 1, 2, 3, 4 or 8 hours; the UAE emirates; anyone, a woman, a
  man); the owner edits them freely.
- The account page in this feature shows the member's details, their briefs
  (FR-052, FR-059) and a logout action.
- Images are uploaded only by editors; members do not upload media in this
  feature.
- "Single page" means the landing page is one scrolling page and the site
  navigates without full reloads; it does not require that login and
  registration live on the same URL as the landing page.
- The project working name is the repository name; final branding is
  pending and does not block this feature.
