// Frame 9 (trust: order tracking, local demo) and frame 10 (play: pirogue + Contraband, live test account).
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const [S, D, which] = process.argv.slice(2);
const RIPPLE = () => { window.__tap = (x, y) => { const d = document.createElement('div'); Object.assign(d.style, { position: 'fixed', left: x - 28 + 'px', top: y - 28 + 'px', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,.55)', boxShadow: '0 0 0 2px rgba(0,0,0,.25)', zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .7s cubic-bezier(.16,1,.3,1), opacity .7s ease', transform: 'scale(.6)' }); document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0' }); setTimeout(() => d.remove(), 800); }; };
(async () => {
  const b = await chromium.launch();
  const live = which === 'play' || which === 'boat';
  const ctx = await b.newContext({ ...(live ? { storageState: S + '/test-session.json' } : {}), viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => { try { localStorage.setItem('sp.intro', '1'); localStorage.setItem('sp.lookout', String(Date.now())); } catch {} });
  await ctx.addInitScript(RIPPLE);
  // Recording-only: the order page re-checks every 1s instead of 30s.
  if (!live) await ctx.route((u) => u.pathname.endsWith('/src/pages/OrderStatus.tsx'), async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(/setInterval\(load, (30000|3e4)\)/, 'setInterval(load, 1000)') }); });
  const p = await ctx.newPage();
  const smooth = (y, ms) => p.evaluate(([y, ms]) => new Promise((ok) => { const y0 = scrollY, t0 = performance.now(); const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; scrollTo(0, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(st) : ok(); }; requestAnimationFrame(st); }), [y, ms]);
  const tapXY = async (x, y) => { await p.evaluate(([x, y]) => window.__tap(x, y), [x, y]); await p.touchscreen.tap(x, y); };
  let url, code;
  if (!live) {
    await p.goto('http://localhost:5173/'); await p.evaluate(() => localStorage.setItem('sp.account', JSON.stringify({ email: 'kai@smugpara.com', name: 'Kai' })));
    code = await p.evaluate(async () => {
      const api = await import('/src/lib/api.ts'); const pr = (await api.listProducts()).find((x) => /FRTB/.test(x.name));
      const { code } = await api.placeOrder({ customer_name: 'Kai', email: 'kai@smugpara.com', phone: '1', fulfillment: 'pickup', address: '', notes: '', payment_method: 'Full payment',
        items: [{ id: 'x', kind: 'catalog', product_id: pr.id, name: pr.name, color: 'Black / gold print', size: 'L', qty: 1, unit_price: pr.price, image_url: pr.image_url }] }, { shipping_fee: 0, free_shipping_over: 0 });
      const o = (await api.listOrders()).find((x) => x.code === code); await api.updateOrder(o.id, { payment_status: 'paid' }, 'Payment received. Thank you!'); return code;
    });
    url = `http://localhost:5173/order/${code}?email=kai%40smugpara.com`;
  } else url = 'https://smugpara.com/';
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const dir = path.join(D, which); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  const cdp = await ctx.newCDPSession(p); const frames = [];
  cdp.on('Page.screencastFrame', (f) => { const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg'); fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532 });
  const t0 = Date.now(); const marks = {}; const mark = (k) => { marks[k] = +((Date.now() - t0) / 1000).toFixed(2); };
  await p.waitForTimeout(1500);
  if (!live) {
    const step = async (status, note) => {
      await p.evaluate(async ([status, note, code]) => { const api = await import('/src/lib/api.ts'); const o = (await api.listOrders()).find((x) => x.code === code); await api.updateOrder(o.id, { status }, note); }, [status, note, code]);
      mark(status); await p.waitForTimeout(2700);
    };
    await step('confirmed', 'Confirmed and queued for printing');
    await step('in_production', 'On the press');
    await step('ready', 'Ready to collect');
    await smooth(420, 1800); await p.waitForTimeout(600);
    await step('delivered', 'Collected. Enjoy it!');
    await p.waitForTimeout(1200);
  } else {
    mark('wait');
    // Tap the pirogue the moment it is on screen and well inside the viewport.
    let hitAt = null;
    for (let i = 0; i < 900 && !hitAt; i++) {
      hitAt = await p.evaluate(() => { const h = document.querySelector('.fixed.inset-0.z-30 button'); if (!h || getComputedStyle(h).display === 'none') return null; const r = h.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; return r.width > 0 && x > 60 && x < 330 && y > 120 && y < 760 ? { x, y } : null; });
      if (!hitAt) await p.waitForTimeout(100);
    }
    if (hitAt) { await p.touchscreen.tap(hitAt.x, hitAt.y); await p.evaluate(([x, y]) => window.__tap(x, y), [hitAt.x, hitAt.y]); mark('caught'); }
    await p.waitForTimeout(3500);
    if (which === 'boat') { await cdp.send('Page.stopScreencast'); }
    if (which === 'boat') { /* coin already claimed today */ } else {
    await p.goto('https://smugpara.com/faq', { waitUntil: 'networkidle' }); mark('faq'); await p.waitForTimeout(2200);
    const find = () => p.evaluate(() => { const t = [...document.querySelectorAll('button')].find((e) => /contraband|coin/i.test((e.getAttribute('aria-label') || '') + (e.title || ''))); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: t.getAttribute('aria-label') || t.title }; });
    console.log('coin:', JSON.stringify(await find()));
    const c = await find(); if (c) { await tapXY(c.x, c.y); mark('coin'); }
    await p.waitForTimeout(4000);
    }
  }
  if (which !== 'boat') await cdp.send('Page.stopScreencast');
  let list = 'ffconcat version 1.0\n';
  frames.forEach((f, i) => { const d = i < frames.length - 1 ? frames[i + 1].t - f.t : 0.1; list += `file '${f.file}'\nduration ${d.toFixed(4)}\n`; });
  fs.writeFileSync(path.join(D, which + '.txt'), list);
  console.log(which, frames.length, 'frames', (frames.at(-1).t - frames[0].t).toFixed(1) + 's', JSON.stringify(marks));
  await b.close();
})();
