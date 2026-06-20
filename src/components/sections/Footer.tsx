import { useContent, useLang } from "@/i18n";
import BrandMark from "@/components/common/BrandMark";
import "./Footer.css";

/**
 * Footer — composed inside the same centered content grid as the rest of the
 * site. One clear identity (Arabic title + secondary Latin line), a balanced
 * presented-by group, the official partner logos (shown exactly as supplied in
 * clean neutral containers) with the localized entity names kept as supporting
 * text, a single divider, and one concise centered legal note.
 */
export default function Footer() {
  const { brand, footer, ui } = useContent();
  const { lang } = useLang();
  // verified official partner marks (files in public/brand/). Shown exactly as
  // supplied; contrast per artwork (GEA/QLP are white-on-transparent → dark band;
  // Vision 2030 is dark artwork → a small neutral backing). Localized alt text.
  const partnerLogos = [
    { id: "gea", src: "/brand/gea.png", contrast: "dark" as const, label: lang === "en" ? "General Entertainment Authority" : "الهيئة العامة للترفيه" },
    { id: "vision2030", src: "/brand/vision2030.png", contrast: "light" as const, label: lang === "en" ? "Saudi Vision 2030" : "رؤية السعودية 2030" },
    { id: "qlp", src: "/brand/qlp.png", contrast: "dark" as const, label: lang === "en" ? "Quality of Life Program" : "برنامج جودة الحياة" },
  ];
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
          {/* official strategic-partner marks, shown exactly as supplied */}
          <div className="footer__logos">
            {partnerLogos.map((l) => (
              <BrandMark key={l.id} label={l.label} src={l.src} contrast={l.contrast} available />
            ))}
          </div>
          {/* full localized entity names kept as supporting text */}
          <ul className="footer__entities">
            {footer.entities.map((e) => (
              <li className="footer__entity" key={e}>
                <BrandMark label={e} />
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
