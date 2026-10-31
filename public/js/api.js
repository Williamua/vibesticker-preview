/* Shared VibeSticker API helpers — used by Roof + Hamza previews */
window.VibeAPI = (function () {
  let cfg = { demoMode: true, provider: 'mock', freeLeft: 0, credits: 0, styles: [], tiers: {} };

  async function loadConfig() {
    try {
      cfg = await (await fetch('/api/config')).json();
    } catch (e) {
      console.warn('config', e);
    }
    return cfg;
  }

  function getConfig() { return cfg; }

  async function generate(photoFile, styleId) {
    const fd = new FormData();
    fd.append('photo', photoFile);
    fd.append('style', styleId);
    const r = await fetch('/api/generate', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || '生成失败');
    cfg.freeLeft = j.freeLeft;
    cfg.credits = j.credits;
    return j;
  }

  async function checkout(tier) {
    const r = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || '结账失败');
    return j;
  }

  function isDemo() {
    return !!(cfg.demoMode || cfg.provider === 'mock');
  }

  return { loadConfig, getConfig, generate, checkout, isDemo };
})();
