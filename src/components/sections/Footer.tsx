import { useContent } from "@/i18n";
import "./Footer.css";

/**
 * Footer — composed inside the same centered content grid as the rest of the
 * site. One clear identity (Arabic title + secondary Latin line), a balanced
 * presented-by group with text entity labels (no fabricated logos, no dashed
 * placeholders), a single divider, and one concise centered legal note.
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
            {footer.entities.map((e) => (
              <li className="footer__entity" key={e}>{e}</li>
            ))}
          </ul>
        </div>

        <div className="footer__divider" />
        <p className="footer__legal">{footer.legal}</p>
      </div>
    </footer>
  );
}
