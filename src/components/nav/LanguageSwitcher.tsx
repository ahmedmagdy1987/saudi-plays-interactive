import { useContent, useLang } from "@/i18n";
import "./LanguageSwitcher.css";

/**
 * Compact bilingual segmented control. Placed at the top inline-end corner
 * (opposite the section rail in both directions), it switches language without a
 * reload via the i18n provider. Accessible buttons with aria-pressed state.
 */
export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const { ui } = useContent();
  return (
    <div className="langswitch" role="group" aria-label={ui.switchAria}>
      <button
        type="button"
        className="langswitch__btn"
        lang="ar"
        aria-pressed={lang === "ar"}
        onClick={() => setLang("ar")}
      >
        العربية
      </button>
      <button
        type="button"
        className="langswitch__btn"
        lang="en"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
      >
        English
      </button>
    </div>
  );
}
