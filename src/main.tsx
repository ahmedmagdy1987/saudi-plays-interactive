import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self-hosted, licensed (OFL) fonts — Arabic-first with a Latin companion.
import "@fontsource/ibm-plex-sans-arabic/300.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";

import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App";
import { I18nProvider } from "./i18n";

// Arm the blank-page watchdog now that the bundle has loaded (so slow networks
// don't trip it). The early guard in index.html reveals all content if the app
// never confirms a live motion frame. App calls window.__spMotionOK() on success.
window.__spArm?.();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
