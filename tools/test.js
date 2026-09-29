// End-to-end smoke test + phone screenshots. usage: node tools/test.js BASE_URL [shotsDir]
const puppeteer = require('/workspace/tools/shot/node_modules/puppeteer-core');
const [base, shots] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']});
  const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  p.on('dialog', d => d.accept());
  await p.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  const r = await p.goto(base, {waitUntil: 'networkidle0'}); console.log('status', r.status(), 'title', await p.title());
  await sleep(300); if (shots) await p.screenshot({path: shots + '/0-splash.png'});
  await sleep(1400);
  const n = await p.$$eval('.field-card', a => a.length); console.log('fields', n);
  if (shots) await p.screenshot({path: shots + '/1-field-list.png'});
  const tapAct = async a => { await p.click(`[data-act="${a}"]`); await sleep(250); };
  // open first field detail
  await p.click('.field-card'); await sleep(400);
  if (shots) await p.screenshot({path: shots + '/2-field-detail.png'});
  if (shots) await p.screenshot({path: shots + '/2b-field-detail-full.png', fullPage: true});
  await tapAct('status'); if (shots) await p.screenshot({path: shots + '/3-status-picker.png'});
  await p.type('#c-name', 'Bedding'); await p.type('#s-note', 'test note'); await p.click('#custom-op button[type=submit]'); await sleep(300);
  console.log('badge after custom', await p.$eval('.badge.big', e => e.textContent));
  await p.click('[data-act="edit-text"][data-key="nextTodo"]'); await sleep(200);
  await p.$eval('#t-nextTodo', e => e.value = ''); await p.type('#t-nextTodo', 'Bed up after the rain'); await tapAct('save-text');
  console.log('next', await p.$eval('#card-nextTodo .bigtext', e => e.textContent));
  await p.type('#note-text', 'Test note <b>not bold</b>'); await tapAct('add-note');
  console.log('first note', await p.$eval('.items .txt', e => e.textContent));
  await tapAct('add-spray'); await p.type('#r-prod', 'Test product'); await p.type('#r-rate', '2'); await p.click('#rf button[type=submit]'); await sleep(250);
  await tapAct('add-harvest'); await p.type('#r-yield', '70'); await p.click('#rf button[type=submit]'); await sleep(250);
  console.log('history items', await p.$$eval('.timeline li', a => a.length));
  // add a new field
  await p.goto(base + '#/', {waitUntil: 'networkidle0'}); await sleep(1500);
  await tapAct('add-field'); await p.type('#f-name', 'Test Field'); await p.type('#f-crop', 'Grain sorghum'); await p.click('#ff button[type=submit]'); await sleep(400);
  console.log('new field page', await p.$eval('h1', e => e.textContent.trim()));
  await tapAct('edit-field'); await p.$eval('#f-name', e => e.value = ''); await p.type('#f-name', 'Test Field 2'); await p.click('#ff button[type=submit]'); await sleep(300);
  console.log('renamed', await p.$eval('h1', e => e.textContent.trim()));
  await tapAct('del-field'); await sleep(300); console.log('after delete fields', await p.$$eval('.field-card', a => a.length));
  await p.goto(base + '#/about', {waitUntil: 'networkidle0'}); await sleep(1500);
  console.log('about has brand', (await p.content()).includes('Valley Pro Logistics LLC'));
  console.log('custom op persisted', await p.$$eval('.items .badge', a => a.map(x => x.textContent)));
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); console.log('h-overflow', overflow);
  if (shots) await p.screenshot({path: shots + '/4-about.png'});
  console.log('errors', JSON.stringify(errors));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
