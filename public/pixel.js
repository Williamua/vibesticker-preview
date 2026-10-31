/** Pixel Desk — Hamza orbit/dock/surface state machine + VibeSticker locked art */
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

  /* Hamza-style: mouse ~6px / touch ~12px before drag counts */
  const DRAG_THRESH_MOUSE = 6;
  const DRAG_THRESH_TOUCH = 12;
  const HEAD_MAX = 12;
  const YAW_MAX = 16;
  const PITCH_MAX = 7;
  const DOCK_SCALE = 2.35;
  const DOCK_TX = 2;   /* % nudge toward monitor */
  const DOCK_TY = 4;

  let state = 'FAR'; /* FAR | ORBIT | DOCKING | DOCKED | PANEL */
  let layer = 0;
  let selectedStyle = localStorage.getItem('vibe-style') || 'pixel';
  let photoFile = null, photoUrl = null, bootedOnce = false;
  let walking = false, walkGen = 0, walkTween = null, wheelAcc = 0, wheelLock = false;
  let rafId = 0;

  /* orbit targets + smoothed (Hamza ll/sx lerp) */
  let yawT = 0, pitchT = 0, yaw = 0, pitch = 0;
  let headT = 0, head = 0;
  let zoomT = 1, zoom = 1, camTX = 0, camTY = 0, camTXT = 0, camTYT = 0;

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFine = () => matchMedia('(pointer: fine)').matches;

  async function boot() {
    try { await VibeAPI.loadConfig(); } catch (_) {}
    showDemo(window.VibeAPI ? VibeAPI.isDemo() : true);
    updateQuota();
    forceClose($('#overlay')); forceClose($('#detail-overlay'));
    applySky();
    buildStyles(); buildTicks();
    bindPointerRoom(); bindHead(); bindMonitor(); bindTrash();
    bindPanelWheel(); bindModbar(); bindUpload(); bindGenerate(); bindPricing();
    bindOverlay(); bindUndock(); bindIdleFx();
    $('#layers')?.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]'); if (g) requestLayer(+g.dataset.goto);
    });
    tickClock(); setInterval(tickClock, 15000);
    playIntro();
    setState('FAR');
    goLayer(0, { instant: true, silent: true });
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

  /* —— Sky 30s five-stage cycle —— */
  const SKY_LABELS = { dawn: '清晨', morning: '上午', afternoon: '下午', evening: '傍晚', night: '夜晚' };
  let skyCfg = {
    periodSec: 30, stages: ['dawn', 'morning', 'afternoon', 'evening', 'night'],
    files: { dawn: 'sky-dawn.jpg', morning: 'sky-morning.jpg', afternoon: 'sky-afternoon.jpg', evening: 'sky-evening.jpg', night: 'sky-night.jpg' },
    perStageSec: 6,
  };
  let skyIdx = 3, skyFrontIsA = true, skyTimer = 0;

  async function loadSkyCycle() {
    try {
      const r = await fetch(ART + '/sky-cycle.json', { cache: 'no-store' });
      if (r.ok) skyCfg = Object.assign(skyCfg, await r.json());
    } catch (_) {}
    const stages = skyCfg.stages || ['evening'];
    skyIdx = Math.max(0, stages.indexOf('evening'));
    if (skyIdx < 0) skyIdx = 0;
    const a = $('#sky-a'), b = $('#sky-b');
    const file = skyCfg.files[stages[skyIdx]] || 'sky-evening.jpg';
    if (a) { a.src = ART + '/' + file; a.classList.add('is-on'); }
    if (b) {
      b.src = ART + '/' + (skyCfg.files[stages[(skyIdx + 1) % stages.length]] || file);
      b.classList.remove('is-on');
    }
    paintSkyClaim(stages[skyIdx]);
    if (!reduce()) startSkyLoop();
  }
  function paintSkyClaim(stage) {
    const st = $('#stage'); if (st) st.dataset.sky = stage;
    const claim = $('#far-claim');
    if (claim && !document.body.classList.contains('docked')) {
      claim.innerHTML = (SKY_LABELS[stage] || stage) + '的高楼窗外。<em>拖动环视</em> · 点击电脑靠近。';
    }
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
      onComplete: () => gsap.to(wrap, {
        opacity: 0, duration: 0.35, delay: 0.25,
        onComplete: () => { wrap.style.display = 'none'; },
      }),
    });
  }

  /* —— State machine —— */
  function setState(next) {
    state = next;
    const stage = $('#stage');
    if (stage) stage.dataset.state = state;
    const docked = state === 'DOCKED' || state === 'PANEL' || state === 'DOCKING';
    document.body.classList.toggle('docked', docked);
    document.body.classList.toggle('is-docked', docked);
    stage?.classList.toggle('is-docked', docked);
    if (docked) stage?.classList.add('is-explored');
  }

  function paintCam() {
    const cam = $('#cam');
    if (!cam) return;
    /* orbit around monitor pivot; dock = push-in scale */
    cam.style.transform =
      `translate(${camTX}%, ${camTY}%) scale(${zoom}) rotateY(${yaw}deg) rotateX(${-pitch}deg)`;
  }

  function startRaf() {
    cancelAnimationFrame(rafId);
    const tick = () => {
      const k = reduce() ? 1 : 0.12;
      const ko = reduce() ? 1 : 0.1;
      head += (headT - head) * k;
      yaw += (yawT - yaw) * ko;
      pitch += (pitchT - pitch) * ko;
      zoom += (zoomT - zoom) * (reduce() ? 1 : 0.08);
      camTX += (camTXT - camTX) * (reduce() ? 1 : 0.08);
      camTY += (camTYT - camTY) * (reduce() ? 1 : 0.08);
      const wrap = $('#head-wrap');
      if (wrap) {
        wrap.style.transform = reduce()
          ? 'none'
          : `rotateY(${head}deg) rotateZ(${head * 0.18}deg)`;
      }
      paintCam();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  /* —— Hamza pointer: threshold separates drag (orbit) from click (dock) —— */
  function bindPointerRoom() {
    const stage = $('#stage');
    if (!stage) return;

    let ptrId = null, x0 = 0, y0 = 0, yaw0 = 0, pitch0 = 0;
    let dragging = false, moved = false;
    let downOnMonitor = false;

    const thresh = () => (isFine() ? DRAG_THRESH_MOUSE : DRAG_THRESH_TOUCH);

    stage.addEventListener('pointerdown', (e) => {
      if (document.body.classList.contains('docked')) return;
      if (e.target.closest('.surface,.modbar,a,button:not(.monitor-hit),input,.trash-hot,.overlay')) return;
      ptrId = e.pointerId;
      x0 = e.clientX; y0 = e.clientY;
      yaw0 = yawT; pitch0 = pitchT;
      dragging = true; moved = false;
      downOnMonitor = !!e.target.closest('.monitor-hit');
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    });

    stage.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== ptrId) return;
      if (document.body.classList.contains('docked')) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (!moved && Math.hypot(dx, dy) >= thresh()) moved = true;
      if (!moved) return;
      /* horizontal → yaw, vertical → mild pitch (orbit around monitor) */
      yawT = Math.max(-YAW_MAX, Math.min(YAW_MAX, yaw0 + dx / Math.max(1, innerWidth) * YAW_MAX * 2.4));
      pitchT = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitch0 + dy / Math.max(1, innerHeight) * PITCH_MAX * 1.6));
      if (state === 'FAR') setState('ORBIT');
      /* head also tracks while orbiting */
      if (!reduce()) {
        const nx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
        headT = nx * HEAD_MAX;
      }
    });

    const end = (e) => {
      if (!dragging || (e && e.pointerId !== ptrId)) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      ptrId = null;
      if (document.body.classList.contains('docked')) return;

      if (!moved && downOnMonitor) {
        /* click on monitor → dock */
        dock();
        return;
      }
      if (!moved) return;

      /* release: soft settle toward center (natural default) */
      yawT *= 0.28;
      pitchT *= 0.28;
      setState(Math.abs(yawT) + Math.abs(pitchT) > 0.4 ? 'ORBIT' : 'FAR');
    };

    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('lostpointercapture', end);
  }

  function bindHead() {
    const stage = $('#stage');
    stage?.addEventListener('pointermove', (e) => {
      if (reduce() || document.body.classList.contains('docked')) return;
      /* idle head look when not actively dragging threshold-cross yet */
      const nx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
      headT = nx * HEAD_MAX;
    });
    stage?.addEventListener('pointerleave', () => { if (!reduce()) headT = 0; });
  }

  function bindMonitor() {
    const hit = $('#monitor-hit'), stage = $('#stage');
    hit?.addEventListener('pointerenter', () => {
      if (!document.body.classList.contains('docked')) stage?.classList.add('is-monitor-hover');
    });
    hit?.addEventListener('pointerleave', () => stage?.classList.remove('is-monitor-hover'));
    /* click handled via pointer threshold in bindPointerRoom; also allow keyboard */
    hit?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dock(); }
    });
  }

  async function dock() {
    if (state === 'DOCKING' || state === 'DOCKED' || state === 'PANEL') return;
    setState('DOCKING');
    $('#stage')?.classList.remove('is-monitor-hover');
    /* camera push-in toward monitor; surface reveals at ~80% */
    yawT = 0; pitchT = 0;
    zoomT = DOCK_SCALE;
    camTXT = DOCK_TX;
    camTYT = DOCK_TY;
    const surface = $('#surface-desk');
    if (surface) surface.hidden = false;

    const waitMs = reduce() ? 40 : 520;
    await wait(waitMs);
    setState('DOCKED');
    await runBootThenPanel();
  }

  function undock() {
    forceClose($('#overlay')); forceClose($('#detail-overlay')); hideBoot();
    zoomT = 1; camTXT = 0; camTYT = 0;
    yawT = 0; pitchT = 0;
    const surface = $('#surface-desk');
    setState('FAR');
    /* hide surface after brief fade */
    setTimeout(() => { if (state === 'FAR' && surface) surface.hidden = true; }, reduce() ? 0 : 380);
  }

  async function runBootThenPanel() {
    if (reduce() || bootedOnce) {
      hideBoot(); setState('PANEL');
      goLayer(layer, { instant: true, silent: true });
      return;
    }
    const seq = $('#boot-seq'), fill = $('#boot-fill'), msg = $('#boot-msg');
    if (!seq) { setState('PANEL'); return; }
    seq.hidden = false;
    if (fill) fill.style.width = '0%';
    if (typeof gsap !== 'undefined') {
      await new Promise((res) => gsap.to(fill, {
        width: '100%', duration: 0.65, ease: 'power1.inOut',
        onUpdate: () => {
          const w = parseFloat(fill.style.width) || 0;
          if (msg) msg.textContent = w > 60 ? '就绪' : '启动中…';
        },
        onComplete: res,
      }));
    } else { if (fill) fill.style.width = '100%'; await wait(400); }
    bootedOnce = true; hideBoot(); setState('PANEL');
    goLayer(0, { instant: false, silent: true });
  }
  function hideBoot() { const s = $('#boot-seq'); if (s) s.hidden = true; }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function bindUndock() { $('#undock')?.addEventListener('click', undock); }

  /* —— Idle FX —— */
  function bindIdleFx() {
    if (reduce()) return;
    const doStretch = () => {
      if (document.body.classList.contains('docked')) return;
      const el = $('#char-stretch'), st = $('#stage');
      if (!el || !st) return;
      el.hidden = false;
      st.classList.add('is-stretching');
      requestAnimationFrame(() => el.classList.add('is-on'));
      setTimeout(() => {
        el.classList.remove('is-on');
        st.classList.remove('is-stretching');
        setTimeout(() => { el.hidden = true; }, 400);
      }, 1600);
    };
    const stretchLoop = () => {
      setTimeout(() => { doStretch(); stretchLoop(); }, 9000 + Math.random() * 14000);
    };
    setTimeout(stretchLoop, 6000);

    const cup = $('#pen-cup');
    const toggleCup = () => {
      if (!cup || document.body.classList.contains('docked')) return;
      const open = cup.dataset.open === '1';
      cup.dataset.open = open ? '0' : '1';
      cup.src = ART + (open ? '/ui-pen-cup-closed.png' : '/ui-pen-cup-open.png');
    };
    const cupLoop = () => {
      setTimeout(() => { toggleCup(); cupLoop(); }, 5000 + Math.random() * 7000);
    };
    setTimeout(cupLoop, 4000);
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
    root.addEventListener('click', (e) => {
      const s = e.target.closest('span'); if (s) requestLayer(+s.dataset.layer);
    });
  }
  function bindPanelWheel() {
    $('.panel-chrome')?.addEventListener('wheel', (e) => {
      if (!document.body.classList.contains('docked')) return;
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
      if (!document.body.classList.contains('docked')) {
        dock().then(() => {
          const t = setInterval(() => {
            if (state === 'PANEL' || state === 'DOCKED') { clearInterval(t); requestLayer(i); }
          }, 100);
          setTimeout(() => clearInterval(t), 3500);
        });
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
    const surface = $('#surface-desk'); if (surface) surface.dataset.layer = String(i);
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
    const printer = $('#prop-printer');
    const fly = $('#sticker-fly');
    if (printer) {
      printer.src = ART + '/prop-printer-eject.png';
      setTimeout(() => { printer.src = ART + '/prop-printer.png'; }, 1400);
    }
    if (!fly || reduce()) return;
    fly.src = ART + '/layer-sticker-fly.png';
    if (src) fly.dataset.gen = src;
    fly.hidden = false;
    fly.classList.remove('is-fly');
    void fly.offsetWidth;
    fly.classList.add('is-fly');
    setTimeout(() => {
      fly.classList.remove('is-fly');
      fly.hidden = true;
    }, 1200);
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
      if (document.body.classList.contains('docked')) undock();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
