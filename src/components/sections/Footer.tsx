import { useContent } from "@/i18n";
import BrandMark from "@/components/common/BrandMark";
import "./Footer.css";

// Logo-ready mapping for the footer entities (same order as footer.entities:
// GEA · Malahi · Quality of Life Program · Municipalities). `available` flips to
// true ONLY when a verified official file has been added under public/brand/.
// Until then the localized text label is shown (and no file is requested).
// See docs/brand-assets.md.
const ENTITY_LOGOS: { src?: string; available?: boolean }[] = [
  { src: "/brand/gea.svg", available: false },
  {},
  { src: "/brand/qlp.svg", available: false },
  {},
];

/**
 * Footer — composed inside the same centered content grid as the rest of the
 * site. One clear identity (Arabic title + secondary Latin line), a balanced
 * presented-by group, a logo-ready entity row (verified official logos when
 * present, elegant localized text otherwise), a single divider, and one concise
 * centered legal note.
 */
export default function Footer() {
  const { brand, footer, ui } = useContent();
  return (
    <footer className="site-footer" aria-label={ui.footerAria}>
      <div className="container footer__inner">
        <div className="footer__identity">
          <p className="footer__name">{brand.name}</p>
          <p className="footer__latin">{brand.nameLatin}</p>
          <p className="footer__desc">{footer.descriptor}</p>
        </div>

        <div className="footer__org">
          <p className="footer__present">
            <span className="footer__present-label">{footer.presentedByLabel}</span>{" "}
            <strong>{footer.presentedBy}</strong> {footer.collaboration}
          </p>
          <ul className="footer__entities">
            {footer.entities.map((e, i) => (
              <li className="footer__entity" key={e}>
                <BrandMark label={e} src={ENTITY_LOGOS[i]?.src} available={ENTITY_LOGOS[i]?.available} />
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__divider" />
        <p className="footer__legal">{footer.legal}</p>
      </div>
    </footer>
  );
}
