/* VibeSticker · motion layer (skin-agnostic)
   VSMotion.wind   – 0..1 wind from scroll speed
   parallax        – [data-depth] via CSS translate + lag (desktop & mobile)
   sway            – [data-sway] rotate with wind (+ leafReact boost near pointer)
   VSParticles     – wind-scaled leaf/cone; atmos (#atmos) fog dust with DOF
   critters        – squirrels flee pointer; click → nibble + tail wag
   fireflies       – canvas dots follow pointer lightly; plate opacity via --ff
   prefers-reduced-motion → no parallax / sway / particles / flee */
(() => {
'use strict';
const CFG = window.VS_CONFIG || {};
const W = Object.assign({ calm: 0.15, velocityForMax: 2.2, attack: 0.18, release: 0.035, swayDeg: [1.2, 7] }, CFG.wind);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const html = document.documentElement;
const mobile = () => matchMedia('(max-width: 768px)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const listeners = new Set();
const M = window.VSMotion = { wind: W.calm, velocity: 0, reduced, on(fn) { listeners.add(fn); return () => listeners.delete(fn); } };

/* ---------- parallax ---------- */
const LAG = 48;
document.documentElement.style.setProperty('--lag-pad', LAG + 'px');
let depthEls = [], maxScroll = 1;
function measure() {
  depthEls = [...document.querySelectorAll('[data-depth]')];
  maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  depthEls.forEach(el => {
    const budget = el.dataset.budget != null ? +el.dataset.budget : 0.5;
    el._k = Math.min(+el.dataset.depth, budget * innerHeight / maxScroll);
    el._inertia = el.dataset.inertia != null ? +el.dataset.inertia : 14;
    el._lag = el._lag || 0;
    el.style.setProperty('--travel', Math.ceil(el._k * maxScroll) + 'px');
  });
}
M.refresh = measure;

/* ---------- main loop ---------- */
let lastY = scrollY, lastT = performance.now(), t0 = lastT;
function frame(now) {
  const dt = Math.max(1, now - lastT), y = scrollY;
  const sv = (y - lastY) / dt, v = Math.abs(sv);
  lastY = y; lastT = now;
  M.signedVelocity = lerp(M.signedVelocity || 0, sv, 0.28);
  M.velocity = lerp(M.velocity, v, 0.28);
  const target = Math.min(1, W.calm + (1 - W.calm) * (M.velocity / W.velocityForMax));
  M.wind += (target - M.wind) * (target > M.wind ? W.attack : W.release);
  for (const el of depthEls) {
    const tLag = Math.max(-LAG, Math.min(LAG, -M.signedVelocity * el._inertia));
    el._lag += (tLag - el._lag) * 0.10;   // slightly softer lag settle (floaty)
    el.style.translate = `0 ${(-y * el._k + el._lag).toFixed(1)}px`;
  }
  const amp = lerp(W.swayDeg[0], W.swayDeg[1], (M.wind - W.calm) / (1 - W.calm));
  const ph = (now - t0) / 1000;
  document.querySelectorAll('[data-sway]').forEach((el, i) => {
    const boost = 1 + (M.leafBoost || 0) * ((M._leafBoostMul || 2.4) - 1);
    const a = amp * boost * (Math.sin(ph * (0.9 + M.wind * 2.2) + i) * 0.75 + Math.sin(ph * (2.3 + M.wind * 3) + i * 2) * 0.25);
    // local nudge near pointer (surface reaction)
    const nx = (el._nudgeX || 0), ny = (el._nudgeY || 0);
    el.style.rotate = a.toFixed(2) + 'deg';
    if (nx || ny) el.style.translate = `${nx.toFixed(1)}px ${ny.toFixed(1)}px`;
    else if (el.style.translate && !el.dataset.depth) el.style.translate = '';
  });
  // firefly plate opacity tracks --ff
  const ffPlate = document.querySelector('.px-ffplate');
  if (ffPlate) {
    const ff = parseFloat(getComputedStyle(html).getPropertyValue('--ff')) || 0;
    ffPlate.style.opacity = String(Math.min(1, ff * 1.15));
  }
  listeners.forEach(fn => fn(M, dt));
  requestAnimationFrame(frame);
}

/* ---------- particles ---------- */
const P = window.VSParticles = {
  impls: {}, live: [], spawned: {},
  register(name, impl) { this.impls[name] = impl; },
  count() { return this.live.length; },
};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
P.register('leaf', {
  spawn(w, h, wind, colors) {
    const fromSide = wind > 0.5 && Math.random() < 0.5;
    return { x: fromSide ? -20 : rnd(-0.1 * w, w), y: fromSide ? rnd(0, h * 0.6) : -20, s: rnd(6, 11), r: rnd(0, 6.28), vr: rnd(-1.5, 1.5),
      vy: rnd(28, 55), sw: rnd(0.8, 1.8), ph: rnd(0, 6.28), c: pick(colors), a: rnd(0.55, 0.9) };
  },
  update(p, dt, wind, w, h) {
    p.ph += dt * p.sw; p.r += p.vr * dt * (1 + wind * 2);
    p.x += (Math.sin(p.ph) * 18 + wind * 160) * dt; p.y += p.vy * dt * (1 + wind * 0.6);
    return p.y < h + 30 && p.x < w + 40;
  },
  draw(g, p) {
    g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = p.a; g.fillStyle = p.c;
    g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 6.283); g.fill();
    g.globalAlpha = p.a * 0.5; g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(-p.s, 0); g.lineTo(p.s, 0); g.stroke(); g.restore();
  },
});
P.register('cone', {
  spawn(w, h, wind, colors) { return { x: rnd(0.05 * w, 0.95 * w), y: -16, vx: rnd(-20, 20) + wind * 60, vy: rnd(20, 60), r: rnd(-0.4, 0.4), vr: rnd(-2, 2), s: rnd(6, 9), c: pick(colors), a: 0.9, floor: h - rnd(10, 60), bounced: false }; },
  update(p, dt, wind, w, h) {
    p.vy += 900 * dt; p.vx += wind * 30 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
    if (!p.bounced && p.y > p.floor) { p.bounced = true; p.y = p.floor; p.vy *= -0.35; p.vr *= -1.5; }
    if (p.bounced) p.a -= dt * 0.9;
    return p.a > 0 && p.y < h + 30;
  },
  draw(g, p) {
    g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, p.a); g.fillStyle = p.c;
    g.beginPath(); g.ellipse(0, 0, p.s * 0.7, p.s, 0, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-p.s * 0.6, k * p.s * 0.45); g.quadraticCurveTo(0, k * p.s * 0.45 + 3, p.s * 0.6, k * p.s * 0.45); g.stroke(); }
    g.restore();
  },
});

