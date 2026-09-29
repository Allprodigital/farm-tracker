/* Farm Tracker (milestone 1 + tractor maintenance) by All Pro Digital, a Valley Pro Logistics LLC company.
   Single-file vanilla JS app. Data lives on this device in localStorage (key: farmtracker.v1). */
'use strict';
const VERSION = '1.4.0';
const KEY = 'farmtracker.v1';
const PRESETS = [
  ['discing', 'Discing', '#8a5a2b'], ['plowing', 'Plowing', '#6d4c2f'], ['cultivating', 'Cultivating', '#9a6b12'],
  ['planting', 'Planting', '#2f6b2f'], ['spraying', 'Spraying', '#1d5f8a'], ['fertilizing', 'Fertilizing', '#5b4a9e'],
  ['irrigating', 'Irrigating', '#0f7285'], ['harvesting', 'Harvesting', '#b4491a'], ['shredding', 'Shredding', '#7a3b52'],
  ['idle', 'Idle / Fallow', '#5f665f']
];
const CUSTOM_COLORS = ['#3d6e5a', '#8a3f2b', '#4f5d8f', '#7b6a1e', '#6a3f7a', '#2e6f8e'];
const YIELD_UNITS = ['bu/ac', 'lb/ac', 'cwt/ac', 'tons/ac', 'bales/ac', 'total bu', 'total lb', 'total tons'];
const RATE_UNITS = ['oz/ac', 'pt/ac', 'qt/ac', 'gal/ac', 'lb/ac', 'fl oz/ac'];

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowIso = () => new Date().toISOString();
const todayStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

/* ---------- equipment (milestone 2 pulled forward) ---------- */
const TRACTOR_KEYS = ['hours', 'intervals', 'maint'];
const FIELD_KEYS = ['history', 'notes', 'sprays', 'harvests'];
const COMMON_INTERVALS = ['Engine oil & filter', 'Hydraulic / transmission filter', 'Fuel filters', 'Air filter', 'Grease fittings', 'Coolant', 'Front axle oil', 'Cab air filter', 'Belts & hoses check'];
const localYmd = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const daysAgoYmd = n => localYmd(new Date(Date.now() - n * 864e5));
const ymdUtc = ymd => { const [y, m, d] = ymd.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const addDays = (ymd, n) => new Date(ymdUtc(ymd) + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((ymdUtc(b) - ymdUtc(a)) / 864e5);
const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const hrs = n => n == null ? '?' : Number(n).toLocaleString('en-US', {maximumFractionDigits: 1});
const money = n => n == null ? '' : '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

function seedTractors(d) {
  const ago = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 36e5).toISOString();
  const addT = (t, readings, ivs, entries) => {
    const id = uid() + 't' + d.tractors.length;
    d.tractors.push({id, sample: true, serial: '', notes: '', createdAt: ago(readings[0][0]), ...t,
      currentHours: readings[readings.length - 1][1], hoursUpdatedAt: ago(readings[readings.length - 1][0]), updatedAt: ago(readings[readings.length - 1][0])});
    for (const [days, h] of readings) d.hours.push({id: uid(), tractorId: id, date: daysAgoYmd(days), hours: h, at: ago(days), note: ''});
    const ivIds = {};
    for (const iv of ivs) { const iid = uid(); ivIds[iv.key] = iid;
      d.intervals.push({id: iid, tractorId: id, name: iv.name, everyHours: iv.everyHours ?? null, everyDays: iv.everyDays ?? null,
        lastDoneHours: iv.lastHours ?? null, lastDoneDate: iv.lastDays != null ? daysAgoYmd(iv.lastDays) : '', createdAt: ago(200), updatedAt: ago(iv.lastDays ?? 200)}); }
    for (const e of entries) d.maint.push({id: uid(), tractorId: id, date: daysAgoYmd(e.days), hours: e.hours, type: e.type, work: e.work, parts: e.parts || '',
      cost: e.cost ?? null, notes: e.notes || '', intervalId: e.iv ? ivIds[e.iv] : null, createdAt: ago(e.days, -2)});
  };
  addT({name: 'John Deere 8335R', make: 'John Deere', model: '8335R', year: '2018'},
    [[60, 1765], [30, 1790], [12, 1822], [1, 1842]],
    [{key: 'oil', name: 'Engine oil & filter (example)', everyHours: 250, everyDays: 365, lastHours: 1600, lastDays: 95},
     {key: 'fuel', name: 'Fuel filters (example)', everyHours: 500, lastHours: 1300, lastDays: 200},
     {key: 'hyd', name: 'Hydraulic / transmission filter (example)', everyHours: 750, lastHours: 1200, lastDays: 200},
     {key: 'air', name: 'Air filter check (example)', everyDays: 30, lastDays: 20},
     {key: 'grease', name: 'Grease fittings (example)', everyHours: 50, lastHours: 1830, lastDays: 8}],
    [{days: 95, hours: 1600, type: 'service', iv: 'oil', work: 'Changed engine oil & filter (example)', parts: 'Oil filter, 5 gal engine oil', cost: 185},
     {days: 20, hours: 1810, type: 'service', iv: 'air', work: 'Checked and blew out air filter (example)'},
     {days: 12, hours: 1822, type: 'repair', work: 'Replaced cracked hydraulic hose on rear remote (example)', parts: 'Hydraulic hose + fittings', cost: 145, notes: 'Hose was rubbing on the drawbar frame. Added a clamp.'},
     {days: 8, hours: 1830, type: 'service', iv: 'grease', work: 'Greased all fittings (example)'}]);
  addT({name: 'John Deere 4440', make: 'John Deere', model: '4440', year: '1980'},
    [[90, 9010], [40, 9060], [3, 9120]],
    [{key: 'oil', name: 'Engine oil & filter (example)', everyHours: 150, lastHours: 9050, lastDays: 45},
     {key: 'grease', name: 'Grease fittings (example)', everyHours: 10, lastHours: 9118, lastDays: 3}],
    [{days: 45, hours: 9050, type: 'service', iv: 'oil', work: 'Changed engine oil & filter (example)', parts: 'Oil filter, oil', cost: 95},
     {days: 40, hours: 9060, type: 'repair', work: 'Rebuilt water pump (example)', parts: 'Water pump kit, gasket', cost: 320},
     {days: 3, hours: 9118, type: 'service', iv: 'grease', work: 'Greased front axle and 3-point (example)'}]);
}
function removeSamples(d) {
  const fids = new Set(d.fields.filter(x => x.sample).map(x => x.id)), tids = new Set(d.tractors.filter(x => x.sample).map(x => x.id));
  d.fields = d.fields.filter(x => !x.sample); d.tractors = d.tractors.filter(x => !x.sample);
  for (const k of FIELD_KEYS) d[k] = d[k].filter(x => !fids.has(x.fieldId));
  for (const k of TRACTOR_KEYS) d[k] = d[k].filter(x => !tids.has(x.tractorId));
}
const tractor = id => db.tractors.find(t => t.id === id);
const hasSamples = () => db.fields.some(f => f.sample) || db.tractors.some(t => t.sample);
const LEVEL = {over: ['Overdue', 0], soon: ['Due soon', 1], ok: ['OK', 2], none: ['Not tracked', 3]};
function ivStatus(iv, t) {
  const parts = []; let score = Infinity, level = 'ok', any = false;
  const eh = num(iv.everyHours), ed = num(iv.everyDays), lh = num(iv.lastDoneHours);
  if (eh && lh != null) { any = true; const left = lh + eh - (num(t.currentHours) || 0);
    parts.push(left < 0 ? `overdue by ${hrs(-left)} hrs` : `due in ${hrs(left)} hrs (at ${hrs(lh + eh)})`); score = Math.min(score, left / eh);
    if (left < 0) level = 'over'; else if (left <= Math.min(25, eh * .2)) level = 'soon'; }
  if (ed && iv.lastDoneDate) { any = true; const due = addDays(iv.lastDoneDate, ed); const left = daysBetween(todayStr(), due);
    parts.push(left < 0 ? `overdue by ${-left} day${left === -1 ? '' : 's'}` : left === 0 ? 'due today' : `due in ${left} day${left === 1 ? '' : 's'} (${fmtDate(due)})`); score = Math.min(score, left / ed);
    if (left < 0) level = 'over'; else if (left <= Math.min(14, ed * .25) && level !== 'over') level = 'soon'; }
  if (!any) return {level: 'none', text: 'Set "last done" to track this', score: 99};
  return {level, text: parts.join(' · '), score};
}
const ivRule = iv => [num(iv.everyHours) ? `every ${hrs(iv.everyHours)} hrs` : '', num(iv.everyDays) ? `every ${iv.everyDays} days` : ''].filter(Boolean).join(' or ') || 'no interval set';
const intervalsOf = t => db.intervals.filter(i => i.tractorId === t.id);
function nextDue(t) {
  return intervalsOf(t).map(iv => ({iv, st: ivStatus(iv, t)})).sort((a, b) => LEVEL[a.st.level][1] - LEVEL[b.st.level][1] || a.st.score - b.st.score)[0] || null;
}
const entriesOf = t => db.maint.filter(e => e.tractorId === t.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
const tractorSub = t => [t.make, t.model, t.year].filter(Boolean).map(esc).join(' · ');
const pill = level => `<span class="st st-${level}">${LEVEL[level][0]}</span>`;

/* ---------- storage ---------- */
let db = load();
function blank() { return {version: 1, fields: [], operations: PRESETS.map(([id, name, color]) => ({id, name, color, builtIn: true})), history: [], notes: [], sprays: [], harvests: [], tractors: [], hours: [], intervals: [], maint: []}; }
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.version) return fix(d); } catch (e) { console.warn(e); }
  const d = seed(); persist(d); return d;
}
function fix(d) { const b = blank(); const hadTractors = Array.isArray(d.tractors); for (const k of Object.keys(b)) if (!Array.isArray(d[k]) && k !== 'version') d[k] = b[k];
  for (const p of b.operations) if (!d.operations.some(o => o.id === p.id)) d.operations.push(p);
  for (const f of d.fields) if (!f.statusChangedAt) f.statusChangedAt = f.updatedAt || f.createdAt || nowIso(); // v1.4: "last worked" on cards
  if (!hadTractors) { if (d.fields.some(f => f.sample)) seedTractors(d); persist(d); } // v1.2 upgrade: phones still on sample data get the sample tractors too
  return d; }
