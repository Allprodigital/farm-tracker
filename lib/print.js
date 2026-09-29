/* Farm Tracker printable records: fills #print and opens the print dialog (Save as PDF from there). */
'use strict';
const printHead = (kind, title) => `<header class="pr-head"><img src="icons/icon.svg" alt="" width="40" height="40"><div><div class="pr-brand">Farm Tracker</div><div class="pr-by">by All Pro Digital</div></div>
  <div class="pr-meta">${kind} record<br>Printed ${esc(fmt(nowIso()))}</div></header><h1 class="pr-title">${esc(title)}</h1>`;
const printFoot = () => `<footer class="pr-foot">Farm Tracker by All Pro Digital, a Valley Pro Logistics LLC company · Kept on the farmer's phone; printed copy for records.</footer>`;
const prRows = (rows, cols, empty) => rows.length ? `<table class="pr-table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>` : `<p class="pr-empty">${empty}</p>`;
const prThumbs = (ids, on) => on && ids && ids.length ? `<div class="pr-thumbs">${ids.map(id => `<img data-photo="${id}" alt="">`).join('')}</div>` : '';

function printFieldHtml(f, photos) {
  const o = op(f.operationId);
  const hist = db.history.filter(h => h.fieldId === f.id).sort((a, b) => b.at.localeCompare(a.at));
  const notes = db.notes.filter(n => n.fieldId === f.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sprays = db.sprays.filter(s => s.fieldId === f.id).sort((a, b) => b.date.localeCompare(a.date));
  const harv = db.harvests.filter(s => s.fieldId === f.id).sort((a, b) => b.date.localeCompare(a.date));
  return printHead('Field', f.name + (f.sample ? ' (sample)' : '')) + `
  <dl class="pr-dl"><dt>Crop</dt><dd>${esc(f.crop) || '—'}</dd><dt>Variety</dt><dd>${esc(f.variety) || '—'}</dd><dt>Planted</dt><dd>${f.plantedOn ? esc(fmtDate(f.plantedOn)) : '—'}</dd><dt>Acres</dt><dd>${esc(f.acres ?? '') || '—'}</dd>
    <dt>Current operation</dt><dd><b>${esc(o.name)}</b> since ${esc(fmt(f.statusChangedAt))}</dd><dt>Last updated</dt><dd>${esc(fmt(f.updatedAt))}</dd></dl>
  <div class="pr-two"><section><h2>Where it stands now</h2><p>${esc(f.currentState) || '—'}</p></section><section><h2>Next to do</h2><p>${esc(f.nextTodo) || '—'}</p></section></div>
  <h2>Status history</h2>${prRows(hist.map(h => `<tr><td>${esc(fmt(h.at))}</td><td>${h.fromOpId ? esc(op(h.fromOpId).name) + ' → ' : ''}<b>${esc(op(h.toOpId).name)}</b></td><td>${esc(h.note)}</td></tr>`), ['When', 'Change', 'Note'], 'No status changes.')}
  <h2>Notes</h2>${prRows(notes.map(n => `<tr><td>${esc(fmt(n.createdAt))}</td><td>${esc(n.text)}${prThumbs(n.photoIds, photos)}</td></tr>`), ['When', 'Note'], 'No notes.')}
  <div class="pr-two"><section><h2>Spray log</h2>${prRows(sprays.map(s => `<tr><td>${esc(fmtDate(s.date))}</td><td>${esc(s.product)}</td><td>${esc(s.rate)} ${esc(s.unit)}</td></tr>`), ['Date', 'Product', 'Rate'], 'No spray records.')}</section>
    <section><h2>Harvest</h2>${prRows(harv.map(s => `<tr><td>${esc(fmtDate(s.date))}</td><td>${esc(s.yield)} ${esc(s.unit)}</td><td>${esc(s.notes)}</td></tr>`), ['Date', 'Yield', 'Notes'], 'No harvest records.')}</section></div>` + printFoot();
}
function printTractorHtml(t, photos) {
  const ivs = intervalsOf(t).map(iv => ({iv, st: ivStatus(iv, t)})).sort((a, b) => LEVEL[a.st.level][1] - LEVEL[b.st.level][1] || a.st.score - b.st.score);
  const ents = entriesOf(t);
  return printHead('Tractor', t.name + (t.sample ? ' (sample)' : '')) + `
  <dl class="pr-dl"><dt>Make</dt><dd>${esc(t.make) || '—'}</dd><dt>Model</dt><dd>${esc(t.model) || '—'}</dd><dt>Year</dt><dd>${esc(t.year) || '—'}</dd><dt>Serial / VIN</dt><dd>${esc(t.serial) || '—'}</dd>
    <dt>Current hours</dt><dd><b>${hrs(t.currentHours)} hrs</b> (updated ${esc(fmt(t.hoursUpdatedAt))})</dd><dt>Last updated</dt><dd>${esc(fmt(t.updatedAt))}</dd></dl>
  ${t.sample ? '<p class="pr-note">Sample tractor: hours, intervals and entries are made-up examples, not manufacturer specs.</p>' : ''}
  <h2>Service intervals</h2>${prRows(ivs.map(({iv, st}) => `<tr><td><b>${esc(iv.name)}</b></td><td>${esc(ivRule(iv))}</td><td>${[num(iv.lastDoneHours) != null ? hrs(iv.lastDoneHours) + ' hrs' : '', iv.lastDoneDate ? fmtDate(iv.lastDoneDate) : ''].filter(Boolean).map(esc).join(' · ') || '—'}</td><td class="pr-st-${st.level}"><b>${LEVEL[st.level][0]}</b> ${esc(st.text)}</td></tr>`), ['Item', 'Every', 'Last done', 'Status'], 'No service intervals.')}
  <h2>Maintenance history</h2>${prRows(ents.map(e => `<tr><td>${esc(fmtDate(e.date))}</td><td>${num(e.hours) != null ? hrs(e.hours) : ''}</td><td>${e.type === 'repair' ? 'Repair' : 'Service'}</td><td>${esc(e.work)}${e.notes ? `<div class="pr-sub">${esc(e.notes)}</div>` : ''}${prThumbs(e.photoIds, photos)}</td><td>${esc(e.parts)}</td><td>${num(e.cost) != null ? money(e.cost) : ''}</td></tr>`), ['Date', 'Hours', 'Type', 'What was done', 'Parts', 'Cost'], 'Nothing logged.')}
  ${ents.some(e => num(e.cost) != null) ? `<p class="pr-total">Total logged cost: <b>${money(ents.reduce((s, e) => s + (num(e.cost) || 0), 0))}</b></p>` : ''}` + printFoot();
}
// Builds the print view. Returns a promise that resolves once photos are loaded (tests call this without opening the dialog).
async function buildPrint(kind, id, photos = true) {
  const el = document.getElementById('print');
  const rec = kind === 'field' ? field(id) : tractor(id); if (!rec) return;
  const key = kind + ':' + id; el.dataset.for = key; el.dataset.ready = '';
  el.innerHTML = kind === 'field' ? printFieldHtml(rec, photos) : printTractorHtml(rec, photos);
  await hydratePhotos(el); if (el.dataset.for === key) el.dataset.ready = '1';
}
// The detail pages pre-build the print view, so the Print tap can open the dialog right away (iPhone wants that inside the tap).
function printRecord(kind, id) {
  const el = document.getElementById('print'); const key = kind + ':' + id;
  const go = () => { try { window.print(); } catch (e) { alert('Printing is not available here. On iPhone, open this page in Safari and use Share › Print.'); } };
  if (el.dataset.for === key && el.dataset.ready) return go();
  buildPrint(kind, id).then(go);
}
