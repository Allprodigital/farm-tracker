// Visual tour: screenshots of every screen at a phone size. usage: node tools/tour.js BASE outDir [width height] [--welcome]
const puppeteer = require('/workspace/tools/shot/node_modules/puppeteer-core');
const fs = require('fs');
const args = process.argv.slice(2); const welcome = args.includes('--welcome'); const [base, out, W = 390, H = 844] = args.filter(a => !a.startsWith('--'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const b = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']});
  const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept());
  if (!welcome) await p.evaluateOnNewDocument(() => { try { localStorage.setItem('farmtracker.welcomed', '1'); } catch (e) {} });
  await p.setViewport({width: +W, height: +H, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  const shot = (n, full) => p.screenshot({path: `${out}/${n}.png`, fullPage: !!full});
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await sleep(500); };
  await p.goto(base, {waitUntil: 'networkidle0'}); await sleep(2000);
  if (welcome) { await shot('welcome-1'); for (let i = 2; i <= 3; i++) { const n = await p.$('[data-wnext]'); if (!n) break; await n.click(); await sleep(400); await shot('welcome-' + i); } const d = await p.$('[data-wdone],[data-wskip]'); if (d) { await d.click(); await sleep(400); } }
  await shot('home');
  const ids = await p.evaluate(() => ({f: db.fields.find(f => f.name === 'North 80').id, t: db.tractors.find(t => t.name === 'John Deere 8335R').id}));
  await p.select('#pick', ids.f); await sleep(400); await shot('home-field');
  await p.select('#tpick', ids.t); await sleep(400); await p.evaluate(() => scrollTo(0, 99999)); await sleep(200); await shot('home-tractor');
  await go('#/fields'); await shot('fields'); await shot('fields-full', true);
  await go('#/field/' + ids.f); await shot('field'); await shot('field-full', true);
  await p.click('[data-act="tb-log"]'); await sleep(500); await shot('status-sheet'); await p.evaluate(() => closeSheet());
  await go('#/tractors'); await shot('tractors');
  await go('#/tractor/' + ids.t); await shot('tractor'); await shot('tractor-full', true);
  await go('#/about'); await shot('about-full', true);
  await go('#/'); await p.click('#bell'); await sleep(300); await shot('bell'); await p.evaluate(() => closeBell());
  await p.evaluate(() => document.querySelector('[data-act="add-field"]').click()); await sleep(400); await shot('add-field'); await p.evaluate(() => closeSheet());
  await p.evaluate(() => { removeSamples(db); save(); render(); }); await sleep(300); await shot('home-empty');
  await go('#/fields'); await shot('fields-empty'); await go('#/tractors'); await shot('tractors-empty');
  console.log('done', out, errors.length ? 'ERRORS ' + JSON.stringify(errors) : 'no errors');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
