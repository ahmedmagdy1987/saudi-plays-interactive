// Verify every §02+ section loads + plays its cinematic loop in the unified engine.
// Reads the unified .ms-flow__sec layer for each section. Usage: node scripts/video-qa.mjs [url]
import { chromium, webkit } from "playwright";
import { dirname, join } from "node:path"; import { fileURLToPath } from "node:url"; import { mkdirSync, rmSync } from "node:fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "__video__");
const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SECTIONS = ["vision","market","riyadh","zones","malahi","governance","revenue","impact","finale"];

const readSec = (id) => {
  const sec = [...document.querySelectorAll('.ms-flow__sec')].find(s => s.getAttribute('data-sec') === id);
  if (!sec) return { id, found:false };
  const v = sec.querySelector('video'); const img = sec.querySelector('.ms-flow__img');
  const file = (u)=> u ? String(u).split('/').pop().split('?')[0] : null;
  return { id, found:true,
    layerOpacity:+(+getComputedStyle(sec).opacity).toFixed(2),
    imgSrc: file(img?.currentSrc||img?.getAttribute('src')), imgDecoded: (img?.naturalWidth||0)>0,
    video: v ? { src:file(v.currentSrc||v.querySelector('source')?.getAttribute('src')), vw:v.videoWidth, vh:v.videoHeight,
      readyState:v.readyState, paused:v.paused, t:+v.currentTime.toFixed(2), err:v.error?v.error.code:null,
      isPlaying: sec.classList.contains('is-playing'), objfit:getComputedStyle(v).objectFit } : null };
};

async function run(engineName, launcher) {
  const browser = await launcher.launch({ args: engineName==='chromium'?["--autoplay-policy=no-user-gesture-required"]:[] });
  const ctx = await browser.newContext({ viewport:{width: engineName==='chromium'?1440:390, height: engineName==='chromium'?900:844}, deviceScaleFactor: engineName==='chromium'?1:3, hasTouch: engineName!=='chromium' });
  const page = await ctx.newPage();
  const errs=[]; page.on('console',m=>m.type()==='error'&&errs.push(m.text())); page.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  page.on('requestfailed', r=>errs.push('REQFAIL '+r.failure()?.errorText+' '+r.url())); page.on('response', r=>r.status()===404&&errs.push('404 '+r.url()));
  await page.goto(URL, { waitUntil:'networkidle' }); await page.evaluate(()=>document.fonts&&document.fonts.ready); await wait(600);
  console.log(`\n===== ${engineName} =====`);
  let playing=0;
  for (const id of SECTIONS) {
    await page.evaluate((id)=>{const e=document.getElementById(id);if(e)e.scrollIntoView({block:'center'});}, id);
    await wait(1900);
    const d = await page.evaluate(readSec, id);
    const v=d.video;
    if (v && !v.paused && v.vw>0) playing++;
    console.log(`  ${id.padEnd(11)} loop=${v?.src||'-'} vid=${v?`${v.vw}x${v.vh}`:'-'} rs=${v?.readyState} playing=${v?(!v.paused&&v.vw>0):false} fit=${v?.objfit} poster=${d.imgDecoded} err=${v?.err}`);
  }
  console.log(`  → ${playing}/${SECTIONS.length} sections playing video; errors=${errs.length}`);
  errs.slice(0,12).forEach(e=>console.log('    •',e));
  await browser.close();
  return { engineName, playing, errors: errs.length };
}
rmSync(out,{recursive:true,force:true}); mkdirSync(out,{recursive:true});
const r1 = await run('chromium', chromium);
const r2 = await run('webkit', webkit);
console.log('\nSUMMARY', JSON.stringify([r1,r2]));
