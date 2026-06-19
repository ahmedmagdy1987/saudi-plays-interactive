import type { ReactNode } from "react";

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
  headerAlign?: "start" | "center";
  children?: ReactNode;
}

/**
 * Shared section landmark + heading block. Keeps the 10 sections visually
 * consistent (eyebrow → index → heading → lede) and semantically correct
 * (each is a <section> with an accessible name and an <h2>).
 */
export default function SectionShell({
  id,
  index,
  eyebrow,
  eyebrowVariant = "teal",
  title,
  lede,
  label,
  className,
  headerAlign = "start",
  children,
}: SectionShellProps) {
  return (
    <section
      id={id}
      data-section={index}
      aria-label={label}
      className={`section section--${id}${className ? " " + className : ""}`}
    >
      {(eyebrow || title || lede) && (
        <div
          className="container sec-header"
          data-align={headerAlign}
          data-reveal
        >
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
}
