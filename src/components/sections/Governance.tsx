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
// Data-driven connector: a straight segment that BEGINS on the source node's
// circumference and ENDS on the target's, both points found by walking out from
// each centre along the shared centre-to-centre vector (plus a small gap). So
// every line approaches each node along its true radial direction and never
// terminates above/below/beside it — recomputed from the geometry, no hand-
// tuned paths, correct at any responsive scale.
const EDGE_GAP = 5;
const edgePoints = (a: Pos, b: Pos) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  return {
    ax: a.x + ux * (a.r + EDGE_GAP), ay: a.y + uy * (a.r + EDGE_GAP),
    bx: b.x - ux * (b.r + EDGE_GAP), by: b.y - uy * (b.r + EDGE_GAP),
  };
};
const path = (a: Pos, b: Pos) => {
  const { ax, ay, bx, by } = edgePoints(a, b);
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`;
};

// ---- semantic graph model (data-driven, not a hand-listed "nearby nodes") ----
// Every entity hubs through `malahi`; `gea` regulates malahi; the partners and
// malahi itself deliver to the `beneficiary`. From this we compute, for any
// hovered node, its COMPLETE meaningful route: up through its hub to the
// regulator, and down the delivery path to the final beneficiary.
const PARENT: Record<string, string> = {
  malahi: "gea",
  municipal: "malahi", qol: "malahi",
  sponsors: "malahi", investors: "malahi", strategic: "malahi", developers: "malahi",
};
const ek = (a: string, b: string) => [a, b].sort().join("~");
const ALL_NODES = Object.keys(POS);
function routeFor(id: string): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  const add = (a: string, b: string) => { nodes.add(a); nodes.add(b); edges.add(ek(a, b)); };
  if (id === "beneficiary") {                 // show the entire incoming ecosystem
    ALL_NODES.forEach((n) => nodes.add(n));
    LINKS.forEach(([f, t]) => edges.add(ek(f, t)));
    return { nodes, edges };
  }
  if (id === "malahi") {                       // all direct incoming + outgoing
    nodes.add("malahi");
    LINKS.forEach(([f, t]) => { if (f === "malahi" || t === "malahi") add(f, t); });
    return { nodes, edges };
  }
  nodes.add(id);
  // upstream: walk parents to the regulator (gea)
  let cur = id;
  while (PARENT[cur]) { add(cur, PARENT[cur]); cur = PARENT[cur]; }
  if (id === "gea") add("gea", "malahi"); // regulator's primary route starts at the operator
  // downstream: the operator always carries delivery to the beneficiary
  add("malahi", "beneficiary");
  // a direct deliverer also lights its own edge to the beneficiary
  if (LINKS.some(([f, t]) => (f === id && t === "beneficiary") || (t === id && f === "beneficiary"))) add(id, "beneficiary");
  return { nodes, edges };
}

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

  useGsapScene(ref, ({ gsap, reduced }) => {
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
  });

  // the active node's full route through the operating tree (graph traversal)
  const route = active ? routeFor(active) : null;
  const linkState = (f: string, t: string) =>
    route ? (route.edges.has(ek(f, t)) ? " is-hot" : " is-dim") : "";
  // the hovered node is brightest; every other node ON the route stays lit; the
  // rest dim. So Malahi, the regulator and the beneficiary all respond together.
  const nodeState = (id: string) =>
    route ? (id === active ? " is-hot" : route.nodes.has(id) ? " is-near" : " is-dim") : "";

  return (
    <SectionShell ref={ref} id="governance" index="07" eyebrow={governance.eyebrow} title={governance.title} lede={governance.sub} label={governance.title}>
      <div className="gov__diagram-wrap container">
        {/* viewBox extended above gea (for its two stacked labels) and below the
            beneficiary so neither set of labels is clipped or overlaps a circle */}
        <svg className="gov__diagram" viewBox="0 -18 1000 756" role="img" aria-label={governance.title}>
          <defs>
            {/* userSpaceOnUse so HORIZONTAL links (zero-height bbox) don't get a
                degenerate objectBoundingBox gradient and vanish — spans the whole
                720u diagram so every connector, any orientation, is painted. */}
            <linearGradient id="g-link" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="500" y2="720">
              <stop offset="0" stopColor="rgba(56,224,205,0.75)" />
              <stop offset="1" stopColor="rgba(138,120,240,0.65)" />
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
            // gea is the TOP node: BOTH its lines sit fully above the circle
            // (entity name on top, role just above the circle). Every other node
            // labels below.
            const isTop = e.id === "gea";
            const ly = isTop ? p.y - p.r - 26 : p.y + p.r + 22;
            const roleY = isTop ? p.y - p.r - 8 : ly + 19;
            const cls = `gov-node${p.hub ? " gov-node--hub" : ""}${e.layer === "operator" ? " gov-node--operator" : ""}${e.layer === "beneficiary" ? " gov-node--beneficiary" : ""}${nodeState(e.id)}`;
            return (
              <g
                key={e.id}
                className={cls}
                data-id={e.id}
                data-layer={e.layer}
                tabIndex={0}
                role="img"
                aria-label={`${e.ar}: ${e.role}`}
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
                  <text className="gov-role" x={p.x} y={roleY} textAnchor="middle" fontSize={12.5} direction={lang === "en" ? "ltr" : "rtl"}>
                    {e.role}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* shared contextual panel — OUTSIDE the diagram, in normal flow below it,
          so it can never overlay the beneficiary node, its label or the chips */}
      <div className="gov__detail container" aria-live="polite">
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
