# Product strategy — critique, market research, roadmap (October 2026)

> Written 2026-10-19 from the code on branch `party-prototype` plus web research. Prices and competitor
> features come from the competitors' own pages, so treat them as indicative. Sources are at the end.

## 1. TL;DR

1. **Our design quality is the best in the local market, but design is no longer what people pay for.** A free
   Kyrgyz competitor (toigo.app) already gives templates, RSVP, Kyrgyz/Russian text, national ornaments and WhatsApp
   sharing, with no sign-up. "A pretty page with an RSVP form" is now a commodity.
2. **The host's real job is managing people and obligations, not decorating a page.** A той host has to get 200–400
   people there, give the restaurant a headcount, honour the elders, and track *кошумча* (who gave what). We serve
   "make it pretty" very well and "manage the guests" barely at all.
3. **The biggest opportunities are personal guest invitations, real guest management, and a private gift
   ledger (*той дептер*).** Nobody in KG/KZ does the ledger. Together these turn a one-off page into a tool families
   come back to for every той.
4. **Every invitation reaches 100–400 future hosts.** A guest-to-host loop (tasteful "create yours" after the RSVP,
   a beautiful WhatsApp preview, a keepsake page after the event) is the cheapest growth channel we have.
5. **Before charging money, fix the trust and legal basics:** duplicate RSVPs, no link-preview image, no Kyrgyz guest
   page, no analytics, unlicensed music and pngwing images.

## 2. Honest critique of where we stand

### What is genuinely strong
- **Visual craft.** Paper, torn edges, seam ornaments, envelope and video intros, motion styles, music fragments
  with fade-out: this matches or beats Pinterest examples, and nothing local comes close.
- **Engineering.** Zod schema as single source of truth, versioned data format with migrations and frozen fixtures,
  ~478 tests, E2E. We can change things safely, which is rare at this stage.
- **Owner tooling.** Template admin, ordering and publishing, automatic template videos for marketing.

### Problems, from most to least important

| # | Problem | Why it matters |
|---|---|---|
| P1 | **Customisation, not personalisation.** We have 45 block backgrounds, ~40 fonts, 14 palettes, 17 textures and per-ornament motion settings, but the guest sees the same page as everyone else, with no name, no seat count and no "you". | The "wow" for a Kyrgyz guest is *"Урматтуу Асан байке жана Гүлнара эже!"*, not a torn-paper edge. The person paying (often a parent, 45–60, on a phone) can't value 45 backgrounds; they value respect and control. |
| P2 | **Guest management is MVP-level.** RSVP is a free-text name with up to 10 guests and a comment. There's no guest list, no "who hasn't answered", no reminders, no sides (bride/groom), no households, and only one event per invitation (кыз узатуу and үйлөнүү той are separate events with different lists). | The headcount for the restaurant is the number the host cares about most. |
| P3 | **Bug: "Изменить ответ" creates a duplicate RSVP.** `RsvpBlock` only resets the form and POSTs a new row; nothing ties the second answer to the first, and a reload forgets the guest answered at all. | "Всего гостей" is overcounted, which erodes trust in the one number that matters. |
| P4 | **WhatsApp-first, but the WhatsApp preview is bare.** `/i/[slug]` sets only a `<title>`; there's no `og:image` anywhere in `src/app`. | The first thing 300 guests see is a grey link card. Competitors' links show the couple and date. |
| P5 | **No Kyrgyz guest page.** The decision is made (one language per invitation), but it isn't built, and every guest-facing string is hard-coded Russian. | toigo.app, invite.kg and toichakyru are Kyrgyz-first. In the regions, Russian-only reads as "not for us". |
| P6 | **Wedding-only mental model.** The hero block assumes "two names + date". There's one national template (Этно). No templates or copy for кыз узатуу, бешик той, сүннөт той, тушоо кесүү, юбилей, ифтар, or ажы той. | toigo.app has 18 templates *just for кыз узатуу*, and toichakyru has ~124 templates across 9 event types. |
| P7 | **No way to pay us, and two legal blockers to charging.** PRO flags exist but are hidden. There's no pricing, no payment and no package. Built-in songs are commercial recordings without public-performance rights, and pngwing images are unlicensed. | We can't sell confidently until these are cleared, and a paying customer is far more likely to complain. |
| P8 | **No analytics.** We don't know how many people go from template to editor, to shared, to first guest open, to RSVP. | We can't tell which of the 45 backgrounds matter, where people drop out, or whether a feature worked. |
| P9 | **Option overload in the editor.** Even after the `editor-ux.md` work, the product's surface area keeps growing (motion idle amplitude, texture stains, background blur…). | Every option costs decision fatigue for users and maintenance for us. The target user said the editor felt "too difficult". |
| P10 | **The party prototype is a parallel universe.** It has its own canvas scenes, its own data in `lib/party.ts` and no link to the invitation format or RSVP. | Good idea, but there's a risk of building and maintaining two products. |
| P11 | **Ops basics.** Rate limiting is in memory, there are no scheduled backups, the free Supabase tier sleeps, and the admin is local-only. | Fine for a demo, risky once real weddings depend on us (already listed in AGENTS §10). |

