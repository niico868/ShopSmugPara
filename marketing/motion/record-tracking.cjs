// Frame 9 v2: a custom order on the tracking page, one change every 4s (local demo).
// placed -> downpayment received -> final draft sent -> in production -> ready -> collected
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const [S, D] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => { try { localStorage.setItem('sp.intro', '1'); localStorage.setItem('sp.lookout', String(Date.now())); } catch {} });
  // Recording-only: the order page re-checks every 0.5s instead of 30s.
  await ctx.route((u) => u.pathname.endsWith('/src/pages/OrderStatus.tsx'), async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(/setInterval\(load, (30000|3e4)\)/, 'setInterval(load, 500)') }); });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/'); await p.evaluate(() => localStorage.setItem('sp.account', JSON.stringify({ email: 'kai@smugpara.com', name: 'Kai' })));
  const code = await p.evaluate(async () => {
    const api = await import('/src/lib/api.ts');
    const { code } = await api.placeOrder({ customer_name: 'Kai', email: 'kai@smugpara.com', phone: '1', fulfillment: 'pickup', address: '', notes: 'Name on the back please', payment_method: '50% deposit now, balance before collection or delivery',
      items: [{ id: 'c', kind: 'custom', product_id: null, name: 'Custom Tee', color: '#111111', size: 'L', qty: 1, unit_price: 400, image_url: '', preview: '/products/frtb-tee-gold-front.jpg', design: { fit: 'oversized', color: '#111111', front: [{ id: 'l1', type: 'text', text: 'SMUGGLER', x: 0, y: 0, rotation: 0 }], print: { front: 18 } } }] }, { shipping_fee: 0, free_shipping_over: 0 });
    return code;
  });
  const url = `http://localhost:5173/order/${code}?email=kai%40smugpara.com`;
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const act = (fn, arg) => p.evaluate(async ([fn, arg, code]) => {
    const api = await import('/src/lib/api.ts'); const o = (await api.listOrders()).find((x) => x.code === code);
    if (fn === 'status') await api.updateOrder(o.id, { status: arg[0] }, arg[1]);
    if (fn === 'paid') await api.updateOrder(o.id, { status: 'confirmed', payment_status: 'paid' }, arg);
    if (fn === 'proof') { const blob = await (await fetch(arg)).blob(); const data = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); }); await api.sendProof(o.id, data); }
  }, [fn, arg, code]);
  const smooth = (y, ms) => p.evaluate(([y, ms]) => new Promise((ok) => { const y0 = scrollY, t0 = performance.now(); const st = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; scrollTo(0, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(st) : ok(); }; requestAnimationFrame(st); }), [y, ms]);
  const dir = path.join(D, 'trust2'); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  const cdp = await ctx.newCDPSession(p); const frames = [];
  cdp.on('Page.screencastFrame', (f) => { const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg'); fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532 });
  const t0 = Date.now(); const marks = {}; const mark = (k) => { marks[k] = +((Date.now() - t0) / 1000).toFixed(2); };
  // Keep the screencast ticking even when nothing moves, so the timeline stays true to the clock.
  await p.evaluate(() => { const d = document.createElement('div'); Object.assign(d.style, { position: 'fixed', right: 0, bottom: 0, width: '1px', height: '1px', opacity: .01 }); document.body.appendChild(d); let i = 0; setInterval(() => { d.style.background = (i++ % 2) ? '#000' : '#fff'; }, 33); });
  mark('placed'); await p.waitForTimeout(4000);                                       // beat 1: you order a custom
  await act('paid', 'Downpayment received. Thank you!'); mark('paid'); await p.waitForTimeout(4000);   // beat 2
  await act('proof', '/products/sovereignty-front.jpg'); mark('proof');                // beat 3: final draft
  await p.waitForTimeout(500);
  const proofY = await p.evaluate(() => { const h = [...document.querySelectorAll('h2,h3,p')].find((e) => /proof|draft/i.test(e.textContent)); return h ? h.getBoundingClientRect().top + scrollY - 160 : 500; });
  await smooth(proofY, 1500); await p.waitForTimeout(1600); await smooth(0, 1200);
  await act('status', ['in_production', 'On the press']); mark('production'); await p.waitForTimeout(4000);   // beat 4
  await act('status', ['ready', 'Ready to collect']); mark('ready'); await p.waitForTimeout(4000);           // beat 5
  await act('status', ['delivered', 'Collected. Step out hard!']); mark('delivered'); await p.waitForTimeout(4500);   // beat 6
  await cdp.send('Page.stopScreencast');
  let list = 'ffconcat version 1.0\n';
  frames.forEach((f, i) => { const d = i < frames.length - 1 ? frames[i + 1].t - f.t : 0.1; list += `file '${f.file}'\nduration ${d.toFixed(4)}\n`; });
  fs.writeFileSync(path.join(D, 'trust2.txt'), list);
  console.log('trust2', frames.length, 'frames', (frames.at(-1).t - frames[0].t).toFixed(1) + 's', JSON.stringify(marks));
  await b.close();
})();
