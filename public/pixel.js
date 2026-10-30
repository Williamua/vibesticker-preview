/**
 * Pixel Desk P0 — FAR→DOLLY→DOCKED→PANEL
 * U01 walker nav · U02 layer stack + wheel · U03 boot · P01–P05
 * 2D + GSAP. Do not touch Roof/Hamza.
 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const STYLES = [
    { id: 'anime', name: '日漫', blurb: '赛璐璐线与亮色块。' },
    { id: 'chibi', name: 'Q版', blurb: '大头短身，软软的。' },
    { id: 'toy3d', name: '潮玩', blurb: '乙烯基玩具质感。' },
    { id: 'pixel', name: '像素', blurb: '16-bit 精灵感。' },
    { id: 'watercolor', name: '水彩', blurb: '湿画法晕染。' },
  ];
  const LAYERS = [
    { id: 0, key: 'overview', label: '总览' },
    { id: 1, key: 'upload', label: '上传' },
    { id: 2, key: 'style', label: '风格' },
    { id: 3, key: 'result', label: '结果' },
    { id: 4, key: 'pricing', label: '价档' },
    { id: 5, key: 'help', label: '帮助' },
  ];
  const ART = '/art/rebuild/pixel-desk';
  const DOCK_AT = 0.92;
  const UNLOCK = 0.72;
  const FAR_SNAP = 0.08;

  let progress = 0;
  let state = 'FAR';
  let layer = 0;
  let selectedStyle = localStorage.getItem('vibe-style') || 'pixel';
  let photoFile = null, photoUrl = null;
  let bootedOnce = false;
  let walking = false;
  let walkGen = 0;
    let reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let camTween = null;
  let wheelAcc = 0;
  let wheelLock = false;

  async function boot() {
    try { await VibeAPI.loadConfig(); } catch (_) {}
    showDemo(window.VibeAPI ? VibeAPI.isDemo() : true);
    updateQuota();
    forceClose($('#overlay'));
    forceClose($('#detail-overlay'));
    buildStyles();
    buildTicks();
    bindPush();
    bindPanelWheel();
    bindMods();
    bindUpload();
    bindGenerate();
    bindPricing();
    bindOverlay();
    bindUndock();
    bindCursor();
    tickClock();
    setInterval(tickClock, 15000);
    playIntro();
    applyProgress(0, false);
    setState('FAR');
    goLayer(0, { instant: true, silent: true });
  }

  function showDemo(on) { const b = $('#demo-banner'); if (b) b.hidden = !on; }
  function updateQuota() {
    const el = $('#quota'); if (!el) return;
    const c = window.VibeAPI ? VibeAPI.getConfig() : {};
    el.textContent = ((c.demoMode || c.provider === 'mock') ? '演示模式 · ' : '') + `免费剩余 ${c.freeLeft ?? 0}`;
  }
  function tickClock() {
    const el = $('#panel-clock'); if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  /* Intro title stagger */
  function playIntro() {
    const words = $$('.intro-word');
    const wrap = $('#intro-title');
    if (!wrap || !words.length) return;
    if (typeof gsap === 'undefined' || reduce()) {
      words.forEach((w) => { w.style.opacity = '1'; w.style.transform = 'none'; });
      setTimeout(() => { wrap.style.display = 'none'; }, 400);
      return;
    }
    gsap.to(words, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: 'power3.out',
      onComplete: () => {
        gsap.to(wrap, {
          opacity: 0, duration: 0.45, delay: 0.35, ease: 'power2.in',
          onComplete: () => { wrap.style.display = 'none'; },
        });
      },
    });
  }

  /* —— Camera state machine —— */
  function setState(next) {
    state = next;
    const stage = $('#stage');
    if (stage) stage.dataset.state = state;
    const docked = state === 'DOCKED' || state === 'PANEL';
    document.body.classList.toggle('is-docked', docked);
    stage?.classList.toggle('is-docked', docked);
    const panel = $('#panel');
    if (panel) panel.dataset.locked = docked ? 'false' : 'true';
    const undock = $('#undock');
    if (undock) undock.hidden = !docked;
    if (docked) stage?.classList.add('is-explored');
  }

  function applyProgress(p) {
    progress = Math.max(0, Math.min(1, p));
    paintPush(progress);
    paintCam(progress);
    paintPanelVis(progress);
  }

  function paintPush(p) {
    const fill = $('#push-fill'), knob = $('#push-knob'), tip = $('#push-tip');
    if (fill) fill.style.transform = `scaleX(${Math.max(0.04, p)})`;
    if (knob) {
      knob.style.left = (p * 100) + '%';
      knob.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    }
    if (tip) {
      tip.textContent = p < FAR_SNAP ? '拖动或滚轮 · 远 → 近'
        : p < DOCK_AT ? '继续推近 · 松手吸附'
        : '已停靠 · 滚轮切层';
    }
  }

  function paintCam(p) {
    const cam = $('#cam'); if (!cam) return;
    const scale = 1 + p * 3.4;
    const x = p * -8, y = p * 6;
    const props = { scale, xPercent: x, yPercent: y };
    if (typeof gsap === 'undefined') {
      cam.style.transform = `translate(${x}%, ${y}%) scale(${scale})`;
    } else {
      if (camTween) camTween.kill();
      gsap.set(cam, props);
    }
    const boot = $('#screen-boot');
    if (boot) boot.style.opacity = String(Math.max(0, 1 - p * 1.5));
    // env darken near dock
    document.body.style.setProperty('--fog', '#141210');
  }
  function mixFog(p) { return '#141210'; }

  function paintPanelVis(p) {
    const panel = $('#panel'); if (!panel) return;
    const t = p < UNLOCK ? 0 : (p - UNLOCK) / (1 - UNLOCK);
    if (typeof gsap !== 'undefined') gsap.set(panel, { opacity: t, scale: 0.92 + t * 0.08 });
    else { panel.style.opacity = String(t); panel.style.transform = `scale(${0.92 + t * 0.08})`; }
  }

  function snap() {
    const target = progress >= DOCK_AT * 0.55 ? 1 : 0;
    animateTo(target);
  }

  function animateTo(target) {
    const finish = async () => {
      applyProgress(target);
      if (target >= DOCK_AT) {
        setState('DOCKED');
        await runBootThenPanel();
      } else {
        setState('FAR');
        bootedOnce = bootedOnce; // keep
      }
    };
    if (typeof gsap === 'undefined' || reduce()) { finish(); return; }
    const obj = { p: progress };
    gsap.to(obj, {
      p: target, duration: 0.55, ease: 'power3.inOut',
      onUpdate: () => { applyProgress(obj.p); setState(obj.p > FAR_SNAP && obj.p < DOCK_AT ? 'DOLLY' : state); },
      onComplete: finish,
    });
  }

  /* U03 boot */
  async function runBootThenPanel() {
    if (reduce() || bootedOnce) {
      hideBoot();
      setState('PANEL');
      goLayer(layer, { instant: true, silent: true });
      return;
    }
    const seq = $('#boot-seq');
    const fill = $('#boot-fill');
    const msg = $('#boot-msg');
    if (!seq) { setState('PANEL'); return; }
    seq.hidden = false;
    if (fill) fill.style.width = '0%';
    if (msg) msg.textContent = 'POST…';
    if (typeof gsap !== 'undefined') {
      await new Promise((res) => {
        gsap.to(fill, {
          width: '100%', duration: 0.85, ease: 'power1.inOut',
          onUpdate: () => {
            const w = parseFloat(fill.style.width) || 0;
            if (msg) {
              if (w > 30) msg.textContent = 'Loading panel…';
              if (w > 70) msg.textContent = 'OK';
            }
          },
          onComplete: res,
        });
      });
    } else {
      if (fill) fill.style.width = '100%';
      await wait(400);
    }
    bootedOnce = true;
    hideBoot();
    setState('PANEL');
    goLayer(0, { instant: false, silent: true });
  }
  function hideBoot() {
    const seq = $('#boot-seq');
    if (seq) seq.hidden = true;
  }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function undock() {
    forceClose($('#overlay'));
    forceClose($('#detail-overlay'));
    hideBoot();
    animateTo(0);
  }

  /* —— Push input (FAR/DOLLY only) —— */
  function bindPush() {
    const stage = $('#stage');
    const track = $('#push-track');
    const knob = $('#push-knob');

    stage?.addEventListener('wheel', (e) => {
      if (state === 'DOCKED' || state === 'PANEL') return; // panel handler owns it
      e.preventDefault();
      applyProgress(progress + e.deltaY * 0.0012);
      setState(progress > FAR_SNAP ? 'DOLLY' : 'FAR');
      clearTimeout(bindPush._t);
      bindPush._t = setTimeout(snap, 140);
    }, { passive: false });

    let ptr = false, y0 = 0, p0 = 0;
    stage?.addEventListener('pointerdown', (e) => {
      if (state === 'DOCKED' || state === 'PANEL') return;
      if (e.target.closest('.push-dock,.panel,a,button,input,.mod-nav')) return;
      ptr = true; y0 = e.clientY; p0 = progress;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    });
    stage?.addEventListener('pointermove', (e) => {
      if (!ptr) return;
      applyProgress(p0 + (y0 - e.clientY) / (innerHeight * 0.7));
      setState('DOLLY');
    });
    const end = () => { if (!ptr) return; ptr = false; snap(); };
    stage?.addEventListener('pointerup', end);
    stage?.addEventListener('pointercancel', end);

    function fromX(cx) {
      const r = track.getBoundingClientRect();
      applyProgress((cx - r.left) / Math.max(1, r.width));
      setState(progress > FAR_SNAP ? 'DOLLY' : 'FAR');
    }
    let scrub = false;
    const down = (e) => {
      if (state === 'DOCKED' || state === 'PANEL') return;
      scrub = true;
      try { knob.setPointerCapture(e.pointerId); } catch (_) {}
      fromX(e.clientX); e.preventDefault();
    };
    knob?.addEventListener('pointerdown', down);
    track?.addEventListener('pointerdown', (e) => { if (e.target !== knob) down(e); });
    knob?.addEventListener('pointermove', (e) => { if (scrub) fromX(e.clientX); });
    const up = () => { if (!scrub) return; scrub = false; snap(); };
    knob?.addEventListener('pointerup', up);
    knob?.addEventListener('pointercancel', up);
  }

  function bindUndock() {
    $('#undock')?.addEventListener('click', undock);
  }

  /* —— U02 layer stack —— */
  function buildTicks() {
    const root = $('#layer-ticks'); if (!root) return;
    root.innerHTML = LAYERS.map((l) => `<span data-layer="${l.id}" title="${l.label}"></span>`).join('');
    root.addEventListener('click', (e) => {
      const s = e.target.closest('span'); if (!s) return;
      requestLayer(+s.dataset.layer);
    });
  }

  function bindPanelWheel() {
    const chrome = $('.panel-chrome');
    chrome?.addEventListener('wheel', (e) => {
      if (state !== 'DOCKED' && state !== 'PANEL') return;
      // if scrolling inside a tall ply that can scroll and not at edge, let it
      const ply = $('.ply.is-active');
      if (ply && ply.scrollHeight > ply.clientHeight + 4) {
        const atTop = ply.scrollTop <= 0 && e.deltaY < 0;
        const atBot = ply.scrollTop + ply.clientHeight >= ply.scrollHeight - 1 && e.deltaY > 0;
        if (!atTop && !atBot) return;
      }
      e.preventDefault();
      if (wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < 40) return;
      const dir = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      wheelLock = true;
      requestLayer(layer + dir);
      setTimeout(() => { wheelLock = false; }, 380);
    }, { passive: false });
  }

  function bindMods() {
    $('#mod-nav')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.mod'); if (!btn) return;
      requestLayer(+btn.dataset.layer);
    });
    $('#layers')?.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]'); if (!g) return;
      requestLayer(+g.dataset.goto);
    });
  }

  function requestLayer(i) {
    i = Math.max(0, Math.min(LAYERS.length - 1, i | 0));
    if (i === layer && !walking) {
      goLayer(i, { instant: true, silent: true });
      return;
    }
    // U01: walk then open
    walkToModule(i, () => goLayer(i, { instant: false }));
  }

  function goLayer(i, { instant = false, silent = false } = {}) {
    layer = i;
    const panel = $('#panel');
    if (panel) panel.dataset.layer = String(i);
    $$('.ply').forEach((el) => {
      const on = +el.dataset.layer === i;
      el.classList.toggle('is-active', on);
      el.hidden = !on;
      if (on && typeof gsap !== 'undefined' && !instant && !reduce()) {
        gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power3.out' });
      }
    });
    $$('.mod').forEach((b) => b.classList.toggle('is-on', +b.dataset.layer === i));
    $$('#layer-ticks span').forEach((s) => s.classList.toggle('is-on', +s.dataset.layer === i));
    // park walker under active mod
    parkWalker(i, instant || silent || reduce());
  }

  /* U01 walker */
  function modAnchorX(i) {
    const btn = $(`.mod[data-layer="${i}"]`);
    const dock = $('#walker-dock');
    if (!btn || !dock) return 8 + i * (84 / Math.max(1, LAYERS.length - 1));
    const br = btn.getBoundingClientRect();
    const dr = dock.getBoundingClientRect();
    return ((br.left + br.width / 2 - dr.left) / dr.width) * 100 - 4;
  }

  function parkWalker(i, instant) {
    const w = $('#walker'); if (!w) return;
    const x = modAnchorX(i);
    if (instant || typeof gsap === 'undefined') { w.style.left = x + '%'; return; }
    gsap.set(w, { left: x + '%' });
  }

  let walkTween = null;
  function walkToModule(i, done) {
    const w = $('#walker');
    const fig = w?.querySelector('.px-fig');
    if (!w) { done && done(); return; }
    const gen = ++walkGen;
    if (walkTween) { walkTween.kill(); walkTween = null; }
    if (reduce() || typeof gsap === 'undefined') {
      parkWalker(i, true);
      wave(fig, gen, done);
      return;
    }
    walking = true;
    const x = modAnchorX(i);
    const cur = parseFloat(String(w.style.left || '8').replace('%','')) || 8;
    fig?.classList.add('is-walk');
    walkTween = gsap.to(w, {
      left: x + '%',
      duration: Math.min(0.7, 0.2 + Math.abs(x - cur) / 120),
      ease: 'none',
      onComplete: () => {
        if (gen !== walkGen) return;
        fig?.classList.remove('is-walk');
        walking = false;
        walkTween = null;
        wave(fig, gen, done);
      },
    });
  }

  function wave(fig, gen, done) {
    if (!fig || reduce()) { if (gen === walkGen) done && done(); return; }
    fig.classList.add('is-wave');
    setTimeout(() => {
      fig.classList.remove('is-wave');
      if (gen === walkGen) done && done();
    }, 400);
  }

  /* Product */
  function buildStyles() {
    const root = $('#styles'); if (!root) return;
    root.innerHTML = STYLES.map((s) => `
      <button type="button" class="style-chip" role="option" data-style="${s.id}"
        aria-selected="${s.id === selectedStyle}" aria-label="${s.name}" title="${s.name}">
        <img src="${ART}/style-${s.id}.png" alt="">
      </button>`).join('');
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.style-chip'); if (!btn) return;
      // double intent: select; second click on selected opens detail
      if (btn.getAttribute('aria-selected') === 'true' && selectedStyle === btn.dataset.style) {
        const meta = STYLES.find((s) => s.id === selectedStyle);
        openDetail(`<h2>${meta.name}</h2><img src="${ART}/style-${meta.id}.png" alt=""><p>${meta.blurb}</p>`);
        return;
      }
      selectedStyle = btn.dataset.style;
      localStorage.setItem('vibe-style', selectedStyle);
      $$('.style-chip', root).forEach((b) => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
      const lab = $('#style-label');
      if (lab) lab.textContent = '当前：' + (STYLES.find((s) => s.id === selectedStyle)?.name || selectedStyle);
      syncGen();
      if (typeof gsap !== 'undefined') gsap.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
    });
  }

  function bindUpload() {
    const zone = $('#upload-zone'), input = $('#photo');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-drag'); }));
    zone.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) setPhoto(f); });
    input.addEventListener('change', () => { if (input.files?.[0]) setPhoto(input.files[0]); });
    function setPhoto(file) {
      photoFile = file;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(file);
      const thumb = $('#upload-thumb'), hint = $('#upload-hint');
      if (thumb) { thumb.src = photoUrl; thumb.hidden = false; }
      if (hint) hint.hidden = true;
      syncGen();
    }
  }
  function syncGen() {
    const b = $('#gen-btn');
    if (b) b.disabled = !(photoFile && selectedStyle);
  }

  function bindGenerate() {
    const btn = $('#gen-btn'); if (!btn) return;
    btn.addEventListener('click', async () => {
      if (btn.disabled || !photoFile) return;
      btn.disabled = true; btn.textContent = '绘制中…';
      try {
        const j = await VibeAPI.generate(photoFile, selectedStyle);
        updateQuota();
        if (VibeAPI.isDemo()) showDemo(true);
        const img = $('#result-img'), empty = $('#result-empty'), acts = $('#result-actions');
        if (img) { img.src = `${j.png}?t=${Date.now()}`; img.hidden = false; }
        if (empty) empty.hidden = true;
        if (acts) acts.hidden = false;
        const dlP = $('#dl-png'), dlG = $('#dl-gif');
        if (dlP) { dlP.href = `${j.png}?dl=1`; }
        if (dlG) { dlG.href = `${j.gif}?dl=1`; }
        if (typeof gsap !== 'undefined') gsap.from('#result-img', { scale: 0.75, opacity: 0, duration: 0.4, ease: 'back.out(1.7)' });
        requestLayer(3);
      } catch (e) {
        openSheet(`<h2>失败</h2><p>${e.message || '生成失败'}</p>`);
      } finally {
        btn.textContent = '生成贴纸';
        syncGen();
      }
    });
    $('#open-lightbox')?.addEventListener('click', () => {
      const img = $('#result-img');
      if (!img || img.hidden) return;
      openSheet(`<h2>预览</h2><img src="${img.src}" alt="结果" style="width:100%">`);
    });
  }

  function bindPricing() {
    $$('.buy').forEach((b) => b.addEventListener('click', async () => {
      try {
        const j = await VibeAPI.checkout(b.dataset.tier);
        if (j.url) location.href = j.url;
        else alert(j.error || '失败');
      } catch (e) { alert(e.message); }
    }));
  }

  function openSheet(html) {
    const ov = $('#overlay'), body = $('#sheet-body');
    if (!ov || !body || !html?.trim()) return;
    body.innerHTML = html;
    ov.hidden = false; ov.classList.add('is-open');
    if (typeof gsap !== 'undefined') gsap.fromTo('#sheet', { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: 'power3.out' });
  }
  function openDetail(html) {
    const ov = $('#detail-overlay'), body = $('#detail-body');
    if (!ov || !body) return;
    body.innerHTML = html;
    ov.hidden = false; ov.classList.add('is-open');
  }
  function forceClose(ov) {
    if (!ov) return;
    ov.hidden = true; ov.classList.remove('is-open');
  }
  function bindOverlay() {
    $('#sheet-close')?.addEventListener('click', () => forceClose($('#overlay')));
    $('#detail-close')?.addEventListener('click', () => forceClose($('#detail-overlay')));
    $('#overlay')?.addEventListener('click', (e) => { if (e.target.id === 'overlay') forceClose($('#overlay')); });
    $('#detail-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'detail-overlay') forceClose($('#detail-overlay')); });
    addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if ($('#overlay')?.classList.contains('is-open')) return forceClose($('#overlay'));
      if ($('#detail-overlay')?.classList.contains('is-open')) return forceClose($('#detail-overlay'));
      if (state === 'PANEL' || state === 'DOCKED') undock();
    });
  }

  function bindCursor() {
    const cur = $('#cursor');
    if (!cur || !matchMedia('(pointer: fine)').matches) { cur && (cur.style.display = 'none'); return; }
    document.body.classList.add('has-cursor');
    addEventListener('pointermove', (e) => {
      cur.style.left = e.clientX + 'px';
      cur.style.top = e.clientY + 'px';
    }, { passive: true });
    const labelSel = '.mod,.ov-card,.style-chip,.btn-primary,.upload';
    addEventListener('pointerover', (e) => {
      if (e.target.closest(labelSel)) cur.classList.add('is-label');
    });
    addEventListener('pointerout', (e) => {
      if (e.target.closest(labelSel)) cur.classList.remove('is-label');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
