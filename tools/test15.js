// v1.5: weather, pins, duplicate, copy spray, acreage, activity filter, mark-next-done
// usage: node tools/test15.js BASE_URL [shotsDir]
const puppeteer = require('/workspace/tools/shot/node_modules/puppeteer-core');
const [base, shots] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']});
  const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()));
  p.on('dialog', d => d.accept());
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('farmtracker.welcomed', '1'); } catch (e) {} });
  await p.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  const shot = async (n) => shots && p.screenshot({path: `${shots}/${n}.png`});
  const tap = async sel => { await p.$eval(sel, e => e.scrollIntoView({block: 'center'})); await sleep(80); await p.click(sel); };
  const tapAct = async a => { await tap(`[data-act="${a}"]`); await sleep(350); };
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await sleep(450); };
  await p.goto(base, {waitUntil: 'networkidle0'}); await sleep(2500);

  // Weather card on Home
  ok(!!(await p.$('#wx-card')), 'Home shows weather card');
  await p.waitForFunction(() => { const el = document.getElementById('wx-card'); return el && /°/.test(el.textContent) && /workable|wet|Windy/i.test(el.textContent); }, {timeout: 12000}).catch(() => null);
  const wx = await p.$eval('#wx-card', e => e.textContent.replace(/\s+/g, ' '));
  ok(/\d+°/.test(wx) && /Open-Meteo/.test(wx) && /(Looks workable|Maybe workable|Too wet|Windy)/.test(wx), 'weather shows temp + workability + Open-Meteo: ' + wx.slice(0, 120));
  ok(!/FarmLogs|AgWorld|Granular|FieldView|Farmbrite|Agrivi|John Deere Operations/i.test(await p.content()), 'no competitor brand names in the UI');
  await shot('20-home-weather');

  // Pin field + tractor
  const nid = await p.evaluate(() => db.fields.find(f => f.name === 'North 80').id);
  const tid = await p.evaluate(() => db.tractors.find(t => /8335R|Big Tractor|John Deere 8335R/.test(t.name)).id);
  await go('#/field/' + nid);
  ok(!!(await p.$('[data-act="pin"][data-kind="field"]')), 'field detail has pin button');
  await tapAct('pin'); await sleep(300);
  ok(await p.evaluate(id => (JSON.parse(localStorage.getItem('farmtracker.pinnedFields') || '[]')).includes(id), nid), 'field pinned in storage');
  await go('#/tractor/' + tid); await tapAct('pin'); await sleep(300);
  await go('#/');
  const pins = await p.$$eval('.pin-chip', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(pins.length >= 2 && pins.some(x => /North 80/.test(x)) && pins.some(x => /8335R|Big Tractor|John Deere/.test(x)), 'Home shows pinned field + tractor chips: ' + pins.join(' | '));
  await shot('20-home-pins');

  // Acreage by crop
  await go('#/fields');
  const acr = await p.$eval('.acr-bar', e => e.textContent.replace(/\s+/g, ' '));
  ok(/ac total/.test(acr) && /Grain sorghum/.test(acr) && /Cotton/.test(acr), 'All Fields shows acres by crop: ' + acr);
  await shot('20-all-fields-acres');

  // Activity filter
  await go('#/field/' + nid);
  await tap('[data-act="field-filt"][data-id="sprays"]'); await sleep(300);
  ok(await p.evaluate(() => !document.getElementById('notes-card') || document.getElementById('notes-card').classList.contains('hidden')), 'Notes hidden when Sprays filter is on');
  ok(await p.evaluate(() => [...document.querySelectorAll('#view .card')].some(c => /Spray log/.test(c.textContent) && !c.classList.contains('hidden'))), 'Spray log visible');
  await tap('[data-act="field-filt"][data-id="all"]'); await sleep(200);

  // Copy last spray
  await tapAct('copy-spray'); await sleep(300);
  ok(!!(await p.$('#rf')) && (await p.$eval('#r-prod', e => e.value)).length > 0 && (await p.$eval('#sheet h2', e => e.textContent)).includes('Copy last spray'), 'Copy last spray prefills product');
  const prod = await p.$eval('#r-prod', e => e.value);
  await p.click('#rf button[type=submit]'); await sleep(400);
  ok((await p.$$eval('#view .card', a => a.find(c => /Spray log/.test(c.textContent)).querySelectorAll('.items li').length)) >= 2, 'copied spray saved as a new today entry');
  await shot('20-field-copy-spray');

  // Mark next done
  const beforeNext = await p.$eval('#card-nextTodo .bigtext', e => e.textContent.trim());
  ok(beforeNext.length > 5, 'Next to do has text before mark-done');
  await tapAct('mark-next-done'); await sleep(400);
  ok(await p.evaluate(id => { const f = field(id); return !f.nextTodo; }, nid) && !!(await p.$('#card-nextTodo .empty')), 'Next to do cleared');
  ok(await p.evaluate(t => db.notes.some(n => n.text === 'Done today: ' + t), beforeNext), 'note "Done today: …" saved');
  await p.click('#toast .toast-act'); await sleep(400);
  ok((await p.$eval('#card-nextTodo .bigtext', e => e.textContent.trim())) === beforeNext, 'Undo restores Next to do');

  // Duplicate field
  const before = await p.evaluate(() => db.fields.length);
  await tapAct('dup-field'); await sleep(500);
  ok(await p.evaluate(n => db.fields.length === n + 1 && /\(copy\)/.test(document.querySelector('h1').textContent) && location.hash.includes(db.fields.find(f => /\(copy\)/.test(f.name)).id), before), 'Duplicate creates "… (copy)" and opens it');
  ok(await p.evaluate(() => { const f = db.fields.find(x => /\(copy\)/.test(x.name)); return f && f.operationId === 'idle' && !f.sample; }), 'duplicate starts Idle and is not sample');
  await shot('20-field-duplicated');

  // Location sheet on About
  await go('#/about');
  ok((await p.$eval('#loc-card', e => e.textContent)).includes('Rio Hondo'), 'About shows default Rio Hondo location');
  await tapAct('set-loc'); await sleep(300);
  ok(!!(await p.$('#locf')), 'Change location opens the sheet');
  await p.click('#sheet [data-close]');

  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) === 0, 'no horizontal overflow');
  if (base.startsWith('https')) ok(await p.evaluate(async () => (await caches.keys()).includes('farmtracker-v1.5.0')), 'v1.5.0 offline cache');
  ok(errors.length === 0, 'no console errors ' + JSON.stringify(errors));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
