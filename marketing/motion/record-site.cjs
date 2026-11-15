const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const D = process.argv[2];
  const b = await chromium.launch();
  const rec = async (name, url, script) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    await ctx.addInitScript(() => { try { localStorage.setItem('sp.intro', '1'); localStorage.setItem('sp.lookout', String(Date.now())); } catch {} });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const dir = path.join(D, name); fs.mkdirSync(dir, { recursive: true });
    const cdp = await ctx.newCDPSession(p); const frames = [];
    cdp.on('Page.screencastFrame', async (f) => {
      const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg');
      fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532 });
    await script(p);
    await cdp.send('Page.stopScreencast');
    // ffconcat with real frame durations -> constant 30 fps video
    let list = 'ffconcat version 1.0\n';
    frames.forEach((f, i) => { const d = i < frames.length - 1 ? frames[i + 1].t - f.t : 0.1; list += `file '${f.file}'\nduration ${d.toFixed(4)}\n`; });
    fs.writeFileSync(path.join(D, name + '.txt'), list);
    console.log(name, frames.length, 'frames over', (frames.at(-1).t - frames[0].t).toFixed(1), 's');
    await ctx.close();
  };
  const smooth = (p, y, ms) => p.evaluate(([y, ms]) => new Promise((ok) => { const y0 = scrollY, t0 = performance.now(); const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; scrollTo(0, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(st) : ok(); }; requestAnimationFrame(st); }), [y, ms]);
  await rec('home', 'https://smugpara.com/', async (p) => { await p.waitForTimeout(1500); await smooth(p, 380, 1800); await p.waitForTimeout(6000); });
  await rec('product', 'https://smugpara.com/shop/11-11-frtb', async (p) => {
    await p.waitForTimeout(1200);
    const y = await p.evaluate(() => { const el = [...document.querySelectorAll('*')].find((e) => /left|Leaves|ends|Sale ends/i.test(e.textContent || '') && e.children.length === 0 && /\d+d|\d+h/.test(e.textContent)); return el ? el.getBoundingClientRect().top + scrollY - 250 : 600; });
    await smooth(p, y, 2000); await p.waitForTimeout(5000);
  });
  await b.close();
})();
