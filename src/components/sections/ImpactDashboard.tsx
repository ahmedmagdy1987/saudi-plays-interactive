import SectionShell from "@/components/common/SectionShell";
import CountUp from "@/components/common/CountUp";
import { Icon, type IconName } from "@/components/common/icons";
import { useContent } from "@/i18n";
import "./ImpactDashboard.css";

/**
 * Section 09 — KPIs & national impact. National targets and three-year
 * cumulative goals (count-up), then five impact categories. Everything is
 * explicitly framed as a target / projected impact — never as achieved.
 */
export default function ImpactDashboard() {
  const { impact } = useContent();
  return (
    <SectionShell id="impact" index="10" eyebrow={impact.eyebrow} title={impact.title} lede={impact.sub} label={impact.title}>
      <div className="container">
        <div className="imp__sub-head" data-reveal>
          <h3>{impact.targetsTitle}</h3>
          <span className="badge-target"><span className="dot" /> {impact.targetLabel}</span>
        </div>
        <div className="imp__targets">
          {impact.targets.map((t) => (
            <article className="imp-target" key={t.label} data-reveal>
              <CountUp className="stat__num" value={t.value} prefix={t.prefix} suffix={t.suffix} decimals={t.decimals} display={t.display} />
              <span className="imp-target__label">{t.label}</span>
              {t.sub && <span className="imp-target__sub">{t.sub}</span>}
            </article>
          ))}
        </div>

        <div className="imp__sub-head" data-reveal>
          <h3>{impact.cumulativeTitle}</h3>
          <span className="badge-target"><span className="dot" /> {impact.horizonLabel}</span>
        </div>
        <div className="imp__cumulative">
          {impact.cumulative3y.map((c) => (
            <article className="imp-cum" key={c.label} data-reveal>
              <CountUp className="stat__num" value={c.value} prefix={c.prefix} suffix={c.suffix} display={c.display} />
              <span className="imp-cum__label">{c.label}</span>
            </article>
          ))}
        </div>

        <div className="imp__sub-head" data-reveal>
          <h3>{impact.categoriesTitle}</h3>
          <span className="badge-target"><span className="dot" /> {impact.projectedLabel}</span>
        </div>
        <div className="imp__cats">
          {impact.categories.map((c) => (
            <article className="imp-cat" key={c.id} data-reveal>
              <span className="imp-cat__icon"><Icon name={c.icon as IconName} size={20} /></span>
              <h4 className="imp-cat__ar">{c.ar}</h4>
              <p className="imp-cat__desc">{c.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
