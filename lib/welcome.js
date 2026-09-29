/* Farm Tracker first-run welcome: 3 short steps (Home picker, taskbar, bell). Skippable, shown once; About › Show the quick tour replays it. */
'use strict';
const WELCOME_KEY = 'farmtracker.welcomed';
const welcomed = () => { try { return !!localStorage.getItem(WELCOME_KEY); } catch (e) { return true; } };
const W_BELL = '<svg aria-hidden="true" viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>';
const W_SEARCH = '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';
const WSTEPS = [
  {title: 'Find a field or tractor fast', body: 'On <b>Home</b>, search or pick from the list. You see just that one card, and Farm Tracker remembers your last pick.',
    art: () => `<div class="wa-search">${W_SEARCH}<span>North 80</span></div><div class="wa-card"><b>North 80</b><span class="badge" style="--op:#7a3b52">Shredding</span></div>`},
  {title: 'Quick buttons at the bottom', body: 'Open a field or tractor and use the bar at the bottom: <b>Voice note</b>, <b>Photo</b>, <b>Status</b> (<b>Log</b> on a tractor) and <b>Print</b>.',
    art: () => `<div class="wa-task">${[[ICON.mic, 'Voice note'], [ICON.cam, 'Photo'], [ICON.log, 'Status'], [ICON.print, 'Print']].map(([i, l]) => `<span>${i}<i>${l}</i></span>`).join('')}</div>`},
  {title: 'The bell keeps watch', body: 'A red number on the <b>bell</b> at the top means service is due or it\'s time to back up. Tap it to see the list and go straight there.',
    art: () => `<div class="wa-bell">${W_BELL}<span class="wa-badge">2</span></div>`}
];
function showWelcome(step = 0) {
  let w = document.getElementById('welcome');
  if (!w) { w = document.createElement('div'); w.id = 'welcome'; w.className = 'welcome'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'w-title'); document.body.appendChild(w);
    w.addEventListener('click', e => { if (e.target.closest('[data-wskip],[data-wdone]')) closeWelcome(); else if (e.target.closest('[data-wnext]')) showWelcome(+w.dataset.step + 1); else if (e.target.closest('[data-wback]')) showWelcome(+w.dataset.step - 1); }); }
  const s = WSTEPS[step], last = step === WSTEPS.length - 1; w.dataset.step = step;
  w.innerHTML = `<div class="w-card"><div class="w-top"><span class="w-count">${step + 1} of ${WSTEPS.length}</span>${last ? '' : '<button type="button" class="w-skip" data-wskip>Skip</button>'}</div>
    <div class="w-art" aria-hidden="true">${s.art()}</div><h2 id="w-title">${s.title}</h2><p>${s.body}</p>
    <div class="w-dots" aria-hidden="true">${WSTEPS.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="w-actions">${step ? '<button type="button" data-wback>‹ Back</button>' : ''}${last ? '<button type="button" class="primary" data-wdone>Get started</button>' : '<button type="button" class="primary" data-wnext>Next ›</button>'}</div></div>`;
  w.classList.remove('hidden'); const f = w.querySelector('.primary'); if (f) f.focus({preventScroll: true});
}
function closeWelcome() { try { localStorage.setItem(WELCOME_KEY, new Date().toISOString()); } catch (e) {} const w = document.getElementById('welcome'); if (w) w.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('welcome')) closeWelcome(); });
