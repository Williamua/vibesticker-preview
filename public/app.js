(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  let cfg = { demoMode: true, provider: 'mock', freeLeft: 0, credits: 0 };
  let selectedStyle = localStorage.getItem('vibe-style') || 'watercolor';
  let photoFile = null, photoUrl = null, scrollP = 0, nibbling = false;
  // reduce only weakens — never skips boot/interactions
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function boot() {
    try {
      if (window.VibeAPI) cfg = await VibeAPI.loadConfig();
    } catch (_) {}
    showDemo(window.VibeAPI ? VibeAPI.isDemo() : true);
    updateQuota();
    bindUpload();
    bindCases();
    bindGenerate();
    bindBuy();
    bindSquirrelClick();
    bindHoverPress();
    selectStyle(selectedStyle, false);

    if (typeof gsap === 'undefined') {
      console.warn('[VibeSticker] GSAP missing — CSS hover still active');
      return;
    }
    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    // ALWAYS set up — do NOT gate on matchMedia(reduce) alone (that never fires for normal users)
    setupScroll();
    setupEntrances();
    setupPointer();
    setupDust();
    window.addEventListener('load', () => { try { ScrollTrigger && ScrollTrigger.refresh(); } catch (_) {} });
  }

  function showDemo(on) { const b = $('#demo-banner'); if (b) b.hidden = !on; }
  function updateQuota() {
    const el = $('#quota'); if (!el) return;
    const c = window.VibeAPI ? VibeAPI.getConfig() : cfg;
    el.textContent = (c.demoMode || c.provider === 'mock' ? '演示模式 · ' : '') + `剩余免费 ${c.freeLeft ?? 0} 次`;
  }

  function setupScroll() {
    const grade = $('#grade'), flies = $('.atmos-flies');
    const scrub = reduceMotion() ? false : 1.0;
    if (!grade || typeof ScrollTrigger === 'undefined') return;

    if (scrub) {
      gsap.to(grade, {
        opacity: 0.72,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.0,
          onUpdate: (s) => { scrollP = s.progress; },
        },
      });
      if (flies) {
        gsap.to(flies, {
          opacity: 0.9,
          ease: 'none',
          scrollTrigger: { trigger: document.body, start: '50% top', end: 'bottom bottom', scrub: 1 },
        });
      }
    }

    $$('.case').forEach((caseEl, i) => {
      const media = caseEl.querySelector('.case-media');
      const copy = caseEl.querySelector('.case-copy');
      if (!media) return;
      const side = i % 2 === 0 ? -56 : 56;
      if (scrub) {
        gsap.fromTo(
          media,
          { scale: 0.7, y: 80, x: side, opacity: 0.15 },
          {
            scale: 1.05,
            y: 0,
            x: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: caseEl, start: 'top 88%', end: 'top 28%', scrub: 0.85 },
          }
        );
        if (copy) {
          gsap.fromTo(
            copy,
            { y: 60, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: { trigger: caseEl, start: 'top 80%', end: 'top 36%', scrub: 0.85 },
            }
          );
        }
      } else {
        gsap.set([media, copy], { clearProps: 'all', opacity: 1 });
      }
    });
  }

  function setupEntrances() {
    const hero = $$('#hero h1, #hero .lede, #hero .btn');
    gsap.from(hero, {
      y: reduceMotion() ? 12 : 64,
      opacity: 0,
      duration: reduceMotion() ? 0.25 : 1.05,
      stagger: 0.1,
      ease: 'power3.out',
    });

    $$('#make, #pricing, #cta, #work').forEach((sec) => {
      const parts = sec.querySelectorAll('h2, .section-lede, .panel, .price-card, .cta-line');
      if (!parts.length) return;
      gsap.set(parts, { y: reduceMotion() ? 8 : 60, opacity: 0 });
      if (typeof ScrollTrigger === 'undefined') {
        gsap.to(parts, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 });
        return;
      }
      ScrollTrigger.batch(parts, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: reduceMotion() ? 0.3 : 0.9,
            stagger: 0.09,
            ease: 'power3.out',
            overwrite: 'auto',
          }),
      });
    });
  }

  function setupPointer() {
    const squirrel = $('#squirrel');
    if (!squirrel) return;
    // Interactions ALWAYS on — reduce only shortens distance a bit
    const fleeMax = reduceMotion() ? 56 : 120;
    const radius = Math.max(140, Math.min(innerWidth, innerHeight) * 0.34);
    const xTo = gsap.quickTo(squirrel, 'x', { duration: 0.38, ease: 'power3.out' });
    const yTo = gsap.quickTo(squirrel, 'y', { duration: 0.38, ease: 'power3.out' });
    const rotTo = gsap.quickTo(squirrel, 'rotation', { duration: 0.3, ease: 'power2.out' });

    function onPtr(cx, cy) {
      if (nibbling) return;
      const r = squirrel.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      const dx = cx - sx, dy = cy - sy, dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const t = 1 - dist / radius;
        const str = Math.max(48, t * fleeMax);
        const ang = Math.atan2(dy, dx);
        xTo(Math.cos(ang) * -str);
        yTo(Math.sin(ang) * -str);
        rotTo(Math.cos(ang) * -28);
      } else {
        xTo(0); yTo(0); rotTo(0);
      }
      $$('[data-surface]').forEach((el) => {
        const br = el.getBoundingClientRect();
        const ex = br.left + br.width / 2, ey = br.top + br.height / 2;
        const d = Math.hypot(cx - ex, cy - ey);
        const rad = Math.max(br.width, br.height) * 1.1;
        if (d < rad) {
          const t = 1 - d / rad;
          gsap.to(el, {
            rotation: (cx > ex ? 1 : -1) * (16 + t * 22),
            x: ((cx - ex) / rad) * -36 * t,
            duration: 0.22,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        } else {
          gsap.to(el, { rotation: 0, x: 0, duration: 0.75, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
        }
      });
    }
    addEventListener('pointermove', (e) => onPtr(e.clientX, e.clientY), { passive: true });
    addEventListener('pointerdown', (e) => onPtr(e.clientX, e.clientY), { passive: true });
  }

  function bindSquirrelClick() {
    const s = $('#squirrel');
    if (!s) return;
    s.addEventListener('click', (e) => {
      e.stopPropagation();
      nibbling = true;
      if (typeof gsap === 'undefined') { nibbling = false; return; }
      gsap.timeline({ onComplete: () => { nibbling = false; } })
        .to(s, { scale: 1.35, rotation: -22, duration: 0.12, ease: 'power2.out' })
        .to(s, { rotation: 22, duration: 0.09, yoyo: true, repeat: 7, ease: 'sine.inOut' })
        .to(s, { y: -28, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, '<')
        .to(s, { scale: 1, rotation: 0, y: 0, duration: 0.4, ease: 'back.out(2.4)' });
    });
  }

  function bindHoverPress() {
    // GSAP hover for buttons/cards — works even if CSS transitions fail
    if (typeof gsap === 'undefined') return;
    $$('.btn, .price-card, .panel, .case-media').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        if (el.classList.contains('case-media')) gsap.to(el, { y: -10, scale: 1.06, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
        else gsap.to(el, { y: -4, scale: 1.03, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { y: 0, scale: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerdown', () => gsap.to(el, { scale: 0.96, duration: 0.1, overwrite: 'auto' }));
      el.addEventListener('pointerup', () => gsap.to(el, { scale: 1.02, duration: 0.15, overwrite: 'auto' }));
    });
  }

  function setupDust() {
    const canvas = $('#dust');
    if (!canvas || reduceMotion()) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, pts = [];
    for (let i = 0; i < 40; i++) pts.push({ x: Math.random(), y: Math.random(), size: 0.3 + Math.random() * 0.7, drift: 0.5 + Math.random(), z: 0.3 + Math.random() * 0.7, phase: Math.random() * 6.28 });
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    addEventListener('resize', resize);
    let t0 = performance.now();
    (function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const glow = Math.max(0, (scrollP - 0.45) * 2);
      pts.forEach((p) => {
        const px = p.x * w + Math.sin(t * p.drift * 0.45 + p.phase) * 22 * p.z;
        const py = p.y * h + Math.cos(t * p.drift * 0.35 + p.phase) * 14 * p.z + scrollP * 50 * p.z;
        const r = (1.2 + p.size * 2.8) * p.z, a = 0.1 + p.size * 0.22 + glow * 0.25;
        ctx.beginPath();
        ctx.fillStyle = `rgba(232,154,92,${a * 0.4 * glow})`;
        ctx.arc(px, py, r * 5, 0, 6.28); ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `rgba(28,25,22,${a})`;
        ctx.arc(px, py, r, 0, 6.28); ctx.fill();
      });
      requestAnimationFrame(frame);
    })(t0);
  }

  function bindCases() {
    $$('.case').forEach((c) => {
      const go = () => selectStyle(c.dataset.style, true);
      c.addEventListener('click', go);
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  function selectStyle(id, animate) {
    selectedStyle = id;
    localStorage.setItem('vibe-style', id);
    const names = { anime: '日漫', chibi: 'Q 版', toy3d: '3D 潮玩', pixel: '像素', watercolor: '水彩' };
    $$('.case').forEach((c) => {
      const on = c.dataset.style === id;
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && animate && typeof gsap !== 'undefined') {
        const m = c.querySelector('.case-media');
        gsap.fromTo(m, { scale: 0.9 }, { scale: 1.08, duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out' });
      }
    });
    const lab = $('#style-label');
    if (lab) lab.textContent = '当前风格：' + (names[id] || id);
    syncGen();
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
      const img = document.createElement('img');
      img.src = photoUrl; img.alt = '已选照片';
      preview.appendChild(img);
      $('#upload-meta').textContent = file.name;
      syncGen();
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
        updateQuota();
        img.src = j.png + '?t=' + Date.now(); img.hidden = false;
        $('#dl-png').href = j.png + '?dl=1'; $('#dl-gif').href = j.gif + '?dl=1';
        actions.hidden = false;
        if (typeof gsap !== 'undefined') gsap.fromTo(img, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.7)' });
        if (VibeAPI.isDemo()) showDemo(true);
      } catch (e) {
        empty.hidden = false; empty.textContent = e.message || '生成失败';
      } finally {
        loader.hidden = true; syncGen();
      }
    });
  }
  function bindBuy() {
    $$('.buy').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          const j = await VibeAPI.checkout(b.dataset.tier);
          if (j.url) location.href = j.url; else alert(j.error || '失败');
        } catch (e) { alert(e.message); }
      })
    );
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
