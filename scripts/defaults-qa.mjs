/**
 * Default-state QA — proves a fresh visitor gets Arabic + RTL + Dark, that the OS
 * prefers-color-scheme can NOT override the product default, that explicit saved
 * preferences persist, and that corrupted/unavailable storage falls back safely.
 *
 * Tests the ACTUAL FIRST RENDERED FRAME: the index.html bootstrap sets <html data-theme>
 * + lang/dir synchronously in <head> before <body> paints, so we read those attributes
 * (and sample the rendered background colour) immediately, not just post-load React state.
 *
 * Usage: node scripts/defaults-qa.mjs [url]
 */
import { chromium } from "playwright";

const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// read the first-paint truth: html attributes (set by the head bootstrap) + the actual
// computed background luminance of <html>/<body> (dark vs light), + any page error.
async function firstFrame(ctx) {
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  // domcontentloaded: the synchronous <head> bootstrap has already run + set the theme,
  // before the bundle/React; this IS the first-frame state.
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  const early = await p.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    lang: document.documentElement.lang,
    dir: document.documentElement.dir || document.documentElement.getAttribute("dir"),
  }));
  // confirm the rendered background is actually dark/light (not just the attribute).
  // Sample the .ms fixed media base, which carries a SOLID theme colour (#02060f dark /
  // var(--abyss) light) — the body itself uses a transparent/gradient background.
  await wait(600);
  const bgDark = await p.evaluate(() => {
    const el = document.querySelector(".ms") || document.body;
    const c = getComputedStyle(el).backgroundColor;
    const m = c.match(/\d+/g);
    if (!m || (m[3] !== undefined && +m[3] === 0)) return null; // transparent → inconclusive
    const lum = 0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2];
    return lum < 90; // dark if luminance low
  });
  const lang = await p.evaluate(() => document.documentElement.lang);
  const dir = await p.evaluate(() => document.documentElement.dir);
  const theme = await p.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await p.close();
  return { early, lang, dir, theme, bgDark, errors };
}

async function run() {
  const browser = await chromium.launch();
  const fails = [];
  const ok = (label, cond, got) => { console.log(`  ${cond ? "OK  " : "FAIL"} ${label}${cond ? "" : "  got: " + JSON.stringify(got)}`); if (!cond) fails.push(label); };

  // 1) EMPTY storage, OS prefers LIGHT → must still be Arabic + RTL + Dark
  {
    console.log("[1] empty storage + OS prefers-color-scheme: light");
    const ctx = await browser.newContext({ colorScheme: "light" });
    const r = await firstFrame(ctx);
    ok("first-frame theme=dark (OS light ignored)", r.early.theme === "dark", r.early);
    ok("first-frame lang=ar", r.early.lang === "ar", r.early);
    ok("first-frame dir=rtl", r.early.dir === "rtl", r.early);
    ok("rendered background is dark", r.bgDark === true, r.bgDark);
    ok("no page error", r.errors.length === 0, r.errors);
    await ctx.close();
  }
  // 2) CORRUPTED storage → Arabic + Dark
  {
    console.log("[2] corrupted storage (sp-theme='glow', sp-lang='zz')");
    const ctx = await browser.newContext({ colorScheme: "light" });
    await ctx.addInitScript(() => { try { localStorage.setItem("sp-theme", "glow"); localStorage.setItem("sp-lang", "zz"); } catch {} });
    const r = await firstFrame(ctx);
    ok("theme=dark", r.early.theme === "dark", r.early);
    ok("lang=ar", r.lang === "ar", r);
    ok("dir=rtl", r.dir === "rtl", r);
    ok("no page error", r.errors.length === 0, r.errors);
    await ctx.close();
  }
  // 3) SAVED English + Light → English + LTR + Light (persisted choice respected)
  {
    console.log("[3] saved sp-theme='light' sp-lang='en'");
    const ctx = await browser.newContext({ colorScheme: "dark" });
    await ctx.addInitScript(() => { try { localStorage.setItem("sp-theme", "light"); localStorage.setItem("sp-lang", "en"); } catch {} });
    const r = await firstFrame(ctx);
    ok("first-frame theme=light (explicit kept, OS dark ignored)", r.early.theme === "light", r.early);
    ok("lang=en", r.lang === "en", r);
    ok("dir=ltr", r.dir === "ltr", r);
    ok("rendered background is light", r.bgDark === false, r.bgDark);
    await ctx.close();
  }
  // 4) SAVED Arabic + Dark → Arabic + Dark
  {
    console.log("[4] saved sp-theme='dark' sp-lang='ar'");
    const ctx = await browser.newContext({ colorScheme: "light" });
    await ctx.addInitScript(() => { try { localStorage.setItem("sp-theme", "dark"); localStorage.setItem("sp-lang", "ar"); } catch {} });
    const r = await firstFrame(ctx);
    ok("theme=dark", r.early.theme === "dark", r.early);
    ok("lang=ar", r.lang === "ar", r);
    ok("dir=rtl", r.dir === "rtl", r);
    await ctx.close();
  }
  // 5) Storage UNAVAILABLE (getItem throws — private mode / restricted webview) → ar+dark, no crash
  {
    console.log("[5] localStorage throws (private/restricted)");
    const ctx = await browser.newContext({ colorScheme: "light" });
    await ctx.addInitScript(() => {
      const thrower = () => { throw new Error("storage blocked"); };
      try { Object.defineProperty(window, "localStorage", { configurable: true, get() { return { getItem: thrower, setItem: thrower, removeItem: thrower }; } }); } catch {}
    });
    const r = await firstFrame(ctx);
    ok("theme=dark (catch → dark)", r.early.theme === "dark", r.early);
    ok("lang=ar (initialLang catch → ar)", r.lang === "ar", r);
    ok("dir=rtl", r.dir === "rtl", r);
    ok("no page error / no crash", r.errors.length === 0, r.errors);
    await ctx.close();
  }

  await browser.close();
  console.log(`\nDEFAULTS QA: ${fails.length ? fails.length + " FAILURE(S): " + fails.join("; ") : "PASS — fresh = Arabic+RTL+Dark; OS-light ignored; explicit prefs persist; corrupt/unavailable → ar+dark"}`);
  process.exit(fails.length ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });
