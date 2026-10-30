window.VibeArt = function (skin) {
  const isHamza = skin === 'hamza';
  const BASE = '/art/rebuild/' + (isHamza ? 'hamza' : 'roof');
  return {
    skin, BASE,
    url: (f) => BASE + '/' + f,
    styleUrl: (id) => BASE + '/style-' + id + '.png',
    tierUrl: (id) => BASE + '/tier-' + id + '.png',
    // Hamza prefers hero-field; Roof uses hero-still; still aliases exist on both for fallback
    heroDesktop: BASE + (isHamza ? '/hero-field-2560.jpg' : '/hero-still-2560.jpg'),
    heroMobile: BASE + (isHamza ? '/hero-field-1080m.jpg' : '/hero-still-1080m.jpg'),
    heroStillDesktop: BASE + '/hero-still-2560.jpg',
    heroStillMobile: BASE + '/hero-still-1080m.jpg',
  };
};
