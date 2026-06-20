// Deterministic frame-sequence builder for the Section 01 cinematic background.
// Takes the two upscaled Higgsfield clips (desktop 16:9, mobile 9:16) and emits a
// zero-padded WebP frame sequence + a poster + a compressed MP4/WebM fallback into
// public/cinematic/. Frames are what ScrollVideoCanvas scrubs — NOT a runtime video.
//
//   node scripts/extract-frames.mjs <desktop.mp4> <mobile.mp4>
//
// Re-run any time the source clips change; output is fully reproducible.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";

const [, , deskMp4, mobMp4] = process.argv;
if (!deskMp4 || !mobMp4) { console.error("usage: extract-frames.mjs <desktop.mp4> <mobile.mp4>"); process.exit(1); }

const OUT = "public/cinematic";
const FRAMES = 120;            // within the requested 120–180 band
const DURATION = 8;           // source clip length (s)
const FPS = FRAMES / DURATION; // 15 fps → exactly 120 deterministic frames
const POSTER_FRAME = 64;      // mid/late frame (Saudi clearly isolated) for reduced-motion

const ff = (args) => execFileSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "inherit"] });

function build(srcMp4, dir, width, quality, posterName, mp4Name) {
  if (!existsSync(srcMp4)) { console.error("missing source:", srcMp4); process.exit(1); }
  const d = `${OUT}/${dir}`;
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });

  // 1) zero-padded WebP frame sequence (lanczos downscale, photo preset). Quality
  //    tuned per orientation to keep the whole sequence practical for production.
  ff(["-hide_banner", "-loglevel", "error", "-i", srcMp4,
    "-vf", `fps=${FPS},scale=${width}:-2:flags=lanczos`,
    "-c:v", "libwebp", "-quality", String(quality), "-compression_level", "6", "-preset", "photo",
    `${d}/frame-%04d.webp`]);

  // 2) poster (reduced-motion / decode-pending fallback): a mid frame, full quality
  const poster = `${d}/frame-${String(POSTER_FRAME).padStart(4, "0")}.webp`;
  copyFileSync(existsSync(poster) ? poster : `${d}/frame-0001.webp`, `${OUT}/${posterName}`);

  // 3) one compressed muted MP4 fallback (canvas/decoder failure path) — never autoplayed,
  //    preload="none", so it only costs bytes when the canvas path is unavailable.
  ff(["-hide_banner", "-loglevel", "error", "-y", "-i", srcMp4,
    "-vf", `scale=${width}:-2`, "-an", "-c:v", "libx264", "-crf", "31", "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${OUT}/${mp4Name}.mp4`]);

  const files = readdirSync(d).filter((f) => f.endsWith(".webp"));
  const bytes = files.reduce((s, f) => s + statSync(`${d}/${f}`).size, 0);
  console.log(`${dir}: ${files.length} webp frames, ${(bytes / 1e6).toFixed(2)} MB total, ${Math.round(bytes / files.length / 1024)} KB/frame`);
}

mkdirSync(OUT, { recursive: true });
build(deskMp4, "desk", 1200, 54, "poster-desk.webp", "cinematic-desk");
build(mobMp4, "mob", 660, 52, "poster-mob.webp", "cinematic-mob");
console.log(`\nFRAME_COUNT=${FRAMES}`);
