window.VibeArt = function (skin) {
  const BASE = '/art/rebuild/' + (skin === 'hamza' ? 'hamza' : 'roof');
  return {
    skin, BASE,
    url: (f) => BASE + '/' + f,
    styleUrl: (id) => BASE + '/style-' + id + '.png',
    tierUrl: (id) => BASE + '/tier-' + id + '.png',
    heroDesktop: BASE + '/hero-still-2560.jpg',
    heroMobile: BASE + '/hero-still-1080m.jpg',
  };
};
