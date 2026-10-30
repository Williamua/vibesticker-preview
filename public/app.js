/* VibeSticker forest long-scroll · preview build
   - GSAP ScrollTrigger orchestrates one continuous scroll (falls back to plain reveal if GSAP is missing or reduced-motion)
   - photo → glowing leaf on a branch (vine progress ring) → unfolds into the sticker */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const mqMobile = matchMedia('(max-width: 768px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = !!(window.gsap && window.ScrollTrigger);
const animate = hasGSAP && !reduced;
const isMobile = () => mqMobile.matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('vs.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('vs.' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('vs.' + k); } catch {} },
};

/* ---------- styles (card → backend style id) ---------- */
const STYLES = [
  { id: 'anime', name: '日漫', en: 'Anime' },
  { id: 'chibi', name: 'Q版', en: 'Chibi' },
  { id: 'toy3d', name: '3D潮玩', en: 'Art Toy' },
  { id: 'pixel', name: '像素', en: 'Pixel' },
  { id: 'watercolor', name: '水彩', en: 'Watercolor' },
];
const state = {
  photo: null,          // compressed JPEG Blob
  photoURL: '',
  pixelURL: '',
  style: LS.get('style', 'anime'),
  busy: false,
  result: LS.get('result', null),
};
if (!STYLES.some(s => s.id === state.style)) state.style = 'anime';

/* ---------- toast ---------- */
let toastT;
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}

/* ---------- background video with static fallback ---------- */
function setupVideo() {
  const v = $('#bgv'), wrap = $('.l-video');
  if (reduced) return;                       // reduced-motion: static poster only
  const mobile = isMobile();
  // rainforest upward-shot footage (ASSETS-V2 §1 V4 "Sunlight Streaming Through Forest Canopy", Saulo Nulo / Pexels) – locked by the user; files are used as delivered, no re-encode
  v.poster = mobile ? '/media/rainforest-loop-mobile-720-poster.jpg' : '/media/rainforest-loop-1080-poster.jpg';
  v.preload = 'auto';
  v.src = mobile ? '/media/rainforest-loop-mobile-720.mp4' : '/media/rainforest-loop-1080.mp4';
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  const off = () => wrap.classList.remove('playing');   // poster underneath shows through
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(off); };
  v.addEventListener('playing', () => wrap.classList.add('playing'));
  v.addEventListener('error', off);
  v.addEventListener('stalled', () => { if (v.readyState < 3) off(); });
  v.addEventListener('pause', () => { off(); if (!document.hidden) setTimeout(tryPlay, 400); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
  // iOS low-power mode refuses autoplay: retry once on first touch
  addEventListener('touchstart', tryPlay, { once: true, passive: true });
  tryPlay();
}

/* ---------- parallax layers (ASSETS-V2 §2) ----------
   L1 fog is switched off (L1 fog off per design brief). Mobile and desktop both use 3 layers: L2 beams, L3 trunks, L4 fore-leaves.
   speed = share of a common travel distance (layers are one-screen images, so 1.0 ≠ content speed literally). */
const LAYERS = [
  { id: 'L2', file: 'L2-lightbeams', speed: 0.3 },
  { id: 'L4', file: 'L4-foreleaves', speed: 1.2 },
];
const travelFor = speed => Math.round(speed * innerHeight * 0.25);
function buildLayers() {
  const box = $('#pxLayers'), suf = isMobile() ? '1080m' : '2560';
  box.innerHTML = LAYERS.map(l => `
    <div class="layer px px-${l.id}" data-speed="${l.speed}" style="--travel:${l.id === 'L3' ? travelFor(l.speed) : 0}px">
      <div class="pxi"><picture>
        <source type="image/webp" srcset="/media/layers/${l.file}-${suf}.webp">
        <img src="/media/layers/${l.file}-${suf}.png" alt="" decoding="async">
      </picture></div>
    </div>`).join('');
}
async function loadLeafDefs() {
  try { const r = await fetch('/media/layers/leaf-mask.svg'); if (r.ok) $('#leafDefs').innerHTML = await r.text(); }
  catch (e) { console.warn('leaf mask unavailable', e); }
}
/* wind from scroll speed → fore-leaf sway ±1.5° … ±6° */
function setupWind() {
  if (reduced) return;
  let last = scrollY, wind = 0, pic = null;
  const t0 = performance.now();
  (function loop(now) {
    const v = Math.abs(scrollY - last); last = scrollY;
    wind += (Math.min(1, v / 40) - wind) * 0.08;
    const a = (1.5 + 4.5 * wind) * Math.sin((now - t0) / 6000 * Math.PI * 2);
    pic = pic || $('.px-L4 picture');
    if (pic) pic.style.transform = `rotate(${a.toFixed(2)}deg)`;
    requestAnimationFrame(loop);
  })(t0);
}

/* ---------- style cards ---------- */
function renderStyles() {
  const box = $('#styles');
  box.innerHTML = STYLES.map(s => `
    <button type="button" class="card glass" role="radio" data-id="${s.id}" aria-checked="${s.id === state.style}" tabindex="${s.id === state.style ? 0 : -1}">
      <span class="sw sw-${s.id}">${state.photoURL ? `<img class="f-${s.id}" alt="" src="${s.id === 'pixel' ? state.pixelURL : state.photoURL}">` : ''}</span>
      <span class="txt"><span class="nm">${s.name}</span><span class="en">${s.en}</span></span>
    </button>`).join('');
}
function selectStyle(id, focus) {
  state.style = id; LS.set('style', id);
  $$('#styles .card').forEach(c => {
    const on = c.dataset.id === id;
    c.setAttribute('aria-checked', on); c.tabIndex = on ? 0 : -1;
    if (on && focus) c.focus();
  });
  updateGenButton();
}
function bindStyles() {
  const box = $('#styles');
  box.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) selectStyle(c.dataset.id); });
  box.addEventListener('keydown', e => {
    const i = STYLES.findIndex(s => s.id === state.style);
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return; e.preventDefault();
    selectStyle(STYLES[(i + d + STYLES.length) % STYLES.length].id, true);
  });
}