function persist(d = db) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { alert('Could not save on this phone: ' + e.message); } }
const save = () => persist(db);

/* ---------- sample data (clearly labeled) ---------- */
function seed() {
  const d = blank();
  const ago = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 36e5).toISOString();
  const add = (f, hist, notes = [], sprays = [], harvests = []) => {
    const id = uid() + d.fields.length;
    const last = hist[hist.length - 1];
    d.fields.push({id, sample: true, acres: null, crop: '', variety: '', plantedOn: '', createdAt: hist[0].at, ...f, operationId: last.to, statusChangedAt: last.at});
    const nf = d.fields[d.fields.length - 1]; nf.updatedAt = [last.at, nf.stateUpdatedAt || '', nf.nextUpdatedAt || '', ...notes.map(n => n.at)].sort().pop();
    let prev = null;
    for (const h of hist) { d.history.push({id: uid(), fieldId: id, fromOpId: prev, toOpId: h.to, at: h.at, note: h.note || ''}); prev = h.to; }
    for (const n of notes) d.notes.push({id: uid(), fieldId: id, text: n.text, createdAt: n.at});
    for (const s of sprays) d.sprays.push({id: uid(), fieldId: id, createdAt: s.date + 'T12:00:00Z', ...s});
    for (const h of harvests) d.harvests.push({id: uid(), fieldId: id, createdAt: h.date + 'T12:00:00Z', ...h});
  };
  add({name: 'North 80', acres: 80, crop: 'Grain sorghum', variety: 'Red grain hybrid (sample)', plantedOn: '2026-02-24',
       currentState: 'Sorghum is cut. East half of the stalks is shredded.', stateUpdatedAt: ago(0, 3),
       nextTodo: 'Finish shredding the west half, then disc twice.', nextUpdatedAt: ago(0, 3)},
      [{to: 'planting', at: ago(217)}, {to: 'spraying', at: ago(180)}, {to: 'harvesting', at: ago(84), note: 'Started combining'}, {to: 'shredding', at: ago(1, 2), note: 'Shredder back from the shop'}],
      [{text: 'Low spot by the canal gate stayed wet. Go around it on the next pass.', at: ago(0, 5)}, {text: 'Good stand this year. Keep the same seeding rate.', at: ago(84)}],
      [{date: '2026-03-20', product: 'Atrazine 4L (sample)', rate: '1', unit: 'qt/ac', notes: 'Pre-emerge, 10 gal/ac water'}],
      [{date: '2026-07-07', yield: '62', unit: 'bu/ac', notes: 'Moisture 14%'}]);
  add({name: 'Canal Field', acres: 45, crop: 'Grain sorghum', variety: '', plantedOn: '2026-03-02',
       currentState: 'Disced once. Clods are still big on the low end.', stateUpdatedAt: ago(2),
       nextTodo: 'Second pass with the disc after it dries out from the rain.', nextUpdatedAt: ago(2)},
      [{to: 'harvesting', at: ago(80)}, {to: 'shredding', at: ago(20)}, {to: 'discing', at: ago(3), note: 'First pass'}],
      [{text: 'Got about 1.5 in. of rain Saturday.', at: ago(2, 4)}], [], [{date: '2026-07-12', yield: '55', unit: 'bu/ac', notes: ''}]);
  add({name: 'Home Place', acres: 20, crop: 'Cotton', variety: '', plantedOn: '2026-03-10',
       currentState: 'Cotton is out and the stalks are plowed under.', stateUpdatedAt: ago(6),
       nextTodo: 'Build beds for spring.', nextUpdatedAt: ago(6)},
      [{to: 'harvesting', at: ago(40)}, {to: 'shredding', at: ago(30)}, {to: 'plowing', at: ago(7)}], [{text: 'Stalks destroyed before the deadline.', at: ago(7)}]);
  add({name: 'Resaca 40', acres: 40, crop: '', variety: '', plantedOn: '',
       currentState: 'Sitting fallow since spring.', stateUpdatedAt: ago(14),
       nextTodo: 'Pull a soil test before we fertilize for spring sorghum.', nextUpdatedAt: ago(14)},
      [{to: 'idle', at: ago(150)}]);
  seedTractors(d);
  return d;
}

/* ---------- helpers ---------- */
const op = id => db.operations.find(o => o.id === id) || {id, name: id ? 'Unknown' : 'No status', color: '#777'};
const field = id => db.fields.find(f => f.id === id);
const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString('en-US', {month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', hour: 'numeric', minute: '2-digit'}); };
const fmtDate = ymd => { if (!ymd) return ''; const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}); };
function ago(iso) {
  if (!iso) return ''; const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  const d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : d < 60 ? d + ' days ago' : Math.round(d / 30.4) + ' months ago';
}
const when = iso => `${esc(fmt(iso))} <span class="muted">(${esc(ago(iso))})</span>`;
const touch = f => { f.updatedAt = nowIso(); };
function toast(msg, action) {
  const t = $('#toast'); clearTimeout(toast.t); t.classList.toggle('has-action', !!action);
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-act">${esc(action.label)}</button>` : ''}`;
  if (action) $('.toast-act', t).onclick = () => { t.classList.remove('show', 'has-action'); action.run(); };
  t.classList.add('show'); toast.t = setTimeout(() => t.classList.remove('show', 'has-action'), action ? 7000 : 1800);
}
/* Deletes happen right away with an Undo button in the toast. Photos are only removed once the Undo window closes. */
let undoState = null;
function finalizeUndo() { if (!undoState) return; clearTimeout(undoState.timer); const ph = undoState.photos; undoState = null; if (ph.length) dropPhotos(ph); }
function undoable(msg, mutate, {photos = [], back = null} = {}) {
  finalizeUndo(); const snap = JSON.stringify(db); mutate(); save();
  undoState = {snap, photos: photos.filter(Boolean), back, timer: setTimeout(finalizeUndo, 7200)};
  toast(msg, {label: 'Undo', run: () => { const u = undoState; if (!u) return; clearTimeout(u.timer); undoState = null; db = JSON.parse(u.snap); save();
    if (u.back && location.hash !== u.back) location.hash = u.back; else rerender(); setTimeout(() => toast('Restored'), 50); }});
}
/* Big, tap-friendly confirm (instead of the small browser pop-up) for deleting a whole field or tractor. */
function confirmSheet({title, body, yes, run}) {
  openSheet(`<h2>${esc(title)}</h2><p class="confirm-body">${body}</p>
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button type="button" class="danger-solid" id="cf-yes">${esc(yes)}</button></div>`,
    p => $('#cf-yes', p).addEventListener('click', () => { closeSheet(); run(); }));
}
const cropLine = f => [f.crop, f.variety, f.acres ? f.acres + '\u00a0ac' : ''].filter(Boolean).map(esc).join(' · ');

/* ---------- sheet (bottom panel) ---------- */
function openSheet(html, bind) {
  const s = $('#sheet'), p = $('.panel', s); p.innerHTML = html; s.classList.remove('hidden'); s.setAttribute('aria-hidden', 'false');
  bind && bind(p); const first = p.querySelector('[autofocus]'); if (first) setTimeout(() => first.focus(), 50);
}
let sheetOnClose = null;
function closeSheet() { if (sheetOnClose) { const c = sheetOnClose; sheetOnClose = null; c(); } const s = $('#sheet'); s.classList.add('hidden'); s.setAttribute('aria-hidden', 'true'); $('.panel', s).innerHTML = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet(); });

