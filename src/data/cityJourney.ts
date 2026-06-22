/* ============================================================================
   City Deep-Dive Journey — data-driven hierarchy
   Saudi map → city → multiple internal points → image for each point.

   This is the single source of truth for the §10 cinematic city journey. It is
   intentionally pure data so the experience scales by EDITING THIS FILE ONLY —
   add a city, add a point, or swap a point's media without touching component code.

   Coordinate systems
   - `map`  : a city's position in the Saudi-map SVG userspace (VIEWBOX 1000×845).
              Reuse the canonical values from src/data/saudiGeo.ts CITY_NODES so the
              Level-1 zoom lands exactly on the real node.
   - `local`: a point's position inside its city scene, as PERCENTAGES (0–100) of
              the city plane. Independent of the Saudi map; this is the Level-2 space.

   Temporary media
   - Final per-point imagery is not yet in the repo. Each point below reuses an
     existing APPROVED cinematic still (Higgsfield workflow) as a tasteful
     placeholder and is flagged `temp: true`. Replace `image` with the final asset
     (and drop `temp`) to ship final media — no code changes required.
   ========================================================================== */

export type Lang = "ar" | "en";
export interface Bi { ar: string; en: string }

export type PointCategory = "station" | "neighborhood" | "district" | "landmark";

export interface JourneyPoint {
  id: string;
  name: Bi;
  category: PointCategory;
  /** position inside the city scene, % of the city plane (0–100) */
  local: { x: number; y: number };
  /** media path under /public (lazy-loaded) */
  image: string;
  /** true = temporary placeholder asset (swap for final media later) */
  temp?: boolean;
  desc?: Bi;
}

export interface JourneyCity {
  id: string;
  name: Bi;
  tagline?: Bi;
  /** Saudi-map SVG coordinates (VIEWBOX 1000×845) — from saudiGeo CITY_NODES */
  map: { x: number; y: number };
  /** how far Level-1 zooms toward this city (SVG scale factor) */
  zoom: number;
  points: JourneyPoint[];
}

export interface CityJourneyData {
  header: { eyebrow: Bi; title: Bi; lede: Bi };
  ui: {
    /** small chip shown on a temporary image */
    temp: Bi;
    overview: Bi;
    pointOf: Bi; // "{i} / {n}" label prefix, e.g. "Point" / "موقع"
    categories: Record<PointCategory, Bi>;
    hintScroll: Bi;
    /** primary entry control that starts the auto-showcase */
    startExperience: Bi;
    /** shown while the auto-showcase is running (any input takes control back) */
    showcaseHint: Bi;
  };
  cities: JourneyCity[];
}

const S = (f: string) => `/media/sections/${f}`;

export const cityJourney: CityJourneyData = {
  header: {
    eyebrow: { ar: "رحلة داخل المدن", en: "Inside the cities" },
    title: {
      ar: "من خريطة المملكة إلى كل موقع داخل المدينة",
      en: "From the Kingdom map down to every site inside the city",
    },
    lede: {
      ar: "نقترب من المملكة إلى المدينة، ثم ندخل إلى مواقعها المحلية موقعاً تلو الآخر — من محطات مترو الرياض إلى واجهات جدة والدمام — قبل أن نعود لنكمل المدينة التالية.",
      en: "We zoom from the Kingdom into a city, then travel its local sites one by one — from Riyadh's metro stations to the waterfronts of Jeddah and Dammam — before pulling back to the next city.",
    },
  },
  ui: {
    temp: { ar: "صورة مؤقتة", en: "Placeholder" },
    overview: { ar: "خريطة المملكة", en: "Kingdom overview" },
    pointOf: { ar: "الموقع", en: "Point" },
    categories: {
      station: { ar: "محطة", en: "Station" },
      neighborhood: { ar: "حي", en: "Neighborhood" },
      district: { ar: "منطقة", en: "District" },
      landmark: { ar: "معلم", en: "Landmark" },
    },
    hintScroll: { ar: "مرّر للمتابعة", en: "Scroll to travel" },
    startExperience: { ar: "ابدأ الاستعراض", en: "Start the Experience" },
    showcaseHint: { ar: "مرّر في أي وقت للتحكم في الرحلة", en: "Scroll anytime to take control" },
  },
  cities: [
    {
      id: "riyadh",
      name: { ar: "الرياض", en: "Riyadh" },
      tagline: { ar: "العاصمة — مواقع متعددة على خط المترو", en: "The capital — multiple sites along the metro" },
      map: { x: 564.15, y: 401.11 },
      zoom: 3.4,
      points: [
        {
          id: "kafd",
          name: { ar: "محطة المركز المالي", en: "KAFD Station" },
          category: "station",
          local: { x: 26, y: 30 },
          image: S("s02-vision.webp"),
          temp: true,
          desc: { ar: "قلب الأعمال — وجهة ترفيه نهارية ومسائية.", en: "The business core — a day-to-night entertainment destination." },
        },
        {
          id: "olaya",
          name: { ar: "محطة العليا", en: "Olaya Station" },
          category: "station",
          local: { x: 47, y: 44 },
          image: S("s03-market.webp"),
          temp: true,
          desc: { ar: "ممرّ التسوق والترفيه الأكثر حركة في الرياض.", en: "Riyadh's busiest shopping and entertainment spine." },
        },
        {
          id: "qasr",
          name: { ar: "محطة قصر الحكم", en: "Qasr Al-Hokm Station" },
          category: "station",
          local: { x: 66, y: 60 },
          image: S("s04-expansion.webp"),
          temp: true,
          desc: { ar: "الرياض التاريخية — ساحات وفعاليات في الهواء الطلق.", en: "Historic Riyadh — open-air plazas and live events." },
        },
        {
          id: "front",
          name: { ar: "محطة واجهة الرياض", en: "Riyadh Front Station" },
          category: "station",
          local: { x: 78, y: 30 },
          image: S("s05-entertainment.webp"),
          temp: true,
          desc: { ar: "وجهة مطاعم وفعاليات قرب المطار.", en: "A dining and events destination near the airport." },
        },
      ],
    },
    {
      id: "jeddah",
      name: { ar: "جدة", en: "Jeddah" },
      tagline: { ar: "عروس البحر الأحمر", en: "The Red Sea gateway" },
      map: { x: 253.8, y: 547.93 },
      zoom: 3.6,
      points: [
        {
          id: "corniche",
          name: { ar: "كورنيش جدة", en: "Jeddah Corniche" },
          category: "landmark",
          local: { x: 30, y: 38 },
          image: S("s06-energy.webp"),
          temp: true,
          desc: { ar: "واجهة بحرية ممتدة للعائلات والفعاليات.", en: "A sweeping waterfront for families and events." },
        },
        {
          id: "balad",
          name: { ar: "البلد التاريخية", en: "Historic Al-Balad" },
          category: "district",
          local: { x: 56, y: 56 },
          image: S("s07-governance.webp"),
          temp: true,
          desc: { ar: "حي تراثي على قائمة اليونسكو ينبض بالحياة ليلاً.", en: "A UNESCO heritage district that comes alive after dark." },
        },
        {
          id: "season",
          name: { ar: "واجهة موسم جدة", en: "Jeddah Season Waterfront" },
          category: "landmark",
          local: { x: 72, y: 32 },
          image: S("s08-revenue.webp"),
          temp: true,
          desc: { ar: "مسرح مواسم الترفيه الكبرى على البحر.", en: "The stage for the city's flagship seasonal festivals." },
        },
      ],
    },
    {
      id: "dammam",
      name: { ar: "الدمام", en: "Dammam" },
      tagline: { ar: "وجهة الشرق على الخليج", en: "The Eastern gateway on the Gulf" },
      map: { x: 705.72, y: 323.45 },
      zoom: 3.6,
      points: [
        {
          id: "corniche",
          name: { ar: "كورنيش الدمام", en: "Dammam Corniche" },
          category: "landmark",
          local: { x: 34, y: 42 },
          image: S("s09-impact.webp"),
          temp: true,
          desc: { ar: "واجهة الخليج بحدائقها وممشاها.", en: "The Gulf waterfront with its parks and promenade." },
        },
        {
          id: "ajdan",
          name: { ar: "أجدان ووك", en: "Ajdan Walk" },
          category: "neighborhood",
          local: { x: 64, y: 58 },
          image: S("s10-finale.webp"),
          temp: true,
          desc: { ar: "وجهة عصرية للمطاعم والترفيه على الواجهة.", en: "A modern waterfront dining and leisure destination." },
        },
      ],
    },
  ],
};

/** Flat scene list driving the scroll journey (pure function of the data). */
export type Scene =
  | { kind: "overview" }
  | { kind: "city"; cityIndex: number }
  | { kind: "point"; cityIndex: number; pointIndex: number };

export function buildScenes(data: CityJourneyData): Scene[] {
  const scenes: Scene[] = [{ kind: "overview" }];
  data.cities.forEach((c, ci) => {
    scenes.push({ kind: "city", cityIndex: ci });
    c.points.forEach((_, pi) => scenes.push({ kind: "point", cityIndex: ci, pointIndex: pi }));
  });
  scenes.push({ kind: "overview" });
  return scenes;
}
