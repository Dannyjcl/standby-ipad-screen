/* ── StandBy: wiring ─────────────────────────────────────────── */

import { loadSettings, saveSettings } from './config.js';
import { renderClock, renderCountdowns, crossedCountdowns } from './clock.js';
import { startBtc, btcPrice, onBtcPrice, restyleBtcChart } from './btc.js';
import { startStocks, refreshStocks, onQuotes, quotes, stockStatus } from './stocks.js';
import { renderMstr } from './mstr.js';
import { toast, unlockAudio, checkPriceAlerts, countdownAlert } from './alerts.js';
import { initSettings, openSettings } from './settings.js';

const $ = s => document.querySelector(s);
const settings = loadSettings();
const persist = () => { if (!saveSettings(settings)) toast('Couldn’t save settings', 'Browser storage is full or turned off.'); };

/* ── Night mode ───────────────────────────────────────────── */

const toMin = hhmm => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };

function inSchedule(now) {
    const m = now.getHours() * 60 + now.getMinutes(), f = toMin(settings.nightFrom), t = toMin(settings.nightTo);
    if (f === t) return false;
    return f < t ? (m >= f && m < t) : (m >= f || m < t);    // window may cross midnight
}

/** Next time the schedule flips (used to expire a manual override). */
function nextBoundary(now) {
    const at = min => { const d = new Date(now); d.setHours(Math.floor(min / 60), min % 60, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); return d; };
    return Math.min(at(toMin(settings.nightFrom)), at(toMin(settings.nightTo)));
}

function nightOn(now = new Date()) {
    if (settings.night === 'on') return true;
    if (settings.night === 'off') return false;
    const o = settings.nightOverride;
    if (o && now.getTime() < o.until) return o.on;
    return inSchedule(now);
}

let nightState = null;
function applyNight() {
    const on = nightOn();
    if (on === nightState) return;
    nightState = on;
    document.documentElement.dataset.night = on ? 'on' : 'off';
    $('#btn-night').setAttribute('aria-pressed', on);
    document.querySelector('meta[name="theme-color"]').content = on ? '#000000' : '#050506';
    // Let the CSS colour transition start before the chart re-reads its colours.
    requestAnimationFrame(() => restyleBtcChart());
}

$('#btn-night').addEventListener('click', () => {
    const now = new Date();
    if (settings.night === 'auto') settings.nightOverride = { on: !nightOn(now), until: nextBoundary(now) };
    else settings.night = settings.night === 'on' ? 'off' : 'on';
    persist();
    applyNight();
});

/* ── Clock tick ───────────────────────────────────────────── */

let prevTick = new Date();
function tick() {
    const now = new Date();
    renderClock(now, settings);
    renderCountdowns(now, settings);
    crossedCountdowns(prevTick, now, settings).forEach(cd => countdownAlert(settings, cd));
    prevTick = now;
    if (now.getSeconds() === 0) applyNight();
}
// Align ticks to the start of each second so the clock never lags.
function scheduleTick() {
    tick();
    setTimeout(scheduleTick, 1000 - (Date.now() % 1000) + 5);
}

/* ── Data panels ──────────────────────────────────────────── */

const updateMstr = () => renderMstr(btcPrice(), quotes.MSTR, stockStatus(), settings.mstr);

onBtcPrice(p => {
    updateMstr();
    if (checkPriceAlerts(settings, 'BTC', p)) persist();
});
onQuotes(q => {
    updateMstr();
    let changed = false;
    Object.keys(q).forEach(sym => { if (checkPriceAlerts(settings, sym, q[sym].c)) changed = true; });
    if (changed) persist();
});

/* ── Settings ─────────────────────────────────────────────── */

initSettings(settings, persist, section => {
    if (section === 'stocks') refreshStocks();
    if (section === 'mstr' || section === 'stocks') updateMstr();
    if (section === 'countdowns' || section === 'clock') tick();
    if (section === 'night') { settings.nightOverride = null; persist(); applyNight(); }
}, sym => (sym === 'BTC' ? btcPrice() : quotes[sym] && quotes[sym].c));

$('#btn-settings').addEventListener('click', () => openSettings());

/* ── Keep the screen awake ────────────────────────────────── */

let wakeLock = null;
async function requestWakeLock() {
    if (!('wakeLock' in navigator) || (wakeLock && !wakeLock.released)) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* needs a tap first, or unsupported */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWakeLock(); });

// Any tap: unlock audio for alert chimes, retry the wake lock, briefly show the controls.
let awakeTimer = null;
document.addEventListener('pointerdown', () => {
    unlockAudio();
    requestWakeLock();
    document.body.classList.add('awake');
    clearTimeout(awakeTimer);
    awakeTimer = setTimeout(() => document.body.classList.remove('awake'), 5000);
}, { passive: true });

/* ── Start ────────────────────────────────────────────────── */

applyNight();
scheduleTick();
startBtc(settings.chartRange, range => { settings.chartRange = range; persist(); });
startStocks(() => settings, section => openSettings(section));
updateMstr();
requestWakeLock();