/* ---------- screens ---------- */
const SEL_KEY = 'farmtracker.selectedField';
let lastTab = '#/';
function render() {
  const h = location.hash || '#/'; const m = h.match(/^#\/field\/([\w-]+)/) || h.match(/^#\/tractor\/([\w-]+)/);
  let tab;
  if (m && h.startsWith('#/field/') && field(m[1])) { viewField(field(m[1])); tab = lastTab; }
  else if (m && h.startsWith('#/tractor/') && tractor(m[1])) { viewTractor(tractor(m[1])); tab = lastTab; }
  else if (h.startsWith('#/tractors')) { viewTractors(); tab = '#/tractors'; }
  else if (h.startsWith('#/about')) { viewAbout(); tab = '#/about'; }
  else if (h.startsWith('#/fields')) { viewAll(); tab = '#/fields'; }
  else { viewHome(); tab = '#/'; }
  const onDetail = m && (h.startsWith('#/field/') ? field(m[1]) : tractor(m[1]));
  if (!onDetail && tab !== '#/about') lastTab = tab;
  document.querySelectorAll('.tabs a').forEach(a => { const on = a.getAttribute('href') === tab; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  document.body.classList.toggle('has-taskbar', !!onDetail);
  updateTabBadge(); updateBell(); hydratePhotos($('#view'));
  if (/^#\/alerts/.test(h)) { history.replaceState(null, '', '#/'); openBell(); }
  if (onDetail) buildPrint(h.startsWith('#/field/') ? 'field' : 'tractor', m[1]); // ready for an instant Print tap
  if (h !== lastRoute) { const v = $('#view'); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); lastRoute = h; }
  if (!keepScroll) window.scrollTo(0, 0); keepScroll = false;
}
let lastRoute = null;
let keepScroll = false;
const rerender = () => { keepScroll = true; const y = scrollY; render(); scrollTo(0, y); };
window.addEventListener('hashchange', render);

const sampleBanner = () => !hasSamples() ? '' : `<div class="sample-banner compact"><span><b>Sample data loaded</b> so you can try the app.</span><button class="danger edit" data-act="clear-samples">Remove</button></div>`;
const addBtn = (secondary) => `<button class="${secondary ? 'fab secondary' : 'primary fab'}" data-act="add-field">+ Add field</button>`;
const sortedFields = () => [...db.fields].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
const byName = () => [...db.fields].sort((a, b) => a.name.localeCompare(b.name, 'en', {numeric: true}));

function lastWorked(f) {
  const since = f.statusChangedAt, d = since ? Math.floor((Date.now() - new Date(since)) / 864e5) : null; let a;
  if (d == null) a = ''; else if (f.operationId === 'idle') a = d < 1 ? 'Idle since today' : d === 1 ? 'Idle since yesterday' : `Idle for ${d < 60 ? d + ' days' : Math.round(d / 30.4) + ' months'}`;
  else a = `Last worked <b>${esc(ago(since))}</b>`;
  const u = ago(f.updatedAt); return [a, u && u !== ago(since) ? `updated ${esc(u)}` : ''].filter(Boolean).join(' · ') || `Updated ${esc(u)}`;
}
function fieldCard(f, tag = 'a') {
  const o = op(f.operationId);
  const inner = `<div class="fc-top"><div class="fc-name">${esc(f.name)} ${f.sample ? '<span class="tag-sample">Sample</span>' : ''}</div><span class="badge" style="--op:${o.color}">${esc(o.name)}</span></div>
    ${cropLine(f) ? `<div class="fc-crop">${cropLine(f)}</div>` : ''}
    ${f.currentState ? `<div class="fc-line"><b>Now:</b> ${esc(f.currentState)}</div>` : ''}
    <div class="fc-next"><b>Next up:</b> ${f.nextTodo ? esc(f.nextTodo) : '<span class="empty">Nothing set</span>'}</div>
    <div class="fc-foot">${lastWorked(f)}</div>`;
  return tag === 'a' ? `<a class="field-card" style="--op:${o.color}" href="#/field/${f.id}">${inner}</a>` : `<div class="field-card" style="--op:${o.color}">${inner}</div>`;
}

const SORT_KEY = 'farmtracker.fieldSort';
const SORTS = [['recent', 'Recent'], ['name', 'A–Z'], ['op', 'Operation']];
function viewAll() {
  document.title = 'All Fields · Farm Tracker';
  const mode = SORTS.some(x => x[0] === localStorage.getItem(SORT_KEY)) ? localStorage.getItem(SORT_KEY) : 'recent';
  let list;
  if (mode === 'op') { const idx = id => { const i = db.operations.findIndex(o => o.id === id); return i < 0 ? 999 : i; }; let last = null;
    list = byName().sort((a, b) => idx(a.operationId) - idx(b.operationId)).map(f => { const o = op(f.operationId); const head = f.operationId !== last;
      last = f.operationId; const n = db.fields.filter(x => x.operationId === f.operationId).length;
      return `${head ? `<li class="grp-head"><span class="grp-dot" style="--op:${o.color}"></span>${esc(o.name)} <span class="muted">· ${n}</span></li>` : ''}<li>${fieldCard(f)}</li>`; }).join('');
  } else list = (mode === 'name' ? byName() : sortedFields()).map(f => `<li>${fieldCard(f)}</li>`).join('');
  $('#view').innerHTML = `${sampleBanner()}
    <div class="row split"><h1>All fields</h1><span class="muted small">${db.fields.length} field${db.fields.length === 1 ? '' : 's'}</span></div>
    ${db.fields.length > 1 ? `<div class="chips" role="group" aria-label="Sort fields"><span class="chips-label">Sort</span>${SORTS.map(([k, l]) => `<button type="button" class="chip" data-act="sort" data-id="${k}" aria-pressed="${k === mode}">${l}</button>`).join('')}</div>` : ''}
    ${db.fields.length ? `<ul class="fields">${list}</ul>`
      : `<div class="card empty-card"><p class="bigtext"><b>No fields yet.</b></p><p class="muted">Tap <b>+ Add field</b> below to start your list.</p></div>`}
    ${addBtn()}`;
}

function selectedField() { const id = localStorage.getItem(SEL_KEY); return id ? field(id) : null; }
function selectField(id) { id ? localStorage.setItem(SEL_KEY, id) : localStorage.removeItem(SEL_KEY); viewHome(); }
function matches(q) {
  q = q.trim().toLowerCase(); if (!q) return [];
  const words = q.split(/\s+/);
  return byName().filter(f => { const hay = [f.name, f.crop, f.variety].join(' ').toLowerCase(); return words.every(w => hay.includes(w)); })
    .sort((a, b) => (b.name.toLowerCase().startsWith(q) ? 1 : 0) - (a.name.toLowerCase().startsWith(q) ? 1 : 0));
}

function viewHome() {
  document.title = 'Farm Tracker';
  const sel = selectedField(), tsel = selectedTractor();
  $('#view').innerHTML = `${sampleBanner()}
    <section class="home-sec" aria-labelledby="q-label">
    ${!db.fields.length ? `<div class="sec-head"><h2 id="q-label" class="search-label">Fields</h2></div>
      <div class="card home-empty first-run"><p class="bigtext"><b>No fields yet.</b></p><p class="muted small">Add each field once. Then pick it here to see where it stands and what's next.</p>
      <button class="primary wide" data-act="add-field">+ Add your first field</button></div>` : `
    <div class="search-wrap">
      <div class="sec-head"><label for="q" id="q-label" class="search-label">Find a field</label><button class="edit" data-act="add-field">+ Add field</button></div>
      <div class="search-box"><svg class="search-ico" aria-hidden="true" viewBox="0 0 24 24" width="26" height="26"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>
        <input id="q" type="search" placeholder="Field name or crop" autocomplete="off" enterkeyhint="search"
          role="combobox" aria-expanded="false" aria-controls="sugg" aria-autocomplete="list"></div>
      <ul id="sugg" class="sugg hidden" role="listbox" aria-label="Matching fields"></ul>
    </div>
    <label for="pick">Or pick from your list</label>
    <select id="pick" class="picker"><option value="">Choose a field…</option>
      ${byName().map(f => `<option value="${f.id}" ${sel && sel.id === f.id ? 'selected' : ''}>${esc(f.name)}${f.crop ? ' · ' + esc(f.crop) : ''}</option>`).join('')}</select>
    <div class="home-result">
    ${sel ? `${fieldCard(sel, 'div')}
      <div class="row"><a class="btn primary grow" href="#/field/${sel.id}">Open field ›</a><button data-act="clear-sel" aria-label="Clear selected field">Clear</button></div>`
    : `<div class="card home-empty"><p class="bigtext"><b>Pick a field to see where it stands.</b></p>
      <p class="muted small">Search above or choose from the list. <b>All Fields</b> below shows every field.</p></div>`}
    </div>`}</section>
    <section class="home-sec" aria-labelledby="t-label">
      ${!db.tractors.length ? `<div class="sec-head"><h2 id="t-label" class="search-label">Tractors</h2></div>
      <div class="card home-empty first-run"><p class="bigtext"><b>No tractors yet.</b></p><p class="muted small">Add a tractor to track its hours, service and repairs.</p>
      <button class="primary wide" data-act="add-tractor">+ Add a tractor</button></div>` : `
      <div class="sec-head"><h2 id="t-label" class="search-label">Tractors</h2><button class="edit" data-act="add-tractor">+ Add tractor</button></div>
      <label for="tpick">Pick a tractor</label>
      <select id="tpick" class="picker"><option value="">Choose a tractor…</option>
        ${byTractorName().map(t => { const nd = nextDue(t); return `<option value="${t.id}" ${tsel && tsel.id === t.id ? 'selected' : ''}>${esc(t.name)}${nd && nd.st.level === 'over' ? ' · overdue' : nd && nd.st.level === 'soon' ? ' · due soon' : ''}</option>`; }).join('')}</select>
      <div class="home-result">
      ${tsel ? `${tractorCard(tsel, 'div')}
        <div class="row"><a class="btn primary grow" href="#/tractor/${tsel.id}">Open tractor ›</a><button data-act="clear-tsel" aria-label="Clear selected tractor">Clear</button></div>`
      : `<div class="card home-empty"><p class="bigtext"><b>Pick a tractor to see hours and what service is due.</b></p>
        <p class="muted small">The <b>Tractors</b> tab below lists them all.</p></div>`}
      </div>`}</section>`;
  if ($('#tpick')) $('#tpick').addEventListener('change', e => selectTractor(e.target.value));
  const q = $('#q'), sugg = $('#sugg'); if (!q) return;
  const show = () => {
    const list = matches(q.value); const open = q.value.trim() !== '';
    sugg.innerHTML = !open ? '' : list.length ? list.map((f, i) => { const o = op(f.operationId); return `<li role="option" id="s-${i}"><button type="button" data-pick="${f.id}">
      <span><span class="sg-name">${esc(f.name)}</span>${cropLine(f) ? `<span class="sg-crop">${cropLine(f)}</span>` : ''}</span>
      <span class="badge" style="--op:${o.color}">${esc(o.name)}</span></button></li>`; }).join('') : `<li class="sg-none">No field matches "${esc(q.value.trim())}"</li>`;
    sugg.classList.toggle('hidden', !open); q.setAttribute('aria-expanded', String(open));
  };
  q.addEventListener('input', show);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const m = matches(q.value); if (m[0]) { e.preventDefault(); selectField(m[0].id); } } if (e.key === 'Escape') { q.value = ''; show(); } });
  sugg.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) { selectField(b.dataset.pick); toast('Showing ' + field(b.dataset.pick).name); } });
  $('#pick').addEventListener('change', e => selectField(e.target.value));
}


