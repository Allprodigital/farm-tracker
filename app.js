/* Farm Tracker (milestone 1) by All Pro Digital, a Valley Pro Logistics LLC company.
   Single-file vanilla JS app. Data lives on this device in localStorage (key: farmtracker.v1). */
'use strict';
const VERSION = '1.1.0';
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

/* ---------- storage ---------- */
let db = load();
function blank() { return {version: 1, fields: [], operations: PRESETS.map(([id, name, color]) => ({id, name, color, builtIn: true})), history: [], notes: [], sprays: [], harvests: []}; }
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.version) return fix(d); } catch (e) { console.warn(e); }
  const d = seed(); persist(d); return d;
}
function fix(d) { const b = blank(); for (const k of Object.keys(b)) if (!Array.isArray(d[k]) && k !== 'version') d[k] = b[k];
  for (const p of b.operations) if (!d.operations.some(o => o.id === p.id)) d.operations.push(p); return d; }
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
  const d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : d + ' days ago';
}
const when = iso => `${esc(fmt(iso))} <span class="muted">(${esc(ago(iso))})</span>`;
const touch = f => { f.updatedAt = nowIso(); };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800); }
const cropLine = f => [f.crop, f.variety, f.acres ? f.acres + ' ac' : ''].filter(Boolean).map(esc).join(' · ');

/* ---------- sheet (bottom panel) ---------- */
function openSheet(html, bind) {
  const s = $('#sheet'), p = $('.panel', s); p.innerHTML = html; s.classList.remove('hidden'); s.setAttribute('aria-hidden', 'false');
  bind && bind(p); const first = p.querySelector('[autofocus]'); if (first) setTimeout(() => first.focus(), 50);
}
function closeSheet() { const s = $('#sheet'); s.classList.add('hidden'); s.setAttribute('aria-hidden', 'true'); $('.panel', s).innerHTML = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet(); });

