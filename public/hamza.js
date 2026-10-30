(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const STYLES = ['anime', 'chibi', 'toy3d', 'pixel', 'watercolor'];
  const NAMES = { anime: '日漫', chibi: 'Q版', toy3d: '潮玩', pixel: '像素', watercolor: '水彩' };
  const PROJECT_COPY = [
    { t: '成片特写', d: '冲切边缘的水彩贴纸，近看纸纹还在。' },
    { t: '手作桌面', d: '像工作室桌面上刚裁好的一叠。' },
    { t: '风格对比', d: '五种风格并置，点滑块就能换。' },
    { t: '贴纸小包', d: '成组平铺，适合表情包与打印。' },
  ];

  let selectedStyle = localStorage.getItem('vibe-style') || 'watercolor';
  let photoFile = null, photoUrl = null;
  let reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let nibbling = false;
  let lastResult = null;

  async function boot() {
    await VibeAPI.loadConfig();
    showDemo(VibeAPI.isDemo());
    updateQuota();
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    bindProjects();
    bindSlider();
    bindUpload();
    bindGenerate();
    bindPricing();
    bindOverlay();
    bindSquirrel();
    bindLeaves();
    setStyleIndex(STYLES.indexOf(selectedStyle), false);
  }

  function showDemo(on) { const b = $('#demo-banner'); if (b) b.hidden = !on; }
  function updateQuota() {
    const c = VibeAPI.getConfig(), el = $('#quota');
    if (el) el.textContent = (VibeAPI.isDemo() ? '演示模式 · ' : '') + `免费剩余 ${c.freeLeft ?? 0}`;
  }

  /* —— Projects: same-screen expand —— */
  function bindProjects() {
    $$('.project').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.project) - 1;
        $$('.project').forEach((b) => b.setAttribute('aria-expanded', b === btn ? 'true' : 'false'));
        openSheet(projectHTML(i));
      });
    });
  }
  function projectHTML(i) {
    const meta = PROJECT_COPY[i] || { t: '作品', d: '' };
    const src = `/art/rebuild/hamza/project-0${i + 1}.png`;
    return `<h2>${meta.t}</h2><img class="cover" src="${src}" alt=""><p>${meta.d}</p>
      <p class="hint">点关闭回到控件岛，继续上传或生成。</p>`;
  }

  /* —— Style slider drag —— */
  function bindSlider() {
    const wrap = $('#style-slider');
    const knob = $('#slider-knob');
    const fill = $('#slider-fill');
    if (!wrap || !knob) return;
    let dragging = false;

    function setFromClientX(cx) {
      const r = wrap.getBoundingClientRect();
      let t = (cx - r.left) / r.width;
      t = Math.max(0, Math.min(1, t));
      const idx = Math.round(t * (STYLES.length - 1));
      setStyleIndex(idx, true);
    }
    function paint(idx) {
      const t = idx / (STYLES.length - 1);
      knob.style.left = (t * 100) + '%';
      knob.setAttribute('aria-valuenow', String(idx));
      if (fill) fill.style.transform = `translateY(-50%) scaleX(${Math.max(0.08, t)})`;
    }
    window.__paintStyleSlider = paint;

    knob.addEventListener('pointerdown', (e) => {
      dragging = true;
      knob.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    knob.addEventListener('pointermove', (e) => { if (dragging) setFromClientX(e.clientX); });
    knob.addEventListener('pointerup', () => { dragging = false; });
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target === knob || knob.contains(e.target)) return;
      setFromClientX(e.clientX);
    });
  }

  function setStyleIndex(idx, animate) {
    idx = Math.max(0, Math.min(STYLES.length - 1, idx));
    selectedStyle = STYLES[idx];
    localStorage.setItem('vibe-style', selectedStyle);
    const lab = $('#style-label');
    if (lab) lab.textContent = NAMES[selectedStyle];
    if (window.__paintStyleSlider) __paintStyleSlider(idx);
    syncGen();
    if (animate && !reduceMotion && typeof gsap !== 'undefined') {
      gsap.fromTo('#slider-knob', { scale: 0.9 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  }

  /* —— Drag upload —— */
  function bindUpload() {
    const zone = $('#upload-zone');
    const input = $('#photo');
    if (!zone || !input) return;
    const open = () => input.click();
    zone.addEventListener('click', open);
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    ['dragenter', 'dragover'].forEach((ev) =>
      zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-drag'); })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-drag'); })
    );
    zone.addEventListener('drop', (e) => {
      const f = e.dataTransfer?.files?.[0];
      if (f) setPhoto(f);
    });
    input.addEventListener('change', () => { if (input.files?.[0]) setPhoto(input.files[0]); });

    function setPhoto(file) {
      photoFile = file;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(file);
      const thumb = $('#upload-thumb');
      const hint = $('#upload-hint');
      thumb.src = photoUrl;
      thumb.hidden = false;
      if (hint) hint.hidden = true;
      syncGen();
      if (!reduceMotion && typeof gsap !== 'undefined') {
        gsap.fromTo(zone, { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
      }
    }
  }

  function syncGen() {
    const b = $('#gen-btn');
    if (b) b.disabled = !(photoFile && selectedStyle);
  }

  function bindGenerate() {
    const btn = $('#gen-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!photoFile || !selectedStyle) return;
      btn.disabled = true;
      openSheet(`<h2>生成中</h2><p>正在绘制 ${NAMES[selectedStyle]}…</p><div class="result-box"><div id="gen-loader">请稍候</div></div>`);
      try {
        const j = await VibeAPI.generate(photoFile, selectedStyle);
        lastResult = j;
        updateQuota();
        if (VibeAPI.isDemo()) showDemo(true);
        openSheet(resultHTML(j));
      } catch (e) {
        openSheet(`<h2>失败</h2><p>${e.message || '生成失败'}</p>`);
      } finally {
        syncGen();
      }
    });
  }

  function resultHTML(j) {
    return `<h2>贴纸好了</h2>
      <div class="result-box">
        <img class="frame" src="/art/rebuild/hamza/result-frame.png" alt="">
        <img id="result-img" src="${j.png}?t=${Date.now()}" alt="生成结果">
      </div>
      <div class="style-picks" id="restyle"></div>
      <a class="btn btn-primary" href="${j.png}?dl=1" download>下载 PNG</a>
      <a class="btn btn-ghost" href="${j.gif}?dl=1" download>下载 GIF</a>
      <p class="hint">当前风格：${NAMES[selectedStyle]}</p>`;
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
            if (j.url) location.href = j.url;
            else alert(j.error || '失败');
          } catch (e) { alert(e.message); }
        })
      );
    });
  }

  function openSheet(html) {
    const overlay = $('#overlay');
    const body = $('#sheet-body');
    body.innerHTML = html;
    overlay.hidden = false;
    if (!reduceMotion && typeof gsap !== 'undefined') {
      gsap.fromTo('#sheet', { scale: 0.92, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: 'power3.out' });
    }
  }
  function closeSheet() {
    const overlay = $('#overlay');
    if (!reduceMotion && typeof gsap !== 'undefined') {
      gsap.to('#sheet', {
        scale: 0.94, opacity: 0, duration: 0.18, ease: 'power2.in',
        onComplete: () => { overlay.hidden = true; },
      });
    } else overlay.hidden = true;
    $$('.project').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  function bindOverlay() {
    $('#sheet-close')?.addEventListener('click', closeSheet);
    $('#overlay')?.addEventListener('click', (e) => { if (e.target.id === 'overlay') closeSheet(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  }

  function bindSquirrel() {
    const s = $('#squirrel');
    if (!s || typeof gsap === 'undefined') return;
    const xTo = gsap.quickTo(s, 'x', { duration: 0.4, ease: 'power3.out' });
    const yTo = gsap.quickTo(s, 'y', { duration: 0.4, ease: 'power3.out' });
    addEventListener('pointermove', (e) => {
      if (reduceMotion || nibbling) return;
      const r = s.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      const dist = Math.hypot(dx, dy), rad = Math.min(innerWidth, innerHeight) * 0.28;
      if (dist < rad) {
        const t = 1 - dist / rad, str = t * 100, ang = Math.atan2(dy, dx);
        xTo(Math.cos(ang) * -str); yTo(Math.sin(ang) * -str);
      } else { xTo(0); yTo(0); }
    }, { passive: true });
    s.addEventListener('click', (e) => {
      e.stopPropagation();
      if (reduceMotion) return;
      nibbling = true;
      gsap.timeline({ onComplete: () => { nibbling = false; } })
        .to(s, { scale: 1.18, rotation: -12, duration: 0.12 })
        .to(s, { rotation: 12, duration: 0.1, yoyo: true, repeat: 4 })
        .to(s, { scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(2)' });
    });
  }
  function bindLeaves() {
    if (typeof gsap === 'undefined' || reduceMotion) return;
    addEventListener('pointermove', (e) => {
      $$('[data-surface]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
        const d = Math.hypot(e.clientX - ex, e.clientY - ey);
        if (d < 140) {
          const t = 1 - d / 140;
          gsap.to(el, { rotation: (e.clientX > ex ? 1 : -1) * (8 + t * 10), duration: 0.25, overwrite: 'auto' });
        } else gsap.to(el, { rotation: 0, duration: 0.7, ease: 'elastic.out(1,0.45)', overwrite: 'auto' });
      });
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