/* ---------- upload: click / drag / camera, HEIC → JPEG, local compression ---------- */
const isHeic = f => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name || '');
let heicLoader;
function loadHeic2any() {
  if (window.heic2any) return Promise.resolve();
  return heicLoader ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    s.onload = res; s.onerror = () => { heicLoader = null; rej(new Error('heic2any load failed')); };
    document.head.appendChild(s);
  });
}
async function decode(blob) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch {}
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode(); return img;
  } finally { URL.revokeObjectURL(url); }
}
async function compress(blob, max = 1600, q = 0.86) {
  const bmp = await decode(blob);
  const w0 = bmp.width, h0 = bmp.height, k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  const out = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
  // tiny pixel thumbnail for the 像素 card
  const p = document.createElement('canvas'); p.width = 22; p.height = Math.max(1, Math.round(22 * h / w));
  p.getContext('2d').drawImage(c, 0, 0, p.width, p.height);
  return { blob: out, w, h, pixel: p.toDataURL('image/png') };
}
function uploadError(msg) {
  const d = $('#drop'), e = $('#upErr');
  d.classList.remove('err'); void d.offsetWidth; d.classList.add('err');
  e.textContent = msg || '这张照片好像被风吹走了，再试一次？'; e.hidden = false;
  $('#repick').hidden = false;
}
async function handleFile(file) {
  if (!file) return;
  const d = $('#drop'), busy = $('.drop-busy');
  $('#upErr').hidden = true; d.classList.remove('err');
  const okType = /^image\/(jpe?g|png|hei[cf])$/i.test(file.type) || /\.(jpe?g|png|hei[cf])$/i.test(file.name || '');
  if (!okType) return uploadError('这张照片好像被风吹走了，再试一次？（支持 JPG / PNG / HEIC）');
  if (file.size > 30e6) return uploadError('照片太大了（超过 30MB），换一张试试？');
  busy.hidden = false;
  try {
    let src = file;
    if (isHeic(file)) {
      $('#busyT').textContent = '正在转换 HEIC…';
      await loadHeic2any();
      const r = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      src = Array.isArray(r) ? r[0] : r;
    }
    $('#busyT').textContent = '正在压缩照片…';
    const c = await compress(src);
    if (state.photoURL) URL.revokeObjectURL(state.photoURL);
    state.photo = c.blob; state.photoURL = URL.createObjectURL(c.blob); state.pixelURL = c.pixel;
    const pv = $('#preview'); pv.src = state.photoURL; pv.hidden = false; d.classList.add('has');
    $('#repick').hidden = false; $('#pick').hidden = true;
    renderStyles(); updateGenButton(); updateFab();
    toast(`照片已放好（${c.w}×${c.h}，${Math.round(c.blob.size / 1024)} KB），往下选风格`);
  } catch (err) {
    console.warn('upload failed', err);
    uploadError(isHeic(file) ? 'HEIC 转换失败了，换成 JPG 再试一次？' : '这张照片好像被风吹走了，再试一次？');
  } finally { busy.hidden = true; $('#busyT').textContent = '正在整理照片…'; }
}
function bindUpload() {
  const d = $('#drop'), f = $('#file'), cam = $('#cam');
  const open = () => { if (!state.busy) f.click(); };
  d.addEventListener('click', open);
  d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  $('#pick').addEventListener('click', open);
  $('#repick').addEventListener('click', open);
  $('#camBtn').addEventListener('click', () => cam.click());
  f.addEventListener('change', () => { handleFile(f.files[0]); f.value = ''; });
  cam.addEventListener('change', () => { handleFile(cam.files[0]); cam.value = ''; });
  ['dragenter', 'dragover'].forEach(t => d.addEventListener(t, e => { e.preventDefault(); d.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => d.addEventListener(t, e => { e.preventDefault(); d.classList.remove('over'); }));
  d.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
  // don't let a file dropped elsewhere navigate away
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { if (!e.target.closest('#drop')) e.preventDefault(); });
}

/* ---------- generation: glowing leaf on the branch ---------- */
const CAPTIONS = ['阳光正在穿过树叶…', '松鼠在挑最好看的一颗…', '叶脉正在一点点染上颜色…', '快好了，风停一下'];
let capTimer, progTimer;
function setProgress(p) {
  p = Math.max(0, Math.min(1, p));
  $('#ringFg').style.strokeDashoffset = String(100 - p * 100);
  const w = $('#leafWrap'); w.style.setProperty('--p', p.toFixed(3));
  const sv = $('.leafsvg');                                   // §4: brightness .4 → 1, glow radius 8 → 18px
  sv.style.setProperty('--lb', (0.4 + 0.6 * p).toFixed(3)); sv.style.setProperty('--gr', (8 + 10 * p).toFixed(1) + 'px');
  $('#gen').setAttribute('aria-valuenow', Math.round(p * 100));
}
function startCaptions() {
  const c = $('#caption'); let i = 0; c.textContent = CAPTIONS[0];
  clearInterval(capTimer);
  capTimer = setInterval(() => {
    c.classList.add('swap');
    setTimeout(() => { i = (i + 1) % CAPTIONS.length; c.textContent = CAPTIONS[i]; c.classList.remove('swap'); }, 240);
  }, 3000);
}
function stopCaptions(text = '') { clearInterval(capTimer); $('#caption').textContent = text; }
function geom() {
  // translate/scale that moves the full-frame leaf onto the branch tip
  const g = $('#gen').getBoundingClientRect();
  const size = isMobile() ? 0.40 : 0.38;
  const tx = g.width * (isMobile() ? 0.26 : 0.31), ty = -g.height * 0.30;
  return `translate(${tx}px, ${ty}px) scale(${size}) rotate(-18deg)`;
}
function showFrame(which) {
  $('#fEmpty').hidden = which !== 'empty';
  $('#sticker').hidden = which !== 'sticker';
  $('#failCard').hidden = which !== 'fail';
}
function showResult(r, fresh) {
  const img = $('#stickerImg'), fig = $('#sticker');
  img.onerror = () => { if (!fresh) { LS.del('result'); state.result = null; showFrame('empty'); $('#dl').hidden = true; } };
  img.src = r.png; img.alt = `生成的${(STYLES.find(s => s.id === r.style) || {}).name || ''}贴纸`;
  showFrame('sticker');
  fig.classList.remove('peel'); void fig.offsetWidth; if (fresh) fig.classList.add('peel');
  const dp = $('#dlPng'), dg = $('#dlGif');
  dp.href = r.png + '?dl=1'; dg.href = r.gif + '?dl=1';
  dp.setAttribute('download', `VibeSticker-${r.style}.png`); dg.setAttribute('download', `VibeSticker-${r.style}.gif`);
  $('#dl').hidden = false;
  $('#genBtn').textContent = '再生成一次';
  if (!fresh) $('#caption').textContent = '上次的贴纸还在这里';
}
async function generate() {
  if (state.busy) return;
  if (!state.photo) {
    scrollToSec('#s1'); setTimeout(() => uploadError('先放入一张照片吧'), 500); return;
  }
  state.busy = true; updateGenButton(); updateFab();
  const btn = $('#genBtn'); btn.setAttribute('aria-busy', 'true'); btn.textContent = '正在生长…';
  $('#dl').hidden = true; $('#gen').setAttribute('role', 'progressbar'); $('#gen').setAttribute('aria-label', '生成进度');
  const w = $('#leafWrap');
  $('#leafImg').setAttribute('href', state.photoURL); $('#leafPhoto').src = state.photoURL;
  w.className = 'leafwrap'; w.style.transform = 'none'; w.style.opacity = '1'; w.hidden = false;
  showFrame('none'); setProgress(0);
  const fd = new FormData();
  fd.append('photo', state.photo, 'photo.jpg'); fd.append('style', state.style);
  const t0 = performance.now();
  const req = fetch('/api/generate', { method: 'POST', body: fd })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || ('HTTP ' + r.status)), { status: r.status, body: j }); return j; });
  req.catch(() => {}); // handled below
  const step = reduced ? 0 : 1;
  // 1) curl into a leaf (600ms) → 2) drift to the branch and hang
  await sleep(30); w.classList.add('curl'); await sleep(650 * step);
  w.style.transform = geom(); await sleep(900 * step); w.classList.add('hang');
  startCaptions();
  // simulated progress (asymptotic) until the request settles
  let p = 0; clearInterval(progTimer);
  progTimer = setInterval(() => { const t = (performance.now() - t0) / 1000; p = 0.92 * (1 - Math.exp(-t / 5)); setProgress(p); }, 120);
  let res, err;
  try { res = await req; } catch (e) { err = e; }
  const minShow = reduced ? 600 : 3200;                // let the leaf be seen even when mock answers instantly
  const left = minShow - (performance.now() - t0); if (left > 0) await sleep(left);
  clearInterval(progTimer);
  if (res) {
    setProgress(1); await sleep(450 * step);
    w.classList.add('done'); await sleep(600 * step);              // halo 0 → 60px, .6 → 0
    w.classList.remove('hang'); w.style.transform = 'none'; await sleep(850 * step);   // float back to frame centre
    w.classList.remove('curl'); await sleep(500 * step);                               // unfold
    w.style.opacity = '0';
    state.result = { id: res.id, style: res.style, png: res.png, gif: res.gif, t: Date.now() };
    LS.set('result', state.result);
    showResult(state.result, true);
    stopCaptions('完成了，贴纸属于你了');
    await sleep(500); w.hidden = true;
    if (typeof res.freeLeft === 'number') setQuota(res);
  } else {
    console.warn('generate failed', err);
    w.classList.add('wither'); await sleep(700 * step);
    w.classList.remove('hang'); w.classList.add('fall');
    const g = $('#gen').getBoundingClientRect();
    w.style.transform = `translate(0px, ${g.height * 0.2}px) scale(.22) rotate(200deg)`; w.style.opacity = '0';
    await sleep(1300 * step); w.hidden = true;
    const why = err && err.status === 402 ? '今天的免费次数用完了，付费档即将开放' : '不扣次数，随时可以再试';
    $('#failWhy').textContent = why;
    showFrame('fail'); stopCaptions('');
    btn.textContent = '免费再来一次';
  }
  btn.removeAttribute('aria-busy'); $('#gen').removeAttribute('role');
  if (res) btn.textContent = '再生成一次';
  state.busy = false; updateGenButton(); updateFab();
}
function updateGenButton() {
  const b = $('#genBtn');
  b.disabled = state.busy || !state.photo;
  if (!state.photo && !state.busy) b.title = '先在上面放入一张照片';
  else b.removeAttribute('title');
  const sub = $('#genSub');
  if (!state.photo) sub.textContent = '先在树干上放入一张照片，再回到这里';
  else sub.textContent = `风格：${(STYLES.find(s => s.id === state.style) || STYLES[0]).name} · 照片会先变成一片发光的叶子`;
}
function setQuota(j) {
  const q = $('#quota');
  if (j.freeLeft > 0) q.textContent = `今天还可免费生成 ${j.freeLeft} 次`;
  else if (j.credits > 0) q.textContent = `剩余 ${j.credits} 次`;
  else q.textContent = '今天的免费次数已用完';
}

