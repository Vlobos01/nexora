// Genera los íconos PNG de la PWA sin dependencias externas
// (encoder PNG puro + zlib de Node).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------- Encoder PNG ----------
let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Dibujo ----------
const INDIGO = [79, 70, 229];
const VIOLET = [124, 58, 237];
const WHITE = [255, 255, 255];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function roundedRectDist(x, y, x0, y0, x1, y1, r) {
  const cx = clamp(x, x0 + r, x1 - r);
  const cy = clamp(y, y0 + r, y1 - r);
  return Math.hypot(x - cx, y - cy) - r;
}

function renderIcon(size, maskable) {
  const px = new Uint8Array(size * size * 4);
  // Factor de escala para el glifo (zona segura)
  const s = maskable ? 0.78 : 1;
  const off = (size * (1 - s)) / 2;
  const docX0 = off + size * 0.3 * s;
  const docX1 = off + size * 0.7 * s;
  const docY0 = off + size * 0.26 * s;
  const docY1 = off + size * 0.74 * s;
  const docR = size * 0.045 * s;
  const cornerR = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = 1;
      if (!maskable) {
        const d = roundedRectDist(x + 0.5, y + 0.5, 0, 0, size, size, cornerR);
        a = clamp(0.5 - d, 0, 1);
      }
      const t = (x + y) / (2 * size);
      let r = INDIGO[0] + (VIOLET[0] - INDIGO[0]) * t;
      let g = INDIGO[1] + (VIOLET[1] - INDIGO[1]) * t;
      let b = INDIGO[2] + (VIOLET[2] - INDIGO[2]) * t;

      // Hoja de documento blanca
      const dd = roundedRectDist(x + 0.5, y + 0.5, docX0, docY0, docX1, docY1, docR);
      const da = clamp(0.5 - dd, 0, 1);
      r = r + (WHITE[0] - r) * da;
      g = g + (WHITE[1] - g) * da;
      b = b + (WHITE[2] - b) * da;

      // Líneas de texto dentro de la hoja
      const lineHalf = Math.max(1, size * 0.014);
      const lines = [
        { y0: size * 0.36 * s + off, x1: size * 0.64 * s + off },
        { y0: size * 0.46 * s + off, x1: size * 0.64 * s + off },
        { y0: size * 0.56 * s + off, x1: size * 0.5 * s + off },
      ];
      for (const ln of lines) {
        const lx0 = size * 0.36 * s + off;
        const dx = clamp(x + 0.5, lx0, ln.x1);
        const dy = clamp(y + 0.5, ln.y0 - lineHalf, ln.y0 + lineHalf);
        if (Math.hypot(x + 0.5 - dx, y + 0.5 - dy) < 1.5) {
          const la = clamp(1.5 - Math.hypot(x + 0.5 - dx, y + 0.5 - dy), 0, 1) * 0.9;
          r = r + (INDIGO[0] - r) * la;
          g = g + (INDIGO[1] - g) * la;
          b = b + (INDIGO[2] - b) * la;
        }
      }

      const i = (y * size + x) * 4;
      px[i] = Math.round(clamp(r, 0, 255));
      px[i + 1] = Math.round(clamp(g, 0, 255));
      px[i + 2] = Math.round(clamp(b, 0, 255));
      px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
}

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];

for (const [name, size, maskable] of targets) {
  const px = renderIcon(size, maskable);
  writeFileSync(join(outDir, name), encodePng(size, size, px));
  console.log('✓', name);
}
