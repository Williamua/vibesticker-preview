(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const STYLES = ['anime', 'chibi', 'toy3d', 'pixel', 'watercolor'];
  const NAMES = { anime: '日漫', chibi: 'Q版', toy3d: '潮玩', pixel: '像素', watercolor: '水彩' };
  const PROJECT_COPY = [
    { t: '成片特写', d: '冲切边缘的水彩贴纸，近看纸纹还在。' },
    { t: '手作桌面', d: '像工作室桌面上刚裁好的一叠。' },
    { t: '风格对比', d: '五种风格并置，拖滑块就能换。' },
    { t: '贴纸小包', d: '成组平铺，适合表情包与打印。' },
  ];

  let selectedStyle = localStorage.getItem('vibe-style') || 'watercolor';
  let photoFile = null, photoUrl = null, nibbling = false;
  // reduce only softens — never skips interactions
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function boot() {
    try { await VibeAPI.loadConfig(); } catch (_) {}
    showDemo(window.VibeAPI ? VibeAPI.isDemo() : true);
    updateQuota();
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    // Hard-close overlay on load (CSS display:grid was overriding [hidden])
    forceCloseOverlay();

    bindProjects();
    bindSlider();
    bindUpload();
    bindGenerate();
    bindPricing();
    bindOverlay();
    bindSquirrel();
    bindLeaves();
    setStyleIndex(Math.max(0, STYLES.indexOf(selectedStyle)), false);
    playIntro();
  }

  function showDemo(on) { const b = $('#demo-banner'); if (b) b.hidden = !on; }
  function updateQuota() {
    const el = $('#quota'); if (!el) return;
    const c = window.VibeAPI ? VibeAPI.getConfig() : {};
    el.textContent = ((c.demoMode || c.provider === 'mock') ? '演示模式 · ' : '') + `免费剩余 ${c.freeLeft ?? 0} · 拖滑块换风格 · 点卡片展开`;
    el.classList.add('hint-pulse');
  }

  function playIntro() {
    if (typeof gsap === 'undefined') return;
    // NEVER animate x on title (caused off-screen on mobile). Only y/opacity.
    const bits = ['.hz-bar', '.hz-title', '.hz-lede', '.island', '.project', '.slider-wrap', '.drag-zone', '.island-actions'];
    gsap.set('.hz-title', { clearProps: 'x,transform' });
    gsap.from('.hz-bar', { y: -16, opacity: 0, duration: 0.45, ease: 'power2.out' });
    gsap.from('.hz-title', { y: reduce() ? 10 : 36, opacity: 0, duration: reduce() ? 0.25 : 0.7, ease: 'power3.out', delay: 0.05 });
    gsap.from('.hz-lede', { y: 16, opacity: 0, duration: 0.5, delay: 0.12 });
    gsap.from('.island', { y: reduce() ? 12 : 48, opacity: 0, duration: 0.65, ease: 'power3.out', delay: 0.18 });
    gsap.from('.project', { y: 24, opacity: 0, scale: 0.92, duration: 0.45, stagger: 0.07, delay: 0.28, ease: 'back.out(1.4)' });
    gsap.from('.slider-wrap', { y: 18, opacity: 0, duration: 0.4, delay: 0.4 });
    gsap.from('.drag-zone', { y: 18, opacity: 0, duration: 0.4, delay: 0.48 });
    // nudge knob once so user sees it's interactive
    gsap.fromTo('#slider-knob', { x: -24 }, {
      x: 0, duration: 0.7, delay: 0.7, ease: 'elastic.out(1, 0.5)',
      onComplete: () => gsap.set('#slider-knob', { clearProps: 'x' }),
    });
  }

  function bindProjects() {
    $$('.project').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.project) - 1;
        $$('.project').forEach((b) => b.setAttribute('aria-expanded', b === btn ? 'true' : 'false'));
        if (typeof gsap !== 'undefined') gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
        openSheet(projectHTML(i));
      });
    });
  }
  function projectHTML(i) {
    const meta = PROJECT_COPY[i] || { t: '作品', d: '' };
    return `<h2>${meta.t}</h2><img class="cover" src="/art/rebuild/hamza/project-0${i + 1}.png" alt=""><p>${meta.d}</p>
      <p class="hint">关掉后继续拖滑块或上传。</p>`;
  }

  function bindSlider() {
    const wrap = $('#style-slider');
    const knob = $('#slider-knob');
    const fill = $('#slider-fill');
    if (!wrap || !knob) return;
    let dragging = false;

    function setFromClientX(cx) {
      const track = wrap.querySelector('.slider-track') || wrap;
      const r = track.getBoundingClientRect();
      let t = (cx - r.left) / Math.max(1, r.width);
      t = Math.max(0, Math.min(1, t));
      setStyleIndex(Math.round(t * (STYLES.length - 1)), true);
    }
    function paint(idx) {
      const t = idx / (STYLES.length - 1);
      knob.style.left = (t * 100) + '%';
      knob.setAttribute('aria-valuenow', String(idx));
      if (fill) fill.style.transform = `scaleX(${Math.max(0.06, t)})`;
    }
    window.__paintStyleSlider = paint;

    const down = (e) => {
      dragging = true;
      try { knob.setPointerCapture(e.pointerId); } catch (_) {}
      setFromClientX(e.clientX);
      e.preventDefault();
    };
    knob.addEventListener('pointerdown', down);
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.slider-knob')) return;
      down(e);
    });
    knob.addEventListener('pointermove', (e) => { if (dragging) setFromClientX(e.clientX); });
    const up = () => { dragging = false; };
    knob.addEventListener('pointerup', up);
    knob.addEventListener('pointercancel', up);
  }

  function setStyleIndex(idx, animate) {
    idx = Math.max(0, Math.min(STYLES.length - 1, idx | 0));
    selectedStyle = STYLES[idx];
    localStorage.setItem('vibe-style', selectedStyle);
    const lab = $('#style-label');
    if (lab) lab.textContent = '风格 · ' + NAMES[selectedStyle];
    if (window.__paintStyleSlider) __paintStyleSlider(idx);
    syncGen();
    if (animate && typeof gsap !== 'undefined') {
      gsap.fromTo('#slider-knob', { scale: 0.85 }, { scale: 1.12, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  }

  function bindUpload() {
    const zone = $('#upload-zone'), input = $('#photo');
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
      const thumb = $('#upload-thumb'), hint = $('#upload-hint');
      thumb.src = photoUrl; thumb.hidden = false;
      if (hint) hint.hidden = true;
      syncGen();
      if (typeof gsap !== 'undefined') gsap.fromTo(zone, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: 'back.out(1.8)' });
    }
  }
  function syncGen() { const b = $('#gen-btn'); if (b) b.disabled = !(photoFile && selectedStyle); }

  function bindGenerate() {
    const btn = $('#gen-btn'); if (!btn) return;
    btn.addEventListener('click', async () => {
      if (btn.disabled || !photoFile || !selectedStyle) return;
      btn.disabled = true;
      openSheet(`<h2>绘制中</h2><p>${NAMES[selectedStyle]} 风格生成中…</p>`);
      try {
        const j = await VibeAPI.generate(photoFile, selectedStyle);
        updateQuota();
        if (VibeAPI.isDemo()) showDemo(true);
        openSheet(`<h2>贴纸好了</h2>
          <div class="result-box">
            <img class="frame" src="/art/rebuild/hamza/result-frame.png" alt="">
            <img id="result-img" src="${j.png}?t=${Date.now()}" alt="结果">
          </div>
          <a class="btn btn-primary" href="${j.png}?dl=1" download>下载 PNG</a>
          <a class="btn btn-ghost" href="${j.gif}?dl=1" download>下载 GIF</a>`);
        if (typeof gsap !== 'undefined') gsap.from('#result-img', { scale: 0.7, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' });
      } catch (e) {
        openSheet(`<h2>失败</h2><p>${e.message || '生成失败'}</p>`);
      } finally { syncGen(); }
    });
  }

  function bindPricing() {
    $('#open-pricing')?.addEventListener('click', () => {
      openSheet(`<h2>价格</h2>
        <div class="tier-row">
          <div class="tier-card"><img src="/art/rebuild/hamza/tier-single.png" alt=""><h3>单张 · $1</h3><button type="button" class="btn btn-ghost buy" data-tier="single">买</button></div>
          <div class="tier-card featured"><img src="/art/rebuild/hamza/tier-pack.png" alt=""><h3>小包 · $4.99</h3><button type="button" class="btn btn-primary buy" data-tier="pack">买</button></div>
          <div class="tier-card"><img src="/art/rebuild/hamza/tier-pro.png" alt=""><h3>大包 · $8.99</h3><button type="button" class="btn btn-ghost buy" data-tier="pro">买</button></div>
        </div>`);
      $$('#sheet-body .buy').forEach((b) =>
        b.addEventListener('click', async () => {
          try {
            const j = await VibeAPI.checkout(b.dataset.tier);
            if (j.url) location.href = j.url; else alert(j.error || '失败');
          } catch (e) { alert(e.message); }
        })
      );
    });
  }

  function openSheet(html) {
    const overlay = $('#overlay'), body = $('#sheet-body');
    if (!overlay || !body) return;
    if (!html || !String(html).trim()) return; // never open empty
    body.innerHTML = html;
    overlay.hidden = false;
    overlay.classList.add('is-open');
    if (typeof gsap !== 'undefined') {
      gsap.fromTo('#sheet', { scale: 0.9, opacity: 0, y: 24 }, { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: 'power3.out' });
    }
  }
  function forceCloseOverlay() {
    const overlay = $('#overlay');
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList.remove('is-open');
    const body = $('#sheet-body');
    if (body) body.innerHTML = '';
  }
  function closeSheet() {
    const overlay = $('#overlay');
    if (!overlay) return;
    if (typeof gsap !== 'undefined' && overlay.classList.contains('is-open')) {
      gsap.to('#sheet', {
        scale: 0.94, opacity: 0, duration: 0.18,
        onComplete: () => forceCloseOverlay(),
      });
    } else forceCloseOverlay();
    $$('.project').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  function bindOverlay() {
    $('#sheet-close')?.addEventListener('click', closeSheet);
    $('#overlay')?.addEventListener('click', (e) => { if (e.target.id === 'overlay') closeSheet(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  }

  function bindSquirrel() {
    const s = $('#squirrel');
    if (!s) return;
    // Always interactive
    if (typeof gsap !== 'undefined') {
      const xTo = gsap.quickTo(s, 'x', { duration: 0.35, ease: 'power3.out' });
      const yTo = gsap.quickTo(s, 'y', { duration: 0.35, ease: 'power3.out' });
      addEventListener('pointermove', (e) => {
        if (nibbling) return;
        const r = s.getBoundingClientRect();
        const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        const dist = Math.hypot(dx, dy), rad = 150;
        if (dist < rad) {
          const t = 1 - dist / rad, str = Math.max(48, t * 110), ang = Math.atan2(dy, dx);
          xTo(Math.cos(ang) * -str); yTo(Math.sin(ang) * -str);
        } else { xTo(0); yTo(0); }
      }, { passive: true });
    }
    s.addEventListener('click', (e) => {
      e.stopPropagation();
      nibbling = true;
      if (typeof gsap === 'undefined') { nibbling = false; return; }
      gsap.timeline({ onComplete: () => { nibbling = false; } })
        .to(s, { scale: 1.4, rotation: -20, duration: 0.12 })
        .to(s, { rotation: 20, duration: 0.09, yoyo: true, repeat: 6 })
        .to(s, { y: -24, duration: 0.16, yoyo: true, repeat: 1 }, '<')
        .to(s, { scale: 1, rotation: 0, y: 0, duration: 0.4, ease: 'back.out(2.2)' });
    });
  }
  function bindLeaves() {
    if (typeof gsap === 'undefined') return;
    addEventListener('pointermove', (e) => {
      $$('[data-surface]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
        const d = Math.hypot(e.clientX - ex, e.clientY - ey);
        if (d < 150) {
          const t = 1 - d / 150;
          gsap.to(el, { rotation: (e.clientX > ex ? 1 : -1) * (12 + t * 16), duration: 0.22, overwrite: 'auto' });
        } else gsap.to(el, { rotation: 0, duration: 0.65, ease: 'elastic.out(1,0.45)', overwrite: 'auto' });
      });
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
