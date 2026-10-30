// Image providers. Selection (no code change needed when a key arrives):
//   IMAGE_PROVIDER=gemini|xai|replicate|mock wins; otherwise GEMINI_API_KEY present → gemini, else mock.
//   If the chosen provider's key is missing we fall back to mock and report demo mode (never silently pretend).
const sharp = require('sharp');
const { buildPrompt } = require('./prompt');

class GenError extends Error { constructor(msg, code, status) { super(msg); this.code = code; this.status = status || 502; } }
const KEYS = { gemini: 'GEMINI_API_KEY', xai: 'XAI_API_KEY', replicate: 'REPLICATE_API_TOKEN', mock: null };
const TIMEOUT = () => parseInt(process.env.GEN_TIMEOUT_MS || '90000');

async function toJpeg(buf) { return sharp(buf).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 90 }).toBuffer(); }
const toJpegUri = async buf => 'data:image/jpeg;base64,' + (await toJpeg(buf)).toString('base64');
async function grab(url) { const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT()) }); if (!r.ok) throw new GenError('download failed ' + r.status, 'upstream'); return Buffer.from(await r.arrayBuffer()); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// fetch JSON with timeout + one retry on 429/5xx/network
async function callJSON(url, opts, label) {
  for (let attempt = 0; ; attempt++) {
    let r, j;
    try {
      r = await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT()) });
      j = await r.json().catch(() => ({}));
    } catch (e) {
      if (attempt < 1) { await sleep(1200); continue; }
      throw new GenError(`${label}: ${e.name === 'TimeoutError' ? 'timeout' : e.message}`, e.name === 'TimeoutError' ? 'timeout' : 'network', 504);
    }
    if (r.ok) return j;
    const msg = (j.error && (j.error.message || j.error)) || JSON.stringify(j).slice(0, 300);
    if ((r.status === 429 || r.status >= 500) && attempt < 1) { await sleep(r.status === 429 ? 3000 : 1200); continue; }
    if (r.status === 401 || r.status === 403 || /API[_ ]?KEY/i.test(msg)) throw new GenError(`${label}: auth failed (${r.status}) – check the API key`, 'auth', 502);
    if (r.status === 429) throw new GenError(`${label}: rate limited / quota exceeded`, 'rate_limited', 429);
    if (r.status === 400) throw new GenError(`${label}: bad request – ${msg}`, 'bad_request', 502);
    throw new GenError(`${label}: HTTP ${r.status} – ${msg}`, 'upstream', 502);
  }
}

