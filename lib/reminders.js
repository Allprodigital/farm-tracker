/* Farm Tracker service reminders: Home banner, Tractors tab badge, local notification on open, and .ics calendar files. */
'use strict';
const NOTIFY_KEY = 'farmtracker.lastNotify';
function dueItems() {
  const out = [];
  for (const t of db.tractors) for (const iv of intervalsOf(t)) { const st = ivStatus(iv, t); if (st.level === 'over' || st.level === 'soon') out.push({t, iv, st}); }
  return out.sort((a, b) => LEVEL[a.st.level][1] - LEVEL[b.st.level][1] || a.st.score - b.st.score);
}
const canNotify = () => 'Notification' in window;
// All alerts for the header bell: service items (overdue / due soon) + backup reminder.
function alertItems() {
  const out = dueItems().map(i => ({level: i.st.level, href: '#/tractor/' + i.t.id, target: 'iv-' + i.iv.id,
    title: `${i.t.name}: ${i.iv.name}`, text: `${i.st.level === 'over' ? 'OVERDUE' : 'DUE SOON'} ${(i.st.text.split(' · ').find(x => /^overdue/.test(x)) || i.st.text.split(' · ')[0]).replace(/^(overdue|due) /, '')}`}));
  if (backupDue()) out.push({level: 'backup', href: '#/about', target: 'backup-card', title: 'Back up your data',
    text: backupDays() == null ? 'Not backed up yet. Your records live only on this phone.' : `Last backup ${backupDays()} days ago`});
  return out;
}
function updateBell() {
  const items = alertItems(), btn = document.getElementById('bell'); if (!btn) return;
  const b = btn.querySelector('.bell-badge'); b.textContent = items.length > 9 ? '9+' : items.length; b.hidden = !items.length;
  btn.setAttribute('aria-label', items.length ? `Alerts: ${items.length}` : 'Alerts: all caught up');
  if (!document.getElementById('bell-panel').classList.contains('hidden')) renderBell();
}
function renderBell() {
  const items = alertItems(), panel = document.getElementById('bell-panel');
  const alertBtn = dueItems().length && canNotify() && Notification.permission === 'default' ? '<button type="button" class="bell-foot-btn" data-bell-enable>Turn on phone alerts</button>'
    : dueItems().length && !canNotify() && IS_IOS && !IS_STANDALONE ? '<p class="tiny muted bell-foot">For phone alerts on iPhone: Share › Add to Home Screen, then open Farm Tracker from the icon.</p>' : '';
  panel.innerHTML = `<div class="bell-head"><b>Alerts</b><button type="button" class="bell-close" data-bell-close aria-label="Close alerts">Close</button></div>
    ${items.length ? `<ul class="bell-list">${items.map(i => `<li><a class="bell-item bi-${i.level}" href="${i.href}" data-target="${i.target}"><span class="bi-title">${esc(i.title)}</span><span class="bi-text">${esc(i.text)}</span></a></li>`).join('')}</ul>${alertBtn}`
      : '<div class="bell-empty"><span aria-hidden="true">✓</span> All caught up. Nothing is due.</div>'}`;
}
function openBell() { renderBell(); const p = document.getElementById('bell-panel'); p.classList.remove('hidden'); document.getElementById('bell').setAttribute('aria-expanded', 'true'); }
function closeBell() { document.getElementById('bell-panel').classList.add('hidden'); document.getElementById('bell').setAttribute('aria-expanded', 'false'); }
document.getElementById('bell').addEventListener('click', () => document.getElementById('bell-panel').classList.contains('hidden') ? openBell() : closeBell());
document.getElementById('bell-panel').addEventListener('click', async e => {
  if (e.target.closest('[data-bell-close]')) return closeBell();
  if (e.target.closest('[data-bell-enable]')) { closeBell(); return enableAlerts(); }
  const a = e.target.closest('.bell-item'); if (!a) return;
  e.preventDefault(); closeBell(); const target = a.dataset.target;
  if (location.hash !== a.getAttribute('href')) location.hash = a.getAttribute('href'); else render();
  setTimeout(() => { const el = document.getElementById(target); if (el) { el.scrollIntoView({block: 'center'}); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } }, 120);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBell(); });