## 3. Market research

### 3.1 Local competitors (who our customer compares us with)

| Service | Market | Model and price | Notable |
|---|---|---|---|
| **toigo.app** | KG | **Free**, optional donation via MBank/O!Bank/PayPal | ky/ru/bilingual, 18 кыз узатуу templates (Шырдак, Ала-Тоо, Мурас), sealed envelope, no registration, management link |
| **invite.kg** | KG | Paid (tariffs not public) | 7 event types incl. ифтар and ажы той, a "for designers" section, Kyrgyz UI |
| **toichakyru.com** | KG | **990 сом per template**, done-for-you design 2,000 сом | ~124 templates in 9 categories, Google sign-in (this is the owner's own site, so real sales data exists) |
| **toigokel.kg** | KG | Made to order via WhatsApp, price on request | ky/ru, 1–2 days (the owner's first site) |
| Instagram sellers (@toigo.chakyruu.kg etc.) | KG | Paid video invites | **Personal link per guest**: video, then the map opens automatically |
| **toi.com.kz** | KZ | Free to create; publish for 2,990 / 3,990 / 4,990 ₸; **agency plan 10,000 ₸/month** | 12 event categories, 1,200+ hosts, cross-sells a banquet-venue directory |
| **shaqyru24.kz** | KZ | Prices not public | **Personal invite with each guest's name**, guests react to each other's wishes, "child-free" option, reminders |
| **online-shaqyru.kz** | KZ | 9,900 / 17,900 ₸ | беташар, тұсаукесер templates, guest estimates |
| **shaqyru.kz** | KZ | Video invites 800–4,900 ₸; **guest names cost extra** | Video is its own paid product |
| **meyram.online** | KZ | Custom sites from 50,000 ₸ | Premium done-for-you |

**What this tells us:** in KG the self-serve price anchor is **0–990 сом**, so we can't win on "template + RSVP"
alone. People already pay extra for **personal names** and **video**, and agencies pay **monthly**. Nobody offers a
gift ledger, a day-of mode, or an after-event keepsake.

### 3.2 Global products (what "great" looks like)

- **Partiful.** The core (invites, RSVP, text blasts, polls, a shared Photo Roll, an activity feed with reactions,
  collecting money through Venmo/PayPal) is free. Growth is viral: every guest experiences the brand. On
  14 Oct 2026 it launched **Partiful Plus**, a subscription for premium themes, effects and profile personalisation,
  while creating events and RSVPs stay free. *Lesson: monetise looks and extras, never the basic act of inviting.*
- **Apple Invites.** Each invite bundles maps, weather, a **shared photo album** and a playlist; guests need no
  account. *Lesson: the invitation is the hub for the whole event, not just a card.*
- **Greenvelope / Paperless Post.** Paid **per event, priced by guest count** (Greenvelope: $99 for 100 guests,
  $199 for 200), with open tracking and household RSVPs. *Lesson: price scales with guests, and that suits big тои.*
- **Joy / Zola.** Website and RSVP are free; they earn from registry and services. They also offer guest lists,
  seating charts and multi-event support.
- **Posh.** Party ticketing with **Kickback**: attendees get a referral link and earn per ticket sold (about 11% of
  revenue for its top organisers). *Lesson for parties: the guests are the distribution.*
- **POV / Once / GuestCam.** Guests scan a QR at the venue and photos land in a shared album, with no app. Some offer a
  "delayed reveal" after the event. From $4.99 for 25 guests. *Lesson: day-of features are a separate paid product.*

### 3.3 Culture and context (what's unique here)

- **Big guest lists.** A той typically has 200+ guests, and a 300-guest той costs about 1 million сом. A draft law
  proposes caps (250 for a wedding, 100 for кыз узатуу) and fines. If it passes, an accurate headcount stops being
  nice-to-have.
- **Кошумча is a real ledger with real pain.** Guests usually give 2,000–10,000 сом. Hosts keep a **paper notebook of
  who gave how much**, because the gift should be returned at least in kind at the giver's own той. People describe
  it as an interest-free loan network, and some families hold a той partly to "collect back" what they gave.
- **Asking for money on the invitation is taboo.** A Kazakh couple who wrote "from 15,000 ₸ per person" was publicly
  criticised. Any gift feature must be private to the host and never suggest amounts.
- **Respect and hierarchy.** Invitations are often "from the parents". Honorifics (байке, эже, аке, апа) and inviting
  a family by name matter more than design trends.
- **Diaspora.** Many relatives work abroad and can't come. Being able to send a video greeting or a gift remotely is
  meaningful to them (a hypothesis to validate).
- **WhatsApp and 2GIS** are the default channels for both organisers and guests (see our memory note on
  Kyrgyzstan UX).

## 4. Who we serve and what job they hire us for

| Segment | Who | Job to be done | What they'd pay for |
|---|---|---|---|
| **A. Той family** (largest) | Parents or the couple; 150–400 guests; phone and WhatsApp; Kyrgyz or Russian | "Invite everyone respectfully, know who's coming, don't lose track of кошумча" | Personal names, guest list and headcount, Kyrgyz language, gift ledger, done-for-you help |
| **B. Modern couple** | Bishkek, 60–150 guests, Instagram | "Have something beautiful that shows our style and story" | Premium templates, story and photos, video for Instagram/WhatsApp status, after-wedding album |
| **C. Party host** | 18–30; birthdays, club nights | "Create hype, see who's in, get people to actually show up" | Effects and themes, a social "who's going" list, story video, door pass, later tickets |
| **D. Professionals** | Agencies, тамада, designers, restaurants | "Deliver invitations for many clients fast" | Monthly plan, white-label, client management |

Value moments along the event: **before** (a guest opens it and sees their own name; the host sees the headcount
grow), **day of** (the guest finds the venue and table and shares photos), **after** (thank-you, album, ledger).
Today we only cover the first half of "before".

## 5. What to add, remove, refactor and change

### 5.1 Add: priority 1, the core that makes us different

**1. Personal guest invitations.** This revisits the deferred decision from 2026-10-08: research shows competitors
already sell this, and it unlocks items 2, 5, 6 and 7.
- Guest list in the editor: paste a list, add one by one, or (later) pick from phone contacts. Each entry has a
  name, an honorific or family form ("Асан байке жана Гүлнара эже", "Сатыбалдиевдер үй-бүлөсү"), seats allotted,
  a side (жигит/кыз), tags (туугандар, кесиптештер) and an optional phone number.
- Each guest gets their own link (`/i/<slug>/<guest-code>`). The page greets them by name ("Сиздерге 2 орун
  калтырылды"), and the RSVP is pre-filled and **updates the same record**, which also fixes P3.
- **One-tap send per guest** through `wa.me/<phone>?text=…` from the host's own WhatsApp. It's free, personal, and
  avoids the WhatsApp Business API (about $0.02 per utility message in KG, plus template approval).
- Status per guest: not sent / sent / **opened** / answered. Opens are tracked by the link itself.
- A general link still works for "everyone else".

**2. Real guest management** (the "Гости" page becomes the host's control room)
- Headcount by side and tag, "not answered yet" with a one-tap reminder in WhatsApp, household seats, and export
  for the restaurant (and a seating plan later).
- Multiple events in one invitation (кыз узатуу and той, or a wedding and a second day), with each guest invited to
  some of them.
- An optional custom RSVP question (Stage 3 in `next-blocks.md`): menu, children, transport.

**3. WhatsApp-native polish** (small effort, big impact)
- A generated **link-preview image** per invitation (`opengraph-image` with names, date and cover photo via
  `next/og`), plus a description.
- **Kyrgyz guest page**: an i18n layer for every guest-facing string, ready-made Kyrgyz texts, and Kyrgyz date
  formatting.
- A "Watch in 15 seconds" **video of the invitation** for WhatsApp status and Instagram stories. Reuse the template
  video pipeline or the party prototype's in-browser recorder.

**4. Event types as a first-class concept**
- `eventType` (үйлөнүү той, кыз узатуу, бешик той, сүннөт той, тушоо кесүү, юбилей, ифтар, туулган күн, party)
  drives the hero copy ("from the parents", one person vs a couple), default blocks, ready texts and the
  template filter on the home page.
- 2–3 national templates per main type: шырдак and ала-кийиз patterns, кочкор мүйүз ornament, Ала-Тоо, a комуз
  soundtrack. "Этно" proves we can do this at a higher level than competitors.

### 5.2 Add: priority 2, the moat (no one does this)

**5. Той дептер: a private gift ledger.**
- After the той, the host quickly logs gifts against the guest list on a phone ("Асан байке — 5 000"). They see
  totals and can export the list. **Private to the host, never visible to guests, never suggests amounts.**
- Network effect: when that host is later invited through our platform, the invitation shows them privately what
  that family gave them. Every той on the platform strengthens it, which gives a reason to return, retention, and a
  reason to choose us over a free competitor.
- Position it as gratitude ("ыраазычылык тизмеси"), not debt. Validate the wording with real hosts first.

**6. Day-of mode.** On the event day, the same link switches to "Бүгүн": the 2GIS route, table number (if seated),
the current programme item, and a **QR on the tables** that opens a shared photo album with no app.

**7. After the event.** The link becomes a keepsake: "Рахмат" from the hosts, the guests' photos, the video, and
remote greetings from relatives abroad. Guests return to it, which means more brand exposure (see §6).

### 5.3 Add: priority 3, later or experimental

- **Party product inside the same platform.** Fold the `/prototype/party` ideas into the invitation model as a
  "party" event type: a public "who's going" list with reactions, the "Я иду" story share as a viral loop,
  capacity, a door pass with QR check-in, and paid tickets with Posh-style referrals later. Validate demand for
  this separately; it's a different customer (segment C).
- **Professional plan** (segment D): many invitations, client list, white-label. toi.com.kz charges 10,000 ₸/month.
- **Partnerships**: restaurants and тамада include an invitation in their package, and we take a referral cut from
  venue and photographer listings (toi.com.kz cross-sells a venue directory).
- **AI help**: write or rewrite invitation text in Kyrgyz or Russian by tone and event type, and generate
  honorific greetings from a pasted list. Only as a helper inside fields, not as a headline feature.
- **Remote gift** for relatives abroad: an opt-in block with the host's own MBank/ELQR QR, labelled for those who
  can't come. Culturally sensitive, so test it before building.

### 5.4 Remove or simplify
- **Curate the design options.** Once analytics exist, keep the backgrounds, fonts and textures people actually
  use. Move the rest behind a "Дизайнер" mode or into templates only. Fewer options means a faster editor and
  less to maintain.
- **Decide on dead flags.** `SHOW_CHECKLIST`, `SHOW_PREMIUM_ALERT` and `CUSTOM_MUSIC_ENABLED` are all off: ship
  them in the new packaging or delete them.
- **Replace risky assets before charging.** Swap the commercial songs for licensed or royalty-free tracks plus
  **commissioned Kyrgyz instrumentals** (комуз, which is also a differentiator), and buy or replace the pngwing images.
- **Consolidate routes.** `/showcase`, `/admin` and `/prototype` all render invitations in their own way. Keep one
  path once the party ideas merge.

### 5.5 Refactor or change (enablers)
- **Data model**: add `Guest` (invitationId, name, greeting, seats, side, tags, phone, code, openedAt, sentAt) and
  link `Rsvp` to it. Add `eventType` and optionally `events[]` to the invitation format (a minor `SCHEMA_VERSION`
  bump per AGENTS §4.1).
- **i18n for the guest page** (ky/ru): one dictionary per language, with block components reading strings from it.
- **Analytics** (privacy-friendly, e.g. PostHog or Umami): template chosen → editor → first share → first guest
  open → first RSVP → paid. Also track guest opens per invitation.
- **Payments v0**: the host pays by MBank/ELQR QR and the admin activates the package by hand. Integrate acquiring
  later. Banks quote roughly 1.5–4%, and some only accept local cards for the first months.
- **Ops**: Redis rate limit, daily `pg_dump`, a paid Supabase tier or a keep-alive before the first paying couple.

## 6. Business model

**Principle (from Partiful and toi.com.kz):** creating and previewing stay free. Charge when the host needs the
invitation to work for *their guests*. Price by value (personal names, guest count, ledger), not by template.

| Package | Who | Includes | Price idea (validate) |
|---|---|---|---|
| **Бекер** (free) | Everyone | Any basic template, one general link, RSVP, small "Сделано в …" footer | 0 |
| **Той** | Segment A | Personal links for up to 150 guests, Kyrgyz/Russian, no footer, video for status, guest control room | 990–1,490 сом |
| **Чоң той** | Segments A/B | Unlimited guests, multi-event, gift ledger, day-of album, after page, premium templates | 2,490–2,990 сом |
| **Done for you** | Busy families | We fill it in from a WhatsApp message (the toigokel model) | +1,500–2,000 сом |
| **Pro** | Segment D | Many invitations, client list, white-label | Monthly, ~1,500–2,500 сом |

Anchors: toichakyru charges 990 сом and 2,000 сом for custom work, toi.com.kz charges 2,990–4,990 ₸ per invitation
and 10,000 ₸/month for agencies, and Greenvelope prices by guest count. **The owner's toichakyru sales data is the
best evidence we have, so check it before fixing prices.**

**Growth loop:** each invitation is opened by 100–400 people, and in KG most of them will host a той themselves.
After a guest answers, show a quiet "Өз тоюңузга чакыруу түзүңүз" link. The free tier keeps a small footer. The after
page brings guests back once more. Measure guest-to-host conversion as the north-star growth metric.

## 7. Suggested roadmap

| Phase | Scope | Rough size |
|---|---|---|
| **A. Ready to sell** | Link-preview image · fix duplicate RSVPs (remember the answer per device until personal links exist) · analytics funnel · Kyrgyz guest page · `eventType` + copy for 4 main types · 4–6 national templates · start licensing cleanup | 2–3 weeks |
| **B. Personal invitations** | `Guest` model, guest list editor, personal links and greetings, one-tap WhatsApp send, opened/answered status, reminders, headcount by side · packages + QR payment v0 · free-tier footer | 4–6 weeks |
| **C. Moat** | Той дептер · multi-event · day-of mode with QR photo album · after page · video for status | 6–8 weeks |
| **D. Expand** | Party event type (social list, story share, pass) · Pro plan · venue/тамада partnerships · AI text helper | later |

## 8. Validate before building (cheap, about one week)

1. **Talk to 8–10 recent той hosts**, including at least 4 parents, and 4–5 couples. Ask how they collected the
   headcount, what went wrong, how they track кошумча, and whether they'd use a private digital list.
2. **Mine toichakyru and toigokel data**: which event types and templates sell, what people ask for on WhatsApp,
   and what the typical guest count is.
3. **Fake-door test** on the home page: a "Personal invitations for each guest" package with a price. Measure clicks.
4. **Show the ledger concept** (a paper prototype is enough) to 5 hosts. If it reads as "debt tracking" and feels
   shameful, reposition it or drop it.

## 9. Open questions for the owner

- Is this product meant to replace toichakyru.com and toigokel.kg, or to sit above them as the premium line?
- Which segment comes first: той families (volume, Kyrgyz) or modern couples (premium, design)? This document
  recommends families first, with design as the edge.
- Is the party direction a real business bet or an experiment? It needs a different go-to-market (Instagram/TikTok,
  venues, promoters).
- Budget for licensing music and images, and for commissioning Kyrgyz instrumentals?

## Sources

- toigo.app — https://toigo.app/toi/kyz-uzatuu/
- invite.kg — https://invite.kg/
- toichakyru.com — https://toichakyru.com/templates · https://toichakyru.com/pricing
- toigokel.kg — https://toigokel.kg/
- toi.com.kz — https://toi.com.kz/ru/
- shaqyru24.kz — https://shaqyru24.kz/kz/home
- Kazakh services and prices (search results incl. shakyrtu.kz, online-shaqyru.kz, shaqyru.kz/video, meyram.online)
- List of 10 invitation services (the-tech.kz) — https://the-tech.kz/gde-sozdat-elektronnye-priglasitelnye-10-besplatnyh-onlajn-servisov/
- Кошумча (Kloop via finsabat.kg) — https://www.finsabat.kg/media-club/media-club-mass-media/22
- Gift-amount invitation backlash (Tengri Life) — https://tengrinews.kz/curious/skolko-polojit-konvert-kazahstantsev-udivilo-svadebnoe-607765/
- Toy limits and fines in KG/UZ/KZ (BES.media, Sept 2025) — https://bes.media/news/svadba-v-kredit-na-fone-shtrafov-za-pishnie-torzhestva-nuzhno-li-zvat-500-gostey-na-toy/
- Partiful — https://en.wikipedia.org/wiki/Partiful · Partiful Plus — https://finance.yahoo.com/media-advertising/articles/partiful-launches-partiful-plus-subscription-160000098.html
- Apple Invites — https://alternativeto.net/news/2025/2/apple-launches-invites-a-new-event-planning-app-with-management-tools-and-shared-albums/
- Greenvelope comparison (vendor source) — https://www.greenvelope.com/resources/best-digital-wedding-invitation-platforms
- Posh Kickback — https://posh.vip/university/post/a-guide-to-kickback-at-posh
- Guest photo apps — https://pov.camera/blog/the-10-best-wedding-photo-apps · https://lense.app/blog/why-traditional-wedding-disposable-cameras-are-disappearing
- WhatsApp Business pricing — https://developers.facebook.com/docs/whatsapp/pricing · https://docs.sent.dm/docs/guides/whatsapp-pricing
- KG online payments (unofficial estimates) — https://aunimeda.com/kg/blog/integraciya-platezhej-na-sajte-kyrgyzstan-mbank-elcart · https://kgaccount.com/%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%BD%D0%B5%D1%82-%D1%8D%D0%BA%D0%B2%D0%B0%D0%B9%D1%80%D0%B8%D0%BD%D0%B3/
