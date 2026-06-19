// Build-time geometry generator for "السعودية تلعب".
// Reads an accurate Natural Earth 50m Saudi outline and projects the border +
// the canonical city network into a fixed SVG coordinate space, so the runtime
// ships a tiny precomputed module with NO network fetch and NO heavy GeoJSON.
//
// Output: src/data/saudiGeo.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const geoPath = join(root, "_geo", "SAU.50m.geo.json");
const fallbackPath = join(root, "_geo", "SAU.geo.json");
const outPath = join(root, "src", "data", "saudiGeo.ts");

const src = existsSync(geoPath) ? geoPath : fallbackPath;
const feature = JSON.parse(readFileSync(src, "utf8"));
const geom = feature.geometry ?? feature.features?.[0]?.geometry;
const polygons =
  geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];

// Canonical city network. Coordinates [lon, lat]. `stage` mirrors the rollout
// data in projectContent.ts (1=2026 five cities, 2=2027 ten cumulative,
// 3=2028 twenty-plus). `origin` flags Riyadh, the proven pilot.
const CITIES = [
  { id: "riyadh", ar: "الرياض", en: "Riyadh", lon: 46.6753, lat: 24.7136, stage: 1, origin: true },
  { id: "jeddah", ar: "جدة", en: "Jeddah", lon: 39.1925, lat: 21.4858, stage: 1 },
  { id: "dammam", ar: "الدمام", en: "Dammam", lon: 50.0888, lat: 26.4207, stage: 1 },
  { id: "mecca", ar: "مكة المكرمة", en: "Makkah", lon: 39.8579, lat: 21.3891, stage: 1 },
  { id: "medina", ar: "المدينة المنورة", en: "Madinah", lon: 39.5692, lat: 24.5247, stage: 1 },
  { id: "taif", ar: "الطائف", en: "Taif", lon: 40.4158, lat: 21.2703, stage: 2 },
  { id: "abha", ar: "أبها", en: "Abha", lon: 42.5117, lat: 18.2465, stage: 2 },
  { id: "tabuk", ar: "تبوك", en: "Tabuk", lon: 36.555, lat: 28.3838, stage: 2 },
  { id: "buraidah", ar: "بريدة", en: "Buraidah", lon: 43.975, lat: 26.326, stage: 2 },
  { id: "khobar", ar: "الخبر", en: "Khobar", lon: 50.2083, lat: 26.2794, stage: 2 },
  { id: "hail", ar: "حائل", en: "Hail", lon: 41.69, lat: 27.5114, stage: 3 },
  { id: "jubail", ar: "الجبيل", en: "Jubail", lon: 49.6583, lat: 27.0046, stage: 3 },
  { id: "yanbu", ar: "ينبع", en: "Yanbu", lon: 38.0618, lat: 24.089, stage: 3 },
  { id: "najran", ar: "نجران", en: "Najran", lon: 44.1277, lat: 17.4924, stage: 3 },
  { id: "jazan", ar: "جازان", en: "Jazan", lon: 42.5706, lat: 16.8894, stage: 3 },
  { id: "alula", ar: "العلا", en: "AlUla", lon: 37.9216, lat: 26.6087, stage: 3 },
  { id: "albaha", ar: "الباحة", en: "Al Bahah", lon: 41.4677, lat: 20.0129, stage: 3 },
  { id: "sakaka", ar: "سكاكا", en: "Sakaka", lon: 40.2064, lat: 29.9697, stage: 3 },
  { id: "arar", ar: "عرعر", en: "Arar", lon: 41.0231, lat: 30.9753, stage: 3 },
  { id: "hofuf", ar: "الأحساء", en: "Al Ahsa", lon: 49.5876, lat: 25.3833, stage: 3 },
  { id: "neom", ar: "نيوم", en: "NEOM", lon: 35.2, lat: 28.0, stage: 3 },
];

// ---- projection ------------------------------------------------------------
// Pass 1: latitude bounds to pick an equal-area-ish horizontal correction.
let latMin = Infinity,
  latMax = -Infinity;