const ICON = {
  mic: MIC_SVG,
  cam: '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  log: '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>',
  print: '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M7 9V3h10v6"/><path d="M5 17H3v-8h18v8h-2"/><path d="M7 14h10v7H7z"/></svg>',
  lib: '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 17 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/></svg>',
  cal: '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
};
const taskbar = kind => `<nav class="taskbar" aria-label="Quick actions">
  <button type="button" data-act="tb-voice">${ICON.mic}<span>Voice note</span></button>
  <button type="button" data-act="tb-photo">${ICON.cam}<span>Photo</span></button>
  <button type="button" data-act="tb-log">${ICON.log}<span>${kind === 'field' ? 'Status' : 'Log'}</span></button>
  <button type="button" data-act="tb-print">${ICON.print}<span>Print</span></button></nav>`;
const photoBtns = ctx => `<button type="button" class="tool" data-act="${ctx}-cam">${ICON.cam}<span>Camera</span></button><button type="button" class="tool" data-act="${ctx}-lib">${ICON.lib}<span>Library</span></button>`;
const drafts = {}; // unsaved note text + photos per field, kept across re-renders
const draftFor = id => drafts[id] || (drafts[id] = {text: '', photos: []});

/* ---------- tractor screens ---------- */
const TSEL_KEY = 'farmtracker.selectedTractor';
function selectedTractor() { const id = localStorage.getItem(TSEL_KEY); return id ? tractor(id) : null; }
function selectTractor(id) { id ? localStorage.setItem(TSEL_KEY, id) : localStorage.removeItem(TSEL_KEY); viewHome(); }
const byTractorName = () => [...db.tractors].sort((a, b) => a.name.localeCompare(b.name, 'en', {numeric: true}));

function tractorCard(t, tag = 'a') {
  const nd = nextDue(t), le = entriesOf(t)[0]; const lvl = nd ? nd.st.level : 'none';
  const inner = `<div class="fc-top"><div><div class="fc-name">${esc(t.name)} ${t.sample ? '<span class="tag-sample">Sample</span>' : ''}</div>
      ${tractorSub(t) ? `<div class="fc-crop">${tractorSub(t)}</div>` : ''}</div>
      <div class="hrs-chip"><b>${hrs(t.currentHours)}</b><span>hrs</span></div></div>
    <div class="due-box due-${lvl}"><div class="row split"><b>Next service</b>${pill(lvl)}</div>
      ${nd ? `<div class="due-name">${esc(nd.iv.name)}</div><div class="due-text">${esc(nd.st.text)}</div>` : '<div class="due-text">No service intervals set up yet.</div>'}</div>
    <div class="fc-line small"><b>Last entry:</b> ${le ? `${esc(fmtDate(le.date))} · ${le.type === 'repair' ? 'Repair' : 'Service'} · ${esc(le.work)}` : '<span class="empty">none yet</span>'}</div>
    <div class="fc-foot">Hours updated ${esc(ago(t.hoursUpdatedAt))}</div>`;
  const style = `--op:${{over: '#a61b1b', soon: '#b45309', ok: '#2f6b2f', none: '#777'}[lvl]}`;
  return tag === 'a' ? `<a class="field-card" style="${style}" href="#/tractor/${t.id}">${inner}</a>` : `<div class="field-card" style="${style}">${inner}</div>`;
}

function viewTractors() {
  document.title = 'Tractors · Farm Tracker';
  const rank = t => { const nd = nextDue(t); return nd ? LEVEL[nd.st.level][1] : 3; };
  const list = byTractorName().sort((a, b) => rank(a) - rank(b)); // most urgent service first
  $('#view').innerHTML = `${sampleBanner()}
    <div class="row split"><h1>Tractors</h1><span class="muted small">${list.length} tractor${list.length === 1 ? '' : 's'}</span></div>
    ${list.length ? `<ul class="fields">${list.map(t => `<li>${tractorCard(t)}</li>`).join('')}</ul>`
      : `<div class="card empty-card"><p class="bigtext"><b>No tractors yet.</b></p><p class="muted">Tap <b>+ Add tractor</b> below to add one.</p></div>`}
    <button class="primary fab" data-act="add-tractor">+ Add tractor</button>`;
}

function viewTractor(t) {
  document.title = t.name + ' · Farm Tracker';
  const ivs = intervalsOf(t).map(iv => ({iv, st: ivStatus(iv, t)})).sort((a, b) => LEVEL[a.st.level][1] - LEVEL[b.st.level][1] || a.st.score - b.st.score);
  const tl = [...entriesOf(t).map(e => ({k: 'e', d: e.date, at: e.createdAt, e})), ...db.hours.filter(h => h.tractorId === t.id).map(h => ({k: 'h', d: h.date, at: h.at, h}))]
    .sort((a, b) => b.d.localeCompare(a.d) || b.at.localeCompare(a.at));
  $('#view').innerHTML = `
    <button class="back" data-go="${lastTab}">‹ ${lastTab === '#/tractors' ? 'Tractors' : 'Home'}</button>
    ${t.sample ? `<div class="sample-banner note"><b>Sample tractor.</b> Hours, intervals and entries are made-up examples, not John Deere specs. Use your operator's manual for real intervals.</div>` : ''}
    <div class="card">
      <h1>${esc(t.name)} ${t.sample ? '<span class="tag-sample">Sample</span>' : ''}</h1>
      <dl class="meta">${[['Make', t.make], ['Model', t.model], ['Year', t.year], ['Serial / VIN', t.serial]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('') || '<dt>Details</dt><dd class="empty">not set</dd>'}</dl>
      <button class="wide" data-act="edit-tractor">Edit tractor</button>
    </div>
    <div class="card">
      <h2>Hours</h2>
      <div class="hours-big">${hrs(t.currentHours)} <span>hrs</span></div>
      <div class="stamp">Updated ${when(t.hoursUpdatedAt)}</div>
      <button class="primary wide" style="margin-top:12px" data-act="upd-hours">Update hours</button>
    </div>
    <div class="card">
      <div class="card-head"><h2>Service intervals</h2><button class="edit" data-act="add-interval">+ Add</button></div>
      ${ivs.length ? `<ul class="items ivs">${ivs.map(({iv, st}) => `<li class="iv iv-${st.level}" id="iv-${iv.id}"><div class="grow">
          <div class="row split"><b class="iv-name">${esc(iv.name)}</b>${pill(st.level)}</div>
          <div class="small">${esc(ivRule(iv))}</div>
          <div class="small">Last done: ${[num(iv.lastDoneHours) != null ? hrs(iv.lastDoneHours) + ' hrs' : '', iv.lastDoneDate ? fmtDate(iv.lastDoneDate) : ''].filter(Boolean).map(esc).join(' · ') || '<span class="empty">not recorded</span>'}</div>
          <div class="iv-status">${esc(st.text)}</div>
          <div class="row" style="margin-top:8px"><button class="primary grow" data-act="done-interval" data-id="${iv.id}">Mark done</button><button data-act="edit-interval" data-id="${iv.id}">Edit</button></div>
          <button class="cal-btn" data-act="ics" data-id="${iv.id}">${ICON.cal}<span>Add to calendar</span></button>
        </div></li>`).join('')}</ul>`
      : `<p class="empty">No intervals yet. Add the ones from your operator's manual (oil, filters, grease...).</p>`}
    </div>
    <div class="card">
      <h2>Maintenance history</h2>
      ${tl.length ? `<ul class="timeline">${tl.map(x => x.k === 'e' ? `<li style="--op:${x.e.type === 'repair' ? '#8a3f2b' : '#2f6b2f'}">
          <div class="row split"><span class="tl-what">${x.e.type === 'repair' ? 'Repair' : 'Service'}: ${esc(x.e.work)}</span><button class="x" data-act="del-entry" data-id="${x.e.id}" aria-label="Delete entry">×</button></div>
          <div class="small"><b>${esc(fmtDate(x.e.date))}</b>${num(x.e.hours) != null ? ' · ' + hrs(x.e.hours) + ' hrs' : ''}${num(x.e.cost) != null ? ' · ' + money(x.e.cost) : ''}</div>
          ${x.e.parts ? `<div class="small">Parts: ${esc(x.e.parts)}</div>` : ''}${x.e.notes ? `<div class="small">${esc(x.e.notes)}</div>` : ''}${thumbs(x.e.photoIds, 'maint:' + x.e.id)}
          <div class="stamp">Logged ${when(x.e.createdAt)}</div></li>`
        : `<li style="--op:#8a8f86"><div class="row split"><span class="tl-what muted">Hours: ${hrs(x.h.hours)}</span><button class="x" data-act="del-reading" data-id="${x.h.id}" aria-label="Delete hours reading">×</button></div>
          <div class="stamp">${esc(fmtDate(x.h.date))}${x.h.note ? ' · ' + esc(x.h.note) : ''} · logged ${esc(fmt(x.h.at))}</div></li>`).join('')}</ul>`
      : '<p class="empty">Nothing logged yet.</p>'}
    </div>
    <p class="stamp" style="text-align:center">Last updated ${when(t.updatedAt)}</p>
    <button class="danger wide" data-act="del-tractor">Delete this tractor</button>${taskbar('tractor')}`;
}

function tractorForm(t) {
  const isNew = !t; t = t || {};
  openSheet(`<form id="tf"><h2>${isNew ? 'Add a tractor' : 'Edit tractor'}</h2>
    <label for="t-name">Name</label><input id="t-name" name="name" required value="${esc(t.name)}" placeholder="e.g. 8335R or Big Green" autocomplete="off" ${isNew ? 'autofocus' : ''}>
    <div class="two"><div><label for="t-make">Make</label><input id="t-make" name="make" list="makes" value="${esc(t.make)}" placeholder="John Deere"></div>
      <div><label for="t-model">Model</label><input id="t-model" name="model" value="${esc(t.model)}" placeholder="8335R"></div></div>
    <datalist id="makes">${['John Deere', 'Case IH', 'New Holland', 'Kubota', 'Massey Ferguson', 'AGCO', 'Fendt', 'Mahindra'].map(c => `<option value="${c}">`).join('')}</datalist>
    <div class="two"><div><label for="t-year">Year</label><input id="t-year" name="year" inputmode="numeric" value="${esc(t.year)}" placeholder="optional"></div>
      ${isNew ? `<div><label for="t-hours">Current hours</label><input id="t-hours" name="hours" inputmode="decimal" placeholder="e.g. 1842"></div>` : '<div></div>'}</div>
    <label for="t-serial">Serial / VIN (optional)</label><input id="t-serial" name="serial" value="${esc(t.serial)}" autocomplete="off">
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">${isNew ? 'Add tractor' : 'Save'}</button></div></form>`, p => {
    $('#tf', p).addEventListener('submit', e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); for (const k in v) v[k] = v[k].trim(); if (!v.name) return;
      const n = nowIso(); const data = {name: v.name, make: v.make, model: v.model, year: v.year, serial: v.serial};
      if (isNew) {
        const h = num(v.hours); const nt = {id: uid(), ...data, notes: '', currentHours: h, hoursUpdatedAt: h != null ? n : '', createdAt: n, updatedAt: n};
        db.tractors.push(nt); if (h != null) db.hours.push({id: uid(), tractorId: nt.id, date: todayStr(), hours: h, at: n, note: 'Starting hours'});
        localStorage.setItem(TSEL_KEY, nt.id); save(); closeSheet(); location.hash = '#/tractor/' + nt.id; toast('Tractor added');
      } else { Object.assign(t, data); t.updatedAt = n; save(); closeSheet(); render(); toast('Saved'); }
    });
  });
}

