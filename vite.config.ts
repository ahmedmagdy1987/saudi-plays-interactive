import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// السعودية تلعب — static SPA build. Single-page cinematic experience, no SSR
// (deliberate: avoids hydration pitfalls, ships a lean client bundle).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "es2019",
    cssTarget: "chrome80",
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ["gsap"],
          smooth: ["lenis"],
        },
      },
    },
  },
});