/* ---------- screens ---------- */
const SEL_KEY = 'farmtracker.selectedField';
let lastTab = '#/';
function render() {
  const h = location.hash || '#/'; const m = h.match(/^#\/field\/([\w-]+)/);
  let tab;
  if (m && field(m[1])) { viewField(field(m[1])); tab = lastTab; }
  else if (h.startsWith('#/about')) { viewAbout(); tab = '#/about'; }
  else if (h.startsWith('#/fields')) { viewAll(); tab = '#/fields'; }
  else { viewHome(); tab = '#/'; }
  if (!m && tab !== '#/about') lastTab = tab;
  document.querySelectorAll('.tabs a').forEach(a => { const on = a.getAttribute('href') === tab; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

const sampleBanner = compact => !db.fields.some(f => f.sample) ? '' : compact ? `<div class="sample-banner compact"><span><b>Sample fields loaded</b> so you can try the app.</span><button class="danger edit" data-act="clear-samples">Remove</button></div>` : `<div class="sample-banner"><b>These are sample fields.</b> They are here so you can try the app. Add your own, then remove the samples.
  <div class="row" style="margin-top:10px"><button class="danger" data-act="clear-samples">Remove sample fields</button></div></div>`;
const addBtn = (secondary) => `<button class="${secondary ? 'fab secondary' : 'primary fab'}" data-act="add-field">+ Add field</button>`;
const sortedFields = () => [...db.fields].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
const byName = () => [...db.fields].sort((a, b) => a.name.localeCompare(b.name, 'en', {numeric: true}));

function fieldCard(f, tag = 'a') {
  const o = op(f.operationId);
  const inner = `<div class="fc-top"><div><div class="fc-name">${esc(f.name)} ${f.sample ? '<span class="tag-sample">Sample</span>' : ''}</div>
      ${cropLine(f) ? `<div class="fc-crop">${cropLine(f)}</div>` : ''}</div><span class="badge" style="--op:${o.color}">${esc(o.name)}</span></div>
    ${f.currentState ? `<div class="fc-line"><b>Now:</b> ${esc(f.currentState)}</div>` : ''}
    <div class="fc-next"><b>Next up:</b> ${f.nextTodo ? esc(f.nextTodo) : '<span class="empty">Nothing set</span>'}</div>
    <div class="fc-foot">Updated ${esc(ago(f.updatedAt))} · ${esc(fmt(f.updatedAt))}</div>`;
  return tag === 'a' ? `<a class="field-card" style="--op:${o.color}" href="#/field/${f.id}">${inner}</a>` : `<div class="field-card" style="--op:${o.color}">${inner}</div>`;
}

function viewAll() {
  document.title = 'All Fields · Farm Tracker';
  const fields = sortedFields();
  $('#view').innerHTML = `${sampleBanner()}
    <div class="row split"><h1>All fields</h1><span class="muted small">${db.fields.length} field${db.fields.length === 1 ? '' : 's'}</span></div>
    ${fields.length ? `<ul class="fields">${fields.map(f => `<li>${fieldCard(f)}</li>`).join('')}</ul>`
      : `<div class="card"><p class="bigtext">No fields yet.</p><p class="muted">Tap <b>Add field</b> below to start your list.</p></div>`}
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
  const sel = selectedField();
  $('#view').innerHTML = `${sampleBanner(true)}
    <div class="search-wrap">
      <label for="q" class="search-label">Find a field</label>
      <div class="search-box"><svg class="search-ico" aria-hidden="true" viewBox="0 0 24 24" width="26" height="26"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>
        <input id="q" type="search" placeholder="Search by field name or crop" autocomplete="off" enterkeyhint="search"
          role="combobox" aria-expanded="false" aria-controls="sugg" aria-autocomplete="list"></div>
      <ul id="sugg" class="sugg hidden" role="listbox" aria-label="Matching fields"></ul>
    </div>
    <label for="pick">Or pick from your list</label>
    <select id="pick" class="picker"><option value="">Choose a field…</option>
      ${byName().map(f => `<option value="${f.id}" ${sel && sel.id === f.id ? 'selected' : ''}>${esc(f.name)}${f.crop ? ' · ' + esc(f.crop) : ''}</option>`).join('')}</select>
    <div class="home-result">
    ${sel ? `${fieldCard(sel, 'div')}
      <div class="row"><a class="btn primary grow" href="#/field/${sel.id}">Open full detail ›</a><button data-act="clear-sel" aria-label="Clear selected field">Clear</button></div>`
    : `<div class="card home-empty"><img src="icons/icon.svg" alt="" width="72" height="72">
      <p class="bigtext"><b>Pick a field to see where it stands.</b></p>
      <p class="muted">${db.fields.length ? 'Search above or choose from the list. Tap <b>All Fields</b> below to see every field at once.' : 'You have no fields yet. Tap <b>+ Add field</b> to add your first one.'}</p></div>`}
    </div>
    ${addBtn(!!sel)}`;
  const q = $('#q'), sugg = $('#sugg');
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
    <div class="card">
      <h2>Notes</h2>
      <textarea id="note-text" placeholder="Type a note for this field" aria-label="New note"></textarea>
      <button class="primary wide" style="margin-top:8px" data-act="add-note">Add note</button>
      ${notes.length ? `<ul class="items">${notes.map(n => `<li><div><div class="txt">${esc(n.text)}</div><div class="stamp">${when(n.createdAt)}</div></div>
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
    <button class="danger wide" data-act="del-field">Delete this field</button>`;
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
      <p class="muted small">Version ${VERSION} · Milestone 1 demo · Sister app of Service Tracker</p>
    </div>
    <div class="card">
      <h2>Your data</h2>
      <p>Everything you enter is saved <b>on this phone only</b> (in this browser). It is not sent anywhere yet. Clearing browser data will erase it, so use Export to keep a copy.</p>
      <div class="row"><button class="grow" data-act="export">Export a copy</button><button class="grow" data-act="reset-samples">Reload sample data</button></div>
    </div>
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

function statusPicker(f) {
  openSheet(`<h2>Change status</h2><p class="muted small" style="margin:0">Tap the operation this field is in now.</p>
    <label for="s-note">Note for this change (optional)</label><input id="s-note" placeholder="e.g. First pass">
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
  const b = e.target.closest('[data-act]'); if (!b || b.closest('#sheet')) return;
  const m = (location.hash.match(/^#\/field\/([\w-]+)/) || [])[1]; const f = m && field(m); const id = b.dataset.id;
  const del = (list, what) => { if (confirm(`Delete this ${what}?`)) { db[list] = db[list].filter(x => x.id !== id); if (f) touch(f); save(); render(); toast('Deleted'); } };
  switch (b.dataset.act) {
    case 'add-field': return fieldForm();
    case 'clear-sel': return selectField('');
    case 'edit-field': return fieldForm(f);
    case 'status': return statusPicker(f);
    case 'edit-text': return editText(f, b.dataset.key);
    case 'cancel-text': return render();
    case 'save-text': { const k = b.dataset.key; const val = $('#t-' + k).value.trim(); if (val !== (f[k] || '')) { f[k] = val; f[k === 'currentState' ? 'stateUpdatedAt' : 'nextUpdatedAt'] = nowIso(); touch(f); save(); toast('Saved'); } return render(); }
    case 'add-note': { const ta = $('#note-text'); const text = ta.value.trim(); if (!text) { ta.focus(); return; } db.notes.push({id: uid(), fieldId: f.id, text, createdAt: nowIso()}); touch(f); save(); render(); return toast('Note added'); }
    case 'del-note': return del('notes', 'note');
    case 'add-spray': return recordForm('spray', f);
    case 'add-harvest': return recordForm('harvest', f);
    case 'del-spray': return del('sprays', 'spray record');
    case 'del-harvest': return del('harvests', 'harvest record');
    case 'del-field': if (confirm(`Delete "${f.name}" and all its notes and records? This cannot be undone.`)) { const fid = f.id; db.fields = db.fields.filter(x => x.id !== fid);
      for (const k of ['history', 'notes', 'sprays', 'harvests']) db[k] = db[k].filter(x => x.fieldId !== fid); save(); location.hash = '#/'; toast('Field deleted'); } return;
    case 'clear-samples': if (confirm('Remove all sample fields? Your own fields stay.')) { const ids = new Set(db.fields.filter(x => x.sample).map(x => x.id)); db.fields = db.fields.filter(x => !x.sample);
      for (const k of ['history', 'notes', 'sprays', 'harvests']) db[k] = db[k].filter(x => !ids.has(x.fieldId)); save(); render(); toast('Samples removed'); } return;
    case 'reset-samples': if (confirm('Add the sample fields back? Your own fields stay.')) { const s = seed(); const ids = new Set(db.fields.filter(x => x.sample).map(x => x.id));
      for (const k of ['fields', 'history', 'notes', 'sprays', 'harvests']) db[k] = db[k].filter(x => !(ids.has(x.id) && k === 'fields') && !ids.has(x.fieldId)).concat(s[k]);
      save(); location.hash = '#/'; render(); toast('Sample fields loaded'); } return;
    case 'del-op': { const inUse = db.fields.some(x => x.operationId === id) || db.history.some(h => h.toOpId === id || h.fromOpId === id);
      if (inUse) return alert('This operation is used in a field or its history, so it stays. You can still stop picking it.');
      if (confirm('Remove this custom operation?')) { db.operations = db.operations.filter(o => o.id !== id); save(); render(); } return; }
    case 'export': { const blob = new Blob([JSON.stringify(db, null, 2)], {type: 'application/json'}); const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `farm-tracker-${todayStr()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); return; }
  }
});

/* ---------- start ---------- */
render();
setTimeout(() => { const s = $('#splash'); s.classList.add('gone'); setTimeout(() => s.remove(), 400); }, 1200);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
