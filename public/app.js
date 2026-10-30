(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const easeOutCubic = 'power2.out';
  let cfg = { demoMode: true, provider: 'mock', freeLeft: 0, credits: 0 };
  let selectedStyle = localStorage.getItem('vibe-style') || 'watercolor';
  let photoFile = null, photoUrl = null, scrollP = 0, nibbling = false, lenis = null;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STYLES = ['anime', 'chibi', 'toy3d', 'pixel', 'watercolor'];
  const NAMES = { anime: '日漫', chibi: 'Q 版', toy3d: '3D 潮玩', pixel: '像素', watercolor: '水彩' };

  async function boot() {
    try { if (window.VibeAPI) cfg = await VibeAPI.loadConfig(); } catch (_) {}
    showDemo(window.VibeAPI ? VibeAPI.isDemo() : true);
    updateQuota();
    bindUpload(); bindGenerate(); bindBuy(); bindSquirrelClick();
    selectStyle(selectedStyle, false);

    if (typeof gsap === 'undefined') {
      console.warn('[Vibe] GSAP missing');
      bindHoverPressCSS();
      return;
    }
    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    setupLenis();
    setupCursor();
    setupPinnedWork();
    setupGrade();
    setupEntrances();
    setupPointer();
    setupDust();
    setupSneak();
    bindHoverPress();
    window.addEventListener('load', () => { try { ScrollTrigger.refresh(); } catch (_) {} });
  }

  function showDemo(on) { const b = $('#demo-banner'); if (b) b.hidden = !on; }
  function updateQuota() {
    const el = $('#quota'); if (!el) return;
    const c = window.VibeAPI ? VibeAPI.getConfig() : cfg;
    el.textContent = (c.demoMode || c.provider === 'mock' ? '演示模式 · ' : '') + `剩余免费 ${c.freeLeft ?? 0} 次`;
  }

  /* —— Lenis —— */
  function setupLenis() {
    const LenisCtor = window.Lenis || window.default || null;
    if (reduce() || typeof LenisCtor !== 'function') {
      console.warn('[Vibe] Lenis unavailable, native scroll');
      return;
    }
    lenis = new LenisCtor({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add('lenis', 'lenis-smooth');
  }

  /* —— Custom cursor —— */
  function setupCursor() {
    const cur = $('#cursor');
    if (!cur || matchMedia('(pointer: coarse)').matches) return;
    document.body.classList.add('has-cursor');
    const xTo = gsap.quickTo(cur, 'left', { duration: 0.18, ease: 'power3.out' });
    const yTo = gsap.quickTo(cur, 'top', { duration: 0.18, ease: 'power3.out' });
    addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    const viewSel = '.work-slide.is-active .slide-media, .work-slide.is-active .slide-copy h3, .sneak-btn';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(viewSel)) cur.classList.add('is-view');
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(viewSel) && !e.relatedTarget?.closest?.(viewSel)) cur.classList.remove('is-view');
    });
  }

  /* —— 100vh pin + scrub swap slides —— */
  function setupPinnedWork() {
    const pin = $('#work-pin');
    const slides = $$('.work-slide');
    const ticks = $('#work-ticks');
    if (!pin || !slides.length || typeof ScrollTrigger === 'undefined') return;

    ticks.innerHTML = slides.map((_, i) => `<span data-i="${i}"></span>`).join('');
    const tickEls = $$('#work-ticks span');

    function show(i) {
      slides.forEach((s, n) => s.classList.toggle('is-active', n === i));
      tickEls.forEach((t, n) => t.classList.toggle('is-on', n === i));
      const st = slides[i]?.dataset.style;
      if (st) selectStyle(st, false);
    }
    show(0);

    const dist = slides.length * Math.round(window.innerHeight * (matchMedia("(max-width:720px)").matches ? 0.42 : 0.55));
    pin.style.height = dist + 'px';

    ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: 'bottom bottom',
      pin: '.work-stage',
      scrub: reduce() ? false : 0.65,
      anticipatePin: 1,
      onUpdate: (self) => {
        const i = Math.min(slides.length - 1, Math.floor(self.progress * slides.length + 0.001));
        show(i);
        // big readable media move while within a slice
        const local = (self.progress * slides.length) % 1;
        const media = slides[i]?.querySelector('.slide-media');
        if (media && !reduce()) {
          gsap.set(media, { scale: 0.78 + local * 0.27, y: 60 - local * 60, x: (i % 2 ? 1 : -1) * (40 - local * 40) });
        }
      },
    });

    // click slide to select + go make
    slides.forEach((s) => {
      s.addEventListener('click', (e) => {
        if (e.target.closest('.sneak-btn')) return;
        selectStyle(s.dataset.style, true);
      });
    });
  }

  function setupGrade() {
    const grade = $('#grade'), flies = $('.atmos-flies');
    if (!grade || typeof ScrollTrigger === 'undefined') return;
    if (reduce()) { gsap.set(grade, { opacity: 0 }); return; }
    gsap.to(grade, {
      opacity: 0.75,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1,
        onUpdate: (s) => { scrollP = s.progress; },
      },
    });
    if (flies) {
      gsap.to(flies, {
        opacity: 0.95, ease: 'none',
        scrollTrigger: { trigger: document.body, start: '45% top', end: 'bottom bottom', scrub: 1 },
      });
    }
  }

  function setupEntrances() {
    gsap.from('#hero h1, #hero .lede, #hero .btn', {
      y: reduce() ? 12 : 64, opacity: 0,
      duration: reduce() ? 0.3 : 0.85, stagger: 0.1, ease: easeOutCubic,
    });
    $$('#make, #pricing, #cta').forEach((sec) => {
      const parts = sec.querySelectorAll('h2, .section-lede, .panel, .price-card, .cta-line');
      if (!parts.length) return;
      gsap.set(parts, { y: reduce() ? 10 : 56, opacity: 0 });
      ScrollTrigger.batch(parts, {
        start: 'top 88%', once: true,
        onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: reduce() ? 0.3 : 0.75, stagger: 0.08, ease: easeOutCubic, overwrite: 'auto' }),
      });
    });
  }

  function setupPointer() {
    const squirrel = $('#squirrel');
    if (!squirrel) return;
    const fleeMax = reduce() ? 64 : 130;
    const radius = Math.max(150, Math.min(innerWidth, innerHeight) * 0.36);
    const xTo = gsap.quickTo(squirrel, 'x', { duration: 0.36, ease: 'power3.out' });
    const yTo = gsap.quickTo(squirrel, 'y', { duration: 0.36, ease: 'power3.out' });
    const rotTo = gsap.quickTo(squirrel, 'rotation', { duration: 0.28, ease: 'power2.out' });
    function onPtr(cx, cy) {
      if (nibbling) return;
      const r = squirrel.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      const dx = cx - sx, dy = cy - sy, dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const t = 1 - dist / radius, str = Math.max(52, t * fleeMax), ang = Math.atan2(dy, dx);
        xTo(Math.cos(ang) * -str); yTo(Math.sin(ang) * -str); rotTo(Math.cos(ang) * -30);
      } else { xTo(0); yTo(0); rotTo(0); }
      $$('[data-surface]').forEach((el) => {
        const br = el.getBoundingClientRect();
        const ex = br.left + br.width / 2, ey = br.top + br.height / 2;
        const d = Math.hypot(cx - ex, cy - ey), rad = Math.max(br.width, br.height) * 1.15;
        if (d < rad) {
          const t = 1 - d / rad;
          gsap.to(el, { rotation: (cx > ex ? 1 : -1) * (18 + t * 24), x: ((cx - ex) / rad) * -40 * t, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
        } else gsap.to(el, { rotation: 0, x: 0, duration: 0.7, ease: 'elastic.out(1,0.4)', overwrite: 'auto' });
      });
    }
    addEventListener('pointermove', (e) => onPtr(e.clientX, e.clientY), { passive: true });
    addEventListener('pointerdown', (e) => onPtr(e.clientX, e.clientY), { passive: true });
  }

  function bindSquirrelClick() {
    const s = $('#squirrel'); if (!s) return;
    s.addEventListener('click', (e) => {
      e.stopPropagation(); nibbling = true;
      if (typeof gsap === 'undefined') { nibbling = false; return; }
      gsap.timeline({ onComplete: () => { nibbling = false; } })
        .to(s, { scale: 1.4, rotation: -24, duration: 0.12 })
        .to(s, { rotation: 24, duration: 0.09, yoyo: true, repeat: 7 })
        .to(s, { y: -32, duration: 0.18, yoyo: true, repeat: 1 }, '<')
        .to(s, { scale: 1, rotation: 0, y: 0, duration: 0.42, ease: 'back.out(2.5)' });
    });
  }

  function bindHoverPress() {
    if (typeof gsap === 'undefined') return;
    $$('.btn, .price-card, .panel').forEach((el) => {
      el.addEventListener('pointerenter', () => gsap.to(el, { y: -5, scale: 1.03, duration: 0.28, ease: easeOutCubic, overwrite: 'auto' }));
      el.addEventListener('pointerleave', () => gsap.to(el, { y: 0, scale: 1, duration: 0.3, ease: easeOutCubic, overwrite: 'auto' }));
      el.addEventListener('pointerdown', () => gsap.to(el, { scale: 0.96, duration: 0.1, overwrite: 'auto' }));
      el.addEventListener('pointerup', () => gsap.to(el, { scale: 1.02, duration: 0.15, overwrite: 'auto' }));
    });
  }
  function bindHoverPressCSS() { /* CSS handles */ }

  function setupDust() {
    const canvas = $('#dust'); if (!canvas || reduce()) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, pts = [];
    for (let i = 0; i < 36; i++) pts.push({ x: Math.random(), y: Math.random(), size: 0.3 + Math.random() * 0.7, drift: 0.5 + Math.random(), z: 0.3 + Math.random() * 0.7, phase: Math.random() * 6.28 });
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); addEventListener('resize', resize);
    let t0 = performance.now();
    (function frame(now) {
      const t = (now - t0) / 1000; ctx.clearRect(0, 0, w, h);
      const glow = Math.max(0, (scrollP - 0.4) * 2);
      pts.forEach((p) => {
        const px = p.x * w + Math.sin(t * p.drift * 0.45 + p.phase) * 20 * p.z;
        const py = p.y * h + Math.cos(t * p.drift * 0.35 + p.phase) * 12 * p.z + scrollP * 48 * p.z;
        const r = (1.2 + p.size * 2.6) * p.z, a = 0.1 + p.size * 0.2 + glow * 0.25;
        ctx.beginPath(); ctx.fillStyle = `rgba(232,154,92,${a * 0.35 * glow})`; ctx.arc(px, py, r * 4, 0, 6.28); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = `rgba(28,25,22,${a})`; ctx.arc(px, py, r, 0, 6.28); ctx.fill();
      });
      requestAnimationFrame(frame);
    })(t0);
  }

  /* —— Sneak peek —— */
  function setupSneak() {
    const root = $('#sneak'), grid = $('#sneak-grid');
    if (!root || !grid) return;
    $$('.sneak-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = Number(btn.dataset.sneak) || 0;
        const style = STYLES[i] || selectedStyle;
        openSneak(style);
      });
    });
    $('#sneak-close')?.addEventListener('click', closeSneak);
    root.addEventListener('click', (e) => { if (e.target === root) closeSneak(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSneak(); });

    function openSneak(style) {
      const tiles = [
        { img: `/art/rebuild/roof/style-${style}.png`, cap: NAMES[style] || style },
        { img: '/art/rebuild/roof/style-anime.png', cap: '日漫' },
        { text: `${NAMES[style] || style} 风格贴纸——冲切边缘，纸纹可见。点关闭继续制作。` },
        { img: '/art/rebuild/roof/style-watercolor.png', cap: '水彩' },
        { img: '/art/rebuild/roof/ui-upload-plate.png', cap: '上传底板' },
        { img: '/art/rebuild/roof/result-frame.png', cap: '结果框' },
      ];
      grid.innerHTML = tiles.map((t) =>
        t.text
          ? `<div class="sneak-tile is-text">${t.text}</div>`
          : `<div class="sneak-tile"><img src="${t.img}" alt=""><div class="sneak-cap">${t.cap}</div></div>`
      ).join('');
      root.hidden = false; root.classList.add('is-open');
      const els = $$('.sneak-tile');
      gsap.set(els, { opacity: 0, x: 48 });
      gsap.to(els, { opacity: 1, x: 0, duration: 0.7, stagger: 0.05, ease: easeOutCubic });
    }
    function closeSneak() {
      const els = $$('.sneak-tile');
      if (!els.length) { root.hidden = true; return; }
      gsap.to(els, {
        opacity: 0, x: 36, duration: 0.35, stagger: 0.03, ease: 'power2.in',
        onComplete: () => { root.hidden = true; root.classList.remove('is-open'); grid.innerHTML = ''; },
      });
    }
  }

  function selectStyle(id, animate) {
    selectedStyle = id;
    localStorage.setItem('vibe-style', id);
    const lab = $('#style-label');
    if (lab) lab.textContent = '当前风格：' + (NAMES[id] || id);
    syncGen();
    if (animate && typeof gsap !== 'undefined') {
      const media = $('.work-slide.is-active .slide-media');
      if (media) gsap.fromTo(media, { scale: 0.92 }, { scale: 1.06, duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  }

  function bindUpload() {
    const zone = $('#upload-zone'), input = $('#photo'), preview = $('#upload-preview');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-drag'); }));
    zone.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) setPhoto(f); });
    input.addEventListener('change', () => { if (input.files?.[0]) setPhoto(input.files[0]); });
    function setPhoto(file) {
      photoFile = file;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(file);
      preview.querySelectorAll('img:not(.plate-bg), .upload-hint').forEach((n) => n.remove());
      const img = document.createElement('img'); img.src = photoUrl; img.alt = '已选照片'; preview.appendChild(img);
      $('#upload-meta').textContent = file.name; syncGen();
      if (typeof gsap !== 'undefined') gsap.fromTo(preview, { scale: 0.9 }, { scale: 1, duration: 0.35, ease: 'back.out(1.8)' });
    }
  }
  function syncGen() { const b = $('#gen-btn'); if (b) b.disabled = !(photoFile && selectedStyle); }
  function bindGenerate() {
    const btn = $('#gen-btn'); if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!photoFile || !selectedStyle) return;
      const loader = $('#gen-loader'), empty = $('#result-empty'), img = $('#result-img'), actions = $('#result-actions');
      loader.hidden = false; empty.hidden = true; img.hidden = true; actions.hidden = true; btn.disabled = true;
      try {
        const j = await VibeAPI.generate(photoFile, selectedStyle);
        updateQuota(); img.src = j.png + '?t=' + Date.now(); img.hidden = false;
        $('#dl-png').href = j.png + '?dl=1'; $('#dl-gif').href = j.gif + '?dl=1'; actions.hidden = false;
        if (typeof gsap !== 'undefined') gsap.fromTo(img, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.7)' });
        if (VibeAPI.isDemo()) showDemo(true);
      } catch (e) { empty.hidden = false; empty.textContent = e.message || '生成失败'; }
      finally { loader.hidden = true; syncGen(); }
    });
  }
  function bindBuy() {
    $$('.buy').forEach((b) => b.addEventListener('click', async () => {
      try { const j = await VibeAPI.checkout(b.dataset.tier); if (j.url) location.href = j.url; else alert(j.error || '失败'); }
      catch (e) { alert(e.message); }
    }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
