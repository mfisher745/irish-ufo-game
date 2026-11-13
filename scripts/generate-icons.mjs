// Generates the PWA icons as PNGs with no dependencies. Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};

function png(size, pixel) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size);
      raw.set([r, g, b, 255], y * stride + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [27, 42, 31];
const SAUCER = [63, 143, 79];
const GLOW = [220, 240, 200];

// Placeholder: a green flying saucer on dark green. Art direction may replace this.
const saucer = (u, v) => {
  const dx = (u - 0.5) / 0.3;
  const dy = (v - 0.5) / 0.09;
  const dome = ((u - 0.5) / 0.14) ** 2 + ((v - 0.43) / 0.12) ** 2;
  if (dome < 1) return GLOW;
  if (dx * dx + dy * dy < 1) return SAUCER;
  return BG;
};

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, saucer));
writeFileSync('public/icons/icon-512.png', png(512, saucer));
// Maskable: same motif, already inside the safe zone on a full-bleed background.
writeFileSync('public/icons/icon-maskable-512.png', png(512, saucer));
console.log('icons written');
