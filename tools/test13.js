// v1.3 feature test (voice, photos, print, reminders, calendar, backup/restore) with mocked speech/notifications/print/camera.
// usage: node tools/test13.js BASE_URL [shotsDir]
const puppeteer = require('/workspace/tools/shot/node_modules/puppeteer-core');
const fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const [base, shots] = process.argv.slice(2);
const PHOTO = '/tmp/test-field-photo.jpg';
const DL = fs.mkdtempSync('/tmp/ft-dl-');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const waitFile = async (re, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const f = fs.readdirSync(DL).find(x => re.test(x) && !x.endsWith('.crdownload')); if (f) { await sleep(200); return path.join(DL, f); } await sleep(150); } return null; };
const MOCKS = () => {
  try { localStorage.setItem('farmtracker.welcomed', '1'); } catch (e) {}
  window.__notified = []; window.__printed = 0; window.print = () => { window.__printed++; };
  class FakeSR { constructor() { window.__sr = this; } start() { window.__srStarted = (window.__srStarted || 0) + 1; } stop() { setTimeout(() => this.onend && this.onend(), 20); } abort() { setTimeout(() => this.onend && this.onend(), 20); } }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
  window.__say = (text, isFinal) => { const r = window.__sr; const res = [Object.assign([{transcript: text}], {isFinal})]; r.onresult({resultIndex: 0, results: res}); };
  const N = function (title, o) { window.__notified.push({title, body: o && o.body, via: 'window'}); };
  let perm = 'default'; try { perm = localStorage.getItem('mockPerm') || 'default'; } catch (e) {} N.permission = perm; N.requestPermission = async () => { try { localStorage.setItem('mockPerm', 'granted'); } catch (e) {} return (N.permission = 'granted'); };
  window.Notification = N;
  if (window.ServiceWorkerRegistration) ServiceWorkerRegistration.prototype.showNotification = async function (title, o) { window.__notified.push({title, body: o.body, via: 'sw'}); };
};
(async () => {
  const b = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']});
  const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  p.on('dialog', d => d.accept());
  const cdp = await p.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: DL});
  await p.evaluateOnNewDocument(MOCKS);
  const phone = () => p.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await phone();
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  const shot = async (n, full) => shots && p.screenshot({path: `${shots}/${n}.png`, fullPage: !!full});
  const tap = async sel => { await p.$eval(sel, e => e.scrollIntoView({block: 'center'})); await sleep(80); await p.click(sel); };
  const tapAct = async a => { await tap(`[data-act="${a}"]`); await sleep(300); };
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await sleep(400); };
  const printShot = async name => {
    await p.emulateMediaType('print'); await p.setViewport({width: 816, height: 1056, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true}); // same mobile flags = no reload
    await sleep(300); await shot(name, true);
    if (shots) { await p.pdf({path: `${shots}/${name}.pdf`, format: 'letter', printBackground: true, preferCSSPageSize: true});
      const pages = execSync(`pdfinfo ${shots}/${name}.pdf | grep Pages`).toString().trim(); ok(/Pages:\s+1$/.test(pages), `${name}.pdf fits one page (${pages})`);
      execSync(`pdftoppm -r 110 -png -singlefile ${shots}/${name}.pdf ${shots}/${name}-pdf`); }
    await p.emulateMediaType(null); await phone(); await sleep(400);
  };
  await p.goto(base, {waitUntil: 'networkidle0'}); await sleep(1700);

  // Own field so the backup reminder applies
  await tapAct('add-field'); await p.type('#f-name', 'Back Forty'); await p.type('#f-crop', 'Grain sorghum'); await p.click('#ff button[type=submit]'); await sleep(400);
  await go('#/');
  ok(!(await p.$('.remind, .backup-banner, .remind-over')), 'no in-page alert banners on Home');
  ok((await p.$eval('#bell .bell-badge', e => e.hidden ? '' : e.textContent)) === '3', 'header bell badge shows 3 (overdue + due soon + backup)');
  const badge = await p.$eval('.tabs a[href="#/tractors"] .tab-badge', e => e.hidden ? '' : e.textContent); ok(badge === '2', 'Tractors tab badge shows 2 due items: ' + badge);
  await sleep(1900); await shot('18-home-bell');
  await p.click('#bell'); await sleep(300);
  const bl = await p.$$eval('#bell-panel .bell-item', a => a.map(x => [x.className.split(' ').pop(), x.textContent.replace(/\s+/g, ' ').trim()]));
  ok(bl.length === 3 && bl[0][0] === 'bi-over' && /John Deere 8335R: Fuel filters.*OVERDUE by 42 hrs/.test(bl[0][1]) && bl[1][0] === 'bi-soon' && bl[2][0] === 'bi-backup' && /Back up your data/.test(bl[2][1]), 'bell list: overdue, due soon, backup (color-coded): ' + JSON.stringify(bl.map(x => x[1])));
  await shot('18b-bell-open');
  await p.click('#bell-panel [data-bell-close]'); await sleep(200);
  ok(await p.$eval('#bell-panel', e => e.classList.contains('hidden')), 'Close button closes the bell list');
  await p.click('#bell'); await sleep(200); await p.click('#bell-panel .bi-over'); await sleep(700);
  ok(/^#\/tractor\//.test(await p.evaluate(() => location.hash)) && await p.evaluate(() => { const el = document.querySelector('.ivs li.iv-over'); const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'tapping an alert opens the tractor at that service item');
  ok(!(await p.$('.remind, .backup-banner')), 'no alert banners on the tractor page');
  await go('#/tractors'); ok(!(await p.$('.remind, .backup-banner')), 'no alert banners on the Tractors tab');
  await go('#/');
  await p.click('#bell'); await sleep(200); await p.click('#bell-panel [data-bell-enable]'); await sleep(600);
  let n = await p.evaluate(() => window.__notified); ok(n.length === 1 && /1 overdue, 1 due soon/.test(n[0].title), `local notification shown after enabling (${n[0] && n[0].via}): ${n[0] && n[0].title}`);
  await p.reload({waitUntil: 'networkidle0'}); await sleep(2500);
  n = await p.evaluate(() => window.__notified); ok(n.length === 0, 'no repeat notification on reopen the same day');

  // Field detail + taskbar
  const nid = await p.$$eval('#pick option', o => o.find(x => x.textContent.startsWith('North 80')).value);
  await go('#/field/' + nid);
  ok((await p.$$eval('.taskbar button', a => a.map(x => x.textContent.trim()))).join('|') === 'Voice note|Photo|Status|Print', 'field taskbar: Voice note | Photo | Status | Print');
  await sleep(1900); await shot('10-field-detail-taskbar');
  // Voice note via taskbar
  await tapAct('tb-voice');
  ok(await p.evaluate(() => window.__srStarted === 1 && !document.getElementById('voice').classList.contains('hidden')), 'voice started with live panel');
  await p.evaluate(() => window.__say('disced the north end twice', false)); await sleep(200);
  ok((await p.$eval('#note-text', e => e.value)) === 'Disced the north end twice', 'live transcript written into note box');
  await shot('11-voice-note-listening');
  await p.evaluate(() => window.__say('disced the north end twice today', true)); await sleep(100);
  await p.click('#voice [data-vstop]'); await sleep(300);
  ok((await p.$eval('#voice', e => e.textContent)).includes('Change status?'), 'spoken "disced" suggests a status change (asks first)');
  await shot('11b-voice-status-suggestion');
  await p.click('#voice [data-vyes]'); await sleep(400);
  ok((await p.$eval('.badge.big', e => e.textContent)) === 'Discing', 'confirmed status change to Discing');
  ok((await p.$eval('#note-text', e => e.value)) === 'Disced the north end twice today', 'unsaved note text kept after status change (editable)');
  // Photo on the note (camera input)
  const [fc] = await Promise.all([p.waitForFileChooser(), tap('[data-act="note-cam"]')]); await fc.accept([PHOTO]); await sleep(1500);
  ok((await p.$$eval('#pending-photos img[src^="blob:"]', a => a.length)) === 1, 'photo resized and shown as pending thumbnail');
  await tapAct('add-note'); await sleep(500);
  const first = await p.$eval('#notes-card .items li', li => ({t: li.querySelector('.txt').textContent, img: !!li.querySelector('img[src^="blob:"]')}));
  ok(first.t.startsWith('Disced the north end') && first.img, 'note saved with its photo thumbnail');
  const dims = await p.evaluate(async () => (await PhotoDB.all()).map(x => [x.w, x.h, x.blob.size, x.blob.type]));
  ok(dims.length === 1 && dims[0][0] === 1280 && dims[0][1] === 853 && dims[0][3] === 'image/jpeg', 'stored photo is 1280px JPEG: ' + JSON.stringify(dims));
  await p.evaluate(() => { document.getElementById('notes-card').scrollIntoView({block: 'start'}); scrollBy(0, -70); }); await sleep(200);
  await sleep(1900); await shot('12-note-with-photo');
  await tap('#notes-card .items .thumb'); await sleep(500);
  ok(await p.evaluate(() => !document.getElementById('viewer').classList.contains('hidden') && !!document.querySelector('#viewer img[src^="blob:"]')), 'tap thumbnail opens full-screen viewer');
  await shot('12b-photo-viewer'); await p.click('#viewer [data-vclose]'); await sleep(200);
  // Mic on "Next to do" edit
  await tap('[data-act="edit-text"][data-key="nextTodo"]'); await sleep(200);
  await p.$eval('#t-nextTodo', e => e.value = ''); await tap('#card-nextTodo [data-mic]'); await sleep(150);
  await p.evaluate(() => window.__say('finish the west half then disc twice', true)); await p.click('#voice [data-vstop]'); await sleep(300);
  ok((await p.$eval('#t-nextTodo', e => e.value)) === 'Finish the west half then disc twice', 'voice typing works in "Next to do" editor');
  ok(await p.$eval('#voice', e => e.classList.contains('hidden')), 'no status suggestion when the spoken operation is already current');
  await tapAct('save-text');
  // Print field
  await tapAct('tb-print'); await sleep(600);
  ok((await p.evaluate(() => window.__printed)) === 1, 'Print opens the print dialog');
  ok(await p.evaluate(() => document.querySelector('#print .pr-title').textContent.includes('North 80') && !!document.querySelector('#print .pr-thumbs img[src^="blob:"]')), 'print view has field record + photo thumbnail');
  await printShot('13-print-field');

  // Tractor: taskbar log -> service with voice + photo
  const tid = await p.evaluate(() => db.tractors.find(t => t.name === 'John Deere 8335R').id);
  await go('#/tractor/' + tid);
  ok((await p.$$eval('.taskbar button', a => a.map(x => x.textContent.trim()))).join('|') === 'Voice note|Photo|Log|Print', 'tractor taskbar: Voice note | Photo | Log | Print');
  await shot('17-tractor-detail-taskbar');
  await tapAct('tb-voice'); await sleep(200);
  ok(!!(await p.$('#lf')) && (await p.evaluate(() => window.__srStarted >= 1 && !document.getElementById('voice').classList.contains('hidden') && /Listening/.test(document.getElementById('voice').textContent))), 'tractor Voice note opens service log and starts listening');
  await p.evaluate(() => window.__say('replaced both fuel filters and bled the system', true)); await p.click('#voice [data-vstop]'); await sleep(300);
  ok((await p.$eval('#l-work', e => e.value)) === 'Replaced both fuel filters and bled the system', 'spoken text in "What was done"');
  const [fc2] = await Promise.all([p.waitForFileChooser(), p.click('#sheet [data-act="log-lib"]')]); await fc2.accept([PHOTO]); await sleep(1500);
  ok((await p.$$eval('#log-photos img[src^="blob:"]', a => a.length)) === 1, 'photo attached to maintenance entry');
  await p.select('#l-iv', await p.$$eval('#l-iv option', o => o.find(x => x.textContent.startsWith('Fuel')).value));
  await p.click('#lf button[type=submit]'); await sleep(500);
  ok(await p.evaluate(() => !!document.querySelector('.timeline li .thumb img[src^="blob:"]')), 'maintenance history shows the photo');
  ok(!(await p.$('.ivs li.iv-over')), 'fuel filter interval reset by the service entry');
  // Calendar (.ics)
  await tap('.ivs [data-act="ics"]'); const ics = await waitFile(/\.ics$/);
  const icsText = ics ? fs.readFileSync(ics, 'utf8') : '';
  ok(/BEGIN:VCALENDAR/.test(icsText) && /DTSTART;VALUE=DATE:\d{8}/.test(icsText) && /BEGIN:VALARM/.test(icsText), 'Add to calendar downloads a valid .ics with alarms: ' + (ics ? path.basename(ics) : 'none'));
  if (shots && ics) fs.copyFileSync(ics, `${shots}/sample-service-due.ics`);
  await tapAct('tb-print'); await sleep(600);
  ok(await p.evaluate(() => document.querySelector('#print .pr-title').textContent.includes('8335R')), 'print view has tractor record');
  await printShot('14-print-tractor');

  // Unsupported browser message (no Web Speech)
  const p2 = await b.newPage(); await p2.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await p2.evaluateOnNewDocument(() => { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; Object.defineProperty(window, 'webkitSpeechRecognition', {value: undefined}); });
  await p2.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  await p2.goto(base + '#/field/' + nid, {waitUntil: 'networkidle0'}); await sleep(1700);
  await p2.click('[data-act="tb-voice"]'); await sleep(300);
  const msg = await p2.$eval('#voice', e => e.textContent); ok(/isn't available/.test(msg) && /Siri/.test(msg) && /keyboard/.test(msg), 'unsupported browser gets friendly message (iPhone wording)');
  if (shots) await p2.screenshot({path: `${shots}/11c-voice-unsupported.png`}); await p2.close();

  // About: backup + restore
  await go('#/about');
  ok((await p.$eval('#backup-card', e => e.textContent)).includes('never'), 'About shows last backed up: never');
  await p.evaluate(() => { document.getElementById('backup-card').scrollIntoView({block: 'start'}); scrollBy(0, -70); }); await sleep(1900); await shot('16-about-backup');
  await tapAct('backup'); await sleep(800);
  ok((await p.$eval('#sheet', e => e.textContent)).includes('2 photos'), 'backup sheet counts 2 photos');
  await p.click('#bk-go'); const bk = await waitFile(/farm-tracker-backup-.*\.json$/);
  const bj = bk ? JSON.parse(fs.readFileSync(bk, 'utf8')) : {};
  ok(bj.app === 'Farm Tracker' && bj.photos && bj.photos.length === 2 && /^data:image\/jpeg;base64,/.test(bj.photos[0].data) && bj.data.fields.length === 5, 'backup file has all data + 2 photos: ' + (bk ? path.basename(bk) + ' ' + Math.round(fs.statSync(bk).size / 1024) + ' KB' : 'none'));
  await sleep(300); ok(!(await p.$eval('#backup-card', e => e.textContent)).includes('never'), 'last backed up updated');
  await go('#/'); await p.click('#bell'); await sleep(200);
  ok(!(await p.$('#bell-panel .bi-backup')), 'backup alert gone from the bell after backing up'); await p.click('#bell-panel [data-bell-close]');
  // wreck data, then restore
  await p.evaluate(async () => { db.notes = []; db.maint = []; save(); await PhotoDB.clear(); });
  await go('#/about');
  const [fc3] = await Promise.all([p.waitForFileChooser(), tap('[data-act="restore"]')]); await fc3.accept([bk]); await sleep(1500);
  const after = await p.evaluate(async () => ({notes: db.notes.length, maint: db.maint.length, photos: (await PhotoDB.all()).length, withPhoto: db.notes.filter(n => (n.photoIds || []).length).length}));
  ok(after.notes >= 5 && after.maint >= 5 && after.photos === 2 && after.withPhoto === 1, 'restore brought back notes, log and photos: ' + JSON.stringify(after));
  await go('#/field/' + nid); await sleep(400);
  ok(await p.evaluate(() => !!document.querySelector('#notes-card .items img[src^="blob:"]')), 'restored photo displays');
  // notification tap paths open the bell list
  await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {data: {type: 'open-alerts'}}))); await sleep(200);
  if (base.startsWith('https')) ok(await p.$eval('#bell-panel', e => !e.classList.contains('hidden')), 'notification tap (service worker message) opens the bell list');
  await p.evaluate(() => closeBell());
  await p.goto(base + '#/alerts', {waitUntil: 'networkidle0'}); await sleep(1800);
  ok(await p.$eval('#bell-panel', e => !e.classList.contains('hidden')) && (await p.evaluate(() => location.hash)) === '#/', 'opening from a notification (#/alerts) shows the bell list');
  await p.evaluate(() => closeBell());
  // empty state
  await go('#/'); await tapAct('clear-samples'); await p.click('#cf-yes'); await sleep(300);
  ok(await p.$eval('#bell .bell-badge', e => e.hidden), 'no badge when nothing is due');
  await p.click('#bell'); await sleep(200);
  ok((await p.$eval('#bell-panel', e => e.textContent)).includes('All caught up'), 'bell shows "All caught up" when empty');
  if (shots) await p.screenshot({path: `${shots}/18c-bell-all-caught-up.png`}); await p.evaluate(() => closeBell());
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) === 0, 'no horizontal overflow');
  if (base.startsWith('https')) ok(await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r && (await caches.keys()).includes('farmtracker-v1.5.0'); }), 'service worker + v1.5.0 offline cache');
  ok(errors.length === 0, 'no console errors ' + JSON.stringify(errors));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
