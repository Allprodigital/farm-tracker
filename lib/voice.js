/* Farm Tracker voice typing: Web Speech API (en-US), live transcript written into the text box so it can be edited before saving. */
'use strict';
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const MIC_SVG = '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const micBtn = (target, ctx = '') => `<button type="button" class="mic" data-mic="${target}" data-ctx="${ctx}" aria-label="Voice typing">${MIC_SVG}<span>Voice</span></button>`;
let activeRec = null;

function voicePanel(html) { const v = document.getElementById('voice'); v.innerHTML = html; v.classList.toggle('hidden', !html); return v; }
function voiceUnsupported() {
  const tip = 'You can always tap the text box and use the <b>microphone key on your keyboard</b> to talk instead of typing.';
  const why = IS_IOS ? 'On iPhone, voice typing here needs Safari on iOS 14.5 or newer with <b>Siri &amp; Dictation</b> turned on, and it may not work when Farm Tracker is opened from the Home Screen icon.'
    : 'This browser does not support voice typing. Chrome (Android or computer) and Safari (iPhone) do.';
  const v = voicePanel(`<div class="vp-title">Voice typing isn't available here</div><p>${why}</p><p>${tip}</p><button type="button" class="primary wide" data-vok>OK</button>`);
  v.querySelector('[data-vok]').onclick = () => voicePanel('');
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// Start listening into a textarea/input. onDone(text) gets only the newly spoken text.
function startVoice(ta, onDone) {
  if (!ta) return;
  if (!SpeechRec) return voiceUnsupported();
  if (activeRec) { try { activeRec.abort(); } catch (e) {} activeRec = null; }
  const rec = new SpeechRec(); activeRec = rec;
  rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  const base = ta.value.replace(/\s+$/, ''); let finalText = '', cancelled = false, ended = false;
  const v = voicePanel(`<div class="vp-title"><span class="rec-dot" aria-hidden="true"></span> Listening… speak now</div>
    <div class="vp-live" aria-live="polite">Say what you want to write down.</div>
    <div class="sheet-actions"><button type="button" data-vcancel>Cancel</button><button type="button" class="primary" data-vstop>Done</button></div>`);
  const live = v.querySelector('.vp-live');
  const write = interim => { const said = [finalText, interim].filter(Boolean).join(' ').trim(); ta.value = (base ? base + (/[.!?]$/.test(base) ? ' ' : ' ') : '') + (base ? said : cap(said));
    live.textContent = said || '…'; ta.dispatchEvent(new Event('input', {bubbles: true})); };
  rec.onresult = e => { let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript.trim(); if (!t) continue; if (e.results[i].isFinal) finalText += (finalText ? ' ' : '') + t; else interim += (interim ? ' ' : '') + t; }
    write(interim); };
  rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { cancelled = true; voicePanel(`<div class="vp-title">Microphone is blocked</div><p>Allow the microphone for this site in your browser settings${IS_IOS ? ' (Settings › Safari › Microphone, and Siri &amp; Dictation must be on)' : ''}, then try again.</p><button type="button" class="primary wide" data-vok>OK</button>`).querySelector('[data-vok]').onclick = () => voicePanel(''); }
    else if (e.error === 'no-speech') toast("Didn't hear anything. Tap the mic and try again.");
    else if (e.error === 'network') toast('Voice typing needs an internet connection on this phone.'); };
  rec.onend = () => { if (ended) return; ended = true; if (activeRec === rec) activeRec = null;
    if (!document.querySelector('#voice [data-vok]')) voicePanel('');
    if (cancelled) { ta.value = base; ta.dispatchEvent(new Event('input', {bubbles: true})); return; }
    write(''); ta.focus(); if (finalText && onDone) onDone(finalText); };
  v.querySelector('[data-vstop]').onclick = () => { try { rec.stop(); } catch (e) { rec.onend(); } };
  v.querySelector('[data-vcancel]').onclick = () => { cancelled = true; try { rec.abort(); } catch (e) { rec.onend(); } };
  try { rec.start(); } catch (e) { voicePanel(''); activeRec = null; voiceUnsupported(); }
}

// Light parse: spot an operation name in spoken text. Returns an operation id or null. Always confirmed by the user.
const OP_WORDS = {discing: /\bdis[ck](ed|ing|s)?\b/, plowing: /\bplou?gh?(ed|ing|s)?\b|\bplow(ed|ing|s)?\b/, cultivating: /\bcultivat(e|ed|ing|or)\b/,
  planting: /\bplant(ed|ing)\b/, spraying: /\bspray(ed|ing)\b/, fertilizing: /\bfertili[sz](e|ed|ing)\b/, irrigating: /\birrigat(e|ed|ing)\b|\bwater(ed|ing)\b/,
  harvesting: /\bharvest(ed|ing)?\b|\bcombin(ed|ing)\b/, shredding: /\bshredd?(ed|ing|s)?\b/, idle: /\bfallow\b|\bidle\b/};
function spokenOperation(text) {
  const t = ' ' + text.toLowerCase() + ' '; let best = null, pos = -1;
  for (const o of db.operations) {
    const re = OP_WORDS[o.id] || new RegExp('\\b' + o.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    const m = [...t.matchAll(new RegExp(re.source, 'g'))].pop(); if (m && m.index > pos) { pos = m.index; best = o.id; }
  }
  return best;
}
function suggestStatus(f, text) {
  const opId = spokenOperation(text); if (!opId || opId === f.operationId) return;
  const o = op(opId); const heard = (text.match(new RegExp((OP_WORDS[opId] || /$^/).source, 'i')) || [o.name])[0];
  const v = voicePanel(`<div class="vp-title">Change status?</div><p>You said “${esc(heard)}”. Change <b>${esc(f.name)}</b> from ${esc(op(f.operationId).name)} to <b>${esc(o.name)}</b>?</p>
    <div class="sheet-actions"><button type="button" data-vno>No, keep it</button><button type="button" class="primary" data-vyes>Yes, change</button></div>`);
  v.querySelector('[data-vno]').onclick = () => voicePanel('');
  v.querySelector('[data-vyes]').onclick = () => { voicePanel(''); flushOpenEdits(f); setStatus(f, opId, 'From voice note'); };
}
