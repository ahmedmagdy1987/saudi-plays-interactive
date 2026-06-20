# Brand assets — official logos

This project references several external organizations. Per the project rules, an
official logo is only embedded when the **exact, approved file** can be sourced
from the organization (official site / brand kit / verified official distribution)
and its provenance confirmed. Logos are **never** redrawn, AI‑generated, traced
from screenshots, recolored, or reproportioned.

Where an approved file cannot be confidently verified, the interface keeps an
**elegant localized text label** (Arabic in Arabic mode, English in English mode)
instead of an uncertain mark. This is intentional and is also stated in the
footer legal note.

## Status of each entity

| Organization | Where it appears | Local file | Format | Confirmed official? | Notes / limitation |
|---|---|---|---|---|---|
| الهيئة العامة للترفيه — General Entertainment Authority (GEA) | §07 node + footer | _none_ | — | ❌ Not verified | The official current mark could not be sourced from an authoritative GEA brand kit with verifiable provenance in this build environment. Rendered as a localized text label. |
| برنامج جودة الحياة — Quality of Life Program | §07 node + footer | _none_ | — | ❌ Not verified | No verifiable official logo file obtained. Rendered as a localized text label. |
| رؤية السعودية 2030 — Saudi Vision 2030 | §02 alignment + footer | _none_ | — | ❌ Not verified | A widely‑circulated mark exists, but the exact approved/official file with confirmable provenance was not obtained here. Rendered as a localized text label. |
| ملاهي — Malahi (presenter) | central operator node + footer | _none_ | — | ❌ Not verified | Presenter mark not supplied as an asset; rendered as the localized brand text (the central operating node and footer brand line). |
| Municipal sector — الأمانات والبلديات | §07 node + footer | _none_ | — | ❌ Not verified / no single mark | As the brief notes, there is **no single universal "الأمانات والبلديات" logo**. The responsible entity (e.g. the Ministry of Municipalities and Housing) was **not** assumed or fabricated. Rendered as a localized text label only. |

## Asset-ready integration (already wired)

The UI ships a config-driven, **asset-ready** integration via
`src/components/common/BrandMark.tsx`, used by the footer entity row:

- When a verified file exists, it renders the official logo at its exact
  appearance inside a clean neutral container (so colour/negative artwork reads
  on the dark UI), with a subtle reveal — **no glow on government marks**.
- When no verified file exists, it renders the localized text label and **does
  not request the file** (so there are never any 404s).

To activate a logo (do all of this once you have the verified file):

1. Obtain the **official** file from the organization's site / official brand kit
   (prefer SVG; otherwise high-resolution transparent PNG). Do not hotlink, trace,
   AI-generate, recolor, or reproportion.
2. Optimize losslessly (e.g. SVGO) **without** changing geometry or colour.
3. Save it under `public/brand/` with the matching name: `gea.svg`, `qlp.svg`,
   `vision2030.svg`.
4. In `src/components/sections/Footer.tsx`, flip that entity's `available: true`
   in `ENTITY_LOGOS`. (For Vision 2030 in §02, add a `BrandMark` there similarly.)
5. Update the table above to "confirmed official: ✅" with the source URL.

## Files found locally but NOT used (and why)

While looking for the owner's "official transparent logos", the only local
candidates discovered were **not** usable under these rules and were deliberately
rejected:

- A GEA image named like `png-transparent-general-authority-for-entertainment-…-thumbnail.png`
  — this is a low-resolution **aggregator/clip-art thumbnail** (unverifiable
  provenance), which the rules forbid.
- Several `Gemini_Generated_Image_*.png` files — **AI-generated**, explicitly
  forbidden for logos.

No verified official files were present in the repo or attached to the request, so
the verified-safe **localized text labels** remain in place. Drop the genuine
official files into `public/brand/` (names above) and flip `available: true` to
light them up — the integration is already built and waiting.
