/**
 * CTA bidi assertion — proves the §10 "Start the Experience" button carries the
 * correct LOGICAL-order Arabic in the real DOM (not disguised by CSS/dir/bidi).
 *
 * Asserts, codepoint-exact, that the Arabic button's:
 *   - DOM textContent
 *   - accessible name (accessibility tree)
 *   - clipboard round-trip (navigator.clipboard write→read)
 * all equal exactly  ابدأ الاستعراض  (U+0627 U+0628 U+062F U+0623 …),
 * and the English button equals "Start the Experience".
 *
 * Usage: node scripts/cta-bidi-qa.mjs [http://localhost:4173/]
 */
import { chromium } from "playwright";

const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cps = (s) => [...s].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");

// reference built from explicit code points — zero ordering ambiguity
const AR = String.fromCodePoint(0x627, 0x628, 0x62f, 0x623, 0x20, 0x627, 0x644, 0x627, 0x633, 0x62a, 0x639, 0x631, 0x627, 0x636);
const EN = "Start the Experience";

async function reachCta(p) {
  const jTop = await p.evaluate(() => document.getElementById("journey").getBoundingClientRect().top + scrollY);
  for (let i = 0; i < 800; i++) {
    const y = await p.evaluate(() => scrollY);
    if (Math.abs(y - jTop) < 130) break;
    await p.mouse.wheel(0, y < jTop ? 440 : -340);
    await wait(14);
  }
  for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 120); await wait(80); }
  await wait(500);
  return p.$(".cj__start");
}

async function run() {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const fails = [];
  for (const [lang, expected] of [["ar", AR], ["en", EN]]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    await ctx.addInitScript((l) => { try { localStorage.setItem("sp-lang", l); localStorage.setItem("sp-theme", "dark"); } catch { /* noop */ } }, lang);
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: "networkidle" });
    await wait(500);
    const btn = await reachCta(p);
    if (!btn) { fails.push(`[${lang}] CTA button not found`); await ctx.close(); continue; }

    const textContent = (await btn.evaluate((b) => b.textContent || "")).trim();
    // accessible name via Playwright's ARIA name computation: if a button with this
    // exact accessible name resolves to our element, the a11y name equals `expected`.
    const byName = p.getByRole("button", { name: expected, exact: true });
    const accNameMatches = (await byName.count()) > 0 && (await byName.first().evaluate((el) => el.className).catch(() => "")).includes("cj__start");
    const accName = accNameMatches ? expected : `(no button with accessible name ${JSON.stringify(expected)})`;
    const clip = (await p.evaluate(async (b) => {
      await navigator.clipboard.writeText(b.textContent.trim());
      return await navigator.clipboard.readText();
    }, btn)).trim();

    const check = (label, got) => {
      const ok = got === expected;
      console.log(`[${lang}] ${label.padEnd(12)} ${ok ? "OK " : "FAIL"}  ${JSON.stringify(got)}`);
      if (!ok) { console.log(`        got cps: ${cps(got)}`); console.log(`        exp cps: ${cps(expected)}`); fails.push(`[${lang}] ${label} mismatch`); }
    };
    check("textContent", textContent);
    check("accessibleName", accName);
    check("clipboard", clip);
    await ctx.close();
  }
  await browser.close();
  if (fails.length) { console.log(`\nCTA BIDI QA: ${fails.length} FAILURE(S)`); process.exit(1); }
  console.log("\nCTA BIDI QA: PASS — Arabic CTA is logical-order ابدأ الاستعراض in textContent, a11y name, and clipboard");
}
run().catch((e) => { console.error(e); process.exit(1); });
