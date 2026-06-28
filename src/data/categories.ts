/* ============================================================================
   Shared semantic category taxonomy (single source of truth).

   The interactive city explorer (§04) classifies every location by one of these
   categories and colours its points/cards/detail accordingly. Colours are drawn
   from the brand accent palette and are visibly DISTINCT in BOTH dark and light
   themes; we NEVER rely on colour alone — a text label + a compact legend always
   accompany the colour (see CityExplorer). The CSS custom properties resolve in
   CityExplorer.css (theme-aware).
   ========================================================================== */
import type { PointCategory } from "@/data/cityJourney";

export interface CategoryMeta {
  ar: string;
  en: string;
  /** theme-aware CSS custom property (resolves light/dark in CityExplorer.css) */
  color: string;
}

export const CATEGORY_META: Record<PointCategory, CategoryMeta> = {
  station: { ar: "محطة", en: "Station", color: "var(--cat-station)" },
  district: { ar: "منطقة", en: "District", color: "var(--cat-district)" },
  neighborhood: { ar: "حي", en: "Neighborhood", color: "var(--cat-neighborhood)" },
  landmark: { ar: "معلم", en: "Landmark", color: "var(--cat-landmark)" },
};

/** stable legend order */
export const CATEGORY_ORDER: PointCategory[] = ["station", "district", "neighborhood", "landmark"];
