/* VibeSticker · scene config — the ONE place to swap background / art / motion tuning.
   The visual direction is not final (light, minimal, interactive; new comps pending), so everything
   visual here is neutral and replaceable without touching app.js / motion.js / ix.js.

   How to reskin:
   1) Background: set background.image (static) or background.video.* — or set both to null for a plain colour.
      The same values are also exposed as CSS vars (--scene-bg-image / --scene-bg-color) on <html>.
   2) Parallax layers: edit `layers` (files live in /media/layers/<file>-<2560|1080m>.<webp|png>). depth = px moved per px scrolled.
   3) Card art: put files in /public/art/ and map slot → URL in `cardArt` (see README "替换素材"). null = neutral placeholder.
   4) Particles: `particles.modules` lists plug-in names registered in motion.js (VSParticles.register). */
window.VS_CONFIG = {
  background: {
    color: '#0d120d',
    image: null,                       // e.g. '/art/bg-hero-2560.jpg' — static image replaces the video when set
    video: {                           // set to null to disable the video
      desktop: '/media/rainforest-loop-1080.mp4',
      mobile: '/media/rainforest-loop-mobile-720.mp4',
      posterDesktop: '/media/rainforest-loop-1080-poster.jpg',
      posterMobile: '/media/rainforest-loop-mobile-720-poster.jpg',
    },
    depth: 0.06,                       // background parallax: px per px scrolled (desktop and mobile)…
    budget: 0.45,                      // …capped so total travel ≤ 0.45 × viewport height over the whole page
    inertia: 16,                       // extra spring offset per px/ms of scroll speed (max ±48px)
  },
  layers: [                            // far → near. depth/budget/inertia as for background; sway = rotates with the wind
    { id: 'L2', file: 'L2-lightbeams', depth: 0.10, budget: 0.6, inertia: 22 },
    { id: 'L4', file: 'L4-foreleaves', depth: 0.32, budget: 0.9, inertia: 34, sway: true },
  ],
  wind: {
    calm: 0.15,                        // 0..1 baseline wind
    velocityForMax: 2.2,               // px/ms scroll speed that gives full wind (fast flick ≈ 2–4 px/ms)
    attack: 0.18, release: 0.035,      // smoothing per frame (rise fast, settle slow)
    swayDeg: [1.2, 7],                 // fore-layer sway amplitude calm → max wind
  },
  particles: {
    enabled: true,
    modules: ['leaf', 'cone'],         // plug-ins; register new ones with VSParticles.register(name, impl)
    max: { desktop: 36, mobile: 14 },  // hard cap on live particles
    rate: { leaf: [0.25, 5], cone: [0, 1.2] },   // spawns per second at calm → max wind
    colors: { leaf: ['#C9CFC4', '#B7BFB0', '#DDE2D6'], cone: ['#A89F92', '#8E8579'] },  // neutral placeholders
  },
  // scroll-driven day → dusk → night (progress p ∈ [0,1] over #roll). No clock / sessionStorage.
  dayNight: {
    enabled: true,
    // p ranges: day | dusk (warm soft-light) | night (cool multiply) | fireflies fade in
    dusk:  [0.18, 0.55],               // warm #FF9A4D soft-light opacity 0 → 0.28
    night: [0.45, 0.90],               // cool #1B2A4A multiply opacity 0 → 0.55; brightness/sat via CSS filter on stage
    fireflies: [0.72, 1.0],            // canvas fireflies fade in near the end of the roll
    warm: '#FF9A4D', cool: '#1B2A4A',
    firefliesCount: { desktop: 22, mobile: 11 },
  },
  // pointer/touch critters: squirrels flee, nearby leaves sway harder. Art paths replaceable (G水彩 later).
  critters: {
    enabled: true,
    count: { desktop: 5, mobile: 3 },
    radius: 140,                       // px: flee when pointer within this
    returnMs: 1800,                    // ease back (or hop to a new perch) after pointer leaves
    art: null,                         // e.g. '/art/squirrel.svg' — null = inline SVG silhouette placeholder
    color: '#8B7355',                  // placeholder fill (neutral; swap with art)
  },
  leafReact: {
    enabled: true,
    radius: 160,                       // px around pointer that boosts sway
    boost: 2.4,                        // multiply sway amplitude near pointer
  },
  pop: { distance: 90, duration: 520 },          // card pop-in: travel px and ms (spring)
  cardArt: {                           // slot → image URL. null = neutral placeholder shape
    'style-anime': null, 'style-chibi': null, 'style-toy3d': null, 'style-pixel': null, 'style-watercolor': null,
    'result-frame': null, 'wall-empty': null, 'rank-empty': null, 'tier-single': null, 'tier-pack': null, 'tier-pro': null,
  },
};
(function () {
  const c = window.VS_CONFIG.background, s = document.documentElement.style;
  s.setProperty('--scene-bg-color', c.color);
  s.setProperty('--scene-bg-image', c.image ? `url("${c.image}")` : 'none');
})();
