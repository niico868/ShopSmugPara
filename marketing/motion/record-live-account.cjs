// Live-site recordings as the signed-in test customer (iPhone 3x, screencast, tap ripples).
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const [S, D, which] = process.argv.slice(2);
const RIPPLE = () => { window.__tap = (x, y) => { const d = document.createElement('div'); Object.assign(d.style, { position: 'fixed', left: x - 28 + 'px', top: y - 28 + 'px', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,.55)', boxShadow: '0 0 0 2px rgba(0,0,0,.25)', zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .7s cubic-bezier(.16,1,.3,1), opacity .7s ease', transform: 'scale(.6)' }); document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0' }); setTimeout(() => d.remove(), 800); }; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: S + '/test-session.json', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => { try { localStorage.removeItem('sp.designer.draft'); localStorage.setItem('sp.intro', '1'); localStorage.setItem('sp.lookout', String(Date.now())); } catch {} });
  await ctx.addInitScript(RIPPLE);
  const p = await ctx.newPage();
  await p.goto('https://smugpara.com/design', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const smooth = (y, ms) => p.evaluate(([y, ms]) => new Promise((ok) => { const y0 = scrollY, t0 = performance.now(); const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; scrollTo(0, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(st) : ok(); }; requestAnimationFrame(st); }), [y, ms]);
  const tap = async (loc, wait = 600) => { await loc.scrollIntoViewIfNeeded().catch(() => {}); const bx = await loc.boundingBox(); await p.evaluate(([x, y]) => window.__tap(x, y), [bx.x + bx.width / 2, bx.y + bx.height / 2]); await p.waitForTimeout(220); await loc.tap(); await p.waitForTimeout(wait); };
  const top = (loc) => loc.evaluate((e) => e.getBoundingClientRect().top + scrollY);
  const dir = path.join(D, which); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(p); const frames = [];
  cdp.on('Page.screencastFrame', (f) => { const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg'); fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532 });
  await p.waitForTimeout(1200);

  if (which === 'create') {
    const add = p.getByRole('button', { name: /^Add text/ });
    await smooth((await top(add)) - 300, 1600); await p.waitForTimeout(300);
    await tap(add, 500);
    const ta = p.locator('textarea:not([placeholder])').first();   // the text layer's box (the AI box has a placeholder)
    await smooth(Math.max(0, (await top(ta)) - 700), 1500); await p.waitForTimeout(400);
    await tap(ta, 200); await ta.press('Control+a');
    await ta.pressSequentially('SMUGGLER', { delay: 110 }); await p.waitForTimeout(600);
    await ta.evaluate((e) => e.blur());
    await smooth(290, 1300); await p.waitForTimeout(400);
    await tap(p.locator('[aria-label="Text colour"] button').nth(3), 900);   // gold
    await tap(p.getByRole('button', { name: /^Oversized/ }), 1100);
    await tap(p.getByRole('button', { name: /^Back/ }).first(), 1200);
    await tap(p.getByRole('button', { name: /^Front/ }).first(), 1500);
  } else if (which === 'squad') {
    await tap(p.getByRole('button', { name: /^Team/ }), 600);
    const nameBtn = p.getByRole('button', { name: /Player name/ });
    await smooth((await top(nameBtn)) - 420, 1400);
    await tap(nameBtn, 500); await tap(p.getByRole('button', { name: /Player number/ }), 500);
    const players = [['KAI', '7', 'L'], ['ANDRE', '10', 'XL'], ['KEISHA', '23', 'M'], ['MARCUS', '4', '2XL']];
    for (const [i, [n, num, size]] of players.entries()) {
      if (!(await p.getByLabel(`Player ${i + 1} name`).count())) await tap(p.getByRole('button', { name: /Add (a )?player|Add row|\+ ?Add/ }).last(), 300);
      const nm = p.getByLabel(`Player ${i + 1} name`); await tap(nm, 100); await nm.pressSequentially(n, { delay: 70 });
      const nu = p.getByLabel(`Player ${i + 1} number`); await tap(nu, 100); await nu.pressSequentially(num, { delay: 90 });
      await p.getByLabel(`Player ${i + 1} size`).selectOption(size); await p.waitForTimeout(250);
    }
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await smooth(0, 1800); await p.waitForTimeout(2500);
  }
  await p.waitForTimeout(800);
  await cdp.send('Page.stopScreencast');
  let list = 'ffconcat version 1.0\n';
  frames.forEach((f, i) => { const d = i < frames.length - 1 ? frames[i + 1].t - f.t : 0.1; list += `file '${f.file}'\nduration ${d.toFixed(4)}\n`; });
  fs.writeFileSync(path.join(D, which + '.txt'), list);
  console.log(which, frames.length, 'frames', (frames.at(-1).t - frames[0].t).toFixed(1) + 's');
  await b.close();
})();
