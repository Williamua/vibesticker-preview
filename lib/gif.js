// Animated sticker GIF: per-style loop (breathe / sway / bounce / pixel / wobble / shimmer) encoded with gifenc
// (sharp 0.33 wrote a single-frame GIF from our raw strip, so encoding is done here frame by frame).
const sharp = require('sharp');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const S = 480;               // output size
const BG = { r: 255, g: 255, b: 255, alpha: 1 };   // stickers are delivered on white (die-cut white border)

// frame plan per motion: returns {n, delay, at(i) → {scale, rot, dx, dy, sx, sy, sparkle}}
const MOTIONS = {
  breathe: { n: 20, delay: 90, at: t => ({ scale: 0.9 + 0.035 * Math.sin(t), dy: -6 * Math.sin(t) }) },
  sway:    { n: 20, delay: 90, at: t => ({ scale: 0.88, rot: 6 * Math.sin(t), dy: -3 * Math.abs(Math.sin(t)) }) },
  bounce:  { n: 16, delay: 70, at: t => { const h = Math.max(0, Math.sin(t)); const squash = Math.sin(t) < 0 ? -Math.sin(t) : 0;
             return { scale: 0.86, sx: 1 + 0.06 * squash, sy: 1 - 0.06 * squash, dy: -26 * h }; } },
  wobble:  { n: 20, delay: 90, at: t => ({ scale: 0.88 + 0.02 * Math.sin(2 * t), rot: 4 * Math.sin(t) }) },
  shimmer: { n: 20, delay: 90, at: t => ({ scale: 0.9 + 0.02 * Math.sin(t), sparkle: { count: 5, phase: t, smooth: true } }) },
  // pixel: stepped 2-position hop (no tweening, like a game sprite) + blinking square sparkles
  pixel:   { n: 8, delay: 160, at: (t, i) => ({ scale: 0.88, dy: (i % 4 < 2) ? 0 : -12, sparkle: { count: 4, phase: i, smooth: false } }) },
};

function sparkleSvg(sp, i) {
  const pts = [[0.14, 0.18], [0.84, 0.16], [0.88, 0.7], [0.1, 0.74], [0.5, 0.06]].slice(0, sp.count);
  const els = pts.map(([x, y], k) => {
    const on = sp.smooth ? (Math.sin(sp.phase + k * 1.3) + 1) / 2 : ((i + k) % 2 === 0 ? 1 : 0);
    if (on < 0.15) return '';
    const s = Math.round((sp.smooth ? 10 : 12) * (0.6 + 0.4 * on)), cx = Math.round(x * S), cy = Math.round(y * S), op = sp.smooth ? on.toFixed(2) : 1;
    return sp.smooth
      ? `<path d="M${cx} ${cy - s}L${cx + s * 0.3} ${cy - s * 0.3}L${cx + s} ${cy}L${cx + s * 0.3} ${cy + s * 0.3}L${cx} ${cy + s}L${cx - s * 0.3} ${cy + s * 0.3}L${cx - s} ${cy}L${cx - s * 0.3} ${cy - s * 0.3}Z" fill="#FFD95A" opacity="${op}"/>`
      : `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="#FFD95A"/><rect x="${cx - s / 2 + 3}" y="${cy - s / 2 + 3}" width="${s / 3}" height="${s / 3}" fill="#fff"/>`;
  }).join('');
  return Buffer.from(`<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">${els}</svg>`);
}

async function renderFrame(src, f, i) {
  const base = Math.round(S * (f.scale || 0.9));
  const w = Math.max(8, Math.round(base * (f.sx || 1))), h = Math.max(8, Math.round(base * (f.sy || 1)));
  let fr = sharp(src).resize(w, h, { fit: 'fill' });
  if (f.rot) fr = sharp(await fr.png().toBuffer()).rotate(f.rot, { background: { r: 255, g: 255, b: 255, alpha: 0 } });
  let buf = await fr.png().toBuffer();
  const m = await sharp(buf).metadata();
  if (m.width > S || m.height > S) { // crop rotated overflow
    const cw = Math.min(m.width, S), ch = Math.min(m.height, S);
    buf = await sharp(buf).extract({ left: (m.width - cw) >> 1, top: (m.height - ch) >> 1, width: cw, height: ch }).png().toBuffer();
  }
  const mm = await sharp(buf).metadata();
  const left = Math.round((S - mm.width) / 2 + (f.dx || 0));
  const top = Math.round(S - mm.height - (S - base) / 2 + (f.dy || 0));   // keep feet on the same baseline
  const layers = [{ input: buf, left: Math.max(0, left), top: Math.max(0, Math.min(S - mm.height, top)) }];
  if (f.sparkle) layers.push({ input: sparkleSvg(f.sparkle, i) });
  return sharp({ create: { width: S, height: S, channels: 4, background: BG } }).composite(layers).ensureAlpha().raw().toBuffer();
}

async function makeGif(pngBuf, motion = 'wobble') {
  const M = MOTIONS[motion] || MOTIONS.wobble;
  const src = await sharp(pngBuf).resize(S, S, { fit: 'contain', background: BG }).png().toBuffer();
  const frames = [];
  for (let i = 0; i < M.n; i++) frames.push(await renderFrame(src, M.at(i / M.n * 2 * Math.PI, i), i));
  // one global palette (from a few sample frames) → no colour flicker between frames
  const sample = Buffer.concat([frames[0], frames[Math.floor(M.n / 2)], frames[1] || frames[0]]);
  const palette = quantize(new Uint8Array(sample.buffer, sample.byteOffset, sample.length), 256);
  const gif = GIFEncoder();
  frames.forEach((fr, i) => {
    const px = new Uint8Array(fr.buffer, fr.byteOffset, fr.length);
    gif.writeFrame(applyPalette(px, palette), S, S, { palette: i === 0 ? palette : undefined, delay: M.delay, repeat: 0 });
  });
  gif.finish();
  return { buffer: Buffer.from(gif.bytes()), frames: M.n, delay: M.delay };
}
module.exports = { makeGif, MOTIONS };
