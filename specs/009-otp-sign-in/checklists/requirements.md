# Specification Quality Checklist: Sign in with a mobile number and a one-time code

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- The spec names no framework, library or vendor. It does name SMS, WhatsApp, the platform's secure
  storage and an HTTP-only cookie, because they are owner decisions and user-visible constraints
  (the channels a person chooses; where a session may live), not design choices.
- Defaults taken instead of clarification markers (the owner can overturn any in `/speckit-clarify`):
  - Numbers: UAE mobile only; code valid 5 minutes; 5 attempts; resend after 60 s (the boards show
    a countdown from 0:42, so the cooldown is at least that); 5 codes per number, 20 per address,
    10 per install, 30 checks per address, per hour.
  - Sessions: 7 days (the site's current length), renewed in the app below 2 days.
  - The role question defaults to "I need a …" (board 21 shows it selected).
  - "I'm a …" on the code screen leads to Join as a creator with the code kept, so a creator
    account is never created without a profession and the Professional Terms.
  - Client accounts accept the Terms and Privacy Policy by continuing (board 20's line); creators
    tick a box (board 23).
  - Admins and editors cannot sign in by code.
  - Account linking (email account + number) is on the website only, after a code.
  - A name is optional for accounts created by code.
- User Story 5 changes the website's existing behaviour (feature 001 FR-019 to FR-022). The 001 spec
  is amended as part of that story's tasks, not here.