const MOCK_TINT = { chibi: [255, 200, 220], vaporwave: [255, 120, 230], graffiti: [255, 200, 0], glitch: [0, 255, 200], retro: [230, 160, 90], clay: [220, 150, 110], comic: [255, 60, 60], kawaii: [255, 220, 240], anime: [170, 215, 255], toy3d: [255, 190, 120], watercolor: [200, 230, 225] };
const providers = {
  // DEMO ONLY: a local filter that hints at the style. Output is flagged demo:true everywhere.
  async mock(buf, style) {
    const S = 1024, inner = 860, r = 120;
    let img = sharp(buf).resize(inner, inner, { fit: 'cover' });
    if (style.id === 'ink') img = img.grayscale().linear(1.4, -40);
    else if (style.id === 'pixel') { const sm = await img.resize(48, 48).png({ palette: true, colours: 20 }).toBuffer(); img = sharp(sm).resize(inner, inner, { kernel: 'nearest' }); }
    else { const t = MOCK_TINT[style.id] || [200, 200, 200]; img = img.modulate({ saturation: 1.6 }).tint({ r: t[0], g: t[1], b: t[2] }); }
    const mask = Buffer.from(`<svg width="${inner}" height="${inner}"><rect width="${inner}" height="${inner}" rx="${r}" fill="#fff"/></svg>`);
    const photo = await img.png().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    const border = Buffer.from(`<svg width="${S}" height="${S}"><rect x="${(S - inner) / 2 - 36}" y="${(S - inner) / 2 - 36}" width="${inner + 72}" height="${inner + 72}" rx="${r + 30}" fill="#fff" stroke="#e6e6e6" stroke-width="2"/></svg>`);
    return sharp({ create: { width: S, height: S, channels: 4, background: '#ffffff' } })
      .composite([{ input: border }, { input: photo, left: (S - inner) / 2, top: (S - inner) / 2 }]).png().toBuffer();
  },
  async gemini(buf, style) {
    const K = process.env.GEMINI_API_KEY;
    const m = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
    const generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
    if (process.env.GEMINI_ASPECT !== 'off') generationConfig.imageConfig = { aspectRatio: '1:1' };
    const j = await callJSON(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': K, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: buildPrompt(style) }, { inline_data: { mime_type: 'image/jpeg', data: (await toJpeg(buf)).toString('base64') } }] }], generationConfig }),
    }, 'gemini');
    if (j.promptFeedback && j.promptFeedback.blockReason) throw new GenError('gemini blocked the photo: ' + j.promptFeedback.blockReason, 'blocked', 422);
    const cand = (j.candidates || [])[0];
    if (!cand) throw new GenError('gemini returned no candidates', 'empty');
    const parts = (cand.content && cand.content.parts) || [];
    const part = parts.find(p => p.inlineData || p.inline_data);
    if (!part) {
      const fr = cand.finishReason || '';
      if (/SAFETY|PROHIBITED|BLOCK|RECITATION/i.test(fr)) throw new GenError('gemini refused (' + fr + ')', 'blocked', 422);
      const said = parts.map(p => p.text).filter(Boolean).join(' ').slice(0, 200);
      throw new GenError('gemini returned no image' + (fr ? ` (${fr})` : '') + (said ? ': ' + said : ''), 'empty');
    }
    return Buffer.from((part.inlineData || part.inline_data).data, 'base64');
  },
  async xai(buf, style) { // endpoint/fields per docs.x.ai — verify with a real key
    const j = await callJSON('https://api.x.ai/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.XAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.XAI_MODEL || 'grok-imagine-image', prompt: buildPrompt(style), image: { url: await toJpegUri(buf), type: 'image_url' }, response_format: 'b64_json' }) }, 'xai');
    const d = (j.data || [])[0]; if (!d) throw new GenError('xai returned no image', 'empty');
    return d.b64_json ? Buffer.from(d.b64_json, 'base64') : grab(d.url);
  },
  async replicate(buf, style) {
    const T = process.env.REPLICATE_API_TOKEN, H = { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' };
    let p = await callJSON('https://api.replicate.com/v1/predictions', { method: 'POST', headers: { ...H, Prefer: 'wait' },
      body: JSON.stringify({ version: process.env.REPLICATE_VERSION || '764d4827ea159608a07cdde8ddf1c6000019627515eb02b6b449695fd547e5ef', input: { image: await toJpegUri(buf), prompt: buildPrompt(style), upscale: false, steps: 20, width: 1024, height: 1024 } }) }, 'replicate');
    const until = Date.now() + TIMEOUT();
    while (p.status && !['succeeded', 'failed', 'canceled'].includes(p.status)) {
      if (Date.now() > until) throw new GenError('replicate: timeout', 'timeout', 504);
      await sleep(1500); p = await callJSON(p.urls.get, { headers: H }, 'replicate');
    }
    if (p.status !== 'succeeded') throw new GenError('replicate failed: ' + (p.error || p.detail || 'unknown'), 'upstream');
    const outs = [].concat(p.output); return grab(outs[1] || outs[0]);
  },
};

function info() {
  const requested = (process.env.IMAGE_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'mock')).trim().toLowerCase();
  if (!(requested in providers)) return { name: 'mock', requested, demo: true, reason: `unknown IMAGE_PROVIDER "${requested}"` };
  if (requested === 'mock') return { name: 'mock', requested, demo: true, reason: process.env.IMAGE_PROVIDER ? 'IMAGE_PROVIDER=mock' : 'GEMINI_API_KEY not set' };
  const key = KEYS[requested];
  if (key && !process.env[key]) return { name: 'mock', requested, demo: true, reason: `${key} not set` };
  return { name: requested, requested, demo: false, reason: '' };
}
module.exports = { generate: (b, s) => providers[info().name](b, s), name: () => info().name, info, GenError, buildPrompt };
