/* ── Stock quotes (Finnhub) + ticker strip ───────────────────────
 * Needs a free Finnhub key: see the placeholder in js/config.js or ⚙ Settings.
 * Free tier allows 60 calls/min; we poll every 30s in market hours, 5 min otherwise.
 */

const API = 'https://finnhub.io/api/v1/quote';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const quotes = {};          // symbol → { c: price, d: change, dp: change %, pc: prev close, t }
const listeners = [];
let status = 'idle';               // idle | nokey | badkey | limited | error | ok
let timer = null, getSettings = null, onOpenSettings = null;

export const onQuotes = fn => listeners.push(fn);
export const stockStatus = () => status;

/** US regular session, 9:30–16:00 New York time, Mon–Fri (holidays not handled). */
export function marketOpen(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
        .formatToParts(d).map(x => [x.type, x.value]));
    if (p.weekday === 'Sat' || p.weekday === 'Sun') return false;
    const m = (+p.hour % 24) * 60 + +p.minute;
    return m >= 570 && m < 960;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAll() {
    const s = getSettings();
    const key = (s.stockKey || '').trim();
    if (!key) { status = 'nokey'; render(); notify(); return; }
    // Always include MSTR: the premium panel needs it even if it's not in the strip.
    const symbols = [...new Set([...s.tickers, 'MSTR'])];
    let ok = 0;
    for (const sym of symbols) {
        try {
            const r = await fetch(`${API}?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(key)}`);
            if (r.status === 401 || r.status === 403) { status = 'badkey'; break; }
            if (r.status === 429) { status = 'limited'; break; }
            if (!r.ok) continue;
            const q = await r.json();
            if (q && typeof q.c === 'number' && q.c > 0) { quotes[sym] = q; ok++; }
        } catch (e) { /* network blip: keep the last quote */ }
        await sleep(200);   // stay well under the per-second limit
    }
    if (ok) status = 'ok';
    else if (status !== 'badkey' && status !== 'limited') status = 'error';
    render();
    notify();
}

function notify() { listeners.forEach(fn => fn(quotes, status)); }

export function refreshStocks() {
    clearTimeout(timer);
    fetchAll().finally(() => { timer = setTimeout(refreshStocks, marketOpen() ? 30000 : 300000); });
}

/* ── Strip ────────────────────────────────────────────────── */

const price = n => n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2);

function render() {
    const track = $('#ticker-track');
    const s = getSettings();
    const msg = {
        nokey: 'Stock prices need a free Finnhub API key.',
        badkey: 'Finnhub rejected the API key. Check it in Settings.',
        limited: 'Finnhub rate limit hit. Retrying shortly.',
        error: 'Couldn’t reach Finnhub. Retrying.',
    }[status];
    const items = s.tickers.filter(t => quotes[t]);
    if (!items.length) {
        track.classList.remove('scrolling');
        track.innerHTML = msg ? `<span class="tk-msg">${msg} <button type="button" data-open-settings="stocks">Open settings</button></span>`
            : '<span class="tk-msg">Loading stock prices…</span>';
        return;
    }
    const one = items.map(t => {
        const q = quotes[t];
        const up = q.dp >= 0;
        return `<span class="tk"><b>${esc(t)}</b><span class="p">${price(q.c)}</span><span class="c ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(q.dp).toFixed(2)}%</span></span>`;
    }).join('');
    track.innerHTML = one;
    // Scroll only if the strip doesn't fit; duplicate it for a seamless loop.
    const fits = track.scrollWidth <= track.parentElement.clientWidth;
    track.classList.toggle('scrolling', !fits);
    if (!fits) {
        const w = track.scrollWidth;
        track.innerHTML = one + one;
        track.style.setProperty('--marquee-dur', Math.round(w / 40) + 's');   // ~40 px/s
    }
}

export function startStocks(settingsGetter, openSettings) {
    getSettings = settingsGetter;
    onOpenSettings = openSettings;
    $('#board').addEventListener('click', e => {
        const b = e.target.closest('[data-open-settings]');
        if (b) onOpenSettings(b.dataset.openSettings);
    });
    window.addEventListener('resize', () => render());
    render();
    refreshStocks();
}
