# Content Map — 20 presentation pages → 10 website sections

The source deck (`Gea-.pdf`, 20 image-heavy slides) is condensed into one
scroll-driven narrative of **exactly 10 sections**. The page→section mapping
below reflects the proposal's logical structure and the normalized data that is
the source of truth. Several slides collapse into a single coherent section so
the result reads as a continuous story, not a slide-by-slide port.

| Deck page(s) | Topic | → Website section | Component |
|---|---|---|---|
| 1 | Cover / title | 01 Opening | `IntroHero` |
| 2 | Riyadh Plays proof counters (+100K / +200 / +50) | 01 Opening (pilot counters) | `IntroHero` |
| 3 | National ambition / "why now" | 02 National vision | `NationalVision` |
| 4 | Four converging forces (2030, sector, tourism, demand) | 02 National vision | `NationalVision` |
| 5 | Market size & youth (32M, 63%, 12M+) | 03 Market opportunity | `MarketOpportunity` |
| 6 | Domestic demand trend / youth split | 03 Market opportunity | `MarketOpportunity` |
| 7 | Riyadh Plays case study (safe family operation) | 04 Riyadh → Kingdom | `RiyadhToSaudi` |
| 8 | National rollout 2024→2028 (5/10/20+) | 04 Riyadh → Kingdom | `RiyadhToSaudi` |
| 9 | Concept core + audiences/categories | 05 Experience zones | `ExperienceZones` |
| 10 | Five experience zones | 05 Experience zones | `ExperienceZones` |
| 11 | Malahi operating pillars + proof | 06 Malahi OS & tech | `MalahiOperating` |
| 12 | Technology platform (RPay, remote, analytics…) | 06 Malahi OS & tech | `MalahiOperating` |
| 13 | Operations dashboard (demonstrative) | 06 Malahi OS & tech | `MalahiOperating` |
| 14 | Governance & operating model (GEA / Malahi / municipalities) | 07 Governance | `Governance` |
| 15 | Partners, investors, developers, alignment | 07 Governance | `Governance` |
| 16 | Revenue mix (30/25/15/12/10/8) | 08 Revenue model | `RevenueEcosystem` |
| 17 | National KPI targets | 09 KPIs & impact | `ImpactDashboard` |
| 18 | 3-year cumulative impact + categories | 09 KPIs & impact | `ImpactDashboard` |
| 19 | Why Malahi (5 strengths) | 10 Finale | `Finale` |
| 20 | Closing / national platform statement | 10 Finale + footer | `Finale` / `Footer` |

> Note: the deck is image-only (no extractable text in this environment), so
> per-page topics are inferred from the proposal logic and the normalized data
> brief. The **data** is authoritative regardless of slide pagination.

## Encoded content decisions
1. **Canonical name** «السعودية تلعب» used everywhere (`brand.name`).
2. **Riyadh case study is visually separated** from national targets — pilot
   badge + disclaimer in §01/§04; national targets carry "المستهدف" in §09.
3. **5 → 10 → 20+ is cumulative** — explicit note in §04
   (`riyadhToSaudi.cumulativeNote`).
4. **Market figures are internal estimates** — note
   "مؤشرات تقديرية — تجميع داخلي ملاهي 2026" in §03 (`SOURCE_NOTE_ESTIMATE`).
5. **Dashboard numbers are demonstrative** — "نموذج توضيحي للوحة العمليات" + disclaimer
   in §06 (`malahi.dashboard.label` / `.disclaimer`).
6. **Pilot date is centralized** — `riyadhToSaudi.timeline` in
   `src/data/projectContent.ts`; change once, updates everywhere.
7. **Revenue totals 100%** — `revenue.streams` pcts sum to 100; the ring uses the
   exact values with no rounding.
