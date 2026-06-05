/**
 * Zero-dependency PNG icon generator.
 *
 * Produces simple branded placeholder icons (a rounded gradient tile with a
 * "spark" mark) at 16/48/128 px into public/icons/. Replace these with real
 * artwork whenever you like — the manifest just points at these files.
 *
 * We hand-encode PNGs with Node's built-in zlib so there are no image deps.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

// --- CRC32 (PNG chunk checksums) -------------------------------------------
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
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// --- Pixel art: gradient tile + diagonal "spark" ----------------------------
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function renderRGBA(size) {
  const data = Buffer.alloc(size * size * 4);
  // Brand gradient: LinkedIn blue -> X/Twitter black.
  const top = [10, 102, 194]; // #0A66C2 (LinkedIn blue)
  const bottom = [11, 15, 23]; // #0B0F17 (near-black)
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = lerp(top[0], bottom[0], t);
    const g = lerp(top[1], bottom[1], t);
    const b = lerp(top[2], bottom[2], t);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded-corner mask.
      const cx = Math.min(x, size - 1 - x);
      const cy = Math.min(y, size - 1 - y);
      let alpha = 255;
      if (cx < radius && cy < radius) {
        const dx = radius - cx;
        const dy = radius - cy;
        if (dx * dx + dy * dy > radius * radius) alpha = 0;
      }
      // A bright diagonal "spark" stripe through the middle.
      const diag = Math.abs((x - y) - 0) / size;
      const spark = diag < 0.12 ? 1 : 0;
      data[i] = spark ? 255 : r;
      data[i + 1] = spark ? 255 : g;
      data[i + 2] = spark ? 255 : b;
      data[i + 3] = alpha;
    }
  }
  return data;
}

function encodePNG(size) {
  const rgba = renderRGBA(size);
  // Add filter byte (0 = none) at the start of every scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, encodePNG(size));
}
console.log('✓ icons written to public/icons/');
