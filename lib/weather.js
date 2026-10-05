/* Farm Tracker weather glance: Open-Meteo (no API key). Cached locally; Home shows today + workability. Attribution: Open-Meteo.com, CC BY 4.0. */
'use strict';
const WX_KEY = 'farmtracker.weather';
const LOC_KEY = 'farmtracker.farmLoc';
// Rio Hondo, TX default (Richard's area) until the farmer sets a location.
const DEFAULT_LOC = {lat: 26.235, lon: -97.833, label: 'Rio Hondo, TX', source: 'default'};
const WX_CODES = {
  0: ['Clear', '☀️'], 1: ['Mostly clear', '🌤'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫'], 48: ['Fog', '🌫'], 51: ['Light drizzle', '🌦'], 53: ['Drizzle', '🌦'], 55: ['Heavy drizzle', '🌦'],
  61: ['Light rain', '🌧'], 63: ['Rain', '🌧'], 65: ['Heavy rain', '🌧'], 66: ['Freezing rain', '🌧'], 67: ['Freezing rain', '🌧'],
  71: ['Light snow', '❄️'], 73: ['Snow', '❄️'], 75: ['Heavy snow', '❄️'], 77: ['Snow', '❄️'],
  80: ['Showers', '🌦'], 81: ['Showers', '🌧'], 82: ['Heavy showers', '🌧'], 85: ['Snow showers', '❄️'], 86: ['Snow showers', '❄️'],
  95: ['Thunderstorm', '⛈'], 96: ['Storm + hail', '⛈'], 99: ['Storm + hail', '⛈']
};
function farmLoc() { try { const l = JSON.parse(localStorage.getItem(LOC_KEY)); if (l && Number.isFinite(l.lat) && Number.isFinite(l.lon)) return l; } catch (e) {} return DEFAULT_LOC; }
function setFarmLoc(loc) { try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); } catch (e) {} }
function cachedWeather() { try { return JSON.parse(localStorage.getItem(WX_KEY)); } catch (e) { return null; } }
function workability(day) {
  const rain = Number(day.rain || 0), chance = Number(day.chance || 0), wind = Number(day.wind || 0);
  if (rain >= 10 || chance >= 70) return {level: 'wet', label: 'Too wet to work', tip: 'Fields will be soft. Wait for them to dry.'};
  if (rain >= 3 || chance >= 50) return {level: 'caution', label: 'Maybe workable', tip: 'Expect soft spots. Stick to high ground.'};
  if (wind >= 40) return {level: 'caution', label: 'Windy', tip: 'High wind — skip spraying if you can.'};
  return {level: 'ok', label: 'Looks workable', tip: 'No heavy rain expected.'};
}
function cToF(c) { return Math.round(c * 9 / 5 + 32); }
function mmToIn(mm) { return (mm / 25.4).toFixed(mm >= 25 ? 1 : 2); }
function formatDay(d, i) {
  const name = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', {weekday: 'short'});
  const [label, icon] = WX_CODES[d.code] || ['Weather', '🌤'];
  const w = workability(d);
  return {name, label, icon, hi: cToF(d.tmax), lo: cToF(d.tmin), rainIn: mmToIn(d.rain), chance: d.chance, wind: Math.round(d.wind * 0.621371), work: w};
}
async function fetchWeather(force) {
  const cached = cachedWeather(), loc = farmLoc();
  if (!force && cached && cached.at && Date.now() - new Date(cached.at).getTime() < 45 * 60e3 && Math.abs(cached.lat - loc.lat) < 0.01) return cached;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max&temperature_unit=celsius&windspeed_unit=kmh&timezone=America%2FChicago&forecast_days=3`;
  const r = await fetch(url); if (!r.ok) throw new Error('Weather fetch failed');
  const j = await r.json(); const days = j.daily.time.map((date, i) => ({date, code: j.daily.weathercode[i], tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i],
    rain: j.daily.precipitation_sum[i], chance: j.daily.precipitation_probability_max[i], wind: j.daily.windspeed_10m_max[i]}));
  const pack = {at: nowIso(), lat: loc.lat, lon: loc.lon, label: loc.label || '', days}; try { localStorage.setItem(WX_KEY, JSON.stringify(pack)); } catch (e) {}
  return pack;
}
function weatherCardHtml(pack) {
  if (!pack || !pack.days || !pack.days.length) return `<div class="wx-card" id="wx-card"><div class="wx-head"><b>Weather</b><button type="button" class="edit" data-act="wx-refresh">Refresh</button></div>
    <p class="muted small" style="margin:0">Tap Refresh to load today's forecast (needs a brief connection).</p></div>`;
  const days = pack.days.map(formatDay);
  const today = days[0];
  return `<div class="wx-card wx-${today.work.level}" id="wx-card">
    <div class="wx-head"><b>${esc(today.icon)} ${esc(today.name)}</b><span class="wx-loc muted small">${esc(pack.label || 'Your farm')}</span>
      <button type="button" class="edit" data-act="wx-refresh" aria-label="Refresh weather">↻</button></div>
    <div class="wx-main"><div class="wx-temp">${today.hi}°<span>/${today.lo}°</span></div>
      <div class="wx-meta"><div class="wx-cond">${esc(today.label)}</div>
        <div class="wx-work wx-w-${today.work.level}">${esc(today.work.label)}</div>
        <div class="muted small">${today.rainIn}" rain · ${today.chance}% · wind ${today.wind} mph</div></div></div>
    <div class="wx-days">${days.slice(1).map(d => `<div class="wx-day"><b>${esc(d.name)}</b><span>${esc(d.icon)} ${d.hi}°</span><span class="muted">${d.rainIn}" · ${esc(d.work.label)}</span></div>`).join('')}</div>
    <p class="tiny muted wx-attr">Forecast · Open-Meteo · ${esc(ago(pack.at))}</p></div>`;
}
async function hydrateWeather() {
  const el = document.getElementById('wx-card'); if (!el) return;
  try { const pack = await fetchWeather(false); const wrap = document.createElement('div'); wrap.innerHTML = weatherCardHtml(pack); el.replaceWith(wrap.firstElementChild); }
  catch (e) { if (!cachedWeather()) el.querySelector('p') && (el.querySelector('p').textContent = 'Could not reach weather. Try again when you have a signal.'); }
}
function locationSheet() {
  const loc = farmLoc();
  openSheet(`<form id="locf"><h2>Farm location</h2>
    <p class="muted small" style="margin:0">Used for the weather glance on Home. Defaults to the Rio Grande Valley. No map, just coordinates.</p>
    <div class="two"><div><label for="loc-lat">Latitude</label><input id="loc-lat" name="lat" inputmode="decimal" required value="${esc(loc.lat)}"></div>
      <div><label for="loc-lon">Longitude</label><input id="loc-lon" name="lon" inputmode="decimal" required value="${esc(loc.lon)}"></div></div>
    <label for="loc-label">Label (optional)</label><input id="loc-label" name="label" value="${esc(loc.label || '')}" placeholder="e.g. Home Place">
    <button type="button" class="wide" id="loc-here" style="margin-top:10px">Use this phone's location</button>
    <div class="sheet-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Save</button></div></form>`, p => {
    $('#loc-here', p).addEventListener('click', () => {
      if (!navigator.geolocation) return alert('This phone will not share its location.');
      navigator.geolocation.getCurrentPosition(pos => { $('#loc-lat', p).value = pos.coords.latitude.toFixed(4); $('#loc-lon', p).value = pos.coords.longitude.toFixed(4); $('#loc-label', p).value = 'This phone'; toast('Location filled in'); },
        () => alert('Could not get a location. Check Location permission for this browser.'), {enableHighAccuracy: false, timeout: 10000});
    });
    $('#locf', p).addEventListener('submit', async e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const lat = Number(v.lat), lon = Number(v.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return alert('Enter a valid latitude and longitude.');
      setFarmLoc({lat, lon, label: v.label.trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`, source: 'manual'}); closeSheet();
      try { localStorage.removeItem(WX_KEY); } catch (err) {} toast('Location saved'); render(); setTimeout(() => hydrateWeather(), 100);
    });
  });
}
