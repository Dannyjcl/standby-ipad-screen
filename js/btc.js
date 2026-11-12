/* ── Live Bitcoin: Coinbase REST candles + WebSocket ticker ──────
 * No API key needed. Candles: [time, low, high, open, close, volume], newest first.
 */

const REST = 'https://api.exchange.coinbase.com/products/BTC-USD';
const WS_URL = 'wss://ws-feed.exchange.coinbase.com';
const RANGES = {
    '1D': { gran: 900,   points: 96 },    // 15-min bars
    '1W': { gran: 3600,  points: 168 },   // hourly
    '1M': { gran: 21600, points: 120 },   // 6-hour
};
const STALE_MS = 20000;

const $ = s => document.querySelector(s);
const usd = (n, d = 0) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const state = { price: null, open24: null, lastMsg: 0, range: '1D', series: null, chart: null, data: [] };
const listeners = [];
let ws = null, retry = 0, flashTimer = null;

export const btcPrice = () => state.price;
export const onBtcPrice = fn => listeners.push(fn);

/* ── Chart ────────────────────────────────────────────────── */

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function chartColors() {
    return {
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: cssVar('--muted'), fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 11 },
        grid: { vertLines: { color: cssVar('--grid') }, horzLines: { color: cssVar('--grid') } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
        crosshair: { vertLine: { color: cssVar('--line-2') }, horzLine: { color: cssVar('--line-2') } },
    };
}
function seriesColors() {
    return { lineColor: cssVar('--chart-line'), topColor: cssVar('--chart-top'), bottomColor: cssVar('--chart-bot') };
}

function initChart() {
    const el = $('#btc-chart');
    if (!window.LightweightCharts) { showMsg('Chart library failed to load.'); return; }
    state.chart = LightweightCharts.createChart(el, {
        autoSize: true,
        ...chartColors(),
        handleScroll: false, handleScale: false,
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
        timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
        localization: { priceFormatter: p => usd(p) },
    });
    state.series = state.chart.addAreaSeries({ ...seriesColors(), lineWidth: 2, priceLineVisible: true, priceLineColor: cssVar('--line-2'), lastValueVisible: true });
}

/** Re-read CSS colours (night mode toggled). */
export function restyleBtcChart() {
    if (!state.chart) return;
    state.chart.applyOptions(chartColors());
    state.series.applyOptions({ ...seriesColors(), priceLineColor: cssVar('--line-2') });
}

function showMsg(html) { const m = $('#btc-msg'); m.innerHTML = html; m.hidden = !html; }

/* Lightweight Charts plots in UTC; shift by the local offset so axis labels read in local time. */
const toLocal = t => t - new Date(t * 1000).getTimezoneOffset() * 60;

async function loadCandles() {
    const { gran, points } = RANGES[state.range];
    try {
        const r = await fetch(`${REST}/candles?granularity=${gran}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const rows = await r.json();
        if (!Array.isArray(rows) || !rows.length) throw new Error('empty');
        state.data = rows.slice(0, points).reverse().map(c => ({ time: toLocal(c[0]), value: c[4] }));
        if (state.series) { state.series.setData(state.data); state.chart.timeScale().fitContent(); }
        showMsg('');
        if (state.price === null) setPrice(rows[0][4]);
    } catch (e) {
        if (!state.data.length) showMsg('Couldn’t load the chart. Retrying…');
    }
}

async function loadStats() {
    try {
        const r = await fetch(`${REST}/stats`);
        if (!r.ok) return;
        const s = await r.json();
        state.open24 = parseFloat(s.open);
        if (state.price === null) setPrice(parseFloat(s.last));
        renderChange();
    } catch (e) { /* the WebSocket also carries open_24h */ }
}

/* ── Price display ────────────────────────────────────────── */

function setPrice(p) {
    if (!isFinite(p)) return;
    const prev = state.price;
    state.price = p;
    const el = $('#btc-price');
    el.textContent = usd(p, 2);
    if (prev !== null && p !== prev) {
        el.classList.remove('tick-up', 'tick-down');
        void el.offsetWidth;                 // restart the colour fade
        el.classList.add(p > prev ? 'tick-up' : 'tick-down');
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => el.classList.remove('tick-up', 'tick-down'), 250);
    }
    renderChange();
    pushLivePoint(p);
    listeners.forEach(fn => fn(p, prev));
}

function renderChange() {
    if (state.price === null || !state.open24) return;
    const d = state.price - state.open24, pct = d / state.open24 * 100;
    const cls = d >= 0 ? 'up' : 'down';
    $('#btc-change').innerHTML = `<span class="${cls}">${d >= 0 ? '▲' : '▼'} ${usd(Math.abs(d))} (${Math.abs(pct).toFixed(2)}%)</span> · 24h`;
}

function pushLivePoint(p) {
    if (!state.series || !state.data.length) return;
    const gran = RANGES[state.range].gran;
    const bucket = toLocal(Math.floor(Date.now() / 1000 / gran) * gran);
    const last = state.data[state.data.length - 1];
    if (bucket < last.time) return;
    if (bucket === last.time) last.value = p;
    else state.data.push({ time: bucket, value: p });
    state.series.update({ time: bucket, value: p });
}

/* ── WebSocket ────────────────────────────────────────────── */

function connect() {
    try { ws = new WebSocket(WS_URL); } catch (e) { scheduleReconnect(); return; }
    ws.onopen = () => {
        retry = 0;
        ws.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channels: ['ticker'] }));
    };
    ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (err) { return; }
        if (m.type !== 'ticker') return;
        state.lastMsg = Date.now();
        if (m.open_24h) state.open24 = parseFloat(m.open_24h);
        setPrice(parseFloat(m.price));
        setDot();
    };
    ws.onclose = () => { setDot(); scheduleReconnect(); };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* already closed */ } };
}

function scheduleReconnect() {
    const wait = Math.min(30000, 1000 * 2 ** retry++);
    setTimeout(() => { if (!ws || ws.readyState === WebSocket.CLOSED) connect(); }, wait);
}

function setDot() {
    const dot = $('#btc-dot');
    const age = Date.now() - state.lastMsg;
    dot.className = 'dot ' + (!state.lastMsg ? '' : age < STALE_MS ? 'live' : (ws && ws.readyState === WebSocket.OPEN ? 'stale' : 'down'));
    dot.title = !state.lastMsg ? 'Connecting…' : age < STALE_MS ? 'Live' : 'No update for ' + Math.round(age / 1000) + 's';
}

/* ── Range buttons ────────────────────────────────────────── */

export function setRange(range) {
    if (!RANGES[range]) return;
    state.range = range;
    document.querySelectorAll('#btc-range button').forEach(b => {
        const on = b.dataset.range === range;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
    });
    loadCandles();
}

export function startBtc(initialRange, onRangeChange) {
    initChart();
    $('#btc-range').addEventListener('click', e => {
        const b = e.target.closest('[data-range]');
        if (!b) return;
        setRange(b.dataset.range);
        onRangeChange(b.dataset.range);
    });
    setRange(initialRange);
    loadStats();
    connect();
    setInterval(setDot, 5000);
    setInterval(loadCandles, 5 * 60000);   // re-sync history (fixes any gaps from sleep)
    setInterval(loadStats, 60000);

    // iPad wakes from sleep / app returns to foreground: reconnect right away.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        loadCandles(); loadStats();
        if (!ws || ws.readyState !== WebSocket.OPEN) { retry = 0; connect(); }
    });
}
