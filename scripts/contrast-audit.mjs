// WCAG contrast audit across themes + languages. For each key text selector it
// composites the text colour and its effective background (ancestor background
// colours over the page base) and reports the contrast ratio, flagging anything
// below AA (4.5 normal text, 3.0 large text / UI). Usage: node scripts/contrast-audit.mjs [url]
import { chromium } from "playwright";
const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// selectors to check + minimum ratio (3 = large text ≥24px or bold ≥18.66px / UI)
// reliable text-on-surface checks only. Over-image text (.zcard*, .cj__panel-cap),
// gradient-clipped text (.stat__num) and gradient-bg controls (.langswitch active)
// are verified visually — the ancestor-walk can't read images/gradients.
const CHECKS = [
  [".eyebrow", 4.5], [".heading-xl", 3], [".sec-title", 3], [".lede", 4.5],
  [".mfig__label", 3], [".mfig__sub", 4.5], [".zaud-chip", 4.5],
  [".rev-stream__name", 3], [".rev-stream__desc", 4.5], [".rev-stream__pct", 3],
  [".source-note", 4.5], [".chart-card__title", 3], [".donut-legend__txt", 4.5],
  [".sec-index", 4.5], [".btn", 3], [".chip", 4.5],
];

const AUDIT = (checks) => {
  const lum = (r, g, b) => { const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  const parse = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/i); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map((x) => parseFloat(x)); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
  const over = (fg, bg) => { const a = fg[3]; return [Math.round(fg[0] * a + bg[0] * (1 - a)), Math.round(fg[1] * a + bg[1] * (1 - a)), Math.round(fg[2] * a + bg[2] * (1 - a)), 1]; };
  const rootBg = () => { const c = parse(getComputedStyle(document.body).backgroundColor); return c && c[3] > 0 ? c : (document.documentElement.getAttribute("data-theme") === "light" ? [238, 242, 249, 1] : [4, 8, 20, 1]); };
  const effBg = (el, base) => { const chain = []; let n = el; while (n && n !== document.documentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) chain.unshift(c); n = n.parentElement; } let cur = base; for (const layer of chain) cur = over(layer, cur); return cur; };
  const ratio = (a, b) => { const L1 = lum(a[0], a[1], a[2]), L2 = lum(b[0], b[1], b[2]); const hi = Math.max(L1, L2), lo = Math.min(L1, L2); return (hi + 0.05) / (lo + 0.05); };
  const out = [];
  for (const [sel, min] of checks) {
    const el = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && +cs.opacity > 0.5; });
    if (!el) { out.push({ sel, ratio: null, min, note: "not found/visible" }); continue; }
    const cs = getComputedStyle(el);
    // skip gradient-clipped text — its painted colour can't be read from computed style
    if ((cs.webkitTextFillColor || cs.color) === "rgba(0, 0, 0, 0)" || cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") { out.push({ sel, ratio: null, min, note: "gradient text (visual-only)" }); continue; }
    // elements sitting over a dark image/video (cards, cinematic stage, hero, media)
    // always compose over dark, regardless of theme
    const darkCtx = el.closest(".zcard, .cj__panel, .cj__stage, #intro, .ms-flow");
    const base = darkCtx ? [6, 10, 18, 1] : rootBg();
    const bg = effBg(el.parentElement || el, base);
    let fg = parse(cs.color) || [0, 0, 0, 1];
    if (fg[3] < 1) fg = over(fg, bg);
    const cr = +ratio(fg, bg).toFixed(2);
    out.push({ sel, ratio: cr, min, pass: cr >= min, fg: `${fg[0]},${fg[1]},${fg[2]}`, bg: `${bg[0]},${bg[1]},${bg[2]}` });
  }
  return out;
};

async function run() {
  const browser = await chromium.launch();
  let fails = 0;
  for (const theme of ["dark", "light"]) {
    for (const lang of ["ar", "en"]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      await ctx.addInitScript(({ t, l }) => { try { localStorage.setItem("sp-theme", t); localStorage.setItem("sp-lang", l); } catch {} }, { t: theme, l: lang });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts && document.fonts.ready); await wait(400);
      // bring §05/§08/§10 into DOM-rendered state by scrolling through
      for (const id of ["zones", "revenue", "journey"]) { await page.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id); await wait(250); }
      await page.evaluate(() => window.scrollTo(0, 0)); await wait(200);
      const res = await page.evaluate(AUDIT, CHECKS);
      console.log(`\n===== ${theme} / ${lang} =====`);
      for (const r of res) {
        const mark = r.ratio == null ? "·" : r.pass ? "PASS" : "FAIL";
        if (r.ratio != null && !r.pass) fails++;
        console.log(`  ${mark.padEnd(4)} ${String(r.ratio ?? r.note).padStart(6)} (min ${r.min})  ${r.sel}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\nTOTAL AA failures: ${fails}`);
  if (fails) process.exitCode = 1;
}
run().catch((e) => { console.error(e); process.exit(1); });
