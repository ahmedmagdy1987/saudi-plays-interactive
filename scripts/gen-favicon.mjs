// Rasterize public/favicon.svg into a multi-size public/favicon.ico (PNG-in-ICO).
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "favicon.svg"), "utf8");
const sizes = [16, 32, 48];

const b = await chromium.launch();
const pngs = [];
for (const s of sizes) {
  const ctx = await b.newContext({ viewport: { width: s, height: s }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(
    `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{width:${s}px;height:${s}px;overflow:hidden}svg{width:${s}px;height:${s}px;display:block}</style></head><body>${svg}</body></html>`,
    { waitUntil: "networkidle" },
  );
  const buf = await page.locator("svg").screenshot({ type: "png", omitBackground: true });
  pngs.push({ size: s, buf });
  await ctx.close();
}
await b.close();

// assemble ICO: ICONDIR(6) + N*ICONDIRENTRY(16) + concatenated PNG payloads
const count = pngs.length;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = icon
header.writeUInt16LE(count, 4);

const entries = [];
let offset = 6 + count * 16;
for (const { size, buf } of pngs) {
  const e = Buffer.alloc(16);
  e.writeUInt8(size >= 256 ? 0 : size, 0); // width
  e.writeUInt8(size >= 256 ? 0 : size, 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(buf.length, 8); // size of image data
  e.writeUInt32LE(offset, 12); // offset
  entries.push(e);
  offset += buf.length;
}

const ico = Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
writeFileSync(join(root, "public", "favicon.ico"), ico);
console.log(`wrote public/favicon.ico (${ico.length} bytes, sizes ${sizes.join("/")})`);
