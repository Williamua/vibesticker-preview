/* VibeSticker · scene config — ONE place to swap background / art / motion tuning.
   G 水彩版素材已接入（public/art + public/media）。设计换图时只改这里的路径即可。

   How to reskin:
   1) Background: set background.image (static) or background.video.* — or set both to null for a plain colour.
   2) Parallax layers: edit `layers` (art files under /art/, or /media/layers/<file>-<2560|1080m>.webp|png).
      kind:'art' → single URL (srcDesktop/srcMobile); kind:'pair' → media/layers pair naming.
   3) Card art: /art/ or /media/cards/ mapped in `cardArt`.
   4) Particles / atmos: modules + atmos seed (particles-spec.json). */
window.VS_CONFIG = {
  background: {
    color: '#e8ebe4',
    // G watercolor hero (static). Set image:null and restore video:{} to go back to rainforest loop.
    image: null,                       // overridden below per-viewport via imageDesktop/imageMobile
    imageDesktop: '/media/bg-hero-2560.jpg',
    imageMobile: '/media/bg-hero-1080m.jpg',
    video: null,                       // disabled while on G watercolor still; re-enable rainforest if needed
    depth: 0.05,
    budget: 0.40,
    inertia: 18,
  },
  layers: [                            // far → near. depth = px moved per px scrolled
    // mid fog plate (G watercolor)
    { id: 'FOG', kind: 'art', src: '/art/layer-fog.png', depth: 0.12, budget: 0.55, inertia: 20, opacity: 0.72, blend: 'normal', className: 'px-fog' },
    // soft moss mid-near
    { id: 'MOSS', kind: 'art', src: '/art/layer-moss.png', depth: 0.20, budget: 0.7, inertia: 26, opacity: 0.85, blend: 'normal', className: 'px-moss', sway: true },
    // soft light beams leftover (optional ambient); keep low opacity under watercolor
    { id: 'L2', kind: 'pair', file: 'L2-lightbeams', depth: 0.10, budget: 0.5, inertia: 18, opacity: 0.18, blend: 'screen', className: 'px-L2' },
    // watercolor fore-leaves (corners only) — G replacement for rainforest L4
    { id: 'L4', kind: 'pair', file: 'L4-foreleaves', depth: 0.34, budget: 0.95, inertia: 36, opacity: 1, blend: 'normal', className: 'px-L4', sway: true },
    // thick foreground branches (Awkward/moss feel)
    { id: 'FG', kind: 'art', src: '/art/layer-fg-branches.png', depth: 0.48, budget: 1.0, inertia: 42, opacity: 1, blend: 'normal', className: 'px-fg', sway: true },
    // painted fireflies plate — opacity driven by --ff (scroll dusk); pointer attraction in motion.js
    { id: 'FFPLATE', kind: 'art', src: '/art/layer-fireflies.png', depth: 0.28, budget: 0.7, inertia: 24, opacity: 0, blend: 'screen', className: 'px-ffplate' },
  ],
  wind: {
    calm: 0.12,
    velocityForMax: 2.0,
    attack: 0.16, release: 0.03,
    swayDeg: [1.0, 6.5],
  },
  particles: {
    enabled: true,
    modules: ['leaf', 'cone'],
    max: { desktop: 28, mobile: 10 },
    rate: { leaf: [0.18, 3.5], cone: [0, 0.9] },
    colors: { leaf: ['#C4B89A', '#A8B59A', '#D5CBB0'], cone: ['#A89F92', '#8E8579'] },
  },
  // mid-fog atmos dust (canvas #atmos). Seeds from design particles-spec.json (normalised).
  atmos: {
    enabled: true,
    max: { desktop: 48, mobile: 18 },
    // size/opacity scale with "depth" (0 far → 1 near) for DOF feel
    seedUrl: '/art/particles-spec.json',
    color: 'rgba(255,255,255,0.55)',
    colorFar: 'rgba(200,210,200,0.25)',
  },
  // scroll-driven day → dusk → night (progress p ∈ [0,1] over #roll)
  dayNight: {
    enabled: true,
    dusk:  [0.18, 0.55],
    night: [0.45, 0.90],
    fireflies: [0.72, 1.0],
    warm: '#FF9A4D', cool: '#1B2A4A',
    firefliesCount: { desktop: 22, mobile: 11 },
  },
  critters: {
    enabled: true,
    count: { desktop: 3, mobile: 2 },
    radius: 170,
    returnMs: 1600,
    art: '/art/squirrel.svg',          // G watercolor squirrel (embedded bitmap in svg)
    color: '#8B7355',
    clickable: true,                   // tap/click → nibble + tail wag
  },
  leafReact: {
    enabled: true,
    radius: 200,                       // stronger local surface reaction
    boost: 3.0,
    nudgePx: 6,                        // light local translate toward/away from pointer
  },
  // floaty pop (mild overshoot, longer/softer — Awkward/moss feel, not bouncy elastic)
  pop: { distance: 64, duration: 680 },
  // hero scroll/drag hint (thin double arrow); fades after first scroll
  scrollHint: { enabled: true, fadeAfter: 80 },
  // GSAP scrub lag (higher = floatier camera follow)
  scrub: 1.7,
  cardArt: {
    'style-anime': '/art/style-anime.png',
    'style-chibi': '/art/style-chibi.png',
    'style-toy3d': '/art/style-toy3d.png',
    'style-pixel': '/art/style-pixel.png',
    'style-watercolor': '/art/style-watercolor.png',
    'result-frame': '/art/result-frame.png',
    'wall-empty': '/art/wall-empty.png',
    'rank-empty': '/art/rank-empty.png',
    'tier-single': '/art/tier-single.png',
    'tier-pack': '/art/tier-pack.png',
    'tier-pro': '/art/tier-pro.png',
  },
  // style card pop directions (CARDS.md)
  stylePop: {
    anime: { dir: 'left', delay: 0 },
    chibi: { dir: 'bottom', delay: 80 },
    toy3d: { dir: 'right', delay: 40 },
    pixel: { dir: 'top', delay: 120 },
    watercolor: { dir: 'bottom-right', delay: 200 },
  },
};
(function () {
  const c = window.VS_CONFIG.background, s = document.documentElement.style;
  s.setProperty('--scene-bg-color', c.color);
  const mobile = matchMedia('(max-width: 768px)').matches;
  const img = c.image || (mobile ? c.imageMobile : c.imageDesktop) || null;
  s.setProperty('--scene-bg-image', img ? `url("${img}")` : 'none');
  // expose chosen still so app.js can show .l-bgimg
  c._resolvedImage = img;
})();
