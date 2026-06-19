import { brand, footer } from "@/data/projectContent";
import "./Footer.css";

/**
 * Government-grade footer. One clear project title with the English name as a
 * distinct secondary line (never overlapping the Arabic). Entities are evenly
 * spaced TEXT labels — no fabricated logos, no dashed "unfinished" placeholders.
 */
export default function Footer() {
  return (
    <footer className="site-footer" aria-label="تذييل الصفحة">
      <div className="container footer__grid">
        <div className="footer__brand">
          <p className="footer__name">{brand.name}</p>
          <p className="footer__latin">{brand.nameLatin}</p>
          <p className="footer__tag">{brand.tagline}</p>
        </div>

        <div className="footer__org">
          <p className="footer__col-label">تقدّمها</p>
          <p className="footer__present">
            <strong>{footer.presentedBy}</strong> · {footer.collaboration}
          </p>
          <ul className="footer__entities">
            {footer.entities.map((e) => (
              <li className="footer__entity" key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__bottom">
        <p className="footer__rights">{footer.rights}</p>
        <p className="footer__note">{footer.logoNote}</p>
      </div>
    </footer>
  );
}
