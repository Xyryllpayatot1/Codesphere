// Generates CodeSphere PWA icons (pure Node, no deps).
// Outputs PNGs into public/icons/ + an SVG app icon.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- PNG encoding -----------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgbaU8) {
  const rgba = Buffer.from(rgbaU8.buffer, rgbaU8.byteOffset, rgbaU8.byteLength);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- Drawing helpers ----------------------------------------------------------
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clamp01(((px - ax) * dx + (py - ay) * dy) / l2);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function renderIcon(size, { maskable = false } = {}) {
  const px = new Uint8Array(size * size * 4);
  const s = size;
  const pad = maskable ? 0 : s * 0.06;
  const corner = s * 0.2;
  const cx = s / 2;
  const cy = s / 2;

  // Brand gradient (violet -> deep indigo).
  const cTop = [126, 88, 255]; // #7e58ff
  const cBottom = [43, 13, 101]; // #2b0d65
  const cHighlight = [180, 150, 255];

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const nx = x / s;
      const ny = y / s;

      // Rounded-rect background coverage.
      const rr = 1 - smoothstep(
        pad + corner + 1,
        pad + corner - 1,
        roundedRectDist(x, y, pad, s - pad, s - pad, pad, corner)
      );
      let a = maskable ? 1 : rr;
      if (a <= 0) continue;

      // Vertical gradient with a soft top-left glow.
      let r = cTop[0] * (1 - ny) + cBottom[0] * ny;
      let g = cTop[1] * (1 - ny) + cBottom[1] * ny;
      let b = cTop[2] * (1 - ny) + cBottom[2] * ny;
      const glow = Math.max(0, 1 - Math.hypot(nx - 0.3, ny - 0.22) * 1.6);
      r += (cHighlight[0] - r) * glow * 0.45;
      g += (cHighlight[1] - g) * glow * 0.45;
      b += (cHighlight[2] - b) * glow * 0.45;

      // Network sphere mark (white).
      const markR = s * (maskable ? 0.29 : 0.31);
      const ringR = markR;
      const ringT = s * 0.035;
      const satR = ringR;
      const nodeR = s * 0.055;
      const dotR = s * 0.045;
      const cx0 = cx;
      const cy0 = cy - s * 0.01;

      let mark = 0;
      // Ring.
      const dRing = Math.abs(Math.hypot(x - cx0, y - cy0) - ringR);
      mark = Math.max(mark, 1 - smoothstep(ringT / 2 + 1, ringT / 2 - 1, dRing));
      // Center node.
      const dCenter = Math.hypot(x - cx0, y - cy0);
      mark = Math.max(mark, 1 - smoothstep(nodeR + 1, nodeR - 1, dCenter));
      // Satellite nodes + spokes.
      for (let k = 0; k < 3; k++) {
        const ang = (Math.PI * 2 * k) / 3 - Math.PI / 2;
        const sx = cx0 + Math.cos(ang) * satR;
        const sy = cy0 + Math.sin(ang) * satR;
        mark = Math.max(mark, 1 - smoothstep(dotR + 1, dotR - 1, Math.hypot(x - sx, y - sy)));
        mark = Math.max(mark, 1 - smoothstep(s * 0.012 + 1, s * 0.012 - 1, distSeg(x, y, cx0, cy0, sx, sy)));
      }

      const white = mark * a;
      r = r * (1 - white) + 255 * white;
      g = g * (1 - white) + 255 * white;
      b = b * (1 - white) + 255 * white;

      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
}

function roundedRectDist(x, y, x0, x1, y1, y0, r) {
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  return Math.hypot(x - cx, y - cy) - r;
}

// ---- Emit --------------------------------------------------------------------
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const specs = [
  { size: 192, file: "icon-192.png", opts: {} },
  { size: 512, file: "icon-512.png", opts: {} },
  { size: 512, file: "icon-maskable-512.png", opts: { maskable: true } },
  { size: 180, file: "apple-touch-icon.png", opts: {} },
];

for (const spec of specs) {
  const png = encodePng(spec.size, spec.size, renderIcon(spec.size, spec.opts));
  writeFileSync(join(outDir, spec.file), png);
  console.log("wrote", join("public/icons", spec.file), `${spec.size}x${spec.size}`, `${png.length} bytes`);
}

// SVG app icon (favicon + manifest fallback).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7e58ff"/>
      <stop offset="1" stop-color="#2b0d65"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#g)"/>
  <circle cx="256" cy="251" r="158" fill="none" stroke="#fff" stroke-width="18"/>
  <circle cx="256" cy="251" r="30" fill="#fff"/>
  <g stroke="#fff" stroke-width="6">
    <line x1="256" y1="251" x2="256" y2="93"/>
    <line x1="256" y1="251" x2="393" y2="330"/>
    <line x1="256" y1="251" x2="119" y2="330"/>
  </g>
  <circle cx="256" cy="93" r="24" fill="#fff"/>
  <circle cx="393" cy="330" r="24" fill="#fff"/>
  <circle cx="119" cy="330" r="24" fill="#fff"/>
</svg>`;
writeFileSync(join(root, "src", "app", "icon.svg"), svg);
console.log("wrote", join("src/app", "icon.svg"));

console.log("done");