/* ---------- placeholders ---------- */
function renderPlaceholders() {
  $('#wall').innerHTML = Array.from({ length: 9 }, (_, i) => `<div class="tile${i === 4 ? ' first' : ''}">${i === 4 ? '<span aria-hidden="true"></span>' : ''}</div>`).join('');
  $('#rank').innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<li><span class="no">0${i + 1}</span><span class="th"></span><span class="nm">等你来占位</span><span class="lk">♥ —</span></li>`).join('');
}

/* ---------- scroll helpers + mobile FAB ---------- */
function scrollToSec(sel) {
  const el = sel === '#s3' ? $('#gen') : $(sel + ' .in') || $(sel);
  const r = el.getBoundingClientRect();
  const y = scrollY + r.top - Math.max(20, (innerHeight - r.height) / 2);
  scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
}
let curSec = 's0';
function currentSection() {
  const mid = innerHeight * 0.5;
  for (const s of $$('.sec')) { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) return s.id; }
  return curSec;
}
function updateFab() {
  const fab = $('#fab'); if (!isMobile()) { fab.hidden = true; return; }
  fab.hidden = false;
  const id = currentSection(); curSec = id;
  let label = $('#' + id).dataset.fab || '';
  if (id === 's1' && state.photo) label = '选好了，去选风格';
  if (id === 's2' && state.busy) label = '正在生长…';
  fab.textContent = label;
  fab.classList.toggle('off', !label);
  fab.disabled = id === 's2' && state.busy;
}
function bindFab() {
  $('#fab').addEventListener('click', () => {
    switch (curSec) {
      case 's1': state.photo ? scrollToSec('#s2') : $('#file').click(); break;
      case 's2': scrollToSec('#s3'); setTimeout(generate, reduced ? 0 : 700); break;
      case 's4': toast('预览版：支付暂未开放'); break;
      default: scrollToSec('#s1');
    }
  });
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateFab(); }); }, { passive: true });
  mqMobile.addEventListener('change', updateFab);
}

/* ---------- GSAP: one continuous camera ---------- */
function setupScroll() {
  if (!animate) {
    html.classList.add('plain');
    // reduced-motion / no-GSAP: hide scene photos, simple 200ms reveal
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('seen'); }), { threshold: 0.1 });
    $$('.sec').forEach(s => io.observe(s));
    if (!reduced && !hasGSAP) console.info('GSAP not available – using plain reveal');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  const mobile = isMobile();
  const E = 'power2.inOut';
  // master background timeline, progress p ∈ [0,1] over the whole roll
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '#roll', start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
  tl.fromTo('.l-video', { scale: 1.12, y: 0 }, { scale: 1.0, y: () => -innerHeight * 0.08, duration: 0.64, ease: E }, 0)
    .to('.l-video', { y: () => -innerHeight * 0.16, scale: 1.04, duration: 0.18, ease: E }, 0.64)
    .to('.l-video', { y: () => -innerHeight * 0.12, duration: 0.18, ease: E }, 0.82);
  // parallax: each layer travels speed × common distance over the whole roll
  // L2 beams stay put (final brief: opacity .3, no shift); L3/L4 travel speed × common distance
  $$('.px:not(.px-L2)').forEach(el => tl.fromTo(el, { y: 0 }, { y: () => -travelFor(+el.dataset.speed), duration: 1 }, 0));
  // 段4 (p .50–.64): push into the trunks, scale 1 → 1.6 (ASSETS-V2 §2)
  // L3 trunks removed (user: eye-level trunks hid the upward rainforest video)
  // beams opacity stays at .3 (design brief); warm afternoon light toward the end
  tl.to('.l-warm', { opacity: 0.4, duration: 0.36 }, 0.64)
    .to('.l-shade', { opacity: 0.9, duration: 0.2 }, 0.1)
    .to('.l-shade', { opacity: 0.8, duration: 0.2 }, 0.8);

  // sections: overlapped crossfade (prev fades out ↑24px blur→6px while next fades in)
  const blur = mobile ? 0 : 6;
  $$('.sec').forEach((sec, i) => {
    const inEl = $('.in', sec), outEl = $('.out', sec);
    if (inEl && i > 0) {
      gsap.fromTo(inEl, { opacity: 0, y: 24, filter: `blur(${blur}px)` }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top 88%', end: 'top 38%', scrub: 1 } });
      gsap.fromTo(outEl, { opacity: 1, y: 0, filter: 'blur(0px)' }, { opacity: 0, y: -24, filter: `blur(${blur}px)`, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: sec, start: 'bottom 62%', end: 'bottom 12%', scrub: 1 } });
    }
    // E1.4: title → body → meta, 80ms apart, 12px rise
    const rv = $$('.rv', sec);
    if (rv.length) gsap.from(rv, { opacity: 0, y: 12, duration: 0.6, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: sec, start: i === 0 ? 'top bottom' : 'top 70%', toggleActions: 'play none none none' } });
  });
  // hero copy drifts away first
  gsap.to('.hero-copy, .hint', { opacity: 0, y: -40, ease: 'none', scrollTrigger: { trigger: '#s0', start: 'top top', end: '60% top', scrub: 1 } });
  // wall tiles fade in along the diagonal
  gsap.from('#wall .tile', { opacity: 0, scale: 0.94, duration: 0.6, ease: 'power2.out',
    stagger: { each: 0.06, grid: [3, 3], from: 'start', axis: null }, scrollTrigger: { trigger: '#wall', start: 'top 75%' } });
  // style cards light up one by one along the beam
  gsap.from('#styles .card', { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out', stagger: 0.09, scrollTrigger: { trigger: '#styles', start: 'top 78%' } });

  mqMobile.addEventListener('change', () => location.reload());
}

/* ---------- E3 / E7 micro-interactions ---------- */
function setupMicro() {
  // glass highlight follows the pointer
  document.addEventListener('pointermove', e => {
    const g = e.target.closest && e.target.closest('.glass'); if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  document.addEventListener('pointerover', e => { const g = e.target.closest && e.target.closest('.glass'); if (g) { g.style.setProperty('--edgeB', g.getAttribute('aria-checked') === 'true' ? '1.6' : '1.2'); g.classList.add('hl'); } });
  document.addEventListener('pointerout', e => { const g = e.target.closest && e.target.closest('.glass'); if (g && !g.contains(e.relatedTarget)) { g.style.removeProperty('--edgeB'); g.classList.remove('hl'); } });
  const st = document.createElement('style'); st.textContent = '.glass.hl::after{opacity:1}'; document.head.appendChild(st);

  // touch ripple + 10ms haptic on interactive elements
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const t = e.target.closest('button,a,[role=button],[role=radio]'); if (!t || t.disabled) return;
    if (!reduced) { const r = document.createElement('span'); r.className = 'ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 650); }
    try { navigator.vibrate && navigator.vibrate(10); } catch {}
  }, { passive: true });

  // soft-light cursor (desktop, fine pointer only)
  if (reduced || !matchMedia('(pointer: fine)').matches) return;
  const c = $('#cursor'); let x = -100, y = -100, cx = x, cy = y, on = false;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!on) { on = true; cx = x; cy = y; html.classList.add('cc'); }
    c.classList.toggle('big', !!e.target.closest('a,button:not(:disabled),[role=button],[role=radio],label'));
  }, { passive: true });
  document.addEventListener('pointerleave', () => { on = false; html.classList.remove('cc'); });
  (function loop() { cx += (x - cx) * 0.35; cy += (y - cy) * 0.35; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
}

/* ---------- boot ---------- */
async function boot() {
  renderStyles(); bindStyles(); bindUpload(); renderPlaceholders(); bindFab();
  $('#genBtn').addEventListener('click', generate);
  $('#again').addEventListener('click', () => { scrollToSec('#s1'); setTimeout(() => $('#file').click(), reduced ? 0 : 600); });
  $$('.tier .btn').forEach(b => b.closest('.tier').addEventListener('click', () => toast('预览版：支付暂未开放')));
  buildLayers(); loadLeafDefs(); setupVideo(); setupScroll(); setupMicro(); setupWind();
  if (state.result) showResult(state.result, false); else showFrame('empty');
  updateGenButton(); updateFab();
  requestAnimationFrame(() => html.classList.add('ready'));     // E1 intro sequence (CSS-timed)
  try { const r = await fetch('/api/config'); if (r.ok) setQuota(await r.json()); } catch {}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
