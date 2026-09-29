/* Farm Tracker backup: one JSON file with all data + photos, saved through the phone's share/save sheet (or a download). */
'use strict';
const BACKUP_KEY = 'farmtracker.lastBackup';
const blobToDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const dataUrlToBlob = u => { const [head, b64] = u.split(','); const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], {type: (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg'}); };
const lastBackup = () => localStorage.getItem(BACKUP_KEY) || '';
const hasOwnData = () => db.fields.some(f => !f.sample) || db.tractors.some(t => !t.sample);
const backupDays = () => lastBackup() ? Math.floor((Date.now() - new Date(lastBackup())) / 864e5) : null;
const backupDue = () => hasOwnData() && (backupDays() == null || backupDays() >= 7);
const sizeText = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

async function buildBackup() {
  const photos = await PhotoDB.all();
  return {app: 'Farm Tracker', by: 'All Pro Digital', format: 1, appVersion: VERSION, exportedAt: nowIso(),
    prefs: {selectedField: localStorage.getItem(SEL_KEY) || '', selectedTractor: localStorage.getItem(TSEL_KEY) || ''},
    data: db, photos: await Promise.all(photos.map(async p => ({id: p.id, w: p.w, h: p.h, createdAt: p.createdAt, data: await blobToDataUrl(p.blob)})))};
}
// Step 1 (tap "Back up now"): build the file. Step 2 (tap "Save / share"): hand it to the share sheet right inside the tap, which iPhone requires.
async function backupNow() {
  toast('Getting your backup ready…');
  let b; try { b = await buildBackup(); } catch (e) { alert('Could not build the backup: ' + e.message); return; }
  const name = `farm-tracker-backup-${todayStr()}.json`; const file = new File([JSON.stringify(b)], name, {type: 'application/json'});
  const canShare = !!(navigator.canShare && navigator.canShare({files: [file]}));
  openSheet(`<h2>Backup is ready</h2><p class="bigtext" style="margin:0">${db.fields.length} fields, ${db.tractors.length} tractors, ${b.photos.length} photo${b.photos.length === 1 ? '' : 's'} · ${sizeText(file.size)}</p>
    <p class="muted small">${canShare ? 'Tap below, then pick <b>Save to Files</b>, Google Drive, email or a text to yourself.' : 'Tap below to download the file. Keep it somewhere safe (email it to yourself, or copy it to a computer or cloud drive).'}</p>
    <button class="primary wide big-act" id="bk-go">${canShare ? 'Save / share backup' : 'Download backup'}</button>
    <div class="sheet-actions"><button type="button" data-close>Cancel</button></div>`, p => {
    p.querySelector('#bk-go').addEventListener('click', async () => {
      if (canShare) {
        try { await navigator.share({files: [file], title: 'Farm Tracker backup', text: `Farm Tracker backup ${fmtDate(todayStr())}`}); }
        catch (e) { if (e.name === 'AbortError') { toast('Backup not saved'); return; } downloadBlob(file, name); }
      } else downloadBlob(file, name);
      localStorage.setItem(BACKUP_KEY, nowIso()); closeSheet(); render(); toast('Backup saved');
    });
  });
}
function restorePick() { const i = document.getElementById('restore-input'); i.value = ''; i.click(); }
document.getElementById('restore-input').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  let b; try { b = JSON.parse(await f.text()); } catch (err) { alert('That file is not a Farm Tracker backup (could not read it).'); return; }
  if (!b || b.app !== 'Farm Tracker' || !b.data || !Array.isArray(b.data.fields)) { alert('That file is not a Farm Tracker backup.'); return; }
  const d = b.data; const photos = Array.isArray(b.photos) ? b.photos : [];
  if (!confirm(`Restore the backup from ${fmt(b.exportedAt)}?\n\n${d.fields.length} fields, ${(d.tractors || []).length} tractors, ${photos.length} photos.\n\nThis REPLACES everything on this phone now. Back up first if you are not sure.`)) return;
  try {
    await PhotoDB.clear(); photoUrls.forEach(u => URL.revokeObjectURL(u)); photoUrls.clear();
    for (const p of photos) await PhotoDB.put({id: p.id, blob: dataUrlToBlob(p.data), w: p.w, h: p.h, type: 'image/jpeg', createdAt: p.createdAt});
    db = fix(d); save();
    if (b.prefs) { for (const [k, key] of [['selectedField', SEL_KEY], ['selectedTractor', TSEL_KEY]]) b.prefs[k] ? localStorage.setItem(key, b.prefs[k]) : localStorage.removeItem(key); }
    location.hash = '#/'; render(); toast('Backup restored');
  } catch (err) { alert('Restore failed: ' + err.message); }
});