/* ---------- fireflies (scroll --ff; gently follow pointer) ---------- */
P.setFireflies = function (dn) {
  if (reduced || !dn || dn.enabled === false) return;
  const count = mobile() ? (dn.firefliesCount && dn.firefliesCount.mobile) || 11 : (dn.firefliesCount && dn.firefliesCount.desktop) || 22;
  const flies = Array.from({ length: count }, () => ({
    x: Math.random(), y: Math.random() * 0.7 + 0.15,
    r: 2 + Math.random() * 1.5, ph: Math.random() * 6.28, spd: 2 + Math.random() * 2,
    dx: (Math.random() - 0.5) * 0.04, dy: (Math.random() - 0.5) * 0.03,
    ox: 0, oy: 0,
  }));
  let cv, g, w = 0, h = 0;
  const ensure = () => {
    if (cv) return;
    cv = document.createElement('canvas'); cv.id = 'ff'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
    (document.getElementById('fxSlot') || document.getElementById('stage') || document.body).appendChild(cv);
    g = cv.getContext('2d');
    const size = () => { w = innerWidth; h = innerHeight; const d = Math.min(devicePixelRatio || 1, 2); cv.width = w * d; cv.height = h * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
  };
  M.on((m, dtMs) => {
    const ff = parseFloat(getComputedStyle(html).getPropertyValue('--ff')) || 0;
    if (ff < 0.01) { if (cv) g && g.clearRect(0, 0, w, h); return; }
    ensure();
    const dt = Math.min(0.05, dtMs / 1000);
    g.clearRect(0, 0, w, h);
    // mild attraction toward pointer
    let tx = 0.5, ty = 0.45;
    if (PTR.active) { tx = PTR.x / w; ty = PTR.y / h; }
    for (const f of flies) {
      f.ph += dt * f.spd;
      if (PTR.active) {
        f.ox += (tx - f.x - f.ox) * 0.35 * dt;
        f.oy += (ty - f.y - f.oy) * 0.35 * dt;
      } else {
        f.ox *= 0.98; f.oy *= 0.98;
      }
      f.x = (f.x + f.dx * dt + f.ox * dt * 0.4 + 1) % 1;
      f.y = Math.min(0.95, Math.max(0.05, f.y + f.dy * dt + f.oy * dt * 0.4));
      const blink = reduced ? 0.7 : (Math.sin(f.ph) + 1) / 2;
      const a = ff * (0.25 + 0.75 * blink);
      const x = f.x * w, y = f.y * h;
      g.beginPath(); g.fillStyle = `rgba(245,230,160,${a.toFixed(3)})`;
      g.shadowColor = `rgba(232,194,122,${(a * 0.9).toFixed(3)})`; g.shadowBlur = reduced ? 0 : 8;
      g.arc(x, y, f.r, 0, 6.283); g.fill();
    }
    g.shadowBlur = 0;
  });
};

/* ---------- atmos fog dust (#atmos) with depth of field ---------- */
function setupAtmos() {
  const A = Object.assign({ enabled: true, max: { desktop: 48, mobile: 18 }, seedUrl: '/art/particles-spec.json', color: 'rgba(255,255,255,0.55)', colorFar: 'rgba(200,210,200,0.25)' }, CFG.atmos);
  if (!A.enabled) return;
  const slot = document.getElementById('fxSlot') || document.getElementById('stage') || document.body;
  const cv = document.createElement('canvas');
  cv.id = 'atmos'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
  slot.appendChild(cv);
  const g = cv.getContext('2d');
  let w = 0, h = 0, parts = [];
  const dpr = () => Math.min(devicePixelRatio || 1, mobile() ? 1.25 : 2);
  const size = () => { w = innerWidth; h = innerHeight; const d = dpr(); cv.width = w * d; cv.height = h * d; g.setTransform(d, 0, 0, d, 0, 0); };
  size(); addEventListener('resize', size);

  const cap = () => mobile() ? A.max.mobile : A.max.desktop;
  const makeFromSeed = (seeds) => {
    const n = Math.min(cap(), seeds.length || cap());
    const list = [];
    for (let i = 0; i < n; i++) {
      const s = seeds[i % seeds.length] || {};
      const depth = Math.min(1, Math.max(0, (s.size || 0.01) / 0.02)); // larger size → nearer
      list.push({
        x: (s.x != null ? s.x : Math.random()),
        y: (s.y != null ? s.y : Math.random()),
        depth,
        base: (s.size != null ? s.size : 0.008) * (mobile() ? 0.7 : 1),
        drift: (s.drift != null ? s.drift : 0.4),
        ph: Math.random() * 6.28,
        a: 0.15 + depth * 0.55,
      });
    }
    // pad up to cap with random far dust
    while (list.length < cap()) {
      const depth = Math.random() * 0.6;
      list.push({ x: Math.random(), y: Math.random(), depth, base: 0.003 + Math.random() * 0.008, drift: 0.2 + Math.random() * 0.5, ph: Math.random() * 6.28, a: 0.12 + depth * 0.4 });
    }
    return list;
  };

  const bootParts = (seeds) => {
    if (reduced) {
      // static sparse dots only
      parts = makeFromSeed(seeds).slice(0, Math.min(8, cap())).map(p => ({ ...p, drift: 0 }));
      drawStatic();
      return;
    }
    parts = makeFromSeed(seeds);
    M.on((m, dtMs) => {
      if (document.hidden) return;
      const dt = Math.min(0.05, dtMs / 1000);
      g.clearRect(0, 0, w, h);
      const wind = m.wind || 0;
      for (const p of parts) {
        p.ph += dt * (0.3 + p.drift);
        p.x += (Math.sin(p.ph) * 0.004 + wind * 0.012 * p.drift) * dt * 60 / 60;
        p.y += (Math.cos(p.ph * 0.7) * 0.002 + 0.004 * p.drift) * dt;
        if (p.x > 1.05) p.x -= 1.1; if (p.x < -0.05) p.x += 1.1;
        if (p.y > 1.05) p.y -= 1.1; if (p.y < -0.05) p.y += 1.1;
        const r = Math.max(0.6, p.base * Math.min(w, h) * (0.55 + p.depth * 1.4));
        const a = p.a * (0.55 + p.depth * 0.45);
        g.beginPath();
        g.fillStyle = p.depth > 0.45 ? A.color.replace(/[\d.]+\)$/, a.toFixed(3) + ')') : A.colorFar.replace(/[\d.]+\)$/, (a * 0.7).toFixed(3) + ')');
        // soft DOF: far particles slightly blurred via larger alpha falloff (no filter for perf)
        g.arc(p.x * w, p.y * h, r, 0, 6.283);
        g.fill();
      }
    });
  };
  const drawStatic = () => {
    g.clearRect(0, 0, w, h);
    for (const p of parts) {
      const r = Math.max(0.6, p.base * Math.min(w, h));
      g.beginPath(); g.fillStyle = A.colorFar; g.arc(p.x * w, p.y * h, r, 0, 6.283); g.fill();
    }
  };

  fetch(A.seedUrl).then(r => r.ok ? r.json() : null).then(j => {
    bootParts((j && j.particles) || []);
  }).catch(() => bootParts([]));
}

