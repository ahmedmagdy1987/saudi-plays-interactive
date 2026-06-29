/* ============================================================================
   §02 Visual Explorer — category-driven data (single source of truth).

   Top-level CATEGORIES (scrolled between) each own a small set of ITEMS (swapped
   in place via the mini thumbnails). Pure data so categories/items/images can be
   added or swapped without touching the component. Imagery is currently TEMPORARY
   (reuses the approved cinematic section stills) — drop the final per-location
   photos into `image` (and add Parks / Health / … categories) with no code change.
   ========================================================================== */
export interface Bi { ar: string; en: string }

export interface ExplorerItem {
  id: string;
  name: Bi;
  /** concise descriptor under the title */
  tag: Bi;
  desc?: Bi;
  /** media path under /public */
  image: string;
  /** object-position for the full-bleed crop (keeps the subject framed) */
  focus?: string;
}

export interface ExplorerCategory {
  id: string;
  name: Bi;
  /** short line shown with the category title */
  kicker: Bi;
  /** theme-aware accent CSS custom property (resolved in VisualExplorer.css) */
  accent: string;
  items: ExplorerItem[];
}

const S = (f: string) => `/media/sections/${f}`;

export const EXPLORER: ExplorerCategory[] = [
  {
    id: "metro",
    name: { ar: "محطات المترو", en: "Metro Stations" },
    kicker: { ar: "ترفيه على خط الحركة", en: "Entertainment along the line" },
    accent: "var(--cat-metro)",
    items: [
      { id: "kafd", name: { ar: "محطة المركز المالي", en: "KAFD Station" }, tag: { ar: "الرياض · محطة", en: "Riyadh · Station" }, desc: { ar: "قلب الأعمال — وجهة ترفيه نهارية ومسائية.", en: "The business core — a day-to-night entertainment destination." }, image: S("s02-vision.webp") },
      { id: "olaya", name: { ar: "محطة العليا", en: "Olaya Station" }, tag: { ar: "الرياض · محطة", en: "Riyadh · Station" }, desc: { ar: "ممرّ التسوق والترفيه الأكثر حركة في الرياض.", en: "Riyadh's busiest shopping and entertainment spine." }, image: S("s03-market.webp") },
      { id: "qasr", name: { ar: "محطة قصر الحكم", en: "Qasr Al-Hokm Station" }, tag: { ar: "الرياض · محطة", en: "Riyadh · Station" }, desc: { ar: "الرياض التاريخية — ساحات وفعاليات في الهواء الطلق.", en: "Historic Riyadh — open-air plazas and live events." }, image: S("s04-expansion.webp") },
      { id: "front", name: { ar: "محطة واجهة الرياض", en: "Riyadh Front Station" }, tag: { ar: "الرياض · محطة", en: "Riyadh · Station" }, desc: { ar: "وجهة مطاعم وفعاليات قرب المطار.", en: "A dining and events destination near the airport." }, image: S("s05-entertainment.webp") },
    ],
  },
  {
    id: "waterfronts",
    name: { ar: "واجهات بحرية", en: "Waterfronts" },
    kicker: { ar: "الحياة على البحر", en: "Life along the sea" },
    accent: "var(--cat-water)",
    items: [
      { id: "jeddah-corniche", name: { ar: "كورنيش جدة", en: "Jeddah Corniche" }, tag: { ar: "جدة · معلم", en: "Jeddah · Landmark" }, desc: { ar: "واجهة بحرية ممتدة للعائلات والفعاليات.", en: "A sweeping waterfront for families and events." }, image: S("s06-energy.webp") },
      { id: "dammam-corniche", name: { ar: "كورنيش الدمام", en: "Dammam Corniche" }, tag: { ar: "الدمام · معلم", en: "Dammam · Landmark" }, desc: { ar: "واجهة الخليج بحدائقها وممشاها.", en: "The Gulf waterfront with its parks and promenade." }, image: S("s09-impact.webp") },
      { id: "ajdan", name: { ar: "أجدان ووك", en: "Ajdan Walk" }, tag: { ar: "الدمام · واجهة", en: "Dammam · Front" }, desc: { ar: "وجهة عصرية للمطاعم والترفيه على الواجهة.", en: "A modern waterfront dining and leisure destination." }, image: S("s10-finale.webp") },
    ],
  },
  {
    id: "heritage",
    name: { ar: "أحياء ومعالم", en: "Districts & Landmarks" },
    kicker: { ar: "تراث ينبض ليلاً", en: "Heritage alive after dark" },
    accent: "var(--cat-heritage)",
    items: [
      { id: "balad", name: { ar: "البلد التاريخية", en: "Historic Al-Balad" }, tag: { ar: "جدة · منطقة", en: "Jeddah · District" }, desc: { ar: "حي تراثي على قائمة اليونسكو ينبض بالحياة ليلاً.", en: "A UNESCO heritage district that comes alive after dark." }, image: S("s07-governance.webp") },
      { id: "season", name: { ar: "واجهة موسم جدة", en: "Jeddah Season Waterfront" }, tag: { ar: "جدة · معلم", en: "Jeddah · Landmark" }, desc: { ar: "مسرح مواسم الترفيه الكبرى على البحر.", en: "The stage for the city's flagship seasonal festivals." }, image: S("s08-revenue.webp") },
    ],
  },
];
