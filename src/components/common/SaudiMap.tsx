import { useMemo } from "react";
import {
  VIEWBOX,
  BORDER_PATH,
  MAINLAND_PATH,
  CITY_NODES,
  RIYADH,
  citiesThroughStage,
  type CityNode,
} from "@/data/saudiGeo";
import { useReducedMotion, usePageVisible } from "@/lib/hooks";
import { useLang } from "@/i18n";
import "./SaudiMap.css";

type LabelSpec = "none" | "all" | "stage1" | "origin" | string[];

interface SaudiMapProps {
  /** cumulative rollout stage of cities to render (1=5, 2=10, 3=20+) */
  stage?: 1 | 2 | 3;
  /** draw connection arcs from Riyadh to each visible node */
  connections?: "fromRiyadh" | "none";
  /** which city labels to render */
  labels?: LabelSpec;
  /**
   * armed = border/links/nodes start hidden so a parent GSAP scene can reveal
   * them. When false (default) everything is visible (static backdrops +
   * reduced motion).
   */
  armed?: boolean;
  /** low-detail border (mainland only) for low-power renders */
  simple?: boolean;
  /** ambient node pulse on/off */
  pulse?: boolean;
  className?: string;
  ariaLabel?: string;
}

function arc(a: CityNode, b: CityNode) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const off = dist * 0.14;
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = (a.x + b.x) / 2 + nx * off;
  const cy = (a.y + b.y) / 2 + ny * off;
  return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
}

/**
 * Shared, parametric Saudi Arabia map: accurate projected border + the national
 * city network + Riyadh-origin connection arcs. Presentational only — it exposes
 * stable classes / data-attributes (`[data-map-border]`, `.saudimap__node`,
 * `.saudimap__link`, `[data-map-zoom]`) so the owning section animates it via a
 * scoped GSAP scene. Looks complete when rendered statically (reduced motion).
 */
