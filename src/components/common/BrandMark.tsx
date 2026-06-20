import "./BrandMark.css";

export interface BrandSpec {
  /** localized accessible label / text fallback */
  label: string;
  /** root-relative path to a VERIFIED official logo (e.g. "/brand/gea.svg") */
  src?: string;
  /** only true once a verified official file has actually been added; while
   *  false the file is NOT requested (so there is never a 404) and the elegant
   *  localized text label is shown instead — the explicitly permitted fallback. */
  available?: boolean;
}

/**
 * Renders a partner/entity mark. When a VERIFIED official logo file is present
 * (available + src), it is shown at its exact appearance inside a clean neutral
 * container (so any colour/negative artwork reads on the dark UI) with a subtle
 * reveal. Otherwise the localized text label is shown — no fabricated or
 * AI/traced logos, and no network request for a missing file. See
 * docs/brand-assets.md.
 */
export default function BrandMark({ label, src, available }: BrandSpec) {
  if (available && src) {
    return (
      <span className="brandmark brandmark--logo" data-reveal>
        <img className="brandmark__img" src={src} alt={label} loading="lazy" decoding="async" />
      </span>
    );
  }
  return <span className="brandmark brandmark--text">{label}</span>;
}
