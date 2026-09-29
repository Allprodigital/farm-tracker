// End-to-end smoke test + iPhone-size screenshots. usage: node tools/test.js BASE_URL [shotsDir]
const puppeteer = require('/workspace/tools/shot/node_modules/puppeteer-core');
const [base, shots] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']});
  const p = await b.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  p.on('dialog', d => d.accept());
  await p.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  const shot = async (n, full) => shots && p.screenshot({path: `${shots}/${n}.png`, fullPage: !!full});
  const r = await p.goto(base, {waitUntil: 'networkidle0'}); ok(r.status() === 200 && (await p.title()) === 'Farm Tracker', 'loads, title Farm Tracker');
  await sleep(300); await shot('0-splash');
  await sleep(1400);
  ok(await p.$eval('.tabs a.active', e => e.textContent.includes('Home')), 'Home tab active');
  ok(!!(await p.$('.home-empty')), 'Home empty state shown');
  await shot('1-home-empty');
  await p.click('.tabs a[href="#/fields"]'); await sleep(400); await shot('4-all-fields'); await p.click('.tabs a[href="#/"]'); await sleep(400);
  const tap = async sel => { await p.$eval(sel, e => e.scrollIntoView({block: 'center'})); await sleep(80); await p.click(sel); };
  const tapAct = async a => { await tap(`[data-act="${a}"]`); await sleep(250); };
  // search suggestions
  await p.click('#q'); await p.type('#q', 'sorg', {delay: 40}); await sleep(200);
  const sug = await p.$$eval('#sugg [data-pick] .sg-name', a => a.map(x => x.textContent)); ok(sug.length === 2, 'search "sorg" suggests 2 sorghum fields: ' + sug.join(', '));
  await shot('2-home-search-suggestions');
  await p.$eval('#q', e => e.value = ''); await p.type('#q', 'canal'); await sleep(150);
  ok((await p.$$eval('#sugg [data-pick]', a => a.length)) === 1, 'search "canal" suggests 1');
  await p.click('#sugg [data-pick]'); await sleep(400);
  ok((await p.$eval('.home-result .fc-name', e => e.textContent)).includes('Canal Field'), 'picked suggestion shows ONE card (Canal Field)');
  ok((await p.$$eval('.home-result .field-card', a => a.length)) === 1, 'exactly one card on Home');
  await p.reload({waitUntil: 'networkidle0'}); await sleep(1500);
  ok((await p.$eval('.home-result .fc-name', e => e.textContent)).includes('Canal Field'), 'last selected field remembered after reload');
  // picker
  const nid = await p.$$eval('#pick option', o => o.find(x => x.textContent.startsWith('North 80')).value);
  await p.select('#pick', nid); await sleep(400);
  ok((await p.$eval('.home-result .fc-name', e => e.textContent)).includes('North 80'), 'dropdown picker selects North 80');
  await shot('3-home-field-selected');
  await tap('.home-result a.btn'); await sleep(400);
  ok((await p.$eval('h1', e => e.textContent)).includes('North 80'), 'Open full detail works');
  ok((await p.$eval('.back', e => e.textContent)).includes('Home'), 'back label says Home');
  await shot('5-field-detail');
  await tapAct('status'); await p.type('#c-name', 'Bedding'); await p.click('#custom-op button[type=submit]'); await sleep(300);
  ok((await p.$eval('.badge.big', e => e.textContent)) === 'Bedding', 'custom operation set');
  await tap('[data-act="edit-text"][data-key="nextTodo"]'); await sleep(200);
  await p.$eval('#t-nextTodo', e => e.value = ''); await p.type('#t-nextTodo', 'Bed up after the rain'); await tapAct('save-text');
  ok((await p.$eval('#card-nextTodo .bigtext', e => e.textContent)) === 'Bed up after the rain', 'Next to do edited');
  await p.type('#note-text', 'Test note <b>x</b>'); await tapAct('add-note');
  ok((await p.$eval('.items .txt', e => e.textContent)) === 'Test note <b>x</b>', 'note added (escaped)');
  await tapAct('add-spray'); await p.type('#r-prod', 'Test product'); await p.type('#r-rate', '2'); await p.click('#rf button[type=submit]'); await sleep(250);
  await tapAct('add-harvest'); await p.type('#r-yield', '70'); await p.click('#rf button[type=submit]'); await sleep(250);
  ok((await p.$$eval('.items li', a => a.length)) >= 5, 'spray + harvest saved');
  await tap('.back'); await sleep(400);
  ok((await p.$eval('.home-result .fc-next', e => e.textContent)).includes('Bed up after the rain'), 'Home card reflects edit');
  // All Fields tab
  await p.click('.tabs a[href="#/fields"]'); await sleep(400);
  ok((await p.$$eval('#view .field-card', a => a.length)) === 4, 'All Fields shows 4 cards');
  ok(await p.$eval('.tabs a.active', e => e.textContent.includes('All Fields')), 'All Fields tab active');
  await p.click('#view a.field-card'); await sleep(300);
  ok((await p.$eval('.back', e => e.textContent)).includes('All fields'), 'back label says All fields from list');
  await tap('.back'); await sleep(300);
  // add, edit, delete a field
  await tapAct('add-field'); await p.type('#f-name', 'Test Field'); await p.type('#f-crop', 'Corn'); await p.click('#ff button[type=submit]'); await sleep(400);
  ok((await p.$eval('h1', e => e.textContent)).includes('Test Field'), 'field added');
  await tapAct('edit-field'); await p.$eval('#f-name', e => e.value = ''); await p.type('#f-name', 'Test Field 2'); await p.click('#ff button[type=submit]'); await sleep(300);
  ok((await p.$eval('h1', e => e.textContent)).includes('Test Field 2'), 'field renamed');
  await tapAct('del-field'); await sleep(400);
  ok(!!(await p.$('.home-empty')), 'after deleting the selected field, Home shows empty state');
  await p.click('.tabs a[href="#/about"]'); await sleep(400);
  const html = await p.content();
  ok(html.includes('by <b>All Pro Digital</b>') && html.includes('Valley Pro Logistics LLC'), 'About branding');
  await sleep(1900); await shot('6-about');
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) === 0, 'no horizontal overflow');
  if (base.startsWith('https')) { await sleep(1500); ok(await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'service worker registered'); }
  ok(errors.length === 0, 'no console errors ' + JSON.stringify(errors));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
