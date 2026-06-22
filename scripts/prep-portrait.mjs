// Download a Higgsfield result video and transcode it to the iPhone portrait spec:
// 1080x1920, H.264 High@L4.0, yuv420p, +faststart, no audio, ~2.6Mbps, regular keyframes
// (-g 48). Then ffprobe-verify. One-time generation tool for the §05/§09/§11 portrait
// loops (reframe→Topaz-upscale→here). Requires dev tooling NOT committed to the manifest:
//   npm i -D ffmpeg-static ffprobe-static
// Usage: node scripts/prep-portrait.mjs <videoUrl> <outName.mp4>
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;

const [url, outName] = process.argv.slice(2);
const tmp = `scripts/_dl_${outName}`;
const out = `public/media/sections/${outName}`;

const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
writeFileSync(tmp, buf);
console.log(`downloaded ${outName}: ${(buf.length/1024).toFixed(0)}KB`);

// scale to cover 1080x1920 then center-crop to exactly 1080x1920 (in case reframe ratio is slightly off);
// H.264 high, yuv420p, faststart, no audio, ~2s keyframe interval (-g 48 @24fps), CRF 21 (sharp, reasonable size).
execFileSync(ffmpeg, [
  "-y", "-i", tmp,
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p",
  "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.0", "-preset", "slow", "-crf", "24",
  "-maxrate", "2600k", "-bufsize", "5200k",
  "-pix_fmt", "yuv420p", "-g", "48", "-keyint_min", "48", "-sc_threshold", "0",
  "-movflags", "+faststart", "-an", out,
], { stdio: ["ignore", "ignore", "inherit"] });

// ffprobe verify
const probe = JSON.parse(execFileSync(ffprobe, ["-v","quiet","-print_format","json","-show_format","-show_streams", out]).toString());
const v = probe.streams.find(s => s.codec_type === "video");
const hasAudio = probe.streams.some(s => s.codec_type === "audio");
const fs2 = (await import("node:fs")).statSync(out);
console.log(`PREPARED ${outName}: ${v.width}x${v.height} ${v.codec_name}/${v.profile} ${v.pix_fmt} ${(+probe.format.duration).toFixed(1)}s ${(fs2.size/1024).toFixed(0)}KB audio=${hasAudio}`);
// faststart check: moov before mdat
const head = buf; // re-read out for faststart
const outBuf = (await import("node:fs")).readFileSync(out);
const moov = outBuf.indexOf(Buffer.from("moov","latin1")), mdat = outBuf.indexOf(Buffer.from("mdat","latin1"));
console.log(`  faststart(moov<mdat)=${moov>-1 && mdat>-1 && moov<mdat}`);
import("node:fs").then(fs=>fs.unlinkSync(tmp));
