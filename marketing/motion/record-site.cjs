// Records smugpara pages on an emulated iPhone at 3x via Chrome's screencast, with a soft tap ripple.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const D = process.argv[2]; const only = process.argv[3];
const RIPPLE = () => {
  window.__tap = (x, y) => {
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'fixed', left: x - 28 + 'px', top: y - 28 + 'px', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,.55)', boxShadow: '0 0 0 2px rgba(0,0,0,.25)', zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .7s cubic-bezier(.16,1,.3,1), opacity .7s ease', transform: 'scale(.6)', opacity: '1' });
    document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0' }); setTimeout(() => d.remove(), 800);
  };
};
(async () => {
  const b = await chromium.launch();
  const rec = async (name, url, script, seed) => {
    if (only && only !== name) return;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    await ctx.addInitScript((seed) => { try { localStorage.setItem('sp.intro', '1'); localStorage.setItem('sp.lookout', String(Date.now())); for (const [k, v] of Object.entries(seed || {})) localStorage.setItem(k, v); } catch {} }, seed);
    await ctx.addInitScript(RIPPLE);
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const dir = path.join(D, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(p); const frames = [];
    cdp.on('Page.screencastFrame', (f) => {
      const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg');
      fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532 });
    await script(p);
    await cdp.send('Page.stopScreencast');
    let list = 'ffconcat version 1.0\n';
    frames.forEach((f, i) => { const d = i < frames.length - 1 ? frames[i + 1].t - f.t : 0.1; list += `file '${f.file}'\nduration ${d.toFixed(4)}\n`; });
    fs.writeFileSync(path.join(D, name + '.txt'), list);
    console.log(name, frames.length, 'frames,', (frames.at(-1).t - frames[0].t).toFixed(1), 's');
    await ctx.close();
  };
  const smooth = (p, y, ms) => p.evaluate(([y, ms]) => new Promise((ok) => { const y0 = scrollY, t0 = performance.now(); const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; scrollTo(0, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(st) : ok(); }; requestAnimationFrame(st); }), [y, ms]);
  const yOf = (p, sel) => p.evaluate((sel) => { const e = typeof sel === 'string' ? [...document.querySelectorAll('h1,h2,p,div,span')].find((x) => x.textContent.trim() === sel) : null; return e ? e.getBoundingClientRect().top + scrollY : 0; }, sel);
  const tap = async (p, loc) => { const bx = await loc.boundingBox(); await p.evaluate(([x, y]) => window.__tap(x, y), [bx.x + bx.width / 2, bx.y + bx.height / 2]); await p.waitForTimeout(250); await loc.tap(); };

  // Frame 2: the world. Brand codes and who we are.
  await rec('world', 'https://smugpara.com/', async (p) => {
    const y = await yOf(p, 'Brand codes');
    await p.waitForTimeout(600); await smooth(p, y - 60, 3500); await p.waitForTimeout(2500);
    const w = await yOf(p, 'Who We Are'); await smooth(p, w - 80, 3000); await p.waitForTimeout(2500);
  });
  // Frame 3: the drop. Hold on the X-ray scanner while it cycles the looks.
  await rec('drop', 'https://smugpara.com/', async (p) => { await smooth(p, 330, 1500); await p.waitForTimeout(13000); });
  // Frame 5: the twist. Tap "Design your own" and land in the designer (local demo copy, signed in).
  await rec('twist', 'http://localhost:5173/', async (p) => {
    await smooth(p, 140, 1200); await p.waitForTimeout(1200);
    await tap(p, p.getByRole('link', { name: /Design your own/ }).first());
    await p.waitForTimeout(5500);
  }, { 'sp.account': JSON.stringify({ email: 'demo@smugpara.com', name: 'Demo' }) });
  await b.close();
})();
