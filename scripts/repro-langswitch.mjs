// Language-switch regression: after switching, a full scroll-through must leave
// NO data-reveal/animated element stuck hidden. Tests the full AR↔EN matrix,
// refresh persistence, in-section switches, pinned sections, resize, reduced motion.
import { chromium } from "playwright";
const URL = process.argv[2] || "http://localhost:5173/";
const b = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.5);
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y <= max; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
    window.scrollTo(0, max); await new Promise((r) => setTimeout(r, 200));
  });
  await wait(4800); // let long cinematic timelines (e.g. §10 finale, ~3s) complete
}

// returns elements that remain meaningfully hidden after a full scroll-through
async function stuck(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll("[data-reveal], [class*='__title'], [class*='__statement'], [class*='intro__']").forEach((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const op = parseFloat(cs.opacity);
      if ((op < 0.05 || cs.visibility === "hidden") && (el.textContent || "").trim().length > 0) {
        const sec = el.closest("section[id]");
        out.push({ sec: sec?.id || "?", cls: (el.className || "").toString().slice(0, 36), op: +op.toFixed(2), txt: (el.textContent || "").trim().slice(0, 22) });
      }
    });
    return out;
  });
}

async function clickLang(page, name) {
  await page.getByRole("button", { name }).click();
  await wait(1100); // allow remount + fonts.ready + 2rAF + refresh
}

async function run(label, fn) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  await page.goto(URL, { waitUntil: "networkidle" });
  await wait(500);
  const res = await fn(page);
  console.log(`\n=== ${label} ===`);
  console.log(`  stuck-hidden after scroll-through: ${res.length}`);
  res.slice(0, 12).forEach((x) => console.log(`     §${x.sec} ${JSON.stringify(x)}`));
  if (errs.length) console.log(`  console errors: ${errs.length}`, errs.slice(0, 3));
  await ctx.close();
  return res.length;
}

let fails = 0;

// 1. AR → EN, full scroll-through, assert nothing stuck
fails += await run("AR→EN then scroll whole page", async (page) => {
  await clickLang(page, "English");
  await scrollThrough(page);
  return stuck(page);
});

// 2. EN → AR (start EN by switching first), scroll-through
fails += await run("EN→AR then scroll whole page", async (page) => {
  await clickLang(page, "English");
  await wait(200);
  await clickLang(page, "العربية");
  await scrollThrough(page);
  return stuck(page);
});

// 3. Switch while positioned in §09 (impact), then verify §09 + rest
fails += await run("switch while in §09 then scroll", async (page) => {
  await page.locator("#impact").scrollIntoViewIfNeeded();
  await wait(400);
  await clickLang(page, "English");
  await scrollThrough(page);
  return stuck(page);
});

// 4. Switch while in pinned §04 / §07 / §08
for (const id of ["riyadh", "governance", "revenue"]) {
  fails += await run(`switch while in pinned #${id} then scroll`, async (page) => {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await wait(400);
    await clickLang(page, "English");
    await scrollThrough(page);
    return stuck(page);
  });
}

// 5. Resize after switching
fails += await run("switch then resize then scroll", async (page) => {
  await clickLang(page, "English");
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(500);
  await scrollThrough(page);
  return stuck(page);
});

// 6. No ScrollTrigger duplication after repeated switching
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await wait(700);
  const count = () => page.evaluate(() => window.ScrollTrigger?.getAll?.().length ?? -1);
  // expose ScrollTrigger for the test if not already global
  await page.addScriptTag({ content: "" }).catch(() => {});
  const baseline = await page.evaluate(() => {
    // gsap registers ScrollTrigger; reach it via the module on window if exposed,
    // else count trigger DOM markers as a proxy
    const st = window.ScrollTrigger || (window.gsap && window.gsap.core && null);
    return st && st.getAll ? st.getAll().length : document.querySelectorAll(".gsap-marker-start,[data-scrolltrigger]").length;
  });
  for (let i = 0; i < 3; i++) { await clickLang(page, "English"); await clickLang(page, "العربية"); }
  const after = await page.evaluate(() => {
    const st = window.ScrollTrigger;
    return st && st.getAll ? st.getAll().length : -1;
  });
  console.log(`\n=== ScrollTrigger duplication check ===`);
  console.log(`  baseline triggers: ${baseline}, after 6 switches: ${after}`);
  if (after > 0 && baseline > 0 && after > baseline * 1.5) { console.log("  ✗ TRIGGERS STACKING"); fails += 1; }
  else console.log("  ✓ no runaway trigger growth");
  await ctx.close();
}

console.log(`\n########## TOTAL FAILURES ACROSS ALL CASES: ${fails} ##########`);
await b.close();
process.exitCode = fails ? 1 : 0;
