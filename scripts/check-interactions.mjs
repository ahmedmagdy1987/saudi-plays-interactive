import { chromium } from "playwright";
const b = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- §04 active stage follows REAL (wheel) scroll ----
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await wait(500);
  await page.locator("#riyadh .sec-header").scrollIntoViewIfNeeded();
  await wait(600);
  const activeStep = () => page.evaluate(() =>
    [...document.querySelectorAll("#riyadh .r2s__stepper-item")].findIndex((i) => i.className.includes("is-active")));
  const seq = [await activeStep()];
  for (let k = 0; k < 8; k++) {
    await page.mouse.wheel(0, 420); // real wheel events drive Lenis -> ScrollTrigger
    await wait(450);
    seq.push(await activeStep());
  }
  const maxReached = Math.max(...seq);
  console.log("§04 active stepper sequence while wheel-scrolling:", JSON.stringify(seq));
  console.log(`  -> max stage reached: ${maxReached} (${maxReached >= 3 ? "REACHES STAGE 4 ✓" : maxReached > 0 ? "ADVANCES ✓" : "STUCK ✗"})`);
  await ctx.close();
}

// ---- §05 hint only on real overflow ----
for (const vp of [{ n: "1440", w: 1440, h: 900 }, { n: "390", w: 390, h: 844, mob: true }]) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: !!vp.mob, hasTouch: !!vp.mob });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await wait(500);
  await page.locator("#zones").scrollIntoViewIfNeeded();
  await wait(900);
  const r = await page.evaluate(() => {
    const row = document.querySelector("#zones .zones__row");
    return { overflow: row ? row.scrollWidth > row.clientWidth + 4 : null, hintShown: !!document.querySelector("#zones .zones__hint") };
  });
  console.log(`§05 @${vp.n}: realOverflow=${r.overflow}, hintShown=${r.hintShown} -> ${r.overflow === r.hintShown ? "MATCH ✓" : "MISMATCH ✗"}`);
  await ctx.close();
}

// ---- §08 reverse: focusing a segment highlights its card (await React flush) ----
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await wait(500);
  await page.locator("#revenue").scrollIntoViewIfNeeded();
  await wait(1600);
  await page.evaluate(() => document.querySelector('#revenue .rev__seg[data-id="tickets"]').focus());
  await wait(250);
  const r = await page.evaluate(() => {
    const card = document.querySelector('#revenue .rev-stream[data-i="2"]');
    const seg = document.querySelector('#revenue .rev__seg[data-id="tickets"]');
    return { cardActive: card?.className.includes("is-active"), othersDim: card?.className.includes("is-dim"), segAria: seg.getAttribute("aria-label") };
  });
  console.log("§08 focus tickets SEGMENT -> card:", JSON.stringify(r), r.cardActive ? "✓" : "✗");
  await ctx.close();
}

await b.close();
