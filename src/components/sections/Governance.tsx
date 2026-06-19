import { useRef } from "react";
import SectionShell from "@/components/common/SectionShell";
import { Icon } from "@/components/common/icons";
import { useContent } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./Governance.css";

type Pos = { x: number; y: number; r: number; hub?: boolean };
const POS: Record<string, Pos> = {
  gea: { x: 500, y: 78, r: 42, hub: true },
  malahi: { x: 500, y: 240, r: 48, hub: true },
  municipal: { x: 168, y: 240, r: 30 },
  qol: { x: 832, y: 240, r: 30 },
  sponsors: { x: 200, y: 432, r: 27 },
  investors: { x: 400, y: 432, r: 27 },
  strategic: { x: 600, y: 432, r: 27 },
  developers: { x: 800, y: 432, r: 27 },
  beneficiary: { x: 500, y: 612, r: 42, hub: true },
};
const ORDER: Record<string, number> = { regulator: 0, operator: 1, enabler: 2, program: 2, partner: 3, beneficiary: 4 };
const LINKS: [string, string][] = [
  ["gea", "malahi"],
  ["malahi", "municipal"],
  ["malahi", "qol"],
  ["malahi", "sponsors"],
  ["malahi", "investors"],
  ["malahi", "strategic"],
  ["malahi", "developers"],
  ["malahi", "beneficiary"],
  ["sponsors", "beneficiary"],
  ["investors", "beneficiary"],
  ["strategic", "beneficiary"],
  ["developers", "beneficiary"],
];

// layer for any entity id (mirrors the content's entity layers)
const LAYER_OF: Record<string, number> = {
  gea: 0, malahi: 1, municipal: 2, qol: 2,
  sponsors: 3, investors: 3, strategic: 3, developers: 3, beneficiary: 4,
};
const path = (a: Pos, b: Pos) => {
  const my = (a.y + b.y) / 2;
  return `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
};

/**
 * Section 07 — Governance & operating model. A relationship network that builds
 * up layer by layer as it enters view: regulator (GEA) → operator (Malahi) →
 * municipalities & Quality-of-Life program → sponsors/investors/partners/
 * developers → the beneficiary & community. Alignment pillars shown below.
 */
export default function Governance() {
  const ref = useRef<HTMLElement>(null);
  const { governance } = useContent();

  useGsapScene(ref, ({ gsap, reduced, ScrollTrigger }) => {
    const links = gsap.utils.toArray<SVGPathElement>(".gov-link");
    links.forEach((l) => {
      const len = l.getTotalLength?.() ?? 300;
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
    });
    if (reduced) return;

    const nodes = gsap.utils.toArray<SVGGElement>(".gov-node");
    gsap.set(nodes, { opacity: 0, scale: 0.4, transformBox: "fill-box", transformOrigin: "center" });

    const tl = gsap.timeline({ scrollTrigger: { trigger: ".gov__diagram", start: "top 72%", toggleActions: "play none none none" } });
    for (let step = 0; step <= 4; step++) {
      const stepNodes = nodes.filter((n) => ORDER[n.dataset.layer ?? "partner"] === step);
      const stepLinks = links.filter((l) => {
        const f = l.dataset.from ?? "";
        const t = l.dataset.to ?? "";
        return Math.max(LAYER_OF[f], LAYER_OF[t]) === step;
      });
      if (stepNodes.length)
        tl.to(stepNodes, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.5)" }, step === 0 ? 0 : "+=0.05");
      if (stepLinks.length)
        tl.to(stepLinks, { strokeDashoffset: 0, duration: 0.6, stagger: 0.05, ease: "power2.out" }, "-=0.3");
    }
    ScrollTrigger.refresh();
  });

  return (
    <SectionShell id="governance" index="07" eyebrow={governance.eyebrow} title={governance.title} lede={governance.sub} label={governance.title}>
      <div className="gov__diagram-wrap container">
        <svg className="gov__diagram" viewBox="0 0 1000 700" role="img" aria-label={governance.title}>
          <defs>
            <linearGradient id="g-link" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(56,224,205,0.65)" />
              <stop offset="1" stopColor="rgba(138,120,240,0.55)" />
            </linearGradient>
            <radialGradient id="g-halo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="rgba(56,224,205,0.4)" />
              <stop offset="1" stopColor="rgba(56,224,205,0)" />
            </radialGradient>
          </defs>

          {LINKS.map(([f, t]) => (
            <path key={`${f}-${t}`} className="gov-link" data-from={f} data-to={t} d={path(POS[f], POS[t])} />
          ))}

          {governance.entities.map((e) => {
            const p = POS[e.id];
            if (!p) return null;
            const below = e.id !== "gea";
            const ly = below ? p.y + p.r + 22 : p.y - p.r - 12;
            return (
              <g
                key={e.id}
                className={`gov-node${p.hub ? " gov-node--hub" : ""}${e.layer === "operator" ? " gov-node--operator" : ""}${e.layer === "beneficiary" ? " gov-node--beneficiary" : ""}`}
                data-id={e.id}
                data-layer={e.layer}
              >
                {p.hub && <circle className="gov-halo" cx={p.x} cy={p.y} r={p.r + 18} fill="url(#g-halo)" />}
                <circle className="gov-disc" cx={p.x} cy={p.y} r={p.r} />
                <text className="gov-label" x={p.x} y={ly} textAnchor="middle" fontSize={p.hub ? 17 : 14} direction="rtl">
                  {e.ar}
                </text>
                {p.hub && (
                  <text className="gov-role" x={p.x} y={ly + 19} textAnchor="middle" fontSize={12.5} direction="rtl">
                    {e.role}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* readable entity legend — surfaces the network as text where the dense
          diagram labels would shrink on small screens */}
      <ul className="gov__legend container" aria-label={governance.title}>
        {governance.entities.map((e) => (
          <li className="gov__legend-item" key={e.id}>
            <strong>{e.ar}</strong>
            <span>{e.role}</span>
          </li>
        ))}
      </ul>

      <div className="gov__align container" data-reveal>
        <span className="gov__align-label">{governance.alignmentLabel}</span>
        {governance.alignment.map((a) => (
          <span className="chip" key={a.id}>
            <Icon name="spark" size={14} /> {a.ar}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}