for (const poly of polygons)
  for (const ring of poly)
    for (const [, lat] of ring) {
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
    }
const midLat = (latMin + latMax) / 2;
const cosMid = Math.cos((midLat * Math.PI) / 180);
const raw = (lon, lat) => [lon * cosMid, lat];

// Pass 2: projected bounds over the border.
let minX = Infinity,
  maxX = -Infinity,
  minY = Infinity,
  maxY = -Infinity;
for (const poly of polygons)
  for (const ring of poly)
    for (const [lon, lat] of ring) {
      const [x, y] = raw(lon, lat);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

const W = 1000;
const PAD = 64;
const scale = (W - 2 * PAD) / (maxX - minX);
const H = Math.round((maxY - minY) * scale + 2 * PAD);
const r2 = (n) => Math.round(n * 100) / 100;
const project = (lon, lat) => {
  const [x, y] = raw(lon, lat);
  return [r2((x - minX) * scale + PAD), r2((maxY - y) * scale + PAD)];
};

// Border path. Largest ring per polygon is the mainland/island body; smaller
// rings are holes (rare for SAU) — we still draw them for fidelity.
const subpaths = [];
for (const poly of polygons) {
  for (const ring of poly) {
    if (ring.length < 4) continue;
    let d = "";
    ring.forEach(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      d += (i === 0 ? "M" : "L") + x + " " + y + " ";
    });
    subpaths.push(d.trim() + " Z");
  }
}
// Sort by length so the mainland (longest) is first — useful for layered draws.
subpaths.sort((a, b) => b.length - a.length);
const borderPath = subpaths.join(" ");
const mainlandPath = subpaths[0];

const nodes = CITIES.map((c) => {
  const [x, y] = project(c.lon, c.lat);
  return { ...c, x, y };
});
const riyadh = nodes.find((n) => n.origin);

// Approximate total border perimeter in user units (for SVG stroke-draw timing).
let perim = 0;
for (const poly of polygons)
  for (const ring of poly) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = project(ring[i - 1][0], ring[i - 1][1]);
      const [bx, by] = project(ring[i][0], ring[i][1]);
      perim += Math.hypot(bx - ax, by - ay);
    }
  }

const header = `// AUTO-GENERATED by scripts/genGeo.mjs — do not edit by hand.
// Source: Natural Earth 50m admin-0 (Saudi Arabia), projected to a ${W}x${H} viewBox.
// Regenerate with: npm run gengeo
`;

const body = `${header}
export interface CityNode {
  id: string;
  ar: string;
  en: string;
  lon: number;
  lat: number;
  /** rollout stage: 1 = 2026 (5 cities), 2 = 2027 (10), 3 = 2028 (20+). */
  stage: 1 | 2 | 3;
  origin?: boolean;
  /** projected SVG coordinates within VIEWBOX. */
  x: number;
  y: number;
}

export const VIEWBOX = { w: ${W}, h: ${H} } as const;

/** Full accurate Saudi border (mainland + Red Sea / Gulf islands). */
export const BORDER_PATH = ${JSON.stringify(borderPath)};

/** Largest single ring (mainland body) — for fast/low-power renders. */
export const MAINLAND_PATH = ${JSON.stringify(mainlandPath)};

/** Approximate border perimeter in viewBox units (stroke-draw timing). */
export const BORDER_LENGTH = ${Math.round(perim)};

export const CITY_NODES: CityNode[] = ${JSON.stringify(nodes, null, 2)};

export const RIYADH: CityNode = ${JSON.stringify(riyadh, null, 2)};

export const NODE_BY_ID: Record<string, CityNode> = Object.fromEntries(
  CITY_NODES.map((n) => [n.id, n]),
);

/** Cities present once a given rollout stage is reached (cumulative). */
export function citiesThroughStage(stage: 1 | 2 | 3): CityNode[] {
  return CITY_NODES.filter((n) => n.stage <= stage);
}
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, body);
console.log(
  `genGeo: wrote ${outPath}\n  viewBox ${W}x${H}, ${nodes.length} nodes, ${subpaths.length} subpaths, border ~${Math.round(
    perim,
  )}u`,
);
