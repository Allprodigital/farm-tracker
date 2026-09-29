/* Farm Tracker photos: resized on the phone (max 1280px, JPEG 0.7) and kept in IndexedDB. */
'use strict';
const PhotoDB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('farmtracker-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos', {keyPath: 'id'});
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => {
    const t = d.transaction('photos', mode); const req = fn(t.objectStore('photos'));
    t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return {put: rec => run('readwrite', s => s.put(rec)), get: id => run('readonly', s => s.get(id)), del: id => run('readwrite', s => s.delete(id)),
    all: () => run('readonly', s => s.getAll()), keys: () => run('readonly', s => s.getAllKeys()), clear: () => run('readwrite', s => s.clear())};
})();

async function resizeImage(file, max = 1280, q = 0.7) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read that picture.')); i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Could not shrink that picture.')), 'image/jpeg', q));
    return {blob, w, h};
  } finally { URL.revokeObjectURL(url); }
}
async function savePhotos(files) {
  const ids = [];
  for (const f of files) {
    if (!f.type.startsWith('image/') && !/\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)) continue;
    const {blob, w, h} = await resizeImage(f); const id = 'p-' + uid();
    await PhotoDB.put({id, blob, w, h, type: 'image/jpeg', createdAt: nowIso()}); ids.push(id);
  }
  return ids;
}
const photoUrls = new Map();
async function photoUrl(id) {
  if (photoUrls.has(id)) return photoUrls.get(id);
  const rec = await PhotoDB.get(id); if (!rec) return '';
  const u = URL.createObjectURL(rec.blob); photoUrls.set(id, u); return u;
}
async function hydratePhotos(root = document) {
  const imgs = [...root.querySelectorAll('img[data-photo]:not([src])')];
  await Promise.all(imgs.map(async im => { const u = await photoUrl(im.dataset.photo); if (u) im.src = u; else im.closest('.thumb')?.classList.add('missing'); }));
  await Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
}
async function dropPhotos(ids) { for (const id of ids || []) { try { await PhotoDB.del(id); } catch (e) {} const u = photoUrls.get(id); if (u) { URL.revokeObjectURL(u); photoUrls.delete(id); } } }
const thumbs = (ids, owner) => ids && ids.length ? `<div class="thumbs">${ids.map(id => `<button type="button" class="thumb" data-view-photo="${id}" data-owner="${owner}" aria-label="View photo"><img data-photo="${id}" alt="Photo"></button>`).join('')}</div>` : '';

// Hidden file inputs: camera (capture) and library. pickPhotos() must be called from a tap.
let photoCallback = null;
function pickPhotos(camera, cb) { photoCallback = cb; const i = document.getElementById(camera ? 'cam-input' : 'lib-input'); i.value = ''; i.click(); }
for (const id of ['cam-input', 'lib-input']) document.getElementById(id).addEventListener('change', async e => {
  const files = [...e.target.files]; if (!files.length || !photoCallback) return; const cb = photoCallback; photoCallback = null;
  try { toast(files.length > 1 ? `Adding ${files.length} photos…` : 'Adding photo…'); cb(await savePhotos(files)); }
  catch (err) { alert(err.message || 'Could not add that photo.'); }
});

// Full-screen viewer with Delete.
function openViewer(id, onDelete) {
  const v = document.getElementById('viewer');
  v.innerHTML = `<div class="viewer-bar"><button type="button" data-vclose>Close</button>${onDelete ? '<button type="button" class="danger" data-vdel>Delete photo</button>' : ''}</div><img alt="Photo" data-photo="${id}">`;
  v.classList.remove('hidden'); hydratePhotos(v);
  v.onclick = async e => {
    if (e.target.closest('[data-vdel]')) { if (confirm('Delete this photo?')) { v.classList.add('hidden'); v.innerHTML = ''; await onDelete(); } return; }
    if (e.target.closest('[data-vclose]') || e.target === v) { v.classList.add('hidden'); v.innerHTML = ''; }
  };
}
