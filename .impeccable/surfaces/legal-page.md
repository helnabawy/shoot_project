---
version: 1
slug: "legal-page"
primary_target: "apps/web/src/modules/legal/render.tsx"
related_targets: ["apps/web/src/modules/legal/components/LegalView.tsx", "apps/web/src/modules/legal/components/VersionList.tsx", "apps/web/src/modules/auth/components/RegisterForm.tsx"]
---

# Legal documents and the registration acceptance

## Scope and mode

Inform, and record. `/terms`, `/terms/professional`, `/privacy` (+ `/ar`), their version archive, and the acceptance checkbox on `/register`. Feature 005 (US2).

## Audience, job, action

A person about to sign up, or a creator, or someone checking what they agreed to. Job: find the right document and read it as it stood. No primary action on the documents; on `/register` the one action stays "Create account" and the checkbox is the last thing before it.

## Proof and constraints

The text is the owner's and counsel's. The seed's sample text says it is a sample. A version shows its number and effective date; a version that applies later is announced in one sentence while the current one stays in force; earlier versions stay readable with their period. Arabic: the Arabic text where it exists, else the English text marked as English under a one-sentence notice; the English text governs.

## Build notes (2026-11-07)

- No hero, no table of contents, no decoration: title, one meta line (version and date), the text in the 680 px reading column.
- The acceptance row is a 44 px-high labelled checkbox inside the register panel, with the document names as links that open in a new tab so the form is never lost.

## Direction contract

THESIS: A legal page is a document, not a landing page: typography and spacing only.

DELIBERATELY ABSENT: "I have read" scroll gates, cookie-style banners, collapsible sections, download buttons.

FINISH: the impeccable finish review (`ship`) and the documenter are still to run (task T058).
