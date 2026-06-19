import { brand, footer } from "@/data/projectContent";
import "./Footer.css";

/**
 * Approved-entities footer. Entities are rendered as respectful TEXT labels in
 * clearly-marked placeholder containers — no official logo is ever fabricated;
 * supplied logo files would drop in here when available.
 */
export default function Footer() {
  return (
    <footer className="site-footer" aria-label="تذييل الصفحة">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <p className="footer__name">
              {brand.name}
              <span className="latin">{brand.nameLatin}</span>
            </p>
            <p className="footer__tag">{brand.tagline}</p>
            <p className="footer__present">
              {footer.presentedBy} — {footer.collaboration}
            </p>
          </div>
          <div>
            <p className="footer__entities-label">الجهات</p>
            <ul className="footer__entities">
              {footer.entities.map((e) => (
                <li className="footer__entity" key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__divider" />

        <div className="footer__bottom">
          <p className="footer__note">{footer.logoNote}</p>
          <p className="footer__rights">{footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
