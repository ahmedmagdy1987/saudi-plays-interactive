import { chromium } from "playwright";
const b = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const VPS = [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[430,932],[390,844],[360,800]];
let bad = 0;
for (const lang of ["ar","en"]) {
  for (const [w,h] of VPS) {
    const ctx = await b.newContext({ viewport:{width:w,height:h}, isMobile: w<700, hasTouch: w<700 });
    const page = await ctx.newPage();
    const errs=[]; page.on("pageerror",e=>errs.push(e.message)); page.on("console",m=>m.type()==="error"&&errs.push(m.text()));
    await page.goto("http://localhost:4173/", { waitUntil:"networkidle" });
    await wait(400);
    if (lang==="en"){ await page.getByRole("button",{name:"English"}).click(); await wait(900); }
    // scroll through to trigger all layouts
    await page.evaluate(async()=>{ const max=document.documentElement.scrollHeight; for(let y=0;y<=max;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));} window.scrollTo(0,0); });
    await wait(300);
    const d = await page.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
    const overflow = d.sw > d.cw+2;
    if (overflow || errs.length) { bad++; console.log(`✗ ${lang}/${w}x${h}: overflow=${overflow}(${d.sw}>${d.cw}) errors=${errs.length}`); }
    await ctx.close();
  }
}
console.log(bad===0 ? "\nALL VIEWPORTS: no horizontal overflow, no console errors ✓" : `\n${bad} problem viewports ✗`);
await b.close();