/* ---------- pointer / touch tracker ---------- */
const PTR = { x: -9999, y: -9999, down: false, active: false };
function setupPointer() {
  const set = (e, on) => {
    const t = e.touches ? e.touches[0] : e;
    if (!t) { PTR.active = false; PTR.down = false; return; }
    PTR.x = t.clientX; PTR.y = t.clientY; PTR.active = on !== false;
    if (e.type === 'pointerdown' || e.type === 'touchstart') PTR.down = true;
    if (e.type === 'pointerup' || e.type === 'touchend' || e.type === 'pointercancel') PTR.down = false;
  };
  const off = () => { PTR.active = false; PTR.down = false; };
  addEventListener('pointermove', e => set(e, true), { passive: true });
  addEventListener('pointerdown', e => set(e, true), { passive: true });
  addEventListener('pointerup', off, { passive: true });
  addEventListener('pointercancel', off, { passive: true });
  addEventListener('pointerleave', off, { passive: true });
  addEventListener('touchstart', e => set(e, true), { passive: true });
  addEventListener('touchmove', e => set(e, true), { passive: true });
  addEventListener('touchend', off, { passive: true });
}

/* ---------- squirrels: flee + click nibble/tail ---------- */
function setupCritters() {
  const C = Object.assign({ enabled: true, count: { desktop: 5, mobile: 3 }, radius: 140, returnMs: 1800, art: null, color: '#8B7355', clickable: true }, CFG.critters);
  if (!C.enabled || reduced) return;
  const n = mobile() ? C.count.mobile : C.count.desktop;
  const layer = document.createElement('div');
  layer.id = 'critters'; layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden';
  (document.getElementById('fxSlot') || document.getElementById('stage') || document.body).appendChild(layer);

  const SIL = `<svg viewBox="0 0 64 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="${C.color}">
    <ellipse cx="28" cy="30" rx="16" ry="11"/><circle cx="42" cy="18" r="9"/>
    <ellipse cx="48" cy="10" rx="5" ry="8" transform="rotate(20 48 10)"/>
    <path d="M12 28 Q2 10 14 6 Q8 22 16 28" opacity=".9"/>
    <circle cx="45" cy="16" r="1.4" fill="#1a1a1a"/>
  </svg>`;

  const perch = i => {
    const spots = [
      [0.08, 0.28], [0.92, 0.32], [0.12, 0.55], [0.88, 0.58],
      [0.18, 0.78], [0.82, 0.75], [0.05, 0.42], [0.95, 0.48], [0.22, 0.22],
    ];
    return spots[i % spots.length];
  };
  const sqs = Array.from({ length: n }, (_, i) => {
    const [px, py] = perch(i);
    const el = document.createElement('div');
    el.className = 'squirrel';
    el.style.cssText = 'position:absolute;width:56px;height:44px;will-change:transform,opacity;transform:translate3d(-9999px,0,0);opacity:0;transition:opacity 400ms ease;pointer-events:auto;cursor:pointer';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', '松鼠');
    if (C.art) el.innerHTML = `<img src="${C.art}" alt="" draggable="false" style="width:100%;height:100%;object-fit:contain;pointer-events:none">`;
    else el.innerHTML = SIL;
    // invisible hit pad a bit larger
    layer.appendChild(el);
    return { el, homeX: px, homeY: py, x: px, y: py, vx: 0, vy: 0, face: px < 0.5 ? 1 : -1, calm: 0, hopTo: null, act: 0, actKind: null };
  });

  setTimeout(() => sqs.forEach(s => { s.el.style.opacity = '0.95'; }), 600);

  // click / tap → nibble or wag
  if (C.clickable) {
    layer.style.pointerEvents = 'none';
    sqs.forEach(s => {
      s.el.style.pointerEvents = 'auto';
      s.el.addEventListener('pointerdown', e => {
        e.stopPropagation();
        s.act = 1.1;
        s.actKind = Math.random() < 0.5 ? 'nibble' : 'wag';
        s.el.classList.remove('sq-nibble', 'sq-wag');
        void s.el.offsetWidth;
        s.el.classList.add(s.actKind === 'nibble' ? 'sq-nibble' : 'sq-wag');
      }, { passive: true });
    });
  }

  const R = C.radius, retT = C.returnMs / 1000;
  M.on((m, dtMs) => {
    if (document.hidden) return;
    const dt = Math.min(0.05, dtMs / 1000), W = innerWidth, H = innerHeight;
    for (let i = 0; i < sqs.length; i++) {
      const s = sqs[i];
      const cx = s.x * W, cy = s.y * H;
      if (PTR.active) {
        const dx = cx - PTR.x, dy = cy - PTR.y, d = Math.hypot(dx, dy) || 1;
        if (d < R) {
          const f = ((R - d) / R) * (PTR.down ? 10 : 6.2);
          s.vx += (dx / d) * f * 70 * dt;
          s.vy += (dy / d) * f * 70 * dt;
          s.calm = 0; s.hopTo = null;
          s.face = s.vx >= 0 ? 1 : -1;
        }
      }
      s.calm += dt;
      if (s.calm > retT * 0.55 && !s.hopTo && (Math.hypot(s.x - s.homeX, s.y - s.homeY) > 0.04)) {
        if (Math.random() < 0.35) {
          const [nx, ny] = perch((i + 3 + Math.floor(Math.random() * 4)) % 9);
          s.hopTo = { x: nx, y: ny }; s.homeX = nx; s.homeY = ny;
        } else {
          s.hopTo = { x: s.homeX, y: s.homeY };
        }
      }
      if (s.hopTo) {
        s.vx += (s.hopTo.x * W - s.x * W) * 2.2 * dt;
        s.vy += (s.hopTo.y * H - s.y * H) * 2.2 * dt;
        if (Math.hypot(s.x - s.hopTo.x, s.y - s.hopTo.y) < 0.012) s.hopTo = null;
      } else if (s.calm > 0.2) {
        s.vx += (s.homeX * W - s.x * W) * 0.6 * dt;
        s.vy += (s.homeY * H - s.y * H) * 0.6 * dt;
      }
      s.vx *= 0.86; s.vy *= 0.86;
      s.x = Math.min(0.97, Math.max(0.03, s.x + s.vx * dt / W));
      s.y = Math.min(0.92, Math.max(0.08, s.y + s.vy * dt / H));
      if (s.act > 0) s.act = Math.max(0, s.act - dt);
      const sc = 0.92 + Math.min(0.12, Math.hypot(s.vx, s.vy) / 400);
      s.el.style.transform = `translate3d(${(s.x * W - 28).toFixed(1)}px,${(s.y * H - 22).toFixed(1)}px,0) scaleX(${s.face}) scale(${sc.toFixed(3)})`;
    }
  });
}

