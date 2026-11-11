# Prompt: project review, market analysis and audience check

Fill in **Part A** first (each line has a default; delete what does not apply), then paste the whole
file to Claude. Part B is the brief Claude works from; Part C is how the answer must look.

---

## Part A — What I want (answer before running)

1. **Why I am asking.** The decision this research must support:
   _default:_ go / no-go on launching in the UAE, and which niche to launch with first.
   _other options:_ investor or partner pitch · pricing and commission choice · pivot to another profession.
2. **Geography.** _default:_ UAE only (Dubai first). _or:_ UAE + KSA · whole GCC.
3. **Who I start with.** _default:_ individuals (weddings, proposals, family, newborn) and small
   businesses (food, product, property, social content) equally. _or:_ one of them only.
4. **Business model I have in mind.** _default:_ undecided; commission per booking, payment held
   until delivery. _write here:_ commission % · subscription for creators · corporate retainers · other.
5. **What I already have.** _default:_ the website, no photographers signed, no clients, no
   portfolio, no brand name, no trade licence. _write here:_ photographers I know · budget · team ·
   time per week · licence status.
6. **Budget and timeline.** _default:_ self-funded, small marketing budget, launch within 3 months.
7. **The "other professions" idea** (teachers etc.). _default:_ check it briefly as a later
   expansion only. _or:_ give it equal weight now.
8. **Output I want.** _default:_ one written report in English with a one-page summary at the top.
   _or:_ also in Arabic · slide deck · spreadsheet of competitors.

---

## Part B — The brief

You are a marketplace strategist with experience in the UAE and GCC services market. Be blunt: I
want to know if this is worth building and for whom, not to be encouraged.

### The project (facts from the repository)

- A two-sided marketplace front door that brokers photographers and videographers ("creators") to
  people and businesses that need a shoot. Hero line: "You brief. We shoot." Inspired by
  **shootix.ae**, which it closely follows.
- Market: UAE, AED, all seven emirates. Bilingual English / Arabic (RTL done properly), light and
  dark themes, mobile-first. Conversion runs through **WhatsApp**.
- Client flow ("Quick Match"): a one-sentence brief (persona, occasion, date, duration, emirate,
  shot by) → available verified creators for that date at one fixed price → name + WhatsApp →
  quotation (PDF, accept online) → booking. No account needed to brief.
- Built (features 001, 002, 003, 005): landing page + CMS, accounts, creator profiles and directory
  (`/creators`, `/work/{specialty}`), matching, quotation and booking with states, marketing / legal
  pages, guides with RSS, SEO intent pages (`/hire/…`). A Flutter mobile app is started.
- Not built: pricing page and packages (004, drafted), referral programme, OTP / Google sign-in,
  notifications. **No payment provider**: the client pays by bank transfer, sends the receipt on
  WhatsApp, an admin records it by hand as held until delivery.
- Differentiators claimed so far: the audience is data (the same site could broker teachers or any
  profession tomorrow), first-class Arabic, one price shown before booking, a one-sentence brief
  instead of a quote form.
- Undecided: brand name, commission, payment provider, how creators are verified.
- Evidence on hand: none — no creators, clients, reviews, portfolio or logo.

### What to do

1. **Project review.** Judge what is built against what a first launch actually needs. Name what
   is over-built for day one, what is missing for real money to change hands (payments, licence,
   contracts, creator vetting, cancellations, disputes), and the riskiest assumption.
2. **Market.** Estimate demand for paid photo / video shoots in the UAE, split by segment
   (weddings and events, family and newborn, portraits, real estate, food and product, corporate,
   social-media content). Show your method (top-down and bottom-up), seasonality (wedding season,
   Ramadan, summer, events like Expo-type peaks), price ranges in AED, and the share of Arabic- vs
   English-speaking buyers. Note the rules that shape the business: freelance and trade licences,
   permits for shooting in public places and with drones, privacy and image-consent rules, and
   whether a platform that holds client money needs a licence. Mark each rule "verify with a lawyer".
3. **Competitors.** Find and compare at least 10, in three groups:
   - **Direct** — shoot-booking marketplaces in the UAE / GCC (start with shootix.ae; look for others).
   - **Indirect** — general service marketplaces and freelance platforms that list photographers
     (local home-services apps, Fiverr-style platforms, wedding directories, international shoot
     marketplaces that operate or once operated in the region).
   - **Substitutes** — how people really hire today: Instagram DMs, WhatsApp referrals, agencies,
     studios, hotel and venue in-house vendors, Google search.
   For each: offer, cities, price model and visible prices, commission or fees, creator vetting,
   languages, booking and payment flow, signs of traction (reviews, app ratings, social following,
   traffic estimates, funding), and weaknesses. Note any that shut down and why.
4. **Gaps.** List the unmet needs that are both real (evidence, not opinion) and reachable by a
   small team. For each, say who feels it, how often, what they do today, and whether this project
   already addresses it.
5. **Audience check.** Will anyone use it — on both sides? For clients: search demand
   (e.g. "photographer Dubai", "مصور دبي"), social and WhatsApp behaviour, willingness to pay a
   platform price instead of messaging a photographer directly. For creators: how many freelance
   photographers / videographers work in the UAE, how they find work, what they would pay or give
   up, and the risk that they take clients off-platform after the first booking (disintermediation).
   Name the beachhead segment most likely to work first.
6. **Persona expansion.** Briefly test whether "any profession" (e.g. tutors) is a real advantage
   or a distraction at this stage.
7. **Verdict and next steps.** Go / no-go / go-narrow, with confidence. Then a 90-day plan built
   around cheap experiments before more code: e.g. 20 client and 20 creator interviews, a WhatsApp
   concierge test with a few hand-picked creators, a small paid-ads test on one segment — each with
   a cost, a success threshold and what to do if it fails.

### Rules

- Search the web, in English **and Arabic**. Cite every fact with a link and its date; prefer
  sources from 2024 onward.
- Separate **fact** (sourced), **estimate** (show the maths) and **opinion** (your judgement).
- Never invent numbers, competitors, quotes or reviews. If something cannot be found, say so and
  say how I could find it.
- Money in AED. Keep it plain; no consultant jargon.

---

## Part C — Output

1. **One-page summary**: verdict, the beachhead segment, the three biggest risks, the first three
   actions.
2. **Project review** (short).
3. **Market** with a sizing table and sources.
4. **Competitor table** (one row per competitor, columns as listed in step 3), then a positioning
   map: price vs. effort-to-book.
5. **Gaps**, ranked.
6. **Audience check** for clients and for creators, with the disintermediation risk.
7. **Persona expansion** (one paragraph).
8. **90-day experiment plan** as a table: experiment, cost, success threshold, decision.
9. **Open questions** I must answer myself, and **sources**.
