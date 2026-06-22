import { useEffect, useState } from "react";
import { useContent } from "@/i18n";
import "./ThemeToggle.css";

type Theme = "dark" | "light";
const read = (): Theme =>
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

/**
 * Accessible dark/light theme control. The initial theme is set before paint by the
 * bootstrap script in index.html (saved choice → OS preference → dark), so there is
 * no flash of the wrong theme; this control toggles + persists it. It is a real
 * <button> (Enter/Space work) with an aria-pressed state describing "light mode on",
 * a descriptive aria-label, and a visible focus ring.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(read);
  const { ui } = useContent();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("sp-theme", theme); } catch { /* ignore */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#eef2f9" : "#040a1a");
  }, [theme]);

  const toLight = theme === "dark";
  const label = toLight ? ui.themeToLight : ui.themeToDark;
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(toLight ? "light" : "dark")}
      aria-label={label}
      aria-pressed={theme === "light"}
      title={label}
    >
      {toLight ? (
        // moon (currently dark → switch to light)
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" fill="currentColor" />
        </svg>
      ) : (
        // sun (currently light → switch to dark)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
        </svg>
      )}
    </button>
  );
}