/* ---------- leaf react: boost sway + local nudge near pointer ---------- */
function setupLeafReact() {
  const L = Object.assign({ enabled: true, radius: 200, boost: 3.0, nudgePx: 6 }, CFG.leafReact);
  if (!L.enabled || reduced) return;
  M.leafBoost = 0;
  M._leafBoostMul = L.boost;
  M.on(() => {
    if (!PTR.active) {
      M.leafBoost += (0 - M.leafBoost) * 0.08;
      document.querySelectorAll('[data-sway]').forEach(el => {
        el._nudgeX = (el._nudgeX || 0) * 0.85;
        el._nudgeY = (el._nudgeY || 0) * 0.85;
      });
      return;
    }
    let near = 0;
    document.querySelectorAll('[data-sway]').forEach(el => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = Math.hypot(PTR.x - cx, PTR.y - cy);
      if (d < L.radius) {
        const k = (L.radius - d) / L.radius;
        near = Math.max(near, k);
        // light local displacement away from pointer (surface push)
        const ang = Math.atan2(cy - PTR.y, cx - PTR.x);
        const push = k * L.nudgePx;
        el._nudgeX = lerp(el._nudgeX || 0, Math.cos(ang) * push, 0.25);
        el._nudgeY = lerp(el._nudgeY || 0, Math.sin(ang) * push, 0.25);
      } else {
        el._nudgeX = (el._nudgeX || 0) * 0.85;
        el._nudgeY = (el._nudgeY || 0) * 0.85;
      }
    });
    // L4 / FG plates: edge zones also reactive
    document.querySelectorAll('.px-L4, .px-fg, .px-moss').forEach(plate => {
      const r = plate.getBoundingClientRect();
      const edge = Math.min(PTR.x - r.left, r.right - PTR.x, PTR.y - r.top, r.bottom - PTR.y);
      if (edge >= 0 && edge < L.radius) near = Math.max(near, (L.radius - edge) / L.radius * 0.75);
    });
    M.leafBoost += (near - M.leafBoost) * 0.22;
  });
}