function hoursForm(t) {
  openSheet(`<form id="hf"><h2>Update hours</h2><p class="muted small" style="margin:0">Now: ${hrs(t.currentHours)} hrs</p>
    <label for="h-hours">Hour meter reading</label><input id="h-hours" name="hours" inputmode="decimal" required autofocus placeholder="${esc(t.currentHours ?? '')}" class="huge-input">
    <label for="h-date">Date</label><input id="h-date" name="date" type="date" required value="${todayStr()}">
    <label for="h-note">Note (optional)</label><input id="h-note" name="note" placeholder="e.g. End of day, North 80">
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Save hours</button></div></form>`, p => {
    $('#hf', p).addEventListener('submit', e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const h = num(v.hours.trim().replace(/,/g, ''));
      if (h == null || h < 0) { alert('Enter the hour meter reading as a number.'); return; }
      if (num(t.currentHours) != null && h < t.currentHours && !confirm(`${hrs(h)} is lower than the current ${hrs(t.currentHours)} hrs. Save anyway?`)) return;
      const n = nowIso(); db.hours.push({id: uid(), tractorId: t.id, date: v.date, hours: h, at: n, note: v.note.trim()});
      t.currentHours = h; t.hoursUpdatedAt = n; t.updatedAt = n; save(); closeSheet(); render(); toast(`Hours: ${hrs(h)}`);
    });
  });
}

