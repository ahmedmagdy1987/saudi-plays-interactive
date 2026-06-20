import { forwardRef, type ReactNode } from "react";

interface SectionShellProps {
  id: string;
  index: string;
  eyebrow?: ReactNode;
  eyebrowVariant?: "teal" | "violet" | "gold";
  title?: ReactNode;
  lede?: ReactNode;
  /** aria label for the section landmark */
  label?: string;
  className?: string;
  /** The ONLY two allowed header alignments (see global.css .sec-header):
   *  - "inline-start": aligned to the content column's inline-start edge
   *  - "center": centered over the full section content container */
  headerAlign?: "inline-start" | "center";
  children?: ReactNode;
}

/**
 * Shared section landmark + heading block. Keeps the 10 sections visually
 * consistent (eyebrow → index → heading → lede) and semantically correct
 * (each is a <section> with an accessible name and an <h2>).
 *
 * Forwards a ref to the <section> so the owning component's `useGsapScene`
 * scope is actually attached — without this the scene's ScrollTriggers are
 * never created (the scene early-returns on a null scope).
 */
const SectionShell = forwardRef<HTMLElement, SectionShellProps>(function SectionShell(
  { id, index, eyebrow, eyebrowVariant = "teal", title, lede, label, className, headerAlign = "inline-start", children },
  ref,
) {
  return (
    <section
      ref={ref}
      id={id}
      data-section={index}
      aria-label={label}
      className={`section section--${id}${className ? " " + className : ""}`}
    >
      {(eyebrow || title || lede) && (
        <div className="container sec-header" data-align={headerAlign} data-reveal>
          {eyebrow && (
            <p className={`eyebrow eyebrow--${eyebrowVariant}`}>
              <span className="sec-index">{index}</span>
              {eyebrow}
            </p>
          )}
          {title && <h2 className="heading-xl sec-title">{title}</h2>}
          {lede && <p className="lede sec-lede">{lede}</p>}
        </div>
      )}
      {children}
    </section>
  );
});

export default SectionShell;