function setupParticles() {
  const C = Object.assign({ enabled: true, modules: ['leaf', 'cone'], max: { desktop: 36, mobile: 14 }, rate: {}, colors: {} }, CFG.particles);
  if (!C.enabled || reduced) return;
  const cv = document.createElement('canvas'); cv.id = 'fx'; cv.setAttribute('aria-hidden', 'true');
  (document.getElementById('fxSlot') || document.body).appendChild(cv);
  const g = cv.getContext('2d'); let w = 0, h = 0;
  const dpr = () => Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2);
  const size = () => { w = innerWidth; h = innerHeight; const d = dpr(); cv.width = w * d; cv.height = h * d; g.setTransform(d, 0, 0, d, 0, 0); };
  size(); addEventListener('resize', size);
  const acc = {};
  M.on((m, dtMs) => {
    if (document.hidden) return;
    const dt = Math.min(0.05, dtMs / 1000), cap = mobile() ? C.max.mobile : C.max.desktop, k = (m.wind - W.calm) / (1 - W.calm);
    for (const name of C.modules) {
      const impl = P.impls[name]; if (!impl) continue;
      const r = C.rate[name] || [0.2, 2];
      acc[name] = (acc[name] || 0) + lerp(r[0], r[1], Math.max(0, k)) * dt * (mobile() ? 0.6 : 1);
      while (acc[name] >= 1) {
        acc[name] -= 1;
        if (P.live.length < cap) { const p = impl.spawn(w, h, m.wind, C.colors[name] || ['#bbb']); p._t = name; P.live.push(p); P.spawned[name] = (P.spawned[name] || 0) + 1; }
      }
    }
    g.clearRect(0, 0, w, h);
    P.live = P.live.filter(p => { const impl = P.impls[p._t]; const ok = impl.update(p, dt, m.wind, w, h); if (ok) impl.draw(g, p); return ok; });
  });
}

function boot() {
  measure();
  addEventListener('resize', () => requestAnimationFrame(measure));
  addEventListener('load', measure);
  new ResizeObserver(() => measure()).observe(document.body);
  setupAtmos();
  if (reduced) {
    document.querySelectorAll('[data-sway]').forEach((el, i) => { el.style.rotate = ((i % 2 ? 1.2 : -1.2)) + 'deg'; });
    return;
  }
  setupPointer();
  setupLeafReact();
  setupCritters();
  setupParticles();
  requestAnimationFrame(frame);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
