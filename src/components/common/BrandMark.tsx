import "./BrandMark.css";

export interface BrandSpec {
  /** localized accessible label / text fallback */
  label: string;
  /** root-relative path to a VERIFIED official logo (e.g. "/brand/gea.png") */
  src?: string;
  /** only true once a verified official file exists (otherwise no request, no 404) */
  available?: boolean;
  /**
   * Per-logo contrast handling against the dark UI:
   *  - "dark" (default): the artwork is WHITE / light (designed for dark
   *    backgrounds) → shown transparently, directly on the dark partner band.
   *  - "light": the artwork is DARK (designed for light backgrounds) → given the
   *    smallest possible subtle neutral backing, for that one logo only.
   */
  contrast?: "dark" | "light";
}

/**
 * Renders an official partner mark at its exact appearance (object-fit: contain,
 * never cropped/recolored/stretched, no glow/border/shadow). White-on-transparent
 * marks sit directly on the dark band; only a genuinely dark mark gets a small
 * neutral backing. Falls back to the localized text label when no verified file
 * exists. See docs/brand-assets.md.
 */
export default function BrandMark({ label, src, available, contrast = "dark" }: BrandSpec) {
  if (available && src) {
    return (
      <span className={`brandmark brandmark--logo brandmark--${contrast}`}>
        <img className="brandmark__img" src={src} alt={label} loading="lazy" decoding="async" />
      </span>
    );
  }
  return <span className="brandmark brandmark--text">{label}</span>;
}
