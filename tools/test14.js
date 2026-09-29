// v1.4 polish test: welcome, "last worked", sort chips, Undo deletes, confirm sheet, recent operations, migration, empty states, small-Android fit.
// usage: node tools/test14.js BASE_URL [shotsDir]
const puppeteer = require('/workspace/tools/shot/node_modules/puppeteer-core');
const [base, shots] = process.argv.slice(2);
const PHOTO = '/tmp/test-field-photo.jpg';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']});
  const p = await b.newPage(); const errors = []; let dialogs = 0;
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  p.on('dialog', d => { dialogs++; d.accept(); });
  const phone = (w = 390, h = 844) => p.setViewport({width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await phone();
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  const shot = async (n, full) => shots && p.screenshot({path: `${shots}/${n}.png`, fullPage: !!full});
  const tap = async sel => { await p.$eval(sel, e => e.scrollIntoView({block: 'center'})); await sleep(80); await p.click(sel); };
  const tapAct = async a => { await tap(`[data-act="${a}"]`); await sleep(300); };
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await sleep(450); };
  const text = sel => p.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim());

  // --- first-run welcome (fresh phone) ---
  await p.goto(base, {waitUntil: 'networkidle0'}); await sleep(2000);
  ok(!!(await p.$('#welcome')), 'first launch shows the welcome');
  ok((await text('#welcome h2')) === 'Find a field or tractor fast' && (await text('.w-count')) === '1 of 3', 'step 1: Home picker');
  await shot('19-welcome');
  await p.click('[data-wnext]'); await sleep(350);
  ok(/Voice note/.test(await text('#welcome')) && /Print/.test(await text('#welcome')), 'step 2: taskbar');
  if (shots) await shot('19-welcome-2');
  await p.click('[data-wnext]'); await sleep(350);
  ok(/bell/.test(await text('#welcome')) && !!(await p.$('[data-wdone]')) && !(await p.$('[data-wskip]')), 'step 3: bell, with Get started');
  if (shots) await shot('19-welcome-3');
  await p.click('[data-wback]'); await sleep(300); ok((await text('.w-count')) === '2 of 3', 'Back goes to the previous step');
  await p.click('[data-wskip]'); await sleep(300);
  ok(!(await p.$('#welcome')), 'Skip closes the welcome');
  await p.reload({waitUntil: 'networkidle0'}); await sleep(2000);
  ok(!(await p.$('#welcome')), 'welcome shows only once');
  await shot('19-home');
  // --- Home labels fit a small Android phone ---
  const ids = await p.evaluate(() => ({f: db.fields.find(f => f.name === 'North 80').id, t: db.tractors.find(t => t.name === 'John Deere 8335R').id, idle: db.fields.find(f => f.name === 'Resaca 40').id}));
  await phone(360, 740); await sleep(300);
  await p.select('#pick', ids.f); await p.select('#tpick', ids.t); await sleep(400);
  const btnH = await p.$$eval('.home-result a.btn', a => a.map(x => Math.round(x.getBoundingClientRect().height)));
  ok(btnH.length === 2 && btnH.every(h => h <= 60), 'Open field / Open tractor buttons fit on one line at 360px: ' + btnH.join(','));
  const headH = await p.$eval('#t-label', e => e.getBoundingClientRect().height); ok(headH < 40, 'Tractors heading fits on one line at 360px');
  const optFits = await p.$eval('#tpick', e => { const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(e); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return c.measureText(e.selectedOptions[0].textContent).width <= e.clientWidth - 40; }); ok(optFits, 'picked tractor name + "overdue" is not cut off at 360px');
  for (const r of ['#/', '#/fields', '#/tractors', '#/field/' + ids.f, '#/tractor/' + ids.t, '#/about']) { await go(r); if ((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) !== 0) ok(false, 'horizontal overflow at 360px on ' + r); }
  ok(true, 'no horizontal overflow at 360x740 on any screen');
  for (const w of [360, 390]) { await phone(w, w === 360 ? 740 : 844); await sleep(200);
    await p.evaluate(() => toast('Photo added. Add a few words and tap Save note.')); await sleep(300);
    const r = await p.$eval('#toast', e => { const b = e.getBoundingClientRect(); return {l: b.left, r: b.right, h: b.height, over: e.scrollWidth > e.clientWidth + 1}; });
    ok(r.l >= 8 && r.r <= w - 8 && !r.over && r.h > 60, `long toast wraps inside the screen at ${w}px (${Math.round(r.l)}–${Math.round(r.r)}, ${Math.round(r.h)}px tall)`); }
  await phone(360, 740); await sleep(1900);
  if (shots) { await go('#/'); await shot('19-home-android-360'); }
  await phone(); await go('#/'); await p.select('#pick', ''); await p.select('#tpick', ''); await sleep(300);
  // --- "last worked" on cards ---
  await go('#/fields'); await sleep(300);
  const foot = await p.$$eval('#view .field-card', a => Object.fromEntries(a.map(c => [c.querySelector('.fc-name').firstChild.textContent.trim(), c.querySelector('.fc-foot').textContent.trim()])));
  ok(/^Last worked yesterday/.test(foot['North 80']) && /^Last worked 3 days ago/.test(foot['Canal Field']) && /^Idle for 5 months/.test(foot['Resaca 40']), 'cards show "Last worked X ago" / "Idle for": ' + JSON.stringify(foot));
  // --- sort chips ---
  const names = () => p.$$eval('#view .field-card .fc-name', a => a.map(x => x.firstChild.textContent.trim()));
  ok((await p.$eval('.chip[aria-pressed="true"]', e => e.textContent)) === 'Recent' && (await names())[0] === 'North 80', 'All Fields defaults to Recent (latest first)');
  await shot('19-all-fields');
  await tap('.chip[data-id="name"]'); await sleep(300);
  ok((await names()).join('|') === 'Canal Field|Home Place|North 80|Resaca 40', 'A–Z chip sorts by name');
  await tap('.chip[data-id="op"]'); await sleep(300);
  const heads = await p.$$eval('.grp-head', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(heads.join('|') === 'Discing · 1|Plowing · 1|Shredding · 1|Idle / Fallow · 1', 'Operation chip groups fields under operation headings: ' + heads.join(', '));
  if (shots) await shot('19-all-fields-by-operation');
  await p.reload({waitUntil: 'networkidle0'}); await sleep(1800);
  ok((await p.$eval('.chip[aria-pressed="true"]', e => e.textContent)) === 'Operation', 'sort choice remembered');
  await tap('.chip[data-id="recent"]'); await sleep(200);
  // --- field detail: pristine screenshot, then Undo deletes ---
  await go('#/field/' + ids.f); await sleep(300); await shot('19-field-detail');
  const nNotes = () => p.$$eval('#notes-card .items li', a => a.length);
  const before = await nNotes(); dialogs = 0;
  await tap('[data-act="del-note"]'); await sleep(300);
  ok((await nNotes()) === before - 1 && dialogs === 0, 'note deletes with one tap (no pop-up)');
  ok(await p.$eval('#toast', e => e.classList.contains('show') && /Note deleted/.test(e.textContent) && !!e.querySelector('.toast-act')), 'toast offers Undo');
  const ub = await p.$eval('#toast .toast-act', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }); ok(ub[0] >= 44 && ub[1] >= 44, 'Undo button is a big tap target: ' + ub.map(Math.round).join('x'));
  if (shots) await shot('19-undo-toast');
  await p.click('#toast .toast-act'); await sleep(300);
  ok((await nNotes()) === before, 'Undo brings the note back');
  // photo kept during the undo window, removed after
  const [fc] = await Promise.all([p.waitForFileChooser(), tap('[data-act="note-cam"]')]); await fc.accept([PHOTO]); await sleep(1500);
  await p.type('#note-text', 'Photo note'); await tapAct('add-note'); await sleep(400);
  ok((await p.evaluate(async () => (await PhotoDB.keys()).length)) === 1, 'note with photo saved');
  await tap('#notes-card .items li [data-act="del-note"]'); await sleep(300);
  ok((await p.evaluate(async () => (await PhotoDB.keys()).length)) === 1, 'photo kept while Undo is possible');
  await p.click('#toast .toast-act'); await sleep(500);
  ok(await p.evaluate(() => !!document.querySelector('#notes-card .items img[src^="blob:"]')), 'Undo restores the note and its photo');
  await tap('#notes-card .items li [data-act="del-note"]'); await sleep(7800);
  ok((await p.evaluate(async () => (await PhotoDB.keys()).length)) === 0, 'photo removed once the Undo window closes');
  await tapAct('del-spray'); ok(!(await p.$('[data-act="del-spray"]')) && dialogs === 0, 'spray record deletes with Undo, no pop-up');
  // delete whole field: tap-friendly confirm sheet, then Undo
  await sleep(7500); // let the Undo toast time out
  await tapAct('del-field');
  ok(/Delete North 80\?/.test(await text('#sheet')) && !!(await p.$('#cf-yes')), 'deleting a field asks with a big confirm sheet');
  if (shots) await shot('19-confirm-delete');
  await p.click('#sheet [data-close]'); await sleep(250); ok(await p.evaluate(id => !!field(id), ids.f), 'Cancel keeps the field');
  await tapAct('del-field'); await p.click('#cf-yes'); await sleep(450);
  ok(await p.evaluate(id => !field(id) && location.hash === '#/', ids.f), 'Delete field removes it and goes Home');
  await p.click('#toast .toast-act'); await sleep(500);
  ok(await p.evaluate(id => !!field(id) && location.hash === '#/field/' + id && document.querySelectorAll('#notes-card .items li').length > 0, ids.f), 'Undo restores the field with its notes and reopens it');
  ok(dialogs === 0, 'no browser pop-ups used for any delete');
  // --- status picker: Recent row only once custom operations exist ---
  await tapAct('status'); ok(!(await p.$('.ops.recent')), 'no Recent row with only the built-in list');
  await p.type('#c-name', 'Bedding'); await p.click('#custom-op button[type=submit]'); await sleep(400);
  await go('#/field/' + ids.idle); await tapAct('status');
  const rec = await p.$$eval('.ops.recent button', a => a.map(x => x.textContent.trim()));
  ok(rec.length === 3 && rec[0] === 'Bedding', 'Recent quick picks at the top once custom operations exist: ' + rec.join(', '));
  if (shots) await shot('19-status-recent');
  await p.click('.ops.recent button'); await sleep(350); ok((await text('.badge.big')) === 'Bedding', 'tapping a Recent pick sets the status');
  // --- tractor detail screenshot ---
  await go('#/tractor/' + ids.t); await sleep(1900); await shot('19-tractor-detail');
  // --- About: replay tour ---
  await go('#/about'); await tapAct('welcome'); ok(!!(await p.$('#welcome')), 'About › Show the quick tour replays it');
  await p.keyboard.press('Escape'); await sleep(200); ok(!(await p.$('#welcome')), 'Escape closes the tour');
  ok(/bell/.test(await text('#view')) && !/reminder on Home/.test(await text('#view')), 'About describes the bell (no stale "reminder on Home")');
  // --- migration: older data without statusChangedAt loads fine, nothing lost ---
  const counts = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('farmtracker.v1')); d.fields.forEach(f => delete f.statusChangedAt); localStorage.setItem('farmtracker.v1', JSON.stringify(d));
    return ['fields', 'history', 'notes', 'sprays', 'harvests', 'tractors', 'hours', 'intervals', 'maint', 'operations'].map(k => d[k].length).join(','); });
  await p.reload({waitUntil: 'networkidle0'}); await sleep(1800);
  const after = await p.evaluate(() => ['fields', 'history', 'notes', 'sprays', 'harvests', 'tractors', 'hours', 'intervals', 'maint', 'operations'].map(k => db[k].length).join(','));
  ok(after === counts && await p.evaluate(() => db.fields.every(f => f.statusChangedAt)), 'older data migrates in place, nothing lost: ' + after);
  // --- empty states ---
  await go('#/'); await tapAct('clear-samples'); await p.click('#cf-yes'); await sleep(400);
  const own = await p.evaluate(() => db.fields.length);
  if (!own) { ok((await p.$$eval('.home-empty.first-run', a => a.length)) === 2, 'empty Home shows friendly "Add your first field" / "Add a tractor"'); }
  await p.evaluate(() => { db.fields = []; db.tractors = []; save(); render(); }); await sleep(300);
  ok((await p.$$eval('.home-empty.first-run .primary', a => a.map(x => x.textContent.trim()))).join('|') === '+ Add your first field|+ Add a tractor', 'empty Home: one clear button each, no dead search box');
  if (shots) await shot('19-home-empty');
  await tap('.home-empty.first-run [data-act="add-field"]'); await sleep(300); ok(!!(await p.$('#ff')), 'first-field button opens Add field'); await p.evaluate(() => closeSheet());
  ok((await p.$$eval('meta[name="color-scheme"]', a => a.map(x => x.content))).includes('only light'), 'page opts out of forced dark mode (stays high-contrast)');
  if (base.startsWith('https')) { await sleep(800); ok(await p.evaluate(async () => (await caches.keys()).includes('farmtracker-v1.4.1')), 'v1.4.1 offline cache'); }
  ok(errors.length === 0, 'no console errors ' + JSON.stringify(errors));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