function logForm(t, type, intervalId, opts = {}) {
  const ivs = intervalsOf(t); const iv = intervalId && ivs.find(i => i.id === intervalId); let pending = []; let saved = false;
  openSheet(`<form id="lf"><h2>Log ${type === 'repair' ? 'a repair' : 'service'}</h2>
    <div class="seg" role="radiogroup" aria-label="Type"><label class="${type !== 'repair' ? 'on' : ''}"><input type="radio" name="type" value="service" ${type !== 'repair' ? 'checked' : ''}>Service</label>
      <label class="${type === 'repair' ? 'on' : ''}"><input type="radio" name="type" value="repair" ${type === 'repair' ? 'checked' : ''}>Repair</label></div>
    <div id="iv-wrap" class="${type === 'repair' ? 'hidden' : ''}"><label for="l-iv">Service item (resets its interval)</label>
      <select id="l-iv" name="intervalId"><option value="">None / other</option>${ivs.map(i => `<option value="${i.id}" ${iv && iv.id === i.id ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select></div>
    <label for="l-work">What was done</label><textarea id="l-work" name="work" placeholder="${type === 'repair' ? 'e.g. Replaced leaking hydraulic hose' : 'e.g. Changed engine oil & filter'}" ${iv ? '' : 'autofocus'}>${iv ? esc(iv.name.replace(/\s*\(example\)$/, '')) : ''}</textarea>
    <div class="tools">${micBtn('l-work')}${photoBtns('log')}</div><div id="log-photos"></div>
    <div class="two"><div><label for="l-date">Date</label><input id="l-date" name="date" type="date" required value="${todayStr()}"></div>
      <div><label for="l-hours">Hours</label><input id="l-hours" name="hours" inputmode="decimal" value="${esc(t.currentHours ?? '')}"></div></div>
    <label for="l-parts">Parts (optional)</label><input id="l-parts" name="parts" placeholder="e.g. Oil filter, 5 gal 15W-40">
    <div class="two"><div><label for="l-cost">Cost $ (optional)</label><input id="l-cost" name="cost" inputmode="decimal" placeholder="0.00"></div><div></div></div>
    <label for="l-notes">Notes (optional)</label><input id="l-notes" name="notes">
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Save</button></div></form>`, p => {
    const f = $('#lf', p);
    const showPending = () => { $('#log-photos', p).innerHTML = thumbs(pending, 'pending-log'); hydratePhotos(p); };
    const addPhotos = ids => { pending.push(...ids); showPending(); };
    p.addEventListener('click', e => { const b = e.target.closest('[data-act="log-cam"],[data-act="log-lib"]'); if (b) pickPhotos(b.dataset.act === 'log-cam', addPhotos);
      const v = e.target.closest('[data-view-photo][data-owner="pending-log"]'); if (v) openViewer(v.dataset.viewPhoto, async () => { pending = pending.filter(x => x !== v.dataset.viewPhoto); await dropPhotos([v.dataset.viewPhoto]); showPending(); }); });
    sheetOnClose = () => { if (!saved) dropPhotos(pending); };
    if (opts.voice) startVoice($('#l-work', p));
    if (opts.photo) pickPhotos(false, addPhotos);
    f.querySelectorAll('input[name=type]').forEach(r => r.addEventListener('change', () => {
      f.querySelectorAll('.seg label').forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
      $('#iv-wrap', p).classList.toggle('hidden', r.value === 'repair' && r.checked); $('h2', p).textContent = r.value === 'repair' ? 'Log a repair' : 'Log service'; }));
    $('#l-iv', p).addEventListener('change', e => { const i = ivs.find(x => x.id === e.target.value); const w = $('#l-work', p); if (i && !w.value.trim()) w.value = i.name.replace(/\s*\(example\)$/, ''); });
    f.addEventListener('submit', e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)); for (const k in v) v[k] = String(v[k]).trim();
      const n = nowIso(); const h = num(v.hours.replace(/,/g, '')); const cost = num(v.cost.replace(/[$,]/g, ''));
      const intervalId = v.type === 'service' && v.intervalId ? v.intervalId : null;
      if (!v.work && pending.length) v.work = v.type === 'repair' ? 'Repair (see photo)' : 'Service (see photo)';
      if (!v.work) { $('#l-work', p).focus(); return; }
      db.maint.push({id: uid(), tractorId: t.id, date: v.date, hours: h, type: v.type, work: v.work, parts: v.parts, cost, notes: v.notes, intervalId, photoIds: pending, createdAt: n}); saved = true;
      if (intervalId) { const i = ivs.find(x => x.id === intervalId); if (h != null) i.lastDoneHours = h; i.lastDoneDate = v.date; i.updatedAt = n; }
      if (h != null && (num(t.currentHours) == null || h > t.currentHours)) { t.currentHours = h; t.hoursUpdatedAt = n; db.hours.push({id: uid(), tractorId: t.id, date: v.date, hours: h, at: n, note: 'From ' + v.type + ' log'}); }
      t.updatedAt = n; save(); closeSheet(); render(); toast(v.type === 'repair' ? 'Repair logged' : 'Service logged');
    });
  });
}

function intervalForm(t, iv) {
  const isNew = !iv; iv = iv || {};
  openSheet(`<form id="if"><h2>${isNew ? 'Add service interval' : 'Edit service interval'}</h2>
    <label for="i-name">Service item</label><input id="i-name" name="name" list="ivnames" required value="${esc(iv.name)}" placeholder="e.g. Engine oil & filter" ${isNew ? 'autofocus' : ''}>
    <datalist id="ivnames">${COMMON_INTERVALS.map(c => `<option value="${c}">`).join('')}</datalist>
    <p class="muted small" style="margin:8px 0 0">Due every… (fill one or both, from your operator's manual)</p>
    <div class="two"><div><label for="i-eh">Hours</label><input id="i-eh" name="everyHours" inputmode="decimal" value="${esc(iv.everyHours ?? '')}" placeholder="e.g. 250"></div>
      <div><label for="i-ed">Days</label><input id="i-ed" name="everyDays" inputmode="numeric" value="${esc(iv.everyDays ?? '')}" placeholder="e.g. 365"></div></div>
    <p class="muted small" style="margin:8px 0 0">Last done</p>
    <div class="two"><div><label for="i-lh">At hours</label><input id="i-lh" name="lastDoneHours" inputmode="decimal" value="${esc(iv.lastDoneHours ?? '')}" placeholder="${esc(t.currentHours ?? '')}"></div>
      <div><label for="i-ld">On date</label><input id="i-ld" name="lastDoneDate" type="date" value="${esc(iv.lastDoneDate || '')}"></div></div>
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Save</button></div>
    ${isNew ? '' : '<button type="button" class="danger wide" style="margin-top:10px" id="i-del">Delete this interval</button>'}</form>`, p => {
    const f = $('#if', p);
    f.addEventListener('submit', e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)); for (const k in v) v[k] = v[k].trim();
      const data = {name: v.name, everyHours: num(v.everyHours), everyDays: num(v.everyDays), lastDoneHours: num(v.lastDoneHours), lastDoneDate: v.lastDoneDate, updatedAt: nowIso()};
      if (data.everyHours == null && data.everyDays == null) { alert('Enter how often: every so many hours, days, or both.'); return; }
      if (isNew) db.intervals.push({id: uid(), tractorId: t.id, createdAt: nowIso(), ...data}); else Object.assign(iv, data);
      t.updatedAt = nowIso(); save(); closeSheet(); render(); toast('Interval saved');
    });
    const d = $('#i-del', p); if (d) d.addEventListener('click', () => { closeSheet(); undoable('Interval deleted', () => { db.intervals = db.intervals.filter(x => x.id !== iv.id);
      db.maint.forEach(m => { if (m.intervalId === iv.id) m.intervalId = null; }); t.updatedAt = nowIso(); }); rerender(); });
  });
}

function viewField(f) {
  document.title = f.name + ' · Farm Tracker';
  const o = op(f.operationId);
  const notes = db.notes.filter(n => n.fieldId === f.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const hist = db.history.filter(h => h.fieldId === f.id).sort((a, b) => b.at.localeCompare(a.at));
  const sprays = db.sprays.filter(s => s.fieldId === f.id).sort((a, b) => b.date.localeCompare(a.date));
  const harvests = db.harvests.filter(s => s.fieldId === f.id).sort((a, b) => b.date.localeCompare(a.date));
  $('#view').innerHTML = `
    <button class="back" data-go="${lastTab}">‹ ${lastTab === '#/fields' ? 'All fields' : 'Home'}</button>
    <div class="card">
      <h1>${esc(f.name)} ${f.sample ? '<span class="tag-sample">Sample</span>' : ''}</h1>
      <dl class="meta">
        <dt>Crop</dt><dd>${esc(f.crop) || '<span class="empty">not set</span>'}</dd>
        ${f.variety ? `<dt>Variety</dt><dd>${esc(f.variety)}</dd>` : ''}
        <dt>Planted</dt><dd>${f.plantedOn ? esc(fmtDate(f.plantedOn)) : '<span class="empty">not set</span>'}</dd>
        ${f.acres ? `<dt>Acres</dt><dd>${esc(f.acres)}</dd>` : ''}
      </dl>
      <button class="wide" data-act="edit-field">Edit field &amp; crop</button>
    </div>
    <div class="card">
      <h2>Current operation</h2>
      <div class="row"><span class="badge big" style="--op:${o.color}">${esc(o.name)}</span></div>
      <div class="stamp">Since ${when(f.statusChangedAt)}</div>
      <button class="primary wide" style="margin-top:12px" data-act="status">Change status</button>
    </div>
    ${textCard('currentState', 'Where it stands now', f.currentState, f.stateUpdatedAt, 'e.g. Disced once, clods still big on the low end')}
    ${textCard('nextTodo', 'Next to do', f.nextTodo, f.nextUpdatedAt, 'e.g. Second pass with the disc after it dries out')}
    <div class="card" id="notes-card">
      <h2>Notes</h2>
      <textarea id="note-text" placeholder="Type or tap Voice to talk" aria-label="New note">${esc(draftFor(f.id).text)}</textarea>
      <div class="tools">${micBtn('note-text', 'field')}${photoBtns('note')}</div>
      <div id="pending-photos">${thumbs(draftFor(f.id).photos, 'pending-note')}</div>
      <button class="primary wide" style="margin-top:8px" data-act="add-note">Save note</button>
      ${notes.length ? `<ul class="items">${notes.map(n => `<li><div class="grow"><div class="txt">${esc(n.text)}</div>${thumbs(n.photoIds, 'note:' + n.id)}<div class="stamp">${when(n.createdAt)}</div></div>
        <button class="x" data-act="del-note" data-id="${n.id}" aria-label="Delete note">×</button></li>`).join('')}</ul>` : '<p class="empty">No notes yet.</p>'}
    </div>
    <div class="card">
      <div class="card-head"><h2>Spray log</h2><button class="edit" data-act="add-spray">+ Add spray</button></div>
      ${sprays.length ? `<ul class="items">${sprays.map(s => `<li><div><div class="txt"><b>${esc(s.product)}</b> · ${esc(s.rate)} ${esc(s.unit)}</div>
        <div class="stamp">${esc(fmtDate(s.date))}${s.notes ? ' · ' + esc(s.notes) : ''}</div></div>
        <button class="x" data-act="del-spray" data-id="${s.id}" aria-label="Delete spray record">×</button></li>`).join('')}</ul>` : '<p class="empty">No spray records.</p>'}
    </div>
    <div class="card">
      <div class="card-head"><h2>Harvest</h2><button class="edit" data-act="add-harvest">+ Add harvest</button></div>
      ${harvests.length ? `<ul class="items">${harvests.map(s => `<li><div><div class="txt"><b>${esc(s.yield)} ${esc(s.unit)}</b></div>
        <div class="stamp">${esc(fmtDate(s.date))}${s.notes ? ' · ' + esc(s.notes) : ''}</div></div>
        <button class="x" data-act="del-harvest" data-id="${s.id}" aria-label="Delete harvest record">×</button></li>`).join('')}</ul>` : '<p class="empty">No harvest records.</p>'}
    </div>
    <div class="card">
      <h2>Status history</h2>
      <ul class="timeline">${hist.map(h => { const t = op(h.toOpId); return `<li style="--op:${t.color}"><div class="tl-what">${h.fromOpId ? esc(op(h.fromOpId).name) + ' → ' : ''}${esc(t.name)}</div>
        <div class="stamp">${when(h.at)}</div>${h.note ? `<div class="small">${esc(h.note)}</div>` : ''}</li>`; }).join('')}
        <li style="--op:#bbb"><div class="tl-what">Field added</div><div class="stamp">${when(f.createdAt)}</div></li></ul>
    </div>
    <p class="stamp" style="text-align:center">Last updated ${when(f.updatedAt)}</p>
    <button class="danger wide" data-act="del-field">Delete this field</button>${taskbar('field')}`;
}

function textCard(key, title, text, stamp, ph) {
  return `<div class="card" id="card-${key}">
    <div class="card-head"><h2>${title}</h2><button class="edit" data-act="edit-text" data-key="${key}">Edit</button></div>
    <div class="bigtext">${text ? esc(text) : `<span class="empty">Tap Edit to add. ${esc(ph)}</span>`}</div>
    ${stamp ? `<div class="stamp">Updated ${when(stamp)}</div>` : ''}</div>`;
}

function viewAbout() {
  document.title = 'About · Farm Tracker';
  const custom = db.operations.filter(o => !o.builtIn);
  $('#view').innerHTML = `
    <div class="card about-hero">
      <img src="icons/icon.svg" alt="Farm Tracker sorghum icon" width="112" height="112">
      <h1 style="margin-top:12px">Farm Tracker</h1>
      <p class="bigtext" style="margin:4px 0">by <b>All Pro Digital</b></p>
      <p class="muted" style="margin:0">a Valley Pro Logistics LLC company</p>
      <p class="muted small" style="margin-bottom:0">Version ${VERSION} · Demo<br>Sister app of Service Tracker</p>
    </div>
    <div class="card" id="backup-card">
      <h2>Backup</h2>
      <p style="margin-top:0">Everything is saved <b>on this phone only</b>. If the phone is lost or browser data is cleared, it's gone, so save a backup file somewhere safe (Files, Google Drive, email). Photos are included.</p>
      <p class="backup-status">Last backed up: <b>${lastBackup() ? esc(fmt(lastBackup())) + ' (' + esc(ago(lastBackup())) + ')' : 'never'}</b></p>
      <button class="primary wide big-act" data-act="backup">Back up now</button>
      <button class="wide" style="margin-top:10px" data-act="restore">Restore from backup</button>
      <p class="tiny muted">Restoring replaces what's on this phone with the backup file.</p>
    </div>
    <div class="card">
      <h2>Service reminders</h2>
      <p style="margin-top:0">The <b>bell</b> at the top shows a red number when service is due soon or overdue, or when it's time to back up. Tap it for the list.</p>
      ${!canNotify() ? `<p class="small">${IS_IOS ? 'Phone alerts on iPhone need iOS 16.4+ and Farm Tracker added to the Home Screen (Share › Add to Home Screen), then opened from the icon.' : 'This browser does not support phone alerts.'}</p>`
        : Notification.permission === 'granted' ? '<p class="small"><b>Phone alerts are on.</b> You get an alert when you open the app and something is due.</p><button class="wide" data-act="test-alert">Send a test alert</button>'
        : Notification.permission === 'denied' ? '<p class="small">Phone alerts are blocked for this site. Turn them on in your browser or phone settings.</p>'
        : '<button class="primary wide" data-act="enable-alerts">Turn on phone alerts</button>'}
      <p class="tiny muted">Alerts show when the app is opened. To get alerts while the app is closed, use <b>Add to calendar</b> on each service item.</p>
    </div>
    <div class="card"><h2>Help</h2><button class="wide" data-act="welcome">Show the quick tour</button>
      <button class="wide" style="margin-top:10px" data-act="reset-samples">Reload sample data</button></div>
    <div class="card">
      <h2>Custom operations</h2>
      ${custom.length ? `<ul class="items">${custom.map(o => `<li><div class="txt"><span class="badge" style="--op:${o.color}">${esc(o.name)}</span></div>
        <button class="x" data-act="del-op" data-id="${o.id}" aria-label="Remove ${esc(o.name)}">×</button></li>`).join('')}</ul>`
        : '<p class="empty">None yet. Add one from "Change status" on any field.</p>'}
    </div>
    <p class="muted small" style="text-align:center">© ${new Date().getFullYear()} All Pro Digital, a Valley Pro Logistics LLC company.</p>`;
}

/* ---------- sheets ---------- */
function fieldForm(f) {
  const isNew = !f; f = f || {};
  openSheet(`<form id="ff"><h2>${isNew ? 'Add a field' : 'Edit field'}</h2>
    <label for="f-name">Field name</label><input id="f-name" name="name" required value="${esc(f.name)}" placeholder="e.g. North 80" autocomplete="off" ${isNew ? 'autofocus' : ''}>
    <div class="two"><div><label for="f-acres">Acres</label><input id="f-acres" name="acres" inputmode="decimal" value="${esc(f.acres ?? '')}" placeholder="80"></div>
      <div><label for="f-planted">Planted on</label><input id="f-planted" name="plantedOn" type="date" value="${esc(f.plantedOn)}"></div></div>
    <label for="f-crop">Crop</label><input id="f-crop" name="crop" list="crops" value="${esc(f.crop)}" placeholder="e.g. Grain sorghum">
    <datalist id="crops">${['Grain sorghum', 'Cotton', 'Corn', 'Sugarcane', 'Soybeans', 'Wheat', 'Onions', 'Citrus'].map(c => `<option value="${c}">`).join('')}</datalist>
    <label for="f-variety">Variety / hybrid</label><input id="f-variety" name="variety" value="${esc(f.variety)}" placeholder="optional">
    ${isNew ? `<label for="f-op">Current operation</label><select id="f-op" name="op">${db.operations.map(o => `<option value="${o.id}" ${o.id === 'idle' ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>` : ''}
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">${isNew ? 'Add field' : 'Save'}</button></div></form>`, p => {
    $('#ff', p).addEventListener('submit', e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const name = v.name.trim(); if (!name) return;
      const t = nowIso(); const data = {name, acres: v.acres.trim() ? Number(v.acres) || v.acres.trim() : null, crop: v.crop.trim(), variety: v.variety.trim(), plantedOn: v.plantedOn};
      if (isNew) {
        const nf = {id: uid(), ...data, operationId: v.op, currentState: '', nextTodo: '', createdAt: t, updatedAt: t, statusChangedAt: t, stateUpdatedAt: '', nextUpdatedAt: ''};
        db.fields.push(nf); db.history.push({id: uid(), fieldId: nf.id, fromOpId: null, toOpId: v.op, at: t, note: ''});
        localStorage.setItem(SEL_KEY, nf.id); save(); closeSheet(); location.hash = '#/field/' + nf.id; toast('Field added');
      } else { Object.assign(f, data); touch(f); save(); closeSheet(); render(); toast('Saved'); }
    });
  });
}

// Up to 3 operations used most recently (any field), shown first once custom operations make the list long.
function recentOps(f) {
  if (db.operations.length <= PRESETS.length) return [];
  const out = []; for (const h of [...db.history].sort((a, b) => b.at.localeCompare(a.at))) {
    if (h.toOpId !== f.operationId && !out.some(o => o.id === h.toOpId)) { const o = db.operations.find(x => x.id === h.toOpId); if (o) out.push(o); } if (out.length === 3) break; }
  return out;
}
function statusPicker(f) {
  openSheet(`<h2>Change status</h2><p class="muted small" style="margin:0">Tap the operation this field is in now.</p>
    <label for="s-note">Note for this change (optional)</label><input id="s-note" placeholder="e.g. First pass">
    ${recentOps(f).length ? `<p class="ops-label">Recent</p><div class="ops recent">${recentOps(f).map(o => `<button data-op="${o.id}" style="--op:${o.color}">${esc(o.name)}</button>`).join('')}</div><p class="ops-label">All operations</p>` : ''}
    <div class="ops">${db.operations.map(o => `<button data-op="${o.id}" class="${o.id === f.operationId ? 'cur' : ''}" style="--op:${o.color}">${esc(o.name)}${o.id === f.operationId ? ' ✓' : ''}</button>`).join('')}</div>
    <form id="custom-op"><label for="c-name">Add custom operation</label>
      <div class="row"><input id="c-name" class="grow" placeholder="e.g. Bedding, Rolling, Laser leveling" autocomplete="off" style="flex:1 1 0"><button class="primary" type="submit">Add</button></div></form>
    <div class="sheet-actions"><button data-close>Cancel</button></div>`, p => {
    p.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => setStatus(f, b.dataset.op, $('#s-note', p).value.trim())));
    $('#custom-op', p).addEventListener('submit', e => {
      e.preventDefault(); const name = $('#c-name', p).value.trim(); if (!name) return;
      let o = db.operations.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!o) { const n = db.operations.filter(x => !x.builtIn).length; o = {id: 'c-' + uid(), name, color: CUSTOM_COLORS[n % CUSTOM_COLORS.length], builtIn: false, createdAt: nowIso()}; db.operations.push(o); save(); }
      setStatus(f, o.id, $('#s-note', p).value.trim()); toast(`"${name}" saved to your list`);
    });
  });
}
function setStatus(f, opId, note) {
  if (opId === f.operationId && !note) { closeSheet(); return; }
  const t = nowIso(); db.history.push({id: uid(), fieldId: f.id, fromOpId: f.operationId, toOpId: opId, at: t, note});
  f.operationId = opId; f.statusChangedAt = t; touch(f); save(); closeSheet(); render(); toast('Status: ' + op(opId).name);
}

