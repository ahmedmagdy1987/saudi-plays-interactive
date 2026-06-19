import { useRef, useState } from "react";
import SectionShell from "@/components/common/SectionShell";
import { Icon, type IconName } from "@/components/common/icons";
import { useContent, useLang } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./Governance.css";

type Pos = { x: number; y: number; r: number; hub?: boolean };
const POS: Record<string, Pos> = {
  gea: { x: 500, y: 80, r: 46, hub: true },
  malahi: { x: 500, y: 250, r: 52, hub: true },
  municipal: { x: 158, y: 250, r: 34 },
  qol: { x: 842, y: 250, r: 34 },
  sponsors: { x: 196, y: 446, r: 32 },
  investors: { x: 398, y: 446, r: 32 },
  strategic: { x: 602, y: 446, r: 32 },
  developers: { x: 804, y: 446, r: 32 },
  beneficiary: { x: 500, y: 626, r: 46, hub: true },
};
const ORDER: Record<string, number> = { regulator: 0, operator: 1, enabler: 2, program: 2, partner: 3, beneficiary: 4 };
const LAYER_OF: Record<string, number> = {
  gea: 0, malahi: 1, municipal: 2, qol: 2,
  sponsors: 3, investors: 3, strategic: 3, developers: 3, beneficiary: 4,
};
const LINKS: [string, string][] = [
  ["gea", "malahi"], ["malahi", "municipal"], ["malahi", "qol"],
  ["malahi", "sponsors"], ["malahi", "investors"], ["malahi", "strategic"], ["malahi", "developers"],
  ["malahi", "beneficiary"], ["sponsors", "beneficiary"], ["investors", "beneficiary"],
  ["strategic", "beneficiary"], ["developers", "beneficiary"],
];
const path = (a: Pos, b: Pos) => {
  const my = (a.y + b.y) / 2;
  return `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
};

/**
 * Section 07 — Governance as an interactive national operating system. The
 * relationship network builds up layer by layer on scroll (regulator → operator
 * → enablers → partners → beneficiary), every node carries a professional icon,
 * and hovering/focusing an entity highlights it and its pathways, dims the rest,
 * and surfaces its role in ONE shared contextual panel.
 */
export default function Governance() {
  const ref = useRef<HTMLElement>(null);
  const { governance } = useContent();
  const { lang } = useLang();
  const [active, setActive] = useState<string | null>(null);
  const activeEntity = governance.entities.find((e) => e.id === active);

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
      const stepLinks = links.filter((l) => Math.max(LAYER_OF[l.dataset.from ?? ""], LAYER_OF[l.dataset.to ?? ""]) === step);
      if (stepNodes.length) tl.to(stepNodes, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.5)" }, step === 0 ? 0 : "+=0.05");
      if (stepLinks.length) tl.to(stepLinks, { strokeDashoffset: 0, duration: 0.6, stagger: 0.05, ease: "power2.out" }, "-=0.3");
    }
    ScrollTrigger.refresh();
  });

  const linkState = (f: string, t: string) =>
    active ? (f === active || t === active ? " is-hot" : " is-dim") : "";
  const nodeState = (id: string) => (active ? (id === active ? " is-hot" : " is-dim") : "");

  return (
    <SectionShell id="governance" index="07" eyebrow={governance.eyebrow} title={governance.title} lede={governance.sub} label={governance.title}>
      <div className="gov__diagram-wrap container">
        <svg className="gov__diagram" viewBox="0 0 1000 720" role="img" aria-label={governance.title}>
          <defs>
            <linearGradient id="g-link" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(56,224,205,0.7)" />
              <stop offset="1" stopColor="rgba(138,120,240,0.6)" />
            </linearGradient>
            <radialGradient id="g-halo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="rgba(56,224,205,0.4)" />
              <stop offset="1" stopColor="rgba(56,224,205,0)" />
            </radialGradient>
            <radialGradient id="g-halo-gold" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="rgba(236,197,120,0.5)" />
              <stop offset="1" stopColor="rgba(236,197,120,0)" />
            </radialGradient>
          </defs>

          <g className="gov-links">
            {LINKS.map(([f, t]) => (
              <path key={`${f}-${t}`} className={`gov-link${linkState(f, t)}`} data-from={f} data-to={t} d={path(POS[f], POS[t])} />
            ))}
          </g>

          {governance.entities.map((e) => {
            const p = POS[e.id];
            if (!p) return null;
            const ly = e.id === "gea" ? p.y - p.r - 12 : p.y + p.r + 22;
            const cls = `gov-node${p.hub ? " gov-node--hub" : ""}${e.layer === "operator" ? " gov-node--operator" : ""}${e.layer === "beneficiary" ? " gov-node--beneficiary" : ""}${nodeState(e.id)}`;
            return (
              <g
                key={e.id}
                className={cls}
                data-id={e.id}
                data-layer={e.layer}
                tabIndex={0}
                role="button"
                aria-label={`${e.ar} — ${e.role}`}
                onMouseEnter={() => setActive(e.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(e.id)}
                onBlur={() => setActive(null)}
              >
                {p.hub && <circle className="gov-halo" cx={p.x} cy={p.y} r={p.r + 20} fill={e.layer === "operator" ? "url(#g-halo-gold)" : "url(#g-halo)"} />}
                <circle className="gov-disc" cx={p.x} cy={p.y} r={p.r} />
                <Icon name={e.icon as IconName} x={p.x - p.r * 0.42} y={p.y - p.r * 0.42} width={p.r * 0.84} height={p.r * 0.84} className="gov-icon" />
                <text className="gov-label" x={p.x} y={ly} textAnchor="middle" fontSize={p.hub ? 17 : 14} direction={lang === "en" ? "ltr" : "rtl"}>
                  {e.ar}
                </text>
                {p.hub && (
                  <text className="gov-role" x={p.x} y={ly + 19} textAnchor="middle" fontSize={12.5} direction={lang === "en" ? "ltr" : "rtl"}>
                    {e.role}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* one shared contextual panel */}
        <div className="gov__detail" aria-live="polite">
          {activeEntity ? (
            <>
              <span className="gov__detail-icon"><Icon name={activeEntity.icon as IconName} size={20} /></span>
              <div>
                <strong>{activeEntity.ar}</strong>
                <span>{activeEntity.role}</span>
              </div>
            </>
          ) : (
            <span className="gov__detail-hint">{governance.detailDefault}</span>
          )}
        </div>
      </div>

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