document.addEventListener('click', e => { const p = document.getElementById('bell-panel'); if (!p.classList.contains('hidden') && !e.target.closest('#bell-panel') && !e.target.closest('#bell')) closeBell(); });
// A tapped phone alert (via the service worker) opens this list.
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'open-alerts') openBell(); });
function updateTabBadge() {
  const a = document.querySelector('.tabs a[href="#/tractors"]'); if (!a) return;
  const items = dueItems(); let b = a.querySelector('.tab-badge');
  if (!b) { b = document.createElement('span'); b.className = 'tab-badge'; a.appendChild(b); }
  b.textContent = items.length; b.hidden = !items.length; b.classList.toggle('soon', !items.some(i => i.st.level === 'over'));
  a.setAttribute('aria-label', items.length ? `Tractors, ${items.length} service item${items.length === 1 ? '' : 's'} due` : 'Tractors');
}
async function maybeNotify(force) {
  if (!canNotify() || Notification.permission !== 'granted') return false;
  const items = dueItems(); if (!items.length) return false;
  const sig = items.map(i => i.iv.id + ':' + i.st.level).join(','); const last = JSON.parse(localStorage.getItem(NOTIFY_KEY) || '{}');
  if (!force && last.day === todayStr() && last.sig === sig) return false; // at most once a day unless something changed
  const over = items.filter(i => i.st.level === 'over').length;
  const title = 'Farm Tracker service due: ' + [over ? `${over} overdue` : '', items.length - over ? `${items.length - over} due soon` : ''].filter(Boolean).join(', ');
  const body = items.slice(0, 3).map(i => `${i.iv.name} (${i.t.name}): ${i.st.text}`).join('\n') + (items.length > 3 ? `\n+${items.length - 3} more` : '');
  const opts = {body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'farmtracker-service', data: {url: './#/alerts'}};
  try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) await reg.showNotification(title, opts); else { const nt = new Notification(title, opts); nt.onclick = () => { window.focus(); openBell(); }; } }
  catch (e) { console.warn('notify failed', e); return false; }
  localStorage.setItem(NOTIFY_KEY, JSON.stringify({day: todayStr(), sig})); return true;
}
async function enableAlerts() {
  if (!canNotify()) { alert(IS_IOS ? 'On iPhone, alerts work only after you add Farm Tracker to your Home Screen (Share › Add to Home Screen, iOS 16.4 or newer) and open it from the icon.' : 'This browser does not support notifications. Use "Add to calendar" on each service item instead.'); return; }
  const p = await Notification.requestPermission();
  if (p === 'granted') { toast('Phone alerts are on'); await maybeNotify(true); } else toast('Alerts are off. You can still use Add to calendar.');
  render();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { updateTabBadge(); updateBell(); maybeNotify(); } });

/* ---- Add to calendar (.ics) ---- */
function hoursPerDay(t) {
  const r = db.hours.filter(h => h.tractorId === t.id && num(h.hours) != null).sort((a, b) => a.date.localeCompare(b.date));
  if (r.length < 2) return null; const last = r[r.length - 1];
  const first = r.find(h => daysBetween(h.date, last.date) <= 120) || r[0]; const days = daysBetween(first.date, last.date);
  const rate = days >= 7 ? (last.hours - first.hours) / days : null; return rate > 0 ? rate : null;
}
function dueDateFor(iv, t) {
  const today = todayStr(); const c = []; const eh = num(iv.everyHours), ed = num(iv.everyDays), lh = num(iv.lastDoneHours);
  if (ed && iv.lastDoneDate) c.push({date: addDays(iv.lastDoneDate, ed), est: false});
  if (eh && lh != null) { const left = lh + eh - (num(t.currentHours) || 0); const rate = hoursPerDay(t);
    if (left <= 0) c.push({date: today, est: false}); else if (rate) c.push({date: addDays(today, Math.max(1, Math.ceil(left / rate))), est: true, rate}); }
  if (!c.length) return null;
  const d = c.sort((a, b) => a.date.localeCompare(b.date))[0]; if (d.date < today) d.date = today; return d;
}
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const icsFold = line => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };
function icsFor(iv, t) {
  const d = dueDateFor(iv, t); if (!d) return null; const st = ivStatus(iv, t);
  const ymd = d.date.replace(/-/g, ''), end = addDays(d.date, 1).replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const desc = [`${iv.name} on ${t.name}`, `Rule: ${ivRule(iv)}`, `Last done: ${[num(iv.lastDoneHours) != null ? hrs(iv.lastDoneHours) + ' hrs' : '', iv.lastDoneDate ? fmtDate(iv.lastDoneDate) : ''].filter(Boolean).join(', ') || 'not recorded'}`,
    `Status when added: ${st.text}`, d.est ? `Date estimated from recent use (about ${hrs(d.rate)} hrs/day). Update hours in Farm Tracker to keep it accurate.` : '', 'From Farm Tracker by All Pro Digital'].filter(Boolean).join('\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//All Pro Digital//Farm Tracker//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${iv.id}-${ymd}@farm-tracker.allprodigital`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEsc(`Service due: ${iv.name.replace(/\s*\(example\)$/, '')} – ${t.name}`)}`, `DESCRIPTION:${icsEsc(desc)}`, 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('Service due tomorrow: ' + iv.name)}`, 'TRIGGER:-PT17H', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('Service due today: ' + iv.name)}`, 'TRIGGER:PT7H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'];
  return {text: lines.map(icsFold).join('\r\n') + '\r\n', date: d.date, est: d.est};
}
function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); }
function addToCalendar(t, iv) {
  const ics = icsFor(iv, t);
  if (!ics) { alert('Farm Tracker can\'t work out a due date yet. Set "last done", or log hours a few times so it can estimate from your use.'); return; }
  const slug = (t.name + '-' + iv.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  downloadBlob(new Blob([ics.text], {type: 'text/calendar'}), `service-due-${slug}.ics`);
  toast(`Calendar event for ${fmtDate(ics.date)}${ics.est ? ' (estimated)' : ''}`);
}