function editText(f, key) {
  const card = $('#card-' + key); const title = key === 'currentState' ? 'Where it stands now' : 'Next to do';
  card.innerHTML = `<h2>${title}</h2><textarea id="t-${key}" aria-label="${title}">${esc(f[key])}</textarea>
    <div class="tools">${micBtn('t-' + key, 'field')}</div>
    <div class="sheet-actions"><button data-act="cancel-text">Cancel</button><button class="primary" data-act="save-text" data-key="${key}">Save</button></div>`;
  const ta = $('textarea', card); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}

function recordForm(kind, f) {
  const spray = kind === 'spray';
  openSheet(`<form id="rf"><h2>${spray ? 'Add spray record' : 'Add harvest'}</h2>
    <label for="r-date">Date</label><input id="r-date" name="date" type="date" required value="${todayStr()}">
    ${spray ? `<label for="r-prod">Product</label><input id="r-prod" name="product" required placeholder="e.g. Atrazine 4L" autofocus>
      <div class="two"><div><label for="r-rate">Rate</label><input id="r-rate" name="rate" inputmode="decimal" required placeholder="1"></div>
      <div><label for="r-unit">Unit</label><select id="r-unit" name="unit">${RATE_UNITS.map(u => `<option ${u === 'qt/ac' ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>`
    : `<div class="two"><div><label for="r-yield">Yield</label><input id="r-yield" name="yield" inputmode="decimal" required placeholder="62" autofocus></div>
      <div><label for="r-unit">Unit</label><select id="r-unit" name="unit">${YIELD_UNITS.map(u => `<option>${u}</option>`).join('')}</select></div></div>`}
    <label for="r-notes">Notes (optional)</label><input id="r-notes" name="notes" placeholder="${spray ? 'e.g. 10 gal/ac water, wind calm' : 'e.g. Moisture 14%'}">
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Save</button></div></form>`, p => {
    $('#rf', p).addEventListener('submit', e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); for (const k in v) v[k] = v[k].trim();
      (spray ? db.sprays : db.harvests).push({id: uid(), fieldId: f.id, createdAt: nowIso(), ...v});
      touch(f); save(); closeSheet(); render(); toast(spray ? 'Spray saved' : 'Harvest saved');
    });
  });
}

/* ---------- actions (event delegation) ---------- */
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]'); if (go) { location.hash = go.dataset.go; return; }
  const mic = e.target.closest('[data-mic]');
  if (mic) { const ta = document.getElementById(mic.dataset.mic); const fm = (location.hash.match(/^#\/field\/([\w-]+)/) || [])[1];
    return startVoice(ta, text => { if (mic.dataset.ctx === 'field' && fm && field(fm)) suggestStatus(field(fm), text); }); }
  const vp = e.target.closest('[data-view-photo]');
  if (vp && vp.dataset.owner !== 'pending-log') { const pid = vp.dataset.viewPhoto, [kind, oid] = vp.dataset.owner.split(':');
    return openViewer(pid, async () => {
      if (kind === 'pending-note') { const fm = (location.hash.match(/^#\/field\/([\w-]+)/) || [])[1]; const d = draftFor(fm); d.photos = d.photos.filter(x => x !== pid); }
      else { const rec = (kind === 'note' ? db.notes : db.maint).find(x => x.id === oid); if (rec) { rec.photoIds = (rec.photoIds || []).filter(x => x !== pid); save(); } }
      await dropPhotos([pid]); rerender(); toast('Photo deleted'); }); }
  const b = e.target.closest('[data-act]'); if (!b || b.closest('#sheet')) return;
  const m = (location.hash.match(/^#\/field\/([\w-]+)/) || [])[1]; const f = m && field(m); const id = b.dataset.id;
  const tm = (location.hash.match(/^#\/tractor\/([\w-]+)/) || [])[1]; const t = tm && tractor(tm);
  const del = (list, what) => { undoable(what + ' deleted', () => { db[list] = db[list].filter(x => x.id !== id); if (f) touch(f); if (t) t.updatedAt = nowIso(); }); rerender(); };
  switch (b.dataset.act) {
    case 'add-field': return fieldForm();
    case 'clear-sel': return selectField('');
    case 'clear-tsel': return selectTractor('');
    case 'add-tractor': return tractorForm();
    case 'edit-tractor': return tractorForm(t);
    case 'upd-hours': return hoursForm(t);
    case 'log-service': return logForm(t, 'service');
    case 'log-repair': return logForm(t, 'repair');
    case 'add-interval': return intervalForm(t);
    case 'edit-interval': return intervalForm(t, db.intervals.find(x => x.id === id));
    case 'done-interval': return logForm(t, 'service', id);
    case 'del-entry': { const en = db.maint.find(x => x.id === id); if (!en) return; undoable('Log entry deleted', () => { db.maint = db.maint.filter(x => x.id !== id); t.updatedAt = nowIso(); }, {photos: en.photoIds || []}); return rerender(); }
    case 'del-reading': return del('hours', 'Hours reading');
    case 'del-tractor': return confirmSheet({title: `Delete ${t.name}?`, yes: 'Delete tractor', body: 'Its hours, service intervals and whole maintenance log go with it. You can undo for a few seconds.', run: () => {
      const tid = t.id, photos = db.maint.filter(x => x.tractorId === tid).flatMap(x => x.photoIds || []);
      undoable('Tractor deleted', () => { db.tractors = db.tractors.filter(x => x.id !== tid); for (const k of TRACTOR_KEYS) db[k] = db[k].filter(x => x.tractorId !== tid); }, {photos, back: '#/tractor/' + tid});
      location.hash = lastTab === '#/tractors' ? '#/tractors' : '#/'; }});
    case 'edit-field': return fieldForm(f);
    case 'status': return statusPicker(f);
    case 'edit-text': return editText(f, b.dataset.key);
    case 'cancel-text': return render();
    case 'save-text': { const k = b.dataset.key; const val = $('#t-' + k).value.trim(); if (val !== (f[k] || '')) { f[k] = val; f[k === 'currentState' ? 'stateUpdatedAt' : 'nextUpdatedAt'] = nowIso(); touch(f); save(); toast('Saved'); } return render(); }
    case 'add-note': { const ta = $('#note-text'); const text = ta.value.trim(); const d = draftFor(f.id); if (!text && !d.photos.length) { ta.focus(); return; }
      db.notes.push({id: uid(), fieldId: f.id, text, photoIds: d.photos, createdAt: nowIso()}); delete drafts[f.id]; touch(f); save(); rerender(); return toast('Note saved'); }
    case 'del-note': { const n = db.notes.find(x => x.id === id); if (!n) return; undoable('Note deleted', () => { db.notes = db.notes.filter(x => x.id !== id); touch(f); }, {photos: n.photoIds || []}); return rerender(); }
    case 'note-cam': case 'note-lib': return pickPhotos(b.dataset.act === 'note-cam', ids => { draftFor(f.id).photos.push(...ids); const el = $('#pending-photos'); if (el) { el.innerHTML = thumbs(draftFor(f.id).photos, 'pending-note'); hydratePhotos(el); } toast(ids.length > 1 ? 'Photos added. Tap Save note.' : 'Photo added. Tap Save note.'); });
    case 'tb-voice': if (f) { const ta = $('#note-text'); $('#notes-card').scrollIntoView({block: 'start'}); scrollBy(0, -70); return startVoice(ta, text => suggestStatus(f, text)); }
      return logForm(t, 'service', null, {voice: true});
    case 'tb-photo': if (f) return pickPhotos(false, ids => { draftFor(f.id).photos.push(...ids); rerender(); $('#notes-card').scrollIntoView({block: 'start'}); scrollBy(0, -70); toast('Photo added. Add a few words and tap Save note.'); });
      return logForm(t, 'service', null, {photo: true});
    case 'tb-log': if (f) return statusPicker(f);
      return openSheet(`<h2>Log for ${esc(t.name)}</h2><div class="choice"><button class="primary big-act" data-c="hours">Update hours</button><button class="big-act" data-c="service">Log service</button><button class="big-act repair" data-c="repair">Log repair</button></div>
        <div class="sheet-actions"><button type="button" data-close>Cancel</button></div>`, p => p.querySelectorAll('[data-c]').forEach(x => x.addEventListener('click', () => x.dataset.c === 'hours' ? hoursForm(t) : logForm(t, x.dataset.c))));
    case 'tb-print': return printRecord(f ? 'field' : 'tractor', (f || t).id);
    case 'ics': return addToCalendar(t, db.intervals.find(x => x.id === id));
    case 'backup': return backupNow();
    case 'restore': return restorePick();
    case 'enable-alerts': return enableAlerts();
    case 'test-alert': return maybeNotify(true).then(ok => toast(ok ? 'Test alert sent' : 'Nothing is due, so no alert was sent'));
    case 'add-spray': return recordForm('spray', f);
    case 'add-harvest': return recordForm('harvest', f);
    case 'del-spray': return del('sprays', 'Spray record');
    case 'del-harvest': return del('harvests', 'Harvest record');
    case 'del-field': return confirmSheet({title: `Delete ${f.name}?`, yes: 'Delete field', body: 'Its notes, photos, spray and harvest records and status history go with it. You can undo for a few seconds.', run: () => {
      const fid = f.id, photos = db.notes.filter(x => x.fieldId === fid).flatMap(x => x.photoIds || []); delete drafts[fid];
      undoable('Field deleted', () => { db.fields = db.fields.filter(x => x.id !== fid); for (const k of FIELD_KEYS) db[k] = db[k].filter(x => x.fieldId !== fid); }, {photos, back: '#/field/' + fid});
      location.hash = '#/'; }});
    case 'clear-samples': return confirmSheet({title: 'Remove the sample data?', yes: 'Remove samples', body: 'The sample fields and tractors go away. <b>Your own fields and tractors stay.</b>', run: () => {
      undoable('Samples removed', () => removeSamples(db), {photos: samplePhotoIds()}); rerender(); }});
    case 'reset-samples': return confirmSheet({title: 'Load the sample data again?', yes: 'Load samples', body: 'Puts the sample fields and tractors back so you can try things. Your own stay.', run: () => {
      finalizeUndo(); dropPhotos(samplePhotoIds()); removeSamples(db); const s = seed();
      for (const k of ['fields', 'tractors', ...FIELD_KEYS, ...TRACTOR_KEYS]) db[k] = db[k].concat(s[k]); save(); location.hash = '#/'; render(); toast('Sample data loaded'); }});
    case 'del-op': { const inUse = db.fields.some(x => x.operationId === id) || db.history.some(h => h.toOpId === id || h.fromOpId === id);
      if (inUse) return alert('This operation is used in a field or its history, so it stays. You can still stop picking it.');
      undoable('Operation removed', () => { db.operations = db.operations.filter(o => o.id !== id); }); return rerender(); }
    case 'sort': localStorage.setItem(SORT_KEY, id); return rerender();
    case 'welcome': return showWelcome(0);
  }
});

document.addEventListener('input', e => { if (e.target.id === 'note-text') { const fm = (location.hash.match(/^#\/field\/([\w-]+)/) || [])[1]; if (fm) draftFor(fm).text = e.target.value; } });
function flushOpenEdits(f) { for (const k of ['currentState', 'nextTodo']) { const ta = document.getElementById('t-' + k); if (ta && ta.value.trim() !== (f[k] || '')) { f[k] = ta.value.trim(); f[k === 'currentState' ? 'stateUpdatedAt' : 'nextUpdatedAt'] = nowIso(); touch(f); } } }
const samplePhotoIds = () => { const fids = new Set(db.fields.filter(x => x.sample).map(x => x.id)), tids = new Set(db.tractors.filter(x => x.sample).map(x => x.id));
  return [...db.notes.filter(n => fids.has(n.fieldId)), ...db.maint.filter(m => tids.has(m.tractorId))].flatMap(x => x.photoIds || []); };
// Clean up photos that were picked but never saved (e.g. app closed mid-note).
async function gcPhotos() { try { const used = new Set([...db.notes, ...db.maint].flatMap(x => x.photoIds || [])); for (const k of await PhotoDB.keys()) if (!used.has(k)) await PhotoDB.del(k); } catch (e) { console.warn(e); } }

/* ---------- start ---------- */
const START_HASH = location.hash;
render();
gcPhotos(); setTimeout(maybeNotify, 1500);
setTimeout(() => { if (!welcomed() && (START_HASH === '' || START_HASH === '#/')) showWelcome(0); }, 1350);
setTimeout(() => { const s = $('#splash'); s.classList.add('gone'); setTimeout(() => s.remove(), 400); }, 1200);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
