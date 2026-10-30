/** Pixel Desk — r4-headless + head-back FAR; sky; orbit; glow; dock; trash delete; idle fx */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ART = '/art/rebuild/pixel-desk';
  const STYLES = [
    { id: 'anime', name: '日漫', blurb: '赛璐璐线与亮色块。' },
    { id: 'chibi', name: 'Q版', blurb: '大头短身。' },
    { id: 'toy3d', name: '潮玩', blurb: '乙烯基质感。' },
    { id: 'pixel', name: '像素', blurb: '16-bit。' },
    { id: 'watercolor', name: '水彩', blurb: '湿画法晕染。' },
  ];
  const LAYERS = [0, 1, 2, 3, 4, 5];
  const DOCK_AT = 0.92, UNLOCK = 0.72, FAR_SNAP = 0.08;
  const HEAD_MAX = 12;
  const ORBIT_MAX = 14;

  let progress = 0, state = 'FAR', layer = 0;
  let selectedStyle = localStorage.getItem('vibe-style') || 'pixel';
  let photoFile = null, photoUrl = null, bootedOnce = false;
  let walking = false, walkGen = 0, walkTween = null, wheelAcc = 0, wheelLock = false;
  let headTarget = 0, headCurrent = 0, orbitX = 0, orbitY = 0, orbitTX = 0, orbitTY = 0;
  let orbitDrag = false, orbitMoved = false, pushDragging = false;
  let rafId = 0;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function boot() {
    try { await VibeAPI.loadConfig(); } catch (_) {}
    showDemo(window.VibeAPI ? VibeAPI.isDemo() : true);
    updateQuota();
    forceClose($('#overlay')); forceClose($('#detail-overlay'));
    applySky();
    const hero = $('#hero-base');
    if (hero) hero.addEventListener('error', () => {
      hero.src = ART + '/hero-wide-r5.jpg';
    });
    buildStyles(); buildTicks();
    bindPush(); bindOrbit(); bindHead(); bindMonitor(); bindTrash();
    bindPanelWheel(); bindModbar(); bindUpload(); bindGenerate(); bindPricing();
    bindOverlay(); bindUndock(); bindIdleFx();
    $('#layers')?.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]'); if (g) requestLayer(+g.dataset.goto);
    });
    tickClock(); setInterval(tickClock, 15000);
    playIntro(); applyProgress(0); setState('FAR'); goLayer(0, { instant: true, silent: true });
    startRaf();
  }

  function showDemo(on) { const b = $('#demo-banner'); if (b) b.hidden = !on; }
  function updateQuota() {
    const el = $('#quota'); if (!el) return;
    const c = window.VibeAPI ? VibeAPI.getConfig() : {};
    el.textContent = ((c.demoMode || c.provider === 'mock') ? '演示模式 · ' : '') + `免费剩余 ${c.freeLeft ?? 0}`;
  }
  function tickClock() {
    const el = $('#panel-clock'); if (!el) return;
    el.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const SKY_LABELS = { dawn: '清晨', morning: '上午', afternoon: '下午', evening: '傍晚', night: '夜晚' };
  let skyCfg = {
    periodSec: 30, stages: ['dawn','morning','afternoon','evening','night'],
    files: { dawn:'sky-dawn.jpg', morning:'sky-morning.jpg', afternoon:'sky-afternoon.jpg', evening:'sky-evening.jpg', night:'sky-night.jpg' },
    perStageSec: 6,
  };
  let skyIdx = 3; // evening first
  let skyFrontIsA = true;
  let skyTimer = 0;

  async function loadSkyCycle() {
    try {
      const r = await fetch(ART + '/sky-cycle.json', { cache: 'no-store' });
      if (r.ok) skyCfg = Object.assign(skyCfg, await r.json());
    } catch (_) {}
    const stages = skyCfg.stages || ['evening'];
    // start near local hour if possible
    const h = new Date().getHours();
    let prefer = 'evening';
    if (h >= 5 && h < 8) prefer = 'dawn';
    else if (h >= 8 && h < 12) prefer = 'morning';
    else if (h >= 12 && h < 17) prefer = 'afternoon';
    else if (h >= 17 && h < 20) prefer = 'evening';
    else prefer = 'night';
    skyIdx = Math.max(0, stages.indexOf(prefer));
    if (skyIdx < 0) skyIdx = 0;
    const a = $('#sky-a'), b = $('#sky-b');
    const file = skyCfg.files[stages[skyIdx]] || 'sky-evening.jpg';
    if (a) { a.src = ART + '/' + file; a.classList.add('is-on'); }
    if (b) { b.src = ART + '/' + (skyCfg.files[stages[(skyIdx+1)%stages.length]] || file); b.classList.remove('is-on'); }
    paintSkyClaim(stages[skyIdx]);
    if (!reduce()) startSkyLoop();
  }

  function paintSkyClaim(stage) {
    const st = $('#stage'); if (st) st.dataset.sky = stage;
    const claim = $('#far-claim');
    if (claim) claim.innerHTML = (SKY_LABELS[stage] || stage) + '的高楼窗外。<em>拖或滚</em>靠近设计台。';
  }

  function startSkyLoop() {
    clearInterval(skyTimer);
    const stages = skyCfg.stages || [];
    if (stages.length < 2) return;
    const per = (skyCfg.perStageSec || (skyCfg.periodSec || 30) / stages.length) * 1000;
    skyTimer = setInterval(() => {
      const next = (skyIdx + 1) % stages.length;
      const file = skyCfg.files[stages[next]];
      if (!file) return;
      const front = skyFrontIsA ? $('#sky-a') : $('#sky-b');
      const back = skyFrontIsA ? $('#sky-b') : $('#sky-a');
      if (!front || !back) return;
      back.src = ART + '/' + file;
      // force reflow then crossfade
      back.classList.remove('is-on');
      void back.offsetWidth;
      back.classList.add('is-on');
      front.classList.remove('is-on');
      skyFrontIsA = !skyFrontIsA;
      skyIdx = next;
      paintSkyClaim(stages[skyIdx]);
    }, per);
  }

  function applySky() { loadSkyCycle(); }

  function playIntro() {
    const words = $$('.intro-word'), wrap = $('#intro-title');
    if (!wrap || !words.length) return;
    if (typeof gsap === 'undefined' || reduce()) {
      words.forEach((w) => { w.style.opacity = '1'; w.style.transform = 'none'; });
      setTimeout(() => { wrap.style.display = 'none'; }, 300); return;
    }
    gsap.to(words, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out',
      onComplete: () => gsap.to(wrap, { opacity: 0, duration: 0.35, delay: 0.25, onComplete: () => { wrap.style.display = 'none'; } }),
    });
  }

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
    paintPush(progress); paintCam(progress); paintPanelVis(progress);
  }
  function paintPush(p) {
    const fill = $('#push-fill'), knob = $('#push-knob'), tip = $('#push-tip');
    if (fill) fill.style.transform = `scaleX(${Math.max(0.04, p)})`;
    if (knob) { knob.style.left = (p * 100) + '%'; knob.setAttribute('aria-valuenow', String(Math.round(p * 100))); }
    if (tip) tip.textContent = p < FAR_SNAP ? '推近' : p < DOCK_AT ? '继续…' : '已停靠';
  }
  function paintCam(p) {
    const cam = $('#cam');
    const scale = 1 + p * 2.6;
    const y = p * 6;
    const ox = orbitX * (1 - p * 0.85);
    const oy = orbitY * (1 - p * 0.85);
    if (cam) {
      cam.style.transform = `translate(${ox}%, ${y + oy * 0.35}%) scale(${scale}) rotateY(${ox * 0.9}deg) rotateX(${-oy * 0.5}deg)`;
    }
  }
  function paintPanelVis(p) {
    const panel = $('#panel'); if (!panel) return;
    const t = p < UNLOCK ? 0 : (p - UNLOCK) / (1 - UNLOCK);
    if (typeof gsap !== 'undefined') gsap.set(panel, { opacity: t, scale: 0.94 + t * 0.06 });
    else { panel.style.opacity = String(t); panel.style.transform = `scale(${0.94 + t * 0.06})`; }
  }
  function snap() { animateTo(progress >= DOCK_AT * 0.55 ? 1 : 0); }
  function animateTo(target) {
    const finish = async () => {
      applyProgress(target);
      if (target >= DOCK_AT) { setState('DOCKED'); await runBootThenPanel(); }
      else setState('FAR');
    };
    if (typeof gsap === 'undefined' || reduce()) { finish(); return; }
    const obj = { p: progress };
    gsap.to(obj, {
      p: target, duration: 0.55, ease: 'power3.inOut',
      onUpdate: () => { applyProgress(obj.p); if (obj.p > FAR_SNAP && obj.p < DOCK_AT) setState('DOLLY'); },
      onComplete: finish,
    });
  }
  async function runBootThenPanel() {
    if (reduce() || bootedOnce) { hideBoot(); setState('PANEL'); goLayer(layer, { instant: true, silent: true }); return; }
    const seq = $('#boot-seq'), fill = $('#boot-fill'), msg = $('#boot-msg');
    if (!seq) { setState('PANEL'); return; }
    seq.hidden = false;
    if (fill) fill.style.width = '0%';
    if (typeof gsap !== 'undefined') {
      await new Promise((res) => gsap.to(fill, {
        width: '100%', duration: 0.7, ease: 'power1.inOut',
        onUpdate: () => { const w = parseFloat(fill.style.width) || 0; if (msg) msg.textContent = w > 60 ? '就绪' : '启动中…'; },
        onComplete: res,
      }));
    } else { if (fill) fill.style.width = '100%'; await wait(400); }
    bootedOnce = true; hideBoot(); setState('PANEL'); goLayer(0, { instant: false, silent: true });
  }
  function hideBoot() { const s = $('#boot-seq'); if (s) s.hidden = true; }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function undock() {
    forceClose($('#overlay')); forceClose($('#detail-overlay')); hideBoot();
    orbitTX = orbitTY = 0;
    animateTo(0);
  }

  function bindPush() {
    const stage = $('#stage'), track = $('#push-track'), knob = $('#push-knob');
    stage?.addEventListener('wheel', (e) => {
      if (state === 'DOCKED' || state === 'PANEL') return;
      e.preventDefault();
      applyProgress(progress + e.deltaY * 0.0012);
      setState(progress > FAR_SNAP ? 'DOLLY' : 'FAR');
      clearTimeout(bindPush._t); bindPush._t = setTimeout(snap, 140);
    }, { passive: false });
    function fromX(cx) {
      const r = track.getBoundingClientRect();
      applyProgress((cx - r.left) / Math.max(1, r.width));
      setState(progress > FAR_SNAP ? 'DOLLY' : 'FAR');
    }
    let scrub = false;
    const down = (e) => {
      if (state === 'DOCKED' || state === 'PANEL') return;
      scrub = true; pushDragging = true;
      try { knob.setPointerCapture(e.pointerId); } catch (_) {}
      fromX(e.clientX); e.preventDefault();
    };
    knob?.addEventListener('pointerdown', down);
    track?.addEventListener('pointerdown', (e) => { if (e.target !== knob) down(e); });
    knob?.addEventListener('pointermove', (e) => { if (scrub) fromX(e.clientX); });
    const up = () => { if (!scrub) return; scrub = false; pushDragging = false; snap(); };
    knob?.addEventListener('pointerup', up); knob?.addEventListener('pointercancel', up);
  }
  function bindUndock() { $('#undock')?.addEventListener('click', undock); }

  function bindOrbit() {
    const stage = $('#stage');
    let x0 = 0, y0 = 0, ox0 = 0, oy0 = 0;
    stage?.addEventListener('pointerdown', (e) => {
      if (state === 'DOCKED' || state === 'PANEL') return;
      if (e.target.closest('.push-dock,.panel,a,button,input,.modbar,.trash-hot,.monitor-hit')) return;
      orbitDrag = true; orbitMoved = false;
      x0 = e.clientX; y0 = e.clientY; ox0 = orbitTX; oy0 = orbitTY;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    });
    stage?.addEventListener('pointermove', (e) => {
      if (!orbitDrag) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) + Math.abs(dy) > 6) orbitMoved = true;
      // horizontal drag = orbit around desk; vertical = dolly
      orbitTX = Math.max(-ORBIT_MAX, Math.min(ORBIT_MAX, ox0 + dx / innerWidth * ORBIT_MAX * 2.2));
      orbitTY = Math.max(-ORBIT_MAX * 0.5, Math.min(ORBIT_MAX * 0.5, oy0 + dy / innerHeight * ORBIT_MAX));
      applyProgress(Math.max(0, Math.min(1, progress + (-dy) / (innerHeight * 1.4) * 0.002))); // subtle
      // better: map vertical drag to progress from start
      const p0 = bindOrbit._p0 != null ? bindOrbit._p0 : progress;
      if (bindOrbit._p0 == null) bindOrbit._p0 = progress;
      applyProgress(bindOrbit._p0 + (y0 - e.clientY) / (innerHeight * 0.75));
      if (progress > FAR_SNAP) setState('DOLLY');
    });
    const end = () => {
      if (!orbitDrag) return;
      orbitDrag = false; bindOrbit._p0 = null;
      // release: ease orbit back toward center (default), snap dolly
      orbitTX *= 0.35; orbitTY *= 0.35;
      if (!orbitMoved && progress < FAR_SNAP) return;
      snap();
    };
    stage?.addEventListener('pointerup', end);
    stage?.addEventListener('pointercancel', end);
  }

  function bindHead() {
    const stage = $('#stage');
    stage?.addEventListener('pointermove', (e) => {
      if (reduce() || state === 'DOCKED' || state === 'PANEL') return;
      const nx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
      headTarget = nx * HEAD_MAX;
    });
    stage?.addEventListener('pointerleave', () => { headTarget = 0; });
  }

  function bindMonitor() {
    const hit = $('#monitor-hit'), stage = $('#stage');
    hit?.addEventListener('pointerenter', () => stage?.classList.add('is-monitor-hover'));
    hit?.addEventListener('pointerleave', () => stage?.classList.remove('is-monitor-hover'));
    hit?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state === 'FAR' || state === 'DOLLY') animateTo(1);
    });
  }

  function startRaf() {
    cancelAnimationFrame(rafId);
    const tick = () => {
      const lerp = reduce() ? 1 : 0.12;
      headCurrent += (headTarget - headCurrent) * lerp;
      orbitX += (orbitTX - orbitX) * (reduce() ? 1 : 0.14);
      orbitY += (orbitTY - orbitY) * (reduce() ? 1 : 0.14);
      const wrap = $('#head-wrap');
      if (wrap && !reduce()) {
        const stretch = wrap.classList.contains('is-stretch') ? '' : '';
        wrap.style.transform = `rotateY(${headCurrent}deg) rotateZ(${headCurrent * 0.18}deg)`;
      } else if (wrap && reduce()) {
        wrap.style.transform = 'none';
      }
      paintCam(progress);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function bindIdleFx() {
    if (reduce()) return;
    const stretch = () => {
      if (state !== 'FAR' && state !== 'DOLLY') return;
      const wrap = $('#head-wrap');
      if (!wrap) return;
      wrap.classList.remove('is-stretch');
      void wrap.offsetWidth;
      wrap.classList.add('is-stretch');
      setTimeout(() => wrap.classList.remove('is-stretch'), 1000);
    };
    const loop = () => {
      const waitMs = 8000 + Math.random() * 12000;
      setTimeout(() => { stretch(); loop(); }, waitMs);
    };
    setTimeout(loop, 5000);
  }

  function clearPhoto() {
    photoFile = null;
    if (photoUrl) { URL.revokeObjectURL(photoUrl); photoUrl = null; }
    const thumb = $('#upload-thumb'), hint = $('#upload-hint'), del = $('#upload-del');
    if (thumb) { thumb.removeAttribute('src'); thumb.hidden = true; }
    if (hint) hint.hidden = false;
    if (del) del.hidden = true;
    syncGen();
  }

  function bindTrash() {
    const trash = $('#trash-hot'), img = $('#trash-img');
    const setOpen = (on) => {
      trash?.classList.toggle('is-hot', on);
      if (img) img.src = ART + (on ? '/ui-trash-open.png' : '/ui-trash-closed.png');
    };
    ['dragenter', 'dragover'].forEach((ev) => trash?.addEventListener(ev, (e) => {
      e.preventDefault(); setOpen(true);
    }));
    ['dragleave', 'drop'].forEach((ev) => trash?.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'drop' && photoFile) clearPhoto();
      setOpen(false);
    }));
  }

  function buildTicks() {
    const root = $('#layer-ticks'); if (!root) return;
    root.innerHTML = LAYERS.map((i) => `<span data-layer="${i}"></span>`).join('');
    root.addEventListener('click', (e) => { const s = e.target.closest('span'); if (s) requestLayer(+s.dataset.layer); });
  }
  function bindPanelWheel() {
    $('.panel-chrome')?.addEventListener('wheel', (e) => {
      if (state !== 'DOCKED' && state !== 'PANEL') return;
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
      const dir = wheelAcc > 0 ? 1 : -1; wheelAcc = 0; wheelLock = true;
      requestLayer(layer + dir);
      setTimeout(() => { wheelLock = false; }, 380);
    }, { passive: false });
  }
  function bindModbar() {
    $('#modbar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.modbar-item'); if (!btn) return;
      const i = +btn.dataset.layer;
      if (state === 'FAR' || state === 'DOLLY') {
        animateTo(1);
        const t = setInterval(() => {
          if (state === 'PANEL' || state === 'DOCKED') { clearInterval(t); requestLayer(i); }
        }, 120);
        setTimeout(() => clearInterval(t), 3500);
        return;
      }
      requestLayer(i);
    });
  }
  function requestLayer(i) {
    i = Math.max(0, Math.min(LAYERS.length - 1, i | 0));
    walkToModule(i, () => goLayer(i, { instant: false }));
  }
  function goLayer(i, { instant = false, silent = false } = {}) {
    layer = i;
    const panel = $('#panel'); if (panel) panel.dataset.layer = String(i);
    $$('.ply').forEach((el) => {
      const on = +el.dataset.layer === i;
      el.classList.toggle('is-active', on); el.hidden = !on;
      if (on && typeof gsap !== 'undefined' && !instant && !reduce()) {
        gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' });
      }
    });
    $$('.modbar-item').forEach((b) => b.classList.toggle('is-on', +b.dataset.layer === i));
    $$('#layer-ticks span').forEach((s) => s.classList.toggle('is-on', +s.dataset.layer === i));
    parkWalker(i, instant || silent || reduce());
  }
  function modAnchorX(i) { return 6 + (i / Math.max(1, LAYERS.length - 1)) * 82; }
  function parkWalker(i, instant) {
    const w = $('#walker'); if (!w) return;
    const x = modAnchorX(i);
    if (instant || typeof gsap === 'undefined') { w.style.left = x + '%'; return; }
    gsap.set(w, { left: x + '%' });
  }
  function walkToModule(i, done) {
    const w = $('#walker'), fig = $('#walker-fig');
    if (!w) { done && done(); return; }
    const gen = ++walkGen;
    if (walkTween) { walkTween.kill(); walkTween = null; }
    if (reduce() || typeof gsap === 'undefined') {
      parkWalker(i, true); fig?.classList.add('is-wave');
      setTimeout(() => { fig?.classList.remove('is-wave'); if (gen === walkGen) done && done(); }, 280);
      return;
    }
    walking = true; fig?.classList.add('is-walk');
    const x = modAnchorX(i);
    const cur = parseFloat(String(w.style.left || '8').replace('%', '')) || 8;
    walkTween = gsap.to(w, {
      left: x + '%', duration: Math.min(0.7, 0.2 + Math.abs(x - cur) / 110), ease: 'none',
      onComplete: () => {
        if (gen !== walkGen) return;
        fig?.classList.remove('is-walk'); fig?.classList.add('is-wave');
        walking = false; walkTween = null;
        setTimeout(() => { fig?.classList.remove('is-wave'); if (gen === walkGen) done && done(); }, 360);
      },
    });
  }

  function buildStyles() {
    const root = $('#styles'); if (!root) return;
    root.innerHTML = STYLES.map((s) => `
      <button type="button" class="style-chip" role="option" data-style="${s.id}"
        aria-selected="${s.id === selectedStyle}" aria-label="${s.name}">
        <img src="${ART}/style-${s.id}.png" alt="">
      </button>`).join('');
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.style-chip'); if (!btn) return;
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
    });
  }
  function bindUpload() {
    const zone = $('#upload-zone'), input = $('#photo'), del = $('#upload-del');
    if (!zone || !input) return;
    zone.addEventListener('click', (e) => {
      if (e.target.closest('.upload-del')) return;
      input.click();
    });
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-drag'); }));
    zone.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) setPhoto(f); });
    input.addEventListener('change', () => { if (input.files?.[0]) setPhoto(input.files[0]); });
    del?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); clearPhoto(); });
    function setPhoto(file) {
      photoFile = file;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(file);
      const thumb = $('#upload-thumb'), hint = $('#upload-hint');
      if (thumb) {
        thumb.src = photoUrl; thumb.hidden = false; thumb.draggable = true;
        thumb.ondragstart = (ev) => {
          ev.dataTransfer?.setData('text/plain', 'photo');
          ev.dataTransfer.effectAllowed = 'move';
        };
      }
      if (hint) hint.hidden = true;
      if (del) del.hidden = false;
      syncGen();
    }
  }
  function syncGen() { const b = $('#gen-btn'); if (b) b.disabled = !(photoFile && selectedStyle); }

  function flyPrint(src) {
    const el = $('#print-sticker'); if (!el || reduce()) return;
    el.hidden = false; el.src = src;
    el.style.opacity = '1';
    el.style.left = '46%'; el.style.top = '46%';
    el.style.transform = 'translate(-50%,-50%) scale(.4)';
    if (typeof gsap === 'undefined') {
      setTimeout(() => { el.hidden = true; }, 900); return;
    }
    gsap.fromTo(el,
      { opacity: 0, scale: 0.3, xPercent: -50, yPercent: -50, left: '48%', top: '50%' },
      {
        opacity: 1, scale: 1, left: '72%', top: '28%', duration: 0.85, ease: 'power2.out',
        onComplete: () => gsap.to(el, {
          opacity: 0, y: -40, duration: 0.35, delay: 0.2,
          onComplete: () => { el.hidden = true; },
        }),
      });
  }

  function bindGenerate() {
    const btn = $('#gen-btn'); if (!btn) return;
    btn.addEventListener('click', async () => {
      if (btn.disabled || !photoFile) return;
      btn.disabled = true; btn.textContent = '绘制中…';
      try {
        const j = await VibeAPI.generate(photoFile, selectedStyle);
        updateQuota(); if (VibeAPI.isDemo()) showDemo(true);
        const img = $('#result-img'), empty = $('#result-empty'), acts = $('#result-actions');
        if (img) { img.src = `${j.png}?t=${Date.now()}`; img.hidden = false; }
        if (empty) empty.hidden = true; if (acts) acts.hidden = false;
        const dlP = $('#dl-png'), dlG = $('#dl-gif');
        if (dlP) dlP.href = `${j.png}?dl=1`; if (dlG) dlG.href = `${j.gif}?dl=1`;
        flyPrint(`${j.png}?t=${Date.now()}`);
        requestLayer(3);
      } catch (e) { openSheet(`<h2>失败</h2><p>${e.message || '生成失败'}</p>`); }
      finally { btn.textContent = '生成贴纸'; syncGen(); }
    });
  }
  function bindPricing() {
    $$('.buy').forEach((b) => b.addEventListener('click', async () => {
      try {
        const j = await VibeAPI.checkout(b.dataset.tier);
        if (j.url) location.href = j.url; else alert(j.error || '失败');
      } catch (e) { alert(e.message); }
    }));
  }
  function openSheet(html) {
    const ov = $('#overlay'), body = $('#sheet-body');
    if (!ov || !body || !html?.trim()) return;
    body.innerHTML = html; ov.hidden = false; ov.classList.add('is-open');
  }
  function openDetail(html) {
    const ov = $('#detail-overlay'), body = $('#detail-body');
    if (!ov || !body) return;
    body.innerHTML = html; ov.hidden = false; ov.classList.add('is-open');
  }
  function forceClose(ov) { if (!ov) return; ov.hidden = true; ov.classList.remove('is-open'); }
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
