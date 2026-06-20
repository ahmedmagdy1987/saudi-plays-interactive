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

## How to add a verified logo later

1. Obtain the **official** file from the organization's site or official brand kit
   (prefer SVG; otherwise a high‑resolution transparent PNG). Do not hotlink.
2. Optimize losslessly (e.g. SVGO for SVG) **without** changing geometry or color.
3. Save it under `public/brand/` (e.g. `public/brand/gea.svg`).
4. Reference it with root‑relative paths (`/brand/gea.svg`) and provide localized
   `alt` text. On the dark UI, use the organization's official white/negative
   variant if one exists, otherwise place the original mark inside a clean neutral
   container. **Do not** add glow effects to government logos.
5. Update the table above (organization, filename, source URL, format, "confirmed
   official: ✅", any usage limitation).

## Current decision

No external logo files are bundled in this build because none could be verified to
the required standard. The UI uses verified‑safe **localized text labels** for all
five entities, which is the explicitly permitted fallback.
