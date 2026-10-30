/* VibeSticker · interaction kit (skin-agnostic, reusable)
   data-pop="left|right|top|bottom|top-left|top-right|bottom-left|bottom-right|auto"
        card springs in from that side of the scene when it scrolls into view. data-pop-delay="ms" optional;
        siblings in a [data-pop-group] get an automatic 60ms stagger.
   data-tilt[="deg"]   mouse hover: lift + slight scale + 3D tilt following the pointer (fine pointers only)
   data-press          pointer (mouse / touch / pen) press: squeeze → springy release + small ripple
   VSIx.bounce(el)     one-shot "picked" bounce (e.g. style selected, upload success)
   VSIx.scan(root)     (re)bind elements rendered later
   Only transform-family properties (translate / scale / rotate / transform) and opacity are animated.
   prefers-reduced-motion: cards simply appear, no tilt, press = opacity blink only. */
(() => {
'use strict';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const CFG = (window.VS_CONFIG && window.VS_CONFIG.pop) || {};
const DIST = CFG.distance || 90, DUR = CFG.duration || 520;
document.documentElement.style.setProperty('--pop-dur', DUR + 'ms');
const VEC = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1], 'top-left': [-0.8, -0.8], 'top-right': [0.8, -0.8], 'bottom-left': [-0.8, 0.8], 'bottom-right': [0.8, 0.8] };
const AUTO = ['left', 'bottom', 'right', 'top'];

/* ---------- pop-in ---------- */
let io;
function preparePop(el, idx) {
  if (el.dataset.popReady) return; el.dataset.popReady = '1';
  let dir = el.dataset.pop;
  if (!VEC[dir]) dir = AUTO[idx % AUTO.length];
  const [vx, vy] = VEC[dir];
  el.style.setProperty('--pop-x', (vx * DIST).toFixed(0) + 'px');
  el.style.setProperty('--pop-y', (vy * DIST).toFixed(0) + 'px');
  el.style.setProperty('--pop-r', (vx ? vx * 6 : (idx % 2 ? 4 : -4)) + 'deg');
  const group = el.closest('[data-pop-group]');
  const delay = el.dataset.popDelay != null ? +el.dataset.popDelay : group ? [...group.querySelectorAll('[data-pop]')].indexOf(el) * 60 : 0;
  el.style.setProperty('--pop-delay', delay + 'ms');
  el.classList.add('pop');
  if (reduced) { el.classList.add('popped'); return; }
  io.observe(el);
}
function scanPop(root = document) {
  io = io || new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('popped'); io.unobserve(e.target);
      setTimeout(() => e.target.classList.add('pop-done'), DUR + parseFloat(e.target.style.getPropertyValue('--pop-delay') || 0) + 50); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  [...root.querySelectorAll('[data-pop]')].forEach((el, i) => preparePop(el, i));
}

/* ---------- tilt (hover) ---------- */
function bindTilt() {
  if (reduced || !finePointer) return;
  let cur = null, raf = 0, ev = null;
  const apply = () => {
    raf = 0; if (!cur || !ev) return;
    const r = cur.getBoundingClientRect(), max = +cur.dataset.tilt || 8;
    const px = (ev.clientX - r.left) / r.width - 0.5, py = (ev.clientY - r.top) / r.height - 0.5;
    cur.style.setProperty('--rx', (-py * max).toFixed(2) + 'deg');
    cur.style.setProperty('--ry', (px * max).toFixed(2) + 'deg');
  };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest('[data-tilt]');
    if (t !== cur) { if (cur) leave(cur); cur = t; if (cur) cur.classList.add('tilting'); }
    ev = e; if (cur && !raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  const leave = el => { el.classList.remove('tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
  document.addEventListener('pointerleave', () => { if (cur) leave(cur); cur = null; });
}

/* ---------- press (click / tap) ---------- */
function ripple(x, y) {
  const r = document.createElement('span'); r.className = 'ix-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px';
  document.body.appendChild(r); setTimeout(() => r.remove(), 450);
}
function bindPress() {
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest && e.target.closest('[data-press]');
    if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    t.classList.remove('ix-release'); t.classList.add('ix-pressed');
    if (!reduced) ripple(e.clientX, e.clientY);
    const up = () => {
      t.classList.remove('ix-pressed'); void t.offsetWidth; t.classList.add('ix-release');
      setTimeout(() => t.classList.remove('ix-release'), 360);
      removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }, { passive: true });
  // keyboard activation gets the same release bounce
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target.closest && e.target.closest('[data-press]'); if (t) bounce(t, 'ix-release', 360);
  });
}
function bounce(el, cls = 'ix-bounce', ms = 340) {
  if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  clearTimeout(el._bt); el._bt = setTimeout(() => el.classList.remove(cls), ms);
}

window.VSIx = { scan: scanPop, bounce, reduced };
function boot() { scanPop(); bindTilt(); bindPress(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