export default function SaudiMap({
  stage = 3,
  connections = "fromRiyadh",
  labels = "stage1",
  armed = false,
  simple = false,
  pulse = true,
  className,
  ariaLabel = "خريطة المملكة العربية السعودية وشبكة المدن",
}: SaudiMapProps) {
  const nodes = useMemo(() => citiesThroughStage(stage), [stage]);
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const isArmed = armed && !reduced;
  // ambient pulse stops on reduced-motion AND when the tab is hidden (CSS
  // @keyframes aren't paused by gsap.globalTimeline.pause()).
  const animate = pulse && !reduced && visible;

  const links = useMemo(() => {
    if (connections === "none") return [];
    return nodes
      .filter((n) => !n.origin)
      .map((n) => ({ id: n.id, d: arc(RIYADH, n) }));
  }, [nodes, connections]);

  const labelSet = useMemo(() => {
    if (labels === "none") return new Set<string>();
    if (labels === "all") return new Set(nodes.map((n) => n.id));
    if (labels === "origin") return new Set([RIYADH.id]);
    if (labels === "stage1")
      return new Set(CITY_NODES.filter((n) => n.stage === 1).map((n) => n.id));
    return new Set(labels);
  }, [labels, nodes]);

  return (
    <div
      className={`saudimap${className ? " " + className : ""}`}
      data-animate={animate ? "true" : "false"}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        className="saudimap__svg"
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sm-border" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--teal-bright)" />
            <stop offset="0.55" stopColor="var(--teal)" />
            <stop offset="1" stopColor="var(--violet-bright)" />
          </linearGradient>
          <linearGradient id="sm-fill" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="rgba(34,72,140,0.34)" />
            <stop offset="1" stopColor="rgba(10,22,52,0.16)" />
          </linearGradient>
          <linearGradient id="sm-link" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(236,197,120,0.85)" />
            <stop offset="0.5" stopColor="rgba(56,224,205,0.6)" />
            <stop offset="1" stopColor="rgba(138,120,240,0.55)" />
          </linearGradient>
          <radialGradient id="sm-glow-teal" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(95,243,226,0.9)" />
            <stop offset="0.4" stopColor="rgba(56,224,205,0.45)" />
            <stop offset="1" stopColor="rgba(56,224,205,0)" />
          </radialGradient>
          <radialGradient id="sm-glow-gold" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(246,217,154,0.95)" />
            <stop offset="0.4" stopColor="rgba(236,197,120,0.5)" />
            <stop offset="1" stopColor="rgba(236,197,120,0)" />
          </radialGradient>
          <radialGradient id="sm-glow-violet" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(169,155,255,0.85)" />
            <stop offset="0.45" stopColor="rgba(138,120,240,0.4)" />
            <stop offset="1" stopColor="rgba(138,120,240,0)" />
          </radialGradient>
          <pattern
            id="sm-grid"
            width="34"
            height="34"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M34 0H0V34"
              fill="none"
              stroke="rgba(120,162,224,0.12)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>

        <g data-map-zoom>
          {/* atmospheric signal field clipped to the country shape */}
          <clipPath id="sm-clip">
            <path d={simple ? MAINLAND_PATH : BORDER_PATH} />
          </clipPath>
          <g className="saudimap__field" clipPath="url(#sm-clip)">
            <rect
              x="0"
              y="0"
              width={VIEWBOX.w}
              height={VIEWBOX.h}
              fill="url(#sm-grid)"
            />
          </g>

          <path
            className="saudimap__fill"
            d={simple ? MAINLAND_PATH : BORDER_PATH}
          />
          <path
            className="saudimap__border"
            data-map-border
            d={simple ? MAINLAND_PATH : BORDER_PATH}
          />

          {/* connection arcs from Riyadh */}
          <g className="saudimap__links">
            {links.map((l) => (
              <path
                key={l.id}
                className={`saudimap__link${isArmed ? " saudimap__link--armed" : ""}`}
                data-link={l.id}
                d={l.d}
              />
            ))}
          </g>

          {/* city nodes */}
          <g className="saudimap__nodes">
            {nodes.map((n) => {
              const glow = n.origin
                ? "url(#sm-glow-gold)"
                : n.stage === 1
                  ? "url(#sm-glow-teal)"
                  : n.stage === 2
                    ? "url(#sm-glow-violet)"
                    : "url(#sm-glow-teal)";
              const haloR = n.origin ? 26 : n.stage === 1 ? 18 : 13;
              const coreR = n.origin ? 4 : n.stage === 1 ? 3 : 2.4;
              return (
                <g
                  key={n.id}
                  className={`saudimap__node${n.origin ? " saudimap__node--origin" : ""}${
                    isArmed ? " saudimap__node--armed" : ""
                  }`}
                  data-node={n.id}
                  data-stage={n.stage}
                >
                  <circle cx={n.x} cy={n.y} r={haloR} fill={glow} opacity={0.7} />
                  <circle
                    className="saudimap__node-pulse"
                    cx={n.x}
                    cy={n.y}
                    r={coreR + 1.5}
                    fill="none"
                    stroke={n.origin ? "var(--gold-bright)" : "var(--teal-bright)"}
                    strokeWidth={1}
                  />
                  <circle
                    className="saudimap__node-core"
                    cx={n.x}
                    cy={n.y}
                    r={coreR}
                  />
                  {n.origin && (
                    <circle
                      className="saudimap__node-ring"
                      cx={n.x}
                      cy={n.y}
                      r={9}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* labels (SVG DOM text) — nudged off-node via labelDx/labelDy so
              dense clusters (e.g. Makkah/Jeddah) never overlap */}
          <g className="saudimap__labels">
            {nodes
              .filter((n) => labelSet.has(n.id))
              .map((n) => (
                <text
                  key={n.id}
                  className={`saudimap__label${n.origin ? " saudimap__label--origin" : ""}${
                    isArmed ? " saudimap__label--armed" : ""
                  }`}
                  data-label={n.id}
                  x={n.x + (n.labelDx ?? 0)}
                  y={n.y + (n.labelDy ?? (n.origin ? -18 : -12))}
                  textAnchor="middle"
                  fontSize={n.origin ? 18 : 13.5}
                  direction={lang === "en" ? "ltr" : "rtl"}
                >
                  {lang === "en" ? n.en : n.ar}
                </text>
              ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
