import { useEffect, useState } from "react";
import { useLang } from "@/i18n";
import "./ThemeToggle.css";

type Theme = "dark" | "light";
const read = (): Theme =>
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

/**
 * Theme SWITCHER — a segmented pill (Light | Dark) that mirrors the language switcher,
 * not a floating round icon. The initial theme is set before paint by the bootstrap
 * script in index.html (saved choice → OS preference → dark), so there is no flash; this
 * control sets + persists it. Two real <button>s with aria-pressed on the active theme,
 * descriptive aria-labels, and visible focus rings. Sun = light, moon = dark.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(read);
  const { lang } = useLang();
  const en = lang === "en";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("sp-theme", theme); } catch { /* ignore */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#eef2f9" : "#040a1a");
  }, [theme]);

  const lightLabel = en ? "Light mode" : "الوضع الفاتح";
  const darkLabel = en ? "Dark mode" : "الوضع الداكن";

  return (
    <div className="themeswitch" role="group" aria-label={en ? "Theme" : "السمة"}>
      <button
        type="button"
        className="themeswitch__btn"
        aria-pressed={theme === "light"}
        aria-label={lightLabel}
        title={lightLabel}
        onClick={() => setTheme("light")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.1" fill="currentColor" stroke="none" />
          <path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.1 5.1l1.5 1.5M17.4 17.4 18.9 18.9M18.9 5.1l-1.5 1.5M6.6 17.4 5.1 18.9" />
        </svg>
      </button>
      <button
        type="button"
        className="themeswitch__btn"
        aria-pressed={theme === "dark"}
        aria-label={darkLabel}
        title={darkLabel}
        onClick={() => setTheme("dark")}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
