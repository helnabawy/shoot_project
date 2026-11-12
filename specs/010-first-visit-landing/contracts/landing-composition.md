# Contract: landing composition (app)

Inputs: `GET /landing`, `GET /brief-builder`, `GET /site`. Top to bottom: header; hero (headline and
sub-headline from `landing.hero`, the bar from `brief-builder`); occasions (`categoriesGrid`);
creators (`creatorNetwork`, only with at least 4 cards); band (`personaBand`, always dark); closing
(`callToAction`). A missing section is omitted; `UnknownSection` is skipped.

No builder (`builder == null`) or no persona slot options: the bar is hidden and the primary action
becomes "Ask us on WhatsApp" (number and message from `site.whatsapp`). Landing load failure:
screen 39 with retry. The hero scene is always the drawn golden-hour scene.
